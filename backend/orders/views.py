from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import BasePermission
from django.shortcuts import render
from .models import Order
from .serializers import OrderSerializer
from core.utils.invoice_access import validate_invoice_access_token
import logging

logger = logging.getLogger(__name__)


def normalize_phone(value):
    digits = ''.join(char for char in str(value) if char.isdigit())
    return digits[2:] if digits.startswith('88') else digits


class OrderInvoiceAccessPermission(BasePermission):
    """Require a signed link or an authenticated owner/staff user."""

    def has_permission(self, request, view):
        token = request.query_params.get('token')
        order_id = getattr(view, 'kwargs', {}).get('order_id')
        if token and validate_invoice_access_token(token, 'order', order_id):
            return True

        copy_type = request.query_params.get('copy', 'customer').lower()
        if copy_type in {'admin', 'store'}:
            return bool(request.user and (request.user.is_staff or request.user.is_superuser))

        return bool(request.user and request.user.is_authenticated)


class OrderAccessPermission(BasePermission):
    """Allow an order owner or a signed customer capability to view an order."""

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated) or bool(validate_invoice_access_token(
            request.query_params.get('token'),
            'order',
            getattr(view, 'kwargs', {}).get('order_id'),
        ))

    def has_object_permission(self, request, view, obj) -> bool:
        if validate_invoice_access_token(request.query_params.get('token'), 'order', obj.order_id):
            return True
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(
            user.is_staff
            or user.email.lower() == obj.customer_email.lower()
            or normalize_phone(user.username) == normalize_phone(obj.customer_phone)
        )

class OrderViewSet(viewsets.ModelViewSet):
    """
    Unified Order ViewSet:
    - Public: POST (Create), GET (Track), GET (Invoice)
    - Admin: GET (List all), PATCH/PUT (Update status), DELETE
    """
    queryset = Order.objects.prefetch_related('items__product').order_by('-created_at')
    serializer_class = OrderSerializer
    lookup_field = 'order_id'

    def get_permissions(self):
        if self.action in ['create', 'track']:
            return [permissions.AllowAny()]
        if self.action == 'retrieve':
            return [OrderAccessPermission()]
        if self.action == 'invoice':
            return [OrderInvoiceAccessPermission()]
        if self.action in ['send_invoice', 'pdf']:
            return [OrderAccessPermission()]
        if self.action == 'my_orders':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_orders(self, request):
        """
        Authenticated customer order history.
        GET /api/orders/my_orders/  (requires Bearer token)
        """
        if request.user.is_staff:
            # Staff can see all orders (useful for admin tools)
            qs = Order.objects.prefetch_related('items__product').order_by('-created_at')
        else:
            # Customers see only their own orders matched by their account phone/email
            account_phone = (request.user.username or '').strip()
            account_email = (request.user.email or '').strip().lower()
            from django.db.models import Q
            qs = Order.objects.prefetch_related('items__product').filter(
                Q(customer_phone__iexact=account_phone) |
                (Q(customer_email__iexact=account_email) if account_email else Q())
            ).order_by('-created_at')

        serializer = self.get_serializer(qs[:50], many=True)
        return Response({'orders': serializer.data})

    @action(detail=False, methods=['post'])
    def track(self, request):
        order_id = request.data.get('order_id')
        phone = request.data.get('phone')

        if not order_id or not phone:
            return Response(
                {"error": "Please provide both Order ID and Phone Number"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            order = Order.objects.get(order_id__iexact=order_id)
            if normalize_phone(phone) != normalize_phone(order.customer_phone):
                return Response(
                    {"error": "Phone number does not match this order"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer = self.get_serializer(order)
            return Response(serializer.data)
        except Order.DoesNotExist:
            return Response(
                {"error": "Order not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def update_status(self, request, order_id=None):
        """
        Admin update order status + trigger WhatsApp notification.
        POST /api/orders/<order_id>/update_status/
        Body: { "order_status": "shipped", "send_whatsapp": true }
        """
        order = self.get_object()
        new_status = request.data.get('order_status')
        new_payment = request.data.get('payment_status')
        send_wa = request.data.get('send_whatsapp', True)

        if new_status:
            order.order_status = new_status
            # Auto-promote COD orders to paid when marked as delivered
            if new_status == 'delivered' and order.payment_method == 'cod' and not new_payment and order.payment_status == 'pending':
                order.payment_status = 'paid'
                new_payment = 'paid'

        if new_payment:
            order.payment_status = new_payment

        order.save()

        # Synchronize payment status with core Invoice
        # Invoice.STATUS_CHOICES: draft | sent | paid | overdue
        try:
            from core.models import Invoice
            inv = Invoice.objects.filter(invoice_number=f"INV-{order.order_id}").first()
            if inv:
                status_map = {
                    'paid': 'paid',
                    'pending': 'sent',          # awaiting settlement
                    'awaiting_payment': 'sent',
                    'failed': 'overdue',
                    'refunded': 'draft',
                }
                mapped = status_map.get(order.payment_status)
                if mapped and inv.status != mapped:
                    inv.status = mapped
                    inv.save(update_fields=['status'])
        except Exception as inv_err:
            logger.warning(f"Could not synchronize Invoice status for order {order.order_id}: {inv_err}")

        # Send WhatsApp status notification if requested
        if send_wa and order.customer_phone:
            try:
                from core.utils.whatsapp import send_text_message
                clean_phone = order.customer_phone.replace(' ', '').replace('-', '')
                if clean_phone.startswith('01'):
                    clean_phone = '88' + clean_phone
                elif clean_phone.startswith('+'):
                    clean_phone = clean_phone[1:]
                
                msg = (
                    f"✨ Sahara Gold Order Update\n\n"
                    f"Dear {order.customer_name},\n"
                    f"Your order #{order.order_id} is now: {order.get_order_status_display().upper()}!\n"
                    f"Total: ৳{order.total:,.0f}\n"
                    f"Delivery to: {order.shipping_address}, {order.city}\n\n"
                    f"Thank you for choosing Sahara Gold. If you have any inquiries, reply directly to this message."
                )
                send_text_message(clean_phone, msg)
            except Exception as e:
                logger.warning(f"Could not dispatch WhatsApp message: {e}")

        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['get'])
    def invoice(self, request, order_id=None):
        """
        Dual-copy official invoice view.
        GET /api/orders/<order_id>/invoice/?copy=customer  (Customer Copy)
        GET /api/orders/<order_id>/invoice/?copy=admin     (Store/Admin Copy)
        """
        order = self.get_object()
        copy_type = request.query_params.get('copy', 'customer').lower()
        is_admin_copy = copy_type in ['admin', 'store']
        copy_title = "Store & Accounts Copy" if is_admin_copy else "Customer Copy"

        has_valid_token = validate_invoice_access_token(
            request.query_params.get('token'), 'order', order.order_id
        )
        is_staff = bool(request.user and (request.user.is_staff or request.user.is_superuser))

        if is_admin_copy and not is_staff and not has_valid_token:
            return Response({'detail': 'Admin invoice access requires staff authentication or a signed token.'}, status=status.HTTP_403_FORBIDDEN)

        if not is_admin_copy and not has_valid_token:
            user = request.user
            if not user.is_authenticated or (
                user.email.lower() != order.customer_email.lower()
                and normalize_phone(user.username) != normalize_phone(order.customer_phone)
            ):
                return Response({'detail': 'This invoice link is invalid or expired.'}, status=status.HTTP_403_FORBIDDEN)

        if request.query_params.get('format') == 'json' or request.headers.get('Accept') == 'application/json':
            serializer = self.get_serializer(order)
            return Response({
                'invoice_number': f"INV-{order.order_id}",
                'copy': 'admin' if is_admin_copy else 'customer',
                'order': serializer.data
            })

        items = order.items.select_related('product').all()
        token = request.query_params.get('token', '')
        context = {
            'order': order,
            'items': items,
            'invoice_number': f"INV-{order.order_id}",
            'is_admin_copy': is_admin_copy,
            'copy_title': copy_title,
            'token': token,
        }
        return render(request, 'invoice_luxury.html', context)

    @action(detail=True, methods=['post'], permission_classes=[OrderAccessPermission])
    def send_invoice(self, request, order_id=None):
        """
        Send or resend the official invoice PDF email to the customer.
        Staff can optionally override the recipient email; customers send to their own email.
        POST /api/orders/<order_id>/send_invoice/
        """
        order = self.get_object()
        override_email = str(request.data.get('email', '')).strip()
        is_staff = bool(request.user and (request.user.is_staff or request.user.is_superuser))

        if is_staff and override_email:
            recipient_email = override_email
        else:
            recipient_email = order.customer_email or (request.user.email if request.user and request.user.is_authenticated else '')

        if not recipient_email:
            return Response(
                {"error": "No email address found for this order. Please provide a customer email address.", "success": False},
                status=status.HTTP_400_BAD_REQUEST
            )

        from .emails import send_order_invoice_now
        ok, msg = send_order_invoice_now(order, recipient_email=recipient_email)
        if ok:
            return Response({"success": True, "recipient_email": recipient_email, "message": msg})
        else:
            return Response(
                {"error": f"SMTP email delivery failed: {msg}", "success": False},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], permission_classes=[OrderAccessPermission])
    def pdf(self, request, order_id=None):
        """
        Download certified PDF invoice directly.
        GET /api/orders/<order_id>/pdf/
        """
        order = self.get_object()
        from django.http import FileResponse, Http404
        from django.conf import settings
        import os
        from core.models import Invoice
        from core.utils.pdf import generate_invoice_pdf

        invoice = Invoice.objects.filter(invoice_number=f"INV-{order.order_id}").first()
        if not invoice:
            raise Http404("Invoice not found")

        pdf_full_path = os.path.join(settings.MEDIA_ROOT, invoice.pdf_path) if invoice.pdf_path else None
        if not pdf_full_path or not os.path.exists(pdf_full_path):
            invoice.pdf_path = generate_invoice_pdf(invoice)
            invoice.save(update_fields=['pdf_path'])
            pdf_full_path = os.path.join(settings.MEDIA_ROOT, invoice.pdf_path)

        if not os.path.exists(pdf_full_path):
            raise Http404("PDF generation failed")

        return FileResponse(open(pdf_full_path, 'rb'), content_type='application/pdf', filename=f"Sahara_Gold_Invoice_{order.order_id}.pdf")
