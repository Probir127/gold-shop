from __future__ import annotations
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
import logging
from ..models import BotConfig, Tenant
from ..permissions import IsTenantManagerOrStaff
from ..serializers import TenantSerializer, BotConfigSerializer

logger = logging.getLogger(__name__)


class BotConfigView(APIView):
    """
    View to manage the tenant's profile and AI configuration.
    Merged with Tenant management for simplicity in the UI.
    """
    permission_classes = [IsTenantManagerOrStaff]

    def get(self, request):
        tenant = request.tenant
        if not tenant:
            return Response({'detail': 'No tenant context.'}, status=400)

        bot_config = BotConfig.get_config(tenant)
        
        return Response({
            'tenant': TenantSerializer(tenant).data,
            'bot_config': BotConfigSerializer(bot_config).data
        })

    def patch(self, request):
        """Update tenant profile or bot configuration."""
        tenant = request.tenant
        if not tenant:
            return Response({'detail': 'No tenant context.'}, status=400)

        # ── Step 1: Update Tenant Profile ───────────────────
        profile_data = request.data.get('tenant', {})
        if profile_data:
            # If the frontend passes back the logo as a URL string or null, DRF will reject it.
            if 'logo' in profile_data:
                logo_val = profile_data['logo']
                if logo_val is None or (isinstance(logo_val, str) and (logo_val.startswith('http') or logo_val.startswith('/media/'))):
                    profile_data.pop('logo')
                    
            serializer = TenantSerializer(tenant, data=profile_data, partial=True, context={'request': request})
            if serializer.is_valid():
                tenant = serializer.save()
                self._sync_channels(tenant)
            else:
                logger.warning("[BotConfigView] Tenant validation failed: %s", serializer.errors)
                return Response(serializer.errors, status=400)

        # ── Step 2: Update Bot Config ───────────────────────
        config_data = request.data.get('bot_config', {})
        if config_data:
            bot_config = BotConfig.get_config(tenant)
            serializer = BotConfigSerializer(bot_config, data=config_data, partial=True)
            if serializer.is_valid():
                serializer.save()
            else:
                logger.warning("[BotConfigView] BotConfig validation failed: %s", serializer.errors)
                return Response(serializer.errors, status=400)

        return Response({
            'status': 'saved',
            'tenant': TenantSerializer(tenant).data,
            'bot_config': BotConfigSerializer(BotConfig.get_config(tenant)).data
        })

    def _sync_channels(self, tenant):
        """Automatically create or update Channel models based on Tenant credentials."""
        from ..models import Channel
        
        # 1. WhatsApp
        if tenant.wa_phone_number_id and tenant.wa_access_token:
            Channel.objects.update_or_create(
                tenant=tenant,
                channel_type='whatsapp',
                defaults={
                    'is_active': tenant.wa_connected,
                    'config': {
                        'phone_number_id': tenant.wa_phone_number_id,
                        'access_token': tenant.wa_access_token,
                        'verify_token': tenant.wa_webhook_token,
                    }
                }
            )

        ext = tenant.external_ids or {}

        # 2. Telegram
        tg_token = ext.get('telegram_token')
        if tg_token:
            Channel.objects.update_or_create(
                tenant=tenant,
                channel_type='telegram',
                defaults={
                    'is_active': True,
                    'config': {
                        'bot_token': tg_token,
                        'secret_token': ext.get('tg_secret'),
                    }
                }
            )

        # 3. Instagram
        ig_page_id = ext.get('instagram_page_id')
        ig_token = ext.get('instagram_page_access_token')
        if ig_page_id and ig_token:
            Channel.objects.update_or_create(
                tenant=tenant,
                channel_type='instagram',
                defaults={
                    'is_active': ext.get('instagram_connected', True),
                    'config': {
                        'instagram_page_id': ig_page_id,
                        'page_access_token': ig_token,
                        'verify_token': ext.get('instagram_verify_token') or tenant.wa_webhook_token,
                    }
                }
            )

        # 4. Messenger
        fb_page_id = ext.get('messenger_page_id')
        fb_token = ext.get('messenger_page_access_token')
        if fb_page_id and fb_token:
            Channel.objects.update_or_create(
                tenant=tenant,
                channel_type='messenger',
                defaults={
                    'is_active': ext.get('messenger_connected', True),
                    'config': {
                        'messenger_page_id': fb_page_id,
                        'page_access_token': fb_token,
                        'verify_token': ext.get('messenger_verify_token') or tenant.wa_webhook_token,
                    }
                }
            )
