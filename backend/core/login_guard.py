"""Account failure lockout in addition to per-IP throttles.

Production workers must share the configured Redis cache.
"""
import hashlib
from django.core.cache import cache
from rest_framework.exceptions import Throttled
WINDOW = 15 * 60
LIMIT = 5

def login_key(identifier, user=None):
    identity = f'user:{user.pk}' if user else f'unknown:{identifier.strip().casefold()}'
    return 'login-failures:' + hashlib.sha256(identity.encode()).hexdigest()

def check_login(key):
    if cache.get(key, 0) >= LIMIT:
        raise Throttled(wait=WINDOW, detail='Too many sign-in attempts. Please try again later.')

def failed_login(key):
    if not cache.add(key, 1, timeout=WINDOW):
        try:
            cache.incr(key)
        except ValueError:  # Expired between add and increment.
            cache.add(key, 1, timeout=WINDOW)

def successful_login(key):
    cache.delete(key)
