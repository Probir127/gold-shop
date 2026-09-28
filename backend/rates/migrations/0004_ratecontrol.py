from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('rates', '0003_alter_goldrate_id')]
    operations = [migrations.CreateModel(name='RateControl', fields=[
        ('id', models.PositiveSmallIntegerField(default=1, editable=False, primary_key=True, serialize=False)),
        ('mode', models.CharField(choices=[('auto', 'Automatic live'), ('manual', 'Manual')], default='auto', max_length=10)),
        ('last_attempt_at', models.DateTimeField(blank=True, null=True)),
        ('last_synced_at', models.DateTimeField(blank=True, null=True)),
        ('last_error', models.CharField(blank=True, default='', max_length=255)),
    ])]
