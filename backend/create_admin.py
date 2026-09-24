import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sahara_gold.settings")
django.setup()
from django.contrib.auth.models import User
from core.models import Tenant, TenantMembership

password = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'sahara1122@@')
email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'saharagold19@gmail.com')

# 1. Ensure Tenant exists
tenant, _ = Tenant.objects.get_or_create(
    slug='sahara-gold',
    defaults={
        'name': 'Sahara Gold',
        'business_name': 'Sahara Gold Luxury Jewelry',
        'contact_phone': '+8801799281878',
        'plan': 'enterprise'
    }
)

# 2. Sync both 'shara_gold' and 'admin' superusers
admin_usernames = ['shara_gold', 'admin']
custom_user = os.getenv('DJANGO_SUPERUSER_USERNAME', '').strip().replace(' ', '_')
if custom_user and custom_user not in admin_usernames:
    admin_usernames.append(custom_user)

primary_admin = None
for uname in admin_usernames:
    u = User.objects.filter(username__iexact=uname).first()
    if not u:
        u = User.objects.create_superuser(
            username=uname,
            email=email,
            password=password,
            first_name='Sahara',
            last_name='Admin'
        )
        print(f"Superuser '{uname}' created.")
    else:
        u.email = email
        u.set_password(password)
        u.is_staff = True
        u.is_superuser = True
        u.is_active = True
        u.save()
        print(f"Superuser '{uname}' credentials updated and verified.")

    TenantMembership.objects.get_or_create(
        tenant=tenant,
        user=u,
        defaults={'role': 'admin'}
    )
    if not primary_admin:
        primary_admin = u

if not tenant.owner and primary_admin:
    tenant.owner = primary_admin
    tenant.save(update_fields=['owner'])

print("All admin accounts successfully configured with workspace access.")
