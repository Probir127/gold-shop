from __future__ import annotations
from django.core.management.base import BaseCommand
from core.models import Service

class Command(BaseCommand):
    help = 'Loads official GrownK services into the database'

    def handle(self, *args, **kwargs):
        services = [
            # Core Packages
            {
                'name': 'Manual Service (Core)',
                'description': 'Website Template + Social media setup + 1 boosting + Brand kit + 1 training session. (One-time)',
                'base_price': 25000.00
            },
            {
                'name': 'Custom Service (Custom)',
                'description': 'Custom website + Social media setup + Meta Ad boosting (1 mo) + Brand kit + 1 training session. (One-time)',
                'base_price': 35000.00
            },
            {
                'name': 'Total Management (Subscription)',
                'description': 'Website template + Social media setup + Meta Ad management + Content (8v, 15p) + Tech support. (Mo)',
                'base_price': 20000.00
            },
            # Targeted Artillery (Add-ons)
            {
                'name': 'Social Media Ad Campaign & Boosting',
                'description': 'Strategic ad setup and campaign management across Meta platforms.',
                'base_price': 5000.00
            },
            {
                'name': 'Website Creation (Basic Template)',
                'description': 'Stand-alone high-performance template website.',
                'base_price': 14000.00
            },
            {
                'name': 'Website Creation (Custom)',
                'description': 'Stand-alone fully custom high-performance web asset.',
                'base_price': 25000.00
            },
            {
                'name': 'Social Media Setup',
                'description': 'Complete setup of FB, IG, TikTok, X, and Meta Business.',
                'base_price': 4000.00
            },
            {
                'name': 'SEO Marketing',
                'description': 'On-page, technical, and off-page SEO.',
                'base_price': 10000.00
            },
            {
                'name': 'App Creation (Basic Catalogue)',
                'description': 'Catalogue App development for iOS and Android.',
                'base_price': 30000.00
            },
            {
                'name': 'App Creation (E-Commerce)',
                'description': 'Full E-commerce App development for iOS and Android.',
                'base_price': 50000.00
            },
            {
                'name': 'Graphic Design & Content Creation',
                'description': 'Marketing posters and social media graphics.',
                'base_price': 2000.00
            },
        ]

        count = 0
        for s in services:
            obj, created = Service.objects.update_or_create(
                name=s['name'],
                defaults={'description': s['description'], 'base_price': s['base_price']}
            )
            if created:
                count += 1
                self.stdout.write(self.style.SUCCESS(f"Created: {s['name']}"))
            else:
                self.stdout.write(self.style.WARNING(f"Updated: {s['name']}"))

        self.stdout.write(self.style.SUCCESS(f'Successfully loaded {count} new services!'))
