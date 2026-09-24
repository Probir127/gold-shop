from __future__ import annotations
import threading
import os
import logging
from django.conf import settings
from django.db import connection
from core.utils.mailer import send_email_resilient

logger = logging.getLogger(__name__)


def send_order_invoice_now(order, recipient_email: str | None = None) -> tuple[bool, str]:
    """
    Synchronously generates and sends order confirmation with invoice PDF attachment.
    Can be called by admin or background workers. Returns (bool, message).
    """
    backend_url = getattr(settings, 'BACKEND_URL', 'http://localhost:8000')
    from core.utils.invoice_access import make_invoice_access_token
    customer_token = make_invoice_access_token('order', order.order_id)
    customer_inv_url = f"{backend_url}/api/orders/{order.order_id}/invoice/?copy=customer&token={customer_token}"

    target_email = recipient_email or order.customer_email
    if not target_email and order.customer_phone:
        try:
            from django.contrib.auth.models import User
            from core.models import Client
            usr = User.objects.filter(username=order.customer_phone).first()
            if usr and usr.email:
                target_email = usr.email
            if not target_email:
                cl = Client.objects.filter(phone=order.customer_phone).exclude(email='').first()
                if cl and cl.email:
                    target_email = cl.email
            if target_email:
                order.customer_email = target_email
                order.save(update_fields=['customer_email'])
        except Exception as e:
            logger.debug("Could not resolve email from phone: %s", e)

    if not target_email:
        return False, "No recipient email address provided."

    # Locate or generate PDF
    pdf_full_path = None
    invoice = None
    try:
        from core.models import Invoice, Tenant, Client
        from core.utils.pdf import generate_invoice_pdf

        invoice = Invoice.objects.filter(invoice_number=f"INV-{order.order_id}").first()
        if not invoice:
            tenant = Tenant.objects.filter(slug=getattr(settings, 'DEFAULT_TENANT_SLUG', 'sahara-gold'), is_active=True).first()
            if not tenant:
                tenant = Tenant.objects.filter(is_active=True).first()
            if tenant:
                client, _ = Client.objects.get_or_create(
                    tenant=tenant,
                    phone=order.customer_phone,
                    defaults={'name': order.customer_name, 'email': target_email, 'status': 'invoiced'}
                )
                invoice_items = []
                for it in order.items.all():
                    invoice_items.append({
                        'name': it.product_name,
                        'product_name': it.product_name,
                        'weight': float(it.weight),
                        'price': float(it.price_at_purchase),
                        'quantity': it.quantity,
                    })
                invoice = Invoice.objects.create(
                    invoice_number=f"INV-{order.order_id}",
                    tenant=tenant,
                    client=client,
                    items=invoice_items,
                    subtotal=order.subtotal,
                    tax_percent=0,
                    total_amount=order.total,
                    currency='BDT',
                    status='paid' if order.payment_status == 'paid' else 'draft',
                    notes=f"Order {order.order_id} | Delivery to: {order.shipping_address}, {order.city}"
                )

        if invoice:
            if not invoice.pdf_path or not os.path.exists(os.path.join(settings.MEDIA_ROOT, invoice.pdf_path)):
                invoice.pdf_path = generate_invoice_pdf(invoice)
                invoice.save(update_fields=['pdf_path'])
            pdf_candidate = os.path.join(settings.MEDIA_ROOT, invoice.pdf_path)
            if os.path.exists(pdf_candidate):
                pdf_full_path = pdf_candidate
    except Exception as e:
        logger.warning("Could not generate/attach PDF for order %s: %s", order.order_id, e)

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

    attachments = [pdf_full_path] if pdf_full_path else None
    ok, status_msg = send_email_resilient(
        subject=cust_subject,
        body=cust_message,
        to_emails=[target_email],
        attachments=attachments,
    )

    if ok:
        logger.info("Order confirmation email sent to %s with invoice PDF (order %s)", target_email, order.order_id)
        if invoice and invoice.status == 'draft':
            from django.utils import timezone
            invoice.status = 'sent'
            invoice.sent_at = timezone.now()
            invoice.save(update_fields=['status', 'sent_at'])
        return True, f"Invoice successfully emailed to {target_email}"
    else:
        logger.error("Customer email delivery error for order %s: %s", order.order_id, status_msg)
        return False, status_msg


def send_order_confirmation_email(order_or_id):
    """
    Sends order confirmation & invoice emails in background thread via SMTP.
    - Customer receives Customer Copy Invoice PDF attachment & download link
    - Store Admin receives Store/Admin Copy Invoice notification
    """
    def _send():
        try:
            connection.close()  # Refresh connection in new thread
            if isinstance(order_or_id, str):
                from .models import Order
                order = Order.objects.filter(order_id=order_or_id).first()
            else:
                from .models import Order
                order = Order.objects.filter(pk=order_or_id.pk).first()

            if not order:
                logger.warning("Order %s not found for email dispatch", order_or_id)
                return

            send_order_invoice_now(order)

            # Store Admin Notification
            admin_email = getattr(settings, 'STORE_EMAIL', None)
            if admin_email:
                backend_url = getattr(settings, 'BACKEND_URL', 'http://localhost:8000')
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
                    send_email_resilient(
                        subject=admin_subject,
                        body=admin_message,
                        to_emails=[admin_email],
                    )
                except Exception as e:
                    logger.error("Store notification email delivery error: %s", e)
        except Exception as outer_err:
            logger.error("Background order email thread exception: %s", outer_err)
        finally:
            connection.close()

    t = threading.Thread(target=_send, daemon=True)
    t.start()
