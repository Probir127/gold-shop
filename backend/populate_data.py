import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sahara_gold.settings")
django.setup()
from products.models import Category, Product
from rates.models import GoldRate
from decimal import Decimal
from django.utils import timezone

# Create/Update Gold Rate
rate, _ = GoldRate.objects.update_or_create(
    date=timezone.now().date(),
    defaults={
        'rate_22k': 9850, 
        'rate_21k': 9400, 
        'rate_18k': 8050, 
        'rate_traditional': 6500
    }
)
print(f"Gold Rate: 22K={rate.rate_22k}, 21K={rate.rate_21k}")

# Categories
categories_data = ['rings', 'earrings', 'bangles', 'wristlets', 'necklace']
cat_objs = {}
for c in categories_data:
    obj, created = Category.objects.get_or_create(name=c.capitalize(), slug=c)
    cat_objs[c] = obj
    print(f"Category: {obj.name} {'(created)' if created else ''}")

# All products from static data
products_data = [
    {"name": "Royal Gold Ring", "cat": "rings", "weight": 2.5, "purity": "22K", "img": "1.jpg.jpeg", "bestseller": True},
    {"name": "Diamond Cut Ring", "cat": "rings", "weight": 3.1, "purity": "22K", "img": "10.jpg.jpeg", "new": True},
    {"name": "Premium Wristlet", "cat": "wristlets", "weight": 5.2, "purity": "21K", "img": "WRISTLET.jpg.jpeg", "bestseller": True},
    {"name": "Luxury Gold Earrings", "cat": "earrings", "weight": 4.8, "purity": "22K", "img": "5.jpg.jpeg", "bestseller": True},
    {"name": "Floral Gold Ring", "cat": "rings", "weight": 1.8, "purity": "22K", "img": "15.jpg.jpeg"},
    {"name": "Heavy Gold Bangle", "cat": "bangles", "weight": 10.5, "purity": "22K", "img": "16.jpg.jpeg"},
    {"name": "Elegant Wristlet", "cat": "wristlets", "weight": 4.2, "purity": "21K", "img": "WRISTLET 2.jpg.jpeg"},
    {"name": "Traditional Earrings", "cat": "earrings", "weight": 6.5, "purity": "22K", "img": "12.jpg.jpeg"},
    {"name": "Engagement Ring", "cat": "rings", "weight": 3.8, "purity": "22K", "img": "11.jpg.jpeg"},
    {"name": "Designer Bangle", "cat": "bangles", "weight": 8.9, "purity": "22K", "img": "17.jpg.jpeg"},
]

for p in products_data:
    obj, created = Product.objects.update_or_create(
        name=p['name'],
        defaults={
            'category': cat_objs[p['cat']],
            'weight': Decimal(str(p['weight'])),
            'purity': p.get('purity', '22K'),
            'making_charge_per_gram': 500,
            'image': f"products/{p['img']}",
            'is_bestseller': p.get('bestseller', False),
            'is_new': p.get('new', False),
            'in_stock': True
        }
    )
    print(f"Product: {obj.name} ({'created' if created else 'updated'})")

print(f"\nTotal Products in DB: {Product.objects.count()}")
print(f"Total Categories in DB: {Category.objects.count()}")
