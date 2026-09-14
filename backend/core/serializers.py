from __future__ import annotations
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Tenant, TenantMembership, Channel,
    Client, Conversation, Service, Invoice,
    TeamMember, BotAnalytics, BotConfig,
    KnowledgeSource, KnowledgeChunk,
)


# ── Auth / User ───────────────────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class TeamMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model  = TeamMember
        fields = ['id', 'user', 'role', 'phone', 'avatar']


# ── Tenant ────────────────────────────────────────────────────────────────────

class TenantSerializer(serializers.ModelSerializer):
    owner_username = serializers.ReadOnlyField(source='owner.username')

    class Meta:
        model  = Tenant
        fields = [
            'id', 'name', 'slug', 'owner', 'owner_username',
            'business_name', 'tagline', 'description',
            'contact_email', 'contact_phone', 'address',
            'website_url', 'social_links', 'logo',
            'personality', 'language', 'custom_rules', 'escalation_rules',
            'llm_mode', 'llm_model_name',
            'wa_phone_number_id', 'wa_access_token', 'wa_webhook_token', 'wa_connected',
            'external_ids',
            'web_widget_enabled', 'widget_color', 'widget_position',
            'plan', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'owner', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Mask sensitive WhatsApp token so it is never exposed in full
        if instance.wa_access_token:
            ret['wa_access_token'] = '••••••••' + (instance.wa_access_token[-4:] if len(instance.wa_access_token) > 4 else '')
        return ret

    def update(self, instance, validated_data):
        # Prevent overwriting real token with masked placeholder
        wa_token = validated_data.get('wa_access_token')
        if wa_token and wa_token.startswith('••••'):
            validated_data.pop('wa_access_token')
        return super().update(instance, validated_data)


class TenantMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    tenant_name = serializers.ReadOnlyField(source='tenant.name')
    tenant_slug = serializers.ReadOnlyField(source='tenant.slug')

    class Meta:
        model  = TenantMembership
        fields = ['id', 'tenant', 'tenant_name', 'tenant_slug', 'user', 'role', 'joined_at']
        read_only_fields = ['joined_at']


# ── Channel ───────────────────────────────────────────────────────────────────

class ChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Channel
        fields = ['id', 'tenant', 'channel_type', 'is_active', 'config', 'created_at']
        read_only_fields = ['id', 'tenant', 'created_at']


# ── Client ────────────────────────────────────────────────────────────────────

class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Client
        fields = '__all__'
        read_only_fields = ['tenant']


# ── Conversation ──────────────────────────────────────────────────────────────

class ConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Conversation
        fields = '__all__'
        read_only_fields = ['tenant']


# ── Service ───────────────────────────────────────────────────────────────────

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Service
        fields = '__all__'
        read_only_fields = ['tenant']


# ── Invoice ───────────────────────────────────────────────────────────────────

class InvoiceSerializer(serializers.ModelSerializer):
    client_name        = serializers.ReadOnlyField(source='client.name')
    client_phone       = serializers.ReadOnlyField(source='client.phone')
    invoice_number     = serializers.CharField(read_only=True)
    amount             = serializers.ReadOnlyField(source='total_amount')
    hosted_url         = serializers.SerializerMethodField()
    admin_invoice_url  = serializers.SerializerMethodField()
    due_date           = serializers.SerializerMethodField()

    class Meta:
        model  = Invoice
        fields = '__all__'
        read_only_fields = ['tenant']

    def get_hosted_url(self, obj):
        return f"/api/invoices/{obj.id}/html/?copy=customer"

    def get_admin_invoice_url(self, obj):
        return f"/api/invoices/{obj.id}/html/?copy=admin"

    def get_due_date(self, obj):
        return obj.created_at.strftime('%Y-%m-%d')



# ── Bot Analytics ─────────────────────────────────────────────────────────────

class BotAnalyticsSerializer(serializers.ModelSerializer):
    client_phone = serializers.ReadOnlyField(source='client.phone')

    class Meta:
        model  = BotAnalytics
        fields = '__all__'
        read_only_fields = ['tenant']


# ── Knowledge Base ────────────────────────────────────────────────────────────

class KnowledgeSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model  = KnowledgeSource
        fields = [
            'id', 'tenant', 'source_type', 'title', 'url',
            'raw_content', 'uploaded_file', 'status', 'error_message',
            'chunk_count', 'last_synced', 'auto_refresh', 'created_at',
        ]
        read_only_fields = ['id', 'tenant', 'status', 'error_message', 'chunk_count', 'last_synced', 'created_at']


class KnowledgeChunkSerializer(serializers.ModelSerializer):
    source_title = serializers.ReadOnlyField(source='source.title')

    class Meta:
        model  = KnowledgeChunk
        fields = ['id', 'tenant', 'source', 'source_title', 'content', 'metadata', 'char_count', 'created_at']
        read_only_fields = ['id', 'tenant', 'char_count', 'created_at']


# ── Bot Config ────────────────────────────────────────────────────────────────

class BotConfigSerializer(serializers.ModelSerializer):
    active_prompt = serializers.SerializerMethodField()

    class Meta:
        model  = BotConfig
        fields = ['tenant', 'system_prompt', 'custom_prompt_override', 'active_prompt', 'updated_at']
        read_only_fields = ['tenant', 'system_prompt', 'updated_at']

    def get_active_prompt(self, obj):
        return obj.get_active_prompt()
