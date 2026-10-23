from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [('core', '0004_invoice_due_date')]
    operations = [migrations.CreateModel(name='StorefrontContent', fields=[
        ('id', models.PositiveSmallIntegerField(default=1, editable=False, primary_key=True, serialize=False)),
        ('content', models.JSONField(blank=True, default=dict)),
        ('updated_at', models.DateTimeField(auto_now=True)),
    ])]
