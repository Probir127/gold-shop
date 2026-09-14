from __future__ import annotations
from django.db import models, transaction
from django.db.models import Q, CheckConstraint
from django.contrib.auth.models import User
from django.utils import timezone
from django.utils.text import slugify
import uuid


# ══════════════════════════════════════════════════════════════════════════════
#  TENANT — The foundation of multi-tenancy
# ══════════════════════════════════════════════════════════════════════════════

class Tenant(models.Model):
    """
    Each paying customer (business) is a Tenant.
    All other models reference this via FK for strict data isolation.
    """
    PLAN_CHOICES = [
        ('starter',    'Starter'),       # 1 channel, bundled LLM
        ('growth',     'Growth'),        # 3 channels, bundled LLM
        ('enterprise', 'Enterprise'),    # Unlimited channels, BYOK LLM
    ]
    PERSONALITY_CHOICES = [
        ('professional', 'Professional'),
        ('friendly',     'Friendly'),
        ('casual',       'Casual'),
    ]
    LANGUAGE_CHOICES = [
        ('auto', 'Auto-detect'),
        ('en',   'English'),
        ('bn',   'Bengali'),
        ('both', 'Bilingual (EN + BN)'),
    ]
    LLM_MODE_CHOICES = [
        ('bundled',      'Bundled (GrownK LLM)'),
        ('byok',         'Bring Your Own Key'),
    ]

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name          = models.CharField(max_length=255)                     # "Shimmer Jewelry"
    slug          = models.SlugField(max_length=100, unique=True)        # "shimmer-jewelry"
    owner         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_tenants')

    # ── Business Identity ─────────────────────────────────────────────
    business_name  = models.CharField(max_length=255)
    tagline        = models.CharField(max_length=500, blank=True)
    description    = models.TextField(blank=True)
    contact_email  = models.EmailField(blank=True)
    contact_phone  = models.CharField(max_length=50, blank=True)
    address        = models.TextField(blank=True)
    website_url    = models.URLField(blank=True)
    social_links   = models.JSONField(default=dict, blank=True)          # {"facebook": "...", "instagram": "..."}
    logo           = models.ImageField(upload_to='tenant_logos/', blank=True)

    # ── AI Configuration ──────────────────────────────────────────────
    personality    = models.CharField(max_length=20, choices=PERSONALITY_CHOICES, default='professional')
    language       = models.CharField(max_length=10, choices=LANGUAGE_CHOICES, default='auto')
    custom_rules   = models.TextField(blank=True, help_text='Plain-text business rules for the AI')
    escalation_rules = models.JSONField(default=list, blank=True)        # Structured triggers

    # ── LLM Configuration ─────────────────────────────────────────────
    llm_mode       = models.CharField(max_length=20, choices=LLM_MODE_CHOICES, default='bundled')
    llm_api_key    = models.TextField(blank=True, help_text='Customer API key (encrypted at rest)')
    llm_model_name = models.CharField(max_length=100, default='Qwen/Qwen2.5-72B-Instruct')

    # ── WhatsApp Channel Credentials (self-service) ───────────────────
    wa_phone_number_id = models.CharField(max_length=100, blank=True)
    wa_access_token    = models.TextField(blank=True)
    wa_webhook_token   = models.CharField(max_length=100, blank=True)
    wa_connected       = models.BooleanField(default=False)
    service_selected   = models.CharField(max_length=100, blank=True)
    external_ids       = models.JSONField(default=dict, blank=True)  # {"telegram": "...", "messenger": "..."}
    bot_enabled        = models.BooleanField(default=True)

    # ── Web Widget ────────────────────────────────────────────────────
    web_widget_enabled = models.BooleanField(default=True)
    widget_color       = models.CharField(max_length=7, default='#3B82F6')  # Hex color
    widget_position    = models.CharField(max_length=20, default='bottom-right')

    plan                = models.CharField(max_length=20, choices=PLAN_CHOICES, default='starter')
    is_active           = models.BooleanField(default=True)
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['slug'],       name='tenant_slug_idx'),
            models.Index(fields=['owner'],      name='tenant_owner_idx'),
            models.Index(fields=['is_active'],  name='tenant_active_idx'),
        ]
        constraints = [
            CheckConstraint(check=Q(plan__in=['starter', 'growth', 'enterprise']), name='tenant_plan_valid'),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
            # Ensure uniqueness
            base_slug = self.slug
            counter = 1
            while Tenant.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f'{base_slug}-{counter}'
                counter += 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.business_name} ({self.slug})'


class TenantMembership(models.Model):
    """
    Maps users to tenants with roles. One user can belong to multiple tenants.
    The owner is automatically a member with 'admin' role.
    """
    ROLE_CHOICES = [
        ('admin',   'Admin'),
        ('manager', 'Manager'),
        ('agent',   'Agent'),
    ]
    tenant  = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='memberships')
    user    = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tenant_memberships')
    role    = models.CharField(max_length=20, choices=ROLE_CHOICES, default='agent')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tenant', 'user')

    def __str__(self):
        return f'{self.user.username} → {self.tenant.slug} ({self.role})'


# ══════════════════════════════════════════════════════════════════════════════
#  CHANNEL — Omnichannel support
# ══════════════════════════════════════════════════════════════════════════════

class Channel(models.Model):
    """
    Each enabled messaging channel for a tenant.
    Credentials are stored per-channel to support multiple WhatsApp numbers, etc.
    """
    CHANNEL_TYPES = [
        ('whatsapp',  'WhatsApp'),
        ('telegram',  'Telegram'),
        ('web',       'Web Chat'),
        ('messenger', 'Facebook Messenger'),
        ('instagram', 'Instagram DM'),
    ]
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant       = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='channels')
    channel_type = models.CharField(max_length=20, choices=CHANNEL_TYPES)
    is_active    = models.BooleanField(default=True)
    config       = models.JSONField(default=dict, blank=True)  # Channel-specific creds/settings
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tenant', 'channel_type')

    def __str__(self):
        return f'{self.tenant.slug} — {self.channel_type}'


# ══════════════════════════════════════════════════════════════════════════════
#  CLIENT — Now tenant-aware
# ══════════════════════════════════════════════════════════════════════════════

class Client(models.Model):
    STATUS_CHOICES = [
        ('lead',      'Lead'),
        ('active',    'Active'),
        ('invoiced',  'Invoiced'),
        ('completed', 'Completed'),
    ]
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant           = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='clients', null=True, blank=True)
    name             = models.CharField(max_length=255, blank=True)
    phone            = models.CharField(max_length=30)
    service_selected = models.CharField(max_length=255, blank=True)
    status           = models.CharField(max_length=20, choices=STATUS_CHOICES, default='lead')
    bot_enabled      = models.BooleanField(default=True)
    notes            = models.TextField(blank=True)
    external_ids     = models.JSONField(default=dict, blank=True)  # {"telegram": "chat_id", ...}
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    # ── Human handoff fields ──────────────────────────────────────────
    CONVERSATION_MODE = [
        ('bot',     'Bot Handling'),
        ('pending', 'Pending Handoff'),
        ('agent',   'Agent Handling'),
    ]
    conversation_mode   = models.CharField(max_length=10, choices=CONVERSATION_MODE, default='bot')
    escalation_reason   = models.CharField(max_length=255, blank=True)
    escalated_at        = models.DateTimeField(null=True, blank=True)
    assigned_agent      = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='assigned_clients'
    )

    class Meta:
        ordering = ['-created_at']
        # Phone is unique PER TENANT, not globally
        unique_together = ('tenant', 'phone')
        indexes = [
            models.Index(fields=['tenant', 'phone'],            name='client_tenant_phone_idx'),
            models.Index(fields=['tenant', 'status'],           name='client_tenant_status_idx'),
            models.Index(fields=['tenant', 'conversation_mode'],name='client_tenant_mode_idx'),
            models.Index(fields=['-created_at'],                name='client_created_idx'),
        ]
        constraints = [
            CheckConstraint(check=Q(status__in=['lead', 'active', 'invoiced', 'completed']), name='client_status_valid'),
            CheckConstraint(check=Q(conversation_mode__in=['bot', 'pending', 'agent']), name='client_mode_valid'),
        ]

    def __str__(self):
        tenant_str = self.tenant.slug if self.tenant else 'no-tenant'
        return f'{self.phone} — {tenant_str}'


# ══════════════════════════════════════════════════════════════════════════════
#  CONVERSATION — Now tenant-aware + channel-tagged
# ══════════════════════════════════════════════════════════════════════════════

class Conversation(models.Model):
    DIRECTION_CHOICES = [
        ('inbound',  'Inbound'),
        ('outbound', 'Outbound'),
    ]
    CHANNEL_CHOICES = [
        ('whatsapp',  'WhatsApp'),
        ('telegram',  'Telegram'),
        ('web',       'Web Chat'),
        ('messenger', 'Facebook Messenger'),
        ('instagram', 'Instagram DM'),
    ]
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant        = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='conversations', null=True, blank=True)
    client        = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='conversations')
    direction     = models.CharField(max_length=10, choices=DIRECTION_CHOICES)
    channel       = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default='whatsapp')
    message_text  = models.TextField()
    wa_message_id = models.CharField(max_length=255, blank=True)
    session_id    = models.CharField(max_length=255, blank=True)  # For web chat sessions
    timestamp     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['tenant', 'client', 'timestamp'], name='conv_tenant_client_idx'),
            models.Index(fields=['wa_message_id'],                 name='conv_wamsgid_idx'),
            models.Index(fields=['tenant', 'channel'],             name='conv_tenant_channel_idx'),
        ]


# ══════════════════════════════════════════════════════════════════════════════
#  SERVICE — Now tenant-aware
# ══════════════════════════════════════════════════════════════════════════════

class Service(models.Model):
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant      = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='services', null=True, blank=True)
    name        = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    base_price  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active   = models.BooleanField(default=True)

    class Meta:
        constraints = [
            CheckConstraint(check=Q(base_price__gte=0), name='service_price_non_negative'),
        ]

    def __str__(self):
        tenant_str = self.tenant.slug if self.tenant else 'no-tenant'
        return f'{self.name} ({tenant_str})'


# ══════════════════════════════════════════════════════════════════════════════
#  INVOICE — Now tenant-aware
# ══════════════════════════════════════════════════════════════════════════════

class Invoice(models.Model):
    STATUS_CHOICES = [
        ('draft',  'Draft'),
        ('sent',   'Sent'),
        ('paid',   'Paid'),
        ('overdue','Overdue'),
    ]
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant         = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='invoices', null=True, blank=True)
    client         = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='invoices')
    invoice_number = models.CharField(max_length=50, unique=True)
    items          = models.JSONField()
    subtotal       = models.DecimalField(max_digits=12, decimal_places=2)
    tax_percent    = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_amount   = models.DecimalField(max_digits=12, decimal_places=2)
    currency       = models.CharField(max_length=5, default='BDT')
    status         = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    pdf_path       = models.CharField(max_length=500, blank=True)
    notes          = models.TextField(blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    sent_at        = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            CheckConstraint(check=Q(subtotal__gte=0), name='invoice_subtotal_non_negative'),
            CheckConstraint(check=Q(total_amount__gte=0), name='invoice_total_non_negative'),
            CheckConstraint(check=Q(status__in=['draft', 'sent', 'paid', 'overdue']), name='invoice_status_valid'),
        ]

    def save(self, *args, **kwargs):
        # Auto-generate a unique invoice number for new records.
        if not self.invoice_number:
            from django.db import IntegrityError
            prefix = self.tenant.slug.upper()[:5] if self.tenant else 'GRK'
            for attempt in range(5):
                try:
                    with transaction.atomic():
                        year = timezone.now().year
                        count = (
                            Invoice.objects.select_for_update()
                            .filter(tenant=self.tenant, created_at__year=year)
                            .count()
                        ) + 1 + attempt
                        self.invoice_number = f'{prefix}-{year}-{count:03d}'
                        super().save(*args, **kwargs)
                        return
                except IntegrityError:
                    continue
            raise ValueError("Could not generate a unique invoice number after 5 attempts.")
        else:
            super().save(*args, **kwargs)


# ══════════════════════════════════════════════════════════════════════════════
#  TEAM MEMBER — Now tenant-aware (via TenantMembership above)
# ══════════════════════════════════════════════════════════════════════════════

class TeamMember(models.Model):
    """Legacy model — kept for backward compat. Use TenantMembership for multi-tenant."""
    ROLE_CHOICES = [
        ('admin',    'Admin'),
        ('manager',  'Manager'),
        ('member',   'Member'),
    ]
    user   = models.OneToOneField(User, on_delete=models.CASCADE)
    role   = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    phone  = models.CharField(max_length=30, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True)


# ══════════════════════════════════════════════════════════════════════════════
#  BOT ANALYTICS — Now tenant-aware + channel-tagged
# ══════════════════════════════════════════════════════════════════════════════

class BotAnalytics(models.Model):
    """Track every AI bot interaction for KPI monitoring per tenant."""
    SENTIMENT_CHOICES = [
        ('positive', 'Positive'),
        ('neutral',  'Neutral'),
        ('negative', 'Negative'),
    ]
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant           = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='analytics', null=True, blank=True)
    client           = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='analytics')
    channel          = models.CharField(max_length=20, default='whatsapp')
    user_message     = models.TextField()
    bot_reply        = models.TextField()
    intent           = models.CharField(max_length=50, default='general')
    sentiment        = models.CharField(max_length=20, choices=SENTIMENT_CHOICES, default='neutral')
    response_time_ms = models.IntegerField(default=0)
    was_fallback     = models.BooleanField(default=False)
    was_escalated    = models.BooleanField(default=False)
    is_resolved      = models.BooleanField(default=True)  # True by default, human can mark False if bot failed
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', '-created_at'], name='analytics_tenant_idx'),
            models.Index(fields=['tenant', 'intent'],      name='analytics_tenant_intent_idx'),
            models.Index(fields=['tenant', 'channel'],     name='analytics_tenant_channel_idx'),
        ]
        constraints = [
            CheckConstraint(check=Q(response_time_ms__gte=0), name='analytics_resp_time_non_negative'),
        ]

    def __str__(self):
        return f'{self.client.phone} | {self.intent} | {self.created_at:%Y-%m-%d %H:%M}'


# ══════════════════════════════════════════════════════════════════════════════
#  KNOWLEDGE BASE — Phase 2: Smart Training
# ══════════════════════════════════════════════════════════════════════════════

class KnowledgeSource(models.Model):
    """
    A data source that feeds the tenant's chatbot knowledge.
    Sources are scraped/processed in the background and stored as chunks.
    """
    SOURCE_TYPES = [
        ('url',          'Website URL'),
        ('file',         'Uploaded File'),
        ('manual',       'Manual Entry'),
        ('product_feed', 'Product Feed URL'),
    ]
    STATUS_CHOICES = [
        ('pending',    'Pending'),
        ('processing', 'Processing'),
        ('ready',      'Ready'),
        ('failed',     'Failed'),
    ]
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant       = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='knowledge_sources', null=True, blank=True)
    source_type  = models.CharField(max_length=20, choices=SOURCE_TYPES)
    title        = models.CharField(max_length=255)
    url          = models.URLField(blank=True)
    raw_content  = models.TextField(blank=True)
    uploaded_file = models.FileField(upload_to='knowledge_sources/', blank=True, null=True)
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(blank=True)
    chunk_count  = models.IntegerField(default=0)
    last_synced  = models.DateTimeField(null=True, blank=True)
    auto_refresh = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        tenant_str = self.tenant.slug if self.tenant else 'no-tenant'
        return f'{self.title} ({self.source_type}) — {tenant_str}'


class KnowledgeChunk(models.Model):
    """
    A chunk of extracted text from a KnowledgeSource.
    Used to build the AI's context window at query time.
    """
    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant    = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='knowledge_chunks', null=True, blank=True)
    source    = models.ForeignKey(KnowledgeSource, on_delete=models.CASCADE, related_name='chunks')
    content   = models.TextField()
    metadata  = models.JSONField(default=dict, blank=True)  # page_title, section_heading, etc.
    vector_embedding = models.JSONField(null=True, blank=True)  # 384-dimensional semantic embedding vector
    char_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def save(self, *args, **kwargs):
        self.char_count = len(self.content)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'Chunk ({self.char_count} chars) — {self.source.title}'


# ══════════════════════════════════════════════════════════════════════════════
#  BOT CONFIG — Now tenant-aware (replaces singleton)
# ══════════════════════════════════════════════════════════════════════════════

DEFAULT_SYSTEM_PROMPT = """You are a helpful AI assistant representing {business_name}.

## Your Personality
- {personality_desc}
- Keep responses concise (2-4 short paragraphs max)
- Use occasional emojis (✅, 🚀, 💡) but don't overdo it
- {language_instruction}

## About {business_name}
{business_description}

## Contact Information
- Email: {contact_email}
- Phone: {contact_phone}
- Address: {address}
- Website: {website_url}

## ESCALATION RULES
If ANY of these are true, reply ONLY with: [HANDOFF] <reason>
1. Customer explicitly asks for a human, agent, or manager
2. Customer is very angry, threatening, or using abusive language
3. Customer asks for a refund, cancellation, or legal matter
4. You have tried to answer the same question twice and still can't help
5. Customer shares sensitive info (bank account, card details)

## Your Rules
1. NEVER make up services, prices, or facts not provided in your knowledge base
2. If asked about something you don't know, say "Let me connect you with our team for more details! 😊"
3. Keep it conversational
{custom_rules}
"""


class BotConfig(models.Model):
    """
    Per-tenant bot configuration. One config per tenant.
    The system_prompt is auto-generated from structured fields + knowledge base.
    Customers can also provide a custom_prompt_override for full control.
    """
    tenant         = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name='bot_config', null=True, blank=True)
    system_prompt  = models.TextField(blank=True, help_text='Auto-generated system prompt (read-only preview)')
    custom_prompt_override = models.TextField(blank=True, help_text='If set, replaces the auto-generated prompt entirely')
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Bot Configuration'

    @classmethod
    def get_config(cls, tenant):
        """Get or create bot config for a tenant."""
        obj, _ = cls.objects.get_or_create(tenant=tenant)
        return obj

    def get_active_prompt(self):
        """Return the prompt that should be sent to the LLM."""
        if self.custom_prompt_override:
            return self.custom_prompt_override
        return self.system_prompt or self._build_prompt()

    def _build_prompt(self):
        """Auto-generate system prompt from tenant structured data."""
        from .utils.prompt_builder import build_system_prompt
        return build_system_prompt(self.tenant)

    def __str__(self):
        return f'BotConfig — {self.tenant.slug}'
