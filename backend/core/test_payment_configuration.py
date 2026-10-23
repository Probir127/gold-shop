from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from core.models import PaymentConfiguration
from core.payment_config import gateway_credentials
from orders.models import Order

class PaymentConfigurationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user('payment-owner', is_staff=True)

    def test_manual_only_by_default_and_admin_endpoint_protected(self):
        response = self.client.get('/api/checkout/config/')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['ssl_enabled'])
        self.assertTrue(response.data['manual_enabled'])
        self.assertNotIn('ssl_store_id', response.data)
        self.assertIn(self.client.patch('/api/checkout/admin-config/', {'ssl_enabled': True}, format='json').status_code, [401,403])

    def test_enabling_requires_credentials_and_secret_never_returns(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.patch('/api/checkout/admin-config/', {'ssl_enabled':True}, format='json').status_code,400)
        response = self.client.patch('/api/checkout/admin-config/', {'ssl_enabled':True,'ssl_store_id':'merchant-live-123','ssl_store_password':'secret-test-only','contact_phone':'01799281878'}, format='json')
        self.assertEqual(response.status_code,200)
        record=PaymentConfiguration.objects.get(pk=1)
        self.assertNotIn('secret-test-only',record.ssl_secret_encrypted)
        self.assertNotIn('secret-test-only',str(response.data))
        self.assertEqual(gateway_credentials(),('merchant-live-123','secret-test-only'))
        self.client.force_authenticate(None)
        public=self.client.get('/api/checkout/config/').data
        self.assertTrue(public['ssl_enabled'])
        self.assertNotIn('ssl_store_id',public)
        self.assertNotIn('secret',str(public))

    def test_disabling_hides_online_option_without_deleting_credentials(self):
        self.client.force_authenticate(self.admin)
        self.client.patch('/api/checkout/admin-config/', {'ssl_enabled':True,'ssl_store_id':'merchant-live-123','ssl_store_password':'secret-test-only'}, format='json')
        self.client.patch('/api/checkout/admin-config/', {'ssl_enabled':False}, format='json')
        self.assertFalse(self.client.get('/api/checkout/config/').data['ssl_enabled'])
        self.assertTrue(PaymentConfiguration.objects.get(pk=1).ssl_secret_encrypted)

class ManualPaymentApprovalTests(TestCase):
    def setUp(self):
        self.client=APIClient()
        self.admin=User.objects.create_user('approver',is_staff=True)
        self.order=Order.objects.create(customer_name='Buyer',customer_phone='01700000000',shipping_address='Local test address',city='Dhaka',subtotal=100,vat=0,total=100,payment_method='manual',payment_status='awaiting_payment')
        self.path=f'/api/orders/{self.order.order_id}/update_status/'

    def test_customer_cannot_approve(self):
        self.client.force_authenticate(User.objects.create_user('buyer'))
        self.assertEqual(self.client.post(self.path,{'payment_status':'paid','send_whatsapp':False},format='json').status_code,403)
        self.order.refresh_from_db();self.assertEqual(self.order.order_status,'pending')

    def test_cannot_confirm_or_ship_unverified_payment(self):
        self.client.force_authenticate(self.admin)
        for state in ('confirmed','processing','shipped','delivered'):
            self.assertEqual(self.client.post(self.path,{'order_status':state,'send_whatsapp':False},format='json').status_code,400)
        self.order.refresh_from_db();self.assertEqual(self.order.order_status,'pending')

    def test_admin_payment_approval_confirms_order(self):
        self.client.force_authenticate(self.admin)
        response=self.client.post(self.path,{'payment_status':'paid','send_whatsapp':False},format='json')
        self.assertEqual(response.status_code,200)
        self.order.refresh_from_db();self.assertEqual((self.order.order_status,self.order.payment_status),('confirmed','paid'))

    def test_new_orders_reject_unavailable_gateway_and_cod(self):
        from orders.serializers import OrderSerializer
        from rest_framework.exceptions import ValidationError
        for method in ('cod','bkash'):
            with self.assertRaises(ValidationError): OrderSerializer().validate_payment_method(method)
        self.assertEqual(OrderSerializer().validate_payment_method('manual'),'manual')

    def test_customer_supplied_paid_and_confirmed_states_are_ignored(self):
        from core.models import Tenant, Invoice
        from products.models import Category, Product
        from rates.models import GoldRate, RateControl
        Tenant.objects.create(slug='sahara-gold',name='Store',owner=self.admin)
        category=Category.objects.create(name='Rings',slug='rings')
        product=Product.objects.create(category=category,name='Ring',weight=2,purity='22K')
        GoldRate.objects.create(rate_22k=15000,rate_21k=14000,rate_18k=12000,rate_traditional=10000)
        RateControl.objects.create(mode='manual')
        response=self.client.post('/api/orders/',{'customer_name':'Buyer','customer_phone':'01700000000','shipping_address':'A complete local address','city':'Dhaka','payment_method':'manual','payment_status':'paid','order_status':'confirmed','items':[{'product_id':product.id,'quantity':1}]},format='json')
        self.assertEqual(response.status_code,201,response.data)
        self.assertEqual(response.data['order_status'],'pending')
        self.assertEqual(response.data['payment_status'],'awaiting_payment')
        self.assertEqual(Invoice.objects.get(invoice_number='INV-'+response.data['order_id']).status,'draft')
