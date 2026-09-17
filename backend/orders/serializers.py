import logging

from django.db import transaction
from django.conf import settings
from rest_framework import serializers
from .models import Order, OrderItem
from products.models import Product
from products.serializers import ProductSerializer

logger = logging.getLogger(__name__)

class OrderItemSerializer(serializers.ModelSerializer):
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(in_stock=True), source='product', write_only=True
    )
    quantity = serializers.IntegerField(min_value=1)

    class Meta:
        model = OrderItem
        fields = ['product_id', 'product_name', 'quantity', 'weight', 'price_at_purchase']
        read_only_fields = ['product_name', 'weight', 'price_at_purchase']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, allow_empty=False)
    customer_invoice_url = serializers.SerializerMethodField()
    customer_access_token = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ['order_id', 'total', 'subtotal', 'vat', 'order_status', 'payment_status', 'created_at', 'updated_at']

    def get_customer_invoice_url(self, obj):
        request = self.context.get('request')
        if request and (request.method == 'POST' or request.user.is_authenticated):
            token = self.get_customer_access_token(obj)
            return f"/api/orders/{obj.order_id}/invoice/?copy=customer&token={token}"
        return None

    def get_customer_access_token(self, obj):
        request = self.context.get('request')
        if request and (request.method == 'POST' or request.user.is_authenticated):
            from core.utils.invoice_access import make_invoice_access_token
            return make_invoice_access_token('order', obj.order_id)
        return None

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        # Calculate totals
        subtotal = 0
        order_items = []

        # We need to temporarily hold data to create items after order creation
        for item_data in items_data:
            product = item_data['product']
            quantity = item_data.get('quantity', 1)
            
            # Simple pricing logic: Use serializer from products to reuse get_current_price logic?
            # Or just duplicate logic for safety. Let's use simple logic fetching fresh rates.
            # For simplicity, I'll rely on the frontend passed price OR safer: re-calculate.
            # RE-CALCULATE IS SAFER.
            
            # Assuming we can access the dynamic price helper from ProductSerializer or duplicate
            # Let's instantiate a serializer to get the price
            p_ser = ProductSerializer(product)
            unit_price = p_ser.data['current_price']
            
            line_total = unit_price * quantity
            subtotal += line_total
            
            order_items.append({
                'product': product,
                'product_name': product.name,
                'weight': product.weight,
                'quantity': quantity,
                'price_at_purchase': unit_price 
            })

        vat = 0
        total = subtotal

        order = Order.objects.create(subtotal=subtotal, vat=vat, total=total, **validated_data)
        
        for item in order_items:
            OrderItem.objects.create(order=order, **item)
        
        # Auto-create core Invoice for Store & Admin. This is inside the
        # transaction so an order cannot commit without its invoice.
        import logging
        logger = logging.getLogger(__name__)
        from core.models import Invoice, Client, Tenant
        tenant = Tenant.objects.filter(
            slug=settings.DEFAULT_TENANT_SLUG,
            is_active=True,
        ).first()
        if not tenant:
            raise serializers.ValidationError('Store invoice configuration is unavailable.')
        client, created = Client.objects.get_or_create(
            tenant=tenant,
            phone=order.customer_phone,
            defaults={'name': order.customer_name, 'email': order.customer_email, 'status': 'invoiced'}
        )
        if not created and order.customer_email and not client.email:
            client.email = order.customer_email
            client.save(update_fields=['email'])
            
        invoice_items = []
        for it in order_items:
            invoice_items.append({
                'name': it['product_name'],
                'product_name': it['product_name'],
                'weight': float(it['weight']),
                'price': float(it['price_at_purchase']),
                'quantity': it['quantity'],
                'purity': getattr(it['product'], 'purity', '22K'),
            })

        Invoice.objects.update_or_create(
            invoice_number=f"INV-{order.order_id}",
            defaults={
                'tenant': tenant,
                'client': client,
                'items': invoice_items,
                'subtotal': subtotal,
                'tax_percent': 0,
                'total_amount': total,
                'currency': 'BDT',
                'status': 'paid' if order.payment_status == 'paid' else 'draft',
                'notes': f"Order {order.order_id} | Delivery to: {order.shipping_address}, {order.city}",
            }
        )

        # Trigger Email (Sends customer invoice & store admin notification)
        try:
            from orders.emails import send_order_confirmation_email
            send_order_confirmation_email(order)
        except Exception as e:
            print(f"Email Trigger Error: {e}")
                
        return order

