from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch


class CustomerAuthTests(APITestCase):
	@patch('orders.customer_auth.send_verification_code')
	def test_customer_can_register_and_login(self, send_code_mock):
		send_code_mock.return_value = (True, 'Delivered')
		payload = {
			'name': 'Test Customer',
			'phone': '01700000000',
			'email': 'customer@example.com',
			'password': 'strong-pass-123',
		}

		register = self.client.post('/api/customer/auth/register/', payload, format='json')
		self.assertEqual(register.status_code, status.HTTP_201_CREATED)
		self.assertTrue(register.data['verification_required'])
		user = User.objects.get(email=payload['email'])
		self.assertFalse(user.is_active)
		code = send_code_mock.call_args.args[1]
		verified = self.client.post('/api/customer/auth/verify-email/', {'email': payload['email'], 'code': code}, format='json')
		self.assertEqual(verified.status_code, status.HTTP_200_OK)
		self.assertIn('access', verified.data)

		login = self.client.post('/api/customer/auth/login/', {
			'phone': payload['phone'],
			'password': payload['password'],
		}, format='json')
		self.assertEqual(login.status_code, status.HTTP_200_OK)
		self.assertIn('refresh', login.data)

	def test_customer_can_refresh_access_token(self):
		user = User.objects.create_user(username='01700000000', password='strong-pass-123')
		login = self.client.post('/api/customer/auth/login/', {
			'phone': user.username,
			'password': 'strong-pass-123',
		}, format='json')

		refresh = self.client.post('/api/customer/auth/refresh/', {
			'refresh': login.data['refresh'],
		}, format='json')

		self.assertEqual(refresh.status_code, status.HTTP_200_OK)
		self.assertIn('access', refresh.data)

	def test_order_history_requires_customer_authentication(self):
		response = self.client.post('/api/orders/my_orders/', {'phone': '01700000000'}, format='json')
		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

	def test_customer_cannot_query_another_phone(self):
		user = User.objects.create_user(username='01700000000', password='strong-pass-123')
		self.client.force_authenticate(user=user)
		response = self.client.post('/api/orders/my_orders/', {'phone': '01800000000'}, format='json')
		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

	@patch('orders.customer_auth.send_verification_code')
	def test_registration_does_not_activate_until_verified(self, send_code_mock):
		send_code_mock.return_value = (True, 'Delivered')
		payload = {
			'name': 'Strict User',
			'phone': '01711223344',
			'email': 'strict@example.com',
			'password': 'strictpassword123',
		}
		reg = self.client.post('/api/customer/auth/register/', payload, format='json')
		self.assertEqual(reg.status_code, status.HTTP_201_CREATED)
		# Ensure NO demo code or tokens are leaked in registration response
		self.assertNotIn('dev_code', reg.data)
		self.assertNotIn('access', reg.data)
		self.assertTrue(reg.data['verification_required'])

		# Attempt login before verification: MUST be rejected
		login_attempt = self.client.post('/api/customer/auth/login/', {
			'email': 'strict@example.com',
			'password': 'strictpassword123',
		}, format='json')
		self.assertEqual(login_attempt.status_code, status.HTTP_403_FORBIDDEN)

	@patch('orders.customer_auth.send_verification_code')
	def test_customer_resend_verification_code(self, send_code_mock):
		send_code_mock.return_value = (True, 'Delivered')
		user = User.objects.create_user(username='01799887766', email='resend@example.com', password='password123', is_active=False)
		res = self.client.post('/api/customer/auth/resend-code/', {'email': 'resend@example.com'}, format='json')
		self.assertEqual(res.status_code, status.HTTP_200_OK)
		self.assertTrue(send_code_mock.called)

	def test_admin_can_login_with_username_or_email(self):
		from core.models import Tenant, TenantMembership
		admin_user = User.objects.create_superuser(
			username='shara_gold',
			email='saharagold19@gmail.com',
			password='sahara1122@@'
		)
		tenant = Tenant.objects.create(name='Sahara Gold', slug='sahara-gold', owner=admin_user)
		TenantMembership.objects.create(tenant=tenant, user=admin_user, role='admin')

		# Login with username
		r1 = self.client.post('/api/auth/login/', {'username': 'shara_gold', 'password': 'sahara1122@@'}, format='json')
		self.assertEqual(r1.status_code, status.HTTP_200_OK)
		self.assertIn('access', r1.data)

		# Login with email
		r2 = self.client.post('/api/auth/login/', {'username': 'saharagold19@gmail.com', 'password': 'sahara1122@@'}, format='json')
		self.assertEqual(r2.status_code, status.HTTP_200_OK)
		self.assertIn('access', r2.data)
