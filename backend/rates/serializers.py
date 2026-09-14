from rest_framework import serializers
from .models import GoldRate

class GoldRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoldRate
        fields = '__all__'
