import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sahara_gold.settings")
django.setup()
from products.models import Category, Product
from rates.services import sync_live_rate_to_database
from decimal import Decimal

# Synchronize rates from the live provider only. Never overwrite production
# data with development/demo values during a deploy.
rate, market = sync_live_rate_to_database()
if rate:
    print(f"Live Gold Rate: 22K={rate.rate_22k}, 21K={rate.rate_21k}")
else:
    print(f"Live Gold Rate sync skipped: {market.get('message', 'provider unavailable')}")

# Categories
categories_data = ['rings', 'earrings', 'bangles', 'wristlets', 'necklace']
cat_objs = {}
for c in categories_data:
    obj, created = Category.objects.get_or_create(name=c.capitalize(), slug=c)
    cat_objs[c] = obj
    print(f"Category: {obj.name} {'(created)' if created else ''}")

# Clear previous demo products as requested
Product.objects.all().delete()
print("Cleared previous products.")

# 5 New Real Products from Uploaded Assets
products_data = [
    {
        "name": "Floral Cutout Gold Ring",
        "cat": "rings",
        "weight": 1.13,
        "purity": "22K",
        "img": "ring-floral-cutout.jpg",
        "making_charge": 500,
        "bestseller": True,
        "new": False,
        "description": "Handcrafted 22K gold ring with exquisite floral cutout openwork pattern (1.13 GM)."
    },
    {
        "name": "Classic Gold Hoop Earrings",
        "cat": "earrings",
        "weight": 0.99,
        "purity": "22K",
        "img": "earring-classic-hoops.jpg",
        "making_charge": 400,
        "bestseller": False,
        "new": True,
        "description": "Lightweight 22K gold hoop earrings with delicate beaded drop charms (0.99 GM)."
    },
    {
        "name": "Royal Rose Filigree Gold Ring",
        "cat": "rings",
        "weight": 2.50,
        "purity": "22K",
        "img": "ring-rose-filigree.jpg",
        "making_charge": 700,
        "bestseller": True,
        "new": True,
        "description": "Intricate blossoming rose ring in 22K pure gold featuring layered filigree mesh petals."
    },
    {
        "name": "Textured Gold Hoop Earrings",
        "cat": "earrings",
        "weight": 0.94,
        "purity": "22K",
        "img": "earring-textured-hoops.jpg",
        "making_charge": 400,
        "bestseller": False,
        "new": False,
        "description": "Classic circular 22K gold hoops with diagonal diamond-cut light reflection texture (0.94 GM)."
    },
    {
        "name": "Two-Stone Diamond Leaf Gold Ring",
        "cat": "rings",
        "weight": 1.80,
        "purity": "22K",
        "img": "ring-diamond-leaf.jpg",
        "making_charge": 600,
        "bestseller": True,
        "new": False,
        "description": "Contemporary 22K yellow gold bypass leaf ring crowned with two sparkling brilliant zircons."
    },
]

for p in products_data:
    obj = Product.objects.create(
        name=p['name'],
        category=cat_objs[p['cat']],
        weight=Decimal(str(p['weight'])),
        purity=p.get('purity', '22K'),
        making_charge_per_gram=p.get('making_charge', 500),
        description=p.get('description', ''),
        image=f"products/{p['img']}",
        is_bestseller=p.get('bestseller', False),
        is_new=p.get('new', False),
        in_stock=True
    )
    print(f"Product Created: {obj.name} ({obj.weight}g {obj.purity})")

print(f"\nTotal Products in DB: {Product.objects.count()}")
print(f"Total Categories in DB: {Category.objects.count()}")
