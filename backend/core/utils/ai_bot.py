from __future__ import annotations
"""
GrownK AI Chatbot Engine — Omnichannel / Multi-Tenant
Generates replies using tenant-specific prompts, knowledge base, and LLM config.
"""
import time
import logging
from huggingface_hub import InferenceClient
from django.conf import settings
from django.utils import timezone
from ..models import Conversation, BotConfig
from .intent_classifier import classify_intent, get_quick_reply, HANDOFF_REPLY
from .sentiment_analyzer import analyze_sentiment

logger = logging.getLogger(__name__)

# ── Token budget ───────────────────────────────────────────────
CONTEXT_CHAR_LIMIT = 8000
RECENT_MSG_COUNT   = 8

# ── Handoff sentinel — AI responds with this to trigger escalation ──
HANDOFF_TOKEN = '[HANDOFF]'


def _get_hf_client(tenant=None):
    """
    Create an HuggingFace InferenceClient.
    Uses tenant's BYOK API key if configured, otherwise global key.
    """
    if tenant and tenant.llm_mode == 'byok' and tenant.llm_api_key:
        api_key = tenant.llm_api_key
    else:
        api_key = settings.HUGGINGFACE_API_KEY

    model_name = 'Qwen/Qwen2.5-72B-Instruct'
    if tenant and tenant.llm_model_name:
        model_name = tenant.llm_model_name

    return InferenceClient(model_name, token=api_key)


def get_conversation_history(client, tenant=None, query: str = None) -> list[dict]:
    """Token-aware sliding window context builder — tenant-aware."""
    recent_qs = (
        Conversation.objects
        .filter(client=client)
        .order_by('-timestamp')[:RECENT_MSG_COUNT]
    )
    recent = list(reversed(list(recent_qs)))

    total_count  = Conversation.objects.filter(client=client).count()
    older_count  = max(0, total_count - RECENT_MSG_COUNT)

    # Get tenant-specific system prompt
    if tenant:
        bot_config = BotConfig.get_config(tenant)
        if bot_config.custom_prompt_override:
            system_prompt = bot_config.custom_prompt_override
        else:
            from .prompt_builder import build_system_prompt
            system_prompt = build_system_prompt(tenant, query=query)
    else:
        system_prompt = "You are a helpful AI assistant."

    messages = [{"role": "system", "content": system_prompt}]

    if older_count > 0:
        messages.append({
            "role": "system",
            "content": (
                f"[Context: {older_count} earlier messages exist before this window.]"
            )
        })

    char_used = 0
    for msg in recent:
        text = msg.message_text
        if char_used + len(text) > CONTEXT_CHAR_LIMIT:
            text = text[:CONTEXT_CHAR_LIMIT - char_used]
        role = 'user' if msg.direction == 'inbound' else 'assistant'
        messages.append({"role": role, "content": text})
        char_used += len(text)
        if char_used >= CONTEXT_CHAR_LIMIT:
            break

    return messages


def _handle_handoff(client, reason: str) -> str:
    """Trigger human handoff — update client state and return confirmation."""
    client.conversation_mode = 'pending'
    client.escalation_reason = reason
    client.escalated_at = timezone.now()
    client.bot_enabled = False
    client.save(update_fields=['conversation_mode', 'escalation_reason', 'escalated_at', 'bot_enabled'])
    logger.info(f"Handoff triggered for {client.phone}: {reason}")
    return HANDOFF_REPLY


def generate_reply(client, user_message: str, tenant=None, channel: str = 'whatsapp') -> dict:
    """
    Main entry point. Returns a dict with:
      - reply (str): the message to send
      - intent (str): classified intent
      - sentiment (str): positive/neutral/negative
      - was_fallback (bool): True if AI failed
      - was_escalated (bool): True if handoff triggered
      - response_time_ms (int): how long generation took
    """
    start_ms = int(time.time() * 1000)
    sentiment = analyze_sentiment(user_message)

    # ── Step 1: Classify intent ────────────────────────────
    intent, _ = classify_intent(user_message)

    # ── Step 2: Human agent request — instant handoff ──────
    if intent == 'human_agent':
        reply = _handle_handoff(client, 'Customer requested human agent')
        return _make_result(reply, intent, sentiment, start_ms, was_escalated=True)

    # ── Step 3: Quick replies — no LLM needed ─────────────
    quick = get_quick_reply(intent, tenant=tenant)
    if quick:
        return _make_result(quick, intent, sentiment, start_ms)

    # ── Step 4: Complaint — de-escalation mode ────────────
    de_escalation_note = None
    if intent == 'complaint':
        de_escalation_note = (
            "[INTERNAL GUIDANCE: This customer may be frustrated. "
            "Be extra empathetic, apologise briefly, and offer to escalate to the team if needed.]"
        )

    # ── Step 5: LLM call — tenant-aware ───────────────────
    try:
        hf_client = _get_hf_client(tenant)
        messages  = get_conversation_history(client, tenant, query=user_message)
        if de_escalation_note:
            messages.append({"role": "system", "content": de_escalation_note})
        messages.append({"role": "user", "content": user_message})

        response = hf_client.chat_completion(
            messages=messages,
            max_tokens=500,
            temperature=0.7,
        )
        reply = response.choices[0].message.content.strip()

        if not reply:
            return _make_result(_fallback_reply(tenant), intent, sentiment, start_ms, was_fallback=True)

        # ── Step 6: Check if LLM decided to escalate ──────
        if reply.startswith(HANDOFF_TOKEN):
            reason = reply.replace(HANDOFF_TOKEN, '').strip()
            reply = _handle_handoff(client, reason or 'AI-initiated escalation')
            return _make_result(reply, intent, sentiment, start_ms, was_escalated=True)

        return _make_result(reply, intent, sentiment, start_ms)

    except Exception as e:
        logger.error(f"LLM API error for {client.phone}: {e}")
        return _make_result(_fallback_reply(tenant), intent, sentiment, start_ms, was_fallback=True)


def _make_result(reply, intent, sentiment, start_ms, was_fallback=False, was_escalated=False) -> dict:
    return {
        'reply': reply,
        'intent': intent,
        'sentiment': sentiment,
        'was_fallback': was_fallback,
        'was_escalated': was_escalated,
        'response_time_ms': int(time.time() * 1000) - start_ms,
    }


def _fallback_reply(tenant=None) -> str:
    biz_name = tenant.business_name if tenant else 'our team'
    website = tenant.website_url if tenant and tenant.website_url else ''
    msg = (
        f"Thanks for your message! 😊\n\n"
        f"{biz_name} will get back to you shortly."
    )
    if website:
        msg += f"\nIn the meantime, feel free to check out {website}"
    return msg
