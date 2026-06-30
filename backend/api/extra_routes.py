"""
FinGuard AI — Document Diff API (Module 19) + Benchmark API (Module 7) + News API (Module 16/17)
These are additive routes — they do NOT modify any existing file.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.database import get_db
from db.models import (
    Report, Company, Analysis, DocumentDiff, NewsFeedItem,
    InsiderActivity, User
)
from services.auth_service import get_current_user
import structlog

log = structlog.get_logger()

# ──────────────────────────────────────────
# Document Diff (Module 19)
# ──────────────────────────────────────────
diff_router = APIRouter(prefix="/api/diff", tags=["document-diff"])


class DiffRequest(BaseModel):
    company_id: str
    year_from: int
    year_to: int


@diff_router.post("/")
async def create_document_diff(
    req: DiffRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a year-over-year MD&A diff for a company.
    Uses Nebius reasoning tier — only triggered on-demand (not automatic pipeline).
    """
    # Get both reports
    r_from = await db.execute(
        select(Report).where(
            Report.company_id == req.company_id,
            Report.year == req.year_from,
        )
    )
    r_to = await db.execute(
        select(Report).where(
            Report.company_id == req.company_id,
            Report.year == req.year_to,
        )
    )
    report_from = r_from.scalars().first()
    report_to = r_to.scalars().first()

    if not report_from or not report_to:
        raise HTTPException(404, f"Reports not found for years {req.year_from} and {req.year_to}")

    # Check if both have extraction data
    if not report_from.extraction_json or not report_to.extraction_json:
        raise HTTPException(400, "Both reports must be analyzed before diffing")

    def calculate_numeric_diff(data_from, data_to):
        is_from = data_from.get("income_statement", {}) if data_from else {}
        bs_from = data_from.get("balance_sheet", {}) if data_from else {}
        cf_from = data_from.get("cash_flow", {}) if data_from else {}
        
        is_to = data_to.get("income_statement", {}) if data_to else {}
        bs_to = data_to.get("balance_sheet", {}) if data_to else {}
        cf_to = data_to.get("cash_flow", {}) if data_to else {}
        
        metrics = [
            ("revenue", is_from.get("revenue"), is_to.get("revenue"), "Revenue"),
            ("net_profit", is_from.get("net_profit"), is_to.get("net_profit"), "Net Profit"),
            ("total_debt", bs_from.get("total_debt"), bs_to.get("total_debt"), "Total Debt"),
            ("ebitda", is_from.get("ebitda"), is_to.get("ebitda"), "EBITDA"),
            ("operating_cash_flow", cf_from.get("operating_cash_flow"), cf_to.get("operating_cash_flow"), "Operating Cash Flow"),
        ]
        
        diffs = {}
        for key, val_from, val_to, label in metrics:
            if val_from is not None and val_to is not None and val_from != 0:
                pct = (val_to - val_from) / val_from * 100
                diffs[key] = {
                    "label": label,
                    "from_val": val_from,
                    "to_val": val_to,
                    "pct_change": round(pct, 2)
                }
            else:
                diffs[key] = {
                    "label": label,
                    "from_val": val_from,
                    "to_val": val_to,
                    "pct_change": None
                }
        return diffs

    num_diff = calculate_numeric_diff(report_from.extraction_json, report_to.extraction_json)

    # Check for existing diff
    existing = await db.execute(
        select(DocumentDiff).where(
            DocumentDiff.company_id == req.company_id,
            DocumentDiff.year_from == req.year_from,
            DocumentDiff.year_to == req.year_to,
        )
    )
    existing_diff = existing.scalar_one_or_none()
    if existing_diff:
        return {
            "diff_id": existing_diff.diff_id,
            "summary": existing_diff.diff_summary,
            "added_phrases": existing_diff.added_phrases,
            "removed_phrases": existing_diff.removed_phrases,
            "softened_phrases": existing_diff.softened_phrases,
            "risk_signals": existing_diff.risk_signals,
            "numeric_diff": num_diff,
            "cached": True,
        }

    # Run the diff analysis using Nebius
    from services.nebius_client import run_structured
    from ai.prompts import DOCUMENT_DIFF_PROMPT, PROMPT_VERSION

    # Use extraction JSON summaries as proxy if MDA text isn't stored
    text_from = str(report_from.extraction_json)[:5000]
    text_to = str(report_to.extraction_json)[:5000]

    prompt = DOCUMENT_DIFF_PROMPT.format(
        year_from=req.year_from,
        year_to=req.year_to,
        text_from=text_from,
        text_to=text_to,
        version=PROMPT_VERSION,
    )

    result = run_structured(
        prompt=prompt,
        module="document_diff",
        report_id=f"{req.company_id}_{req.year_from}_{req.year_to}",
    )

    # Store the diff
    diff = DocumentDiff(
        company_id=req.company_id,
        year_from=req.year_from,
        year_to=req.year_to,
        diff_summary=result.get("summary", ""),
        added_phrases=result.get("added_phrases", []),
        removed_phrases=result.get("removed_phrases", []),
        softened_phrases=result.get("softened_phrases", []),
        risk_signals=result.get("risk_signals", []),
    )
    db.add(diff)
    await db.commit()
    await db.refresh(diff)

    log.info("document_diff_created", company_id=req.company_id,
             years=f"{req.year_from}-{req.year_to}")

    return {
        "diff_id": diff.diff_id,
        "summary": diff.diff_summary,
        "added_phrases": diff.added_phrases,
        "removed_phrases": diff.removed_phrases,
        "softened_phrases": diff.softened_phrases,
        "risk_signals": diff.risk_signals,
        "numeric_diff": num_diff,
        "cached": False,
    }


@diff_router.get("/{company_id}")
async def get_company_diffs(
    company_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all existing diffs for a company."""
    result = await db.execute(
        select(DocumentDiff).where(DocumentDiff.company_id == company_id)
        .order_by(DocumentDiff.year_to.desc())
    )
    diffs = result.scalars().all()
    return [
        {
            "diff_id": d.diff_id,
            "year_from": d.year_from,
            "year_to": d.year_to,
            "summary": d.diff_summary,
            "risk_signals": d.risk_signals,
            "created_at": d.created_at.isoformat(),
        }
        for d in diffs
    ]


# ──────────────────────────────────────────
# Benchmark / Peer Comparison (Module 7)
# ──────────────────────────────────────────
benchmark_router = APIRouter(prefix="/api/benchmark", tags=["benchmark"])


@benchmark_router.get("/{company_id}")
async def benchmark_company(
    company_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Benchmark a company against peers in the same sector.
    Uses ONLY data already in the database — zero API calls.
    """
    # Get the target company
    co_result = await db.execute(select(Company).where(Company.company_id == company_id))
    company = co_result.scalar_one_or_none()
    if not company:
        raise HTTPException(404, "Company not found")

    # Get latest analysis for the target
    target_analysis = None
    r_result = await db.execute(
        select(Report).where(Report.company_id == company_id)
        .order_by(Report.year.desc()).limit(1)
    )
    target_report = r_result.scalar_one_or_none()
    if target_report:
        a_result = await db.execute(
            select(Analysis).where(Analysis.report_id == target_report.report_id)
        )
        target_analysis = a_result.scalar_one_or_none()

    # Find peers (same sector)
    peers = []
    if company.sector:
        peer_result = await db.execute(
            select(Company).where(
                Company.sector == company.sector,
                Company.company_id != company_id,
            ).limit(10)
        )
        peer_companies = peer_result.scalars().all()

        for peer in peer_companies:
            pr = await db.execute(
                select(Report).where(Report.company_id == peer.company_id)
                .order_by(Report.year.desc()).limit(1)
            )
            peer_report = pr.scalar_one_or_none()
            peer_analysis = None
            if peer_report:
                pa = await db.execute(
                    select(Analysis).where(Analysis.report_id == peer_report.report_id)
                )
                peer_analysis = pa.scalar_one_or_none()

            peers.append({
                "company_id": peer.company_id,
                "name": peer.name,
                "health_score": peer_analysis.health_score if peer_analysis else None,
                "fraud_score": peer_analysis.fraud_score if peer_analysis else None,
                "risk_score": peer_analysis.risk_score if peer_analysis else None,
                "esg_score": peer_analysis.esg_score if peer_analysis else None,
                "revenue": peer_analysis.revenue if peer_analysis else None,
                "profit_margin": peer_analysis.profit_margin if peer_analysis else None,
                "roe": peer_analysis.roe if peer_analysis else None,
                "debt_to_equity": peer_analysis.debt_to_equity if peer_analysis else None,
            })

    # Compute sector averages
    scored_peers = [p for p in peers if p["health_score"] is not None]
    sector_avg = {}
    if scored_peers:
        for metric in ["health_score", "fraud_score", "risk_score", "esg_score",
                        "revenue", "profit_margin", "roe", "debt_to_equity"]:
            values = [p[metric] for p in scored_peers if p[metric] is not None]
            sector_avg[metric] = round(sum(values) / len(values), 2) if values else None

    return {
        "company": {
            "company_id": company.company_id,
            "name": company.name,
            "sector": company.sector,
            "health_score": target_analysis.health_score if target_analysis else None,
            "fraud_score": target_analysis.fraud_score if target_analysis else None,
            "risk_score": target_analysis.risk_score if target_analysis else None,
            "esg_score": target_analysis.esg_score if target_analysis else None,
            "revenue": target_analysis.revenue if target_analysis else None,
            "profit_margin": target_analysis.profit_margin if target_analysis else None,
            "roe": target_analysis.roe if target_analysis else None,
            "debt_to_equity": target_analysis.debt_to_equity if target_analysis else None,
        },
        "sector_average": sector_avg,
        "peers": peers,
        "peer_count": len(peers),
    }


# ──────────────────────────────────────────
# News Feed (Module 16) — read-only for now
# ──────────────────────────────────────────
news_router = APIRouter(prefix="/api/news", tags=["news"])


@news_router.get("/{company_id}")
async def get_company_news(
    company_id: str,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get stored news feed for a company."""
    from services.news_insider_service import fetch_and_populate_company_data
    await fetch_and_populate_company_data(company_id, db)

    result = await db.execute(
        select(NewsFeedItem)
        .where(NewsFeedItem.company_id == company_id)
        .order_by(NewsFeedItem.published_at.desc())
        .limit(limit)
    )
    items = result.scalars().all()
    return [
        {
            "news_id": n.news_id,
            "source": n.source,
            "headline": n.headline,
            "summary": n.summary,
            "url": n.url,
            "sentiment": n.sentiment,
            "relevance_score": n.relevance_score,
            "published_at": n.published_at.isoformat(),
        }
        for n in items
    ]


# ──────────────────────────────────────────
# Insider Activity (Module 17) — read-only for now
# ──────────────────────────────────────────
insider_router = APIRouter(prefix="/api/insider", tags=["insider"])


@insider_router.get("/{company_id}")
async def get_insider_activity(
    company_id: str,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get insider trading / bulk deal activity for a company."""
    from services.news_insider_service import fetch_and_populate_company_data
    await fetch_and_populate_company_data(company_id, db)

    result = await db.execute(
        select(InsiderActivity)
        .where(InsiderActivity.company_id == company_id)
        .order_by(InsiderActivity.date.desc())
        .limit(limit)
    )
    activities = result.scalars().all()
    return [
        {
            "activity_id": a.activity_id,
            "type": a.activity_type.value,
            "holder_name": a.holder_name,
            "holder_category": a.holder_category,
            "shares_traded": a.shares_traded,
            "pct_change": a.pct_change,
            "value_inr_cr": a.value_inr_cr,
            "date": a.date.isoformat(),
            "source_url": a.source_url,
        }
        for a in activities
    ]
