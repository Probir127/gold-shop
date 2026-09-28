from rest_framework import serializers
from .models import GoldRate

class GoldRateSerializer(serializers.ModelSerializer):
    pricing_mode = serializers.CharField(read_only=True)
    is_stale = serializers.BooleanField(read_only=True)

    def validate(self, attrs):
        for key in ('rate_22k', 'rate_21k', 'rate_18k', 'rate_traditional'):
            if key in attrs and attrs[key] <= 0:
                raise serializers.ValidationError({key: 'Rate must be greater than zero.'})
        return attrs

    class Meta:
        model = GoldRate
        fields = '__all__'
