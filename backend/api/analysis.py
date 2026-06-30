"""Analysis API Routes — Scores, History, Recompute"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from db.database import get_db, AsyncSessionLocal
from db.models import Analysis, AnalysisHistory, Report, User, ReportStatus
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


def _local_investment_committee(ratios: dict) -> dict:
    bull = []
    bear = []
    neutral = []
    
    roe = ratios.get("roe")
    if roe is not None:
        if roe >= 15:
            bull.append(f"Strong return on equity (ROE of {roe}%) indicating highly efficient capital deployment.")
        elif roe < 5:
            bear.append(f"Depressed return on equity (ROE of {roe}%) suggests weak capital productivity.")
        else:
            neutral.append(f"Moderate return on equity of {roe}%, in line with industry average.")
            
    pm = ratios.get("profit_margin")
    if pm is not None:
        if pm >= 15:
            bull.append(f"High net profit margin ({pm}%), showing excellent pricing power.")
        elif pm < 5:
            bear.append(f"Thin net profit margin ({pm}%), leaving little room for operational headwinds.")
            
    de = ratios.get("debt_to_equity")
    if de is not None:
        if de <= 0.3:
            bull.append(f"Low leverage (D/E: {de}) provides a clean balance sheet and high financial flexibility.")
        elif de >= 1.5:
            bear.append(f"High debt-to-equity ratio ({de}) increases solvency risk and interest burden.")
        else:
            neutral.append(f"Reasonable leverage level (D/E: {de}) maintains standard capital structure.")
            
    cr = ratios.get("current_ratio")
    if cr is not None:
        if cr >= 2.0:
            bull.append(f"Robust short-term liquidity with a current ratio of {cr}.")
        elif cr < 1.0:
            bear.append(f"Current ratio of {cr} is below 1.0, posing short-term liquidity risk.")
        else:
            neutral.append(f"Adequate short-term liquidity with a current ratio of {cr}.")
            
    if not bull:
        bull.append("Core operations remain functional and intact.")
    if not bear:
        bear.append("Potential exposure to macroeconomic cycles and industry cost pressures.")
    if not neutral:
        neutral.append("Overall financial performance remains stable and in line with historical averages.")
        
    return {
        "bull": bull,
        "bear": bear,
        "neutral": neutral
    }


@router.get("/{report_id}")
async def get_analysis(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get complete analysis for a report — all scores, citations, agent outputs."""
    # Check report exists and is analyzed
    r_result = await db.execute(select(Report).where(Report.report_id == report_id))
    report = r_result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    if report.status != ReportStatus.analyzed:
        return {"status": report.status.value, "message": "Analysis not yet complete"}

    a_result = await db.execute(select(Analysis).where(Analysis.report_id == report_id))
    analysis = a_result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(404, "Analysis not found")

    # 1. Compute ratios on-the-fly (with fallbacks if columns aren't in SQLite table yet)
    from services.ratio_engine import compute_all_ratios, compute_risk_heatmap
    current_data = report.extraction_json or {}
    ratios = compute_all_ratios(current_data)
    
    # Enrich from DB columns if populated
    db_ratios = {
        "roe": getattr(analysis, "roe", None) or ratios.get("roe"),
        "roa": getattr(analysis, "roa", None) or ratios.get("roa"),
        "current_ratio": getattr(analysis, "current_ratio", None) or ratios.get("current_ratio"),
        "quick_ratio": getattr(analysis, "quick_ratio", None) or ratios.get("quick_ratio"),
        "debt_to_equity": getattr(analysis, "debt_to_equity", None) or ratios.get("debt_to_equity"),
        "interest_coverage": getattr(analysis, "interest_coverage", None) or ratios.get("interest_coverage"),
        "profit_margin": getattr(analysis, "profit_margin", None) or ratios.get("profit_margin"),
        "operating_margin": getattr(analysis, "operating_margin", None) or ratios.get("operating_margin"),
    }

    # 2. Local Fraud Rules & Auditor Change Detection
    from services.fraud_rules import run_fraud_rules, detect_auditor_change
    prior_report = None
    prior_data = None
    
    # Query prior year report of the same company
    p_result = await db.execute(
        select(Report).where(
            Report.company_id == report.company_id,
            Report.year == report.year - 1
        )
    )
    prior_report = p_result.scalar_one_or_none()
    if prior_report and prior_report.extraction_json:
        prior_data = prior_report.extraction_json

    fraud_results = run_fraud_rules(current_data, prior_data)
    
    current_auditor = current_data.get("auditor_name")
    prior_auditor = prior_data.get("auditor_name") if prior_data else None
    auditor_flag = detect_auditor_change(
        current_auditor, prior_auditor, report.year, report.year - 1
    )
    
    if auditor_flag:
        fraud_results["flags"].append(auditor_flag)
        cat = auditor_flag.get("category", "auditor")
        fraud_results["counts_by_category"][cat] = fraud_results["counts_by_category"].get(cat, 0) + 1
        sev = auditor_flag.get("severity", "high")
        fraud_results["counts_by_severity"][sev] = fraud_results["counts_by_severity"].get(sev, 0) + 1
        fraud_results["total_count"] += 1

    # 3. Risk Heatmap
    gov_score = analysis.esg_governance or 50.0
    fraud_score = analysis.fraud_score or 30.0
    risk_heatmap = compute_risk_heatmap(db_ratios, fraud_score=fraud_score, governance_score=gov_score)

    # 4. Confidence Meter
    ocr_quality = report.ocr_quality or 0.85
    citations_count = len(analysis.fraud_citations or []) + len(analysis.health_citations or []) + len(analysis.risk_citations or [])
    citation_density = min(1.0, citations_count / 15.0)
    
    key_fields = [
        analysis.revenue, analysis.net_profit, analysis.ebitda,
        analysis.total_debt, analysis.cash_and_equivalents,
        analysis.total_assets, analysis.total_equity,
        analysis.operating_cash_flow, analysis.eps
    ]
    filled_count = sum(1 for field in key_fields if field is not None)
    section_coverage = filled_count / len(key_fields)
    
    computed_confidence = (0.4 * citation_density) + (0.4 * ocr_quality) + (0.2 * section_coverage)
    confidence_score_val = round(computed_confidence * 100)
    confidence_score_val = min(100, max(45, confidence_score_val))

    # 5. Boardroom Summary Generator
    rev_pct_str = "0%"
    debt_pct_str = "0%"
    profit_pct_str = "0%"
    stability_status = "financially stable"
    debt_verb = "reduced"
    
    if prior_report:
        prev_is = prior_data.get("income_statement", {}) if prior_data else {}
        prev_bs = prior_data.get("balance_sheet", {}) if prior_data else {}
        
        prev_rev = prev_is.get("revenue")
        prev_debt = prev_bs.get("total_debt")
        prev_profit = prev_is.get("net_profit")
        
        curr_rev = analysis.revenue
        curr_debt = analysis.total_debt
        curr_profit = analysis.net_profit
        
        if prev_rev and curr_rev and prev_rev != 0:
            rev_change = (curr_rev - prev_rev) / prev_rev * 100
            rev_pct_str = f"+{rev_change:.1f}%" if rev_change >= 0 else f"{rev_change:.1f}%"
            
        if prev_debt and curr_debt and prev_debt != 0:
            debt_change = (curr_debt - prev_debt) / prev_debt * 100
            debt_verb = "reduced" if debt_change < 0 else "increased"
            debt_pct_str = f"{abs(debt_change):.1f}%"
            
        if prev_profit and curr_profit and prev_profit != 0:
            profit_change = (curr_profit - prev_profit) / prev_profit * 100
            profit_pct_str = f"+{profit_change:.1f}%" if profit_change >= 0 else f"{profit_change:.1f}%"
            
        health = analysis.health_score or 50.0
        if health >= 75:
            stability_status = "remains financially stable and highly resilient"
        elif health >= 50:
            stability_status = "remains financially stable"
        else:
            stability_status = "shows signs of financial stress"
            
        boardroom_summary = (
            f"The company {stability_status}. "
            f"Revenue growth is at {rev_pct_str}, while total debt {debt_verb} by {debt_pct_str}. "
            f"Net profit year-over-year change is {profit_pct_str}."
        )
    else:
        health = analysis.health_score or 50.0
        if health >= 75:
            stability_status = "exhibits strong financial health"
        elif health >= 50:
            stability_status = "remains financially stable"
        else:
            stability_status = "shows signs of financial stress"
            
        boardroom_summary = (
            f"The company currently {stability_status} based on our single-year extraction. "
            "To view full year-over-year delta analysis, please upload the prior fiscal year report."
        )

    # 6. Investment Committee fallbacks
    local_committee = _local_investment_committee(db_ratios)
    bull_case = getattr(analysis, "bull_case", None) or local_committee["bull"]
    bear_case = getattr(analysis, "bear_case", None) or local_committee["bear"]
    neutral_case = local_committee["neutral"]

    return {
        "report_id": report_id,
        "company_id": report.company_id,
        "status": "analyzed",
        # Core scores
        "health_score": analysis.health_score,
        "fraud_score": analysis.fraud_score,
        "risk_score": analysis.risk_score,
        "esg_score": analysis.esg_score,
        "investment_outlook": analysis.investment_outlook,
        # Sub-scores
        "profitability_score": analysis.profitability_score,
        "liquidity_score": analysis.liquidity_score,
        "solvency_score": analysis.solvency_score,
        "growth_score": analysis.growth_score,
        "esg_environmental": analysis.esg_environmental,
        "esg_social": analysis.esg_social,
        "esg_governance": analysis.esg_governance,
        # Key financials
        "financials": {
            "revenue": analysis.revenue,
            "net_profit": analysis.net_profit,
            "ebitda": analysis.ebitda,
            "total_debt": analysis.total_debt,
            "cash_and_equivalents": analysis.cash_and_equivalents,
            "total_assets": analysis.total_assets,
            "total_equity": analysis.total_equity,
            "operating_cash_flow": analysis.operating_cash_flow,
            "eps": analysis.eps,
        },
        # Ratios (complete set)
        "ratios": db_ratios,
        # RAG Search / Citations / Explainability (Module 10)
        "fraud_citations": analysis.fraud_citations or [],
        "health_citations": analysis.health_citations or [],
        "risk_citations": analysis.risk_citations or [],
        # AI narratives
        "executive_summary": analysis.executive_summary,
        "fraud_narrative": analysis.fraud_narrative,
        "investment_narrative": analysis.investment_narrative,
        "risk_narrative": analysis.risk_narrative,
        "esg_narrative": analysis.esg_narrative,
        # Self-critique (Module 15)
        "self_critique_passed": analysis.self_critique_passed,
        "self_critique_notes": analysis.self_critique_notes,
        # Metadata
        "model_used": analysis.model_used,
        "prompt_version": analysis.prompt_version,
        "analyzed_at": analysis.created_at.isoformat(),
        
        # New local computed features
        "local_fraud_alerts": fraud_results,
        "risk_heatmap": risk_heatmap,
        "confidence_score": confidence_score_val,
        "confidence_breakdown": {
            "ocr_quality": round(ocr_quality * 100),
            "citations_count": citations_count,
            "section_coverage": round(section_coverage * 100)
        },
        "boardroom_summary": boardroom_summary,
        "investment_committee": {
            "bull": bull_case,
            "bear": bear_case,
            "neutral": neutral_case
        }
    }


@router.get("/{report_id}/history")
async def get_analysis_history(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Module 9 — Multi-year trend data for the report's company."""
    r_result = await db.execute(select(Report).where(Report.report_id == report_id))
    report = r_result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")

    h_result = await db.execute(
        select(AnalysisHistory)
        .where(AnalysisHistory.company_id == report.company_id)
        .order_by(AnalysisHistory.year)
    )
    history = h_result.scalars().all()

    return [
        {
            "year": h.year,
            "health_score": h.health_score,
            "fraud_score": h.fraud_score,
            "risk_score": h.risk_score,
            "esg_score": h.esg_score,
            "auditor_name": h.auditor_name,
            "auditor_changed": h.auditor_changed,
            "restated_flag": h.restated_flag,
            "restatement_note": h.restatement_note,
            "revenue": h.revenue,
            "net_profit": h.net_profit,
            "total_debt": h.total_debt,
        }
        for h in history
    ]


@router.post("/{report_id}/recompute")
async def recompute_analysis(
    report_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Re-run the analysis pipeline with self-critique (Module 15)."""
    from services.nebius_client import invalidate_cache
    invalidate_cache(report_id)

    r_result = await db.execute(select(Report).where(Report.report_id == report_id))
    report = r_result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    if not report.file_url:
        raise HTTPException(400, "Report file not found — cannot recompute")

    async def _recompute_with_fresh_session():
        async with AsyncSessionLocal() as fresh_db:
            from jobs.pipeline import run_report_pipeline
            try:
                await run_report_pipeline(report_id=report_id, file_path=report.file_url, db=fresh_db)
            except Exception as e:
                import structlog
                structlog.get_logger().error("recompute_pipeline_error", report_id=report_id, error=str(e))

    background_tasks.add_task(_recompute_with_fresh_session)

    return {"message": "Recompute triggered. Cache cleared. Poll status endpoint for progress."}


@router.get("/{report_id}/search")
async def smart_search(
    report_id: str,
    q: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Module 6 — Smart Search over document chunks."""
    from rag.rag_service import semantic_search
    if not q or not q.strip():
        return []
    results = semantic_search(report_id, q.strip(), top_k=10)
    return results
