from django.contrib import admin
from .models import Order, OrderItem

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['product', 'product_name', 'quantity', 'weight', 'price_at_purchase']
    can_delete = False

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_id', 'customer_name', 'total', 'payment_method', 'order_status', 'created_at']
    list_filter = ['order_status', 'payment_method', 'city', 'created_at']
    search_fields = ['order_id', 'customer_name', 'customer_phone', 'customer_email']
    inlines = [OrderItemInline]
    readonly_fields = ['order_id', 'created_at', 'updated_at']
    ordering = ['-created_at']
