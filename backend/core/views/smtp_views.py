"""Staff-only transactional email diagnostics. Never expose credentials."""
from django.conf import settings
from django.utils import timezone
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from core.permissions import IsTenantManagerOrStaff
from core.utils.mailer import send_email_resilient


class EmailDiagnosticThrottle(UserRateThrottle):
    rate = '5/hour'


class SMTPDiagnosticView(APIView):
    permission_classes = [IsTenantManagerOrStaff]
    throttle_classes = [EmailDiagnosticThrottle]

    def post(self, request):
        recipient = serializers.EmailField().run_validation(
            request.data.get('email') or getattr(settings, 'STORE_EMAIL', '')
        )
        provider = 'resend' if getattr(settings, 'RESEND_API_KEY', '') else 'smtp'
        ok, message = send_email_resilient(
            subject='New Sahara Gold and Diamond email verification',
            body='This is a transactional email test requested from your New Sahara Gold and Diamond administration panel.',
            to_emails=[recipient],
        )
        details = {
            'provider': provider,
            'configured': bool(getattr(settings, 'RESEND_API_KEY', '')) if provider == 'resend' else bool(
                getattr(settings, 'EMAIL_HOST', '') and getattr(settings, 'EMAIL_HOST_USER', '')
                and getattr(settings, 'EMAIL_HOST_PASSWORD', '')),
            'from_email': getattr(settings, 'RESEND_FROM_EMAIL', '') if provider == 'resend'
                          else getattr(settings, 'DEFAULT_FROM_EMAIL', ''),
        }
        if provider == 'smtp':
            details.update(host=getattr(settings, 'EMAIL_HOST', ''), port=getattr(settings, 'EMAIL_PORT', None))
        return Response({
            'success': ok, 'status': 'ok' if ok else 'error', 'message': message,
            'provider': provider, 'recipient': recipient,
            'timestamp': timezone.now().isoformat(), 'details': details,
            'delivery_status': 'accepted' if ok else 'unconfirmed',
        }, status=200 if ok else 502)
