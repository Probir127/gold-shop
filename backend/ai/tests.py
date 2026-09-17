from django.test import TestCase
from .services import get_latest_rates_dict

class AIServiceTest(TestCase):
    def test_rates_dict_structure(self):
        rates = get_latest_rates_dict()
        self.assertIn('22K', rates)
        self.assertIn('21K', rates)
        self.assertIn('18K', rates)

