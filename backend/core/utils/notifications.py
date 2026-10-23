"""Store-owner business notifications, separate from customer authentication."""
import logging
from django.conf import settings
from .mailer import send_email_resilient

logger = logging.getLogger(__name__)


def notify_store_owner(subject, body, attachments=None):
    recipient = getattr(settings, 'ADMIN_NOTIFICATION_EMAIL', 'saharagold19@gmail.com')
    ok, detail = send_email_resilient(
        subject=subject, body=body, to_emails=[recipient], attachments=attachments,
    )
    if not ok:
        logger.error('Store-owner notification failed: %s', detail)
    return ok, detail
