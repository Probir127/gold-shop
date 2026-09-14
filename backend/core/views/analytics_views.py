from __future__ import annotations
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from ..models import BotAnalytics, Client
from ..serializers import BotAnalyticsSerializer


class BotAnalyticsListView(generics.ListAPIView):
    """
    GET /api/analytics/bot/
    Supports ?client=<phone>, ?intent=<intent>, and ?days=<N> filters.
    """
    serializer_class   = BotAnalyticsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        tenant = self.request.tenant
        if not tenant:
            return BotAnalytics.objects.none()

        qs = BotAnalytics.objects.filter(tenant=tenant).select_related('client').order_by('-created_at')

        # ── Time window filter ─────────────────────────────────
        days = self.request.query_params.get('days')
        if days:
            try:
                since = timezone.now() - timedelta(days=int(days))
                qs = qs.filter(created_at__gte=since)
            except ValueError:
                pass  # ignore malformed ?days= value

        # ── Optional additional filters ────────────────────────
        client_phone = self.request.query_params.get('client')
        intent       = self.request.query_params.get('intent')
        if client_phone:
            qs = qs.filter(client__phone__icontains=client_phone)
        if intent:
            qs = qs.filter(intent=intent)

        return qs


class HandoffClaimView(APIView):
    """
    POST /api/clients/<client_id>/claim-handoff/
    Team member claims a pending handoff — moves client from 'pending' to 'agent'.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, client_id):
        from django.shortcuts import get_object_or_404
        tenant = request.tenant
        if not tenant:
            return Response({'detail': 'No tenant context.'}, status=400)

        client = get_object_or_404(Client, pk=client_id, tenant=tenant)

        if client.conversation_mode not in ('pending', 'bot'):
            return Response({'detail': f'Client is already in {client.conversation_mode} mode.'}, status=400)

        client.conversation_mode = 'agent'
        client.assigned_agent    = request.user
        client.save(update_fields=['conversation_mode', 'assigned_agent'])

        return Response({
            'status': 'claimed',
            'conversation_mode': 'agent',
            'assigned_to': request.user.username,
        })


class HandoffReleaseView(APIView):
    """
    POST /api/clients/<client_id>/release-handoff/
    Returns conversation back to the bot after the team has resolved it.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, client_id):
        from django.shortcuts import get_object_or_404
        tenant = request.tenant
        if not tenant:
            return Response({'detail': 'No tenant context.'}, status=400)

        client = get_object_or_404(Client, pk=client_id, tenant=tenant)
        client.conversation_mode = 'bot'
        client.bot_enabled       = True
        client.assigned_agent    = None
        client.escalation_reason = ''
        client.escalated_at      = None
        client.save(update_fields=[
            'conversation_mode', 'bot_enabled',
            'assigned_agent', 'escalation_reason', 'escalated_at'
        ])

        return Response({'status': 'released', 'conversation_mode': 'bot'})
