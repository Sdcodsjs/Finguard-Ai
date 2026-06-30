"""
FinGuard AI — Background Processing Pipeline
Async job: PDF Upload → OCR → Chunking → Embedding → Extraction → Multi-Agent Analysis → Store.
Runs as a FastAPI BackgroundTask (upgradeable to Celery for production).
"""
import os
import time
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.models import Report, Analysis, AnalysisHistory, Company, ReportStatus, UsageLog
from services.pdf_extractor import extract_pdf, chunk_text
from services.financial_parser import extract_financial_metrics
from rag.rag_service import embed_and_store, retrieve_context, FINANCIAL_RAG_QUERIES
from ai.agents import run_multi_agent_analysis
from ai.prompts import PROMPT_VERSION
from config import get_settings

log = structlog.get_logger()
settings = get_settings()


async def run_report_pipeline(
    report_id: str,
    file_path: str,
    db: AsyncSession,
):
    """
    Full async pipeline for a newly uploaded annual report.
    Called as a FastAPI BackgroundTask after upload completes.
    
    Steps:
    1. Mark status = processing
    2. OCR + text extraction
    3. Chunk + embed into ChromaDB (Nebius embedding model)
    4. Extract financial metrics (Nebius fast model)
    5. RAG retrieval for context
    6. Multi-agent analysis (5 agents + consensus)
    7. Store results
    8. Mark status = analyzed
    """
    start_time = time.time()
    log.info("pipeline_start", report_id=report_id)

    try:
        # ── 1. Fetch report + mark processing ───────────────────
        result = await db.execute(select(Report).where(Report.report_id == report_id))
        report = result.scalar_one_or_none()
        if not report:
            log.error("pipeline_report_not_found", report_id=report_id)
            return

        report.status = ReportStatus.processing
        await db.commit()

        # ── 2. PDF Extraction (OCR) ──────────────────────────────
        log.info("pipeline_step_ocr", report_id=report_id)
        extracted = extract_pdf(file_path)

        if extracted.page_count == 0 or extracted.ocr_quality < 0.1:
            report.status = ReportStatus.failed
            report.error_message = (
                f"Low OCR quality ({extracted.ocr_quality:.1%}) — "
                "the PDF may be scanned with poor resolution or in an unsupported language."
            )
            await db.commit()
            return

        report.page_count = extracted.page_count
        report.ocr_quality = extracted.ocr_quality
        report.status = ReportStatus.extracted
        await db.commit()

        # ── 3. Chunk + Embed (Nebius Embedding Model) ────────────
        log.info("pipeline_step_embed", report_id=report_id, pages=extracted.page_count)
        chunks = chunk_text(extracted.full_text, chunk_size=1500, overlap=200)
        
        # Fetch company name for collection metadata
        co_result = await db.execute(select(Company).where(Company.company_id == report.company_id))
        company = co_result.scalar_one_or_none()
        company_name = company.name if company else ""

        total_chunks = embed_and_store(
            report_id=report_id,
            chunks=chunks,
            company_name=company_name,
        )
        log.info("pipeline_embed_done", report_id=report_id, chunks=total_chunks)

        # ── 4. Financial Metric Extraction (Nebius Fast Model) ───
        log.info("pipeline_step_extract", report_id=report_id)
        financial_data = extract_financial_metrics(
            text=extracted.full_text,
            report_id=report_id,
        )

        # Persist extracted JSON
        report.extraction_json = financial_data
        await db.commit()

        # ── 5. RAG Context Retrieval ─────────────────────────────
        log.info("pipeline_step_rag", report_id=report_id)
        rag_context = retrieve_context(
            report_id=report_id,
            queries=FINANCIAL_RAG_QUERIES,
            top_k_per_query=3,
        )

        # ── 6. Multi-Agent Analysis ──────────────────────────────
        log.info("pipeline_step_agents", report_id=report_id)
        sector = financial_data.get("sector") or (company.sector if company else "general")

        consensus, timing = run_multi_agent_analysis(
            financial_data=financial_data,
            rag_context=rag_context,
            report_id=report_id,
            sector=sector,
            run_critique=True,
            run_forecast=True,
        )

        # ── 7. Store Analysis Results ────────────────────────────
        log.info("pipeline_step_store", report_id=report_id)

        is_ = financial_data.get("income_statement", {})
        bs = financial_data.get("balance_sheet", {})
        cf = financial_data.get("cash_flow", {})
        ratios = financial_data.get("computed_ratios", {})

        analysis = Analysis(
            report_id=report_id,
            health_score=consensus.health_score,
            fraud_score=consensus.fraud_score,
            risk_score=consensus.risk_score,
            esg_score=consensus.esg_score,
            investment_outlook=consensus.investment_view,
            profitability_score=consensus.profitability_score,
            liquidity_score=consensus.liquidity_score,
            solvency_score=consensus.solvency_score,
            growth_score=consensus.growth_score,
            esg_environmental=consensus.agent_outputs.get("ESG Analyst", {}).get("environmental", {}).get("score"),
            esg_social=consensus.agent_outputs.get("ESG Analyst", {}).get("social", {}).get("score"),
            esg_governance=consensus.governance_score,
            # Financials
            revenue=is_.get("revenue"),
            net_profit=is_.get("net_profit"),
            ebitda=is_.get("ebitda"),
            total_debt=bs.get("total_debt"),
            cash_and_equivalents=bs.get("cash_and_equivalents"),
            total_assets=bs.get("total_assets"),
            total_equity=bs.get("total_equity"),
            operating_cash_flow=cf.get("operating_cash_flow"),
            eps=is_.get("eps"),
            # Ratios
            roe=ratios.get("roe"),
            roa=ratios.get("roa"),
            current_ratio=ratios.get("current_ratio"),
            quick_ratio=ratios.get("quick_ratio"),
            debt_to_equity=ratios.get("debt_to_equity"),
            interest_coverage=ratios.get("interest_coverage"),
            profit_margin=ratios.get("profit_margin"),
            operating_margin=ratios.get("operating_margin"),
            # Explainability (Module 10)
            fraud_citations=consensus.fraud_citations,
            health_citations=consensus.health_citations,
            risk_citations=consensus.risk_citations,
            # AI narratives
            executive_summary=consensus.executive_summary,
            fraud_narrative=consensus.fraud_narrative,
            investment_narrative=consensus.investment_narrative,
            risk_narrative=consensus.risk_narrative,
            esg_narrative=consensus.esg_narrative,
            # Self-critique (Module 15)
            self_critique_passed=consensus.self_critique_passed,
            self_critique_notes=consensus.self_critique_notes,
            # Investment Committee & Confidence
            bull_case=consensus.bull_case,
            bear_case=consensus.bear_case,
            confidence_score=consensus.confidence_score,
            # Normalization (Module 22)
            normalized_currency=financial_data.get("normalized", {}).get("currency"),
            normalization_factor=financial_data.get("normalized", {}).get("factor"),
            # Metadata
            model_used=settings.nebius_reasoning_model,
            prompt_version=PROMPT_VERSION,
        )
        db.add(analysis)

        # Store analysis history (Module 9)
        history = AnalysisHistory(
            report_id=report_id,
            company_id=report.company_id,
            year=report.year,
            health_score=consensus.health_score,
            fraud_score=consensus.fraud_score,
            risk_score=consensus.risk_score,
            esg_score=consensus.esg_score,
            auditor_name=financial_data.get("auditor_name"),
            restated_flag=False,
            revenue=is_.get("revenue"),
            net_profit=is_.get("net_profit"),
            total_debt=bs.get("total_debt"),
        )
        db.add(history)

        # Log usage (Admin analytics)
        usage = UsageLog(
            report_id=report_id,
            module="full_pipeline",
            model=settings.nebius_reasoning_model or "multi-model",
            prompt_version=PROMPT_VERSION,
            latency_ms=int((time.time() - start_time) * 1000),
        )
        db.add(usage)

        # ── 8. Mark complete ─────────────────────────────────────
        report.status = ReportStatus.analyzed
        await db.commit()

        total_time = int((time.time() - start_time) * 1000)
        log.info(
            "pipeline_complete",
            report_id=report_id,
            total_ms=total_time,
            health_score=consensus.health_score,
            fraud_score=consensus.fraud_score,
            timing=timing,
        )

    except Exception as e:
        log.error("pipeline_error", report_id=report_id, error=str(e))
        try:
            result = await db.execute(select(Report).where(Report.report_id == report_id))
            report = result.scalar_one_or_none()
            if report:
                report.status = ReportStatus.failed
                report.error_message = str(e)[:500]
                await db.commit()
        except Exception as inner_e:
            log.error("pipeline_status_update_failed", error=str(inner_e))
