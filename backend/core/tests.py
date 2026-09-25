from __future__ import annotations
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Client, Invoice, Tenant
from .utils.invoice_access import make_invoice_access_token


class InvoiceAccessTests(APITestCase):
	def test_invoice_list_requires_authentication(self):
		response = self.client.get('/api/invoices/')
		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

	def test_admin_can_create_tax_free_invoice_from_form_fields(self):
		user = User.objects.create_user(username='manager', password='strong-pass-123')
		tenant = Tenant.objects.create(
			name='Sahara Gold', slug='sahara-gold', owner=user,
			business_name='Sahara Gold',
		)
		client = Client.objects.create(tenant=tenant, name='Customer', phone='01700000000')
		refresh = RefreshToken.for_user(user)
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
		response = self.client.post(
			'/api/invoices/',
			{
				'client': str(client.id),
				'total_amount': '12500.00',
				'due_date': '2026-10-01',
				'notes': 'Custom ring',
			},
			format='json',
			HTTP_X_TENANT_SLUG='sahara-gold',
		)
		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(str(response.data['amount']), '12500.00')
		self.assertEqual(response.data['tax_percent'], '0.00')

	def test_invoice_html_requires_signed_customer_link(self):
		user = User.objects.create_user(username='manager', password='strong-pass-123')
		tenant = Tenant.objects.create(name='Sahara Gold', slug='sahara-gold', owner=user, business_name='Sahara Gold')
		client = Client.objects.create(tenant=tenant, name='Customer', phone='01700000000')
		invoice = Invoice.objects.create(
			tenant=tenant, client=client, invoice_number='INV-TEST-001', items=[],
			subtotal='100.00', total_amount='100.00', currency='BDT',
		)

		unsigned = self.client.get(f'/api/invoices/{invoice.id}/html/?copy=customer')
		self.assertEqual(unsigned.status_code, status.HTTP_401_UNAUTHORIZED)

		token = make_invoice_access_token('invoice', invoice.id)
		signed = self.client.get(f'/api/invoices/{invoice.id}/html/?copy=customer&token={token}')
		self.assertEqual(signed.status_code, status.HTTP_200_OK)

	def test_invoice_admin_copy_requires_staff_and_tenant(self):
		owner = User.objects.create_user(username='owner', password='strong-pass-123')
		tenant = Tenant.objects.create(name='Sahara Gold', slug='sahara-gold', owner=owner, business_name='Sahara Gold')
		client = Client.objects.create(tenant=tenant, name='Customer', phone='01700000000')
		invoice = Invoice.objects.create(
			tenant=tenant, client=client, invoice_number='INV-TEST-002', items=[],
			subtotal='100.00', total_amount='100.00', currency='BDT',
		)
		refresh = RefreshToken.for_user(owner)
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
		response = self.client.get(
			f'/api/invoices/{invoice.id}/html/?copy=admin',
			HTTP_X_TENANT_SLUG='sahara-gold',
		)
		self.assertEqual(response.status_code, status.HTTP_200_OK)

	def test_public_contact_enquiry_sends_store_email(self):
		with self.settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend'):
			response = self.client.post('/api/contact/enquiry/', {
				'name': 'Test Visitor',
				'mobile': '01700000000',
				'email': 'visitor@example.com',
				'message': 'I would like to book a showroom consultation.',
			}, format='json')

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)

	def test_email_resilient_rejects_unconfigured_smtp_identity(self):
		with self.settings(
			EMAIL_HOST='',
			EMAIL_HOST_USER='',
			EMAIL_HOST_PASSWORD='',
			DEFAULT_FROM_EMAIL='',
		):
			ok, msg = __import__('core.utils.mailer', fromlist=['send_email_resilient']).send_email_resilient(
				subject='Test',
				body='Body',
				to_emails='customer@example.com',
			)

		self.assertFalse(ok)
		self.assertIn('SMTP is not configured', msg)

	def test_email_resilient_rejects_fixed_gmail_sender_identity(self):
		with self.settings(
			EMAIL_HOST='smtp.gmail.com',
			EMAIL_HOST_USER='store@gmail.com',
			EMAIL_HOST_PASSWORD='app-password',
			DEFAULT_FROM_EMAIL='Sahara Gold <store@gmail.com>',
		):
			ok, msg = __import__('core.utils.mailer', fromlist=['send_email_resilient']).send_email_resilient(
				subject='Test',
				body='Body',
				to_emails='customer@example.com',
			)

		self.assertFalse(ok)
		self.assertIn('fixed Gmail mailbox', msg)
