"""
FinGuard AI — Financial Ratio Engine (Feature #1, #4)
Pure math on extracted financial data. Zero API calls.
Computes: ROE, ROA, D/E, Current Ratio, Quick Ratio, Interest Coverage,
          Profit Margin, Operating Margin, plus Risk Heatmap buckets.
"""
from typing import Optional


def safe_div(a: Optional[float], b: Optional[float]) -> Optional[float]:
    """Safe division — returns None if either operand is None or divisor is zero."""
    if a is None or b is None or b == 0:
        return None
    return a / b


def compute_all_ratios(data: dict) -> dict:
    """
    Compute all financial ratios from extracted financial data.
    
    Expected input keys (from extraction_json):
      income_statement: {revenue, operating_income, ebitda, net_profit, interest_expense}
      balance_sheet: {total_assets, total_equity, total_debt, current_assets,
                      current_liabilities, cash_and_equivalents, inventory}
      cash_flow: {operating_cash_flow, free_cash_flow}
    """
    is_ = data.get("income_statement", {})
    bs = data.get("balance_sheet", {})
    cf = data.get("cash_flow", {})

    revenue = is_.get("revenue")
    operating_income = is_.get("operating_income")
    net_profit = is_.get("net_profit")
    ebitda = is_.get("ebitda")
    interest_expense = is_.get("interest_expense")

    total_assets = bs.get("total_assets")
    total_equity = bs.get("total_equity")
    total_debt = bs.get("total_debt")
    current_assets = bs.get("current_assets")
    current_liabilities = bs.get("current_liabilities")
    cash = bs.get("cash_and_equivalents")
    inventory = bs.get("inventory")

    ocf = cf.get("operating_cash_flow")
    fcf = cf.get("free_cash_flow")

    # ── Core Ratios ──────────────────────────────────
    roe = safe_div(net_profit, total_equity)
    roa = safe_div(net_profit, total_assets)
    debt_to_equity = safe_div(total_debt, total_equity)
    current_ratio = safe_div(current_assets, current_liabilities)

    # Quick ratio = (Current Assets - Inventory) / Current Liabilities
    quick_assets = (current_assets or 0) - (inventory or 0) if current_assets is not None else None
    quick_ratio = safe_div(quick_assets, current_liabilities)

    interest_coverage = safe_div(ebitda, interest_expense)
    profit_margin = safe_div(net_profit, revenue)
    operating_margin = safe_div(operating_income, revenue)
    ebitda_margin = safe_div(ebitda, revenue)

    # Additional useful ratios
    asset_turnover = safe_div(revenue, total_assets)
    cash_ratio = safe_div(cash, current_liabilities)
    debt_to_assets = safe_div(total_debt, total_assets)
    ocf_to_debt = safe_div(ocf, total_debt)

    ratios = {
        "roe": _pct(roe),
        "roa": _pct(roa),
        "debt_to_equity": _round(debt_to_equity),
        "current_ratio": _round(current_ratio),
        "quick_ratio": _round(quick_ratio),
        "interest_coverage": _round(interest_coverage),
        "profit_margin": _pct(profit_margin),
        "operating_margin": _pct(operating_margin),
        "ebitda_margin": _pct(ebitda_margin),
        "asset_turnover": _round(asset_turnover),
        "cash_ratio": _round(cash_ratio),
        "debt_to_assets": _round(debt_to_assets),
        "ocf_to_debt": _round(ocf_to_debt),
    }

    return ratios


def _pct(val: Optional[float]) -> Optional[float]:
    """Convert decimal to percentage and round."""
    return round(val * 100, 2) if val is not None else None


def _round(val: Optional[float], digits: int = 2) -> Optional[float]:
    return round(val, digits) if val is not None else None


# ──────────────────────────────────────────
# Health Score Engine (Feature #2 backend)
# ──────────────────────────────────────────

def compute_health_score(ratios: dict) -> dict:
    """
    Compute a 0–100 health score from financial ratios.
    Weighted sub-scores for profitability, liquidity, solvency, growth.
    Pure math — no AI.
    """
    profitability = _score_profitability(ratios)
    liquidity = _score_liquidity(ratios)
    solvency = _score_solvency(ratios)
    efficiency = _score_efficiency(ratios)

    # Weighted health score
    weights = {"profitability": 0.35, "liquidity": 0.20, "solvency": 0.25, "efficiency": 0.20}
    health = (
        profitability * weights["profitability"]
        + liquidity * weights["liquidity"]
        + solvency * weights["solvency"]
        + efficiency * weights["efficiency"]
    )

    return {
        "health_score": round(health, 1),
        "sub_scores": {
            "profitability": round(profitability, 1),
            "liquidity": round(liquidity, 1),
            "solvency": round(solvency, 1),
            "efficiency": round(efficiency, 1),
        },
        "weights": weights,
    }


def _score_profitability(r: dict) -> float:
    """Score 0–100 based on ROE, profit margin, operating margin."""
    score = 50.0  # baseline
    roe = r.get("roe")
    pm = r.get("profit_margin")
    om = r.get("operating_margin")

    if roe is not None:
        if roe >= 20: score += 20
        elif roe >= 15: score += 15
        elif roe >= 10: score += 10
        elif roe >= 5: score += 5
        elif roe < 0: score -= 20

    if pm is not None:
        if pm >= 20: score += 15
        elif pm >= 10: score += 10
        elif pm >= 5: score += 5
        elif pm < 0: score -= 15

    if om is not None:
        if om >= 25: score += 15
        elif om >= 15: score += 10
        elif om >= 5: score += 5
        elif om < 0: score -= 15

    return max(0, min(100, score))


def _score_liquidity(r: dict) -> float:
    """Score 0–100 based on current ratio, quick ratio, cash ratio."""
    score = 50.0
    cr = r.get("current_ratio")
    qr = r.get("quick_ratio")
    cashr = r.get("cash_ratio")

    if cr is not None:
        if cr >= 2.0: score += 20
        elif cr >= 1.5: score += 15
        elif cr >= 1.0: score += 5
        elif cr < 0.8: score -= 20

    if qr is not None:
        if qr >= 1.5: score += 15
        elif qr >= 1.0: score += 10
        elif qr < 0.5: score -= 15

    if cashr is not None:
        if cashr >= 0.5: score += 15
        elif cashr >= 0.2: score += 5
        elif cashr < 0.1: score -= 10

    return max(0, min(100, score))


def _score_solvency(r: dict) -> float:
    """Score 0–100 based on D/E, debt-to-assets, interest coverage."""
    score = 50.0
    de = r.get("debt_to_equity")
    da = r.get("debt_to_assets")
    ic = r.get("interest_coverage")

    if de is not None:
        if de <= 0.3: score += 20
        elif de <= 0.5: score += 15
        elif de <= 1.0: score += 5
        elif de > 2.0: score -= 20

    if da is not None:
        if da <= 0.3: score += 10
        elif da <= 0.5: score += 5
        elif da > 0.7: score -= 15

    if ic is not None:
        if ic >= 5.0: score += 20
        elif ic >= 3.0: score += 10
        elif ic >= 1.5: score += 5
        elif ic < 1.0: score -= 20

    return max(0, min(100, score))


def _score_efficiency(r: dict) -> float:
    """Score 0–100 based on asset turnover, OCF/debt ratio."""
    score = 50.0
    at = r.get("asset_turnover")
    ocf = r.get("ocf_to_debt")

    if at is not None:
        if at >= 1.0: score += 20
        elif at >= 0.5: score += 10
        elif at < 0.2: score -= 10

    if ocf is not None:
        if ocf >= 0.5: score += 20
        elif ocf >= 0.3: score += 15
        elif ocf >= 0.1: score += 5
        elif ocf < 0: score -= 20

    return max(0, min(100, score))


# ──────────────────────────────────────────
# Risk Heatmap (Feature #4)
# ──────────────────────────────────────────

def compute_risk_heatmap(ratios: dict, fraud_score: float = 50, governance_score: float = 50) -> dict:
    """
    Compute risk levels for heatmap display.
    Returns Low/Medium/High/Critical for each risk dimension.
    """
    de = ratios.get("debt_to_equity")
    cr = ratios.get("current_ratio")
    ic = ratios.get("interest_coverage")

    def bucket(val, thresholds, reverse=False):
        """Map a value to Low/Medium/High/Critical."""
        if val is None:
            return {"level": "Unknown", "score": None}
        if reverse:  # lower is worse (e.g., current ratio)
            if val >= thresholds[0]: return {"level": "Low", "score": 20}
            if val >= thresholds[1]: return {"level": "Medium", "score": 50}
            if val >= thresholds[2]: return {"level": "High", "score": 75}
            return {"level": "Critical", "score": 95}
        else:  # higher is worse (e.g., debt/equity)
            if val <= thresholds[0]: return {"level": "Low", "score": 20}
            if val <= thresholds[1]: return {"level": "Medium", "score": 50}
            if val <= thresholds[2]: return {"level": "High", "score": 75}
            return {"level": "Critical", "score": 95}

    def score_bucket(score):
        if score <= 25: return {"level": "Low", "score": score}
        if score <= 50: return {"level": "Medium", "score": score}
        if score <= 75: return {"level": "High", "score": score}
        return {"level": "Critical", "score": score}

    return {
        "debt_risk": bucket(de, [0.5, 1.0, 2.0]),
        "liquidity_risk": bucket(cr, [2.0, 1.0, 0.5], reverse=True),
        "interest_coverage_risk": bucket(ic, [5.0, 3.0, 1.0], reverse=True),
        "fraud_risk": score_bucket(fraud_score),
        "governance_risk": score_bucket(100 - governance_score),
    }
