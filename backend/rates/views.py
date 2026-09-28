from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.core.cache import cache
from .models import GoldRate
from .pricing import effective_rate, publish_manual, store_today, control
from .serializers import GoldRateSerializer
from .services import fetch_live_gold_price
from core.permissions import IsStaffForWrite


def invalidate_rate_cache():
    """Clear cached public responses after official rates change."""
    cache.clear()

class LatestGoldRateView(generics.RetrieveAPIView):
    # Public: Single latest object — no server-side cache (React Query handles client caching)
    queryset = GoldRate.objects.all().order_by('-date')
    serializer_class = GoldRateSerializer
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_object(self):
        obj, _ = effective_rate()
        if not obj:
            from rest_framework.exceptions import NotFound
            raise NotFound('Gold rates are not available yet.')
        return obj

class GoldRateCreateView(generics.ListCreateAPIView):
    # Admin: List all or Create/Update for given date
    queryset = GoldRate.objects.all().order_by('-date')
    serializer_class = GoldRateSerializer
    permission_classes = [IsStaffForWrite]

    def create(self, request, *args, **kwargs):
        from rest_framework.exceptions import ValidationError
        data = request.data.copy()
        data.setdefault('date', str(store_today()))
        serializer = self.get_serializer(instance=GoldRate.objects.filter(date=store_today()).first(), data=data)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data['date'] != store_today():
            raise ValidationError({'date': 'Publish current rates using today’s date in Bangladesh.'})
        obj = publish_manual(serializer.validated_data)
        invalidate_rate_cache()
        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)

class LiveGoldMarketView(APIView):
    """
    Returns real-time international gold market data and computed BDT rates
    GET /api/rates/live-market/
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cached = cache.get('live_gold_market_cache')
        if cached:
            return Response(cached)
        data = fetch_live_gold_price()
        if data.get('status') == 'success':
            cache.set('live_gold_market_cache', data, timeout=120)
        return Response(data)

class SyncLiveGoldRateView(APIView):
    """
    Syncs live market rates directly into today's official GoldRate record
    POST /api/rates/sync-live/
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        obj, config = effective_rate(force=True)
        if config.last_error or not obj:
            return Response({'error': config.last_error}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        invalidate_rate_cache()
        return Response({'message': 'Live rate published. Pricing mode unchanged.', 'rate': GoldRateSerializer(obj).data})


class RateControlView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        config = control()
        return Response(self.payload(config))

    @staticmethod
    def payload(config):
        return {'mode': config.mode, 'last_synced_at': config.last_synced_at,
                'last_error': config.last_error, 'refresh_seconds': 120}

    def patch(self, request):
        from rest_framework.exceptions import ValidationError
        mode = request.data.get('mode')
        if mode not in ('auto', 'manual'):
            raise ValidationError({'mode': 'Choose auto or manual.'})
        _, config = effective_rate(force=mode == 'auto', mode=mode)
        invalidate_rate_cache()
        return Response(self.payload(config))
