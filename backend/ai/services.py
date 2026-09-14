"""
AI Bot Service for Sahara Gold Storefront
Handles contextual gold calculations, catalog search, order tracking, and LLM completions.
"""
import os
import re
import logging
from django.conf import settings
from rates.models import GoldRate
from products.models import Product, Category
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
    return {
        '22K': 9850.0,
        '21K': 9400.0,
        '18K': 8050.0,
        'traditional': 6500.0,
        'date': 'Today'
    }

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
                f"• Status: {order.get_status_display()}\n"
                f"• Payment: {order.get_payment_method_display()} ({order.payment_status.upper()})\n"
                f"• Total: ৳{order.total_amount:,}\n"
                f"• Delivery City: {order.shipping_city}\n"
                f"For express dispatch inquiries, you can also ping our team on WhatsApp at 01799-281878."
            )
    return None

def build_system_prompt():
    rates = get_latest_rates_dict()
    catalog = build_catalog_context()
    
    return f"""You are 'Sahara Gold AI', the luxury shopping consultant for Sahara Gold (সাহারা গোল্ড) in Dhaka, Bangladesh (Bashundhara City Level 7, Block-A Shop-19).
Customer Service Hotline/WhatsApp: 01799-281878.

Today's Official Gold Rates per gram ({rates['date']}):
- 22K Hallmarked Gold: ৳{rates['22K']:,.0f} / gram
- 21K Hallmarked Gold: ৳{rates['21K']:,.0f} / gram
- 18K Hallmarked Gold: ৳{rates['18K']:,.0f} / gram
- Traditional Gold: ৳{rates['traditional']:,.0f} / gram

Featured In-Stock Products:
{catalog}

Guidelines:
1. Warm, respectful, luxurious tone. Speak fluent English or Bengali (বাঙালি) matching the customer's language.
2. If asked about prices or gold calculation, calculate accurately: (weight in grams × today's rate for that purity) + making charges (standard ৳500-৳1200/gm) + 5% VAT.
3. If asked about wedding/gift recommendations, recommend suitable karatage (22K traditional, 18K modern/daily wear) and products within their budget.
4. If customer mentions an order ID, provide helpful status details or guide them to use the Order Tracking page.
5. Keep answers concise, clear, and actionable. Include direct pricing numbers when asked.
"""

def generate_ai_response(history_messages, new_user_message):
    # 1. Quick check for direct order query
    order_info = check_order_tracking(new_user_message)
    if order_info:
        return order_info

    # 2. Try Hugging Face Inference Client if token exists
    hf_token = os.environ.get('HUGGINGFACE_API_KEY') or getattr(settings, 'HUGGINGFACE_API_KEY', None)
    
    if hf_token:
        try:
            from huggingface_hub import InferenceClient
            client = InferenceClient("Qwen/Qwen2.5-72B-Instruct", token=hf_token, timeout=15)
            
            system_prompt = build_system_prompt()
            messages = [{"role": "system", "content": system_prompt}]
            
            # Append last 6 history messages
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
                return reply
        except Exception as e:
            logger.warning(f"HuggingFace inference failed: {e}. Falling back to rule-based assistant.")

    # 3. Intelligent Fallback Engine with Live Rates & Catalog
    rates = get_latest_rates_dict()
    low_msg = new_user_message.lower()
    
    if any(w in low_msg for w in ['rate', 'price', 'দাম', 'কত', 'today', '22k', '21k', '18k']):
        return (
            f"✨ Today's Official Sahara Gold Rates (per gram):\n\n"
            f"• 22K Gold: ৳{rates['22K']:,.0f}/gm (Best for bridal & traditional jewelry)\n"
            f"• 21K Gold: ৳{rates['21K']:,.0f}/gm\n"
            f"• 18K Gold: ৳{rates['18K']:,.0f}/gm (Best for diamond settings & modern daily wear)\n"
            f"• Traditional Gold: ৳{rates['traditional']:,.0f}/gm\n\n"
            f"All our jewelry is 100% hallmark certified with lifetime buyback guarantee. Would you like a price calculation for a specific weight or design?"
        )
    
    if any(w in low_msg for w in ['wedding', 'bridal', 'বিয়ে', 'necklace', 'ring', 'bangle', 'gift', 'recommend']):
        return (
            f"💎 Sahara Gold Luxury Recommendations:\n\n"
            f"For weddings & bridal sets, we highly recommend our 22K Royal Heritage Collection, featuring intricate handcrafted chokers, necklaces, and matching bangles (weight ranges from 15g to 80g+).\n\n"
            f"For engagement & daily wear, our 18K/21K minimalist rings and lightweight pendants offer durable elegance.\n\n"
            f"What is your target budget or weight in grams? I will calculate the exact cost for you!"
        )

    if any(w in low_msg for w in ['track', 'order', 'অর্ডার', 'status', 'delivery']):
        return (
            f"📦 To track your Sahara Gold order, simply type your Order ID (e.g. SG-XXXXXX) right here, or visit our 'Track Order' page on the top navigation bar.\n\n"
            f"You can also contact our direct concierge at 01799-281878 (WhatsApp)."
        )

    return (
        f"Assalamu Alaikum! Welcome to Sahara Gold. I am your AI jewelry advisor.\n\n"
        f"Today's 22K gold rate is ৳{rates['22K']:,.0f}/gm. I can assist you with:\n"
        f"1. Live Gold Rate inquiries & custom weight price calculations\n"
        f"2. Bridal & Wedding jewelry recommendations\n"
        f"3. Instant Order tracking\n"
        f"4. Booking a showroom appointment at Bashundhara City, Level 7.\n\n"
        f"How may I assist you today?"
    )
