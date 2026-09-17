from __future__ import annotations
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from ..models import TenantMembership
from ..serializers import TenantMembershipSerializer

class MemberListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """List all members of the current tenant."""
        members = TenantMembership.objects.filter(tenant=request.tenant)
        serializer = TenantMembershipSerializer(members, many=True)
        return Response(serializer.data)

class InviteMemberAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Add a user to the current tenant by email."""
        # Only admins can invite
        current_membership = TenantMembership.objects.filter(user=request.user, tenant=request.tenant).first()
        if not current_membership or current_membership.role != 'admin':
            return Response({'detail': 'Only admins can invite members.'}, status=403)

        email = request.data.get('email')
        role  = request.data.get('role', 'agent')

        if not email:
            return Response({'detail': 'Email is required.'}, status=400)

        try:
            target_user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'User with this email not found.'}, status=404)

        # Check if already a member
        if TenantMembership.objects.filter(user=target_user, tenant=request.tenant).exists():
            return Response({'detail': 'User is already a member of this workspace.'}, status=400)

        # Create membership
        membership = TenantMembership.objects.create(
            user=target_user,
            tenant=request.tenant,
            role=role
        )
        serializer = TenantMembershipSerializer(membership)
        return Response(serializer.data, status=201)

class RemoveMemberAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, member_id):
        """Remove a member from the current tenant."""
        # Only admins can remove
        current_membership = TenantMembership.objects.filter(user=request.user, tenant=request.tenant).first()
        if not current_membership or current_membership.role != 'admin':
            return Response({'detail': 'Only admins can remove members.'}, status=403)

        try:
            target_membership = TenantMembership.objects.get(id=member_id, tenant=request.tenant)
            
            # Cannot remove yourself
            if target_membership.user == request.user:
                return Response({'detail': 'You cannot remove yourself.'}, status=400)
                
            target_membership.delete()
            return Response({'status': 'Member removed.'})
        except TenantMembership.DoesNotExist:
            return Response({'detail': 'Member not found.'}, status=404)
