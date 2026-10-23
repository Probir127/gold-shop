"""Public, explicitly allowlisted storefront content. Never store API secrets here."""
import json
import re
from pathlib import Path
from urllib.parse import urlsplit
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import StorefrontContent
from .branding import public_brand_text
from .permissions import IsStaffForWrite

DEFAULTS = json.loads((Path(__file__).with_name('storefront-defaults.json')).read_text())

class ContentSerializer(serializers.Serializer):
    def to_internal_value(self, data):
        if not isinstance(data, dict):
            raise serializers.ValidationError('Expected an object.')
        unknown = set(data) - set(DEFAULTS)
        if unknown:
            raise serializers.ValidationError({'detail': 'Unknown content fields.'})
        cleaned = {}
        for key, value in data.items():
            if not isinstance(value, str) or len(value) > (30000 if key.endswith('_policy') else 3000):
                raise serializers.ValidationError({key: 'Enter text within the allowed length.'})
            value = value.strip()
            if key != 'ga4_measurement_id' and not value:
                raise serializers.ValidationError({key: 'This field cannot be blank.'})
            if key.endswith('_image'):
                parsed = urlsplit(value)
                local = value.startswith('/') and not value.startswith('//') and '\\' not in value
                if not local and not (parsed.scheme == 'https' and parsed.hostname and not parsed.username and not parsed.password):
                    raise serializers.ValidationError({key: 'Use a local /path or an HTTPS image URL.'})
            if key == 'contact_email':
                value = serializers.EmailField().run_validation(value)
            if key == 'contact_phone' and not re.fullmatch(r'[+0-9 ()-]{7,30}', value):
                raise serializers.ValidationError({key: 'Enter a valid telephone number.'})
            if key == 'ga4_measurement_id' and value and not re.fullmatch(r'G-[A-Z0-9]{4,20}', value):
                raise serializers.ValidationError({key: 'Use a GA4 measurement ID beginning G-.'})
            cleaned[key] = value
        return cleaned

class StorefrontContentView(APIView):
    permission_classes = [IsStaffForWrite]
    def get(self, request):
        record = StorefrontContent.objects.filter(pk=1).first()
        content = {key: public_brand_text(value) for key, value in {**DEFAULTS, **(record.content if record else {})}.items()}
        response = Response({**content, 'updated_at': record.updated_at if record else None})
        response['Cache-Control'] = 'no-cache'
        return response
    def patch(self, request):
        serializer = ContentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        from django.db import transaction
        with transaction.atomic():
            record, _ = StorefrontContent.objects.select_for_update().get_or_create(pk=1)
            record.content = {**record.content, **serializer.validated_data}
            record.full_clean()
            record.save()
        return self.get(request)
