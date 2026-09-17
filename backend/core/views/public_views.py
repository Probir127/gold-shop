from __future__ import annotations
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from ..models import Tenant, Client, Conversation, BotAnalytics
import uuid

class PublicBotConfigView(APIView):
    permission_classes = [permissions.AllowAny]

    @method_decorator(cache_page(60 * 10))
    def get(self, request, tenant_slug):
        try:
            tenant = Tenant.objects.get(slug=tenant_slug, is_active=True)
            return Response({
                'business_name': tenant.business_name,
                'primary_color': tenant.widget_color,
                'widget_enabled': tenant.web_widget_enabled,
                'widget_position': tenant.widget_position,
                'tagline': tenant.tagline,
                'logo_url': tenant.logo.url if tenant.logo else None,
                'bot_name': tenant.business_name + ' AI',
                'initial_message': 'Hello! How can I help you today?'
            })
        except Tenant.DoesNotExist:
            return Response({'error': 'Tenant not found'}, status=404)

class PublicChatView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, tenant_slug):
        try:
            tenant = Tenant.objects.get(slug=tenant_slug, is_active=True)
        except Tenant.DoesNotExist:
            return Response({'error': 'Tenant not found'}, status=404)

        message = request.data.get('message', '').strip()
        if not message:
            return Response({'error': 'Message required'}, status=400)

        # For web users, we can use a session-based or cookie-based unique ID
        # For simplicity, let's look for a 'visitor_id' or generate one
        raw_request = getattr(request, '_request', request)
        session = getattr(raw_request, 'session', None)
        visitor_id = request.data.get('visitor_id')
        if not visitor_id and session is not None:
            visitor_id = session.get('visitor_id')
        if not visitor_id:
            visitor_id = f"WEB_{uuid.uuid4().hex[:8]}"
            if session is not None:
                session['visitor_id'] = visitor_id

        # Get or create web client
        client, _ = Client.objects.get_or_create(
            tenant=tenant,
            phone=visitor_id,
            defaults={'name': f"Web Visitor {visitor_id[-4:]}"}
        )

        # Record inbound
        Conversation.objects.create(
            tenant=tenant,
            client=client,
            direction='inbound',
            channel='web',
            message_text=message
        )

        # Generate reply
        from ..utils.ai_bot import generate_reply
        result = generate_reply(client, message, tenant=tenant, channel='web')
        
        # Record outbound
        Conversation.objects.create(
            tenant=tenant,
            client=client,
            direction='outbound',
            channel='web',
            message_text=result['reply']
        )

        # Log analytics
        BotAnalytics.objects.create(
            tenant=tenant,
            client=client,
            channel='web',
            user_message=message,
            bot_reply=result['reply'],
            intent=result.get('intent', 'general'),
            sentiment=result.get('sentiment', 'neutral'),
            response_time_ms=result.get('response_time_ms', 0),
            was_fallback=result.get('was_fallback', False),
            was_escalated=result.get('was_escalated', False),
        )

        return Response({
            'reply': result['reply'],
            'visitor_id': visitor_id
        })
