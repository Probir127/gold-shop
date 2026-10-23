from datetime import timedelta
from unittest.mock import patch
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.authentication import CsrfExemptSessionAuthentication
from core.views.auth_views import LoginView
from core.views.contact_views import ContactEnquiryView
from orders.customer_auth import CustomerRegisterView, CustomerVerifyEmailView, CustomerResendVerificationView
from orders.models import CustomerEmailVerification

class SessionProtectedView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    def post(self, request):
        return Response({'ok': True})

class AuthenticationSecurityTests(TestCase):
    def setUp(self):
        cache.clear()
        self.factory = APIRequestFactory(enforce_csrf_checks=True)

    def test_session_mutation_requires_csrf(self):
        request = self.factory.post('/', {})
        request.user = User.objects.create_user('staff', is_staff=True)
        self.assertEqual(SessionProtectedView.as_view()(request).status_code, 403)

    def test_login_rate_limit(self):
        for index in range(10):
            response = LoginView.as_view()(self.factory.post('/', {'username': f'missing-{index}', 'password': 'incorrect'}))
            self.assertEqual(response.status_code, 401)
        self.assertEqual(LoginView.as_view()(self.factory.post('/', {'username': 'missing', 'password': 'incorrect'})).status_code, 429)

    @patch('orders.customer_auth.send_verification_code')
    def test_registration_cannot_reset_disabled_staff(self, sender):
        user = User.objects.create_user('staff', email='staff@example.com', password='old-password', is_staff=True, is_active=False)
        response = CustomerRegisterView.as_view()(self.factory.post('/', {'name': 'New name', 'email': user.email, 'password': 'Secure-Brand-New-293!'}))
        self.assertEqual(response.status_code, 400)
        user.refresh_from_db()
        self.assertTrue(user.check_password('old-password'))
        sender.assert_not_called()

    def test_verification_cannot_reactivate_staff(self):
        user = User.objects.create_user('staff', email='staff@example.com', is_staff=True, is_active=False)
        CustomerEmailVerification.objects.create(user=user, code_hash=make_password('123456'), expires_at=timezone.now() + timedelta(minutes=15))
        response = CustomerVerifyEmailView.as_view()(self.factory.post('/', {'email': user.email, 'code': '123456'}))
        self.assertEqual(response.status_code, 400)
        user.refresh_from_db()
        self.assertFalse(user.is_active)

    @patch('orders.customer_auth.send_verification_code')
    def test_resend_cannot_create_verification_for_disabled_account(self, sender):
        user = User.objects.create_user('disabled', email='disabled@example.com', is_active=False)
        response = CustomerResendVerificationView.as_view()(self.factory.post('/', {'email': user.email}))
        self.assertEqual(response.status_code, 400)
        sender.assert_not_called()

    @override_settings(AUTH_PASSWORD_VALIDATORS=[{'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'}])
    def test_registration_applies_server_password_policy(self):
        response = CustomerRegisterView.as_view()(self.factory.post('/', {'name': 'Customer', 'email': 'new@example.com', 'password': 'password'}))
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(email='new@example.com').exists())

    @patch('core.views.contact_views.send_email_resilient')
    def test_honeypot_does_not_send_mail(self, sender):
        response = ContactEnquiryView.as_view()(self.factory.post('/', {'website': 'spam.example'}))
        self.assertEqual(response.status_code, 201)
        sender.assert_not_called()

    @patch('core.views.contact_views.send_email_resilient')
    def test_contact_rejects_invalid_and_oversized_data(self, sender):
        for data in [
            {'name': 'Buyer', 'contact': 'invalid', 'message': 'Hello showroom team'},
            {'name': 'Buyer', 'email': 'bad@example', 'message': 'Hello showroom team'},
            {'name': 'Buyer', 'contact': '01799281878', 'message': 'x' * 5001},
            {'name': 'Buyer\nBcc: Other', 'contact': '01799281878', 'message': 'Hello showroom team'},
        ]:
            response = ContactEnquiryView.as_view()(self.factory.post('/', data))
            self.assertEqual(response.status_code, 400)
        sender.assert_not_called()

    @override_settings(STORE_EMAIL='store@example.com')
    @patch('core.views.contact_views.send_email_resilient', return_value=(True, 'sent'))
    def test_valid_contact_uses_verified_delivery_result(self, sender):
        response = ContactEnquiryView.as_view()(self.factory.post('/', {'name': 'Buyer', 'email': 'buyer@example.com', 'message': 'Hello showroom team'}))
        self.assertEqual(response.status_code, 201)
        sender.assert_called_once()


class AccountLockoutTests(TestCase):
    def setUp(self):
        cache.clear()
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user('guard-owner', email='guard@example.com', password='Correct-Sahara-827!')

    def test_lockout_survives_ip_and_identifier_changes(self):
        for index in range(5):
            response = LoginView.as_view()(self.factory.post('/', {'username':'guard-owner','password':'wrong'}, REMOTE_ADDR=f'192.0.2.{index+1}'))
            self.assertEqual(response.status_code,401)
        response = LoginView.as_view()(self.factory.post('/', {'username':'guard@example.com','password':'Correct-Sahara-827!'}, REMOTE_ADDR='192.0.2.99'))
        self.assertEqual(response.status_code,429)

    def test_correct_login_clears_failures(self):
        from core.login_guard import login_key
        key=login_key('guard-owner',self.user)
        cache.set(key,4,900)
        response=LoginView.as_view()(self.factory.post('/',{'username':'guard-owner','password':'Correct-Sahara-827!'}))
        self.assertEqual(response.status_code,200)
        self.assertIsNone(cache.get(key))

    def test_customer_uses_the_same_account_lock(self):
        from orders.customer_auth import CustomerLoginView
        from core.login_guard import login_key
        cache.set(login_key('guard-owner',self.user),5,900)
        response=CustomerLoginView.as_view()(self.factory.post('/',{'email':'guard@example.com','password':'Correct-Sahara-827!'}))
        self.assertEqual(response.status_code,429)

    def test_rate_publish_does_not_clear_security_counters(self):
        from rates.views import invalidate_rate_cache
        from core.login_guard import login_key
        key=login_key('guard-owner',self.user)
        cache.set(key,5,900)
        cache.set('live_gold_market_cache',{'old':True},120)
        invalidate_rate_cache()
        self.assertEqual(cache.get(key),5)
        self.assertIsNone(cache.get('live_gold_market_cache'))

class VerificationDeliveryStatusTests(TestCase):
    def setUp(self):
        cache.clear()
        self.factory = APIRequestFactory()

    @override_settings(LOCAL_EMAIL_CAPTURE_DIR='/tmp/captured-mail')
    @patch('orders.customer_auth.send_verification_code', return_value=(True, 'Captured'))
    def test_signup_does_not_claim_captured_email_was_sent(self, sender):
        response = CustomerRegisterView.as_view()(self.factory.post('/', {
            'name': 'Mail Test', 'email': 'mail-test@example.com', 'password': 'Strong-Unique-932!Password',
        }))
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['delivery_status'], 'captured')
        self.assertIn('nothing was sent', response.data['message'])

    @override_settings(LOCAL_EMAIL_CAPTURE_DIR=None)
    @patch('orders.customer_auth.send_verification_code', return_value=(True, 'Accepted'))
    def test_signup_reports_provider_acceptance(self, sender):
        response = CustomerRegisterView.as_view()(self.factory.post('/', {
            'name': 'Mail Test', 'email': 'mail-test@example.com', 'password': 'Strong-Unique-932!Password',
        }))
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['delivery_status'], 'accepted')

    @patch('orders.customer_auth.send_verification_code', return_value=(False, 'Failed'))
    def test_mail_failure_does_not_report_success(self, sender):
        response = CustomerRegisterView.as_view()(self.factory.post('/', {
            'name': 'Mail Test', 'email': 'mail-test@example.com', 'password': 'Strong-Unique-932!Password',
        }))
        self.assertEqual(response.status_code, 502)
        self.assertNotIn('delivery_status', response.data)
