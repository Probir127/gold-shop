from __future__ import annotations
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Avg, Q, Sum
from django.utils import timezone
from datetime import timedelta
from core.models import BotAnalytics, Client, Invoice, Conversation
import json


class AIAnalyticsStatsView(APIView):
    """
    GET /api/analytics/ai-stats/?days=30
    Returns a comprehensive analytics payload for the AI Analytics Dashboard.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.tenant
        if not tenant:
            return Response({'detail': 'No tenant context.'}, status=400)

        days = int(request.query_params.get('days', 30))
        since = timezone.now() - timedelta(days=days)
        now = timezone.now()

        qs = BotAnalytics.objects.filter(tenant=tenant)
        qs_period = qs.filter(created_at__gte=since)

        # ── 1. Top-level KPIs ────────────────────────────────────────────────
        kpis = qs_period.aggregate(
            total=Count('id'),
            fallbacks=Count('id', filter=Q(was_fallback=True)),
            escalated=Count('id', filter=Q(was_escalated=True)),
            resolved=Count('id', filter=Q(is_resolved=True)),
            avg_ms=Avg('response_time_ms'),
            pos=Count('id', filter=Q(sentiment='positive')),
            neu=Count('id', filter=Q(sentiment='neutral')),
            neg=Count('id', filter=Q(sentiment='negative')),
        )
        total = kpis['total'] or 0
        fallbacks = kpis['fallbacks'] or 0
        escalated = kpis['escalated'] or 0
        avg_ms = round(kpis['avg_ms'] or 0)

        # ── 2. Previous period comparison ────────────────────────────────────
        prev_since = since - timedelta(days=days)
        prev = qs.filter(created_at__gte=prev_since, created_at__lt=since).aggregate(
            total=Count('id'),
            fallbacks=Count('id', filter=Q(was_fallback=True)),
        )
        prev_total = prev['total'] or 1  # avoid div/0
        prev_fallbacks = prev['fallbacks'] or 0

        # ── 3. Daily trend (last N days, grouped by date) ────────────────────
        from django.db.models.functions import TruncDate
        daily_raw = (
            qs_period
            .annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(
                total=Count('id'),
                success=Count('id', filter=Q(was_fallback=False, was_escalated=False)),
                fallback=Count('id', filter=Q(was_fallback=True)),
                escalated=Count('id', filter=Q(was_escalated=True)),
            )
            .order_by('day')
        )
        daily_trend = [
            {
                'date': str(r['day']),
                'total': r['total'],
                'success': r['success'],
                'fallback': r['fallback'],
                'escalated': r['escalated'],
            }
            for r in daily_raw
        ]

        # ── 4. Hourly activity heatmap (0–23) ────────────────────────────────
        from django.db.models.functions import ExtractHour
        hourly_raw = (
            qs_period
            .annotate(hour=ExtractHour('created_at'))
            .values('hour')
            .annotate(count=Count('id'))
            .order_by('hour')
        )
        hourly = {r['hour']: r['count'] for r in hourly_raw}
        hourly_data = [{'hour': h, 'count': hourly.get(h, 0)} for h in range(24)]

        # ── 5. Intent distribution ────────────────────────────────────────────
        intent_dist = list(
            qs_period
            .values('intent')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        # ── 6. Channel distribution ───────────────────────────────────────────
        channel_dist = list(
            qs_period
            .values('channel')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # ── 7. Sentiment breakdown ────────────────────────────────────────────
        sentiment_data = {
            'positive': kpis['pos'] or 0,
            'neutral': kpis['neu'] or 0,
            'negative': kpis['neg'] or 0,
        }

        # ── 8. Top 10 most active clients ────────────────────────────────────
        top_clients_raw = (
            qs_period
            .values('client__id', 'client__name', 'client__phone', 'channel')
            .annotate(interactions=Count('id'))
            .order_by('-interactions')[:10]
        )
        top_clients = [
            {
                'id': str(r['client__id']),
                'name': r['client__name'] or 'Anonymous',
                'phone': r['client__phone'],
                'channel': r['channel'],
                'interactions': r['interactions'],
            }
            for r in top_clients_raw
        ]

        # ── 9. Recent 20 interactions ─────────────────────────────────────────
        recent_raw = (
            qs_period
            .select_related('client')
            .order_by('-created_at')[:20]
        )
        recent = [
            {
                'id': str(r.id),
                'client_phone': r.client.phone if r.client else '—',
                'client_name': r.client.name if r.client else '—',
                'channel': r.channel,
                'intent': r.intent,
                'sentiment': r.sentiment,
                'response_time_ms': r.response_time_ms,
                'was_fallback': r.was_fallback,
                'was_escalated': r.was_escalated,
                'is_resolved': r.is_resolved,
                'created_at': r.created_at.isoformat(),
            }
            for r in recent_raw
        ]

        # ── 10. Revenue correlation (invoices in same period) ─────────────────
        invoice_data = Invoice.objects.filter(
            tenant=tenant, created_at__gte=since
        ).aggregate(
            count=Count('id'),
            paid=Count('id', filter=Q(status='paid')),
            revenue=Sum('total_amount', filter=Q(status='paid')),
        )

        # ── 11. Client pipeline ───────────────────────────────────────────────
        client_pipeline = Client.objects.filter(tenant=tenant).aggregate(
            total=Count('id'),
            leads=Count('id', filter=Q(status='lead')),
            active=Count('id', filter=Q(status='active')),
            invoiced=Count('id', filter=Q(status='invoiced')),
            completed=Count('id', filter=Q(status='completed')),
        )

        # ── 12. Response time buckets ─────────────────────────────────────────
        rt_fast   = qs_period.filter(response_time_ms__lt=500).count()
        rt_medium = qs_period.filter(response_time_ms__gte=500, response_time_ms__lt=2000).count()
        rt_slow   = qs_period.filter(response_time_ms__gte=2000).count()

        return Response({
            'period_days': days,
            'generated_at': now.isoformat(),

            # KPIs
            'total_interactions': total,
            'fallback_count': fallbacks,
            'fallback_rate': round((fallbacks / total * 100), 1) if total else 0,
            'escalation_count': escalated,
            'escalation_rate': round((escalated / total * 100), 1) if total else 0,
            'resolution_rate': round(((kpis['resolved'] or 0) / total * 100), 1) if total else 0,
            'avg_response_ms': avg_ms,
            'success_count': total - fallbacks - escalated,

            # Trends vs previous period
            'trend_interactions': round(((total - prev_total) / prev_total * 100), 1),
            'trend_fallbacks': round(((fallbacks - prev_fallbacks) / max(prev_fallbacks, 1) * 100), 1),

            # Sentiment
            'sentiment': sentiment_data,

            # Distributions
            'daily_trend': daily_trend,
            'hourly_activity': hourly_data,
            'intent_distribution': intent_dist,
            'channel_distribution': channel_dist,

            # Clients
            'top_clients': top_clients,
            'client_pipeline': {
                'total': client_pipeline['total'] or 0,
                'leads': client_pipeline['leads'] or 0,
                'active': client_pipeline['active'] or 0,
                'invoiced': client_pipeline['invoiced'] or 0,
                'completed': client_pipeline['completed'] or 0,
            },

            # Recent interactions table
            'recent_interactions': recent,

            # Response time
            'response_time_buckets': {
                'fast': rt_fast,
                'medium': rt_medium,
                'slow': rt_slow,
            },

            # Revenue correlation
            'invoices_period': {
                'count': invoice_data['count'] or 0,
                'paid': invoice_data['paid'] or 0,
                'revenue': float(invoice_data['revenue'] or 0),
            },
        })
