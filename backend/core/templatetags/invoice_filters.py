from __future__ import annotations
"""
Custom Django template filters for invoice rendering.
"""
from django import template

register = template.Library()


@register.filter(name='subtract')
def subtract(value, arg):
    """
    Subtracts arg from value.
    Usage: {{ total_amount|subtract:subtotal }}
    """
    try:
        return float(value) - float(arg)
    except (ValueError, TypeError):
        return 0
