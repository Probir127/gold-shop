from types import SimpleNamespace
from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth.models import User
from orders.views import OrderAccessPermission, OrderViewSet
from orders.models import Order
from orders.serializers import OrderSerializer, OrderItemSerializer

class OrderSecurityTests(TestCase):
    @patch('core.utils.notifications.notify_store_owner', return_value=(True, 'Accepted'))
    def test_owner_is_notified_after_status_commit_but_not_for_unchanged_status(self, notify):
        admin = User.objects.create_user('status-admin', is_staff=True)
        order = Order.objects.create(customer_name='Buyer', customer_phone='01700000000',
                                     shipping_address='Dhaka address', city='Dhaka',
                                     subtotal=100, vat=0, total=100, payment_method='manual')
        for expected_calls in (1, 1):
            request = APIRequestFactory().post('/', {'payment_status': 'paid', 'send_whatsapp': False}, format='json')
            force_authenticate(request, admin)
            with self.captureOnCommitCallbacks(execute=True):
                response = OrderViewSet.as_view({'post': 'update_status'})(request, order_id=order.order_id)
                self.assertEqual(response.status_code, 200)
            self.assertEqual(notify.call_count, expected_calls)
        self.assertIn(order.order_id, notify.call_args.kwargs['subject'])
        self.assertIn('Paid', notify.call_args.kwargs['body'])

    def test_payment_approval_invalidates_unpaid_invoice_pdf(self):
        from core.models import Tenant, Client, Invoice
        admin = User.objects.create_user('invoice-admin', is_staff=True)
        tenant = Tenant.objects.create(name='Store', slug='approval-store', owner=admin)
        client = Client.objects.create(tenant=tenant, name='Buyer', phone='01700000000')
        order = Order.objects.create(customer_name='Buyer', customer_phone=client.phone,
                                     shipping_address='Dhaka address', city='Dhaka',
                                     subtotal=100, vat=0, total=100, payment_method='manual')
        invoice = Invoice.objects.create(tenant=tenant, client=client,
                                        invoice_number=f'INV-{order.order_id}', items=[],
                                        subtotal=100, total_amount=100, status='sent',
                                        pdf_path='invoices/unpaid.pdf')
        request = APIRequestFactory().post('/', {'payment_status': 'paid', 'send_whatsapp': False}, format='json')
        force_authenticate(request, admin)
        response = OrderViewSet.as_view({'post': 'update_status'})(request, order_id=order.order_id)
        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        invoice.refresh_from_db()
        self.assertEqual(order.order_status, 'confirmed')
        self.assertEqual(invoice.status, 'paid')
        self.assertEqual(invoice.pdf_path, '')

    def test_empty_contact_fields_do_not_grant_access(self):
        user = User.objects.create_user('letters-only', email='')
        request = SimpleNamespace(user=user, query_params={})
        order = SimpleNamespace(order_id='ORD-SAFE',customer_email='',customer_phone='')
        self.assertFalse(OrderAccessPermission().has_object_permission(request,None,order))
    def test_status_update_rejects_unknown_values(self):
        order = Order.objects.create(customer_name='Buyer',customer_phone='01700000000',shipping_address='Dhaka address',city='Dhaka',subtotal=100,vat=0,total=100)
        request = APIRequestFactory().post('/',{'order_status':'not-a-status'},format='json')
        force_authenticate(request,User.objects.create_user('admin',is_staff=True))
        response=OrderViewSet.as_view({'post':'update_status'})(request,order_id=order.order_id)
        self.assertEqual(response.status_code,400)
        order.refresh_from_db()
        self.assertEqual(order.order_status,'pending')
    def test_invalid_phone_and_excessive_quantity_are_rejected(self):
        from rest_framework.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            OrderSerializer().validate_customer_phone('123')
        with self.assertRaises(ValidationError):
            OrderItemSerializer().fields['quantity'].run_validation(101)
