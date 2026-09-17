from __future__ import annotations
import os
import logging
from django.template.loader import render_to_string
from django.conf import settings

logger = logging.getLogger(__name__)


def generate_invoice_pdf(invoice) -> str:
    """
    Generates a PDF for the given Invoice object.
    Saves it to media/invoices/<invoice_number>.pdf
    Returns the file path (relative to MEDIA_ROOT).

    Uses ReportLab as the primary robust, cross-platform PDF generator,
    with a graceful fallback to WeasyPrint if available.
    """
    folder = os.path.join(settings.MEDIA_ROOT, 'invoices')
    os.makedirs(folder, exist_ok=True)

    filename = f'{invoice.invoice_number}.pdf'
    filepath = os.path.join(folder, filename)

    # 1. Try ReportLab first (pure Python, 100% reliable on Mac/Linux/Windows)
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch

        doc = SimpleDocTemplate(
            filepath,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'BrandTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=22,
            textColor=colors.HexColor('#b8860b'),
            spaceAfter=4,
        )
        subtitle_style = ParagraphStyle(
            'BrandSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            textColor=colors.HexColor('#666666'),
        )
        normal_style = ParagraphStyle(
            'NormalCustom',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            textColor=colors.HexColor('#333333'),
            leading=12,
        )
        bold_style = ParagraphStyle(
            'BoldCustom',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            textColor=colors.HexColor('#1a1a1a'),
        )

        story = []

        # Header: Brand & Invoice Meta
        tenant_name = "Sahara Gold"
        if hasattr(invoice, 'tenant') and invoice.tenant:
            tenant_name = invoice.tenant.business_name or "Sahara Gold"

        header_data = [
            [
                Paragraph(f"<b>{tenant_name}</b>", title_style),
                Paragraph(f"<b>INVOICE</b><br/><font size='10' color='#666666'>#{invoice.invoice_number}</font>", ParagraphStyle('InvNum', parent=title_style, alignment=2))
            ],
            [
                Paragraph("Luxury Fine Jewelry & Bullion Exchange · Dhaka, Bangladesh", subtitle_style),
                Paragraph(f"<font size='9' color='#666666'>Date: {invoice.created_at.strftime('%B %d, %Y') if invoice.created_at else 'N/A'}<br/>Status: <b>{invoice.status.upper()}</b></font>", ParagraphStyle('InvDate', parent=normal_style, alignment=2))
            ]
        ]
        header_table = Table(header_data, colWidths=[3.5 * inch, 3.5 * inch])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 14))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#b8860b'), spaceBefore=4, spaceAfter=14))

        # Client details
        client_name = invoice.client.name if invoice.client else "Valued Customer"
        client_phone = invoice.client.phone if invoice.client else "N/A"
        client_email = getattr(invoice.client, 'email', '') or "N/A"
        due_date_str = getattr(invoice, 'due_date', None) or 'Immediate'

        bill_to_data = [
            [
                Paragraph("<b>Billed To:</b>", bold_style),
                Paragraph("<b>Payment Details:</b>", bold_style)
            ],
            [
                Paragraph(f"<b>{client_name}</b><br/>Phone: {client_phone}<br/>Email: {client_email}", normal_style),
                Paragraph(f"Currency: {invoice.currency}<br/>Due Date: {due_date_str}<br/>Payment Method: Official Invoice", normal_style)
            ]
        ]
        bill_table = Table(bill_to_data, colWidths=[3.5 * inch, 3.5 * inch])
        bill_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        story.append(bill_table)
        story.append(Spacer(1, 18))

        # Items Table
        items_data = [
            [
                Paragraph("<b>Item / Description</b>", bold_style),
                Paragraph("<b>Qty</b>", bold_style),
                Paragraph("<b>Unit Price</b>", bold_style),
                Paragraph("<b>Total</b>", bold_style)
            ]
        ]

        items = invoice.items or []
        for item in items:
            name = item.get('name') or item.get('service') or item.get('product_name') or 'Gold Item'
            desc = item.get('description', '')
            item_text = f"<b>{name}</b>" + (f"<br/><font size='8' color='#666666'>{desc}</font>" if desc else "")
            
            qty = str(item.get('quantity', 1))
            unit_price = float(item.get('unit_price') or item.get('price') or 0)
            item_total = float(item.get('item_total') or (float(qty) * unit_price))

            items_data.append([
                Paragraph(item_text, normal_style),
                Paragraph(str(qty), normal_style),
                Paragraph(f"{invoice.currency} {unit_price:,.2f}", normal_style),
                Paragraph(f"{invoice.currency} {item_total:,.2f}", normal_style)
            ])

        if not items:
            items_data.append([
                Paragraph(f"Order #{invoice.invoice_number}", normal_style),
                Paragraph("1", normal_style),
                Paragraph(f"{invoice.currency} {float(invoice.subtotal):,.2f}", normal_style),
                Paragraph(f"{invoice.currency} {float(invoice.subtotal):,.2f}", normal_style)
            ])

        table_items = Table(items_data, colWidths=[3.8 * inch, 0.7 * inch, 1.3 * inch, 1.2 * inch])
        table_items.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f7f5ef')),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('TOPPADDING', (0, 0), (-1, 0), 6),
            ('LINEBELOW', (0, 0), (-1, 0), 1.5, colors.HexColor('#b8860b')),
            ('LINEBELOW', (0, 1), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ]))
        story.append(table_items)
        story.append(Spacer(1, 14))

        # Totals calculation
        subtotal = float(invoice.subtotal or 0)
        total = float(invoice.total_amount or 0)
        totals_data = [
            [Paragraph("<b>Subtotal:</b>", normal_style), Paragraph(f"{invoice.currency} {subtotal:,.2f}", normal_style)],
            [Paragraph("<b>Grand Total:</b>", bold_style), Paragraph(f"<b>{invoice.currency} {total:,.2f}</b>", ParagraphStyle('GT', parent=bold_style, textColor=colors.HexColor('#b8860b'), fontSize=11))]
        ]
        totals_table = Table(totals_data, colWidths=[2.0 * inch, 1.5 * inch], hAlign='RIGHT')
        totals_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ]))
        story.append(totals_table)
        story.append(Spacer(1, 24))

        # Footer notes
        footer_style = ParagraphStyle(
            'FooterStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            textColor=colors.HexColor('#888888'),
            alignment=1,
            leading=11
        )
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cccccc'), spaceBefore=10, spaceAfter=8))
        story.append(Paragraph("Thank you for choosing Sahara Gold · Certified Hallmark Gold & Artisanal Jewelry", footer_style))
        story.append(Paragraph("Dhaka, Bangladesh · Contact: saharagold19@gmail.com · Official Certified Invoice", footer_style))

        doc.build(story)
        return f'invoices/{filename}'

    except Exception as exc:
        logger.warning(f"ReportLab PDF generation error: {exc}. Attempting WeasyPrint fallback...")

    # 2. Fallback to WeasyPrint if available
    try:
        from weasyprint import HTML
        items_with_totals = []
        for item in (invoice.items or []):
            try:
                qty = float(item.get('quantity', 1))
                price = float(item.get('unit_price') or item.get('price') or 0)
                items_with_totals.append({**item, 'item_total': qty * price})
            except (ValueError, TypeError):
                items_with_totals.append({**item, 'item_total': 0})

        html_string = render_to_string('invoice.html', {
            'invoice': invoice,
            'client': invoice.client,
            'items': items_with_totals,
        })
        HTML(string=html_string).write_pdf(filepath)
        return f'invoices/{filename}'
    except Exception as e:
        logger.error(f"WeasyPrint fallback also failed: {e}")
        raise RuntimeError(f"Could not generate invoice PDF: {e}")
