from django.urls import path
from .views import AIChatView, AIRecommendView, AIPriceInsightView

urlpatterns = [
    path('chat/', AIChatView.as_view(), name='ai-chat'),
    path('recommend/', AIRecommendView.as_view(), name='ai-recommend'),
    path('price-insight/', AIPriceInsightView.as_view(), name='ai-price-insight'),
]
