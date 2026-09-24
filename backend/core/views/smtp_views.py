import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.conf import settings
from django.template.loader import render_to_string
from core.utils.mailer import send_email_resilient
from core.permissions import IsTenantManagerOrStaff
import logging

logger = logging.getLogger(__name__)


class SMTPDiagnosticView(APIView):
    """
    Staff-only diagnostic endpoint to test and verify the SMTP configuration.
    Sends a branded Sahara Gold HTML verification email via the resilient SMTP dispatcher.

    POST /api/smtp/test/
    Optional body: { "email": "test@example.com" }

    Returns structured JSON:
    {
      "success": true | false,
      "status": "ok" | "error",
      "message": "...",
      "provider": "smtp",
      "recipient": "...",
      "timestamp": "ISO-8601",
      "details": { host, port, user, password_configured }
    }
    """
    permission_classes = [IsTenantManagerOrStaff]

    def post(self, request):
        test_recipient = str(request.data.get('email', '')).strip() or getattr(settings, 'STORE_EMAIL', 'saharagold19@gmail.com')

        info = {
            'host': getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com'),
            'port_primary': 465,
            'port_fallback': 587,
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

        html_message = None
        try:
            html_message = render_to_string('emails/otp_verification.html', {
                'user_name': 'System Administrator',
                'verification_code': 'SMTP-OK',
            })
        except Exception as tmpl_err:
            logger.warning("Could not render HTML for SMTP test: %s", tmpl_err)

        ok, msg = send_email_resilient(
            subject=subject,
            body=body,
            to_emails=[test_recipient],
            html_message=html_message,
        )

        timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if ok:
            return Response({
                'success': True,
                'status': 'ok',
                'message': f'SMTP check passed. Verification message delivered: {msg}',
                'provider': 'smtp',
                'recipient': test_recipient,
                'timestamp': timestamp,
                'details': info,
            })
        else:
            return Response({
                'success': False,
                'status': 'error',
                'message': f'SMTP delivery failed: {msg}',
                'error': f'SMTP delivery failed: {msg}',
                'provider': 'smtp',
                'recipient': test_recipient,
                'timestamp': timestamp,
                'details': info,
            }, status=500)
