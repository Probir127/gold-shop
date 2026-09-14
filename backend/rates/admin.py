from django.contrib import admin
from .models import GoldRate

@admin.register(GoldRate)
class GoldRateAdmin(admin.ModelAdmin):
    list_display = ['date', 'rate_22k', 'rate_21k', 'rate_18k', 'rate_traditional', 'updated_at']
    ordering = ['-date']
