from __future__ import annotations
from django.views import View
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.conf import settings
from ..models import Client, Conversation, BotAnalytics, Tenant
from ..utils.whatsapp import send_text_message
from ..utils.ai_bot import generate_reply
from ..utils.security import verify_webhook_signature
import json
import logging

logger = logging.getLogger(__name__)

MAX_MESSAGE_LENGTH = 4000  # Cap inbound messages to avoid token overflow


@method_decorator(csrf_exempt, name='dispatch')
class WebhookView(View):
    """
    WhatsApp Cloud API Webhook — now tenant-aware.

    Route: /webhook/whatsapp/<tenant_slug>/
    Meta calls GET once to verify, then POST for every message event.
    """

    def _resolve_tenant(self, slug=None):
        """Resolve tenant from URL slug or fall back to global config."""
        if slug:
            try:
                return Tenant.objects.get(slug=slug, is_active=True, wa_connected=True)
            except Tenant.DoesNotExist:
                return None

        # Fallback: find tenant matching global PHONE_NUMBER_ID
        phone_id = settings.PHONE_NUMBER_ID
        if phone_id:
            tenant = Tenant.objects.filter(
                wa_phone_number_id=phone_id, is_active=True
            ).first()
            if tenant:
                return tenant

        # Last resort: first active tenant (backward compat for single-tenant setups)
        return Tenant.objects.filter(is_active=True).first()

    # ── Step 1: Meta verifies your endpoint once ──────────
    def get(self, request, tenant_slug=None):
        tenant = self._resolve_tenant(tenant_slug)

        # Use tenant-specific verify token, or fallback to global
        verify_token = settings.WEBHOOK_VERIFY_TOKEN
        if tenant and tenant.wa_webhook_token:
            verify_token = tenant.wa_webhook_token

        mode      = request.GET.get('hub.mode')
        token     = request.GET.get('hub.verify_token')
        challenge = request.GET.get('hub.challenge')

        if mode == 'subscribe' and token == verify_token:
            return HttpResponse(challenge, content_type='text/plain')
        return HttpResponse('Forbidden', status=403)

    # ── Step 2: Meta sends message events here ────────────
    def post(self, request, tenant_slug=None):
        # ── Security: Verify the payload came from Meta ───
        if not verify_webhook_signature(request):
            logger.warning(f"Rejected webhook with invalid signature from {request.META.get('REMOTE_ADDR')}")
            return HttpResponse('Invalid signature', status=403)

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'status': 'invalid json'}, status=400)

        # Extract message from Meta's nested payload
        try:
            entry   = data['entry'][0]
            change  = entry['changes'][0]['value']
            message = change['messages'][0]
        except (KeyError, IndexError, TypeError):
            return JsonResponse({'status': 'ignored'})

        phone    = message['from']
        msg_type = message.get('type', '')
        msg_id   = message.get('id', '')

        # ── Resolve tenant ─────────────────────────────────
        tenant = self._resolve_tenant(tenant_slug)
        if not tenant:
            logger.error(f"No tenant found for webhook slug={tenant_slug}")
            return JsonResponse({'status': 'no_tenant'}, status=404)

        client, created = Client.objects.get_or_create(
            tenant=tenant,
            phone=phone,
            defaults={'service_selected': ''}
        )

        # ── Handle non-text messages ───────────────────────
        if msg_type != 'text':
            if msg_id and not Conversation.objects.filter(wa_message_id=msg_id).exists():
                Conversation.objects.create(
                    tenant=tenant,
                    client=client, direction='inbound',
                    channel='whatsapp',
                    message_text=f'[{msg_type} message]', wa_message_id=msg_id,
                )
            if client.bot_enabled and client.conversation_mode == 'bot':
                reply = (
                    "Thanks for your message! 😊 "
                    "We can currently process text messages only. "
                    "Please type your query and we'll be happy to help!"
                )
                result = send_text_message(phone, reply, tenant=tenant)
                Conversation.objects.create(
                    tenant=tenant,
                    client=client, direction='outbound',
                    channel='whatsapp',
                    message_text=reply,
                    wa_message_id=result.get('messages', [{}])[0].get('id', ''),
                )
            return JsonResponse({'status': 'ok'})

        text = message['text']['body'][:MAX_MESSAGE_LENGTH]

        if created:
            client.service_selected = text[:255]
            client.save(update_fields=['service_selected'])

        # ── Deduplicate ────────────────────────────────────
        if msg_id and Conversation.objects.filter(wa_message_id=msg_id).exists():
            return JsonResponse({'status': 'duplicate'})

        Conversation.objects.create(
            tenant=tenant,
            client=client, direction='inbound',
            channel='whatsapp',
            message_text=text, wa_message_id=msg_id,
        )

        # ── AI Auto-reply (only in 'bot' mode) ────────────
        if client.bot_enabled and client.conversation_mode == 'bot':
            try:
                result = generate_reply(client, text, tenant=tenant, channel='whatsapp')
                reply  = result['reply']

                wa_result = send_text_message(phone, reply, tenant=tenant)
                Conversation.objects.create(
                    tenant=tenant,
                    client=client, direction='outbound',
                    channel='whatsapp',
                    message_text=reply,
                    wa_message_id=wa_result.get('messages', [{}])[0].get('id', ''),
                )

                # ── Log analytics ──────────────────────────
                BotAnalytics.objects.create(
                    tenant=tenant,
                    client=client,
                    channel='whatsapp',
                    user_message=text,
                    bot_reply=reply,
                    intent=result['intent'],
                    sentiment=result['sentiment'],
                    response_time_ms=result['response_time_ms'],
                    was_fallback=result['was_fallback'],
                    was_escalated=result['was_escalated'],
                )
                logger.info(
                    f"Bot [{result['intent']}] replied to {phone} (tenant={tenant.slug}) "
                    f"in {result['response_time_ms']}ms | "
                    f"fallback={result['was_fallback']} escalated={result['was_escalated']}"
                )
            except Exception as e:
                logger.error(f"Bot reply pipeline failed for {phone} (tenant={tenant.slug}): {e}")

        return JsonResponse({'status': 'ok'})
