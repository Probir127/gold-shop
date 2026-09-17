from django.conf import settings
from django.core.mail import send_mail
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView


class ContactEnquiryView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        name = str(request.data.get('name', '')).strip()
        mobile = str(request.data.get('mobile', '')).strip()
        email = str(request.data.get('email', '')).strip()
        contact = str(request.data.get('contact', '')).strip() or mobile or email
        message = str(request.data.get('message', '')).strip()

        if len(name) < 2 or not contact or len(message) < 10:
            return Response(
                {'detail': 'Please provide your name, phone or email, and a message of at least 10 characters.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subject = f'Sahara Gold website enquiry from {name}'
        body = (
            f'New website enquiry\n\n'
            f'Name: {name}\n'
            f'Mobile: {mobile or "Not provided"}\n'
            f'Email: {email or "Not provided"}\n'
            f'Contact: {contact}\n\n'
            f'Message:\n{message}\n'
        )

        try:
            send_mail(
                subject,
                body,
                settings.DEFAULT_FROM_EMAIL,
                [settings.STORE_EMAIL],
                fail_silently=False,
            )
        except Exception:
            return Response(
                {'detail': 'We could not send your enquiry right now. Please call or email the showroom directly.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {'detail': 'Your enquiry has been sent. Our showroom team will contact you shortly.'},
            status=status.HTTP_201_CREATED,
        )
