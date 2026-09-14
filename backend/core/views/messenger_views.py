from __future__ import annotations
import json
import logging
import time
import requests
from django.views import View
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.shortcuts import get_object_or_404
from django.conf import settings
from ..models import Tenant, Client, Conversation, Channel, BotAnalytics
from ..utils.security import verify_webhook_signature
from ..utils.ai_bot import generate_reply

logger = logging.getLogger(__name__)

MAX_MESSAGE_LENGTH = 4000

@method_decorator(csrf_exempt, name='dispatch')
class MessengerWebhookView(View):
    """
    Facebook Messenger Webhook receiver — fully tenant-aware and integrated with the GrownK AI pipeline.
    
    Route: /api/webhooks/messenger/<slug:tenant_slug>/
    """

    def _get_channel(self, tenant):
        """Helper to get active Messenger channel config."""
        return Channel.objects.filter(tenant=tenant, channel_type='messenger', is_active=True).first()

    def get(self, request, tenant_slug):
        """
        Meta Webhook Verification GET request.
        """
        tenant = get_object_or_404(Tenant, slug=tenant_slug)
        channel = self._get_channel(tenant)
        
        # Resolve verify token: tenant specific config -> fallback to global
        verify_token = settings.WEBHOOK_VERIFY_TOKEN
        if channel and channel.config.get('verify_token'):
            verify_token = channel.config.get('verify_token')
        elif tenant.wa_webhook_token:
            verify_token = tenant.wa_webhook_token

        mode = request.GET.get('hub.mode')
        token = request.GET.get('hub.verify_token')
        challenge = request.GET.get('hub.challenge')

        if mode == 'subscribe' and token == verify_token:
            logger.info(f"Facebook Messenger webhook successfully verified for tenant {tenant_slug}")
            return HttpResponse(challenge, content_type='text/plain')
            
        logger.warning(f"Forbidden Facebook Messenger webhook verification attempt for tenant {tenant_slug}")
        return HttpResponse('Forbidden', status=403)

    def post(self, request, tenant_slug):
        """
        Handles incoming Messenger message webhook POST events from Meta.
        """
        # Validate that payload is genuinely from Meta
        if not verify_webhook_signature(request):
            logger.warning(f"Rejected Messenger webhook with invalid signature from {request.META.get('REMOTE_ADDR')}")
            return HttpResponse('Invalid signature', status=403)

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'status': 'invalid json'}, status=400)

        tenant = get_object_or_404(Tenant, slug=tenant_slug)
        channel = self._get_channel(tenant)
        
        if not channel:
            logger.error(f"Active Messenger channel not found for tenant: {tenant_slug}")
            return JsonResponse({'status': 'channel_inactive'}, status=400)

        # Meta sends message events inside a nested payload
        try:
            for entry in data.get('entry', []):
                for messaging_event in entry.get('messaging', []):
                    sender_id = messaging_event['sender']['id']
                    recipient_id = messaging_event['recipient']['id']
                    
                    # Deduplicate outbound bot responses sent back as webhook echoes
                    if sender_id == channel.config.get('messenger_page_id'):
                        continue
                        
                    if 'message' in messaging_event:
                        message = messaging_event['message']
                        
                        # Handle text messages
                        if 'text' in message:
                            user_text = message['text'][:MAX_MESSAGE_LENGTH]
                            msg_id = message.get('mid', '')
                            
                            # 1. Deduplicate messages
                            if msg_id and Conversation.objects.filter(tenant=tenant, channel='messenger', wa_message_id=msg_id).exists():
                                continue
                                
                            # 2. Get or create Client per tenant
                            client, created = Client.objects.get_or_create(
                                tenant=tenant,
                                phone=f"fb_{sender_id}",
                                defaults={
                                    'name': f"Facebook User {sender_id[:6]}",
                                    'external_ids': {"messenger": sender_id}
                                }
                            )
                            
                            # If client exists but does not have Messenger mapping saved
                            if not created and client.external_ids.get('messenger') != sender_id:
                                client.external_ids['messenger'] = sender_id
                                client.save(update_fields=['external_ids'])

                            # 3. Log inbound conversation
                            Conversation.objects.create(
                                tenant=tenant,
                                client=client,
                                direction='inbound',
                                channel='messenger',
                                message_text=user_text,
                                wa_message_id=msg_id
                            )

                            # 4. Trigger AI bot pipeline if enabled
                            if client.bot_enabled and client.conversation_mode == 'bot':
                                self._trigger_ai_reply(tenant, channel, client, sender_id, user_text, msg_id)

        except Exception as e:
            logger.error(f"Error parsing Messenger webhook payload for tenant {tenant_slug}: {e}")
            return JsonResponse({'status': 'error', 'details': str(e)}, status=500)

        return JsonResponse({'status': 'ok'})

    def _trigger_ai_reply(self, tenant, channel, client, sender_id, user_text, msg_id):
        """Invokes generate_reply and sends response to Messenger via Graph API."""
        try:
            start_time = time.time()
            
            # Run LLM pipeline
            result = generate_reply(client, user_text, tenant=tenant, channel='messenger')
            ai_reply = result['reply']
            
            # Send DM via Meta Graph API
            page_access_token = channel.config.get('page_access_token')
            if not page_access_token:
                logger.error(f"Missing page_access_token in Messenger config for {tenant.slug}")
                return
                
            api_url = f"https://graph.facebook.com/v19.0/me/messages?access_token={page_access_token}"
            payload = {
                "recipient": {"id": sender_id},
                "message": {"text": ai_reply}
            }
            
            resp = requests.post(api_url, json=payload)
            resp_data = resp.json()
            
            if resp.status_code != 200:
                logger.error(f"Meta Graph API Messenger send failed: {resp_data}")
                return

            outbound_msg_id = resp_data.get('message_id', '')

            # Save outbound reply
            Conversation.objects.create(
                tenant=tenant,
                client=client,
                direction='outbound',
                channel='messenger',
                message_text=ai_reply,
                wa_message_id=outbound_msg_id
            )

            # Log bot analytics
            BotAnalytics.objects.create(
                tenant=tenant,
                client=client,
                channel='messenger',
                user_message=user_text,
                bot_reply=ai_reply,
                intent=result['intent'],
                sentiment=result['sentiment'],
                response_time_ms=result['response_time_ms'],
                was_fallback=result['was_fallback'],
                was_escalated=result['was_escalated']
            )

        except Exception as e:
            logger.error(f"Failed to generate/send Messenger reply to {sender_id}: {e}")
