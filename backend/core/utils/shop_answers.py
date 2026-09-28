"""Live store facts for chat, independent of AI-provider availability."""
import re
from django.db.models import Q
from products.models import Product
from products.serializers import ProductSerializer
from rates.pricing import effective_rate
from rates.serializers import GoldRateSerializer

DIGITS = str.maketrans('০১২৩৪৫৬৭৮৯', '0123456789')
PRODUCT_WORDS = r'\b(shop|buy|recommend|suggest|ring|rings|necklace|necklaces|chain|chains|bangle|bangles|earring|earrings|pendant|bracelet|bridal|wedding|gift|product|products|jewelry|jewellery)\b|আংটি|নেকলেস|(?<!\S)হার(?!\S)|চেইন|বালা|কানের|গয়না|গয়না|উপহার'
RATE_WORDS = r'\brates?\b|\bgold prices?\b|\bprice of gold\b|রেট|সোনার দাম|সোনার মূল্য|সোনার দর|সোনার বর্তমান|sonar dam|gold er dam|gold price'


def budget_from_message(message):
    # Require an explicit budget/currency marker; 22K and 18K are purities, not budgets.
    text = message.lower().translate(DIGITS)
    match = re.search(r'(?:under|below|within|budget(?: of)?|less than|max|৳|bdt|tk|বাজেট)\s*[:=]?\s*(?:৳|bdt|tk)?\s*([\d,]+(?:\.\d+)?)\s*(k|thousand|হাজার)?', text)
    if not match:
        match = re.search(r'([\d,]+(?:\.\d+)?)\s*(হাজার)?\s*টাকার?\s*(?:মধ্যে|নিচে)', text)
    if not match:
        return None
    value = float(match.group(1).replace(',', ''))
    if match.group(2):
        value *= 1000
    return value if value > 0 else None


def answer_shop_question(message, tenant, request=None):
    if not tenant or tenant.slug != 'sahara-gold':
        return None
    text = message.lower().translate(DIGITS)
    bengali = bool(re.search('[\u0980-\u09ff]', message))
    if re.search(r'\b(track|tracking|order status)\b|অর্ডার.*(?:অবস্থা|ট্র্যাক)', text):
        return {'reply': 'Open the Track Order page (/track-order) and enter your order ID and the phone number used at checkout. Those details are required to view the order securely.', 'products': [], 'rates': None}
    shopping = bool(re.search(PRODUCT_WORDS, text))
    rate_query = bool(re.search(RATE_WORDS, text)) or bool(re.search(r'(?:22|21|18)\s*k.*(?:price|দাম|কত)', text))
    if not shopping and not rate_query:
        return None
    rate, _ = effective_rate()
    rates = GoldRateSerializer(rate).data if rate else None
    if not rate:
        return {'reply': 'Published gold prices are temporarily unavailable. Please contact the shop for a confirmed quote.', 'products': [], 'rates': None}
    mode = 'Manual' if rate.pricing_mode == 'manual' else 'Automatic'
    note = ' Last saved rates; the live feed is temporarily unavailable.' if rate.is_stale else ''
    if rate_query and not shopping:
        if bengali:
            reply = (f"বর্তমানে প্রকাশিত সোনার দাম (প্রতি গ্রাম):\n২২ ক্যারেট: ৳{rate.rate_22k:,}\n২১ ক্যারেট: ৳{rate.rate_21k:,}\n১৮ ক্যারেট: ৳{rate.rate_18k:,}\nসনাতন: ৳{rate.rate_traditional:,}\n"
                     f"মোড: {'ম্যানুয়াল' if rate.pricing_mode == 'manual' else 'অটোমেটিক'}। মজুরি আলাদা।")
            if rate.is_stale:
                reply += '\nলাইভ ফিড এখন পাওয়া যাচ্ছে না; সর্বশেষ প্রকাশিত দাম দেখানো হচ্ছে।'
        else:
            reply = (f"Current published gold rates (BDT per gram):\n22K: ৳{rate.rate_22k:,}\n21K: ৳{rate.rate_21k:,}\n18K: ৳{rate.rate_18k:,}\nTraditional: ৳{rate.rate_traditional:,}\n"
                     f"{mode} pricing. Making charges are additional.{note}")
        return {'reply': reply, 'products': [], 'rates': rates}

    queryset = Product.objects.filter(Q(tenant=tenant) | Q(tenant__isnull=True), in_stock=True).select_related('category').prefetch_related('gallery_images')
    categories = [('earring', 'earring'), ('necklace', 'necklace'), ('ring', 'ring'), ('chain', 'chain'), ('bangle', 'bangle'), ('pendant', 'pendant'), ('bracelet', 'bracelet'), ('আংটি', 'ring'), ('চেইন', 'chain'), ('বালা', 'bangle'), ('কানের', 'earring')]
    for word, category in categories:
        if re.search(r'\b' + word + r's?\b', text) or (not word.isascii() and word in text):
            queryset = queryset.filter(Q(category__slug__icontains=category) | Q(category__name__icontains=category) | Q(name__icontains=category))
            break
    purity = re.search(r'\b(22|21|18)\s*k\b', text)
    if purity:
        queryset = queryset.filter(purity=purity.group(1) + 'K')
    # A specific product name should not be replaced with unrelated suggestions.
    named = [product for product in queryset if product.name.lower() in text]
    candidates = named if named else queryset
    budget = budget_from_message(message)
    products = []
    for product in candidates:
        price = ProductSerializer(context={'gold_rate': rate}).get_current_price(product)
        if price is not None and (budget is None or price <= budget):
            products.append((price, product))
    products.sort(key=lambda item: item[0], reverse=budget is not None)
    result = ProductSerializer([p for _, p in products[:4]], many=True, context={'gold_rate': rate, 'request': request}).data
    if not result:
        reply = 'No in-stock products match that request' + (f' within ৳{budget:,.0f}' if budget else '') + '. Try another category or budget.'
    else:
        reply = 'Matching in-stock items at current published prices:\n' + '\n'.join(f"• {p['name']} — ৳{p['current_price']:,} ({p['purity']}, {p['weight']}g)" for p in result)
        reply += '\nPrices include the saved making charge.' + note
    return {'reply': reply, 'products': result, 'rates': rates}
