"""
FinGuard AI — Test PDF Generator
Generates realistic sample annual report PDFs for 3 different companies to test the upload & analysis pipeline.
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "test_pdfs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

styles = getSampleStyleSheet()

def h1(text, color=colors.HexColor("#1a1a2e")):
    return Paragraph(text, ParagraphStyle("h1", fontSize=20, fontName="Helvetica-Bold", textColor=color, spaceAfter=12))

def h2(text, color=colors.HexColor("#16213e")):
    return Paragraph(text, ParagraphStyle("h2", fontSize=14, fontName="Helvetica-Bold", textColor=color, spaceAfter=8, spaceBefore=12))

def h3(text):
    return Paragraph(text, ParagraphStyle("h3", fontSize=11, fontName="Helvetica-Bold", spaceAfter=6, spaceBefore=8))

def body(text):
    return Paragraph(text, ParagraphStyle("body", fontSize=9, leading=14, spaceAfter=6))

def table_style():
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8f9fa"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dee2e6")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ])

# ─────────────────────────────────────────────────
# Company 1: TechNova Solutions Ltd (IT/SaaS — Strong Health)
# ─────────────────────────────────────────────────
def generate_technova():
    filename = os.path.join(OUTPUT_DIR, "TechNova_Solutions_Annual_Report_FY2024.pdf")
    doc = SimpleDocTemplate(filename, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm, leftMargin=2.5*cm, rightMargin=2.5*cm)
    story = []

    story.append(h1("TechNova Solutions Ltd", colors.HexColor("#0066cc")))
    story.append(body("CIN: L72200MH2010PLC123456 | NSE: TECHNOVA | BSE: 543210"))
    story.append(body("Annual Report FY 2023–24 | Fiscal Year Ending March 31, 2024"))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#0066cc"), spaceAfter=12))

    story.append(h2("Corporate Overview"))
    story.append(body("TechNova Solutions Ltd is a leading SaaS and cloud infrastructure provider headquartered in Pune, India. Founded in 2010, the company serves 850+ enterprise clients across 22 countries, offering AI-driven ERP solutions, cloud migration services, and cybersecurity products. The company is listed on NSE and BSE with a market capitalization of approximately ₹18,500 Crore."))
    story.append(body("Sector: Information Technology | Accounting Standard: Ind-AS | Currency: INR (₹ in Crore)"))
    story.append(Spacer(1, 10))

    story.append(h2("Management Discussion & Analysis"))
    story.append(body("The fiscal year 2023-24 marked another milestone in TechNova's growth trajectory. Revenue grew by 21.4% year-on-year, driven by strong demand for our AI-powered ERP Suite and cloud migration services. EBITDA margins improved by 180 basis points to 28.2%, reflecting our continued investment in operational efficiency. Our free cash flow remained robust, providing significant financial flexibility for strategic acquisitions and R&D investment."))
    story.append(body("We successfully onboarded 120 new enterprise clients during the year and expanded our presence in the Middle East and Southeast Asia markets. Our attrition rate declined to 14.8%, reflecting improved employee engagement initiatives. Net headcount additions stood at 2,400 during the year."))
    story.append(body("Looking ahead, we are cautiously optimistic about FY25. While macroeconomic headwinds in key markets and currency volatility remain risks, the structural demand for digital transformation services provides a strong long-term growth foundation. We expect revenue growth of 18-22% for FY25."))
    story.append(Spacer(1, 10))

    story.append(h2("Key Financial Highlights"))
    data = [
        ["Metric", "FY 2023-24", "FY 2022-23", "YoY Change"],
        ["Revenue (₹ Cr)", "8,240", "6,790", "+21.4%"],
        ["EBITDA (₹ Cr)", "2,324", "1,821", "+27.6%"],
        ["Net Profit (₹ Cr)", "1,648", "1,287", "+28.1%"],
        ["EPS (₹)", "54.2", "42.3", "+28.1%"],
        ["Operating Cash Flow (₹ Cr)", "1,920", "1,560", "+23.1%"],
        ["Free Cash Flow (₹ Cr)", "1,680", "1,320", "+27.3%"],
    ]
    t = Table(data, colWidths=[8*cm, 3.5*cm, 3.5*cm, 3.5*cm])
    t.setStyle(table_style())
    story.append(t)
    story.append(Spacer(1, 12))

    story.append(h2("Balance Sheet Highlights"))
    data2 = [
        ["Item", "FY 2023-24 (₹ Cr)", "FY 2022-23 (₹ Cr)"],
        ["Total Assets", "12,450", "10,100"],
        ["Total Equity", "9,820", "8,240"],
        ["Total Debt", "820", "980"],
        ["Cash & Equivalents", "2,840", "2,110"],
        ["Current Assets", "5,200", "4,100"],
        ["Current Liabilities", "2,480", "2,120"],
        ["Accounts Receivable", "1,240", "980"],
        ["Inventory", "45", "38"],
    ]
    t2 = Table(data2, colWidths=[8*cm, 5*cm, 5*cm])
    t2.setStyle(table_style())
    story.append(t2)
    story.append(Spacer(1, 12))

    story.append(h2("Key Financial Ratios"))
    data3 = [
        ["Ratio", "FY24", "FY23", "Industry Avg"],
        ["Return on Equity (ROE)", "16.8%", "15.6%", "14.2%"],
        ["Return on Assets (ROA)", "13.2%", "12.7%", "10.8%"],
        ["Current Ratio", "2.10", "1.93", "1.80"],
        ["Debt-to-Equity Ratio", "0.08", "0.12", "0.35"],
        ["Net Profit Margin", "20.0%", "18.9%", "15.5%"],
        ["Operating Margin", "28.2%", "26.8%", "22.0%"],
        ["Interest Coverage Ratio", "18.4x", "14.2x", "8.0x"],
    ]
    t3 = Table(data3, colWidths=[7*cm, 3*cm, 3*cm, 4*cm])
    t3.setStyle(table_style())
    story.append(t3)
    story.append(Spacer(1, 12))

    story.append(h2("ESG & Governance"))
    story.append(body("TechNova is committed to sustainable business practices. During FY24, we reduced our carbon footprint by 18% through renewable energy adoption at our development centers. Women represent 38% of our total workforce, up from 35% in FY23. The Board comprises 9 members, including 4 independent directors and 2 women directors."))
    story.append(body("No material related-party transactions were reported that required special Board approval beyond standard disclosures. The Audit Committee met 6 times during the year."))
    story.append(Spacer(1, 10))

    story.append(h2("Auditor's Report"))
    story.append(body("To the Members of TechNova Solutions Ltd,"))
    story.append(body("We have audited the accompanying financial statements of TechNova Solutions Ltd for the year ended March 31, 2024. In our opinion and to the best of our information and according to the explanations given to us, the aforesaid financial statements give the information required by the Companies Act, 2013 in the manner so required and give a true and fair view in conformity with the accounting principles generally accepted in India."))
    story.append(body("Auditor: Deloitte Haskins & Sells | Opinion: CLEAN / UNMODIFIED"))
    story.append(Spacer(1, 10))

    story.append(h2("Risk Factors"))
    story.append(body("1. Talent Acquisition & Retention: Competition for skilled technology professionals remains intense in India and globally."))
    story.append(body("2. Cybersecurity Risk: As a provider of enterprise software, TechNova faces ongoing cybersecurity threats. We have invested significantly in our security infrastructure."))
    story.append(body("3. Currency Risk: Approximately 48% of revenue is denominated in USD, EUR, and GBP. We maintain a hedging policy to mitigate currency risk."))
    story.append(body("4. Client Concentration: Our top 10 clients contribute approximately 28% of revenue. We are actively diversifying our client base."))
    story.append(body("5. Regulatory Compliance: Changes in data privacy laws (GDPR, India's DPDP Act) may require additional compliance investments."))

    doc.build(story)
    print(f"✓ Generated: {filename}")
    return filename


# ─────────────────────────────────────────────────
# Company 2: IndiaBank Financial Services Ltd (Banking — High Leverage)
# ─────────────────────────────────────────────────
def generate_indiabank():
    filename = os.path.join(OUTPUT_DIR, "IndiaBank_Financial_Services_Annual_Report_FY2024.pdf")
    doc = SimpleDocTemplate(filename, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm, leftMargin=2.5*cm, rightMargin=2.5*cm)
    story = []

    story.append(h1("IndiaBank Financial Services Ltd", colors.HexColor("#8b0000")))
    story.append(body("CIN: L65190MH2005PLC098765 | NSE: INDIABNK | BSE: 500210"))
    story.append(body("Annual Report FY 2023–24 | Fiscal Year Ending March 31, 2024"))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#8b0000"), spaceAfter=12))

    story.append(h2("Corporate Overview"))
    story.append(body("IndiaBank Financial Services Ltd is a mid-sized private sector bank with 840 branches across 18 states in India. The bank provides retail banking, corporate banking, MSME lending, and wealth management services. Total business (deposits + advances) stands at approximately ₹92,000 Crore. The bank is regulated by the Reserve Bank of India (RBI)."))
    story.append(body("Sector: Banking / NBFC | Accounting Standard: Ind-AS | Currency: INR (₹ in Crore)"))
    story.append(Spacer(1, 10))

    story.append(h2("Management Discussion & Analysis"))
    story.append(body("FY2023-24 was a challenging yet transformative year for IndiaBank. Net Interest Income (NII) grew by 14.2% to ₹3,420 Crore. However, provisions for Non-Performing Assets (NPAs) increased by 22.4% due to stress in the commercial real estate and infrastructure lending segments. Our Gross NPA ratio increased from 3.8% to 4.6%, which we are addressing through enhanced collection mechanisms and one-time settlement schemes."))
    story.append(body("The bank's CASA (Current Account Savings Account) ratio stood at 41.2%, providing a stable low-cost funding base. Capital Adequacy Ratio (CAR) stands at 14.8%, well above the RBI minimum of 11.5%. The bank raised ₹1,200 Crore through a QIP (Qualified Institutional Placement) in Q3FY24 to strengthen the capital base."))
    story.append(body("We acknowledge that credit quality requires continued focus. We are cautious about our outlook for certain stressed sectors and have tightened underwriting standards. The management team remains committed to improving asset quality over the next 6-8 quarters."))
    story.append(Spacer(1, 10))

    story.append(h2("Key Financial Highlights"))
    data = [
        ["Metric", "FY 2023-24", "FY 2022-23", "YoY Change"],
        ["Net Interest Income (₹ Cr)", "3,420", "2,995", "+14.2%"],
        ["Operating Profit (₹ Cr)", "2,840", "2,520", "+12.7%"],
        ["Net Profit (₹ Cr)", "780", "920", "-15.2%"],
        ["EPS (₹)", "12.40", "14.60", "-15.1%"],
        ["Net NPA Ratio", "2.8%", "2.1%", "+70 bps"],
        ["Return on Assets (ROA)", "0.52%", "0.68%", "-16 bps"],
        ["Return on Equity (ROE)", "8.4%", "10.2%", "-180 bps"],
    ]
    t = Table(data, colWidths=[8*cm, 3.5*cm, 3.5*cm, 3.5*cm])
    t.setStyle(table_style())
    story.append(t)
    story.append(Spacer(1, 12))

    story.append(h2("Balance Sheet Highlights"))
    data2 = [
        ["Item", "FY 2023-24 (₹ Cr)", "FY 2022-23 (₹ Cr)"],
        ["Total Assets", "88,400", "78,200"],
        ["Total Equity (Net Worth)", "9,840", "8,620"],
        ["Total Borrowings", "52,400", "45,800"],
        ["Customer Deposits", "62,400", "54,200"],
        ["Net Advances", "54,800", "48,400"],
        ["Cash & Equivalents", "4,200", "3,800"],
        ["Gross NPAs", "2,520", "1,840"],
        ["Net NPAs", "1,534", "1,016"],
    ]
    t2 = Table(data2, colWidths=[8*cm, 5*cm, 5*cm])
    t2.setStyle(table_style())
    story.append(t2)
    story.append(Spacer(1, 12))

    story.append(h2("Key Financial Ratios"))
    data3 = [
        ["Ratio", "FY24", "FY23"],
        ["Capital Adequacy Ratio (CAR)", "14.8%", "15.2%"],
        ["Gross NPA Ratio", "4.6%", "3.8%"],
        ["Net NPA Ratio", "2.8%", "2.1%"],
        ["CASA Ratio", "41.2%", "43.1%"],
        ["Net Interest Margin (NIM)", "3.8%", "3.9%"],
        ["Credit-to-Deposit Ratio", "87.8%", "89.3%"],
        ["Provision Coverage Ratio", "60.2%", "72.4%"],
    ]
    t3 = Table(data3, colWidths=[8*cm, 4*cm, 4*cm])
    t3.setStyle(table_style())
    story.append(t3)
    story.append(Spacer(1, 12))

    story.append(h2("ESG & Governance"))
    story.append(body("IndiaBank is committed to responsible banking. During FY24, the bank disbursed ₹4,200 Crore under Priority Sector Lending, exceeding the 40% PSL target. Financial literacy camps were conducted in 620 villages. The Board comprises 12 members, including 5 independent directors. All related-party transactions have been disclosed per Ind-AS 24 requirements and were conducted at arm's length."))
    story.append(body("Related party transactions: YES — certain transactions with subsidiaries and associate companies are noted. These have been reviewed by the Audit Committee and approved by the Board."))
    story.append(Spacer(1, 10))

    story.append(h2("Auditor's Report"))
    story.append(body("To the Members of IndiaBank Financial Services Ltd,"))
    story.append(body("We have audited the financial statements of IndiaBank Financial Services Ltd for the year ended March 31, 2024. In our opinion, the financial statements give a true and fair view of the financial position and financial performance of the Bank."))
    story.append(body("Emphasis of Matter: We draw attention to Note 28 regarding the classification of certain restructured accounts and the adequacy of provisions thereon. The management is confident that existing provisions are adequate."))
    story.append(body("Auditor: Ernst & Young LLP | Opinion: UNMODIFIED (with Emphasis of Matter)"))
    story.append(Spacer(1, 10))

    story.append(h2("Risk Factors"))
    story.append(body("1. Credit Risk: Exposure to real estate and infrastructure sectors (~18% of loan book) carries elevated risk in the current interest rate environment."))
    story.append(body("2. Interest Rate Risk: The bank's net interest margins may compress if deposit rates rise faster than lending rates."))
    story.append(body("3. Regulatory Risk: RBI guidelines on provisioning norms, data localization, and KYC requirements may increase compliance costs."))
    story.append(body("4. Operational Risk: Cybersecurity threats to digital banking infrastructure remain a material concern."))
    story.append(body("5. Liquidity Risk: While the LCR stands at 128%, any sudden large-scale deposit withdrawals could stress liquidity in the short term."))

    doc.build(story)
    print(f"✓ Generated: {filename}")
    return filename


# ─────────────────────────────────────────────────
# Company 3: GreenPharma Industries Ltd (Pharma — Moderate Risk)
# ─────────────────────────────────────────────────
def generate_greenpharma():
    filename = os.path.join(OUTPUT_DIR, "GreenPharma_Industries_Annual_Report_FY2024.pdf")
    doc = SimpleDocTemplate(filename, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm, leftMargin=2.5*cm, rightMargin=2.5*cm)
    story = []

    story.append(h1("GreenPharma Industries Ltd", colors.HexColor("#006400")))
    story.append(body("CIN: L24230GJ2001PLC087654 | NSE: GPHARMA | BSE: 532890"))
    story.append(body("Annual Report FY 2023–24 | Fiscal Year Ending March 31, 2024"))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#006400"), spaceAfter=12))

    story.append(h2("Corporate Overview"))
    story.append(body("GreenPharma Industries Ltd is a mid-size pharmaceutical company headquartered in Ahmedabad, Gujarat. The company manufactures and markets branded generic medicines, APIs (Active Pharmaceutical Ingredients), and nutraceuticals. GreenPharma exports to 48 countries including regulated markets such as the US (USFDA approved), Europe (WHO-GMP certified), and Australia (TGA registered). The company operates 4 manufacturing facilities."))
    story.append(body("Sector: Pharma / Healthcare | Accounting Standard: Ind-AS | Currency: INR (₹ in Crore)"))
    story.append(Spacer(1, 10))

    story.append(h2("Management Discussion & Analysis"))
    story.append(body("FY2023-24 was a year of recovery for GreenPharma after the challenges posed by USFDA import alerts on two of our API manufacturing units in the previous year. Revenue grew by 8.4%, driven primarily by domestic branded formulations (+18.2% YoY) while export revenue declined by 3.8% as we worked through remediation at our Dahej facility. The import alert on Unit-II was cleared in Q2FY24, and we expect full export recovery in FY25."))
    story.append(body("R&D investment increased to ₹142 Crore (4.3% of revenue), with 28 new product dossiers filed during the year. We received approval for 12 new molecules from the Central Drugs Standard Control Organisation (CDSCO). Operating cash flow remained healthy at ₹410 Crore despite higher capex investments in API infrastructure."))
    story.append(body("The company faces pricing pressure in the domestic market due to NLEM (National List of Essential Medicines) revisions. However, our pipeline of specialty products and biologics provides a pathway to improved margins over the next 3-5 years. Capital allocation remains disciplined with a focus on debt reduction."))
    story.append(Spacer(1, 10))

    story.append(h2("Key Financial Highlights"))
    data = [
        ["Metric", "FY 2023-24", "FY 2022-23", "YoY Change"],
        ["Revenue (₹ Cr)", "3,298", "3,043", "+8.4%"],
        ["EBITDA (₹ Cr)", "612", "541", "+13.1%"],
        ["Net Profit (₹ Cr)", "288", "224", "+28.6%"],
        ["EPS (₹)", "18.6", "14.4", "+29.2%"],
        ["Operating Cash Flow (₹ Cr)", "410", "342", "+19.9%"],
        ["R&D Spend (₹ Cr)", "142", "124", "+14.5%"],
        ["Capex (₹ Cr)", "285", "198", "+44.0%"],
    ]
    t = Table(data, colWidths=[8*cm, 3.5*cm, 3.5*cm, 3.5*cm])
    t.setStyle(table_style())
    story.append(t)
    story.append(Spacer(1, 12))

    story.append(h2("Balance Sheet Highlights"))
    data2 = [
        ["Item", "FY 2023-24 (₹ Cr)", "FY 2022-23 (₹ Cr)"],
        ["Total Assets", "4,820", "4,380"],
        ["Total Equity", "2,940", "2,680"],
        ["Total Debt", "960", "1,180"],
        ["Cash & Equivalents", "284", "198"],
        ["Current Assets", "1,820", "1,640"],
        ["Current Liabilities", "1,240", "1,180"],
        ["Accounts Receivable", "640", "580"],
        ["Inventory", "820", "760"],
    ]
    t2 = Table(data2, colWidths=[8*cm, 5*cm, 5*cm])
    t2.setStyle(table_style())
    story.append(t2)
    story.append(Spacer(1, 12))

    story.append(h2("Key Financial Ratios"))
    data3 = [
        ["Ratio", "FY24", "FY23", "Industry Avg"],
        ["Return on Equity (ROE)", "9.8%", "8.4%", "12.0%"],
        ["Return on Assets (ROA)", "6.0%", "5.1%", "7.2%"],
        ["Current Ratio", "1.47", "1.39", "1.80"],
        ["Quick Ratio", "0.81", "0.75", "1.10"],
        ["Debt-to-Equity Ratio", "0.33", "0.44", "0.40"],
        ["Net Profit Margin", "8.7%", "7.4%", "12.0%"],
        ["Operating Margin (EBITDA)", "18.6%", "17.8%", "22.0%"],
        ["Interest Coverage Ratio", "5.2x", "4.0x", "6.0x"],
    ]
    t3 = Table(data3, colWidths=[7*cm, 3*cm, 3*cm, 4*cm])
    t3.setStyle(table_style())
    story.append(t3)
    story.append(Spacer(1, 12))

    story.append(h2("ESG & Governance"))
    story.append(body("GreenPharma is committed to environmental stewardship. All four manufacturing units are ISO 14001 certified. Water consumption per unit of production declined by 11% during FY24. The company's CSR initiatives reached 42,000 beneficiaries across 120 villages in Gujarat and Maharashtra through health camps, school infrastructure support, and women empowerment programs."))
    story.append(body("The Board comprises 10 members, including 4 independent directors (40%) and 2 women directors. The company has implemented a robust whistleblower policy and ethics hotline."))
    story.append(body("Related party transactions: Standard transactions with subsidiaries as disclosed. No unusual or material RPTs noted."))
    story.append(Spacer(1, 10))

    story.append(h2("Auditor's Report"))
    story.append(body("To the Members of GreenPharma Industries Ltd,"))
    story.append(body("We have audited the financial statements of GreenPharma Industries Ltd for the year ended March 31, 2024. In our opinion, based on our audit, the aforementioned standalone financial statements give the information required by the Companies Act, 2013 and give a true and fair view in conformity with Ind-AS."))
    story.append(body("Key Audit Matter: Revenue recognition for export sales — particularly timing of revenue recognition for goods-in-transit at year end. Management's approach is consistent with Ind-AS 115."))
    story.append(body("Auditor: KPMG Assurance and Consulting Services LLP | Opinion: CLEAN / UNMODIFIED"))
    story.append(Spacer(1, 10))

    story.append(h2("Risk Factors"))
    story.append(body("1. Regulatory Risk: USFDA inspections at our US-registered facilities carry the risk of observations or import alerts that could impact export revenue."))
    story.append(body("2. Raw Material Risk: API intermediates sourced from China (approximately 34% of RM cost) expose the company to supply chain and geopolitical risks."))
    story.append(body("3. Pricing Pressure: DPCO (Drug Price Control Order) revisions and tender-based procurement in government hospitals may compress domestic margins."))
    story.append(body("4. Currency Risk: USD-denominated export revenues (~42% of total) are partially hedged through forward contracts. Currency appreciation could impact export margins."))
    story.append(body("5. IP Risk: Product patent challenges and competition from generic manufacturers in export markets may accelerate price erosion."))
    story.append(body("6. Litigation: The company is subject to routine IP litigation in the US market. Current provisioning is considered adequate by management and legal counsel."))

    doc.build(story)
    print(f"✓ Generated: {filename}")
    return filename


if __name__ == "__main__":
    print("Generating FinGuard AI test PDFs...")
    print()
    f1 = generate_technova()
    f2 = generate_indiabank()
    f3 = generate_greenpharma()
    print()
    print(f"All 3 test PDFs generated in: {OUTPUT_DIR}")
    print()
    print("How to use:")
    print("  1. Start the backend: cd backend && uvicorn main:app --reload")
    print("  2. Start the frontend: cd frontend && npm run dev")
    print("  3. Login and navigate to /upload")
    print("  4. Upload each PDF:")
    print(f"     - TechNova_Solutions_Annual_Report_FY2024.pdf (Company: TechNova Solutions, Year: 2024, Sector: SaaS)")
    print(f"     - IndiaBank_Financial_Services_Annual_Report_FY2024.pdf (Company: IndiaBank Financial Services, Year: 2024, Sector: Banking)")
    print(f"     - GreenPharma_Industries_Annual_Report_FY2024.pdf (Company: GreenPharma Industries, Year: 2024, Sector: Pharma)")
