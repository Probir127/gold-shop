from django.urls import path
from .views import LatestGoldRateView, GoldRateCreateView, LiveGoldMarketView, SyncLiveGoldRateView

urlpatterns = [
    path('rates/latest/', LatestGoldRateView.as_view(), name='latest-rates'),
    path('rates/live-market/', LiveGoldMarketView.as_view(), name='live-gold-market'),
    path('rates/sync-live/', SyncLiveGoldRateView.as_view(), name='sync-live-gold-rate'),
    path('rates/sync-live', SyncLiveGoldRateView.as_view(), name='sync-live-gold-rate-noslash'),
    path('rates/', GoldRateCreateView.as_view(), name='rate-list-create'),
    path('rates', GoldRateCreateView.as_view(), name='rate-list-create-noslash'),
]
