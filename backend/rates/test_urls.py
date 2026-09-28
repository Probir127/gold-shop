from django.urls import include, path

urlpatterns = [path('', include('rates.urls')), path('api/', include('products.urls'))]
