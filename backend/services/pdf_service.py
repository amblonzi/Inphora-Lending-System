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

def generate_loan_offer_letter_pdf(organization, client, loan):
    """
    Generate a standardized Loan Offer Letter compliant with CBK disclosure requirements.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
    styles = getSampleStyleSheet()
    
    # Custom styles
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor(organization.primary_color or "#f97316"),
        alignment=1 # Center
    )
    
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading2'],
        fontSize=14,
        alignment=1,
        spaceAfter=20
    )
    
    label_style = ParagraphStyle('LabelStyle', parent=styles['Normal'], fontName='Helvetica-Bold')
    body_style = styles['Normal']
    
    elements = []
    
    # 1. Header
    elements.append(Paragraph(f"<b>{organization.organization_name.upper()}</b>", header_style))
    elements.append(Paragraph("LOAN OFFER LETTER & DISCLOSURE STATEMENT", title_style))
    elements.append(Spacer(1, 0.1*inch))
    
    # 2. Date and Client Info
    elements.append(Paragraph(f"<b>Date:</b> {datetime.now().strftime('%d %B %Y')}", body_style))
    elements.append(Paragraph(f"<b>To:</b> {client.first_name} {client.last_name}", body_style))
    elements.append(Paragraph(f"<b>ID Number:</b> {client.id_number}", body_style))
    elements.append(Paragraph(f"<b>Phone:</b> {client.phone}", body_style))
    elements.append(Spacer(1, 0.2*inch))
    
    elements.append(Paragraph("We are pleased to offer you a loan facility based on the terms and conditions outlined below:", body_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # 3. KEY LOAN TERMS (The Disclosure Box)
    disclosure_data = [
        [Paragraph("<b>LOAN TERM</b>", label_style), Paragraph("<b>DETAILS</b>", label_style)],
        ["Loan Amount (Principal)", f"{organization.currency} {loan.amount:,.2f}"],
        ["Interest Rate", f"{loan.interest_rate}% per {loan.duration_unit or 'month'}"],
        ["Loan Duration", f"{loan.duration_months} {loan.duration_unit or 'months'}"],
        ["Total Interest to be Paid", f"{organization.currency} {(loan.amount * loan.interest_rate * loan.duration_months / 100):,.2f}"],
        ["Upfront Fees (Processing, Insurance, etc.)", f"{organization.currency} {(loan.processing_fee + loan.insurance_fee + loan.valuation_fee + loan.registration_fee):,.2f}"],
        [Paragraph("<b>TOTAL COST OF CREDIT</b>", label_style), Paragraph(f"<b>{organization.currency} {loan.total_cost_of_credit or 0:,.2f}</b>", label_style)],
        [Paragraph("<b>ANNUAL PERCENTAGE RATE (APR)</b>", label_style), Paragraph(f"<b>{loan.apr_at_offered or 0}%</b>", label_style)],
    ]
    
    disclosure_table = Table(disclosure_data, colWidths=[2.5*inch, 3.5*inch])
    disclosure_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ]))
    elements.append(disclosure_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # 4. Conditions
    elements.append(Paragraph("<b>Terms and Conditions:</b>", label_style))
    terms = [
        "1. Repayments shall be made according to the agreed schedule.",
        "2. Late payments will attract a penalty as per the loan product policy.",
        "3. The lender reserves the right to share credit information with licensed Credit Reference Bureaus (CRB).",
        "4. By signing this letter, you consent to the collection and processing of your personal data for loan management."
    ]
    for term in terms:
        elements.append(Paragraph(term, body_style))
        elements.append(Spacer(1, 0.05*inch))
        
    elements.append(Spacer(1, 0.4*inch))
    
    # 5. Signatures
    sig_data = [
        [Paragraph("<b>BORROWER SIGNATURE:</b>", label_style), Paragraph("<b>LENDER SIGNATURE:</b>", label_style)],
        ["\n\n__________________________", "\n\n__________________________"],
        [f"{client.first_name} {client.last_name}", f"For: {organization.organization_name}"]
    ]
    sig_table = Table(sig_data, colWidths=[3*inch, 3*inch])
    elements.append(sig_table)
    
    doc.build(elements)
    buffer.seek(0)
    return buffer
