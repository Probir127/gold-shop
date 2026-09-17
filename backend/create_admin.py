import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sahara_gold.settings")
django.setup()
from django.contrib.auth.models import User
from core.models import Tenant, TenantMembership

raw_username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'shara_gold')
# Django usernames cannot contain spaces; replace spaces with underscores automatically
username = raw_username.strip().replace(' ', '_')
email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'saharagold19@gmail.com')
password = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'sahara1122@@')

if not User.objects.filter(username=username).exists():
    admin_user = User.objects.create_superuser(
        username=username,
        email=email,
        password=password,
        first_name='Shara',
        last_name='Gold'
    )
    print(f"Superuser created successfully: {username} ({email})")
else:
    admin_user = User.objects.get(username=username)
    admin_user.email = email
    admin_user.set_password(password)
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.save()
    print(f"Superuser '{username}' updated with current credentials.")

tenant, _ = Tenant.objects.get_or_create(
    slug='sahara-gold',
    defaults={
        'name': 'Sahara Gold',
        'owner': admin_user,
        'business_name': 'Sahara Gold Luxury Jewelry',
        'contact_phone': '+8801700000000',
        'plan': 'enterprise'
    }
)
TenantMembership.objects.get_or_create(
    tenant=tenant,
    user=admin_user,
    defaults={'role': 'admin'}
)
print("Store workspace 'sahara-gold' assigned to admin.")
