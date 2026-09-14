from django.db import models

class HeroBanner(models.Model):
    title = models.CharField(max_length=200)
    subtitle = models.CharField(max_length=300, blank=True)
    image = models.ImageField(upload_to='cms/hero/')
    cta_text = models.CharField(max_length=50, default="Shop Now")
    cta_link = models.CharField(max_length=200, default="/shop")
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title

class Testimonial(models.Model):
    name = models.CharField(max_length=100)
    role = models.CharField(max_length=100, blank=True, help_text="e.g. Verified Buyer")
    content = models.TextField()
    image = models.ImageField(upload_to='cms/testimonials/', blank=True, null=True)
    rating = models.IntegerField(default=5)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return self.name

class SocialPost(models.Model):
    platform = models.CharField(max_length=20, choices=[('instagram', 'Instagram'), ('facebook', 'Facebook')])
    image = models.ImageField(upload_to='cms/social/')
    link = models.URLField(blank=True)
    caption = models.CharField(max_length=200, blank=True)
    likes = models.CharField(max_length=20, default="1.2k")
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.platform} - {self.caption[:30]}"

class SiteStat(models.Model):
    label = models.CharField(max_length=50) # e.g. "Happy Clients"
    value = models.CharField(max_length=50) # e.g. "12k+"
    icon_name = models.CharField(max_length=50, help_text="Lucide React icon name")
    order = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['order']

class LuxuryFeature(models.Model):
    title = models.CharField(max_length=100)
    description = models.TextField()
    icon_name = models.CharField(max_length=50)
    
class Collection(models.Model):
    """Featured collections on homepage"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='cms/collections/')
    link = models.CharField(max_length=200)
    is_featured = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['order']

class SiteSettings(models.Model):
    """Global singleton settings"""
    site_name = models.CharField(max_length=100, default="Sahara Gold")
    contact_phone = models.CharField(max_length=50, default="01799-281878")
    contact_email = models.CharField(max_length=100, default="contact@saharagold.com")
    address = models.TextField(default="Bashundhara City, Level-7")
    facebook_url = models.URLField(blank=True)
    instagram_url = models.URLField(blank=True)
    
    def __str__(self):
        return "Site Settings"

    def save(self, *args, **kwargs):
        if not self.pk and SiteSettings.objects.exists():
            return # Prevent creating multiple instances
        return super(SiteSettings, self).save(*args, **kwargs)
