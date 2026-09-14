from __future__ import annotations
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from ..models import Tenant, Client, Conversation, Channel, BotAnalytics
from ..utils.telegram_utils import TelegramBot
from ..utils.ai_bot import generate_reply
import time
import secrets

logger = logging.getLogger(__name__)

class TelegramWebhookRegisterView(APIView):
    def post(self, request, tenant_slug):
        tenant = get_object_or_404(Tenant, slug=tenant_slug)
        # Verify tenant owns this request
        if request.tenant != tenant:
            return Response({"detail": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        token = tenant.external_ids.get('telegram_token')
        if not token:
            return Response({"detail": "Telegram bot token is not configured. Please save it first."}, status=status.HTTP_400_BAD_REQUEST)
            
        webhook_url = request.data.get('webhook_url')
        if not webhook_url:
            return Response({"detail": "Webhook URL is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        tg = TelegramBot(token)
        # Generate a secure token to verify incoming webhooks
        secret_token = secrets.token_urlsafe(32)
        
        # We need to store this secret token to verify incoming requests
        if 'tg_secret' not in tenant.external_ids:
            tenant.external_ids['tg_secret'] = secret_token
            tenant.save(update_fields=['external_ids'])
        else:
            secret_token = tenant.external_ids['tg_secret']

        result = tg.set_webhook(webhook_url, secret_token=secret_token)
        
        if result.get('ok'):
            return Response({"status": "success", "message": "Webhook registered successfully!"})
        else:
            return Response({"status": "error", "message": result.get('description', 'Failed to register webhook.')}, status=status.HTTP_400_BAD_REQUEST)

class TelegramWebhookView(APIView):
    permission_classes = []  # Public endpoint for Telegram

    def post(self, request, tenant_slug):
        tenant = get_object_or_404(Tenant, slug=tenant_slug)
        
        # Verify the webhook signature from Telegram
        secret_token = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
        expected_token = tenant.external_ids.get('tg_secret')
        if not expected_token or secret_token != expected_token:
            logger.warning(f"Rejected Telegram webhook for {tenant_slug}: Invalid secret token.")
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        
        if 'message' not in data:
            return Response({"status": "ignored"}, status=status.HTTP_200_OK)

        message = data['message']
        chat_id = str(message['chat']['id'])
        user_text = message.get('text', '')
        
        if not user_text:
            return Response({"status": "no text"}, status=status.HTTP_200_OK)

        # 1. Find or create client
        client = Client.objects.filter(tenant=tenant, external_ids__telegram=chat_id).first()
        if not client:
            client = Client.objects.filter(tenant=tenant, phone=f"tg_{chat_id}").first()
        
        if not client:
            client = Client.objects.create(
                tenant=tenant,
                phone=f"tg_{chat_id}",
                name=f"{message['from'].get('first_name', '')} {message['from'].get('last_name', '')}".strip() or "Telegram User",
                external_ids={"telegram": chat_id}
            )
        elif not client.external_ids or 'telegram' not in client.external_ids:
            if not isinstance(client.external_ids, dict):
                client.external_ids = {}
            client.external_ids['telegram'] = chat_id
            client.save(update_fields=['external_ids'])

        # 2. Save inbound message
        Conversation.objects.create(
            tenant=tenant,
            client=client,
            direction='inbound',
            channel='telegram',
            message_text=user_text
        )

        # 3. AI Response Loop (if bot enabled)
        if client.bot_enabled:
            start_time = time.time()
            
            try:
                # Use the real AI pipeline instead of the mock KnowledgeEngine
                result = generate_reply(client, user_text, tenant=tenant, channel='telegram')
                ai_reply = result['reply']
                
                # Save outbound message
                Conversation.objects.create(
                    tenant=tenant,
                    client=client,
                    direction='outbound',
                    channel='telegram',
                    message_text=ai_reply
                )
                
                # Send via Telegram
                token = tenant.external_ids.get('telegram_token')
                if not token:
                    channel_obj = Channel.objects.filter(tenant=tenant, channel_type='telegram', is_active=True).first()
                    if channel_obj:
                        token = channel_obj.config.get('bot_token')
                
                if token:
                    tg = TelegramBot(token)
                    tg.send_message(chat_id, ai_reply)
                
                # Log analytics
                BotAnalytics.objects.create(
                    tenant=tenant,
                    client=client,
                    channel='telegram',
                    user_message=user_text,
                    bot_reply=ai_reply,
                    intent=result['intent'],
                    sentiment=result['sentiment'],
                    response_time_ms=result['response_time_ms'],
                    was_fallback=result['was_fallback'],
                    was_escalated=result['was_escalated']
                )
                
            except Exception as e:
                logger.error(f"Telegram AI pipeline failed for chat {chat_id}: {e}")
                
        return Response({"status": "success"}, status=status.HTTP_200_OK)
