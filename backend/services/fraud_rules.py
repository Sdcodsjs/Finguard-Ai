"""
FinGuard AI — Fraud Rule Engine + Red Flag Counter (Features #3, #5, #13)
Rule-based fraud detection, auditor change detection, and red flag tallying.
Pure Python if-statements on extracted numbers. Zero API calls.
"""
from typing import Optional


def run_fraud_rules(
    current_data: dict,
    prior_data: Optional[dict] = None,
) -> dict:
    """
    Run rule-based fraud checks on extracted financial data.
    Returns a list of red flags grouped by category.
    
    current_data / prior_data: extraction_json from the pipeline.
    """
    flags: list[dict] = []

    is_ = current_data.get("income_statement", {})
    bs = current_data.get("balance_sheet", {})
    cf = current_data.get("cash_flow", {})

    revenue = is_.get("revenue")
    net_profit = is_.get("net_profit")
    ebitda = is_.get("ebitda")
    total_debt = bs.get("total_debt")
    cash = bs.get("cash_and_equivalents")
    total_assets = bs.get("total_assets")
    ocf = cf.get("operating_cash_flow")
    fcf = cf.get("free_cash_flow")
    receivables = bs.get("accounts_receivable")
    inventory = bs.get("inventory")

    # ── Rule 1: Profit up but cash flow down (Earnings Quality) ───
    if prior_data:
        prev_is = prior_data.get("income_statement", {})
        prev_cf = prior_data.get("cash_flow", {})
        prev_profit = prev_is.get("net_profit")
        prev_ocf = prev_cf.get("operating_cash_flow")

        if prev_profit and net_profit and prev_ocf and ocf:
            profit_change = (net_profit - prev_profit) / abs(prev_profit) if prev_profit != 0 else 0
            ocf_change = (ocf - prev_ocf) / abs(prev_ocf) if prev_ocf != 0 else 0

            if profit_change > 0.30 and ocf_change < -0.20:
                flags.append({
                    "flag": "Potential Earnings Manipulation",
                    "detail": f"Profit increased {profit_change:.0%} but operating cash flow declined {ocf_change:.0%}",
                    "category": "financial",
                    "severity": "high",
                    "rule": "profit_up_cash_down",
                })

        # Revenue growth vs receivables growth
        prev_revenue = prev_is.get("revenue")
        prev_receivables = prior_data.get("balance_sheet", {}).get("accounts_receivable")
        if prev_revenue and revenue and prev_receivables and receivables:
            rev_growth = (revenue - prev_revenue) / abs(prev_revenue) if prev_revenue != 0 else 0
            rec_growth = (receivables - prev_receivables) / abs(prev_receivables) if prev_receivables != 0 else 0
            if rec_growth > rev_growth * 1.5 and rec_growth > 0.20:
                flags.append({
                    "flag": "Receivables Growing Faster Than Revenue",
                    "detail": f"Receivables grew {rec_growth:.0%} vs revenue {rev_growth:.0%} — potential channel stuffing",
                    "category": "financial",
                    "severity": "medium",
                    "rule": "receivables_outpacing_revenue",
                })

        # Debt growth vs revenue growth
        prev_debt = prior_data.get("balance_sheet", {}).get("total_debt")
        if prev_debt and total_debt and prev_revenue and revenue:
            debt_growth = (total_debt - prev_debt) / abs(prev_debt) if prev_debt != 0 else 0
            rev_growth2 = (revenue - prev_revenue) / abs(prev_revenue) if prev_revenue != 0 else 0
            if debt_growth > rev_growth2 * 2 and debt_growth > 0.25:
                flags.append({
                    "flag": "Debt Growing Faster Than Revenue",
                    "detail": f"Debt grew {debt_growth:.0%} vs revenue {rev_growth2:.0%}",
                    "category": "financial",
                    "severity": "medium",
                    "rule": "debt_outpacing_revenue",
                })

    # ── Rule 2: Profit >> Cash Flow ratio ──────────────────────
    if net_profit and ocf and net_profit > 0 and ocf > 0:
        if net_profit / ocf > 3.0:
            flags.append({
                "flag": "Profit Significantly Exceeds Cash Flow",
                "detail": f"Net profit is {net_profit/ocf:.1f}x operating cash flow — earnings quality concern",
                "category": "financial",
                "severity": "high",
                "rule": "profit_exceeds_cash_flow",
            })

    # ── Rule 3: Negative free cash flow with positive profit ───
    if net_profit and fcf and net_profit > 0 and fcf < 0:
        flags.append({
            "flag": "Negative Free Cash Flow Despite Profit",
            "detail": f"Net profit: {net_profit:,.0f} but FCF: {fcf:,.0f}",
            "category": "financial",
            "severity": "medium",
            "rule": "negative_fcf_positive_profit",
        })

    # ── Rule 4: Very high debt/equity ──────────────────────────
    total_equity = bs.get("total_equity")
    if total_debt and total_equity and total_equity > 0:
        de_ratio = total_debt / total_equity
        if de_ratio > 3.0:
            flags.append({
                "flag": "Extremely High Leverage",
                "detail": f"Debt/Equity ratio: {de_ratio:.2f} — financial distress risk",
                "category": "financial",
                "severity": "critical",
                "rule": "extreme_leverage",
            })
        elif de_ratio > 2.0:
            flags.append({
                "flag": "High Leverage",
                "detail": f"Debt/Equity ratio: {de_ratio:.2f}",
                "category": "financial",
                "severity": "medium",
                "rule": "high_leverage",
            })

    # ── Rule 5: Related party transactions ─────────────────────
    rpt = current_data.get("related_party_transactions_noted")
    if rpt is True:
        flags.append({
            "flag": "Related Party Transactions Noted",
            "detail": "Annual report indicates related-party transactions — review for arm's length compliance",
            "category": "governance",
            "severity": "medium",
            "rule": "related_party",
        })

    # ── Rule 6: Qualified audit opinion ────────────────────────
    audit_opinion = current_data.get("auditor_opinion", "").lower()
    if audit_opinion in ("qualified", "adverse", "disclaimer"):
        severity = "critical" if audit_opinion in ("adverse", "disclaimer") else "high"
        flags.append({
            "flag": f"Auditor Opinion: {audit_opinion.title()}",
            "detail": f"The auditor issued a '{audit_opinion}' opinion — requires immediate review",
            "category": "auditor",
            "severity": severity,
            "rule": "audit_opinion",
        })

    # ── Rule 7: Low extraction confidence ──────────────────────
    confidence = current_data.get("extraction_confidence")
    if confidence is not None and confidence < 50:
        flags.append({
            "flag": "Low Data Extraction Confidence",
            "detail": f"Extraction confidence: {confidence}% — numbers may be unreliable",
            "category": "data_quality",
            "severity": "medium",
            "rule": "low_confidence",
        })

    return {
        "flags": flags,
        "total_count": len(flags),
        "counts_by_category": _count_by_category(flags),
        "counts_by_severity": _count_by_severity(flags),
    }


def _count_by_category(flags: list[dict]) -> dict:
    counts: dict[str, int] = {}
    for f in flags:
        cat = f.get("category", "other")
        counts[cat] = counts.get(cat, 0) + 1
    return counts


def _count_by_severity(flags: list[dict]) -> dict:
    counts: dict[str, int] = {}
    for f in flags:
        sev = f.get("severity", "unknown")
        counts[sev] = counts.get(sev, 0) + 1
    return counts


# ──────────────────────────────────────────
# Auditor Change Detection (Feature #5)
# ──────────────────────────────────────────

def detect_auditor_change(
    current_auditor: Optional[str],
    prior_auditor: Optional[str],
    current_year: int = 0,
    prior_year: int = 0,
) -> Optional[dict]:
    """
    Simple string comparison to detect auditor changes.
    Returns a flag dict if change detected, None otherwise.
    """
    if not current_auditor or not prior_auditor:
        return None

    # Normalize for comparison
    curr = current_auditor.strip().lower()
    prev = prior_auditor.strip().lower()

    if curr != prev:
        return {
            "flag": "Auditor Change Detected",
            "detail": f"Auditor changed from '{prior_auditor}' ({prior_year}) to '{current_auditor}' ({current_year})",
            "category": "auditor",
            "severity": "high",
            "prior_auditor": prior_auditor,
            "current_auditor": current_auditor,
            "rule": "auditor_change",
        }
    return None
