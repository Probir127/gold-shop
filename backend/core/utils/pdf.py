from __future__ import annotations
from django.template.loader import render_to_string
from django.conf import settings
import os

def generate_invoice_pdf(invoice) -> str:
    """
    Generates a PDF for the given Invoice object.
    Saves it to media/invoices/<invoice_number>.pdf
    Returns the file path (relative to MEDIA_ROOT).
    """
    try:
        from weasyprint import HTML
    except ImportError:
        # Fallback for environments where WeasyPrint dependencies are missing
        HTML = None
    # Calculate totals for the template
    items_with_totals = []
    for item in invoice.items:
        # items are usually list of {service, description, quantity, unit_price}
        try:
            qty = float(item.get('quantity', 1))
            price = float(item.get('unit_price', 0))
            item_total = qty * price
            items_with_totals.append({**item, 'item_total': item_total})
        except (ValueError, TypeError):
            items_with_totals.append({**item, 'item_total': 0})

    # Render HTML from Django template
    html_string = render_to_string('invoice.html', {
        'invoice':  invoice,
        'client':   invoice.client,
        'items':    items_with_totals,
    })

    # Generate PDF using WeasyPrint
    folder = os.path.join(settings.MEDIA_ROOT, 'invoices')
    os.makedirs(folder, exist_ok=True)

    filename = f'{invoice.invoice_number}.pdf'
    filepath = os.path.join(folder, filename)

    if HTML is None:
        raise ImportError("WeasyPrint dependencies missing. Please install GTK+ for Windows.")

    HTML(string=html_string).write_pdf(filepath)

    # Return relative path
    return f'invoices/{filename}'
