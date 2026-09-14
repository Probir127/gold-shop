from __future__ import annotations
"""
Reset/Maintenance views — Scoped to the current Tenant.
All endpoints require authentication. Destructive actions are strictly isolated.
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from ..models import BotAnalytics, Conversation, Client, BotConfig
from ..models import DEFAULT_SYSTEM_PROMPT

logger = logging.getLogger(__name__)


class ResetView(APIView):
    """
    POST /api/reset/
    Body: { "action": "<action_name>" }

    Available actions (Scoped to current Tenant):
      release_handoffs  — Move all pending/agent clients back to bot mode
      clear_analytics   — Delete all BotAnalytics records
      clear_conversations — Delete ALL conversation history
      reset_bot_config  — Revert system prompt to factory default
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        tenant = request.tenant
        if not tenant:
            return Response({'detail': 'No tenant context.'}, status=400)

        action = request.data.get('action')
        user   = request.user.username
        
        log_prefix = f'[RESET][Tenant:{tenant.slug}]'

        if action == 'release_handoffs':
            affected = Client.objects.filter(
                tenant=tenant,
                conversation_mode__in=['pending', 'agent']
            ).update(
                conversation_mode='bot',
                bot_enabled=True,
                assigned_agent_id=None,
                escalation_reason='',
                escalated_at=None,
            )
            logger.warning('%s %s released %d handoffs', log_prefix, user, affected)
            return Response({'status': 'ok', 'affected': affected,
                             'message': f'{affected} conversation(s) returned to bot mode.'})

        elif action == 'clear_analytics':
            count, _ = BotAnalytics.objects.filter(tenant=tenant).delete()
            logger.warning('%s %s deleted %d BotAnalytics records', log_prefix, user, count)
            return Response({'status': 'ok', 'affected': count,
                             'message': f'{count} analytics record(s) deleted.'})

        elif action == 'clear_conversations':
            count, _ = Conversation.objects.filter(tenant=tenant).delete()
            logger.warning('%s %s deleted %d conversation records', log_prefix, user, count)
            return Response({'status': 'ok', 'affected': count,
                             'message': f'{count} conversation(s) deleted.'})

        elif action == 'clear_clients':
            # ── Admin-only + explicit confirmation required ────────────────
            if not request.user.is_staff:
                return Response(
                    {'detail': 'This action requires staff/admin privileges.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            confirm = request.data.get('confirm', '')
            if confirm != 'DELETE ALL':
                return Response(
                    {'detail': 'Confirmation required. Send {"confirm": "DELETE ALL"} to proceed.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Deleting clients will cascade delete their Conversations, Invoices, and Analytics!
            count, _ = Client.objects.filter(tenant=tenant).delete()
            logger.warning('%s %s deleted %d client records (FULL WIPE)', log_prefix, user, count)
            return Response({'status': 'ok', 'affected': count,
                             'message': f'All {count} client(s) and their data have been permanently deleted.'})

        elif action == 'reset_bot_config':
            from ..utils.prompt_builder import build_system_prompt
            config = BotConfig.get_config(tenant)
            config.system_prompt = build_system_prompt(tenant)
            config.save(update_fields=['system_prompt'])
            logger.warning('%s %s reset bot system prompt to personalized default', log_prefix, user)
            return Response({'status': 'ok', 'affected': 1,
                             'message': 'System prompt reverted to default.'})

        else:
            return Response(
                {'detail': f'Unknown action: {action}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
