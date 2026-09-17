from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.views.static import serve
from django.http import Http404, JsonResponse
from django.shortcuts import render
import os


def reject_sensitive_path(request, path=''):
    raise Http404


def spa_fallback(request):
    index_file = os.path.join(settings.FRONTEND_DIR, 'index.html')
    if os.path.exists(index_file):
        return render(request, 'index.html')
    return JsonResponse({
        'status': 'online',
        'service': 'Sahara Gold Backend API',
        'endpoints': {
            'rates': '/api/rates/latest/',
            'products': '/api/products/',
            'admin': '/django-admin/',
        },
        'frontend_url': settings.FRONTEND_URL,
    })

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

    # Never let SPA fallback mask probes for secrets, repositories, or backups.
    re_path(r'^(?:.*\/)?\.env(?:\..*)?$', reject_sensitive_path),
    re_path(r'^(?:.*\/)?\.git(?:\/.*)?$', reject_sensitive_path),
    re_path(r'^.*\.(?:sqlite3|zip|bak|dump|sql)$', reject_sensitive_path),
    re_path(r'^media/invoices/.*$', reject_sensitive_path),

    # Media files serving for production (invoices blocked above)
    re_path(r'^media/(?P<path>.*)$', serve, {
        'document_root': settings.MEDIA_ROOT,
    }),

    # Single Page App fallback (Storefront, Admin Login, Command Center Dashboard)
    re_path(r'^(?!api/|django-admin/|media/|static/).*$', spa_fallback),
]

