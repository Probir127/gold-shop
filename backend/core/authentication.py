from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
import logging

logger = logging.getLogger(__name__)


class SafeJWTAuthentication(JWTAuthentication):
    """
    Resilient JWT Authentication:
    Does not crash public endpoints with a 401 Unauthorized when a client
    sends an expired or invalid Bearer token. Instead, it yields None
    (treating the request as AnonymousUser).
    
    Protected endpoints enforcing IsAuthenticated or IsAdminUser will still
    properly deny AnonymousUser with 401/403.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except (InvalidToken, AuthenticationFailed) as err:
            logger.debug("Bearer token failed validation (%s) — falling back to AnonymousUser", err)
            return None
