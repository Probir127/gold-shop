from django.utils.text import slugify
from rest_framework import serializers
from .models import Product, Category
from rates.models import GoldRate

class CategorySerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False, allow_blank=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']

    def validate(self, attrs):
        name = attrs.get('name') or getattr(self.instance, 'name', None)
        slug = attrs.get('slug') or getattr(self.instance, 'slug', None)

        if name and not slug:
            base_slug = slugify(name)
            slug = base_slug
            counter = 2
            while Category.objects.filter(slug=slug).exclude(pk=getattr(self.instance, 'pk', None)).exists():
                slug = f'{base_slug}-{counter}'
                counter += 1
            attrs['slug'] = slug

        return attrs

class ProductSerializer(serializers.ModelSerializer):
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    current_price = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'category', 'category_name', 'category_slug',
            'description', 'weight', 'purity', 'making_charge_per_gram',
            'image', 'in_stock', 'is_bestseller', 'is_new', 'current_price'
        ]

    def get_current_price(self, obj):
        """Calculate price using the gold rate injected into context (1 query per request)."""
        try:
            # Rate is pre-fetched once by the view and stored in serializer context
            # to avoid an N+1 query (one DB hit per product).
            rate_obj = self.context.get('gold_rate')
            if rate_obj is None:
                # Fallback for standalone usage (e.g., order creation)
                rate_obj = GoldRate.objects.order_by('-date', '-updated_at').first()
            if not rate_obj:
                return None

            rate = 0
            if obj.purity == '22K': rate = rate_obj.rate_22k
            elif obj.purity == '21K': rate = rate_obj.rate_21k
            elif obj.purity == '18K': rate = rate_obj.rate_18k
            else: rate = rate_obj.rate_traditional

            gold_price = float(obj.weight) * rate
            making_cost = float(obj.weight) * obj.making_charge_per_gram
            return round(gold_price + making_cost)
        except Exception:
            return None
