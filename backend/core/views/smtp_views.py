from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.conf import settings
from django.core.mail import get_connection, send_mail
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
            'backend': settings.EMAIL_BACKEND,
            'host': settings.EMAIL_HOST,
            'port': settings.EMAIL_PORT,
            'use_ssl': settings.EMAIL_USE_SSL,
            'use_tls': settings.EMAIL_USE_TLS,
            'user': settings.EMAIL_HOST_USER,
            'from_email': settings.DEFAULT_FROM_EMAIL,
            'password_configured': bool(settings.EMAIL_HOST_PASSWORD),
        }

        # Step 1: Test raw TCP & SSL/TLS connection handshake
        try:
            conn = get_connection()
            conn.open()
            conn.close()
        except Exception as conn_err:
            logger.error("SMTP Connection handshake failed: %s", conn_err)
            return Response({
                'success': False,
                'connection_ok': False,
                'error': f"SMTP handshake failed: {str(conn_err)}",
                'details': info
            }, status=500)

        # Step 2: Test sending an actual verification message
        try:
            send_mail(
                'Sahara Gold System Alert: SMTP Verification Test',
                (
                    f"Hello,\n\n"
                    f"This is an automated diagnostic verification message from the Sahara Gold command center.\n"
                    f"Your SMTP mail server ({settings.EMAIL_HOST}:{settings.EMAIL_PORT}) is fully operational, "
                    f"connected via SSL, and ready to dispatch customer invoices and verification codes.\n\n"
                    f"Server: {settings.EMAIL_HOST}\n"
                    f"From: {settings.DEFAULT_FROM_EMAIL}\n\n"
                    f"Regards,\nSahara Gold Tech Operations"
                ),
                settings.DEFAULT_FROM_EMAIL,
                [test_recipient],
                fail_silently=False
            )
            return Response({
                'success': True,
                'connection_ok': True,
                'email_sent': True,
                'recipient': test_recipient,
                'message': f"SMTP check passed! Verification message successfully delivered to {test_recipient}",
                'details': info
            })
        except Exception as mail_err:
            logger.error("SMTP delivery test failed: %s", mail_err)
            return Response({
                'success': False,
                'connection_ok': True,
                'email_sent': False,
                'error': f"SMTP delivery failed: {str(mail_err)}",
                'details': info
            }, status=500)
