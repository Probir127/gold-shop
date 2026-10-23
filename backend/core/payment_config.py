"""Public checkout choices and staff-only, write-only gateway configuration."""
import base64
import hashlib
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.db import transaction
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser, AllowAny
from .models import PaymentConfiguration, StorefrontContent

def cipher():
    key = getattr(settings, 'PAYMENT_ENCRYPTION_KEY', '')
    if not key:
        key = base64.urlsafe_b64encode(hashlib.sha256(('sahara-payments:' + settings.SECRET_KEY).encode()).digest())
    return Fernet(key)

def gateway_credentials():
    config = PaymentConfiguration.objects.filter(pk=1).first()
    if not config or not config.ssl_enabled or not config.ssl_store_id or not config.ssl_secret_encrypted:
        return None
    try:
        return config.ssl_store_id, cipher().decrypt(config.ssl_secret_encrypted.encode()).decode()
    except InvalidToken:
        return None

def public_configuration():
    config = PaymentConfiguration.objects.filter(pk=1).first() or PaymentConfiguration()
    content = StorefrontContent.objects.filter(pk=1).first()
    phone = (content.content.get('contact_phone') if content else None) or getattr(settings, 'STORE_PHONE', '')
    return {'manual_enabled': True, 'ssl_enabled': bool(gateway_credentials()),
            'contact_phone': config.contact_phone or phone,
            'merchant_number': config.merchant_number, 'instructions': config.instructions}

class ConfigurationSerializer(serializers.Serializer):
    contact_phone = serializers.RegexField(r'^[+0-9 ()-]{7,30}$', required=False)
    merchant_number = serializers.RegexField(r'^[+0-9 ()-]{7,30}$', required=False, allow_blank=True)
    instructions = serializers.CharField(max_length=3000, required=False)
    ssl_enabled = serializers.BooleanField(required=False)
    ssl_store_id = serializers.CharField(max_length=150, required=False, allow_blank=True)
    ssl_store_password = serializers.CharField(max_length=500, required=False, allow_blank=True, write_only=True)

class PublicPaymentConfigurationView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        response = Response(public_configuration())
        response['Cache-Control'] = 'no-store'
        return response

class AdminPaymentConfigurationView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request):
        config = PaymentConfiguration.objects.filter(pk=1).first() or PaymentConfiguration()
        return Response({**public_configuration(), 'ssl_enabled': config.ssl_enabled,
                         'ssl_store_id': config.ssl_store_id, 'ssl_secret_configured': bool(config.ssl_secret_encrypted)})
    @transaction.atomic
    def patch(self, request):
        serializer = ConfigurationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        config, _ = PaymentConfiguration.objects.select_for_update().get_or_create(pk=1)
        values = dict(serializer.validated_data)
        password = values.pop('ssl_store_password', '')
        for field, value in values.items(): setattr(config, field, value)
        if password: config.ssl_secret_encrypted = cipher().encrypt(password.encode()).decode()
        if config.ssl_enabled and (not config.ssl_store_id or not config.ssl_secret_encrypted or config.ssl_store_id.lower() == 'testbox'):
            raise serializers.ValidationError('Enter live SSLCommerz credentials before enabling online payment.')
        config.save()
        return self.get(request)
