from rest_framework import viewsets, mixins, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import render, get_object_or_404
from .models import Order
from .serializers import OrderSerializer
import logging

logger = logging.getLogger(__name__)

class OrderViewSet(viewsets.ModelViewSet):
    """
    Unified Order ViewSet:
    - Public: POST (Create), GET (Track), GET (Invoice)
    - Admin: GET (List all), PATCH/PUT (Update status), DELETE
    """
    queryset = Order.objects.all().order_by('-created_at')
    serializer_class = OrderSerializer
    lookup_field = 'order_id'

    def get_permissions(self):
        if self.action in ['create', 'track', 'retrieve', 'invoice']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

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
            if phone not in order.customer_phone:
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

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
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
        if new_payment:
            order.payment_status = new_payment
        order.save()

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

        if request.query_params.get('format') == 'json' or request.headers.get('Accept') == 'application/json':
            serializer = self.get_serializer(order)
            return Response({
                'invoice_number': f"INV-{order.order_id}",
                'copy': 'admin' if is_admin_copy else 'customer',
                'order': serializer.data
            })

        items = order.items.select_related('product').all()
        context = {
            'order': order,
            'items': items,
            'invoice_number': f"INV-{order.order_id}",
            'is_admin_copy': is_admin_copy,
            'copy_title': copy_title,
        }
        return render(request, 'invoice_luxury.html', context)
