from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from core.models import Tenant
from core.utils.shop_answers import budget_from_message
from rates.pricing import publish_manual
from rates.models import RateControl
from products.models import Category, Product


class ShopChatTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        owner = get_user_model().objects.create_user(username='chat-owner')
        self.tenant = Tenant.objects.create(name='Sahara', slug='sahara-gold', business_name='Sahara Gold', owner=owner)
        self.other = Tenant.objects.create(name='Other', slug='other', business_name='Other', owner=owner)
        self.values = {'rate_22k': 21000, 'rate_21k': 19000, 'rate_18k': 17000, 'rate_traditional': 12000}
        publish_manual(self.values)

    def chat(self, message):
        response = self.client.post('/api/public/chat/sahara-gold/', {'message': message, 'visitor_id': 'WEB_test'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    @patch('core.utils.ai_bot._get_hf_client', side_effect=RuntimeError('provider down'))
    def test_rates_work_without_ai_and_follow_manual_updates(self, ai):
        first = self.chat('What are today’s gold rates?')
        self.assertIn('21,000', first['reply'])
        self.assertEqual(first['rates']['pricing_mode'], 'manual')
        publish_manual({**self.values, 'rate_22k': 22000})
        second = self.chat('আজকের সোনার দাম কত?')
        self.assertIn('22,000', second['reply'])
        self.assertNotIn('21,000', second['reply'])
        self.assertEqual(second['rates']['rate_22k'], 22000)
        ai.assert_not_called()

    @patch('rates.pricing.fetch_live_gold_price', return_value={'status': 'error'})
    def test_failed_live_feed_is_not_claimed_as_fresh(self, provider):
        RateControl.objects.filter(pk=1).update(mode='auto')
        answer = self.chat('gold rate')
        self.assertIn('Last saved', answer['reply'])
        self.assertTrue(answer['rates']['is_stale'])

    @patch('core.utils.ai_bot._get_hf_client', side_effect=RuntimeError('provider down'))
    def test_product_cards_obey_budget_stock_and_tenant(self, ai):
        category = Category.objects.create(name='Necklace', slug='necklace', tenant=self.tenant)
        included = Product.objects.create(name='Short Necklace', category=category, tenant=self.tenant, purity='22K', weight=2, making_charge_per_gram=500, image='products/test.jpg')
        Product.objects.create(name='Expensive Necklace', category=category, tenant=self.tenant, weight=20, purity='22K')
        Product.objects.create(name='Sold Necklace', category=category, tenant=self.tenant, weight=1, in_stock=False)
        Product.objects.create(name='Other Necklace', category=category, tenant=self.other, weight=1)
        answer = self.chat('Suggest necklaces under ৳70,000')
        self.assertEqual([p['id'] for p in answer['products']], [included.id])
        self.assertEqual(answer['products'][0]['current_price'], 43000)
        self.assertTrue(answer['products'][0]['image'].startswith('http://testserver/'))
        ai.assert_not_called()

    def test_purity_numbers_are_not_budgets(self):
        self.assertIsNone(budget_from_message('show 22K necklaces'))
        self.assertEqual(budget_from_message('under ৳70,000'), 70000)
        self.assertEqual(budget_from_message('budget 70k'), 70000)
        self.assertEqual(budget_from_message('৭০ হাজার টাকার মধ্যে'), 70000)

    @patch('core.utils.ai_bot._get_hf_client', side_effect=RuntimeError('provider down'))
    def test_tracking_instructions_do_not_depend_on_ai(self, ai):
        self.assertIn('/track-order', self.chat('How do I track my order?')['reply'])
        ai.assert_not_called()


class AdminAITests(TestCase):
    setUp = ShopChatTests.setUp

    def admin_request(self, view, data=None, method='post'):
        from rest_framework.test import APIRequestFactory, force_authenticate
        request = getattr(APIRequestFactory(), method)('/', data or {}, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant.owner)
        return view.as_view()(request)

    @patch('core.utils.ai_bot._get_hf_client', side_effect=RuntimeError('provider down'))
    def test_admin_sandbox_uses_same_published_rates(self, ai):
        from core.views.bot_test_views import BotTestView
        response = self.admin_request(BotTestView, {'message': 'gold rates'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['rates']['rate_22k'], 21000)
        ai.assert_not_called()

    def test_analytics_does_not_double_subtract_failures(self):
        from core.models import BotAnalytics, Client
        from core.views.ai_analytics_views import AIAnalyticsStatsView
        client = Client.objects.create(tenant=self.tenant, phone='TEST_ANALYTICS')
        BotAnalytics.objects.create(tenant=self.tenant, client=client, was_fallback=True, was_escalated=True)
        response = self.admin_request(AIAnalyticsStatsView, method='get')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['success_count'], 0)
        for days in ['bad', 0, -1, 366]:
            response = self.admin_request(AIAnalyticsStatsView, {'days': days}, method='get')
            self.assertEqual(response.status_code, 400)
