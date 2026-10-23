from __future__ import annotations
from core.login_guard import login_key, check_login, failed_login, successful_login
import threading
import secrets
import logging
from datetime import timedelta
from django.contrib.auth.models import User
from django.conf import settings
from django.db import IntegrityError, transaction
from django.contrib.auth.password_validation import validate_password
from core.throttles import LoginThrottle, VerificationThrottle
from django.contrib.auth.hashers import check_password, make_password
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.template.loader import render_to_string
from core.utils.mailer import send_email_resilient
from .models import CustomerEmailVerification

logger = logging.getLogger(__name__)


def issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


def verification_delivery(email):
    captured = bool(getattr(settings, 'LOCAL_EMAIL_CAPTURE_DIR', None))
    return {
        'delivery_status': 'captured' if captured else 'accepted',
        'message': ('Verification email saved locally; nothing was sent to your inbox.'
                    if captured else f'Your verification email for {email} was accepted for delivery. Check your inbox or spam folder.'),
    }


def send_verification_code(user, code: str) -> tuple[bool, str]:
    """
    Sends the 6-digit email verification code using the unified resilient SMTP mailer.
    Tries Port 465 (SSL) first, then falls back to Port 587 (TLS).
    """
    subject = 'Verify your New Sahara Gold and Diamond customer account'
    body = (
        f'Dear {user.first_name or "Customer"},\n\n'
        f'Your New Sahara Gold and Diamond verification code is: {code}\n\n'
        'This code expires in 15 minutes. '
        'Enter this code on the verification screen to activate your account.\n\n'
        'If you did not request this account, please disregard this email.\n\n'
        'Showroom: Bashundhara City Shopping Mall, Level 7, Block-A Shop-19, Dhaka.\n'
        'Hotline / WhatsApp: 01799-281878\n\n'
        'Regards,\nNew Sahara Gold and Diamond'
    )
    html_message = None
    try:
        html_message = render_to_string('emails/otp_verification.html', {
            'user_name': user.first_name or 'Customer',
            'verification_code': code,
        })
    except Exception:
        pass
    return send_email_resilient(
        subject=subject,
        body=body,
        to_emails=[user.email],
        html_message=html_message,
    )


def _send_welcome_email(user):
    """Dispatches a welcome email in background once account is officially verified."""
    try:
        subject = 'Welcome to New Sahara Gold and Diamond!'
        body = (
            f'Dear {user.first_name or "Customer"},\n\n'
            'Your New Sahara Gold and Diamond account has been verified and activated successfully.\n\n'
            'You can now track your orders, view hallmark certifications, and manage your fine jewelry purchases.\n\n'
            'Showroom: Bashundhara City Shopping Mall, Level 7, Block-A Shop-19, Dhaka.\n'
            'Hotline / WhatsApp: 01799-281878\n\n'
            'Regards,\nNew Sahara Gold and Diamond'
        )
        html_message = None
        try:
            html_message = render_to_string('emails/otp_verification.html', {
                'user_name': user.first_name or 'Customer',
                'verification_code': 'Welcome!',
            })
        except Exception:
            pass
        send_email_resilient(subject=subject, body=body, to_emails=[user.email], html_message=html_message)
    except Exception as e:
        logger.debug("Welcome email dispatch notice for %s: %s", user.email, e)


class CustomerRegisterView(APIView):
    """
    Customer Registration:
    Creates an inactive account and delivers a genuine 6-digit verification code via SMTP.
    Account remains inactive until the recipient enters the valid verification code.
    NO demo codes, NO fake verifications, NO bypass.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [VerificationThrottle]

    def post(self, request):
        name = str(request.data.get('name', '')).strip()
        email = str(request.data.get('email', '')).strip().lower()
        phone = ''.join(c for c in str(request.data.get('phone', '')) if c.isdigit() or c == '+')
        password = str(request.data.get('password', ''))

        if not name or len(name) > 150 or not email or len(email) > 150 or len(password) < 8 or len(password) > 128:
            return Response(
                {'detail': 'Full name, valid email address, and a password of at least 8 characters are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_email(email)
        except ValidationError:
            return Response({'detail': 'Please provide a valid email address.'}, status=status.HTTP_400_BAD_REQUEST)

        if phone and (len(phone) > 20 or not phone.lstrip('+').isdigit()):
            return Response({'detail': 'Please provide a valid phone number.'}, status=400)
        try:
            validate_password(password, User(username=email, email=email, first_name=name))
        except ValidationError as exc:
            return Response({'detail': ' '.join(exc.messages)}, status=400)

        if not phone:
            phone = email

        existing = User.objects.filter(email__iexact=email).first()
        if existing:
            if existing.is_staff or existing.is_superuser or not CustomerEmailVerification.objects.filter(user=existing).exists():
                return Response({'detail': 'Unable to register this account. Please contact the showroom.'}, status=400)
            if existing.is_active:
                return Response(
                    {'detail': 'An account already exists with this email address. Please sign in.'},
                    status=status.HTTP_409_CONFLICT,
                )
            # Inactive account from prior incomplete registration: update credentials
            user = existing
            user.set_password(password)
            if name:
                user.first_name = name[:150]
            user.save()
        else:
            uname = email if User.objects.filter(username=phone).exists() else phone
            try:
                user = User.objects.create_user(
                    username=uname, password=password,
                    email=email, first_name=name[:150],
                )
            except IntegrityError:
                return Response(
                    {'detail': 'Unable to create the account. Please try a different email.'},
                    status=status.HTTP_409_CONFLICT,
                )

        # Ensure account is inactive until email is verified
        user.is_active = False
        user.save(update_fields=['is_active'])

        code = f'{secrets.randbelow(1000000):06d}'
        CustomerEmailVerification.objects.update_or_create(
            user=user,
            defaults={
                'code_hash': make_password(code),
                'expires_at': timezone.now() + timedelta(minutes=15),
                'attempts': 0,
            },
        )

        ok, mail_msg = send_verification_code(user, code)
        if not ok:
            logger.error("Verification email failed for %s: %s", email, mail_msg)
            return Response(
                {
                    'detail': 'Unable to deliver the verification email. Please try again shortly.',
                    'email': email,
                    'verification_required': True,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                'verification_required': True,
                'email': email,
                **verification_delivery(email),
            },
            status=status.HTTP_201_CREATED,
        )


class CustomerResendVerificationView(APIView):
    """
    Allows a customer to request a fresh verification code if the previous one expired or was not received.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [VerificationThrottle]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        if not email:
            return Response({'detail': 'Email address is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'detail': 'No account found with this email address.'}, status=status.HTTP_404_NOT_FOUND)

        if user.is_staff or user.is_superuser or not CustomerEmailVerification.objects.filter(user=user).exists():
            return Response({'detail': 'Verification request is invalid.'}, status=400)

        if user.is_active:
            return Response({'detail': 'This account is already verified and active. Please sign in.'}, status=status.HTTP_400_BAD_REQUEST)

        code = f'{secrets.randbelow(1000000):06d}'
        CustomerEmailVerification.objects.update_or_create(
            user=user,
            defaults={
                'code_hash': make_password(code),
                'expires_at': timezone.now() + timedelta(minutes=15),
                'attempts': 0,
            },
        )

        ok, mail_msg = send_verification_code(user, code)
        if not ok:
            return Response(
                {'detail': 'Unable to resend code. Please try again shortly.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            verification_delivery(email),
            status=status.HTTP_200_OK,
        )


class CustomerVerifyEmailView(APIView):
    """
    Validates the 6-digit code sent to customer email.
    Activates the user account upon successful verification.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [VerificationThrottle]

    @transaction.atomic
    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        code = str(request.data.get('code', '')).strip()

        if not email or not code:
            return Response({'detail': 'Both email and 6-digit verification code are required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        verification = CustomerEmailVerification.objects.select_for_update().filter(user=user).first() if user else None

        if not user or not verification:
            return Response({'detail': 'Verification request is invalid or does not exist.'}, status=status.HTTP_400_BAD_REQUEST)

        if user.is_staff or user.is_superuser or not CustomerEmailVerification.objects.filter(user=user).exists():
            return Response({'detail': 'Verification request is invalid.'}, status=400)

        if user.is_active:
            return Response({'detail': 'This account is already verified. Please sign in.'}, status=status.HTTP_400_BAD_REQUEST)

        if verification.expires_at <= timezone.now():
            return Response({'detail': 'This verification code has expired. Please request a new code below.'}, status=status.HTTP_400_BAD_REQUEST)

        if verification.attempts >= 5:
            return Response({'detail': 'Too many incorrect attempts. Please request a new verification code.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        verification.attempts += 1
        verification.save(update_fields=['attempts'])

        if len(code) != 6 or not check_password(code, verification.code_hash):
            return Response({'detail': 'Incorrect verification code. Please check your email and try again.'}, status=status.HTTP_400_BAD_REQUEST)

        # Official verification success: Activate account
        user.is_active = True
        user.save(update_fields=['is_active'])
        verification.delete()

        # Send only after the activation transaction commits successfully.
        transaction.on_commit(lambda: threading.Thread(target=_send_welcome_email, args=(user,), daemon=True).start())

        return Response({
            **issue_tokens(user),
            'customer': {
                'name': user.first_name or 'Sahara Customer',
                'phone': user.username,
                'email': user.email,
            },
            'message': 'Account verified successfully! Welcome to New Sahara Gold and Diamond.',
        })


class CustomerLoginView(APIView):
    """
    Allows customers to sign in using their Email Address OR Phone Number.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginThrottle]

    def post(self, request):
        identifier = str(
            request.data.get('email') or
            request.data.get('phone') or
            request.data.get('identifier') or
            ''
        ).strip()
        password = str(request.data.get('password', ''))

        if not identifier or not password or len(identifier) > 254 or len(password) > 1024:
            return Response(
                {'detail': 'Email address (or phone) and password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email__iexact=identifier).first()
        if not user:
            user = User.objects.filter(username__iexact=identifier).first()
        if not user:
            clean_digits = ''.join(c for c in identifier if c.isdigit())
            if len(clean_digits) >= 10 and all(c.isdigit() or c in '+ -()' for c in identifier):
                user = User.objects.filter(username__endswith=clean_digits[-10:]).first()

        guard_key = login_key(identifier, user)
        check_login(guard_key)

        if not user:
            failed_login(guard_key)
            return Response(
                {'detail': 'Invalid email/phone or password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.check_password(password):
            failed_login(guard_key)
            return Response(
                {'detail': 'Invalid email/phone or password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {
                    'detail': 'Your email address is not verified yet. Please enter the verification code sent to your email.',
                    'verification_required': True,
                    'email': user.email,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        successful_login(guard_key)
        return Response({
            **issue_tokens(user),
            'customer': {
                'name': user.first_name or 'Sahara Customer',
                'phone': user.username,
                'email': user.email,
            },
        })
