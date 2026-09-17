from __future__ import annotations
"""
System health & diagnostics views — admin/manager only.
GET /api/system/health/  — Returns overall system health snapshot.
"""
import logging
import platform
import time
from datetime import timedelta

import django
from django.conf import settings
from django.core.mail import get_connection
from django.db import connection
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsTenantManagerOrStaff
from ..models import BotAnalytics, Client, Conversation, Invoice

logger = logging.getLogger(__name__)


class SystemHealthView(APIView):
    """
    GET /api/system/health/
    Returns a comprehensive system snapshot: DB, SMTP, storage stats,
    and tenant-scoped record counts.
    """
    permission_classes = [IsTenantManagerOrStaff]

    def get(self, request):
        tenant = request.tenant
        if not tenant:
            return Response({'detail': 'No tenant context.'}, status=400)

        health: dict = {
            'timestamp': timezone.now().isoformat(),
            'django_version': django.__version__,
            'python_version': platform.python_version(),
            'debug_mode': settings.DEBUG,
        }

        # ── Database ping ──────────────────────────────────────────────
        db_ok = False
        db_latency_ms = None
        try:
            t0 = time.monotonic()
            with connection.cursor() as cur:
                cur.execute('SELECT 1')
            db_latency_ms = round((time.monotonic() - t0) * 1000, 1)
            db_ok = True
        except Exception as exc:
            logger.warning('DB health check failed: %s', exc)

        health['database'] = {
            'ok': db_ok,
            'latency_ms': db_latency_ms,
            'engine': connection.settings_dict.get('ENGINE', '').split('.')[-1],
        }

        # ── SMTP ping (connection only — no email sent) ────────────────
        smtp_ok = False
        smtp_error = None
        try:
            conn = get_connection()
            conn.open()
            conn.close()
            smtp_ok = True
        except Exception as exc:
            smtp_error = str(exc)
            logger.info('SMTP health check failed: %s', exc)

        health['smtp'] = {
            'ok': smtp_ok,
            'host': settings.EMAIL_HOST,
            'port': settings.EMAIL_PORT,
            'user': settings.EMAIL_HOST_USER,
            'configured': bool(settings.EMAIL_HOST_PASSWORD),
            'error': smtp_error,
        }

        # ── Cache check ────────────────────────────────────────────────
        cache_backend = settings.CACHES.get('default', {}).get('BACKEND', '')
        health['cache'] = {
            'backend': cache_backend.split('.')[-1],
            'redis': 'redis' in cache_backend.lower(),
        }

        # ── Tenant record counts ───────────────────────────────────────
        now = timezone.now()
        last_7d = now - timedelta(days=7)
        health['tenant_stats'] = {
            'clients':         Client.objects.filter(tenant=tenant).count(),
            'conversations':   Conversation.objects.filter(tenant=tenant).count(),
            'invoices':        Invoice.objects.filter(tenant=tenant).count(),
            'paid_invoices':   Invoice.objects.filter(tenant=tenant, status='paid').count(),
            'bot_interactions': BotAnalytics.objects.filter(tenant=tenant).count(),
            'interactions_7d': BotAnalytics.objects.filter(
                tenant=tenant, created_at__gte=last_7d
            ).count(),
        }

        # ── Overall status ─────────────────────────────────────────────
        health['overall'] = 'healthy' if (db_ok and smtp_ok) else ('degraded' if db_ok else 'critical')

        return Response(health)
