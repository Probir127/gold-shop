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

