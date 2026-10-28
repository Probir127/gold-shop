"""Public catalogue sitemap generated from the current store database."""
from xml.etree.ElementTree import Element, SubElement, tostring
from django.conf import settings
from django.db.models import Q
from django.http import HttpResponse
from products.models import Product


def sitemap(request):
    base = settings.FRONTEND_URL.rstrip('/')
    root = Element('urlset', xmlns='http://www.sitemaps.org/schemas/sitemap/0.9')
    paths = ['/', '/shop', '/gold-rates', '/about', '/contact', '/refund-policy', '/privacy', '/terms']
    products = Product.objects.filter(in_stock=True).filter(
        Q(tenant__slug=getattr(settings, 'DEFAULT_TENANT_SLUG', 'sahara-gold'), tenant__is_active=True)
        | Q(tenant__isnull=True)
    ).order_by('pk').values_list('pk', flat=True)
    for path in paths:
        SubElement(SubElement(root, 'url'), 'loc').text = base + path
    for product_id in products.iterator():
        SubElement(SubElement(root, 'url'), 'loc').text = f'{base}/product/{product_id}'
    response = HttpResponse(tostring(root, encoding='utf-8', xml_declaration=True), content_type='application/xml')
    response['Cache-Control'] = 'public, max-age=60'
    return response
