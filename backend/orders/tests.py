from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch


class CustomerAuthTests(APITestCase):
	@patch('orders.customer_auth.send_mail')
	def test_customer_can_register_and_login(self, send_mail_mock):
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
		code = send_mail_mock.call_args.args[1].split('verification code is: ')[1].split('\n', 1)[0]
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
