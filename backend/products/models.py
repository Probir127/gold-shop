from django.db import models

class Category(models.Model):
    name = models.CharField(max_length=50)
    slug = models.SlugField(unique=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Categories"

class Product(models.Model):
    PURITY_CHOICES = [
        ('22K', '22 Karat'),
        ('21K', '21 Karat'),
        ('18K', '18 Karat'),
    ]

    name = models.CharField(max_length=200)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    description = models.TextField(blank=True)
    weight = models.DecimalField(max_digits=6, decimal_places=2)  # grams
    purity = models.CharField(max_length=3, choices=PURITY_CHOICES, default='22K')
    making_charge_per_gram = models.IntegerField(default=500)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    in_stock = models.BooleanField(default=True)
    is_bestseller = models.BooleanField(default=False)
    is_new = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def estimated_price(self):
        # This will be calculated dynamically based on daily rates in Serializer
        return 0

    def __str__(self):
        return self.name
