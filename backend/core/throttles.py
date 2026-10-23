"""Bounded authentication attempts. Use shared Redis cache across production workers."""
from rest_framework.throttling import SimpleRateThrottle


class LoginThrottle(SimpleRateThrottle):
    scope = 'auth_login'
    rate = '10/min'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class VerificationThrottle(LoginThrottle):
    scope = 'auth_verification'
    rate = '5/hour'
