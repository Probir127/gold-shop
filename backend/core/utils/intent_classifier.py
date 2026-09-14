from __future__ import annotations
"""
Intent Classifier — Now tenant-aware.
Classifies inbound messages before hitting the expensive LLM.

Benefits:
- Instant replies for greetings (no API cost)
- Automatic human handoff detection
- Complaint routing to de-escalation mode
- ~40% reduction in unnecessary LLM calls
"""

import re

# ── Intent keyword patterns ───────────────────────────────────────────────────
# Order matters — more specific patterns are checked first
INTENT_PATTERNS = {
    'human_agent': [
        'talk to human', 'talk to a human', 'real person', 'real human',
        'talk to agent', 'talk to someone', 'speak to agent', 'speak to human',
        'human please', 'agent please', 'manager', 'supervisor',
        'connect me to', 'get someone', 'মানুষের সাথে কথা', 'আসল মানুষ',
    ],
    'complaint': [
        'problem', 'issue', 'not working', 'broken', 'error', 'failed', 'failure',
        'frustrated', 'disappointed', 'terrible', 'worst', 'awful', 'horrible',
        'refund', 'money back', 'scam', 'fraud', 'cheated', 'lied',
        'সমস্যা', 'কাজ করছে না', 'ভাঙা', 'রিফান্ড',
    ],
    'pricing': [
        'price', 'pricing', 'cost', 'costs', 'how much', 'rate', 'rates', 'fee', 'fees', 'charge', 'package',
        'packages', 'pricing plan', 'plans', 'budget', 'afford', 'expensive', 'cheap', 'discount',
        'কত', 'দাম', 'মূল্য', 'প্যাকেজ', 'ছাড়',
    ],
    'greeting': [
        'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
        'assalamualaikum', 'salam', 'salaam', 'howdy', "what's up", 'whats up',
        'হ্যালো', 'সালাম', 'আসসালামু আলাইকুম', 'শুভেচ্ছা',
    ],
    'services': [
        'services', 'service', 'what do you offer', 'what can you do', 'what do you provide',
        'offerings', 'portfolio', 'your work', 'our work', 'capabilities',
        'সেবা', 'কী করেন', 'কী অফার করেন',
    ],
    'contact': [
        'contact', 'reach out', 'call you', 'call me', 'phone call', 'email', 'address', 'location', 'office',
        'phone number', 'whatsapp number', 'meet up', 'visit office',
        'যোগাযোগ', 'ঠিকানা', 'অফিস',
    ],
}

# Handoff reply is always the same regardless of tenant
HANDOFF_REPLY = (
    "Of course! I'm connecting you with our team right away. 🙏\n\n"
    "A team member will message you shortly. "
    "In the meantime, feel free to share any details about what you need so we can help better! 😊"
)


def classify_intent(message: str) -> tuple[str, float]:
    """
    Classify the intent of an inbound message using word boundary matching.

    Returns:
        (intent_name, confidence)
        intent_name: one of 'human_agent', 'complaint', 'pricing',
                     'greeting', 'services', 'contact', or 'general'
        confidence: 1.0 for rule-based match, 0.5 for general (needs LLM)
    """
    msg_lower = message.lower().strip()

    # Check each intent in priority order
    for intent, keywords in INTENT_PATTERNS.items():
        for kw in keywords:
            # Enforce boundary matching so 'hi' doesn't match 'this' or 'shipment'
            pattern = r'(?<![a-zA-Z0-9])' + re.escape(kw) + r'(?![a-zA-Z0-9])'
            if re.search(pattern, msg_lower):
                return intent, 1.0

    return 'general', 0.5


def get_quick_reply(intent: str, tenant=None) -> str | None:
    """
    Return an instant reply for intents that don't need the LLM.
    Now uses tenant's business info for personalized responses.
    Returns None if the LLM should handle it.
    """
    if intent == 'greeting':
        return _greeting_reply(tenant)
    if intent == 'contact':
        return _contact_reply(tenant)
    return None  # All other intents go to the LLM


def _greeting_reply(tenant=None) -> str:
    if tenant:
        biz_name = tenant.business_name
        tagline = f' — {tenant.tagline}' if tenant.tagline else ''
        return (
            f"Hello! 👋 Welcome to {biz_name}{tagline}.\n\n"
            f"How can I help you today? Feel free to ask about our services, "
            f"products, or anything else! 😊"
        )
    return (
        "Hello! 👋 Welcome!\n\n"
        "How can I help you today? Feel free to ask about our services or anything else! 😊"
    )


def _contact_reply(tenant=None) -> str:
    if tenant:
        lines = ["Here's how to reach us directly:\n"]
        if tenant.contact_email:
            lines.append(f"📧 Email: {tenant.contact_email}")
        if tenant.contact_phone:
            lines.append(f"📱 Phone: {tenant.contact_phone}")
        if tenant.address:
            lines.append(f"📍 Address: {tenant.address}")
        if tenant.website_url:
            lines.append(f"🌐 Website: {tenant.website_url}")

        social = tenant.social_links or {}
        for platform, handle in social.items():
            if handle:
                lines.append(f"📲 {platform.title()}: {handle}")

        lines.append("\nWe're happy to help! 🙏")
        return '\n'.join(lines)

    return (
        "Please contact us through our website or the information provided. "
        "We're happy to help! 🙏"
    )
