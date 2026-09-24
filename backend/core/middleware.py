from __future__ import annotations
"""
Tenant Middleware — Resolves the current tenant from the authenticated user
and attaches it to request.tenant for all downstream views.
"""
import logging
from django.http import JsonResponse
from core.models import Tenant, TenantMembership

logger = logging.getLogger(__name__)


class TenantMiddleware:
    """
    Attaches `request.tenant` based on the authenticated user's membership.

    Resolution order:
    1. X-Tenant-Slug header (for users with multiple tenants)
    2. First active tenant the user belongs to
    3. None (anonymous / no tenant — views must handle this)
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.tenant = None

        # ── Step 0: Try to authenticate via JWT if not already (for API requests) ──
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            try:
                from rest_framework_simplejwt.authentication import JWTAuthentication
                auth = JWTAuthentication().authenticate(request)
                if auth:
                    request.user = auth[0]
                    logger.debug("JWT Auth success for user: %s", request.user.username)
            except Exception as e:
                logger.debug("JWT Auth failed: %s", e)

        if not hasattr(request, 'user') or not request.user.is_authenticated:
            logger.debug("Unauthenticated request to %s", request.path)
            return self.get_response(request)

        logger.debug("Processing %s for user %s", request.path, request.user.username)

        slug = request.headers.get('X-Tenant-Slug', '').strip()
        if slug:
            logger.debug("Header slug: %s", slug)
            try:
                tenant = Tenant.objects.get(slug=slug, is_active=True)
                if (request.user.is_superuser or request.user.is_staff or
                        tenant.owner == request.user or
                        TenantMembership.objects.filter(tenant=tenant, user=request.user).exists()):
                    request.tenant = tenant
                    logger.debug("Resolved header tenant: %s", tenant.name)
                    return self.get_response(request)
                else:
                    logger.warning("Access denied for tenant '%s' by user '%s'", slug, request.user.username)
                    return JsonResponse({'detail': 'You do not have access to this tenant.'}, status=403)
            except Tenant.DoesNotExist:
                if request.user.is_superuser or request.user.is_staff:
                    tenant = Tenant.objects.filter(is_active=True).first()
                    if tenant:
                        request.tenant = tenant
                        return self.get_response(request)
                logger.warning("Tenant '%s' not found (requested by '%s')", slug, request.user.username)
                return JsonResponse({'detail': f'Tenant "{slug}" not found.'}, status=404)

        # Auto-resolve: owner first, then membership
        tenant = Tenant.objects.filter(owner=request.user, is_active=True).first()
        if not tenant:
            membership = (
                TenantMembership.objects
                .filter(user=request.user, tenant__is_active=True)
                .select_related('tenant')
                .first()
            )
            if membership:
                tenant = membership.tenant

        if not tenant and (request.user.is_superuser or request.user.is_staff):
            tenant = Tenant.objects.filter(slug='sahara-gold', is_active=True).first() or Tenant.objects.filter(is_active=True).first()

        request.tenant = tenant
        logger.debug("Auto-resolved tenant: %s", tenant.name if tenant else 'None')
        return self.get_response(request)
