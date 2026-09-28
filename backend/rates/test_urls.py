from django.urls import include, path

from core.views.public_views import PublicChatView

urlpatterns = [path('api/public/chat/<slug:tenant_slug>/', PublicChatView.as_view()), path('', include('rates.urls')), path('api/', include('products.urls'))]
