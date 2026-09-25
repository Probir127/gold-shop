from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from core.models import Tenant
from .models import Category, Product


class ProductVisibilityTests(APITestCase):
	def setUp(self):
		self.user = User.objects.create_user(username='shopowner', password='password123')
		self.tenant_a = Tenant.objects.create(name='Tenant Alpha', slug='tenant-alpha', business_name='Alpha Jewels', owner=self.user)
		self.tenant_b = Tenant.objects.create(name='Tenant Beta', slug='tenant-beta', business_name='Beta Jewels', owner=self.user)

	def test_storefront_hides_out_of_stock_products(self):
		category = Category.objects.create(name='Test Rings', slug='test-rings')
		Product.objects.create(name='Available Ring', category=category, weight=2, in_stock=True)
		Product.objects.create(name='Sold Ring', category=category, weight=2, in_stock=False)

		response = self.client.get('/api/products/')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		names = [product['name'] for product in response.data['results']]
		self.assertIn('Available Ring', names)
		self.assertNotIn('Sold Ring', names)

	def test_tenant_product_isolation(self):
		category_a = Category.objects.create(tenant=self.tenant_a, name='Alpha Rings', slug='alpha-rings')
		Product.objects.create(tenant=self.tenant_a, name='Alpha Diamond Ring', category=category_a, weight=3, in_stock=True)

		category_b = Category.objects.create(tenant=self.tenant_b, name='Beta Rings', slug='beta-rings')
		Product.objects.create(tenant=self.tenant_b, name='Beta Emerald Ring', category=category_b, weight=4, in_stock=True)

		self.client.force_authenticate(user=self.user)

		# Request as Tenant Alpha
		response_a = self.client.get('/api/products/', HTTP_X_TENANT_SLUG='tenant-alpha')
		self.assertEqual(response_a.status_code, status.HTTP_200_OK)
		names_a = [p['name'] for p in response_a.data['results']]
		self.assertIn('Alpha Diamond Ring', names_a)
		self.assertNotIn('Beta Emerald Ring', names_a)

	def test_category_delete_works_with_primary_key_lookup(self):
		self.user.is_staff = True
		self.user.save()
		self.client.force_authenticate(user=self.user)
		category = Category.objects.create(name='Custom Bridal', slug='custom-bridal')
		Product.objects.create(name='Bridal Set', category=category, weight=3, in_stock=True)

		response = self.client.delete(f'/api/categories/{category.id}/')

		self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
		self.assertFalse(Category.objects.filter(id=category.id).exists())
		self.assertFalse(Product.objects.filter(name='Bridal Set').exists())

	def test_category_create_works_for_admin(self):
		self.user.is_staff = True
		self.user.save()
		self.client.force_authenticate(user=self.user)
		response = self.client.post('/api/categories/', {'name': 'Temple Gold'}, format='json')

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertTrue(Category.objects.filter(slug='temple-gold').exists())

