"""
Verification script for Milestone v5.0: Luxury Transactional Emails & Branded Invoice Pipeline
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sahara_gold.settings')

import django
django.setup()

from django.template.loader import render_to_string
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


def run_checks():
    print("=" * 60)
    print("Sahara Gold v5.0 Email Pipeline Verification")
    print("=" * 60)

    # 1. Verify Templates
    print("\n[1/3] Testing Template Rendering...")
    otp_html = render_to_string('emails/otp_verification.html', {
        'user_name': 'H.E. Customer',
        'verification_code': '994821'
    })
    assert '994821' in otp_html, "OTP code missing from rendered template"
    assert 'Sahara Gold' in otp_html, "Brand name missing from OTP template"
    print(f"  [OK] emails/otp_verification.html OK ({len(otp_html)} bytes)")

    order_html = render_to_string('emails/order_confirmation.html', {
        'customer_name': 'Sheikha Fatima',
        'order_id': 'SG-2026-TEST',
        'order_total': '145,000 BDT',
        'payment_method': 'Credit Card (SSLCommerz)',
        'payment_status': 'paid',
        'shipping_address': 'Gulshan-2, Dhaka',
        'invoice_url': 'https://saharagold.com/invoice/SG-2026-TEST',
        'items': [
            {'product_name': '22K Royal Emerald Choker', 'quantity': 1, 'price': '145,000 BDT'}
        ]
    })
    assert 'SG-2026-TEST' in order_html, "Order ID missing from order confirmation template"
    assert '22K Royal Emerald Choker' in order_html, "Items table missing from template"
    print(f"  [OK] emails/order_confirmation.html OK ({len(order_html)} bytes)")

    inv_html = render_to_string('emails/invoice_dispatch.html', {
        'client_name': 'Sheikha Fatima',
        'invoice_number': 'INV-2026-009',
        'invoice_total': 145000,
        'currency': 'BDT',
        'invoice_status': 'paid',
        'business_name': 'Sahara Gold & Diamond'
    })
    assert 'INV-2026-009' in inv_html, "Invoice number missing from invoice template"
    print(f"  [OK] emails/invoice_dispatch.html OK ({len(inv_html)} bytes)")

    # 2. Verify Diagnostic API
    print("\n[2/3] Testing Diagnostic Endpoints...")
    u = User.objects.filter(is_staff=True).first()
    assert u is not None, "No staff user found in database"
    token = str(RefreshToken.for_user(u).access_token)

    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    res_health = client.get('/api/system/health/', HTTP_HOST='localhost')
    assert res_health.status_code == 200, f"Health check failed: {res_health.status_code}"
    health_data = res_health.data
    assert health_data.get('overall') == 'healthy', f"Overall health not healthy: {health_data.get('overall')}"
    assert health_data.get('database', {}).get('ok') is True, "Database health not ok"
    assert health_data.get('smtp', {}).get('ok') is True, "SMTP connection not ok"
    print(f"  [OK] GET /api/system/health/ -> 200 OK (DB: {health_data['database']['engine']}, SMTP: {health_data['smtp']['host']}:{health_data['smtp']['port']})")

    res_smtp = client.post('/api/smtp/test/', {'email': 'test@example.com'}, format='json', HTTP_HOST='localhost')
    assert res_smtp.status_code == 200, f"SMTP test failed: {res_smtp.status_code} {res_smtp.data}"
    assert res_smtp.data.get('status') == 'ok', "SMTP test returned non-ok status"
    assert res_smtp.data.get('success') is True, "SMTP test missing success boolean"
    print(f"  [OK] POST /api/smtp/test/ -> 200 OK ({res_smtp.data['message']})")

    # 3. Verify Code Signatures
    print("\n[3/3] Verifying Caller Integrations...")
    from orders.customer_auth import send_verification_code
    from orders.emails import send_order_confirmation_email
    from core.views.invoice_views import SendInvoiceView
    print("  [OK] customer_auth, orders.emails, and invoice_views all load cleanly.")

    print("\n" + "=" * 60)
    print("ALL VERIFICATION CHECKS PASSED SUCCESSFULLY (3/3)")
    print("=" * 60)


if __name__ == '__main__':
    run_checks()
