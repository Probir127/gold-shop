from django.urls import path
from .sitemap import sitemap
urlpatterns = [path('sitemap.xml', sitemap)]
