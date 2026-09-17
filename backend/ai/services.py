"""
AI Bot Service for Sahara Gold Storefront
Handles contextual gold calculations, catalog search, order tracking, and LLM completions.
"""
import os
import re
import logging
from django.conf import settings
from rates.models import GoldRate
from products.models import Product
from orders.models import Order

logger = logging.getLogger(__name__)

def get_latest_rates_dict():
    latest_rate = GoldRate.objects.order_by('-date', '-updated_at').first()
    if latest_rate:
        return {
            '22K': float(latest_rate.rate_22k),
            '21K': float(latest_rate.rate_21k),
            '18K': float(latest_rate.rate_18k),
            'traditional': float(latest_rate.rate_traditional),
            'date': str(latest_rate.date)
        }
    return {'22K': None, '21K': None, '18K': None, 'traditional': None, 'date': None}

def display_rate(value):
    return f"{value:,.0f}" if value is not None else 'currently unavailable'

def build_catalog_context():
    products = Product.objects.filter(in_stock=True).select_related('category')[:15]
    lines = []
    for p in products:
        cat = p.category.name if p.category else 'General'
        lines.append(f"- {p.name} ({p.purity}, {p.weight}g, Category: {cat})")
    return "\n".join(lines)

def check_order_tracking(message):
    order_id_match = re.search(r'\b(SG-[A-Za-z0-9]+|ORD-[A-Za-z0-9]+|\d{4,8})\b', message, re.IGNORECASE)
    if order_id_match:
        query_id = order_id_match.group(1).upper()
        order = Order.objects.filter(order_id__iexact=query_id).first()
        if order:
            return (
                f"📦 Order Status for #{order.order_id}:\n"
                f"• Status: {order.get_order_status_display()}\n"
                f"• Payment: {order.get_payment_method_display()} ({order.payment_status.upper()})\n"
                f"• Total: ৳{order.total:,.2f}\n"
                f"• Delivery City: {order.city}\n"
                f"For express dispatch inquiries, you can also ping our team on WhatsApp at {settings.STORE_PHONE}."
            )
    return None

def build_system_prompt():
    rates = get_latest_rates_dict()
    catalog = build_catalog_context()
    
    return f"""You are the AI shopping consultant for {settings.STORE_NAME}.
Store location: {settings.STORE_ADDRESS}.
Customer Service Hotline/WhatsApp: {settings.STORE_PHONE}.

Today's Official Gold Rates per gram ({rates['date']}):
- 22K Hallmarked Gold: ৳{display_rate(rates['22K'])} / gram
- 21K Hallmarked Gold: ৳{display_rate(rates['21K'])} / gram
- 18K Hallmarked Gold: ৳{display_rate(rates['18K'])} / gram
- Traditional Gold: ৳{display_rate(rates['traditional'])} / gram

Featured In-Stock Products:
{catalog}

Guidelines:
1. Warm, respectful, luxurious tone. Speak fluent English or Bengali (বাঙালি) matching the customer's language.
2. If asked about prices or gold calculation, calculate accurately: (weight in grams × today's rate for that purity) + making charges (standard ৳500-৳1200/gm) + 5% VAT.
3. If asked about wedding/gift recommendations, recommend suitable karatage (22K traditional, 18K modern/daily wear) and products within their budget.
4. If customer mentions an order ID, provide helpful status details or guide them to use the Order Tracking page.
5. Keep answers concise, clear, and actionable. Include direct pricing numbers when asked.
"""

from products.serializers import ProductSerializer

def find_relevant_products(message, max_items=4):
    """
    Intelligently query products matching budget or keywords in message.
    """
    low = message.lower()
    budget_match = re.search(r'(?:under|below|around|within|less than|max|budget)?\s*(?:৳|tk|bdt)?\s*([0-9]{2,7})(?:\s*k)?', low)
    budget = None
    if budget_match:
        val_str = budget_match.group(1)
        try:
            val = float(val_str)
            if 'k' in message[budget_match.start():budget_match.end()+2].lower() or val < 1000:
                val = val * 1000
            budget = val
        except ValueError:
            pass

    shopping_intent = any(keyword in low for keyword in [
        'shop', 'buy', 'recommend', 'suggest', 'ring', 'necklace', 'chain',
        'bangle', 'earring', 'pendant', 'bracelet', 'bridal', 'wedding', 'gift'
    ])
    purity_intent = any(purity in low for purity in ['22k', '21k', '18k'])
    if not budget_match and not shopping_intent and not purity_intent:
        return []

    qs = Product.objects.filter(in_stock=True).select_related('category')
    
    category_map = {
        'ring': 'rings',
        'necklace': 'necklaces',
        'chain': 'chains',
        'bangle': 'bangles',
        'earring': 'earrings',
        'pendant': 'pendants',
        'bracelet': 'bracelets',
        'bridal': 'necklaces'
    }
    for kw, cat_slug in category_map.items():
        if kw in low:
            filtered_qs = qs.filter(category__slug__icontains=cat_slug)
            if filtered_qs.exists():
                qs = filtered_qs
            break

    # Purity filter
    if '22k' in low:
        qs = qs.filter(purity='22K')
    elif '21k' in low:
        qs = qs.filter(purity='21K')
    elif '18k' in low:
        qs = qs.filter(purity='18K')

    serialized = ProductSerializer(qs[:20], many=True).data
    results = []
    
    for item in serialized:
        price = item.get('current_price', 0)
        if budget:
            if price <= budget * 1.15:
                results.append(item)
        else:
            results.append(item)
            
    if budget and results:
        # Sort by closest to budget
        results.sort(key=lambda x: abs(x.get('current_price', 0) - budget))
    
    return results[:max_items]

def generate_ai_response(history_messages, new_user_message):
    matched_products = find_relevant_products(new_user_message)
    low_msg = new_user_message.lower()

    # 1. Quick check for direct order query
    order_info = check_order_tracking(new_user_message)
    if order_info:
        return order_info, []

    # 2. Try Hugging Face Inference Client if token exists
    hf_token = os.environ.get('HUGGINGFACE_API_KEY') or getattr(settings, 'HUGGINGFACE_API_KEY', None)
    
    if hf_token:
        try:
            from huggingface_hub import InferenceClient
            client = InferenceClient(settings.AI_MODEL, token=hf_token, timeout=25)
            
            system_prompt = build_system_prompt()
            messages = [{"role": "system", "content": system_prompt}]
            
            for msg in history_messages[-6:]:
                messages.append({"role": msg.role, "content": msg.content})
                
            messages.append({"role": "user", "content": new_user_message})
            
            response = client.chat_completion(
                messages=messages,
                max_tokens=350,
                temperature=0.7
            )
            reply = response.choices[0].message.content.strip()
            if reply:
                return reply, matched_products
        except Exception as e:
            logger.exception("HuggingFace inference failed; falling back to rule-based assistant: %s", e)

    # 3. Intelligent Fallback Engine with Live Rates & Catalog
    rates = get_latest_rates_dict()
    # Check if budget/product recommendation query
    if matched_products:
        count = len(matched_products)
        reply = (
            f"I matched {count} in-stock pieces from the current Sahara Gold catalog. "
            f"Their live prices are shown below; open any item for its details or add it directly to your bag."
        )
        return reply, matched_products

    if any(w in low_msg for w in ['rate', 'price', 'দাম', 'কত', 'today', '22k', '21k', '18k']):
        return (
            f"✨ Today's Official Sahara Gold Rates (per gram):\n\n"
            f"• 22K Gold: ৳{display_rate(rates['22K'])}/gm (Best for bridal & traditional jewelry)\n"
            f"• 21K Gold: ৳{display_rate(rates['21K'])}/gm\n"
            f"• 18K Gold: ৳{display_rate(rates['18K'])}/gm (Best for diamond settings & modern daily wear)\n"
            f"• Traditional Gold: ৳{display_rate(rates['traditional'])}/gm\n\n"
            f"All our jewelry is 100% hallmark certified with lifetime buyback guarantee. Would you like a price calculation for a specific weight or design?",
            []
        )
    
    if any(w in low_msg for w in ['wedding', 'bridal', 'বিয়ে', 'necklace', 'ring', 'bangle', 'gift', 'recommend']):
        # If no specific matched products were found, fallback to general bestsellers
        featured = ProductSerializer(Product.objects.filter(in_stock=True)[:3], many=True).data
        return (
            "💎 Sahara Gold Luxury Recommendations:\n\n"
            "For weddings & bridal sets, we highly recommend our 22K Royal Heritage Collection, featuring handcrafted necklaces, chokers, and bangles.\n\n"
            "Here are some popular signature items from our collection:",
            featured
        )

    if any(w in low_msg for w in ['track', 'order', 'অর্ডার', 'status', 'delivery']):
        return (
            f"📦 To track your Sahara Gold order, simply type your Order ID (e.g. SG-XXXXXX) right here, or visit our 'Track Order' page on the top navigation bar.\n\n"
            f"You can also contact our direct concierge at {settings.STORE_PHONE} (WhatsApp).",
            []
        )

    return (
        f"Assalamu Alaikum! Welcome to Sahara Gold. I am your AI jewelry advisor.\n\n"
        f"Today's 22K gold rate is ৳{display_rate(rates['22K'])}/gm. What kind of jewelry or budget are you looking for today?",
        []
    )
