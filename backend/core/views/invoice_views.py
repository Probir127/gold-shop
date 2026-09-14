from __future__ import annotations
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics, status, permissions
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.conf import settings
from ..models import Invoice, Tenant
from ..serializers import InvoiceSerializer
from ..utils.pdf import generate_invoice_pdf
from ..utils.whatsapp import send_document

class InvoiceListCreateView(generics.ListCreateAPIView):
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        tenant = getattr(self.request, 'tenant', None) or Tenant.objects.first()
        if not tenant:
            return Invoice.objects.all().order_by('-created_at')
        return Invoice.objects.filter(tenant=tenant).order_by('-created_at')

    def perform_create(self, serializer):
        tenant = getattr(self.request, 'tenant', None) or Tenant.objects.first()
        serializer.save(tenant=tenant)

class InvoiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        tenant = getattr(self.request, 'tenant', None) or Tenant.objects.first()
        if not tenant:
            return Invoice.objects.all()
        return Invoice.objects.filter(tenant=tenant)


class GeneratePDFView(APIView):
    def _generate(self, request, pk):
        tenant = request.tenant
        if not tenant:
            return Response({'detail': 'No tenant context.'}, status=400)
            
        invoice = get_object_or_404(Invoice, pk=pk, tenant=tenant)
        invoice.pdf_path = generate_invoice_pdf(invoice)
        invoice.save(update_fields=['pdf_path'])
        return Response({'status': 'success', 'pdf_path': invoice.pdf_path})

    def get(self, request, pk):
        return self._generate(request, pk)

    def post(self, request, pk):
        return self._generate(request, pk)

class SendInvoiceView(APIView):
    def post(self, request, pk):
        tenant = request.tenant
        if not tenant:
            return Response({'detail': 'No tenant context.'}, status=400)

        invoice = get_object_or_404(Invoice, pk=pk, tenant=tenant)

        # Step 1: Generate PDF if not already done
        if not invoice.pdf_path:
            invoice.pdf_path = generate_invoice_pdf(invoice)
            invoice.save()

        # Step 2: Build public URL for the PDF
        pdf_url = request.build_absolute_uri(
            settings.MEDIA_URL + invoice.pdf_path
        )

        # Step 3: Send via WhatsApp (using tenant credentials)
        caption = f'Hi! Here is your invoice {invoice.invoice_number} from {tenant.business_name}. Total: {invoice.currency} {invoice.total_amount}.'
        result = send_document(
            to_phone=invoice.client.phone,
            pdf_url=pdf_url,
            filename=f'{tenant.slug}_{invoice.invoice_number}.pdf',
            caption=caption,
            tenant=tenant  # Pass tenant for credentials
        )

        # Step 4: Update invoice status
        invoice.status = 'sent'
        invoice.sent_at = timezone.now()
        invoice.save()

        # Step 5: Update client status
        invoice.client.status = 'invoiced'
        invoice.client.save()

        return Response({'status': 'sent', 'whatsapp_response': result})


class MarkInvoicePaidView(APIView):
    """
    Mark an invoice as paid.
    Also updates the client's status to 'completed'.
    """
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
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        invoice = get_object_or_404(Invoice, pk=pk)
        copy_type = request.query_params.get('copy', 'customer').lower()
        is_admin_copy = copy_type in ['admin', 'store']

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
                customer_phone = invoice.client.phone if invoice.client else '01799-281878'
                customer_email = getattr(invoice.client, 'email', '')
                shipping_address = 'Dhaka, Bangladesh'
                city = 'Dhaka'
                created_at = invoice.created_at
                subtotal = invoice.subtotal
                vat = invoice.total_amount - invoice.subtotal
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
        }
        return render(request, 'invoice_luxury.html', context)

