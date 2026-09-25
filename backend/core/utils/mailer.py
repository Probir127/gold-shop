from __future__ import annotations
import os
import base64
import json
import logging
import mimetypes
import urllib.request
import urllib.error
from typing import List, Union, Optional, Any
from django.conf import settings
from django.core.mail.backends.smtp import EmailBackend
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)


def _send_via_resend_api(
    subject: str,
    body: str,
    recipients: List[str],
    html_message: Optional[str],
    sender: str,
    attachments: Optional[List[Any]],
    api_key: str,
) -> tuple[bool, str]:
    """
    Sends email via Resend HTTP API — no SMTP ports needed.
    This is the most reliable path on Render (no outbound port restrictions).
    """
    payload: dict = {
        "from": sender,
        "to": recipients,
        "subject": subject,
        "text": body,
    }
    if html_message:
        payload["html"] = html_message

    if attachments:
        encoded = []
        for att in attachments:
            if isinstance(att, str) and os.path.exists(att):
                with open(att, "rb") as f:
                    data = f.read()
                encoded.append({
                    "filename": os.path.basename(att),
                    "content": base64.b64encode(data).decode(),
                })
            elif isinstance(att, (list, tuple)) and len(att) == 2:
                att_data, att_name = att
                if isinstance(att_data, bytes):
                    encoded.append({
                        "filename": att_name,
                        "content": base64.b64encode(att_data).decode(),
                    })
        if encoded:
            payload["attachments"] = encoded

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "SaharaGoldApp/1.0 (Django; Python urllib)",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            resp_data = json.loads(resp.read().decode("utf-8"))
            email_id = resp_data.get("id", "unknown")
            logger.info("Resend API delivered '%s' to %s — id: %s", subject, recipients, email_id)
            return True, f"Delivered to {', '.join(recipients)} via Resend API (id: {email_id})"
    except urllib.error.HTTPError as he:
        err_body = he.read().decode("utf-8", errors="replace")
        logger.error("Resend HTTP Error %s: %s", he.code, err_body)
        raise RuntimeError(f"Resend HTTP {he.code}: {err_body}") from he


def send_email_resilient(
    subject: str,
    body: str,
    to_emails: Union[str, List[str]],
    html_message: Optional[str] = None,
    attachments: Optional[List[Any]] = None,
    from_email: Optional[str] = None,
    timeout: int = 20,
) -> tuple[bool, str]:
    """
    Resilient email dispatcher for Sahara Gold.

    Strategy (in order):
      1. Resend HTTP API  — preferred: no SMTP port restrictions on Render
      2. SMTP Port 587    — STARTTLS fallback if Resend API key unavailable

    Returns (success: bool, message: str).
    """
    if isinstance(to_emails, str):
        recipients = [to_emails.strip()]
    else:
        recipients = [e.strip() for e in to_emails if e and e.strip()]

    if not recipients:
        return False, "No recipient email addresses provided."

    sender = (from_email or getattr(settings, 'DEFAULT_FROM_EMAIL', '') or '').strip()
    host = str(getattr(settings, 'EMAIL_HOST', '') or '').strip()
    user = str(getattr(settings, 'EMAIL_HOST_USER', '') or '').strip()
    password = str(getattr(settings, 'EMAIL_HOST_PASSWORD', '') or '').strip()
    resend_api_key = str(getattr(settings, 'RESEND_API_KEY', '') or '').strip()
    resend_from = str(getattr(settings, 'RESEND_FROM_EMAIL', '') or '').strip()

    if not sender:
        sender = "Sahara Gold <info@shaharagold.org>"

    # Determine the "from" address: prefer resend_from, fallback to sender, default to info@shaharagold.org
    from_addr = resend_from or sender
    if not from_addr or any(d in from_addr.lower() for d in ('gmail.com', 'googlemail.com')):
        from_addr = "info@shaharagold.org"
    
    if "<" in from_addr and ">" in from_addr:
        api_sender = from_addr
    else:
        api_sender = f"Sahara Gold <{from_addr}>"

    # ── Attempt 1: Resend HTTP API ────────────────────────────────────
    if resend_api_key:
        try:
            ok, msg = _send_via_resend_api(
                subject=subject,
                body=body,
                recipients=recipients,
                html_message=html_message,
                sender=api_sender,
                attachments=attachments,
                api_key=resend_api_key,
            )
            if ok:
                return True, msg
        except Exception as exc_api:
            logger.warning("Resend API failed for '%s': %s. Trying SMTP 587…", subject, exc_api)
            resend_err = str(exc_api)
    else:
        resend_err = "RESEND_API_KEY not set"
        logger.info("RESEND_API_KEY not configured, using SMTP fallback.")

    # ── Attempt 2: SMTP Port 587 (STARTTLS) ───────────────────────────
    if not host or not user or not password:
        return False, (
            f"Resend API failed ({resend_err}) and SMTP is not fully configured "
            "(EMAIL_HOST / EMAIL_HOST_USER / EMAIL_HOST_PASSWORD missing)."
        )

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
            "All delivery attempts failed for '%s' to %s. Resend API: %s | SMTP 587: %s",
            subject, recipients, resend_err, exc2
        )
        return False, f"Delivery failed. Resend API: ({resend_err}) | SMTP 587: ({exc2})"
