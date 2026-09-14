import os
import sys
import random
from datetime import timedelta
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sahara_gold.settings')
django.setup()

from django.utils import timezone
from core.models import Tenant, Client, Invoice, BotAnalytics, Conversation

def seed():
    tenant = Tenant.objects.first()
    if not tenant:
        print("No tenant found! Please create a tenant first.")
        return

    print(f"Seeding AI Analytics for tenant: {tenant.name} ({tenant.slug})")

    # 1. Update some invoices to 'paid' so revenue shows up
    invoices = Invoice.objects.filter(tenant=tenant)
    paid_count = 0
    for idx, inv in enumerate(invoices):
        if idx % 2 == 0:
            inv.status = 'paid'
            inv.save()
            paid_count += 1
    print(f"Updated {paid_count} invoices to 'paid'.")

    # 2. Seed Realistic Clients
    client_configs = [
        {"name": "Nusrat Jahan", "phone": "+8801712000001", "channel": "whatsapp", "status": "active"},
        {"name": "Tanvir Ahmed", "phone": "+8801819000002", "channel": "web", "status": "invoiced"},
        {"name": "Sabrina Khan", "phone": "+8801911000003", "channel": "instagram", "status": "completed"},
        {"name": "Amina Begum", "phone": "+8801612000004", "channel": "whatsapp", "status": "active"},
        {"name": "Farhan Chowdhury", "phone": "+8801715000005", "channel": "messenger", "status": "lead"},
        {"name": "Rashida Parveen", "phone": "+8801814000006", "channel": "whatsapp", "status": "completed"},
        {"name": "Mahmudul Hasan", "phone": "+8801918000007", "channel": "telegram", "status": "invoiced"},
        {"name": "Sadia Islam", "phone": "+8801511000008", "channel": "web", "status": "active"},
        {"name": "Imtiaz Karim", "phone": "+8801719000009", "channel": "whatsapp", "status": "lead"},
        {"name": "Shirin Akter", "phone": "+8801822000010", "channel": "instagram", "status": "active"},
    ]

    clients = []
    for c_data in client_configs:
        c, created = Client.objects.get_or_create(
            tenant=tenant,
            phone=c_data["phone"],
            defaults={
                "name": c_data["name"],
                "status": c_data["status"],
                "bot_enabled": True
            }
        )
        if not created:
            c.name = c_data["name"]
            c.status = c_data["status"]
            c.save()
        clients.append(c)

    # 3. Seed Realistic Bot Interactions over last 30 days
    sample_dialogues = [
        {
            "intent": "gold_rate",
            "sentiment": "neutral",
            "user": "What is today's 22K gold rate per bhori?",
            "reply": "Today's 22K gold rate is ৳124,500 per bhori (11.664g). Rates are updated live based on BAJUS standards. Would you like to view our hallmarked collections?",
            "fallback": False, "escalated": False, "channel": "whatsapp"
        },
        {
            "intent": "gold_rate",
            "sentiment": "positive",
            "user": "Assalamu Alaikum, can you share the 21K and 18K gold rate today?",
            "reply": "Wa Alaikum Assalam! Today 21K is ৳118,900/bhori and 18K is ৳101,900/bhori. Let us know if you need bridal sets or custom ring estimations!",
            "fallback": False, "escalated": False, "channel": "web"
        },
        {
            "intent": "catalog_inquiry",
            "sentiment": "positive",
            "user": "I am looking for a light-weight bridal necklace set under 3 bhori.",
            "reply": "We have breathtaking 22K light bridal sets starting from 2.2 bhori with certified hallmarking! Browse our collection at saharagold.com/catalog or visit our showroom.",
            "fallback": False, "escalated": False, "channel": "whatsapp"
        },
        {
            "intent": "catalog_inquiry",
            "sentiment": "positive",
            "user": "Do you have solitaires or diamond engagement rings in stock?",
            "reply": "Yes! We offer GIA and IGI certified natural and lab diamond rings in 18K white and yellow gold. Would you like us to send photos or schedule an appointment?",
            "fallback": False, "escalated": False, "channel": "instagram"
        },
        {
            "intent": "custom_design",
            "sentiment": "positive",
            "user": "Can I send a custom jewelry design picture to get an estimate?",
            "reply": "Absolutely! Please send your reference photo and desired gold purity (18K/21K/22K). Our master artisans will provide 3D CAD modeling and instant pricing.",
            "fallback": False, "escalated": False, "channel": "whatsapp"
        },
        {
            "intent": "pricing",
            "sentiment": "neutral",
            "user": "What is your making charge percentage for gold bangles?",
            "reply": "Our making charge is transparent: starts at only 6% for machine-cut bangles and 8-12% for intricate handcrafted filigree work. No hidden fees!",
            "fallback": False, "escalated": False, "channel": "messenger"
        },
        {
            "intent": "order_status",
            "sentiment": "neutral",
            "user": "Please check the status of my order INV-ORD-96BC42.",
            "reply": "Your order INV-ORD-96BC42 is currently in hallmark certification and will be ready for showroom pickup / insured courier delivery tomorrow by 3 PM.",
            "fallback": False, "escalated": False, "channel": "whatsapp"
        },
        {
            "intent": "appointment",
            "sentiment": "positive",
            "user": "I want to book an appointment this Friday at 5 PM for bridal shopping.",
            "reply": "Appointment requested for Friday 5:00 PM! Our senior jewelry consultant will welcome you with a private viewing lounge. See you at Sahara Gold!",
            "fallback": False, "escalated": False, "channel": "web"
        },
        {
            "intent": "payment_emi",
            "sentiment": "neutral",
            "user": "Do you accept credit card EMI for diamond purchases?",
            "reply": "Yes! We support 0% interest EMI up to 12 months with 18 major partner banks (City Bank, BRAC, SCB, EBL, etc.) on purchases over ৳50,000.",
            "fallback": False, "escalated": False, "channel": "telegram"
        },
        {
            "intent": "complaint",
            "sentiment": "negative",
            "user": "My package was promised yesterday and haven't received tracking yet. Connect me to an agent now.",
            "reply": "I truly apologize for this delay. I am escalating your conversation to our customer support manager immediately. Someone will contact you in under 5 minutes.",
            "fallback": False, "escalated": True, "channel": "whatsapp"
        },
        {
            "intent": "general",
            "sentiment": "neutral",
            "user": "Where is your showroom located and what are the opening hours?",
            "reply": "Our flagship showroom is located at Level 3, Sahara Gold Tower, Dhanmondi 27, Dhaka. Open 10:30 AM to 8:30 PM, Saturday to Thursday.",
            "fallback": False, "escalated": False, "channel": "web"
        },
        {
            "intent": "fallback",
            "sentiment": "neutral",
            "user": "aslkdjf 9832479234 ??",
            "reply": "Thanks for your message! 😊 Sahara Gold & Diamond will get back to you shortly. Feel free to explore our collection at saharagold.com",
            "fallback": True, "escalated": False, "channel": "messenger"
        },
    ]

    now = timezone.now()
    BotAnalytics.objects.filter(tenant=tenant).delete()

    records_to_create = []
    for i in range(160):
        days_ago = int(random.triangular(0, 30, 4))
        hour = random.choices(
            list(range(24)),
            weights=[1, 1, 1, 1, 1, 1, 2, 4, 8, 12, 16, 18, 20, 18, 17, 19, 22, 25, 24, 20, 15, 10, 5, 2]
        )[0]
        minute = random.randint(0, 59)
        second = random.randint(0, 59)
        
        created_dt = now - timedelta(days=days_ago)
        created_dt = created_dt.replace(hour=hour, minute=minute, second=second)

        dialogue = random.choice(sample_dialogues)
        client = random.choice(clients)
        
        if dialogue["fallback"]:
            rt = random.randint(80, 250)
        elif dialogue["escalated"]:
            rt = random.randint(300, 700)
        else:
            rt = random.randint(180, 1400)

        record = BotAnalytics(
            tenant=tenant,
            client=client,
            channel=dialogue["channel"],
            user_message=dialogue["user"],
            bot_reply=dialogue["reply"],
            intent=dialogue["intent"],
            sentiment=dialogue["sentiment"],
            response_time_ms=rt,
            was_fallback=dialogue["fallback"],
            was_escalated=dialogue["escalated"],
            is_resolved=not dialogue["escalated"],
        )
        records_to_create.append((record, created_dt))

    bot_records = [r[0] for r in records_to_create]
    BotAnalytics.objects.bulk_create(bot_records)

    all_saved = list(BotAnalytics.objects.filter(tenant=tenant).order_by('id'))
    for idx, obj in enumerate(all_saved):
        target_dt = records_to_create[idx][1]
        BotAnalytics.objects.filter(id=obj.id).update(created_at=target_dt)

    total_count = BotAnalytics.objects.filter(tenant=tenant).count()
    print(f"Successfully populated {total_count} AI Analytics records for {tenant.name}!")

if __name__ == '__main__':
    seed()
