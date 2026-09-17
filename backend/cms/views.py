from rest_framework import viewsets, mixins
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from .models import HeroBanner, Testimonial, SocialPost, SiteStat, LuxuryFeature, Collection, SiteSettings
from .serializers import (
    HeroBannerSerializer, TestimonialSerializer, SocialPostSerializer,
    SiteStatSerializer, LuxuryFeatureSerializer, CollectionSerializer, SiteSettingsSerializer
)

class CMSViewSet(viewsets.ViewSet):
    """
    Unified endpoint for public CMS content.
    """
    permission_classes = [] 

    @action(detail=False, methods=['get'])
    @method_decorator(cache_page(60 * 10))
    def homepage(self, request):
        """Fetch all homepage content in one go."""
        hero = HeroBanner.objects.filter(is_active=True)
        testimonials = Testimonial.objects.filter(is_active=True)[:5]
        social = SocialPost.objects.filter(is_active=True)[:6]
        stats = SiteStat.objects.all()
        features = LuxuryFeature.objects.all()
        collections = Collection.objects.filter(is_featured=True)
        settings = SiteSettings.objects.first()

        data = {
            'hero': HeroBannerSerializer(hero, many=True).data,
            'testimonials': TestimonialSerializer(testimonials, many=True).data,
            'social_feed': SocialPostSerializer(social, many=True).data,
            'stats': SiteStatSerializer(stats, many=True).data,
            'features': LuxuryFeatureSerializer(features, many=True).data,
            'collections': CollectionSerializer(collections, many=True).data,
            'settings': SiteSettingsSerializer(settings).data if settings else None
        }
        return Response(data)
