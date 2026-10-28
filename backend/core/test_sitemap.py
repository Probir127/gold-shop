from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from core.models import Tenant
from products.models import Category, Product


@override_settings(ROOT_URLCONF='core.sitemap_urls', FRONTEND_URL='https://www.shaharagold.org')
class SitemapTests(TestCase):
    def test_live_catalogue_is_scoped_and_updates_without_rebuild(self):
        owner = get_user_model().objects.create_user(username='sitemap-owner')
        tenant = Tenant.objects.create(name='Store', slug='sahara-gold', owner=owner)
        other = Tenant.objects.create(name='Other', slug='other', owner=owner)
        category = Category.objects.create(name='Ring', slug='ring', tenant=tenant)
        product = Product.objects.create(name='Ring', category=category, tenant=tenant, weight=2)
        hidden = Product.objects.create(name='Hidden', category=category, tenant=other, weight=2)
        response = self.client.get('/sitemap.xml')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, f'https://www.shaharagold.org/product/{product.pk}')
        self.assertNotContains(response, f'/product/{hidden.pk}')
        product.in_stock = False
        product.save(update_fields=['in_stock'])
        self.assertNotContains(self.client.get('/sitemap.xml'), f'/product/{product.pk}')
