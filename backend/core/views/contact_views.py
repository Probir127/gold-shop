from django.conf import settings
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from core.utils.mailer import send_email_resilient
from core.throttles import VerificationThrottle
import re
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView


class ContactEnquiryView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [VerificationThrottle]

    def post(self, request):
        if request.data.get('website'):
            return Response({'detail': 'Your enquiry has been received.'}, status=201)
        name = str(request.data.get('name', '')).strip()
        mobile = str(request.data.get('mobile', '')).strip()
        email = str(request.data.get('email', '')).strip()
        contact = str(request.data.get('contact', '')).strip() or mobile or email
        message = str(request.data.get('message', '')).strip()

        if not (2 <= len(name) <= 150) or not contact or len(contact) > 254 or not (10 <= len(message) <= 5000) or '\n' in name or '\r' in name:
            return Response(
                {'detail': 'Please provide your name, phone or email, and a message of at least 10 characters.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if email:
                validate_email(email)
            if '@' in contact:
                validate_email(contact)
            elif not re.fullmatch(r'\+?[0-9 ()-]{7,25}', contact):
                raise ValidationError('Invalid phone')
        except ValidationError:
            return Response({'detail': 'Please provide a valid email address or phone number.'}, status=400)

        subject = f'New Sahara Gold and Diamond website enquiry from {name}'
        body = (
            f'New website enquiry\n\n'
            f'Name: {name}\n'
            f'Mobile: {mobile or "Not provided"}\n'
            f'Email: {email or "Not provided"}\n'
            f'Contact: {contact}\n\n'
            f'Message:\n{message}\n'
        )

        try:
            ok, _ = send_email_resilient(
                subject=subject,
                body=body,
                to_emails=[getattr(settings, 'ADMIN_NOTIFICATION_EMAIL', 'saharagold19@gmail.com')],
            )
            if not ok:
                raise RuntimeError('Delivery unavailable')
        except Exception:
            return Response(
                {'detail': 'We could not send your enquiry right now. Please call or email the showroom directly.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {'detail': 'Your enquiry has been sent. Our showroom team will contact you shortly.'},
            status=status.HTTP_201_CREATED,
        )
