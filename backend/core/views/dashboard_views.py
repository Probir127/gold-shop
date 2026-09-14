from __future__ import annotations
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Avg, Count, Q
from django.utils import timezone
from datetime import timedelta
import logging
from ..models import Client, Conversation, Invoice, BotAnalytics

logger = logging.getLogger(__name__)


class StatsView(APIView):
    def get(self, request):
        try:
            tenant = request.tenant
            if not tenant:
                return Response({'detail': 'No tenant context.'}, status=400)

            today = timezone.now().date()
            last_7_days = timezone.now() - timedelta(days=7)

            # ── 1. Bot Analytics KPIs (single-pass conditional aggregation) ─────────
            analytics_qs = BotAnalytics.objects.filter(tenant=tenant)
            bot_metrics = analytics_qs.aggregate(
                total=Count('id'),
                fallback=Count('id', filter=Q(was_fallback=True)),
                escalated=Count('id', filter=Q(was_escalated=True)),
                avg_ms=Avg('response_time_ms'),
            )
            total_bot_interactions = bot_metrics['total'] or 0
            fallback_count = bot_metrics['fallback'] or 0
            escalated_count = bot_metrics['escalated'] or 0
            avg_response_ms = bot_metrics['avg_ms'] or 0

            fallback_rate = round((fallback_count / total_bot_interactions * 100), 1) if total_bot_interactions else 0
            escalation_rate = round((escalated_count / total_bot_interactions * 100), 1) if total_bot_interactions else 0

            # ── 2. Distributions (last 7 days) ────────────────────────────────────
            intent_dist = (
                analytics_qs
                .filter(created_at__gte=last_7_days)
                .values('intent')
                .annotate(count=Count('id'))
                .order_by('-count')
            )

            channel_dist = (
                Conversation.objects.filter(tenant=tenant, timestamp__gte=last_7_days)
                .values('channel')
                .annotate(count=Count('id'))
                .order_by('-count')
            )

            sentiment_dist = (
                analytics_qs
                .filter(created_at__gte=last_7_days)
                .values('sentiment')
                .annotate(count=Count('id'))
                .order_by('-count')
            )

            # ── 3. Client Pipeline (single-pass conditional aggregation) ───────────
            client_metrics = Client.objects.filter(tenant=tenant).aggregate(
                total=Count('id'),
                leads=Count('id', filter=Q(status='lead')),
                active=Count('id', filter=Q(status='active')),
                invoiced=Count('id', filter=Q(status='invoiced')),
                completed=Count('id', filter=Q(status='completed')),
                pending_handoffs=Count('id', filter=Q(conversation_mode='pending')),
            )

            # ── 4. Invoice Pipeline (single-pass conditional aggregation) ──────────
            invoice_metrics = Invoice.objects.filter(tenant=tenant).aggregate(
                total=Count('id'),
                pending=Count('id', filter=Q(status='sent')),
                paid=Count('id', filter=Q(status='paid')),
                revenue=Sum('total_amount', filter=Q(status='paid')),
            )

            messages_today = Conversation.objects.filter(tenant=tenant, timestamp__date=today).count()

            return Response({
                # Client pipeline
                'total_clients':    client_metrics['total'] or 0,
                'leads':            client_metrics['leads'] or 0,
                'active':           client_metrics['active'] or 0,
                'invoiced':         client_metrics['invoiced'] or 0,
                'completed':        client_metrics['completed'] or 0,

                # Invoice pipeline
                'total_invoices':   invoice_metrics['total'] or 0,
                'pending_invoices': invoice_metrics['pending'] or 0,
                'paid_invoices':    invoice_metrics['paid'] or 0,
                'total_revenue':    invoice_metrics['revenue'] or 0,

                # Activity
                'messages_today':   messages_today,

                # Bot KPIs
                'bot_interactions':  total_bot_interactions,
                'fallback_rate':     fallback_rate,
                'escalation_rate':   escalation_rate,
                'avg_response_ms':   round(avg_response_ms),
                'pending_handoffs':  client_metrics['pending_handoffs'] or 0,
                'intent_distribution': list(intent_dist),
                'channel_distribution': list(channel_dist),
                'sentiment_distribution': list(sentiment_dist),

                # Tenant info
                'tenant_name': tenant.business_name,
                'tenant_plan': tenant.plan,
            })
        except Exception as e:
            logger.exception("StatsView failed for tenant")
            return Response({'detail': f'Backend error: {str(e)}'}, status=500)
