from django.test import TestCase
from django.contrib.auth.models import User
from core.bootstrap import initialize_admin
from core.models import Tenant
from products.models import Category, Product

class BootstrapPreservationTests(TestCase):
    def test_existing_credentials_and_product_data_are_preserved(self):
        user = User.objects.create_superuser('owner', 'original@example.com', 'Original-Password-438!')
        tenant = Tenant.objects.create(slug='sahara-gold', name='Existing shop', owner=user)
        category = Category.objects.create(name='Necklaces', slug='necklaces')
        product = Product.objects.create(name='Existing necklace', category=category, description='Owner description', weight='10.87', purity='22K', image='products/original.jpg', making_charge_per_gram=500)
        initialize_admin('owner', 'replacement@example.com', 'Replacement-Password-954!')
        user.refresh_from_db(); product.refresh_from_db(); category.refresh_from_db(); tenant.refresh_from_db()
        self.assertEqual(user.email, 'original@example.com')
        self.assertTrue(user.check_password('Original-Password-438!'))
        self.assertEqual(product.description, 'Owner description')
        self.assertEqual(product.image.name, 'products/original.jpg')
        self.assertIsNone(product.tenant_id)
        self.assertIsNone(category.tenant_id)
        self.assertEqual(tenant.name, 'Existing shop')
        self.assertEqual(Product.objects.count(), 1)

    def test_missing_explicit_credentials_create_nothing(self):
        with self.assertRaises(ValueError): initialize_admin('', '', '')
        self.assertFalse(User.objects.exists())
        self.assertFalse(Tenant.objects.exists())

    def test_setup_cannot_promote_customer(self):
        user = User.objects.create_user('customer', password='Customer-Password-238!')
        with self.assertRaises(ValueError): initialize_admin('customer', 'new@example.com', 'New-Password-298!')
        user.refresh_from_db()
        self.assertFalse(user.is_staff)
