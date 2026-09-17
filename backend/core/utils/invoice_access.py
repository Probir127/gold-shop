from django.conf import settings
from django.core import signing


_SIGNER = signing.TimestampSigner(salt='sahara-gold.invoice-access')


def make_invoice_access_token(kind, identifier):
    return _SIGNER.sign(f'{kind}:{identifier}')


def validate_invoice_access_token(token, kind, identifier):
    if not token:
        return False
    try:
        value = _SIGNER.unsign(
            token,
            max_age=getattr(settings, 'INVOICE_LINK_MAX_AGE', 7 * 24 * 60 * 60),
        )
    except signing.BadSignature:
        return False
    return value == f'{kind}:{identifier}'
