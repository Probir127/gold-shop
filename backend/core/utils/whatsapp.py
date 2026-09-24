from __future__ import annotations
"""
WhatsApp Cloud API utility — Now tenant-aware.
Uses per-tenant credentials from the Tenant model.
Falls back to global .env credentials for backward compatibility.
"""
import requests
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

GRAPH_API_VERSION = 'v21.0'


def _get_credentials(tenant=None):
    """
    Resolve WhatsApp credentials. Per-tenant first, fallback to global .env.
    """
    if tenant and tenant.wa_phone_number_id and tenant.wa_access_token:
        return {
            'phone_number_id': tenant.wa_phone_number_id,
            'access_token':    tenant.wa_access_token,
        }
    # Fallback to global config (backward compat / dev mode)
    return {
        'phone_number_id': settings.PHONE_NUMBER_ID,
        'access_token':    settings.WHATSAPP_TOKEN,
    }


def get_base_url(tenant=None):
    creds = _get_credentials(tenant)
    return f'https://graph.facebook.com/{GRAPH_API_VERSION}/{creds["phone_number_id"]}'


def get_headers(tenant=None):
    creds = _get_credentials(tenant)
    return {
        'Authorization': f'Bearer {creds["access_token"]}',
        'Content-Type': 'application/json',
    }


def send_text_message(to_phone: str, message: str, tenant=None) -> dict:
    """Send a plain text message via WhatsApp Cloud API."""
    payload = {
        'messaging_product': 'whatsapp',
        'to': to_phone,
        'type': 'text',
        'text': {'body': message},
    }
    try:
        response = requests.post(
            f'{get_base_url(tenant)}/messages',
            json=payload,
            headers=get_headers(tenant),
            timeout=15
        )
        data = response.json()
        if response.status_code != 200:
            logger.error(f"WhatsApp API error ({response.status_code}): {data}")
        return data
    except requests.exceptions.RequestException as e:
        logger.error(f"WhatsApp API request failed for {to_phone}: {e}")
        return {'error': str(e)}


def send_document(to_phone: str, pdf_url: str, filename: str, caption: str = '', tenant=None) -> dict:
    """Send a PDF document (invoice) via WhatsApp Cloud API."""
    payload = {
        'messaging_product': 'whatsapp',
        'to': to_phone,
        'type': 'document',
        'document': {
            'link': pdf_url,
            'filename': filename,
            'caption': caption,
        },
    }
    try:
        response = requests.post(
            f'{get_base_url(tenant)}/messages',
            json=payload,
            headers=get_headers(tenant),
            timeout=15
        )
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"WhatsApp doc send failed for {to_phone}: {e}")
        return {'error': str(e)}


def send_reply(to_phone: str, message: str, reply_to_id: str, tenant=None) -> dict:
    """Send a reply to a specific WhatsApp message ID."""
    payload = {
        'messaging_product': 'whatsapp',
        'to': to_phone,
        'context': {'message_id': reply_to_id},
        'type': 'text',
        'text': {'body': message},
    }
    try:
        response = requests.post(
            f'{get_base_url(tenant)}/messages',
            json=payload,
            headers=get_headers(tenant),
            timeout=15
        )
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"WhatsApp reply failed for {to_phone}: {e}")
        return {'error': str(e)}


def send_interactive_buttons(to_phone: str, body_text: str, buttons: list[dict], header_text: str = '', tenant=None) -> dict:
    """
    Send interactive quick-reply buttons via WhatsApp Cloud API.
    buttons: [{'id': 'btn_rates', 'title': 'Check Gold Rates'}, {'id': 'btn_agent', 'title': 'Speak to Agent'}]
    """
    formatted_buttons = [
        {
            'type': 'reply',
            'reply': {
                'id': btn['id'],
                'title': btn['title'][:20],  # WhatsApp max 20 chars
            }
        }
        for btn in buttons[:3]  # WhatsApp max 3 buttons
    ]
    interactive_payload = {
        'type': 'button',
        'body': {'text': body_text},
        'action': {'buttons': formatted_buttons}
    }
    if header_text:
        interactive_payload['header'] = {'type': 'text', 'text': header_text}

    payload = {
        'messaging_product': 'whatsapp',
        'to': to_phone,
        'type': 'interactive',
        'interactive': interactive_payload,
    }
    try:
        response = requests.post(
            f'{get_base_url(tenant)}/messages',
            json=payload,
            headers=get_headers(tenant),
            timeout=15
        )
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"WhatsApp interactive button send failed for {to_phone}: {e}")
        return {'error': str(e)}

