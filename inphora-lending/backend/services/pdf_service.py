import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.units import inch
from datetime import datetime
import io

def generate_loan_statement_pdf(organization, client, loan, repayments):
    """
    Generate a professional loan statement PDF.
    
    :param organization: OrganizationConfig object
    :param client: Client object
    :param loan: Loan object
    :param repayments: List of Repayment objects
    :return: BytesIO object containing the PDF
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
    styles = getSampleStyleSheet()
    
    # Custom styles
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor(organization.primary_color or "#f97316"),
        spaceAfter=12
    )
    
    subheader_style = ParagraphStyle(
        'SubHeaderStyle',
        parent=styles['Heading2'],
        fontSize=12,
        spaceBefore=12,
        spaceAfter=6
    )
    
    body_style = styles['Normal']
    
    elements = []
    
    # 1. Letterhead / Header
    header_data = [
        [Paragraph(f"<b>{organization.organization_name}</b>", header_style), ""],
        [Paragraph(f"{organization.address or ''}<br/>Email: {organization.contact_email or ''}<br/>Phone: {organization.contact_phone or ''}", body_style), ""]
    ]
    
    header_table = Table(header_data, colWidths=[4*inch, 2*inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 0.4*inch))
    
    # 2. Statement Title
    elements.append(Paragraph("LOAN ACCOUNT STATEMENT", styles['Heading2']))
    elements.append(Paragraph(f"Date Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", body_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # 3. Client & Loan Info
    info_data = [
        [Paragraph("<b>CLIENT DETAILS</b>", subheader_style), Paragraph("<b>LOAN SUMMARY</b>", subheader_style)],
        [
            Paragraph(f"Name: {client.first_name} {client.last_name}<br/>ID: {client.id_number}<br/>Phone: {client.phone}", body_style),
            Paragraph(f"Loan ID: #{loan.id}<br/>Amount: {organization.currency} {loan.amount:,.2f}<br/>Status: {loan.status.upper()}<br/>Start Date: {loan.start_date}", body_style)
        ]
    ]
    
    info_table = Table(info_data, colWidths=[3*inch, 3*inch])
    elements.append(info_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # 4. Transaction History
    elements.append(Paragraph("TRANSACTION HISTORY", subheader_style))
    
    history_data = [["Date", "Description", "Debit", "Credit", "Balance"]]
    
    # Initial Principal + Interest
    current_balance = loan.amount + ((loan.amount * loan.interest_rate) / 100)
    history_data.append([
        loan.start_date.strftime('%Y-%m-%d'),
        "Loan Disbursement + Interest",
        f"{current_balance:,.2f}",
        "0.00",
        f"{current_balance:,.2f}"
    ])
    
    for r in sorted(repayments, key=lambda x: x.payment_date):
        current_balance -= r.amount
        history_data.append([
            r.payment_date.strftime('%Y-%m-%d'),
            r.notes or "Loan Repayment",
            "0.00",
            f"{r.amount:,.2f}",
            f"{max(0, current_balance):,.2f}"
        ])
    
    history_table = Table(history_data, colWidths=[1*inch, 2.5*inch, 0.8*inch, 0.8*inch, 0.9*inch])
    history_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey)
    ]))
    
    elements.append(history_table)
    
    # 5. Footer
    elements.append(Spacer(1, 0.5*inch))
    elements.append(Paragraph("Thank you for choosing Inphora.", body_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer
