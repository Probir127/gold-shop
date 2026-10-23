from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.urls import path
from rest_framework.test import APIClient
from .storefront import StorefrontContentView

urlpatterns = [path('content/', StorefrontContentView.as_view())]

@override_settings(ROOT_URLCONF=__name__)
class StorefrontContentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
    def test_public_read_and_denied_write(self):
        self.assertEqual(self.client.get('/content/').status_code, 200)
        self.assertIn(self.client.patch('/content/', {'hero_title':'changed'}, format='json').status_code, (401,403))
    def test_staff_save_persists_and_rejects_script_url_and_unknown_fields(self):
        staff=User.objects.create_user('content-editor', is_staff=True)
        self.client.force_authenticate(staff)
        self.assertEqual(self.client.patch('/content/', {'hero_title':'Our collection'}, format='json').status_code,200)
        self.assertEqual(self.client.get('/content/').data['hero_title'],'Our collection')
        for payload in [{'hero_image':'javascript:alert(1)'},{'api_key':'secret'},{'ga4_measurement_id':'bad'}]:
            self.assertEqual(self.client.patch('/content/',payload,format='json').status_code,400)
    def test_customer_cannot_write(self):
        self.client.force_authenticate(User.objects.create_user('shopper'))
        self.assertEqual(self.client.patch('/content/', {'hero_title':'changed'},format='json').status_code,403)
