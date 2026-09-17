from rest_framework import viewsets, filters
from core.permissions import IsStaffForWrite
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = 'slug'
    permission_classes = [IsStaffForWrite]

class ProductViewSet(viewsets.ModelViewSet):
    # Default queryset for standard router usage
    queryset = Product.objects.filter(in_stock=True).order_by('-created_at', 'id')
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'category__name']
    permission_classes = [IsStaffForWrite]

    def get_queryset(self):
        if self.request.user.is_staff:
               qs = Product.objects.all().order_by('-created_at', 'id')
        else:
               qs = Product.objects.filter(in_stock=True).order_by('-created_at', 'id')

        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__slug=category)
        return qs

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
        
        # Base Query
        qs = Product.objects.filter(in_stock=True)
        
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
