from rest_framework import viewsets, filters, serializers, status
from core.permissions import IsStaffForWrite
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import transaction
from django.db.models.deletion import ProtectedError
from django.db.models import Q
from .models import Product, Category, ProductImage
from .serializers import ProductSerializer, CategorySerializer
from rates.pricing import effective_rate
from core.models import Tenant

# ---------------------------------------------------------------------------
# Tenant resolution helper
# ---------------------------------------------------------------------------
_DEFAULT_TENANT_SLUG = 'sahara-gold'

def _resolve_tenant(request):
    """
    Returns the Tenant for the current request:
      1. request.tenant set by TenantMiddleware (authenticated users)
      2. Valid active tenant matching X-Tenant-Slug header
      3. Valid active tenant matching ?tenant= query param
    """
    tenant = getattr(request, 'tenant', None)
    if tenant:
        return tenant

    slug = (
        request.headers.get('X-Tenant-Slug', '').strip()
        or request.query_params.get('tenant', '').strip()
    )
    if slug:
        return Tenant.objects.filter(slug=slug, is_active=True).first()

    return None


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
            if self.request.user.is_staff:
                Category.objects.filter(tenant__isnull=True).update(tenant=tenant)
                qs = qs.filter(tenant=tenant)
            else:
                qs = qs.filter(Q(tenant=tenant) | Q(tenant__isnull=True))
        return qs

    def perform_create(self, serializer):
        tenant = _resolve_tenant(self.request)
        serializer.save(tenant=tenant or Tenant.objects.first())

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response({'detail': 'Move or delete products in this category first.'}, status=status.HTTP_409_CONFLICT)


# ---------------------------------------------------------------------------
# Product ViewSet
# ---------------------------------------------------------------------------
class ProductViewSet(viewsets.ModelViewSet):
    # Default queryset — select_related('category') avoids N+1 on category fields
    queryset = Product.objects.select_related('category').prefetch_related('gallery_images').filter(in_stock=True).order_by('-created_at', 'id')
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'category__name']
    permission_classes = [IsStaffForWrite]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        tenant = _resolve_tenant(self.request)

        # Staff see all products (incl. out-of-stock); public only sees in-stock
        if self.request.user.is_staff:
            qs = Product.objects.select_related('category').prefetch_related('gallery_images').all().order_by('-created_at', 'id')
        else:
            qs = Product.objects.select_related('category').prefetch_related('gallery_images').filter(in_stock=True).order_by('-created_at', 'id')

        if tenant:
            if self.request.user.is_staff:
                # Claim unassigned products to this store tenant so admin can manage, edit, upload photos, or delete them
                Product.objects.filter(tenant__isnull=True).update(tenant=tenant)
                qs = qs.filter(tenant=tenant)
            else:
                qs = qs.filter(Q(tenant=tenant) | Q(tenant__isnull=True))

        # Optional category filter — accepts numeric ID, slug, or name (case-insensitive)
        category = self.request.query_params.get('category', '').strip()
        if category and category.lower() != 'all':
            if category.isdigit():
                cat_id = int(category)
                cat_obj = Category.objects.filter(pk=cat_id).first()
                if cat_obj:
                    qs = qs.filter(
                        Q(category_id=cat_id) |
                        Q(category__name__iexact=cat_obj.name) |
                        Q(category__slug__iexact=cat_obj.slug)
                    )
                else:
                    qs = qs.filter(category_id=cat_id)
            else:
                qs = qs.filter(
                    Q(category__slug__iexact=category) |
                    Q(category__name__iexact=category)
                )

        return qs

    def perform_create(self, serializer):
        tenant = _resolve_tenant(self.request)
        serializer.save(tenant=tenant or Tenant.objects.first())

    def perform_update(self, serializer):
        tenant = _resolve_tenant(self.request)
        if tenant:
            serializer.save(tenant=tenant)
        else:
            serializer.save()

    def _validate_media(self, request, instance=None):
        uploads = request.FILES.getlist('additional_images')
        primary = request.FILES.get('image')
        removals = request.data.getlist('remove_image_ids') if hasattr(request.data, 'getlist') else request.data.get('remove_image_ids', [])
        if not isinstance(removals, list):
            removals = [removals]
        try:
            removal_ids = {int(value) for value in removals}
        except (TypeError, ValueError):
            raise serializers.ValidationError({'remove_image_ids': 'Invalid image ID.'})
        if instance and removal_ids != set(instance.gallery_images.filter(id__in=removal_ids).values_list('id', flat=True)):
            raise serializers.ValidationError({'remove_image_ids': 'Image does not belong to this product.'})
        remaining = instance.gallery_images.exclude(id__in=removal_ids).count() if instance else 0
        if remaining + len(uploads) > 8:
            raise serializers.ValidationError({'additional_images': 'Maximum 8 additional photos per product.'})
        for upload in [primary, *uploads]:
            if upload and (upload.size > 10 * 1024 * 1024 or not upload.content_type.startswith('image/')):
                raise serializers.ValidationError({'images': 'Photos must be images under 10 MB each.'})
        return uploads, removal_ids

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        uploads, _ = self._validate_media(request)
        response = super().create(request, *args, **kwargs)
        product = Product.objects.get(pk=response.data['id'])
        if not product.image and uploads:
            product.image = uploads.pop(0)
            product.save(update_fields=['image'])
        for position, upload in enumerate(uploads):
            ProductImage.objects.create(product=product, image=upload, position=position)
        response.data = self.get_serializer(product).data
        return response

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        uploads, removal_ids = self._validate_media(request, instance)
        response = super().update(request, *args, **kwargs)
        if not instance.image and uploads:
            instance.image = uploads.pop(0)
            instance.save(update_fields=['image'])
        if removal_ids:
            instance.gallery_images.filter(id__in=removal_ids).delete()
        next_position = instance.gallery_images.count()
        for position, upload in enumerate(uploads, start=next_position):
            ProductImage.objects.create(product=instance, image=upload, position=position)
        instance._prefetched_objects_cache.pop('gallery_images', None)
        response.data = self.get_serializer(instance).data
        return response

    def get_serializer_context(self):
        """Inject the current gold rate once per request into all serializer instances."""
        ctx = super().get_serializer_context()
        # Cache on the request object so multiple calls within the same request
        # don't hit the DB more than once.
        if not hasattr(self.request, '_gold_rate_cache'):
            self.request._gold_rate_cache = effective_rate()[0]
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
        qs = Product.objects.select_related('category').prefetch_related('gallery_images').filter(in_stock=True)
        category = request.query_params.get('category', '').strip()
        if tenant:
            qs = qs.filter(tenant=tenant)

        # Text search
        if query:
            qs = qs.filter(
                Q(name__icontains=query) |
                Q(description__icontains=query) |
                Q(category__name__icontains=query)
            )

        if category and category.lower() != 'all':
            if category.isdigit():
                cat_id = int(category)
                cat_obj = Category.objects.filter(pk=cat_id).first()
                if cat_obj:
                    qs = qs.filter(
                        Q(category_id=cat_id) |
                        Q(category__name__iexact=cat_obj.name) |
                        Q(category__slug__iexact=cat_obj.slug)
                    )
                else:
                    qs = qs.filter(category_id=cat_id)
            else:
                qs = qs.filter(
                    Q(category__slug__iexact=category) |
                    Q(category__name__iexact=category)
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
