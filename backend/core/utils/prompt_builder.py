from __future__ import annotations
"""
Prompt Builder — Generates tenant-specific system prompts from structured data.
Replaces the old hardcoded SYSTEM_PROMPT in ai_bot.py.
"""


PERSONALITY_MAP = {
    'professional': (
        'Professional, warm, and confident — like a luxury brand concierge. '
        'Use formal but approachable language.'
    ),
    'friendly': (
        'Warm, enthusiastic, and personable — like chatting with a helpful friend. '
        'Use casual but respectful language.'
    ),
    'casual': (
        'Relaxed, fun, and easygoing. Use informal language, slang is fine. '
        'Keep the vibe light and conversational.'
    ),
}

LANGUAGE_MAP = {
    'auto': 'Always respond in the same language the customer writes in.',
    'en':   'Always respond in English.',
    'bn':   'Always respond in Bengali (বাংলা).',
    'both': 'Respond in both English and Bengali based on what the customer uses.',
}


def build_system_prompt(tenant, query: str = None) -> str:
    """
    Auto-generate a complete system prompt from tenant's structured fields
    and knowledge base chunks. If query is provided, performs semantic RAG.
    """
    from ..models import KnowledgeChunk

    personality_desc = PERSONALITY_MAP.get(tenant.personality, PERSONALITY_MAP['professional'])
    language_instruction = LANGUAGE_MAP.get(tenant.language, LANGUAGE_MAP['auto'])

    # ── Build business description section ─────────────────────────
    biz_lines = []
    if tenant.tagline:
        biz_lines.append(f'- Tagline: "{tenant.tagline}"')
    if tenant.description:
        biz_lines.append(f'- {tenant.description}')
    if tenant.website_url:
        biz_lines.append(f'- Website: {tenant.website_url}')

    social = tenant.social_links or {}
    for platform, handle in social.items():
        if handle:
            biz_lines.append(f'- {platform.title()}: {handle}')

    business_description = '\n'.join(biz_lines) if biz_lines else 'A trusted business.'

    # ── Gather knowledge chunks (top-K by hybrid semantic + PostgreSQL trigram) ──
    KNOWLEDGE_CHAR_BUDGET = 4000
    chunks = KnowledgeChunk.objects.filter(tenant=tenant, source__status='ready')

    if query and chunks.exists():
        from .embeddings import get_embedding, cosine_similarity
        from django.contrib.postgres.search import TrigramSimilarity

        # 1. Accelerated PostgreSQL trigram candidate search using chunk_content_trgm_idx
        candidate_chunks = list(
            chunks.annotate(lexical_score=TrigramSimilarity('content', query))
                  .filter(lexical_score__gt=0.08)
                  .order_by('-lexical_score')[:20]
        )

        # 2. If lexical matches are few (e.g. purely conceptual queries), supplement with recent chunks
        if len(candidate_chunks) < 10:
            recent_chunks = list(chunks.order_by('-created_at')[:15])
            seen_ids = {c.id for c in candidate_chunks}
            for rc in recent_chunks:
                if rc.id not in seen_ids:
                    candidate_chunks.append(rc)
                    seen_ids.add(rc.id)

        # 3. Compute semantic vector embedding and combine into hybrid score
        query_vector = get_embedding(query, tenant)
        if query_vector:
            scored_chunks = []
            for chunk in candidate_chunks:
                sem_sim = cosine_similarity(query_vector, chunk.vector_embedding) if chunk.vector_embedding else 0.0
                lex_sim = getattr(chunk, 'lexical_score', 0.0) or 0.0
                # Hybrid score: 70% semantic embedding + 30% lexical keyword match
                hybrid_score = (0.7 * sem_sim) + (0.3 * float(lex_sim))
                scored_chunks.append((hybrid_score, chunk))

            scored_chunks.sort(key=lambda x: x[0], reverse=True)
            selected_chunks = [item[1] for item in scored_chunks if item[0] > 0.08]
        else:
            selected_chunks = candidate_chunks
    else:
        selected_chunks = list(chunks.order_by('-created_at')[:10])

    knowledge_text = ''
    char_used = 0
    for chunk in selected_chunks:
        if char_used + chunk.char_count > KNOWLEDGE_CHAR_BUDGET:
            break
        knowledge_text += f'\n{chunk.content}\n'
        char_used += chunk.char_count

    # ── Custom rules ───────────────────────────────────────────────
    custom_rules_section = ''
    if tenant.custom_rules:
        custom_rules_section = f'\n## Additional Business Rules\n{tenant.custom_rules}\n'

    # ── Escalation rules ───────────────────────────────────────────
    escalation_section = _build_escalation_section(tenant)

    # ── Assemble the prompt ────────────────────────────────────────
    prompt = f"""You are an AI assistant representing {tenant.business_name}.

## Your Personality
- {personality_desc}
- Keep responses concise (2-4 short paragraphs max)
- Use occasional emojis (✅, 🚀, 💡) but don't overdo it
- {language_instruction}
- Never use markdown formatting in WhatsApp — use *bold* and _italic_ only

## About {tenant.business_name}
{business_description}

## Contact Information
- Email: {tenant.contact_email or 'N/A'}
- Phone: {tenant.contact_phone or 'N/A'}
- Address: {tenant.address or 'N/A'}
"""

    if knowledge_text:
        prompt += f"""
## Knowledge Base
The following is verified information about {tenant.business_name}.
Use ONLY this information to answer questions. Do NOT make up facts.
{knowledge_text}
"""

    prompt += escalation_section
    prompt += custom_rules_section

    prompt += """
## Your Rules
1. NEVER make up services, prices, or facts not listed above
2. If asked about something you don't know, say "Let me connect you with our team for more details! 😊"
3. Try to understand what the customer needs and help them
4. Keep it conversational — this is a chat, not an email
"""

    return prompt.strip()


def _build_escalation_section(tenant) -> str:
    """Build escalation rules from tenant config or use defaults."""
    rules = tenant.escalation_rules or []

    section = """
## ESCALATION RULES
If ANY of these are true, reply ONLY with: [HANDOFF] <reason>
1. Customer explicitly asks for a human, agent, or manager
2. Customer is very angry, threatening, or using abusive language
3. Customer asks for a refund, cancellation, or legal matter
4. You have tried to answer the same question twice and still can't help
5. Customer shares sensitive info (bank account, card details)
"""
    # Append tenant-specific escalation rules
    if rules:
        for i, rule in enumerate(rules, start=6):
            section += f'{i}. {rule}\n'

    section += 'Example: [HANDOFF] Customer requesting refund\n'
    return section
