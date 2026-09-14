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
