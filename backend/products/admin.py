from django.contrib import admin
from .models import Product, Category

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'weight', 'purity', 'making_charge_per_gram', 'in_stock', 'is_bestseller', 'created_at']
    list_filter = ['category', 'purity', 'in_stock', 'is_bestseller']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at']
