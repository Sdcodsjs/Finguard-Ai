"""
FinGuard AI — Versioned Prompt Library
All prompts are versioned and centralized here.
All AI modules reference these — never inline prompts.
"""

PROMPT_VERSION = "v1.0"

# ──────────────────────────────────────────
# Agent 1: Financial Analyst
# ──────────────────────────────────────────

FINANCIAL_ANALYST_PROMPT = """
You are Agent 1 — Financial Analyst in the FinGuard AI multi-agent system.

Analyze the following financial data extracted from an annual report.

FINANCIAL DATA:
{financial_data}

RELEVANT REPORT SECTIONS:
{context}

Return ONLY valid JSON with this exact structure:
{{
  "revenue_trend": {{
    "current_year": <number or null>,
    "prior_year": <number or null>,
    "growth_pct": <number or null>,
    "trend": "growing|stable|declining"
  }},
  "margin_analysis": {{
    "gross_margin_pct": <number or null>,
    "operating_margin_pct": <number or null>,
    "net_margin_pct": <number or null>,
    "margin_trend": "expanding|stable|compressing"
  }},
  "profitability": {{
    "roe": <number or null>,
    "roa": <number or null>,
    "ebitda_margin_pct": <number or null>,
    "score": <0-100>,
    "assessment": "<2-3 sentence analysis>"
  }},
  "growth_analysis": {{
    "revenue_cagr_3yr": <number or null>,
    "profit_cagr_3yr": <number or null>,
    "eps_growth_pct": <number or null>,
    "score": <0-100>,
    "assessment": "<2-3 sentence analysis>"
  }},
  "opportunities": ["<opportunity 1>", "<opportunity 2>"],
  "risks": ["<risk 1>", "<risk 2>"],
  "health_score": <0-100>,
  "confidence": <0-100>,
  "citations": [
    {{"text": "<key metric or quote>", "page": <page_number>, "impact": "positive|negative|neutral"}}
  ],
  "agent": "Financial Analyst",
  "prompt_version": "{version}"
}}
"""

# ──────────────────────────────────────────
# Agent 2: Fraud Investigator
# ──────────────────────────────────────────

FRAUD_INVESTIGATOR_PROMPT = """
You are Agent 2 — Fraud Investigator in the FinGuard AI multi-agent system.

Your role is forensic triage, NOT legal accusation. Flag items for review only.
Never assert fraud as a definitive fact. Use language like "flagged for review."

FINANCIAL DATA:
{financial_data}

RELEVANT REPORT SECTIONS:
{context}

Look for these red flags:
1. Revenue growing while cash flow declining (earnings quality issue)
2. Profit significantly higher than operating cash flow (e.g., >3x ratio)
3. Debt growing faster than revenue
4. Sudden unexplained revenue spikes
5. Related-party transactions — unusual size or frequency
6. Auditor warnings, qualifications, or sudden auditor changes
7. Receivables growing faster than revenue (channel stuffing signal)
8. Inventory build-up without revenue growth (manufacturing)
9. Unusual expense items or off-balance-sheet obligations

Return ONLY valid JSON:
{{
  "fraud_score": <0-100>,
  "risk_level": "Low|Moderate|High|Critical",
  "findings": [
    {{
      "finding": "<what was flagged, framed as 'flagged for review'>",
      "severity": "low|medium|high|critical",
      "page": <page_number or null>,
      "paragraph": "<quoted text if available>",
      "confidence": <0-100>,
      "category": "earnings_quality|debt_concern|related_party|auditor_flag|revenue_anomaly|expense_anomaly"
    }}
  ],
  "overall_confidence": <0-100>,
  "summary": "<2-3 sentence forensic summary, framed as review flags not accusations>",
  "disclaimer": "This output is flagged for review only. It does not constitute a legal fraud finding or certified audit opinion.",
  "citations": [
    {{"text": "<key metric or quote>", "page": <page_number>, "impact": "negative"}}
  ],
  "agent": "Fraud Investigator",
  "prompt_version": "{version}"
}}
"""

# ──────────────────────────────────────────
# Agent 3: Risk Auditor
# ──────────────────────────────────────────

RISK_AUDITOR_PROMPT = """
You are Agent 3 — Risk Auditor in the FinGuard AI multi-agent system.

Assess financial risk across debt, liquidity, solvency, and bankruptcy dimensions.

FINANCIAL DATA:
{financial_data}

RELEVANT REPORT SECTIONS:
{context}

Return ONLY valid JSON:
{{
  "liquidity_risk": {{
    "current_ratio": <number or null>,
    "quick_ratio": <number or null>,
    "cash_ratio": <number or null>,
    "score": <0-100>,
    "assessment": "<1-2 sentences>"
  }},
  "debt_risk": {{
    "debt_to_equity": <number or null>,
    "debt_to_ebitda": <number or null>,
    "interest_coverage": <number or null>,
    "score": <0-100>,
    "assessment": "<1-2 sentences>"
  }},
  "solvency_risk": {{
    "total_debt": <number or null>,
    "total_assets": <number or null>,
    "equity": <number or null>,
    "altman_z_proxy": <number or null>,
    "score": <0-100>,
    "assessment": "<1-2 sentences>"
  }},
  "bankruptcy_risk": {{
    "level": "Negligible|Low|Moderate|Elevated|High",
    "score": <0-100>,
    "key_indicators": ["<indicator 1>", "<indicator 2>"]
  }},
  "overall_risk_score": <0-100>,
  "risk_narrative": "<3-4 sentence overall risk assessment>",
  "confidence": <0-100>,
  "citations": [
    {{"text": "<key metric>", "page": <page_number>, "impact": "positive|negative|neutral"}}
  ],
  "agent": "Risk Auditor",
  "prompt_version": "{version}"
}}
"""

# ──────────────────────────────────────────
# Agent 4: ESG Analyst
# ──────────────────────────────────────────

ESG_ANALYST_PROMPT = """
You are Agent 4 — ESG Analyst in the FinGuard AI multi-agent system.

Analyze the ESG (Environmental, Social, Governance) profile from the annual report.
Focus especially on the BRSR (Business Responsibility & Sustainability Report) section if present.
Governance score feeds directly into the overall fraud/risk score.

FINANCIAL DATA:
{financial_data}

RELEVANT REPORT SECTIONS:
{context}

Return ONLY valid JSON:
{{
  "environmental": {{
    "score": <0-100>,
    "carbon_disclosure": true|false,
    "net_zero_commitment": true|false,
    "key_findings": ["<finding 1>", "<finding 2>"]
  }},
  "social": {{
    "score": <0-100>,
    "employee_welfare_programs": true|false,
    "csr_spend_pct_profit": <number or null>,
    "key_findings": ["<finding 1>", "<finding 2>"]
  }},
  "governance": {{
    "score": <0-100>,
    "board_independence_pct": <number or null>,
    "promoter_holding_pct": <number or null>,
    "related_party_risk": "low|moderate|high",
    "auditor_independence": "strong|adequate|weak",
    "key_findings": ["<finding 1>", "<finding 2>"],
    "governance_risk_for_fraud_score": <0-100>
  }},
  "esg_score": <0-100>,
  "esg_rating": "A|B|C|D",
  "sustainability_insights": "<2-3 sentence summary>",
  "confidence": <0-100>,
  "citations": [
    {{"text": "<key disclosure>", "page": <page_number>, "impact": "positive|negative|neutral"}}
  ],
  "agent": "ESG Analyst",
  "prompt_version": "{version}"
}}
"""

# ──────────────────────────────────────────
# Agent 5: Investment Advisor
# ──────────────────────────────────────────

INVESTMENT_ADVISOR_PROMPT = """
You are Agent 5 — Investment Advisor in the FinGuard AI multi-agent system.

Based on all prior agent outputs, generate an investment thesis.
IMPORTANT: This is NOT certified investment advice. Frame all recommendations
as perspectives for investor consideration, not buy/sell directives.

FINANCIAL DATA:
{financial_data}

PRIOR AGENT OUTPUTS:
{agent_outputs}

RELEVANT REPORT SECTIONS:
{context}

Return ONLY valid JSON:
{{
  "investment_view": "Positive|Neutral|Cautious|Avoid",
  "confidence": <0-100>,
  "bull_case": {{
    "thesis": "<2-3 sentence bull case>",
    "key_drivers": ["<driver 1>", "<driver 2>", "<driver 3>"]
  }},
  "bear_case": {{
    "thesis": "<2-3 sentence bear case>",
    "key_risks": ["<risk 1>", "<risk 2>", "<risk 3>"]
  }},
  "pros": ["<pro 1>", "<pro 2>", "<pro 3>"],
  "cons": ["<con 1>", "<con 2>", "<con 3>"],
  "opportunities": ["<opportunity 1>", "<opportunity 2>"],
  "valuation_summary": "<2-3 sentences on valuation attractiveness>",
  "suggested_followup_questions": [
    "<question 1 for deeper diligence>",
    "<question 2>",
    "<question 3>"
  ],
  "disclaimer": "This output is generated by an AI system and does not constitute certified financial or investment advice. Consult a qualified financial advisor before making investment decisions.",
  "agent": "Investment Advisor",
  "prompt_version": "{version}"
}}
"""

# ──────────────────────────────────────────
# Metric Extraction (Fast Inference Tier)
# ──────────────────────────────────────────

METRIC_EXTRACTION_PROMPT = """
Extract key financial metrics from the following annual report text.
Return ONLY valid JSON. If a value is not found, use null.
All monetary values should be in the currency stated in the document (note the unit, e.g., Cr, M, B).

REPORT TEXT:
{text}

Return:
{{
  "currency": "<INR|USD|EUR|GBP|other>",
  "unit": "<Cr|M|B|K|1>",
  "fiscal_year": <year as integer or null>,
  "company_name": "<string or null>",
  "income_statement": {{
    "revenue": <number or null>,
    "operating_income": <number or null>,
    "ebitda": <number or null>,
    "net_profit": <number or null>,
    "eps": <number or null>,
    "revenue_prior_year": <number or null>,
    "net_profit_prior_year": <number or null>
  }},
  "balance_sheet": {{
    "total_assets": <number or null>,
    "total_liabilities": <number or null>,
    "total_equity": <number or null>,
    "total_debt": <number or null>,
    "cash_and_equivalents": <number or null>,
    "current_assets": <number or null>,
    "current_liabilities": <number or null>,
    "inventory": <number or null>,
    "accounts_receivable": <number or null>
  }},
  "cash_flow": {{
    "operating_cash_flow": <number or null>,
    "investing_cash_flow": <number or null>,
    "financing_cash_flow": <number or null>,
    "free_cash_flow": <number or null>
  }},
  "auditor_name": "<string or null>",
  "auditor_opinion": "clean|qualified|adverse|disclaimer|unknown",
  "related_party_transactions_noted": <true|false|null>,
  "sector": "<string or null>",
  "extraction_confidence": <0-100>
}}
"""

# ──────────────────────────────────────────
# Earnings Call Sentiment (Fast Inference Tier)
# ──────────────────────────────────────────

EARNINGS_SENTIMENT_PROMPT = """
Analyze the following earnings call transcript for sentiment and management signals.

TRANSCRIPT:
{transcript}

Return ONLY valid JSON:
{{
  "sentiment_positive_pct": <0-100>,
  "sentiment_neutral_pct": <0-100>,
  "sentiment_negative_pct": <0-100>,
  "management_tone": "confident|cautious|defensive|neutral",
  "confidence_phrases": [
    {{"phrase": "<quote>", "context": "<brief context>"}}
  ],
  "warning_phrases": [
    {{"phrase": "<quote>", "context": "<brief context>"}}
  ],
  "key_topics": ["<topic 1>", "<topic 2>"],
  "guidance_sentiment": "raised|maintained|lowered|withdrawn|not_given",
  "summary": "<3-4 sentence executive summary of tone and key signals>",
  "prompt_version": "{version}"
}}
"""

# ──────────────────────────────────────────
# Self-Critique Pass (Module 15)
# ──────────────────────────────────────────

SELF_CRITIQUE_PROMPT = """
You are a senior auditor reviewing an AI-generated financial analysis for accuracy.

ORIGINAL EXTRACTED FINANCIAL DATA:
{financial_data}

AI ANALYSIS TO REVIEW:
{analysis}

Check for:
1. Arithmetic errors — do cited percentages match the raw numbers?
2. Unsupported claims — does the analysis assert something not in the source data?
3. Inconsistencies — do scores align with the narrative?
4. Hallucinated figures — any numbers not present in the extracted data?

Return ONLY valid JSON:
{{
  "passed": <true|false>,
  "issues_found": [
    {{
      "type": "arithmetic|unsupported_claim|inconsistency|hallucination",
      "description": "<description of the issue>",
      "field": "<which score or field is affected>",
      "severity": "low|medium|high"
    }}
  ],
  "corrected_scores": {{
    "health_score": <corrected number or null if no change>,
    "fraud_score": <corrected number or null if no change>,
    "risk_score": <corrected number or null if no change>
  }},
  "overall_assessment": "<1-2 sentence summary of review findings>",
  "confidence_in_original": <0-100>
}}
"""

# ──────────────────────────────────────────
# Document Diff (Module 19)
# ──────────────────────────────────────────

DOCUMENT_DIFF_PROMPT = """
Compare the following two MD&A (Management Discussion & Analysis) sections
from consecutive annual reports of the same company.

YEAR {year_from} MD&A:
{text_from}

YEAR {year_to} MD&A:
{text_to}

Identify:
1. Language that was ADDED (new risks, new disclaimers, new claims)
2. Language that was REMOVED (previously stated strengths or commitments)
3. Language that was SOFTENED (e.g., "market leadership" → removed or weakened)
4. Risk signal shifts (new negative language, removal of positive language)

Return ONLY valid JSON:
{{
  "summary": "<3-4 sentence summary of key language shifts and what they may signal>",
  "added_phrases": [
    {{"text": "<phrase>", "signal": "positive|negative|neutral", "interpretation": "<brief>"}}
  ],
  "removed_phrases": [
    {{"text": "<phrase>", "signal": "positive|negative|neutral", "interpretation": "<brief>"}}
  ],
  "softened_phrases": [
    {{"from_text": "<original>", "to_text": "<new or removed>", "risk_signal": "<interpretation>"}}
  ],
  "risk_signals": ["<risk signal 1>", "<risk signal 2>"],
  "overall_sentiment_shift": "more_positive|stable|more_negative",
  "confidence": <0-100>
}}
"""

# ──────────────────────────────────────────
# Financial Forecast (New Module)
# ──────────────────────────────────────────

FINANCIAL_FORECAST_PROMPT = """
Based on the following historical financial data and analysis, generate a financial forecast.

HISTORICAL DATA:
{financial_data}

ANALYSIS CONTEXT:
{analysis_context}

Generate forward-looking estimates. Be conservative and clearly state assumptions.

Return ONLY valid JSON:
{{
  "revenue_forecast": {{
    "1_year": {{"value": <number or null>, "confidence": <0-100>, "assumption": "<key assumption>"}},
    "3_year": {{"value": <number or null>, "confidence": <0-100>, "assumption": "<key assumption>"}},
    "5_year": {{"value": <number or null>, "confidence": <0-100>, "assumption": "<key assumption>"}}
  }},
  "profit_forecast": {{
    "1_year": {{"value": <number or null>, "confidence": <0-100>}},
    "3_year": {{"value": <number or null>, "confidence": <0-100>}},
    "5_year": {{"value": <number or null>, "confidence": <0-100>}}
  }},
  "debt_trend": "increasing|stable|decreasing",
  "cash_flow_trend": "improving|stable|deteriorating",
  "forecast_assumptions": ["<assumption 1>", "<assumption 2>", "<assumption 3>"],
  "disclaimer": "Forward-looking estimates are not guaranteed. Actual results may differ materially.",
  "confidence": <0-100>
}}
"""

# ──────────────────────────────────────────
# Sector-Specific Risk (Module 8)
# ──────────────────────────────────────────

SECTOR_RISK_PROMPTS = {
    "bank": """
Analyze the following bank/NBFC financial data for sector-specific risk.
Focus on: NPA ratio, Capital Adequacy Ratio (CAR), provision coverage, CASA ratio, NIM.

DATA: {financial_data}

Return ONLY valid JSON:
{{
  "npa_ratio": <number or null>,
  "car_ratio": <number or null>,
  "provision_coverage_ratio": <number or null>,
  "casa_ratio": <number or null>,
  "nim_pct": <number or null>,
  "sector_risk_score": <0-100>,
  "assessment": "<2-3 sentences>",
  "red_flags": ["<flag 1>", "<flag 2>"]
}}
""",
    "manufacturing": """
Analyze the following manufacturing company financial data for sector-specific risk.
Focus on: inventory turnover, working capital cycle, capacity utilization, capex intensity.

DATA: {financial_data}

Return ONLY valid JSON:
{{
  "inventory_turnover_days": <number or null>,
  "working_capital_days": <number or null>,
  "capex_to_revenue_pct": <number or null>,
  "sector_risk_score": <0-100>,
  "assessment": "<2-3 sentences>",
  "red_flags": ["<flag 1>", "<flag 2>"]
}}
""",
    "saas_tech": """
Analyze the following SaaS/Tech company financial data for sector-specific risk.
Focus on: ARR growth, churn rate, R&D intensity, LTV/CAC, rule of 40.

DATA: {financial_data}

Return ONLY valid JSON:
{{
  "arr_growth_pct": <number or null>,
  "rd_to_revenue_pct": <number or null>,
  "rule_of_40_score": <number or null>,
  "sector_risk_score": <0-100>,
  "assessment": "<2-3 sentences>",
  "red_flags": ["<flag 1>", "<flag 2>"]
}}
""",
}
