from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.conf import settings
from django.db import IntegrityError
from django.contrib.auth.hashers import check_password, make_password
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
import secrets
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
import logging
from .models import CustomerEmailVerification

logger = logging.getLogger(__name__)


def issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


def send_verification_code(user, code):
    subject = 'Verify your Sahara Gold customer account'
    body = (
        f'Dear {user.first_name or "Customer"},\n\n'
        f'Your Sahara Gold verification code is: {code}\n\n'
        'This code expires in 10 minutes. If you did not request this, you can ignore this email.\n\n'
        'Showroom: Bashundhara City Shopping Mall, Level 7, Block-A Shop-19, Dhaka.\n'
        'Hotline / WhatsApp: 01799-281878\n\n'
        'Regards,\nSahara Gold'
    )
    # Attempt 1: Standard configured backend (e.g. Port 465 SSL)
    try:
        send_mail(
            subject,
            body,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
        logger.info("Verification code sent via primary SMTP to %s", user.email)
        return True
    except Exception as primary_err:
        logger.warning("Primary SMTP failed for %s (%s). Trying port 587 TLS...", user.email, primary_err)

    # Attempt 2: Port 587 TLS fallback
    try:
        from django.core.mail.backends.smtp import EmailBackend
        from django.core.mail import EmailMessage
        tls_backend = EmailBackend(
            host=settings.EMAIL_HOST,
            port=587,
            username=settings.EMAIL_HOST_USER,
            password=settings.EMAIL_HOST_PASSWORD,
            use_tls=True,
            use_ssl=False,
            timeout=8,
        )
        msg = EmailMessage(
            subject=subject,
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
            connection=tls_backend,
        )
        msg.send(fail_silently=False)
        logger.info("Verification code sent via port 587 TLS to %s", user.email)
        return True
    except Exception as fallback_err:
        logger.error("All SMTP attempts failed for %s: %s", user.email, fallback_err)
        raise fallback_err


class CustomerRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        name = str(request.data.get('name', '')).strip()
        email = str(request.data.get('email', '')).strip().lower()
        phone = ''.join(char for char in str(request.data.get('phone', '')) if char.isdigit() or char == '+')
        password = str(request.data.get('password', ''))

        if not name or not email or len(password) < 8:
            return Response(
                {'detail': 'Full name, valid email address, and a password of at least 8 characters are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_email(email)
        except ValidationError:
            return Response({'detail': 'Please provide a valid email address.'}, status=status.HTTP_400_BAD_REQUEST)

        if not phone:
            phone = email

        existing_user = User.objects.filter(email__iexact=email).first()
        if existing_user:
            if existing_user.is_active:
                return Response({'detail': 'An account already exists with this email address. Please sign in.'}, status=status.HTTP_409_CONFLICT)
            # Existing inactive account (e.g. previous verification attempt timed out): reuse user
            user = existing_user
            user.set_password(password)
            if name:
                user.first_name = name[:150]
            user.save()
        else:
            if User.objects.filter(username=phone).exists():
                username_to_use = email
            else:
                username_to_use = phone

            try:
                user = User.objects.create_user(
                    username=username_to_use,
                    password=password,
                    email=email,
                    first_name=name[:150],
                )
            except IntegrityError:
                return Response({'detail': 'Unable to create the account. Please try a different email.'}, status=status.HTTP_409_CONFLICT)

        user.is_active = False
        user.save(update_fields=['is_active'])
        code = f'{secrets.randbelow(1000000):06d}'
        CustomerEmailVerification.objects.update_or_create(
            user=user,
            defaults={
                'code_hash': make_password(code),
                'expires_at': timezone.now() + timedelta(minutes=10),
                'attempts': 0,
            },
        )

        email_sent = False
        try:
            send_verification_code(user, code)
            email_sent = True
        except Exception as exc:
            logger.warning('Verification email could not be sent to %s via SMTP (%s). Code: %s', email, exc, code)

        return Response(
            {
                'verification_required': True,
                'email': email,
                'email_sent': email_sent,
                'dev_code': code if not email_sent else None,
            },
            status=status.HTTP_201_CREATED,
        )


class CustomerVerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        code = str(request.data.get('code', '')).strip()
        user = User.objects.filter(email__iexact=email).first()
        verification = CustomerEmailVerification.objects.filter(user=user).first() if user else None

        if not user or not verification or user.is_active:
            return Response({'detail': 'Verification request is invalid or already completed.'}, status=status.HTTP_400_BAD_REQUEST)
        if verification.expires_at <= timezone.now():
            return Response({'detail': 'This verification code has expired. Please register again.'}, status=status.HTTP_400_BAD_REQUEST)
        if verification.attempts >= 5:
            return Response({'detail': 'Too many incorrect attempts. Please register again.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        verification.attempts += 1
        verification.save(update_fields=['attempts'])
        if len(code) != 6 or not check_password(code, verification.code_hash):
            return Response({'detail': 'Incorrect verification code.'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = True
        user.save(update_fields=['is_active'])
        verification.delete()
        return Response({**issue_tokens(user), 'customer': {
            'name': user.first_name or 'Sahara Customer',
            'phone': user.username,
            'email': user.email,
        }})


class CustomerLoginView(APIView):
    """
    Allows customers to sign in using their Email Address OR Phone Number.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # Can be sent as 'email', 'phone', or 'identifier'
        identifier = str(
            request.data.get('email') or 
            request.data.get('phone') or 
            request.data.get('identifier') or 
            ''
        ).strip()
        password = str(request.data.get('password', ''))

        if not identifier or not password:
            return Response(
                {'detail': 'Email address (or phone) and password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 1. Look up user by email (case-insensitive)
        user = User.objects.filter(email__iexact=identifier).first()

        # 2. If not found by email, look up by username / phone
        if not user:
            user = User.objects.filter(username__iexact=identifier).first()

        # 3. If still not found, try stripped numeric phone
        if not user:
            clean_digits = ''.join(c for c in identifier if c.isdigit())
            if clean_digits:
                user = User.objects.filter(username__endswith=clean_digits[-10:]).first()

        if not user:
            return Response(
                {'detail': 'No account found with this email or phone. Please click "Create Account" below.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not user.check_password(password):
            return Response(
                {'detail': 'Incorrect password. Please check your password and try again.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response({'detail': 'Account is inactive. Please contact support.'}, status=status.HTTP_403_FORBIDDEN)

        return Response({
            **issue_tokens(user),
            'customer': {
                'name': user.first_name or 'Sahara Customer',
                'phone': user.username,
                'email': user.email,
            }
        })
