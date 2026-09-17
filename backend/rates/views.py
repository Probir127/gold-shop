from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import GoldRate
from .serializers import GoldRateSerializer
from .services import fetch_live_gold_price, sync_live_rate_to_database
from core.permissions import IsStaffForWrite

class LatestGoldRateView(generics.RetrieveAPIView):
    # Public: Single latest object
    queryset = GoldRate.objects.all().order_by('-date')
    serializer_class = GoldRateSerializer
    permission_classes = [permissions.AllowAny]

    def get_object(self):
        obj = self.get_queryset().first()
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
        data = request.data.copy()
        rate_date = data.get('date')
        if rate_date:
            instance = GoldRate.objects.filter(date=rate_date).first()
            if instance:
                serializer = self.get_serializer(instance, data=data, partial=True)
                serializer.is_valid(raise_exception=True)
                self.perform_update(serializer)
                return Response(serializer.data, status=status.HTTP_200_OK)
        return super().create(request, *args, **kwargs)

    def perform_update(self, serializer):
        serializer.save()

class LiveGoldMarketView(APIView):
    """
    Returns real-time international gold market data and computed BDT rates
    GET /api/rates/live-market/
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        data = fetch_live_gold_price()
        return Response(data)

class SyncLiveGoldRateView(APIView):
    """
    Syncs live market rates directly into today's official GoldRate record
    POST /api/rates/sync-live/
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        obj, info = sync_live_rate_to_database()
        if not obj:
            return Response({'error': 'Failed to sync with live market', 'details': info}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        serializer = GoldRateSerializer(obj)
        return Response({
            'message': 'Successfully synchronized live gold rate with store & AI bot.',
            'rate': serializer.data,
            'market': info
        })
