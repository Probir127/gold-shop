from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [('orders', '0004_customeremailverification')]
    operations = [migrations.AlterField(model_name='order', name='payment_method', field=models.CharField(max_length=10, default='manual', choices=[('manual','Merchant payment — admin verification'),('cod','Cash on Delivery'),('bkash','bKash/Nagad')]))]
