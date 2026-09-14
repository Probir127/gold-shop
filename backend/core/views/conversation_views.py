from __future__ import annotations
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics
from django.shortcuts import get_object_or_404
from ..models import Client, Conversation
from ..serializers import ConversationSerializer
from ..utils.whatsapp import send_text_message


class ConversationListView(generics.ListAPIView):
    serializer_class = ConversationSerializer

    def get_queryset(self):
        tenant = self.request.tenant
        client_id = self.kwargs['client_id']
        if not tenant:
            return Conversation.objects.none()
        return Conversation.objects.filter(tenant=tenant, client_id=client_id)


import uuid
import requests
import logging
from ..utils.telegram_utils import TelegramBot
from ..models import Channel

logger = logging.getLogger(__name__)

class SendMessageView(APIView):
    def post(self, request):
        tenant = request.tenant
        if not tenant:
            return Response({'detail': 'No tenant context.'}, status=400)

        client_id = request.data.get('client_id')
        message_text = request.data.get('message')
        channel_type = request.data.get('channel', 'whatsapp') # Default to whatsapp
        client = get_object_or_404(Client, id=client_id, tenant=tenant)

        result = {}
        msg_id = ''

        if channel_type == 'telegram':
            chat_id = client.external_ids.get('telegram')
            if not chat_id:
                return Response({'detail': 'Client has no Telegram ID linked.'}, status=400)
            
            token = tenant.external_ids.get('telegram_token')
            if not token:
                channel_obj = Channel.objects.filter(tenant=tenant, channel_type='telegram', is_active=True).first()
                if channel_obj:
                    token = channel_obj.config.get('bot_token')

            if not token:
                return Response({'detail': 'Telegram bot token not configured.'}, status=400)
            
            tg = TelegramBot(token)
            result = tg.send_message(chat_id, message_text)
            msg_id = str(result.get('result', {}).get('message_id', ''))

        elif channel_type in ('instagram', 'messenger'):
            ext_id = client.external_ids.get(channel_type)
            if not ext_id and client.phone:
                if channel_type == 'instagram' and client.phone.startswith('ig_'):
                    ext_id = client.phone[3:]
                elif channel_type == 'messenger' and client.phone.startswith('fb_'):
                    ext_id = client.phone[3:]

            if not ext_id:
                return Response({'detail': f'Client has no {channel_type.capitalize()} ID linked.'}, status=400)

            channel_obj = Channel.objects.filter(tenant=tenant, channel_type=channel_type, is_active=True).first()
            page_token = None
            if channel_obj:
                page_token = channel_obj.config.get('page_access_token')
            if not page_token:
                page_token = tenant.external_ids.get(f'{channel_type}_token') or tenant.external_ids.get('page_access_token')

            if not page_token:
                return Response({'detail': f'{channel_type.capitalize()} page access token not configured.'}, status=400)

            api_url = f"https://graph.facebook.com/v19.0/me/messages?access_token={page_token}"
            resp = requests.post(
                api_url,
                json={"recipient": {"id": ext_id}, "message": {"text": message_text}},
                timeout=10
            )
            result = resp.json()
            if resp.status_code != 200:
                return Response({'detail': f'Meta Graph API error: {result.get("error", {}).get("message", "Unknown error")}'}, status=400)
            msg_id = result.get('message_id', '')

        elif channel_type == 'web':
            msg_id = f"web_{uuid.uuid4().hex[:12]}"

        else:
            # Default to WhatsApp
            result = send_text_message(client.phone, message_text, tenant=tenant)
            msg_id = result.get('messages', [{}])[0].get('id', '')

        # Save to logs
        Conversation.objects.create(
            tenant=tenant,
            client=client,
            direction='outbound',
            channel=channel_type,
            message_text=message_text,
            wa_message_id=msg_id
        )

        # Auto-disable bot when team member sends a manual message
        if client.bot_enabled:
            client.bot_enabled = False
            client.save(update_fields=['bot_enabled'])

        return Response({
            'status': 'sent', 
            'channel': channel_type,
            'bot_enabled': client.bot_enabled, 
            'api_response': result
        })


class ToggleBotView(APIView):
    """Toggle the AI chatbot on/off for a specific client."""
    def post(self, request, client_id):
        tenant = request.tenant
        if not tenant:
            return Response({'detail': 'No tenant context.'}, status=400)

        client = get_object_or_404(Client, id=client_id, tenant=tenant)
        client.bot_enabled = not client.bot_enabled
        client.save(update_fields=['bot_enabled'])
        return Response({
            'status': 'ok',
            'bot_enabled': client.bot_enabled,
            'message': f"Bot {'enabled' if client.bot_enabled else 'disabled'} for {client.phone}"
        })
