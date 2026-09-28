"""One effective price source for catalog, checkout, AI, and public rates."""
from datetime import timedelta
from zoneinfo import ZoneInfo
from django.db import transaction
from django.utils import timezone
from .models import GoldRate, RateControl
from .services import fetch_live_gold_price

RATE_FIELDS = ('rate_22k', 'rate_21k', 'rate_18k', 'rate_traditional')


def store_today():
    return timezone.localdate(timezone=ZoneInfo('Asia/Dhaka'))


def control():
    return RateControl.objects.get_or_create(pk=1)[0]


def current_record():
    return GoldRate.objects.filter(date__lte=store_today()).order_by('-date', '-updated_at').first()


def effective_rate(force=False, mode=None):
    control()
    # A DB lock serializes auto refreshes and manual publishes across workers.
    # Manual saves cannot be overwritten by an already-running provider request.
    with transaction.atomic():
        config = RateControl.objects.select_for_update().get(pk=1)
        if mode is not None:
            config.mode = mode
            if mode == 'manual':
                config.last_error = ''
        now = timezone.now()
        due = not config.last_attempt_at or now - config.last_attempt_at >= timedelta(seconds=120)
        if force or (config.mode == 'auto' and due):
            config.last_attempt_at = now
            try:
                market = fetch_live_gold_price()
                if market.get('status') != 'success' or not all(
                    isinstance(market.get(key), (int, float)) and 0 < market[key] < 100000000
                    for key in RATE_FIELDS
                ):
                    raise ValueError('Live provider unavailable or returned invalid rates.')
                GoldRate.objects.update_or_create(date=store_today(), defaults={key: round(market[key]) for key in RATE_FIELDS})
                config.last_synced_at = timezone.now()
                config.last_error = ''
            except Exception:
                config.last_error = 'Live refresh failed. Keeping the last published rates.'
        config.save()
        obj = current_record()
        if obj:
            obj.pricing_mode = config.mode
            obj.is_stale = config.mode == 'auto' and (bool(config.last_error) or not config.last_synced_at)
        return obj, config


def publish_manual(data):
    control()
    with transaction.atomic():
        config = RateControl.objects.select_for_update().get(pk=1)
        obj, _ = GoldRate.objects.update_or_create(date=store_today(), defaults={key: data[key] for key in RATE_FIELDS})
        config.mode = 'manual'
        config.last_error = ''
        config.save()
        return obj
