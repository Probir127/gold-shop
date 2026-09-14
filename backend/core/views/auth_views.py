from __future__ import annotations
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..serializers import UserSerializer, TenantMembershipSerializer
from ..models import TenantMembership

class LoginView(TokenObtainPairView):
    pass

class RefreshView(TokenRefreshView):
    pass

class MeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user_serializer = UserSerializer(request.user)
        from ..models import Tenant
        owned_tenants = Tenant.objects.filter(owner=request.user)
        for ot in owned_tenants:
            TenantMembership.objects.get_or_create(
                user=request.user,
                tenant=ot,
                defaults={'role': 'admin'}
            )
        memberships = TenantMembership.objects.filter(user=request.user).select_related('tenant')
        membership_serializer = TenantMembershipSerializer(memberships, many=True)
        return Response({
            'user': user_serializer.data,
            'memberships': membership_serializer.data
        })
