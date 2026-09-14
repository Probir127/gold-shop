import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from .models import AIChatSession, AIChatMessage
from .services import generate_ai_response, get_latest_rates_dict
from products.models import Product
from products.serializers import ProductSerializer

class AIChatView(APIView):
    """
    Storefront AI Chat endpoint.
    POST /api/ai/chat/
    Body: { message: str, session_id?: str }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
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
        
        # Generate reply
        reply = generate_ai_response(history, message)
        
        # Save bot message
        AIChatMessage.objects.create(
            session=session,
            role='assistant',
            content=reply
        )
        
        return Response({
            'reply': reply,
            'session_id': session_id
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
