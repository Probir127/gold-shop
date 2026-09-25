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

# Seed products across all categories idempotently (never delete existing catalog)
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
    {
        "name": "Traditional Handcrafted Gold Bala",
        "cat": "bangles",
        "weight": 12.50,
        "purity": "22K",
        "img": "1.jpg.jpeg",
        "making_charge": 600,
        "bestseller": True,
        "new": False,
        "description": "Exquisite 22K gold handcrafted bala bangles with intricate engraving and royal finish (12.50 GM)."
    },
    {
        "name": "Royal Filigree Bridal Kada",
        "cat": "bangles",
        "weight": 15.20,
        "purity": "22K",
        "img": "2.jpg.jpeg",
        "making_charge": 650,
        "bestseller": False,
        "new": True,
        "description": "Heavy bridal 22K gold kada featuring traditional filigree craftsmanship (15.20 GM)."
    },
    {
        "name": "Delicate Bead Drop Gold Wristlet",
        "cat": "wristlets",
        "weight": 4.80,
        "purity": "22K",
        "img": "WRISTLET.jpg.jpeg",
        "making_charge": 500,
        "bestseller": True,
        "new": True,
        "description": "Modern minimalist 22K gold wristlet bracelet with delicate polished beads (4.80 GM)."
    },
    {
        "name": "Polished Modern Link Wristlet",
        "cat": "wristlets",
        "weight": 6.10,
        "purity": "22K",
        "img": "WRISTLET 2.jpg.jpeg",
        "making_charge": 500,
        "bestseller": False,
        "new": False,
        "description": "Sleek interlocking link wristlet in 22K yellow gold with secure clasp (6.10 GM)."
    },
    {
        "name": "Royal Heritage Bridal Choker Set",
        "cat": "necklace",
        "weight": 28.50,
        "purity": "22K",
        "img": "3.jpg.jpeg",
        "making_charge": 800,
        "bestseller": True,
        "new": True,
        "description": "Magnificent 22K bridal gold choker necklace crafted with traditional craftsmanship (28.50 GM)."
    },
    {
        "name": "Floral Diamond-Cut Gold Necklace",
        "cat": "necklace",
        "weight": 22.00,
        "purity": "22K",
        "img": "4.jpg.jpeg",
        "making_charge": 750,
        "bestseller": False,
        "new": False,
        "description": "Opulent 22K gold necklace with gleaming diamond-cut floral motifs (22.00 GM)."
    },
]

for p in products_data:
    obj, created = Product.objects.get_or_create(
        name=p['name'],
        defaults={
            'category': cat_objs[p['cat']],
            'weight': Decimal(str(p['weight'])),
            'purity': p.get('purity', '22K'),
            'making_charge_per_gram': p.get('making_charge', 500),
            'description': p.get('description', ''),
            'image': f"products/{p['img']}",
            'is_bestseller': p.get('bestseller', False),
            'is_new': p.get('new', False),
            'in_stock': True
        }
    )
    if created:
        print(f"Product Created: {obj.name} ({obj.weight}g {obj.purity})")
    else:
        print(f"Product Exists: {obj.name}")

print(f"\nTotal Products in DB: {Product.objects.count()}")
print(f"Total Categories in DB: {Category.objects.count()}")
