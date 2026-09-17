from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsStaffForWrite(BasePermission):
    """Allow public reads while reserving mutations for staff users."""

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or bool(
            request.user and request.user.is_authenticated and request.user.is_staff
        )


class IsTenantManagerOrStaff(BasePermission):
    """Allow tenant managers/admins or platform staff to mutate tenant data."""

    allowed_roles = {'admin', 'manager'}

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff:
            return True
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return False
        if tenant.owner_id == user.id:
            return True
        from .models import TenantMembership
        return TenantMembership.objects.filter(
            tenant=tenant, user=user, role__in=self.allowed_roles
        ).exists()

class IsTenantMember(BasePermission):
    """Require an authenticated user who belongs to the active tenant."""

    def has_permission(self, request, view):
        user = request.user
        tenant = getattr(request, 'tenant', None)
        if not user or not user.is_authenticated or not tenant:
            return False
        if user.is_staff or tenant.owner_id == user.id:
            return True
        from .models import TenantMembership
        return TenantMembership.objects.filter(tenant=tenant, user=user).exists()


class IsInvoiceHTMLAccessAllowed(BasePermission):
    """Allow staff invoice pages or signed, customer-only invoice links."""

    def has_permission(self, request, view):
        copy_type = request.query_params.get('copy', 'customer').lower()
        if copy_type in {'admin', 'store'} or (
            request.user and request.user.is_authenticated
        ):
            return IsTenantManagerOrStaff().has_permission(request, view)

        from .utils.invoice_access import validate_invoice_access_token
        return validate_invoice_access_token(
            request.query_params.get('token'),
            'invoice',
            getattr(view, 'kwargs', {}).get('pk'),
        )
