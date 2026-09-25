from rest_framework import viewsets, filters
from core.permissions import IsStaffForWrite
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer
from rates.models import GoldRate
from core.models import Tenant

# ---------------------------------------------------------------------------
# Tenant resolution helper
# ---------------------------------------------------------------------------
_DEFAULT_TENANT_SLUG = 'sahara-gold'

def _resolve_tenant(request):
    """
    Returns the Tenant for the current request using this priority order:
      1. request.tenant set by TenantMiddleware (authenticated users)
      2. X-Tenant-Slug request header
      3. ?tenant= query param
      4. Default 'sahara-gold' tenant (guarantees public store never leaks
         cross-tenant data when no context is provided)
    """
    tenant = getattr(request, 'tenant', None)
    if tenant:
        return tenant

    slug = (
        request.headers.get('X-Tenant-Slug', '').strip()
        or request.query_params.get('tenant', '').strip()
        or _DEFAULT_TENANT_SLUG
    )
    return Tenant.objects.filter(slug=slug, is_active=True).first()


# ---------------------------------------------------------------------------
# Category ViewSet
# ---------------------------------------------------------------------------
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('name', 'id')
    serializer_class = CategorySerializer
    lookup_field = 'pk'
    permission_classes = [IsStaffForWrite]

    def get_queryset(self):
        qs = super().get_queryset()
        tenant = _resolve_tenant(self.request)
        if tenant:
            qs = qs.filter(tenant=tenant)
        return qs

    def perform_create(self, serializer):
        tenant = _resolve_tenant(self.request)
        serializer.save(tenant=tenant or Tenant.objects.first())


# ---------------------------------------------------------------------------
# Product ViewSet
# ---------------------------------------------------------------------------
class ProductViewSet(viewsets.ModelViewSet):
    # Default queryset — select_related('category') avoids N+1 on category fields
    queryset = Product.objects.select_related('category').filter(in_stock=True).order_by('-created_at', 'id')
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'category__name']
    permission_classes = [IsStaffForWrite]

    def get_queryset(self):
        tenant = _resolve_tenant(self.request)

        # Staff see all products (incl. out-of-stock); public only sees in-stock
        if self.request.user.is_staff:
            qs = Product.objects.select_related('category').all().order_by('-created_at', 'id')
        else:
            qs = Product.objects.select_related('category').filter(in_stock=True).order_by('-created_at', 'id')

        if tenant:
            qs = qs.filter(tenant=tenant)

        # Optional category filter — accepts numeric ID or slug
        category = self.request.query_params.get('category', '').strip()
        if category:
            if category.isdigit():
                qs = qs.filter(category_id=int(category))
            else:
                qs = qs.filter(category__slug=category)

        return qs

    def perform_create(self, serializer):
        tenant = _resolve_tenant(self.request)
        serializer.save(tenant=tenant or Tenant.objects.first())

    def get_serializer_context(self):
        """Inject the current gold rate once per request into all serializer instances."""
        ctx = super().get_serializer_context()
        # Cache on the request object so multiple calls within the same request
        # don't hit the DB more than once.
        if not hasattr(self.request, '_gold_rate_cache'):
            self.request._gold_rate_cache = GoldRate.objects.order_by('-date', '-updated_at').first()
        ctx['gold_rate'] = self.request._gold_rate_cache
        return ctx

    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Advanced search endpoint with filtering.
        GET /api/products/search/?q=ring&purity=22K&min_weight=3
        """
        query = request.query_params.get('q', '').strip()
        purity = request.query_params.get('purity', None)
        min_weight = request.query_params.get('min_weight', None)
        max_weight = request.query_params.get('max_weight', None)

        tenant = _resolve_tenant(request)

        # Base query scoped to tenant
        qs = Product.objects.select_related('category').filter(in_stock=True)
        if tenant:
            qs = qs.filter(tenant=tenant)

        # Text search
        if query:
            qs = qs.filter(
                Q(name__icontains=query) |
                Q(description__icontains=query) |
                Q(category__name__icontains=query)
            )

        if purity:
            qs = qs.filter(purity__iexact=purity)

        if min_weight:
            try:
                qs = qs.filter(weight__gte=float(min_weight))
            except ValueError:
                pass

        if max_weight:
            try:
                qs = qs.filter(weight__lte=float(max_weight))
            except ValueError:
                pass

        qs = qs[:20]
        serializer = self.get_serializer(qs, many=True)
        return Response({
            'count': len(serializer.data),
            'results': serializer.data
        })
