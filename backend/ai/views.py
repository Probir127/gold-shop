import uuid
import time
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from .models import AIChatSession, AIChatMessage
from .services import generate_ai_response, get_latest_rates_dict
import logging

logger = logging.getLogger(__name__)
from products.models import Product
from products.serializers import ProductSerializer
from core.models import BotAnalytics, Client, Tenant, Conversation

class AIChatView(APIView):
    """
    Storefront AI Chat endpoint.
    POST /api/ai/chat/
    Body: { message: str, session_id?: str }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        started_at = time.perf_counter()
        message = request.data.get('message', '').strip()
        session_id = request.data.get('session_id')
        
        if not message:
            return Response({'error': 'Message cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not session_id:
            session_id = f"SG_{uuid.uuid4().hex[:12]}"
            
        session, _ = AIChatSession.objects.get_or_create(session_id=session_id)
        
        # Save user message
        AIChatMessage.objects.create(
            session=session,
            role='user',
            content=message
        )
        
        # Get history
        history = list(session.messages.order_by('timestamp')[:10])
        
        # Generate reply and product recommendations
        reply, products = generate_ai_response(history, message)

        tenant = Tenant.objects.filter(
            slug=getattr(settings, 'DEFAULT_TENANT_SLUG', ''), is_active=True
        ).first()
        analytics_client = None
        if tenant:
            analytics_client, _ = Client.objects.get_or_create(
                tenant=tenant,
                phone=f'web:{session_id}'[:20],
                defaults={'name': 'Web Chat Visitor', 'service_selected': ''},
            )
            elapsed_ms = round((time.perf_counter() - started_at) * 1000)
            BotAnalytics.objects.create(
                tenant=tenant,
                client=analytics_client,
                channel='web',
                user_message=message,
                bot_reply=reply,
                intent='general',
                response_time_ms=elapsed_ms,
                was_fallback=False,
                was_escalated=False,
            )
            Conversation.objects.create(
                tenant=tenant,
                client=analytics_client,
                direction='inbound',
                channel='web',
                message_text=message,
                session_id=session_id,
            )
            Conversation.objects.create(
                tenant=tenant,
                client=analytics_client,
                direction='outbound',
                channel='web',
                message_text=reply,
                session_id=session_id,
            )

        if not getattr(settings, 'HUGGINGFACE_API_KEY', ''):
            logger.warning('HUGGINGFACE_API_KEY is not configured; storefront chat used catalog fallback.')
        
        # Save bot message
        AIChatMessage.objects.create(
            session=session,
            role='assistant',
            content=reply
        )
        
        return Response({
            'reply': reply,
            'session_id': session_id,
            'products': products
        })

class AIRecommendView(APIView):
    """
    AI Smart Recommendation endpoint.
    GET /api/ai/recommend/?budget=50000&category=rings&purity=22K
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        budget = request.query_params.get('budget')
        purity = request.query_params.get('purity')
        category_slug = request.query_params.get('category')
        
        qs = Product.objects.filter(in_stock=True).select_related('category')
        if purity:
            qs = qs.filter(purity=purity)
        if category_slug:
            qs = qs.filter(category__slug=category_slug)
            
        serialized = ProductSerializer(qs[:12], many=True).data
        
        results = []
        for item in serialized:
            price = item.get('current_price', 0)
            if budget:
                try:
                    if price > float(budget) * 1.15:
                        continue
                except ValueError:
                    pass
            results.append(item)
            
        return Response({
            'recommendations': results,
            'count': len(results)
        })

class AIPriceInsightView(APIView):
    """
    AI Gold Price & Market Insight endpoint.
    GET /api/ai/price-insight/
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        rates = get_latest_rates_dict()
        insight = {
            'rates': rates,
            'summary': "Gold rates remain resilient. High bridal demand in Dhaka makes 22K jewelry purchases optimal before festive peak season.",
            'buying_tip': "For long-term store of value, choose 22K hallmarked jewelry with lower making charges. For intricate daily wear rings, 18K offers superior scratch resistance."
        }
        return Response(insight)
