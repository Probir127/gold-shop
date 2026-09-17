from __future__ import annotations
from decimal import Decimal
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
        if instance.wa_access_token:
            ret['wa_access_token'] = '••••••••' + (instance.wa_access_token[-4:] if len(instance.wa_access_token) > 4 else '')
        if instance.wa_webhook_token:
            ret['wa_webhook_token'] = '••••••••'
        if instance.external_ids:
            ret['external_ids'] = {key: '••••••••' for key in instance.external_ids}
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
    service_id         = serializers.PrimaryKeyRelatedField(queryset=Service.objects.all(), write_only=True, required=False, allow_null=True)
    amount             = serializers.ReadOnlyField(source='total_amount')
    client_name        = serializers.ReadOnlyField(source='client.name')
    client_phone       = serializers.ReadOnlyField(source='client.phone')
    invoice_number     = serializers.CharField(read_only=True)
    hosted_url         = serializers.SerializerMethodField()
    admin_invoice_url  = serializers.SerializerMethodField()

    class Meta:
        model  = Invoice
        fields = '__all__'
        read_only_fields = ['tenant', 'subtotal', 'tax_percent', 'items']

    def validate(self, attrs):
        tenant = getattr(self.context['request'], 'tenant', None)
        if not tenant:
            raise serializers.ValidationError('No active workspace selected.')
        client = attrs.get('client')
        if client and client.tenant_id != tenant.id:
            raise serializers.ValidationError({'client_id': 'Client does not belong to the active workspace.'})
        service = attrs.get('service_id')
        if service and service.tenant_id not in (None, tenant.id):
            raise serializers.ValidationError({'service_id': 'Service does not belong to the active workspace.'})
        if self.instance and 'total_amount' in attrs:
            raise serializers.ValidationError({'total_amount': 'Invoice totals cannot be edited after creation.'})
        return attrs

    def create(self, validated_data):
        service = validated_data.pop('service_id', None)
        amount = validated_data.pop('total_amount', None)
        if amount is None:
            raise serializers.ValidationError({'amount': 'Amount is required.'})
        amount = Decimal(amount)
        if amount <= 0:
            raise serializers.ValidationError({'amount': 'Amount must be greater than zero.'})
        notes = validated_data.get('notes', '')
        if service and not notes:
            validated_data['notes'] = service.description
        validated_data.update({
            'items': [{
                'name': service.name if service else 'Custom invoice item',
                'description': notes,
                'quantity': 1,
                'price': float(amount),
                'item_total': float(amount),
            }],
            'subtotal': amount,
            'tax_percent': 0,
            'total_amount': amount,
            'status': 'draft',
            'currency': 'BDT',
        })
        return super().create(validated_data)

    def get_hosted_url(self, obj):
        from .utils.invoice_access import make_invoice_access_token
        token = make_invoice_access_token('invoice', obj.id)
        return f"/api/invoices/{obj.id}/html/?copy=customer&token={token}"

    def get_admin_invoice_url(self, obj):
        return f"/api/invoices/{obj.id}/html/?copy=admin"

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
