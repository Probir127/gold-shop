from django.db import models
from django.utils import timezone

class GoldRate(models.Model):
    date = models.DateField(default=timezone.now, unique=True)
    rate_22k = models.IntegerField(help_text="Price per gram for 22K") 
    rate_21k = models.IntegerField(help_text="Price per gram for 21K")
    rate_18k = models.IntegerField(help_text="Price per gram for 18K")
    rate_traditional = models.IntegerField(help_text="Price per gram for Traditional Gold")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"Rates for {self.date}"


class RateControl(models.Model):
    """Singleton for the store-wide pricing mode; shared by all web workers."""
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    mode = models.CharField(max_length=10, choices=[('auto', 'Automatic live'), ('manual', 'Manual')], default='auto')
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_error = models.CharField(max_length=255, blank=True, default='')
