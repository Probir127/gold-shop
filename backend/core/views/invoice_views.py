import os
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics, status, permissions
from django.shortcuts import get_object_or_404, render
from django.http import FileResponse, Http404
from django.utils import timezone
from django.conf import settings
from ..models import Invoice
from ..serializers import InvoiceSerializer
from ..permissions import IsInvoiceHTMLAccessAllowed, IsTenantManagerOrStaff
from ..utils.pdf import generate_invoice_pdf
from ..utils.whatsapp import send_document
from ..utils.invoice_access import validate_invoice_access_token
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)

class InvoiceListCreateView(generics.ListCreateAPIView):
    serializer_class = InvoiceSerializer
    permission_classes = [IsTenantManagerOrStaff]

    def get_queryset(self):
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            return Invoice.objects.none()
        return Invoice.objects.filter(tenant=tenant).order_by('-created_at')

    def perform_create(self, serializer):
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            raise permissions.PermissionDenied('No tenant context.')
        serializer.save(tenant=tenant)

class InvoiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = InvoiceSerializer
    permission_classes = [IsTenantManagerOrStaff]

    def get_queryset(self):
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            return Invoice.objects.none()
        return Invoice.objects.filter(tenant=tenant)


class GeneratePDFView(APIView):
    permission_classes = [IsTenantManagerOrStaff]

    def _generate(self, request, pk):
        invoice = Invoice.objects.filter(pk=pk).first()
        if not invoice:
            return Response({'detail': 'Invoice not found.'}, status=404)
        tenant = getattr(request, 'tenant', None) or invoice.tenant or Tenant.objects.filter(slug='sahara-gold').first() or Tenant.objects.first()
        try:
            invoice.pdf_path = generate_invoice_pdf(invoice)
            invoice.save(update_fields=['pdf_path'])
            return Response({'status': 'success', 'pdf_path': invoice.pdf_path})
        except Exception as e:
            logger.error("Failed to generate invoice PDF for %s: %s", invoice.invoice_number, e)
            return Response({'detail': f'Error generating invoice PDF: {e}'}, status=500)

    def get(self, request, pk):
        return self._generate(request, pk)

    def post(self, request, pk):
        return self._generate(request, pk)

class SendInvoiceView(APIView):
    permission_classes = [IsTenantManagerOrStaff]

    def post(self, request, pk):
        invoice = Invoice.objects.filter(pk=pk).first()
        if not invoice:
            return Response({'detail': 'Invoice not found.'}, status=404)

        tenant = getattr(request, 'tenant', None) or invoice.tenant or Tenant.objects.filter(slug='sahara-gold').first() or Tenant.objects.first()

        # Step 1: Generate PDF if not already done or file missing
        try:
            pdf_disk_path = os.path.join(settings.MEDIA_ROOT, invoice.pdf_path) if invoice.pdf_path else None
            if not invoice.pdf_path or not pdf_disk_path or not os.path.exists(pdf_disk_path):
                invoice.pdf_path = generate_invoice_pdf(invoice)
                invoice.save(update_fields=['pdf_path'])
        except Exception as pdf_err:
            logger.error("Failed generating PDF for invoice %s: %s", invoice.invoice_number, pdf_err)

        # Step 2: Build public URL for the PDF
        pdf_url = make_invoice_pdf_url(request, invoice)

        # Step 3: Resolve customer email (from request payload, client, order, or registered account)
        email_sent = False
        email_error = None
        client_email = str(request.data.get('email', '')).strip() or getattr(invoice.client, 'email', '') or ''
        
        if not client_email:
            # Fallback 1: lookup matching order
            from orders.models import Order
            order = None
            if invoice.invoice_number.startswith('INV-ORD-'):
                order_id = invoice.invoice_number.replace('INV-', '')
                order = Order.objects.filter(order_id=order_id).first()
            if not order and invoice.client and invoice.client.phone:
                order = Order.objects.filter(customer_phone=invoice.client.phone).order_by('-created_at').first()
            if order and order.customer_email:
                client_email = order.customer_email

        if not client_email and invoice.client and invoice.client.phone:
            # Fallback 2: registered user account
            from django.contrib.auth.models import User
            usr = User.objects.filter(username=invoice.client.phone).first()
            if usr and usr.email:
                client_email = usr.email

        # Keep client record updated with detected email
        if client_email and invoice.client and not invoice.client.email:
            invoice.client.email = client_email
            invoice.client.save(update_fields=['email'])

        if client_email:
            from core.utils.mailer import send_email_resilient
            pdf_abs = os.path.join(settings.MEDIA_ROOT, invoice.pdf_path) if invoice.pdf_path else None
            attachments = [pdf_abs] if (pdf_abs and os.path.exists(pdf_abs)) else None
            client_name = invoice.client.name if invoice.client else "Valued Customer"
            biz_name = tenant.business_name if (tenant and getattr(tenant, 'business_name', None)) else "Sahara Gold"

            subject = f'Official Certified Invoice #{invoice.invoice_number} | {biz_name}'
            body = (
                f'Dear {client_name},\n\n'
                f'Thank you for choosing {biz_name}.\n'
                f'Please find your official certified invoice #{invoice.invoice_number} attached as a PDF.\n\n'
                f'Invoice Summary:\n'
                f'• Invoice Number: #{invoice.invoice_number}\n'
                f'• Total Amount: {invoice.currency} {invoice.total_amount:,.2f}\n'
                f'• Status: {invoice.status.upper()}\n\n'
                f'Showroom: Bashundhara City Shopping Mall, Level 7, Block-A Shop-19, Dhaka.\n'
                f'Hotline / WhatsApp: 01799-281878\n\n'
                f'Regards,\n{biz_name}'
            )
            html_message = None
            try:
                html_message = render_to_string('emails/invoice_dispatch.html', {
                    'client_name': client_name,
                    'invoice_number': invoice.invoice_number,
                    'invoice_total': invoice.total_amount,
                    'currency': invoice.currency,
                    'invoice_status': invoice.status,
                    'business_name': biz_name,
                })
            except Exception as tmpl_err:
                logger.warning("Could not render invoice HTML template for %s: %s", invoice.invoice_number, tmpl_err)

            ok, mail_msg = send_email_resilient(
                subject=subject,
                body=body,
                to_emails=client_email,
                html_message=html_message,
                attachments=attachments
            )
            if ok:
                email_sent = True
                logger.info("Invoice email successfully sent to %s for invoice %s", client_email, invoice.invoice_number)
            else:
                email_error = mail_msg
                logger.error("Could not send invoice email to %s: %s", client_email, mail_msg)
        else:
            email_error = "No recipient email address found for this client. Please specify an email."

        # Step 4: Send via WhatsApp (if credentials configured)
        wa_result = {}
        if invoice.client and invoice.client.phone and tenant:
            caption = f'Hi! Here is your invoice {invoice.invoice_number} from {getattr(tenant, "business_name", "Sahara Gold")}. Total: {invoice.currency} {invoice.total_amount}.'
            try:
                wa_result = send_document(
                    to_phone=invoice.client.phone,
                    pdf_url=pdf_url,
                    filename=f'{getattr(tenant, "slug", "sahara-gold")}_{invoice.invoice_number}.pdf',
                    caption=caption,
                    tenant=tenant
                )
            except Exception as wa_err:
                logger.warning(f"WhatsApp send failed: {wa_err}")
                wa_result = {'error': str(wa_err)}

        # Step 5: Update invoice status if dispatched
        if email_sent or (wa_result and not wa_result.get('error')):
            invoice.status = 'sent'
            invoice.sent_at = timezone.now()
            invoice.save(update_fields=['status', 'sent_at'])
            if invoice.client:
                invoice.client.status = 'invoiced'
                invoice.client.save(update_fields=['status'])

        return Response({
            'status': 'sent' if email_sent else ('partial' if (wa_result and not wa_result.get('error')) else 'failed'),
            'email_sent': email_sent,
            'recipient_email': client_email,
            'email_error': email_error,
            'whatsapp_response': wa_result,
            'pdf_url': pdf_url
        })


class MarkInvoicePaidView(APIView):
    """
    Mark an invoice as paid.
    Also updates the client's status to 'completed'.
    """
    permission_classes = [IsTenantManagerOrStaff]

    def post(self, request, pk):
        tenant = request.tenant
        if not tenant:
            return Response({'detail': 'No tenant context.'}, status=400)

        invoice = get_object_or_404(Invoice, pk=pk, tenant=tenant)

        if invoice.status == 'paid':
            return Response(
                {'detail': 'Invoice is already marked as paid.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        invoice.status = 'paid'
        invoice.save(update_fields=['status'])

        # Update client lifecycle status
        invoice.client.status = 'completed'
        invoice.client.save(update_fields=['status'])

        return Response({
            'status': 'paid',
            'invoice_number': invoice.invoice_number,
            'client_status': 'completed',
        })


class InvoiceHTMLView(APIView):
    """
    Dual-copy printable luxury HTML invoice view.
    GET /api/invoices/<pk>/html/?copy=customer
    GET /api/invoices/<pk>/html/?copy=admin
    """
    permission_classes = [IsInvoiceHTMLAccessAllowed]

    def get(self, request, pk):
        copy_type = request.query_params.get('copy', 'customer').lower()
        is_admin_copy = copy_type in ['admin', 'store']

        if is_admin_copy:
            invoice = get_object_or_404(Invoice, pk=pk, tenant=request.tenant)
        elif IsTenantManagerOrStaff().has_permission(request, self):
            invoice = get_object_or_404(Invoice, pk=pk, tenant=request.tenant)
        else:
            if not validate_invoice_access_token(request.query_params.get('token'), 'invoice', pk):
                return Response({'detail': 'This invoice link is invalid or expired.'}, status=status.HTTP_403_FORBIDDEN)
            invoice = get_object_or_404(Invoice, pk=pk)

        # Try to find corresponding Order if order_id is in invoice_number
        from orders.models import Order
        order = None
        if invoice.invoice_number.startswith('INV-ORD-'):
            order_id = invoice.invoice_number.replace('INV-', '')
            order = Order.objects.filter(order_id=order_id).first()

        if not order:
            class DummyOrder:
                order_id = invoice.invoice_number.replace('INV-', '')
                customer_name = invoice.client.name if invoice.client else 'Valued Customer'
                customer_phone = invoice.client.phone if invoice.client else ''
                customer_email = getattr(invoice.client, 'email', '')
                shipping_address = ''
                city = ''
                created_at = invoice.created_at
                subtotal = invoice.subtotal
                vat = 0
                total = invoice.total_amount
                payment_status = invoice.status
                def get_payment_method_display(self): return "Official Invoice"
                def get_payment_status_display(self): return invoice.status.upper()
                def get_order_status_display(self): return "CONFIRMED"
            order = DummyOrder()

        items = []
        if hasattr(order, 'items') and order.items.exists():
            items = order.items.select_related('product').all()
        else:
            for it in (invoice.items or []):
                items.append({
                    'product_name': it.get('name') or it.get('service') or it.get('product_name') or 'Gold Jewelry Item',
                    'weight': it.get('weight', '1.0'),
                    'price_at_purchase': it.get('price') or it.get('unit_price') or it.get('total') or 0,
                    'product': {'purity': it.get('purity', '22K'), 'sku': it.get('sku', '')}
                })

        context = {
            'order': order,
            'items': items,
            'invoice_number': invoice.invoice_number,
            'is_admin_copy': is_admin_copy,
            'copy_title': "Store & Accounts Copy" if is_admin_copy else "Customer Copy",
            'asset_base_url': request.build_absolute_uri('/').rstrip('/'),
        }
        return render(request, 'invoice_luxury.html', context)


class InvoicePDFDownloadView(APIView):
    """Serve generated invoice PDFs through expiring signed links."""

    permission_classes = []

    def get(self, request, token):
        from django.core import signing
        try:
            invoice_id = signing.TimestampSigner(salt='sahara-gold.invoice-pdf').unsign(
                token,
                max_age=getattr(settings, 'INVOICE_LINK_MAX_AGE', 7 * 24 * 60 * 60),
            )
        except signing.BadSignature as exc:
            raise Http404 from exc

        invoice = get_object_or_404(Invoice, pk=invoice_id)
        if not invoice.pdf_path:
            invoice.pdf_path = generate_invoice_pdf(invoice)
            invoice.save(update_fields=['pdf_path'])
        pdf_path = os.path.join(settings.MEDIA_ROOT, invoice.pdf_path)
        if not os.path.isfile(pdf_path):
            raise Http404
        return FileResponse(open(pdf_path, 'rb'), content_type='application/pdf')


def make_invoice_pdf_url(request, invoice):
    from django.core import signing
    token = signing.TimestampSigner(salt='sahara-gold.invoice-pdf').sign(str(invoice.pk))
    return request.build_absolute_uri(f'/api/invoices/pdf/{token}/')

