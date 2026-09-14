from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.views.static import serve
import os

# Admin Config
admin.site.site_header = "Sahara Gold Admin"
admin.site.site_title = "Sahara Gold Portal"
admin.site.index_title = "Welcome to Sahara Gold DB"

urlpatterns = [
    # Django Builtin Admin (Database Level)
    path('django-admin/', admin.site.urls),

    # Backend APIs
    path('api/', include('products.urls')),
    path('api/', include('orders.urls')),
    path('api/', include('rates.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/cms/', include('cms.urls')),
    path('api/ai/', include('ai.urls')),
    path('api/', include('core.urls')),

    # Frontend Static Assets (Direct serve from dist/assets/)
    re_path(r'^assets/(?P<path>.*)$', serve, {
        'document_root': os.path.join(settings.FRONTEND_DIR, 'assets'),
    }),

    # Single Page App fallback (Storefront, Admin Login, Command Center Dashboard)
    re_path(r'^(?!api/|django-admin/|media/|static/).*$', TemplateView.as_view(template_name='index.html')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

