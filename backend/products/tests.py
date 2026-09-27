from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from core.models import Tenant
from .models import Category, Product
from .models import ProductImage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from io import BytesIO
from tempfile import TemporaryDirectory


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

	def test_category_delete_does_not_destroy_products(self):
		self.user.is_staff = True
		self.user.save()
		self.client.force_authenticate(user=self.user)
		category = Category.objects.create(name='Custom Bridal', slug='custom-bridal')
		Product.objects.create(name='Bridal Set', category=category, weight=3, in_stock=True)

		response = self.client.delete(f'/api/categories/{category.id}/')

		self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
		self.assertTrue(Category.objects.filter(id=category.id).exists())
		self.assertTrue(Product.objects.filter(name='Bridal Set').exists())

	def test_upload_gallery_and_remove_only_own_photo(self):
		self.user.is_staff = True
		self.user.save()
		self.client.force_authenticate(user=self.user)
		category = Category.objects.create(name='Earrings', slug='earrings')
		def photo(name):
			buffer = BytesIO()
			Image.new('RGB', (32, 32), 'gold').save(buffer, format='PNG')
			return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/png')
		with TemporaryDirectory() as directory, override_settings(MEDIA_ROOT=directory):
			response = self.client.post('/api/products/', {
				'name': 'Gold Earrings', 'category': category.pk, 'weight': '2.00',
				'image': photo('front.png'), 'additional_images': [photo('side.png'), photo('back.png')],
			}, format='multipart')
			self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
			self.assertEqual(len(response.data['images']), 3)
			product = Product.objects.get(pk=response.data['id'])
			self.assertEqual(ProductImage.objects.filter(product=product).count(), 2)
			other = Product.objects.create(name='Other', category=category, weight=1)
			other_image = ProductImage.objects.create(product=other, image=photo('other.png'))
			denied = self.client.patch(f'/api/products/{product.pk}/', {
				'remove_image_ids': str(other_image.pk),
			}, format='multipart')
			self.assertEqual(denied.status_code, status.HTTP_400_BAD_REQUEST)
			self.assertTrue(ProductImage.objects.filter(pk=other_image.pk).exists())
			removed = self.client.patch(f'/api/products/{product.pk}/', {
				'remove_image_ids': str(response.data['gallery'][0]['id']),
			}, format='multipart')
			self.assertEqual(removed.status_code, status.HTTP_200_OK, removed.data)
			self.assertEqual(len(removed.data['images']), 2)

	def test_category_create_works_for_admin(self):
		self.user.is_staff = True
		self.user.save()
		self.client.force_authenticate(user=self.user)
		response = self.client.post('/api/categories/', {'name': 'Temple Gold'}, format='json')

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertTrue(Category.objects.filter(slug='temple-gold').exists())

	def test_category_filter_accepts_numeric_id_or_slug(self):
		self.user.is_staff = True
		self.user.save()
		self.client.force_authenticate(user=self.user)
		category = Category.objects.create(name='Bridal Sets', slug='bridal-sets')
		Product.objects.create(name='Royal Bridal Ring', category=category, weight=2.5, in_stock=True)
		Product.objects.create(name='Other Ring', category=Category.objects.create(name='Everyday Rings', slug='everyday-rings'), weight=1.5, in_stock=True)

		by_slug = self.client.get('/api/products/', {'category': 'bridal-sets'})
		by_id = self.client.get('/api/products/', {'category': str(category.id)})

		self.assertEqual(by_slug.status_code, status.HTTP_200_OK)
		self.assertEqual(by_id.status_code, status.HTTP_200_OK)
		self.assertEqual([p['name'] for p in by_slug.data['results']], ['Royal Bridal Ring'])
		self.assertEqual([p['name'] for p in by_id.data['results']], ['Royal Bridal Ring'])

