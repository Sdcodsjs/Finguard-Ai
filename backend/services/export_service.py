"""
FinGuard AI — PDF Export Service (Module 14)
Generates a professional investor memo PDF using ReportLab.
"""
import os
from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import (
    HexColor, white, black, Color
)
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

# Brand colors
NAVY = HexColor("#0F1629")
BLUE = HexColor("#3B82F6")
ELECTRIC = HexColor("#60A5FA")
AMBER = HexColor("#F59E0B")
GREEN = HexColor("#10B981")
RED = HexColor("#EF4444")
GRAY = HexColor("#94A3B8")
LIGHT_GRAY = HexColor("#F1F5F9")
DARK_GRAY = HexColor("#1E293B")


def _score_color(score: float | None) -> Color:
    if score is None:
        return GRAY
    if score >= 75:
        return GREEN
    if score >= 50:
        return AMBER
    return RED


def _fraud_color(score: float | None) -> Color:
    """Fraud score — higher is worse."""
    if score is None:
        return GRAY
    if score <= 30:
        return GREEN
    if score <= 60:
        return AMBER
    return RED


def generate_pdf_export(company, report, analysis, output_path: str):
    """Generate a professional investor memo PDF."""
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = getSampleStyleSheet()
    story = []

    # ── Header ────────────────────────────────────────────────
    header_style = ParagraphStyle(
        "Header", fontSize=24, textColor=NAVY, spaceAfter=4, fontName="Helvetica-Bold"
    )
    sub_style = ParagraphStyle(
        "Sub", fontSize=11, textColor=GRAY, spaceAfter=20
    )
    section_style = ParagraphStyle(
        "Section", fontSize=14, textColor=NAVY, spaceAfter=8,
        fontName="Helvetica-Bold", spaceBefore=16
    )
    body_style = ParagraphStyle(
        "Body", fontSize=10, textColor=HexColor("#374151"), spaceAfter=6, leading=16
    )
    small_style = ParagraphStyle(
        "Small", fontSize=8, textColor=GRAY, spaceAfter=4
    )

    company_name = company.name if company else "Unknown Company"
    year = report.year if report else "N/A"

    story.append(Paragraph("FinGuard AI", ParagraphStyle("Brand", fontSize=10, textColor=BLUE)))
    story.append(Paragraph(f"{company_name}", header_style))
    story.append(Paragraph(
        f"Financial Risk Intelligence Report · FY{year} · Generated {datetime.now().strftime('%B %d, %Y')}",
        sub_style
    ))
    story.append(HRFlowable(width="100%", thickness=2, color=BLUE))
    story.append(Spacer(1, 0.2 * inch))

    # ── Score Cards ───────────────────────────────────────────
    story.append(Paragraph("Risk Intelligence Summary", section_style))

    def score_cell(label: str, score: float | None, color_fn=_score_color, note: str = ""):
        score_str = f"{score:.0f}/100" if score is not None else "N/A"
        color = color_fn(score)
        return [
            Paragraph(label, ParagraphStyle("CellLabel", fontSize=9, textColor=GRAY)),
            Paragraph(
                score_str,
                ParagraphStyle("CellScore", fontSize=22, textColor=color, fontName="Helvetica-Bold")
            ),
            Paragraph(note, ParagraphStyle("CellNote", fontSize=8, textColor=GRAY)),
        ]

    scores_data = [
        [
            score_cell("Health Score", analysis.health_score, _score_color),
            score_cell("Fraud Risk Score", analysis.fraud_score, _fraud_color, "(higher = more risk)"),
            score_cell("Risk Score", analysis.risk_score, _fraud_color),
            score_cell("ESG Score", analysis.esg_score, _score_color),
        ]
    ]

    scores_table = Table(scores_data, colWidths=[1.6 * inch] * 4)
    scores_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [LIGHT_GRAY]),
        ("BOX", (0, 0), (-1, -1), 1, HexColor("#E2E8F0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, HexColor("#E2E8F0")),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(scores_table)
    story.append(Spacer(1, 0.2 * inch))

    # Investment Outlook
    outlook = analysis.investment_outlook or "Neutral"
    story.append(Paragraph(
        f"Investment Outlook: <b>{outlook}</b>",
        ParagraphStyle("Outlook", fontSize=12, textColor=NAVY)
    ))
    story.append(Spacer(1, 0.1 * inch))

    # ── Key Financials ─────────────────────────────────────────
    story.append(Paragraph("Key Financial Metrics", section_style))

    def fmt(val, unit=""):
        if val is None:
            return "N/A"
        return f"{val:,.1f}{' ' + unit if unit else ''}"

    fin_data = [
        ["Metric", "Value", "Metric", "Value"],
        ["Revenue", fmt(analysis.revenue), "Net Profit", fmt(analysis.net_profit)],
        ["EBITDA", fmt(analysis.ebitda), "Operating CF", fmt(analysis.operating_cash_flow)],
        ["Total Debt", fmt(analysis.total_debt), "Cash & Equiv.", fmt(analysis.cash_and_equivalents)],
        ["Total Assets", fmt(analysis.total_assets), "Total Equity", fmt(analysis.total_equity)],
        ["ROE", fmt(analysis.roe, "%"), "ROA", fmt(analysis.roa, "%")],
        ["Current Ratio", fmt(analysis.current_ratio), "Debt/Equity", fmt(analysis.debt_to_equity)],
        ["Profit Margin", fmt(analysis.profit_margin, "%"), "EPS", fmt(analysis.eps)],
    ]

    fin_table = Table(fin_data, colWidths=[1.8 * inch, 1.2 * inch, 1.8 * inch, 1.2 * inch])
    fin_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LIGHT_GRAY]),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E2E8F0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 1), (2, -1), "Helvetica-Bold"),
    ]))
    story.append(fin_table)

    # ── Executive Summary ─────────────────────────────────────
    if analysis.executive_summary:
        story.append(Paragraph("Executive Summary", section_style))
        story.append(Paragraph(analysis.executive_summary, body_style))

    # ── Fraud Flags ───────────────────────────────────────────
    if analysis.fraud_narrative:
        story.append(Paragraph("Fraud & Risk Flags (Flagged for Review)", section_style))
        story.append(Paragraph(
            "⚠️ The following are flagged for review only. They do not constitute legal fraud findings.",
            ParagraphStyle("Disclaimer", fontSize=9, textColor=AMBER, spaceAfter=8)
        ))
        story.append(Paragraph(analysis.fraud_narrative, body_style))

    # Fraud citations
    if analysis.fraud_citations:
        story.append(Paragraph("Source Citations — Fraud Analysis", section_style))
        for i, cite in enumerate(analysis.fraud_citations[:5], 1):
            story.append(Paragraph(
                f"<b>[{i}]</b> Page {cite.get('page', 'N/A')} — {cite.get('text', '')[:200]}",
                ParagraphStyle("Citation", fontSize=9, textColor=HexColor("#374151"),
                               leftIndent=20, spaceAfter=4, leading=14)
            ))

    # ── Investment Committee (Bull, Bear, Neutral) ────────────
    story.append(Paragraph("Investment Committee Insights", section_style))
    
    def append_case_section(case_title, case_data, color):
        story.append(Paragraph(f"<b>{case_title}</b>", ParagraphStyle("CaseTitle", fontSize=11, textColor=color, spaceBefore=6, spaceAfter=4)))
        thesis = None
        points = []
        if isinstance(case_data, dict):
            thesis = case_data.get("thesis")
            for k, v in case_data.items():
                if isinstance(v, list):
                    points = v
                    break
        elif isinstance(case_data, list):
            points = case_data
        elif isinstance(case_data, str):
            points = [case_data]
            
        if thesis:
            story.append(Paragraph(f"<i>Thesis: {thesis}</i>", ParagraphStyle("Thesis", fontSize=9.5, textColor=HexColor("#4B5563"), spaceAfter=4, leading=14)))
            
        for pt in points:
            story.append(Paragraph(f"• {pt}", ParagraphStyle("Bullet", fontSize=9, textColor=HexColor("#374151"), leftIndent=12, spaceAfter=3, leading=13)))

    try:
        from api.analysis import _local_investment_committee
        db_ratios = {
            "roe": getattr(analysis, "roe", None),
            "current_ratio": getattr(analysis, "current_ratio", None),
            "debt_to_equity": getattr(analysis, "debt_to_equity", None),
            "profit_margin": getattr(analysis, "profit_margin", None),
        }
        local_committee = _local_investment_committee(db_ratios)
        bull_data = getattr(analysis, "bull_case", None) or local_committee["bull"]
        bear_data = getattr(analysis, "bear_case", None) or local_committee["bear"]
        neutral_data = local_committee["neutral"]
        
        append_case_section("Bull Case", bull_data, GREEN)
        append_case_section("Bear Case", bear_data, RED)
        append_case_section("Neutral View", neutral_data, BLUE)
        story.append(Spacer(1, 0.15 * inch))
    except Exception as e:
        # Fallback if import or extraction fails
        story.append(Paragraph(f"Error loading Investment Committee data: {str(e)}", small_style))

    # ── Investment Narrative ──────────────────────────────────
    if analysis.investment_narrative:
        story.append(Paragraph("Investment Perspective", section_style))
        story.append(Paragraph(analysis.investment_narrative, body_style))

    # ── ESG ───────────────────────────────────────────────────
    if analysis.esg_narrative:
        story.append(Paragraph("ESG & Governance", section_style))
        story.append(Paragraph(analysis.esg_narrative, body_style))

    # ── Disclaimer ────────────────────────────────────────────
    story.append(Spacer(1, 0.3 * inch))
    story.append(HRFlowable(width="100%", thickness=1, color=GRAY))
    story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph(
        "DISCLAIMER: This report is generated by FinGuard AI using AI models hosted on Nebius Token Factory. "
        "It is not certified financial, investment, or audit advice. All fraud flags are presented for review only "
        "and do not constitute legal findings. Consult a qualified financial advisor before making investment decisions. "
        "Past performance is not indicative of future results.",
        small_style
    ))
    story.append(Paragraph(
        f"Generated by FinGuard AI · {datetime.now().strftime('%Y-%m-%d %H:%M UTC')} · "
        f"Model: {analysis.model_used or 'Nebius Open Model'} · Prompt v{analysis.prompt_version or '1.0'}",
        small_style
    ))

    doc.build(story)
    return output_path
