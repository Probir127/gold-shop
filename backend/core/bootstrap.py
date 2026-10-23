"""Explicit first-time admin setup; never rewrite existing shop data."""
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Tenant, TenantMembership

@transaction.atomic
def initialize_admin(username, email, password):
    if not username or not email or not password:
        raise ValueError('Explicit admin username, email and password are required.')
    User = get_user_model()
    user = User.objects.filter(username__iexact=username).first()
    if user is not None and not (user.is_active and user.is_staff and user.is_superuser):
        raise ValueError('An existing account cannot be promoted or reactivated by setup.')
    if user is None:
        from django.contrib.auth.password_validation import validate_password
        candidate = User(username=username, email=email)
        validate_password(password, candidate)
        user = User.objects.create_superuser(username=username, email=email, password=password)
    tenant, _ = Tenant.objects.get_or_create(slug='sahara-gold', defaults={
        'name': 'New Sahara Gold and Diamond', 'business_name': 'New Sahara Gold and Diamond', 'owner': user,
    })
    TenantMembership.objects.get_or_create(tenant=tenant, user=user, defaults={'role': 'admin'})
    # Products, categories, photographs, ownership and existing credentials are untouched.
    return user, tenant
