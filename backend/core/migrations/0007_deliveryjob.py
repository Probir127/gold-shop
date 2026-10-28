import uuid
from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [('core', '0006_paymentconfiguration')]
    operations = [migrations.CreateModel(name='DeliveryJob', fields=[
        ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
        ('kind', models.CharField(default='email', max_length=20)),
        ('dedupe_key', models.CharField(blank=True, max_length=200, null=True, unique=True)),
        ('payload', models.JSONField(default=dict)),
        ('status', models.CharField(db_index=True, default='pending', max_length=20)),
        ('attempts', models.PositiveSmallIntegerField(default=0)),
        ('next_attempt_at', models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
        ('last_error', models.CharField(blank=True, max_length=500)),
        ('created_at', models.DateTimeField(auto_now_add=True)),
        ('completed_at', models.DateTimeField(blank=True, null=True)),
    ])]
