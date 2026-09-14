from __future__ import annotations
from rest_framework import generics
from ..models import Service
from ..serializers import ServiceSerializer

class ServiceListView(generics.ListAPIView):
    serializer_class = ServiceSerializer

    def get_queryset(self):
        tenant = self.request.tenant
        if not tenant:
            return Service.objects.none()
        return Service.objects.filter(tenant=tenant, is_active=True).order_by('name')
