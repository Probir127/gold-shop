from django.contrib import admin
from .models import GoldRate

@admin.register(GoldRate)
class GoldRateAdmin(admin.ModelAdmin):
    list_display = ['date', 'rate_22k', 'rate_21k', 'rate_18k', 'rate_traditional', 'updated_at']
    ordering = ['-date']

    def save_model(self, request, obj, form, change):
        from .pricing import publish_manual, store_today, RATE_FIELDS
        if obj.date == store_today():
            saved = publish_manual({key: getattr(obj, key) for key in RATE_FIELDS})
            obj.pk = saved.pk
        else:
            super().save_model(request, obj, form, change)
