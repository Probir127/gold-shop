from rest_framework.test import APITestCase
from rest_framework import status
from .models import Category, Product


class ProductVisibilityTests(APITestCase):
	def test_storefront_hides_out_of_stock_products(self):
		category = Category.objects.create(name='Test Rings', slug='test-rings')
		Product.objects.create(name='Available Ring', category=category, weight=2, in_stock=True)
		Product.objects.create(name='Sold Ring', category=category, weight=2, in_stock=False)

		response = self.client.get('/api/products/')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		names = [product['name'] for product in response.data['results']]
		self.assertIn('Available Ring', names)
		self.assertNotIn('Sold Ring', names)
