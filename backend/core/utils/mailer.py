from __future__ import annotations
import os
import logging
import mimetypes
from typing import List, Union, Optional, Any
from django.conf import settings
from django.core.mail.backends.smtp import EmailBackend
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)


def send_email_resilient(
    subject: str,
    body: str,
    to_emails: Union[str, List[str]],
    html_message: Optional[str] = None,
    attachments: Optional[List[Any]] = None,
    from_email: Optional[str] = None,
    timeout: int = 15,
) -> tuple[bool, str]:
    """
    Direct, highly-resilient SMTP mail dispatcher.
    Strategy:
      1. SMTP Port 465 (SSL direct - fastest & most reliable)
      2. SMTP Port 587 (STARTTLS - fallback)
    Returns (success: bool, message: str).
    """
    if isinstance(to_emails, str):
        recipients = [to_emails.strip()]
    else:
        recipients = [e.strip() for e in to_emails if e and e.strip()]

    if not recipients:
        return False, "No recipient email addresses provided."

    sender = from_email or getattr(settings, 'DEFAULT_FROM_EMAIL', 'Sahara Gold <saharagold19@gmail.com>')
    host = getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com')
    user = getattr(settings, 'EMAIL_HOST_USER', 'saharagold19@gmail.com')
    password = getattr(settings, 'EMAIL_HOST_PASSWORD', '').strip()

    if not password:
        err_msg = "EMAIL_HOST_PASSWORD is not configured. Cannot send email."
        logger.error(err_msg)
        return False, err_msg

    def _build_message(backend_conn):
        msg = EmailMultiAlternatives(
            subject=subject,
            body=body,
            from_email=sender,
            to=recipients,
            connection=backend_conn,
        )
        if html_message:
            msg.attach_alternative(html_message, "text/html")
        if attachments:
            for att in attachments:
                if isinstance(att, str) and os.path.exists(att):
                    msg.attach_file(att)
                elif isinstance(att, (list, tuple)) and len(att) == 2:
                    att_data, att_name = att
                    mime_type, _ = mimetypes.guess_type(att_name)
                    mime_type = mime_type or 'application/octet-stream'
                    if isinstance(att_data, bytes):
                        msg.attach(att_name, att_data, mime_type)
        return msg

    err1 = None
    # ── Attempt 1: Port 465 (SSL) ─────────────────────────────────────
    try:
        ssl_backend = EmailBackend(
            host=host, port=465, username=user, password=password,
            use_ssl=True, use_tls=False, timeout=timeout,
        )
        _build_message(ssl_backend).send(fail_silently=False)
        logger.info("SMTP Port 465 delivered '%s' to %s", subject, recipients)
        return True, f"Delivered to {', '.join(recipients)} via SMTP Port 465 (SSL)"
    except Exception as exc1:
        err1 = exc1
        logger.warning("SMTP Port 465 failed for '%s': %s. Trying Port 587…", subject, exc1)

    # ── Attempt 2: Port 587 (STARTTLS) ───────────────────────────────
    try:
        tls_backend = EmailBackend(
            host=host, port=587, username=user, password=password,
            use_ssl=False, use_tls=True, timeout=timeout,
        )
        _build_message(tls_backend).send(fail_silently=False)
        logger.info("SMTP Port 587 delivered '%s' to %s", subject, recipients)
        return True, f"Delivered to {', '.join(recipients)} via SMTP Port 587 (TLS)"
    except Exception as exc2:
        logger.error(
            "All SMTP delivery attempts failed for '%s' to %s. Port 465: %s | Port 587: %s",
            subject, recipients, err1, exc2
        )
        return False, f"SMTP delivery failed. Port 465: ({err1}) | Port 587: ({exc2})"


