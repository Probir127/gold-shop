"""Transactional mail delivery. Success means provider acceptance, not inbox delivery."""
from __future__ import annotations

import base64
import json
import logging
import mimetypes
import os
import urllib.error
import urllib.request
from email.utils import parseaddr

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.mail import EmailMultiAlternatives
from django.core.mail.backends.smtp import EmailBackend
from django.core.validators import validate_email

logger = logging.getLogger(__name__)


def _attachments(attachments):
    """Reject missing attachments instead of quietly sending an incomplete invoice."""
    result = []
    for attachment in attachments or []:
        if isinstance(attachment, (str, os.PathLike)):
            with open(attachment, 'rb') as source:
                result.append((source.read(), os.path.basename(attachment)))
        elif (isinstance(attachment, (tuple, list)) and len(attachment) == 2
              and isinstance(attachment[0], bytes) and isinstance(attachment[1], str)):
            result.append((attachment[0], os.path.basename(attachment[1])))
        else:
            raise ValueError('Invalid email attachment.')
    return result


def _send_via_resend_api(subject, body, recipients, html_message, sender, attachments, api_key, timeout=20, idempotency_key=None):
    payload = {'from': sender, 'to': recipients, 'subject': subject, 'text': body}
    if html_message:
        payload['html'] = html_message
    if attachments:
        payload['attachments'] = [
            {'filename': name, 'content': base64.b64encode(data).decode('ascii')}
            for data, name in attachments
        ]
    headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json', 'User-Agent': 'SaharaGoldApp/1.0'}
    if idempotency_key:
        headers['Idempotency-Key'] = idempotency_key
    request = urllib.request.Request(
        'https://api.resend.com/emails', data=json.dumps(payload).encode('utf-8'),
        headers=headers, method='POST',
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        result = json.loads(response.read().decode('utf-8'))
    if not isinstance(result, dict) or not result.get('id'):
        raise ValueError('Resend returned no message ID.')
    return True, f"Accepted by Resend API (id: {result['id']})."


def send_email_resilient(subject, body, to_emails, html_message=None, attachments=None,
                         from_email=None, timeout=20, durable=False, idempotency_key=None):
    """Use configured Resend HTTP transport, otherwise configured encrypted SMTP.

    Do not retry via a second provider after an ambiguous timeout: the first
    provider may already have accepted the email, and a fallback duplicates it.
    Errors intentionally exclude provider response bodies and credentials.
    """
    if durable:
        from core.mail_outbox import submit_email
        return submit_email(subject=subject, body=body, to_emails=to_emails,
                            html_message=html_message, attachments=attachments,
                            from_email=from_email, timeout=timeout)
    try:
        recipients = [to_emails] if isinstance(to_emails, str) else list(to_emails or [])
        if not recipients:
            return False, 'No recipient email addresses provided.'
        recipients = [address.strip() for address in recipients]
        for address in recipients:
            validate_email(address)
        if '\r' in subject or '\n' in subject:
            raise ValueError('Invalid subject.')
        sender = (from_email or getattr(settings, 'DEFAULT_FROM_EMAIL', '') or '').strip()
        api_key = str(getattr(settings, 'RESEND_API_KEY', '') or '').strip()
        if api_key and not from_email:
            sender = str(getattr(settings, 'RESEND_FROM_EMAIL', '') or sender).strip()
        if '\r' in sender or '\n' in sender:
            raise ValueError('Invalid sender.')
        validate_email(parseaddr(sender)[1])
        prepared_attachments = _attachments(attachments)
    except (ValidationError, ValueError, TypeError, AttributeError, OSError):
        return False, 'Invalid email address, header, or attachment. Check the mail configuration and invoice file.'

    capture_dir = getattr(settings, 'LOCAL_EMAIL_CAPTURE_DIR', None)
    if capture_dir:
        # Explicit local testing transport, never enabled by production settings.
        from django.core.mail import get_connection
        try:
            connection = get_connection('django.core.mail.backends.filebased.EmailBackend', file_path=str(capture_dir))
            message = EmailMultiAlternatives(subject, body, sender, recipients, connection=connection)
            if html_message:
                message.attach_alternative(html_message, 'text/html')
            for data, name in prepared_attachments:
                message.attach(name, data, mimetypes.guess_type(name)[0] or 'application/octet-stream')
            if message.send() != 1:
                return False, 'Local email capture failed.'
            return True, 'Captured locally; no email was sent to the recipient.'
        except Exception:
            return False, 'Local email capture failed.'

    if api_key:
        try:
            return _send_via_resend_api(subject, body, recipients, html_message, sender,
                                        prepared_attachments, api_key, timeout=timeout, idempotency_key=idempotency_key)
        except urllib.error.HTTPError as error:
            logger.warning('Resend rejected transactional email (HTTP %s).', error.code)
            return False, f'Resend rejected the email (HTTP {error.code}). Check the verified sender and provider dashboard.'
        except Exception as error:
            logger.warning('Resend request failed (%s).', type(error).__name__)
            return False, 'Resend acceptance could not be confirmed. Check the provider dashboard before retrying.'

    host = str(getattr(settings, 'EMAIL_HOST', '') or '').strip()
    user = str(getattr(settings, 'EMAIL_HOST_USER', '') or '').strip()
    password = str(getattr(settings, 'EMAIL_HOST_PASSWORD', '') or '').strip()
    if not host or not user or not password:
        return False, 'SMTP is not configured. Set the SMTP host, user and password, or configure Resend.'
    use_ssl = bool(getattr(settings, 'EMAIL_USE_SSL', False))
    use_tls = bool(getattr(settings, 'EMAIL_USE_TLS', True))
    if use_ssl == use_tls:
        return False, 'SMTP requires exactly one encrypted transport: SSL or STARTTLS.'
    try:
        port = int(getattr(settings, 'EMAIL_PORT', 465 if use_ssl else 587))
        with EmailBackend(host=host, port=port, username=user, password=password,
                          use_ssl=use_ssl, use_tls=use_tls, timeout=timeout) as connection:
            message = EmailMultiAlternatives(subject=subject, body=body, from_email=sender,
                                              to=recipients, connection=connection)
            if html_message:
                message.attach_alternative(html_message, 'text/html')
            for data, name in prepared_attachments:
                message.attach(name, data, mimetypes.guess_type(name)[0] or 'application/octet-stream')
            if message.send(fail_silently=False) != 1:
                return False, 'SMTP did not accept the email.'
        return True, f'Accepted by SMTP on port {port}.'
    except Exception as error:
        logger.warning('SMTP request failed (%s).', type(error).__name__)
        return False, 'SMTP acceptance could not be confirmed. Check the server configuration and logs before retrying.'
