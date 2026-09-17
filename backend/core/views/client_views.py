from __future__ import annotations
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from django.db.models import Q
from django.contrib.postgres.search import TrigramSimilarity
from ..models import Client
from ..serializers import ClientSerializer
from core.permissions import IsTenantManagerOrStaff, IsTenantMember


class ClientListCreateView(ListCreateAPIView):
    serializer_class = ClientSerializer
    permission_classes = [IsTenantMember]
    search_fields    = ['name', 'phone', 'service_selected']
    ordering_fields  = ['created_at', 'status']

    def get_queryset(self):
        tenant = self.request.tenant
        if not tenant:
            return Client.objects.none()
        qs = Client.objects.filter(tenant=tenant)

        search_query = self.request.query_params.get('search', '').strip()
        if search_query:
            # Leverage PostgreSQL GIN trigram indexes (client_name_trgm_idx, client_phone_trgm_idx)
            qs = qs.annotate(
                name_sim=TrigramSimilarity('name', search_query),
                phone_sim=TrigramSimilarity('phone', search_query),
            ).filter(
                Q(name__icontains=search_query) |
                Q(phone__icontains=search_query) |
                Q(service_selected__icontains=search_query) |
                Q(name_sim__gt=0.2) |
                Q(phone_sim__gt=0.3)
            )
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        mode = self.request.query_params.get('mode')
        if mode:
            qs = qs.filter(conversation_mode=mode)
        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class ClientDetailView(RetrieveUpdateAPIView):
    serializer_class = ClientSerializer
    permission_classes = [IsTenantManagerOrStaff]
    lookup_field     = 'pk'

    def get_queryset(self):
        tenant = self.request.tenant
        if not tenant:
            return Client.objects.none()
        return Client.objects.filter(tenant=tenant)

    def perform_update(self, serializer):
        serializer.save(tenant=self.request.tenant)
