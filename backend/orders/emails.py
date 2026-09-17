from django.core.mail import send_mail, EmailMessage
from django.template.loader import render_to_string
from django.conf import settings
import threading
import os
import logging

logger = logging.getLogger(__name__)

def send_order_confirmation_email(order):
    """
    Sends order confirmation & invoice emails:
    - Customer receives Customer Copy Invoice PDF attachment & download link
    - Store Admin receives Store/Admin Copy Invoice notification
    Runs in a background thread to avoid blocking response.
    """
    def _send():
        backend_url = getattr(settings, 'BACKEND_URL', 'http://localhost:8000')
        from core.utils.invoice_access import make_invoice_access_token
        customer_token = make_invoice_access_token('order', order.order_id)
        customer_inv_url = f"{backend_url}/api/orders/{order.order_id}/invoice/?copy=customer&token={customer_token}"

        # Try to locate the generated invoice & PDF file
        pdf_full_path = None
        try:
            from core.models import Invoice
            from core.utils.pdf import generate_invoice_pdf
            invoice = Invoice.objects.filter(invoice_number=f"INV-{order.order_id}").first()
            if invoice:
                if not invoice.pdf_path:
                    invoice.pdf_path = generate_invoice_pdf(invoice)
                    invoice.save(update_fields=['pdf_path'])
                pdf_candidate = os.path.join(settings.MEDIA_ROOT, invoice.pdf_path)
                if os.path.exists(pdf_candidate):
                    pdf_full_path = pdf_candidate
        except Exception as e:
            logger.warning("Could not attach PDF to order email: %s", e)

        # 1. Customer Email (with attached PDF)
        if order.customer_email:
            cust_subject = f"Sahara Gold Invoice & Order Confirmation - #{order.order_id}"
            cust_message = (
                f"Dear {order.customer_name},\n\n"
                f"Thank you for choosing Sahara Gold (সাহারা গোল্ড).\n"
                f"Your order #{order.order_id} has been placed and confirmed successfully.\n\n"
                f"Order Summary:\n"
                f"• Order ID: #{order.order_id}\n"
                f"• Total Amount: ৳{order.total:,.0f} BDT\n"
                f"• Payment Method: {order.get_payment_method_display()} ({order.get_payment_status_display().upper()})\n"
                f"• Delivery Address: {order.shipping_address}, {order.city}\n\n"
                f"📄 An official certified PDF Invoice & Hallmark Certificate is attached to this email.\n"
                f"You can also view it online anytime at:\n{customer_inv_url}\n\n"
                f"Showroom: Bashundhara City Shopping Mall, Level 7, Block-A Shop-19, Dhaka.\n"
                f"Hotline / WhatsApp: 01799-281878\n\n"
                f"Regards,\nSahara Gold"
            )
            try:
                email = EmailMessage(
                    subject=cust_subject,
                    body=cust_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[order.customer_email],
                )
                if pdf_full_path:
                    email.attach_file(pdf_full_path)
                email.send(fail_silently=False)
                logger.info("Order confirmation email sent to %s with invoice PDF", order.customer_email)
            except Exception as e:
                logger.error("Customer email delivery error: %s", e)

        # 2. Store Admin Notification
        admin_email = getattr(settings, 'STORE_EMAIL', None)
        if admin_email:
            admin_subject = f"🔔 [Store Alert] New Order #{order.order_id} - ৳{order.total:,.0f} (Store Invoice Ready)"
            admin_message = (
                f"New order received on Sahara Gold Storefront:\n\n"
                f"• Order ID: #{order.order_id}\n"
                f"• Customer: {order.customer_name} ({order.customer_phone})\n"
                f"• Total: ৳{order.total:,.0f} BDT\n"
                f"• Payment: {order.get_payment_method_display()} ({order.get_payment_status_display().upper()})\n"
                f"• City: {order.city}\n\n"
                f"📋 The store copy is available in the authenticated admin command center.\n\n"
                f"Access Admin Orders Command Center: {backend_url}/admin/orders"
            )
            try:
                send_mail(
                    admin_subject,
                    admin_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [admin_email],
                    fail_silently=False,
                )
            except Exception as e:
                logger.error("Store notification email delivery error: %s", e)

    threading.Thread(target=_send).start()

