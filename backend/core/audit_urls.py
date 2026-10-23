from django.urls import path, include
urlpatterns = [path('api/',include('core.urls')),path('api/',include('orders.urls')),path('api/',include('products.urls')),path('',include('rates.urls'))]
