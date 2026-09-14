from django.contrib import admin
from .models import AIChatSession, AIChatMessage

class AIChatMessageInline(admin.TabularInline):
    model = AIChatMessage
    extra = 0
    readonly_fields = ('role', 'content', 'timestamp')

@admin.register(AIChatSession)
class AIChatSessionAdmin(admin.ModelAdmin):
    list_display = ('session_id', 'customer_name', 'customer_phone', 'created_at', 'updated_at')
    search_fields = ('session_id', 'customer_name', 'customer_phone')
    inlines = [AIChatMessageInline]
