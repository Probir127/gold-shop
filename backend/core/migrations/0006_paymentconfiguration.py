from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [('core', '0005_storefrontcontent')]
    operations = [migrations.CreateModel(name='PaymentConfiguration', fields=[
        ('id', models.PositiveSmallIntegerField(default=1, editable=False, primary_key=True, serialize=False)),
        ('contact_phone', models.CharField(blank=True, max_length=30)),
        ('merchant_number', models.CharField(blank=True, max_length=30)),
        ('instructions', models.TextField(default='Call us to confirm the merchant payment number. Quote your order reference when paying. Your order is confirmed only after our team verifies payment.')),
        ('ssl_enabled', models.BooleanField(default=False)),
        ('ssl_store_id', models.CharField(blank=True, max_length=150)),
        ('ssl_secret_encrypted', models.TextField(blank=True)),
        ('updated_at', models.DateTimeField(auto_now=True)),
    ])]
