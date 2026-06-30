"""Portfolio, Watchlist, Alerts, Earnings, Export, Admin, Annotations Routes"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
import os, uuid, structlog

from db.database import get_db
from db.models import (
    Portfolio, PortfolioHolding, Company, Analysis, Watchlist,
    AlertRule, AlertChannel, EarningsCall, Annotation, User, UserRole, UsageLog, ApiKey, Report, ReportStatus
)
from services.auth_service import get_current_user, require_role, hash_password
from config import get_settings

log = structlog.get_logger()
settings = get_settings()

# ──────────────────────────────────────────
# Portfolio (Module 12)
# ──────────────────────────────────────────
portfolio_router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


class PortfolioCreate(BaseModel):
    name: str
    description: str = ""


class HoldingAdd(BaseModel):
    company_id: str
    weight_pct: float


@portfolio_router.post("/")
async def create_portfolio(req: PortfolioCreate, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    p = Portfolio(user_id=user.user_id, name=req.name, description=req.description)
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return {"portfolio_id": p.portfolio_id, "name": p.name}


@portfolio_router.post("/{portfolio_id}/holdings")
async def add_holding(portfolio_id: str, req: HoldingAdd, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    h = PortfolioHolding(portfolio_id=portfolio_id, company_id=req.company_id, weight_pct=req.weight_pct)
    db.add(h)
    await db.commit()
    return {"message": "Holding added"}


@portfolio_router.get("/simulator-data")
async def get_simulator_data(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns all companies that have been analyzed, along with their latest scores."""
    result = await db.execute(
        select(Company, Report, Analysis)
        .join(Report, Report.company_id == Company.company_id)
        .join(Analysis, Analysis.report_id == Report.report_id)
        .where(Report.status == ReportStatus.analyzed)
    )
    rows = result.all()
    
    latest_companies = {}
    for company, report, analysis in rows:
        cid = company.company_id
        if cid not in latest_companies or latest_companies[cid]["year"] < report.year:
            latest_companies[cid] = {
                "company_id": cid,
                "name": company.name,
                "sector": company.sector or "General",
                "year": report.year,
                "health_score": analysis.health_score or 50.0,
                "fraud_score": analysis.fraud_score or 30.0,
                "risk_score": analysis.risk_score or 50.0,
            }
            
    return list(latest_companies.values())


@portfolio_router.get("/{portfolio_id}/risk-summary")
async def portfolio_risk_summary(portfolio_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PortfolioHolding, Company, Analysis)
        .join(Company, PortfolioHolding.company_id == Company.company_id)
        .outerjoin(Analysis, Analysis.report_id.in_(
            select(Analysis.report_id).where(Analysis.report_id.isnot(None)).limit(1)
        ))
        .where(PortfolioHolding.portfolio_id == portfolio_id)
    )
    holdings = result.all()

    # Aggregate weighted scores
    total_weight = 0
    weighted_fraud = 0
    weighted_health = 0
    weighted_risk = 0
    sector_exposure: dict[str, float] = {}
    holding_details = []

    for holding, company, analysis in holdings:
        w = holding.weight_pct / 100
        total_weight += w
        if analysis:
            weighted_fraud += (analysis.fraud_score or 50) * w
            weighted_health += (analysis.health_score or 50) * w
            weighted_risk += (analysis.risk_score or 50) * w

        sector = company.sector or "Unknown"
        sector_exposure[sector] = sector_exposure.get(sector, 0) + holding.weight_pct

        holding_details.append({
            "company": company.name,
            "sector": company.sector,
            "weight_pct": holding.weight_pct,
            "fraud_score": analysis.fraud_score if analysis else None,
            "health_score": analysis.health_score if analysis else None,
        })

    return {
        "portfolio_id": portfolio_id,
        "weighted_fraud_score": round(weighted_fraud, 1),
        "weighted_health_score": round(weighted_health, 1),
        "weighted_risk_score": round(weighted_risk, 1),
        "sector_exposure": sector_exposure,
        "concentration_risk": max(sector_exposure.values(), default=0),
        "holdings": holding_details,
    }


# ──────────────────────────────────────────
# Watchlist (Module 11)
# ──────────────────────────────────────────
watchlist_router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


@watchlist_router.post("/{company_id}")
async def add_to_watchlist(company_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(Watchlist).where(Watchlist.user_id == user.user_id, Watchlist.company_id == company_id)
    )
    if existing.scalar_one_or_none():
        return {"message": "Already in watchlist"}
    w = Watchlist(user_id=user.user_id, company_id=company_id)
    db.add(w)
    await db.commit()
    return {"message": "Added to watchlist"}


@watchlist_router.delete("/{company_id}")
async def remove_from_watchlist(company_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Watchlist).where(Watchlist.user_id == user.user_id, Watchlist.company_id == company_id)
    )
    w = result.scalar_one_or_none()
    if w:
        await db.delete(w)
        await db.commit()
    return {"message": "Removed from watchlist"}


@watchlist_router.get("/")
async def get_watchlist(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Watchlist, Company)
        .join(Company, Watchlist.company_id == Company.company_id)
        .where(Watchlist.user_id == user.user_id)
    )
    items = result.all()
    return [
        {"company_id": c.company_id, "name": c.name, "sector": c.sector, "added_at": w.created_at.isoformat()}
        for w, c in items
    ]


# ──────────────────────────────────────────
# Alert Rules (Module 20)
# ──────────────────────────────────────────
alerts_router = APIRouter(prefix="/api/alerts", tags=["alerts"])


class AlertRuleCreate(BaseModel):
    name: str
    company_id: Optional[str] = None
    metric: str
    operator: str  # gt, lt, gte, lte, eq, change_pct
    threshold: float
    channel: AlertChannel = AlertChannel.in_app


@alerts_router.post("/rules")
async def create_alert_rule(req: AlertRuleCreate, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rule = AlertRule(
        user_id=user.user_id,
        company_id=req.company_id,
        name=req.name,
        metric=req.metric,
        operator=req.operator,
        threshold=req.threshold,
        channel=req.channel,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return {"rule_id": rule.rule_id, "name": rule.name, "message": "Alert rule created"}


@alerts_router.get("/rules")
async def list_alert_rules(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AlertRule).where(AlertRule.user_id == user.user_id))
    rules = result.scalars().all()
    return [
        {
            "rule_id": r.rule_id, "name": r.name, "metric": r.metric,
            "operator": r.operator, "threshold": r.threshold,
            "channel": r.channel.value, "is_active": r.is_active,
        }
        for r in rules
    ]


@alerts_router.get("/feed")
async def get_alerts_feed(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Dynamically evaluate alert rules for the user against company analyses."""
    result = await db.execute(select(AlertRule).where(AlertRule.user_id == user.user_id, AlertRule.is_active == True))
    rules = result.scalars().all()

    triggered = []
    
    # Pre-map database fields
    metric_fields = {
        "fraud_score": "fraud_score",
        "health_score": "health_score",
        "risk_score": "risk_score",
        "esg_score": "esg_score",
        "debt_to_equity": "debt_to_equity",
        "current_ratio": "current_ratio",
        "quick_ratio": "quick_ratio",
        "roe": "roe",
        "roa": "roa",
        "interest_coverage": "interest_coverage",
        "profit_margin": "profit_margin",
        "operating_margin": "operating_margin"
    }

    from db.models import Report
    for r in rules:
        # Determine companies to check
        if r.company_id:
            c_result = await db.execute(select(Company).where(Company.company_id == r.company_id))
            companies_to_check = c_result.scalars().all()
        else:
            # Global rule: check all companies
            c_result = await db.execute(select(Company))
            companies_to_check = c_result.scalars().all()

        for company in companies_to_check:
            # Get latest analyzed report for this company
            rep_result = await db.execute(
                select(Report)
                .where(Report.company_id == company.company_id, Report.status == ReportStatus.analyzed)
                .order_by(Report.year.desc()).limit(1)
            )
            report = rep_result.scalar_one_or_none()
            if not report:
                continue

            # Get analysis
            a_result = await db.execute(select(Analysis).where(Analysis.report_id == report.report_id))
            analysis = a_result.scalar_one_or_none()
            if not analysis:
                continue

            # Evaluate value
            field_name = metric_fields.get(r.metric)
            if not field_name:
                continue

            val = getattr(analysis, field_name, None)
            if val is None:
                continue

            # Check comparison
            is_triggered = False
            if r.operator == "gt" and val > r.threshold:
                is_triggered = True
            elif r.operator == "lt" and val < r.threshold:
                is_triggered = True
            elif r.operator == "gte" and val >= r.threshold:
                is_triggered = True
            elif r.operator == "lte" and val <= r.threshold:
                is_triggered = True
            elif r.operator == "eq" and abs(val - r.threshold) < 0.0001:
                is_triggered = True

            if is_triggered:
                triggered.append({
                    "alert_id": f"{r.rule_id}_{company.company_id}",
                    "rule_id": r.rule_id,
                    "rule_name": r.name,
                    "company_id": company.company_id,
                    "company_name": company.name,
                    "metric": r.metric,
                    "operator": r.operator,
                    "threshold": r.threshold,
                    "value": round(val, 2),
                    "channel": r.channel.value,
                    "triggered_at": analysis.created_at.isoformat(),
                    "severity": "critical" if r.metric == "fraud_score" and val > 60 else "high" if val > 80 or r.metric == "risk_score" else "info"
                })

    # Sort by triggered time desc
    triggered.sort(key=lambda x: x["triggered_at"], reverse=True)
    return triggered



# ──────────────────────────────────────────
# Earnings Calls (Module 5)
# ──────────────────────────────────────────
earnings_router = APIRouter(prefix="/api/earnings-calls", tags=["earnings"])


@earnings_router.post("/upload")
async def upload_earnings_call(
    file: UploadFile = File(...),
    company_id: str = Form(...),
    quarter: str = Form(""),
    year: int = Form(2024),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    text = content.decode("utf-8", errors="ignore")

    from services.nebius_client import run_structured
    from ai.prompts import EARNINGS_SENTIMENT_PROMPT, PROMPT_VERSION
    prompt = EARNINGS_SENTIMENT_PROMPT.format(transcript=text[:8000], version=PROMPT_VERSION)
    result = run_structured(prompt=prompt, module="sentiment_analysis", use_cache=False)

    call = EarningsCall(
        company_id=company_id,
        quarter=quarter,
        year=year,
        transcript_text=text[:5000],
        sentiment_pos=result.get("sentiment_positive_pct"),
        sentiment_neu=result.get("sentiment_neutral_pct"),
        sentiment_neg=result.get("sentiment_negative_pct"),
        confidence_phrases=result.get("confidence_phrases", []),
        warning_phrases=result.get("warning_phrases", []),
        management_tone=result.get("management_tone"),
        summary=result.get("summary"),
    )
    db.add(call)
    await db.commit()
    await db.refresh(call)

    return {"call_id": call.call_id, "analysis": result}


@earnings_router.get("/{call_id}/sentiment")
async def get_earnings_sentiment(call_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EarningsCall).where(EarningsCall.call_id == call_id))
    call = result.scalar_one_or_none()
    if not call:
        raise HTTPException(404, "Earnings call not found")
    return {
        "call_id": call_id,
        "quarter": call.quarter,
        "sentiment_pos": call.sentiment_pos,
        "sentiment_neu": call.sentiment_neu,
        "sentiment_neg": call.sentiment_neg,
        "management_tone": call.management_tone,
        "confidence_phrases": call.confidence_phrases,
        "warning_phrases": call.warning_phrases,
        "summary": call.summary,
    }


# ──────────────────────────────────────────
# Annotations (Module 23)
# ──────────────────────────────────────────
annotations_router = APIRouter(prefix="/api/annotations", tags=["annotations"])


class AnnotationCreate(BaseModel):
    target_ref: str
    target_type: str = "citation"
    comment: str
    parent_id: Optional[str] = None


@annotations_router.post("/{report_id}")
async def add_annotation(
    report_id: str, req: AnnotationCreate,
    user=Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    ann = Annotation(
        report_id=report_id, user_id=user.user_id,
        target_ref=req.target_ref, target_type=req.target_type,
        comment=req.comment, parent_id=req.parent_id,
    )
    db.add(ann)
    await db.commit()
    await db.refresh(ann)
    return {"annotation_id": ann.annotation_id, "comment": ann.comment}


@annotations_router.get("/{report_id}")
async def get_annotations(report_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Annotation, User)
        .join(User, Annotation.user_id == User.user_id)
        .where(Annotation.report_id == report_id, Annotation.parent_id.is_(None))
    )
    return [
        {
            "annotation_id": a.annotation_id,
            "author": u.name,
            "target_ref": a.target_ref,
            "comment": a.comment,
            "resolved": a.resolved,
            "created_at": a.created_at.isoformat(),
        }
        for a, u in result.all()
    ]


# ──────────────────────────────────────────
# Export (Module 14)
# ──────────────────────────────────────────
export_router = APIRouter(prefix="/api/export", tags=["export"])


@export_router.post("/{report_id}")
async def export_report(
    report_id: str,
    format: str = "pdf",
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from services.export_service import generate_pdf_export
    
    from db.models import Report, Analysis
    r_result = await db.execute(select(Report).where(Report.report_id == report_id))
    report = r_result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")

    a_result = await db.execute(select(Analysis).where(Analysis.report_id == report_id))
    analysis = a_result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(400, "Analysis not yet complete")

    co_result = await db.execute(select(Company).where(Company.company_id == report.company_id))
    company = co_result.scalar_one_or_none()

    os.makedirs(settings.export_dir, exist_ok=True)
    output_path = os.path.join(settings.export_dir, f"finguard_{report_id}.pdf")

    generate_pdf_export(
        company=company,
        report=report,
        analysis=analysis,
        output_path=output_path,
    )

    return FileResponse(
        output_path,
        media_type="application/pdf",
        filename=f"FinGuard_Analysis_{company.name if company else 'Report'}_{report.year}.pdf",
    )


# ──────────────────────────────────────────
# Compare (Module 13)
# ──────────────────────────────────────────
compare_router = APIRouter(prefix="/api/compare", tags=["compare"])


class CompareRequest(BaseModel):
    company_ids: list[str]  # 2–4 companies


@compare_router.post("/")
async def compare_companies(req: CompareRequest, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not 2 <= len(req.company_ids) <= 4:
        raise HTTPException(400, "Compare 2–4 companies")

    results = []
    for cid in req.company_ids:
        co_result = await db.execute(select(Company).where(Company.company_id == cid))
        company = co_result.scalar_one_or_none()
        if not company:
            continue

        # Get latest analysis
        r_result = await db.execute(
            select(Report).where(Report.company_id == cid, Report.status == ReportStatus.analyzed)
            .order_by(Report.year.desc()).limit(1)
        )
        report = r_result.scalar_one_or_none()
        analysis = None
        if report:
            a_result = await db.execute(select(Analysis).where(Analysis.report_id == report.report_id))
            analysis = a_result.scalars().first()

        results.append({
            "company_id": cid,
            "name": company.name,
            "sector": company.sector,
            "year": report.year if report else None,
            "health_score": analysis.health_score if analysis else None,
            "fraud_score": analysis.fraud_score if analysis else None,
            "risk_score": analysis.risk_score if analysis else None,
            "esg_score": analysis.esg_score if analysis else None,
            "revenue": analysis.revenue if analysis else None,
            "net_profit": analysis.net_profit if analysis else None,
            "profit_margin": analysis.profit_margin if analysis else None,
            "operating_margin": analysis.operating_margin if analysis else None,
            "debt_to_equity": analysis.debt_to_equity if analysis else None,
            "roe": analysis.roe if analysis else None,
            "roa": analysis.roa if analysis else None,
            "current_ratio": analysis.current_ratio if analysis else None,
            "quick_ratio": analysis.quick_ratio if analysis else None,
            "interest_coverage": analysis.interest_coverage if analysis else None,
            "pe_ratio": (
                (analysis.sector_metrics or {}).get("pe_ratio")
                if analysis and analysis.sector_metrics
                else None
            ),
            "revenue_growth": await _compute_revenue_growth(cid, report.year if report else None, db) if report else None,
        })

    return {"companies": results}


async def _compute_revenue_growth(company_id: str, current_year: int | None, db) -> float | None:
    """Compute YoY revenue growth from analysis history records."""
    if not current_year:
        return None
    try:
        # Get AnalysisHistory for current and previous year
        from db.models import AnalysisHistory
        result = await db.execute(
            select(AnalysisHistory)
            .where(
                AnalysisHistory.company_id == company_id,
                AnalysisHistory.year.in_([current_year, current_year - 1]),
            )
            .order_by(AnalysisHistory.year.desc())
        )
        rows = result.scalars().all()
        year_map = {r.year: r for r in rows}
        cur = year_map.get(current_year)
        prev = year_map.get(current_year - 1)
        if cur and prev and cur.revenue and prev.revenue and prev.revenue != 0:
            return round((cur.revenue - prev.revenue) / prev.revenue * 100, 1)
    except Exception:
        pass
    return None


# ──────────────────────────────────────────
# Admin (Module 21 + Admin dashboard)
# ──────────────────────────────────────────
admin_router = APIRouter(prefix="/api/admin", tags=["admin"])


@admin_router.get("/usage-metrics")
async def usage_metrics(user=Depends(require_role(UserRole.admin)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UsageLog).order_by(UsageLog.created_at.desc()).limit(500))
    logs = result.scalars().all()

    total_calls = len(logs)
    cache_hits = sum(1 for l in logs if l.cache_hit)
    total_tokens = sum((l.total_tokens or 0) for l in logs)
    avg_latency = sum((l.latency_ms or 0) for l in logs) / max(total_calls, 1)

    by_module: dict[str, int] = {}
    for l in logs:
        by_module[l.module] = by_module.get(l.module, 0) + 1

    return {
        "total_calls": total_calls,
        "cache_hit_rate": round(cache_hits / max(total_calls, 1) * 100, 1),
        "total_tokens": total_tokens,
        "avg_latency_ms": round(avg_latency, 0),
        "calls_by_module": by_module,
        "recent_logs": [
            {
                "module": l.module, "model": l.model,
                "tokens": l.total_tokens, "latency_ms": l.latency_ms,
                "cache_hit": l.cache_hit, "created_at": l.created_at.isoformat(),
            }
            for l in logs[:50]
        ],
    }


@admin_router.post("/api-keys")
async def create_api_key(
    name: str,
    user=Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    raw_key = f"fg_sk_{uuid.uuid4().hex}"
    key = ApiKey(
        user_id=user.user_id,
        name=name,
        key_hash=hash_password(raw_key),
        key_prefix=raw_key[:10],
    )
    db.add(key)
    await db.commit()
    return {"key_id": key.key_id, "api_key": raw_key, "note": "Store this key — it won't be shown again."}


@admin_router.get("/api-keys")
async def list_api_keys(user=Depends(require_role(UserRole.admin)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ApiKey).where(ApiKey.user_id == user.user_id))
    keys = result.scalars().all()
    return [
        {"key_id": k.key_id, "name": k.name, "prefix": k.key_prefix,
         "created_at": k.created_at.isoformat(), "last_used": k.last_used_at.isoformat() if k.last_used_at else None}
        for k in keys
    ]
