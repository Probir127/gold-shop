from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
import threading

def send_order_confirmation_email(order):
    """
    Sends order confirmation & invoice emails:
    - Customer receives Customer Copy Invoice link & receipt
    - Store Admin receives Store/Admin Copy Invoice notification
    Runs in a background thread to avoid blocking response.
    """
    def _send():
        backend_url = getattr(settings, 'BACKEND_URL', 'http://localhost:8000')
        customer_inv_url = f"{backend_url}/api/orders/{order.order_id}/invoice/?copy=customer"
        admin_inv_url = f"{backend_url}/api/orders/{order.order_id}/invoice/?copy=admin"

        # 1. Customer Email
        if order.customer_email:
            cust_subject = f"Sahara Gold Invoice & Order Confirmation - #{order.order_id}"
            cust_message = (
                f"Dear {order.customer_name},\n\n"
                f"Thank you for choosing Sahara Gold (সাহারা গোল্ড).\n"
                f"Your order #{order.order_id} has been confirmed successfully.\n\n"
                f"Order Summary:\n"
                f"• Total Amount: ৳{order.total:,.0f} BDT\n"
                f"• Payment Method: {order.get_payment_method_display()} ({order.get_payment_status_display().upper()})\n"
                f"• Delivery Address: {order.shipping_address}, {order.city}\n\n"
                f"📄 View & Download Your Official Customer Invoice & Hallmark Certificate:\n"
                f"{customer_inv_url}\n\n"
                f"Showroom: Bashundhara City Shopping Mall, Level 7, Block-A Shop-19, Dhaka.\n"
                f"Hotline / WhatsApp: 01799-281878"
            )
            try:
                send_mail(
                    cust_subject,
                    cust_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [order.customer_email],
                    fail_silently=True,
                )
            except Exception as e:
                print(f"Customer email error: {e}")

        # 2. Store Admin Notification
        admin_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None)
        if admin_email:
            admin_subject = f"🔔 [Store Alert] New Order #{order.order_id} - ৳{order.total:,.0f} (Store Invoice Ready)"
            admin_message = (
                f"New order received on Sahara Gold Storefront:\n\n"
                f"• Order ID: #{order.order_id}\n"
                f"• Customer: {order.customer_name} ({order.customer_phone})\n"
                f"• Total: ৳{order.total:,.0f} BDT\n"
                f"• Payment: {order.get_payment_method_display()} ({order.get_payment_status_display().upper()})\n"
                f"• City: {order.city}\n\n"
                f"📋 View & Print Store & Accounts Copy (Dispatch Slip):\n"
                f"{admin_inv_url}\n\n"
                f"Access Admin Orders Command Center: {backend_url}/admin/orders"
            )
            try:
                send_mail(
                    admin_subject,
                    admin_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [admin_email],
                    fail_silently=True,
                )
            except Exception as e:
                pass

    threading.Thread(target=_send).start()

