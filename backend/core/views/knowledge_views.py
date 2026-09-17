from __future__ import annotations
from rest_framework import generics, views
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from ..models import KnowledgeSource
from ..serializers import KnowledgeSourceSerializer
from ..permissions import IsTenantManagerOrStaff

class KnowledgeSourceListCreateView(generics.ListCreateAPIView):
    serializer_class = KnowledgeSourceSerializer
    permission_classes = [IsTenantManagerOrStaff]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return KnowledgeSource.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class KnowledgeSourceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = KnowledgeSourceSerializer
    permission_classes = [IsTenantManagerOrStaff]

    def get_queryset(self):
        return KnowledgeSource.objects.filter(tenant=self.request.tenant)


import threading
import logging

logger = logging.getLogger(__name__)

def _async_ingest_wrapper(source_id):
    from ..models import KnowledgeSource
    from ..utils.knowledge_engine import ingest_source
    from django.db import connection
    try:
        source = KnowledgeSource.objects.get(pk=source_id)
        ingest_source(source)
    except Exception as e:
        logger.error(f"Background ingestion failed for source {source_id}: {e}")
    finally:
        connection.close()

class KnowledgeSourceSyncView(views.APIView):
    """
    Manually trigger a sync for a specific source asynchronously to avoid HTTP timeouts.
    """
    permission_classes = [IsTenantManagerOrStaff]

    def post(self, request, pk):
        try:
            source = KnowledgeSource.objects.get(pk=pk, tenant=request.tenant)
            
            # Immediately mark status as 'processing' to reflect in frontend
            source.status = 'processing'
            source.save(update_fields=['status'])
            
            # Launch background thread
            thread = threading.Thread(target=_async_ingest_wrapper, args=(source.id,))
            thread.daemon = True
            thread.start()
            
            return Response({'status': 'processing', 'message': 'Sync started in the background.'})
        except KnowledgeSource.DoesNotExist:
            return Response({'error': 'Source not found.'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=400)
