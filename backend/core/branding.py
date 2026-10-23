"""Current public brand spelling, without rewriting stored business records."""
import re

BUSINESS_NAME = 'New Sahara Gold and Diamond'
_LEGACY_NAME = re.compile(r'(?<!New )\bSahara Gold(?: (?:&amp;|&|and) Diamond(?: Jewellers| Ltd\.?)?| Ltd\.?)?\b', re.IGNORECASE)

def public_brand_text(value):
    return _LEGACY_NAME.sub(BUSINESS_NAME, value) if isinstance(value, str) else value
