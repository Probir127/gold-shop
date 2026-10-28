from __future__ import annotations
from django.contrib import admin
from .models import (
    Tenant, TenantMembership, Channel,
    Client, Conversation, Service, Invoice,
    TeamMember, BotAnalytics, BotConfig,
    KnowledgeSource, KnowledgeChunk,
)


# ── Tenant ────────────────────────────────────────────────────────────────────

class TenantMembershipInline(admin.TabularInline):
    model = TenantMembership
    extra = 0

class ChannelInline(admin.TabularInline):
    model = Channel
    extra = 0

@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display  = ('business_name', 'slug', 'owner', 'plan', 'is_active', 'created_at')
    list_filter   = ('plan', 'is_active')
    search_fields = ('business_name', 'slug', 'owner__username')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('id', 'created_at', 'updated_at')
    inlines = [TenantMembershipInline, ChannelInline]


@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
    list_display  = ('tenant', 'channel_type', 'is_active', 'created_at')
    list_filter   = ('channel_type', 'is_active')


# ── Client ────────────────────────────────────────────────────────────────────

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display  = ('phone', 'name', 'tenant', 'status', 'bot_enabled', 'created_at')
    list_filter   = ('status', 'bot_enabled', 'tenant')
    search_fields = ('phone', 'name', 'service_selected')
    ordering      = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display  = ('client', 'tenant', 'direction', 'channel', 'message_preview', 'timestamp')
    list_filter   = ('direction', 'channel', 'tenant')
    search_fields = ('client__phone', 'message_text')
    ordering      = ('-timestamp',)
    readonly_fields = ('id', 'timestamp')

    def message_preview(self, obj):
        return obj.message_text[:80] + '...' if len(obj.message_text) > 80 else obj.message_text
    message_preview.short_description = 'Message'


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display  = ('name', 'tenant', 'base_price', 'is_active')
    list_filter   = ('is_active', 'tenant')
    search_fields = ('name',)
    readonly_fields = ('id',)


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display  = ('invoice_number', 'client', 'tenant', 'total_amount', 'status', 'created_at')
    list_filter   = ('status', 'currency', 'tenant')
    search_fields = ('invoice_number', 'client__phone', 'client__name')
    ordering      = ('-created_at',)
    readonly_fields = ('id', 'invoice_number', 'created_at', 'sent_at')


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display  = ('user', 'role', 'phone')
    list_filter   = ('role',)
    search_fields = ('user__username', 'user__email', 'phone')


@admin.register(BotAnalytics)
class BotAnalyticsAdmin(admin.ModelAdmin):
    list_display  = ('client', 'tenant', 'channel', 'intent', 'response_time_ms', 'was_fallback', 'created_at')
    list_filter   = ('intent', 'was_fallback', 'was_escalated', 'channel', 'tenant')
    search_fields = ('client__phone', 'user_message')
    ordering      = ('-created_at',)
    readonly_fields = ('id', 'created_at')


# ── Knowledge Base ────────────────────────────────────────────────────────────

class KnowledgeChunkInline(admin.TabularInline):
    model = KnowledgeChunk
    extra = 0
    readonly_fields = ('char_count', 'created_at')

@admin.register(KnowledgeSource)
class KnowledgeSourceAdmin(admin.ModelAdmin):
    list_display  = ('title', 'tenant', 'source_type', 'status', 'chunk_count', 'last_synced')
    list_filter   = ('source_type', 'status', 'tenant')
    search_fields = ('title', 'url')
    readonly_fields = ('id', 'created_at', 'chunk_count', 'last_synced')
    inlines = [KnowledgeChunkInline]


# ── Bot Config ────────────────────────────────────────────────────────────────

@admin.register(BotConfig)
class BotConfigAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'updated_at')
    readonly_fields = ('updated_at', 'system_prompt')
    fieldsets = (
        ('Tenant', {
            'fields': ('tenant',)
        }),
        ('Auto-Generated Prompt (read-only)', {
            'fields': ('system_prompt',),
            'classes': ('wide',),
        }),
        ('Custom Override', {
            'fields': ('custom_prompt_override',),
            'classes': ('wide',),
            'description': 'If set, this replaces the auto-generated prompt entirely.',
        }),
        ('Metadata', {
            'fields': ('updated_at',)
        }),
    )

from .models import StorefrontContent
@admin.register(StorefrontContent)
class StorefrontContentAdmin(admin.ModelAdmin):
    readonly_fields = ('updated_at',)
    def has_add_permission(self, request):
        return not StorefrontContent.objects.exists() and super().has_add_permission(request)
    def has_delete_permission(self, request, obj=None):
        return False


from .models import DeliveryJob
@admin.register(DeliveryJob)
class DeliveryJobAdmin(admin.ModelAdmin):
    list_display = ('id', 'kind', 'status', 'attempts', 'next_attempt_at', 'completed_at')
    list_filter = ('status', 'kind')
    readonly_fields = ('id', 'kind', 'dedupe_key', 'payload', 'status', 'attempts',
                       'next_attempt_at', 'last_error', 'created_at', 'completed_at')
    actions = ('retry_failed',)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.action(description='Retry failed jobs within the safe delivery window')
    def retry_failed(self, request, queryset):
        from datetime import timedelta
        from django.utils import timezone
        count = queryset.filter(status='failed', created_at__gte=timezone.now()-timedelta(hours=23)).update(
            status='pending', attempts=0, next_attempt_at=timezone.now())
        self.message_user(request, f'{count} failed jobs scheduled for retry. Review uncertain or expired sends against provider history.')
