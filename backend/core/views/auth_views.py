from __future__ import annotations
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import exceptions
from django.contrib.auth.models import User
from django.db.models import Q
from ..serializers import UserSerializer, TenantMembershipSerializer
from ..models import TenantMembership, Tenant


class AdminTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Flexible admin login serializer:
    Allows authentication by username (case-insensitive) OR email (case-insensitive).
    Supports 'admin', 'shara_gold', 'sahara_gold', or 'saharagold19@gmail.com'.
    """
    def validate(self, attrs):
        raw_identifier = str(attrs.get('username') or attrs.get('email') or '').strip()
        password = str(attrs.get('password') or '')

        if not raw_identifier or not password:
            raise exceptions.AuthenticationFailed('Username/email and password are required.')

        user = User.objects.filter(
            Q(username__iexact=raw_identifier) | Q(email__iexact=raw_identifier)
        ).first()

        if not user:
            normalized = raw_identifier.lower().replace(' ', '_').replace('-', '_')
            user = User.objects.filter(username__iexact=normalized).first()

        if not user or not user.check_password(password):
            raise exceptions.AuthenticationFailed('Invalid credentials. Please verify your username and password.')

        if not user.is_active:
            raise exceptions.AuthenticationFailed('This user account is inactive.')

        refresh = self.get_token(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = AdminTokenObtainPairSerializer


class RefreshView(TokenRefreshView):
    permission_classes = [AllowAny]


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_serializer = UserSerializer(request.user)

        # Ensure owner is member of their tenants
        owned_tenants = Tenant.objects.filter(owner=request.user)
        for ot in owned_tenants:
            TenantMembership.objects.get_or_create(
                user=request.user,
                tenant=ot,
                defaults={'role': 'admin'}
            )

        # If staff or superuser, guarantee they have a membership to the main store workspace
        if request.user.is_staff or request.user.is_superuser:
            main_tenant = Tenant.objects.filter(slug='sahara-gold').first() or Tenant.objects.first()
            if main_tenant:
                TenantMembership.objects.get_or_create(
                    user=request.user,
                    tenant=main_tenant,
                    defaults={'role': 'admin'}
                )

        memberships = TenantMembership.objects.filter(user=request.user).select_related('tenant')
        membership_serializer = TenantMembershipSerializer(memberships, many=True)
        return Response({
            'user': user_serializer.data,
            'memberships': membership_serializer.data
        })
