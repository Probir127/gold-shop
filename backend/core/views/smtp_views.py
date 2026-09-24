from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.conf import settings
from core.utils.mailer import send_email_resilient
import logging

logger = logging.getLogger(__name__)


class SMTPDiagnosticView(APIView):
    """
    Staff-only diagnostic endpoint to test and verify the SMTP configuration.
    POST /api/smtp/test/
    Optional body: { "email": "test@example.com" }
    """
    permission_classes = [IsAdminUser]

    def post(self, request):
        test_recipient = str(request.data.get('email', '')).strip() or getattr(settings, 'STORE_EMAIL', 'saharagold19@gmail.com')

        info = {
            'host': getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com'),
            'port': getattr(settings, 'EMAIL_PORT', 465),
            'fallback_port': 587,
            'user': getattr(settings, 'EMAIL_HOST_USER', 'saharagold19@gmail.com'),
            'from_email': getattr(settings, 'DEFAULT_FROM_EMAIL', 'saharagold19@gmail.com'),
            'password_configured': bool(getattr(settings, 'EMAIL_HOST_PASSWORD', '')),
        }

        subject = 'Sahara Gold System Alert: SMTP Verification Test'
        body = (
            "Hello,\n\n"
            "This is an automated diagnostic verification message from the Sahara Gold command center.\n"
            f"Your SMTP mail server ({info['host']}) is operational and ready to dispatch customer invoices and verification codes.\n\n"
            f"From: {info['from_email']}\n"
            f"To: {test_recipient}\n\n"
            "Regards,\nSahara Gold Tech Operations"
        )

        ok, msg = send_email_resilient(
            subject=subject,
            body=body,
            to_emails=[test_recipient],
        )

        if ok:
            return Response({
                'success': True,
                'connection_ok': True,
                'email_sent': True,
                'recipient': test_recipient,
                'message': f"SMTP check passed! Verification message successfully delivered: {msg}",
                'details': info
            })
        else:
            return Response({
                'success': False,
                'connection_ok': False,
                'email_sent': False,
                'error': f"SMTP delivery failed: {msg}",
                'details': info
            }, status=500)
