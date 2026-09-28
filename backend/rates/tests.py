from django.test import TestCase
from .models import GoldRate

class GoldRateTest(TestCase):
    def test_gold_rate_creation(self):
        rate = GoldRate.objects.create(
            rate_22k=9500,
            rate_21k=9000,
            rate_18k=8000,
            rate_traditional=7000
        )
        self.assertIsNotNone(rate.id)
        self.assertEqual(rate.rate_22k, 9500)


from datetime import timedelta
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from .models import RateControl
from .pricing import effective_rate, publish_manual, store_today
from .serializers import GoldRateSerializer

MARKET = {'status': 'success', 'rate_22k': 15000, 'rate_21k': 14000, 'rate_18k': 12000, 'rate_traditional': 10000}


class PricingControlTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = get_user_model().objects.create_user(username='owner', is_staff=True)
        self.saved = GoldRate.objects.create(date=store_today(), rate_22k=20000, rate_21k=19000, rate_18k=16000, rate_traditional=13000)

    @patch('rates.pricing.fetch_live_gold_price', return_value=MARKET)
    def test_auto_publishes_once_per_interval(self, provider):
        obj, config = effective_rate()
        self.assertEqual(obj.rate_22k, 15000)
        self.assertEqual(config.mode, 'auto')
        self.assertFalse(obj.is_stale)
        effective_rate()
        self.assertEqual(provider.call_count, 1)
        config.last_attempt_at = timezone.now() - timedelta(minutes=3)
        config.save()
        effective_rate()
        self.assertEqual(provider.call_count, 2)

    @patch('rates.pricing.fetch_live_gold_price', return_value=MARKET)
    def test_manual_publish_holds_until_auto_resumes(self, provider):
        self.client.force_authenticate(self.staff)
        values = {key: value for key, value in MARKET.items() if key.startswith('rate_')}
        values['rate_22k'] = 21000
        response = self.client.post('/rates/', {'date': str(store_today()), **values})
        self.assertEqual(response.status_code, 200, response.data)
        obj, config = effective_rate()
        self.assertEqual(obj.rate_22k, 21000)
        self.assertEqual(config.mode, 'manual')
        provider.assert_not_called()
        response = self.client.patch('/rates/control/', {'mode': 'auto'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(effective_rate()[0].rate_22k, 15000)
        self.assertEqual(provider.call_count, 1)

    @patch('rates.pricing.fetch_live_gold_price', side_effect=TimeoutError)
    def test_outage_retains_prices_and_throttles_retries(self, provider):
        obj, config = effective_rate()
        self.assertEqual(obj.rate_22k, 20000)
        self.assertTrue(obj.is_stale)
        self.assertTrue(config.last_error)
        effective_rate()
        self.assertEqual(provider.call_count, 1)

    @patch('rates.pricing.fetch_live_gold_price', return_value=MARKET)
    def test_single_sync_keeps_manual_mode(self, provider):
        RateControl.objects.create(pk=1, mode='manual')
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.post('/rates/sync-live/').status_code, 200)
        self.assertEqual(effective_rate()[1].mode, 'manual')
        self.assertEqual(provider.call_count, 1)

    def test_anonymous_cannot_change_mode_or_publish(self):
        for method, url, data in [('patch', '/rates/control/', {'mode': 'manual'}), ('post', '/rates/', {}), ('post', '/rates/sync-live/', {})]:
            self.assertIn(getattr(self.client, method)(url, data).status_code, (401, 403))

    def test_invalid_manual_rates_do_not_disable_auto(self):
        RateControl.objects.create(pk=1, mode='auto')
        self.client.force_authenticate(self.staff)
        response = self.client.post('/rates/', {'date': str(store_today()), 'rate_22k': -1, 'rate_21k': 10, 'rate_18k': 10, 'rate_traditional': 10})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(RateControl.objects.get(pk=1).mode, 'auto')

    @patch('rates.pricing.fetch_live_gold_price', return_value=MARKET)
    def test_catalog_ai_and_public_rate_use_same_price(self, provider):
        from products.models import Product
        from products.serializers import ProductSerializer
        from ai.services import get_latest_rates_dict
        from types import SimpleNamespace
        obj, _ = effective_rate()
        product = SimpleNamespace(purity='22K', weight=2, making_charge_per_gram=500)
        self.assertEqual(ProductSerializer().get_current_price(product), 31000)
        self.assertEqual(get_latest_rates_dict()['22K'], obj.rate_22k)
        response = self.client.get('/rates/latest/')
        self.assertEqual(response.data['rate_22k'], obj.rate_22k)
        self.assertEqual(response.data['pricing_mode'], 'auto')
        self.assertFalse(response.data['is_stale'])

    def test_future_record_is_not_effective_early(self):
        RateControl.objects.create(pk=1, mode='manual')
        GoldRate.objects.create(date=store_today()+timedelta(days=1), rate_22k=99999, rate_21k=99999, rate_18k=99999, rate_traditional=99999)
        self.assertEqual(effective_rate()[0].rate_22k, 20000)
