from rest_framework import viewsets, filters
from core.permissions import IsStaffForWrite
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer
from rates.models import GoldRate

from core.models import Tenant

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('name', 'id')
    serializer_class = CategorySerializer
    lookup_field = 'slug'
    permission_classes = [IsStaffForWrite]

    def get_queryset(self):
        qs = super().get_queryset()
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            slug = self.request.headers.get('X-Tenant-Slug') or self.request.query_params.get('tenant')
            if slug:
                tenant = Tenant.objects.filter(slug=slug, is_active=True).first()
        if tenant:
            qs = qs.filter(tenant=tenant)
        return qs

    def perform_create(self, serializer):
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            slug = self.request.headers.get('X-Tenant-Slug') or self.request.query_params.get('tenant')
            if slug:
                tenant = Tenant.objects.filter(slug=slug, is_active=True).first()
        serializer.save(tenant=tenant or Tenant.objects.first())

class ProductViewSet(viewsets.ModelViewSet):
    # Default queryset — select_related('category') avoids N+1 on category fields
    queryset = Product.objects.select_related('category').filter(in_stock=True).order_by('-created_at', 'id')
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'category__name']
    permission_classes = [IsStaffForWrite]

    def get_queryset(self):
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            slug = self.request.headers.get('X-Tenant-Slug') or self.request.query_params.get('tenant')
            if slug:
                tenant = Tenant.objects.filter(slug=slug, is_active=True).first()

        if self.request.user.is_staff:
            qs = Product.objects.select_related('category').all().order_by('-created_at', 'id')
        else:
            qs = Product.objects.select_related('category').filter(in_stock=True).order_by('-created_at', 'id')

        if tenant:
            qs = qs.filter(tenant=tenant)

        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__slug=category)
        return qs

    def perform_create(self, serializer):
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            slug = self.request.headers.get('X-Tenant-Slug') or self.request.query_params.get('tenant')
            if slug:
                tenant = Tenant.objects.filter(slug=slug, is_active=True).first()
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

        # Base Query — select_related avoids per-result category hit
        qs = Product.objects.select_related('category').filter(in_stock=True)

        # Text Search
        if query:
            qs = qs.filter(
                Q(name__icontains=query) |
                Q(description__icontains=query) |
                Q(category__name__icontains=query)
            )

        # Filters
        if purity:
            qs = qs.filter(purity__iexact=purity)  # Case insensitive just in case

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

        # Limit results for performance
        qs = qs[:20]

        serializer = self.get_serializer(qs, many=True)
        return Response({
            'count': len(serializer.data),
            'results': serializer.data
        })
