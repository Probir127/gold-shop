from __future__ import annotations
"""
Security utilities for GrownK backend.
Handles WhatsApp webhook HMAC signature verification.
"""
import hmac
import hashlib
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def verify_webhook_signature(request) -> bool:
    """
    Verify that the webhook payload was sent by Meta.
    Uses the X-Hub-Signature-256 header with your Meta App Secret.

    IMPORTANT: Uses request.body (raw bytes) before any JSON parsing.
    Uses hmac.compare_digest for constant-time comparison (prevents timing attacks).

    Returns True if valid, False otherwise.
    If META_APP_SECRET is not configured, reject the request. This prevents an
    accidentally unprotected webhook in production.
    """
    app_secret = getattr(settings, 'META_APP_SECRET', None)
    if not app_secret:
        logger.warning(
            "META_APP_SECRET not configured — rejecting webhook signature verification."
        )
        return False

    signature_header = request.headers.get('X-Hub-Signature-256', '')
    if not signature_header:
        logger.warning("Webhook POST missing X-Hub-Signature-256 header")
        return False

    try:
        sha_name, signature_hash = signature_header.split('=', 1)
    except ValueError:
        logger.warning(f"Malformed X-Hub-Signature-256 header: {signature_header}")
        return False

    if sha_name != 'sha256':
        logger.warning(f"Unexpected signature algorithm: {sha_name}")
        return False

    # Compute expected HMAC using raw body bytes
    expected = hmac.new(
        app_secret.encode('utf-8'),
        msg=request.body,
        digestmod=hashlib.sha256
    ).hexdigest()

    # Constant-time comparison — prevents timing attacks
    if not hmac.compare_digest(expected, signature_hash):
        logger.warning(
            f"Webhook signature mismatch from {request.META.get('REMOTE_ADDR', 'unknown')}"
        )
        return False

    return True
