"""
AI Chat API — Module 4: AI Investor Assistant (SSE Streaming)
Uses Nebius chat model tier with RAG context injection.
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.database import get_db
from db.models import Report, Analysis, ChatMessage, User, ReportStatus
from services.auth_service import get_current_user
from services.nebius_client import stream_chat
from rag.rag_service import semantic_search
import structlog

router = APIRouter(prefix="/api/chat", tags=["chat"])
log = structlog.get_logger()


class ChatRequest(BaseModel):
    message: str
    history: list[dict] | None = None  # [{"role": "user"|"assistant", "content": "..."}]


@router.post("/{report_id}")
async def chat_with_report(
    report_id: str,
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Stream AI responses about the uploaded report.
    Context: RAG-retrieved chunks + stored analysis scores.
    Uses Nebius chat model (NEBIUS_CHAT_MODEL).
    """
    # Verify report
    r_result = await db.execute(select(Report).where(Report.report_id == report_id))
    report = r_result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    if report.status not in (ReportStatus.analyzed, ReportStatus.extracted):
        raise HTTPException(400, f"Report is still {report.status.value}. Wait for analysis to complete.")

    # Fetch analysis for context
    a_result = await db.execute(select(Analysis).where(Analysis.report_id == report_id))
    analysis = a_result.scalar_one_or_none()

    # RAG context — semantic search for user's question
    rag_chunks = semantic_search(report_id, req.message, top_k=4)
    rag_text = "\n\n".join(
        f"[Page {c['page']}] {c['text']}" for c in rag_chunks
    )

    # Build context from analysis + RAG
    context_parts = []
    if analysis:
        context_parts.append(
            f"ANALYSIS SCORES:\n"
            f"Health Score: {analysis.health_score}/100\n"
            f"Fraud Score: {analysis.fraud_score}/100 (higher = more risk)\n"
            f"Risk Score: {analysis.risk_score}/100\n"
            f"ESG Score: {analysis.esg_score}/100\n"
            f"Investment Outlook: {analysis.investment_outlook}\n"
            f"Key Financials: Revenue={analysis.revenue}, Net Profit={analysis.net_profit}, "
            f"Total Debt={analysis.total_debt}, Cash={analysis.cash_and_equivalents}"
        )
        if analysis.fraud_narrative:
            context_parts.append(f"FRAUD FLAGS:\n{analysis.fraud_narrative}")
        if analysis.risk_narrative:
            context_parts.append(f"RISK SUMMARY:\n{analysis.risk_narrative}")

    if rag_text:
        context_parts.append(f"RELEVANT REPORT SECTIONS:\n{rag_text}")

    full_context = "\n\n---\n\n".join(context_parts)

    # Save user message
    user_msg = ChatMessage(
        report_id=report_id,
        user_id=current_user.user_id,
        role="user",
        content=req.message,
    )
    db.add(user_msg)
    await db.commit()

    # Stream response
    async def event_generator():
        full_response = []
        citations = []

        try:
            stream = stream_chat(
                user_message=req.message,
                context=full_context,
                history=req.history,
                report_id=report_id,
            )

            for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    full_response.append(delta.content)
                    yield f"data: {json.dumps({'type': 'text', 'content': delta.content})}\n\n"

            # Save assistant response
            full_text = "".join(full_response)
            
            # Extract page citations from response
            import re
            page_refs = re.findall(r"[Pp]age\s+(\d+)", full_text)
            citations = [{"page": int(p)} for p in page_refs[:5]]

            assistant_msg = ChatMessage(
                report_id=report_id,
                user_id=current_user.user_id,
                role="assistant",
                content=full_text,
                citations=citations,
            )
            db.add(assistant_msg)
            await db.commit()

            # Send citations as final event
            yield f"data: {json.dumps({'type': 'citations', 'citations': citations})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            log.error("chat_stream_error", error=str(e), report_id=report_id)
            yield f"data: {json.dumps({'type': 'error', 'message': 'AI response unavailable. Please retry.'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{report_id}/history")
async def get_chat_history(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
):
    """Get chat history for a report."""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.report_id == report_id, ChatMessage.user_id == current_user.user_id)
        .order_by(ChatMessage.created_at)
        .limit(limit)
    )
    messages = result.scalars().all()

    return [
        {
            "role": m.role,
            "content": m.content,
            "citations": m.citations or [],
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


class PortfolioChatRequest(BaseModel):
    report_ids: list[str]
    message: str
    history: list[dict] | None = None


@router.post("/portfolio")
async def chat_with_portfolio(
    req: PortfolioChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Stream AI responses about multiple uploaded reports (Portfolio scope).
    Context: RAG context gathered across multiple report IDs.
    """
    if not req.report_ids:
        raise HTTPException(400, "Please select at least one report.")

    # 1. Fetch reports and analyses
    r_result = await db.execute(
        select(Report, Analysis)
        .join(Analysis, Report.report_id == Analysis.report_id)
        .where(Report.report_id.in_(req.report_ids))
    )
    rows = r_result.all()
    
    if not rows:
        raise HTTPException(404, "None of the selected reports could be found or analyzed.")

    # 2. Query RAG context across all selected report collections
    combined_rag_chunks = []
    for report, analysis in rows:
        chunks = semantic_search(report.report_id, req.message, top_k=3)
        company_name = report.company_id or "Unknown"
        for chunk in chunks:
            chunk["company"] = company_name
            combined_rag_chunks.append(chunk)

    # Sort chunks by distance (lower is closer/better) and take top 5
    combined_rag_chunks = sorted(combined_rag_chunks, key=lambda x: x.get("distance", 1.0))[:5]
    
    rag_text = "\n\n".join(
        f"[Company: {c['company']} | Page {c['page']}] {c['text']}" for c in combined_rag_chunks
    )

    # 3. Build context summary from analyses
    analysis_parts = []
    for report, analysis in rows:
        company_name = report.company_id or "Unknown"
        analysis_parts.append(
            f"COMPANY: {company_name} (FY{report.year})\n"
            f"Health Score: {analysis.health_score}/100\n"
            f"Fraud Score: {analysis.fraud_score}/100\n"
            f"Risk Score: {analysis.risk_score}/100\n"
            f"ESG Score: {analysis.esg_score}/100\n"
            f"Outlook: {analysis.investment_outlook}\n"
            f"Revenue: {analysis.revenue} Cr, Net Profit: {analysis.net_profit} Cr, Debt: {analysis.total_debt} Cr"
        )
    
    full_context_parts = [
        "PORTFOLIO ANALYSIS SUMMARY:\n" + "\n\n".join(analysis_parts)
    ]
    if rag_text:
        full_context_parts.append(f"RELEVANT REPORT EXCERPTS:\n{rag_text}")

    full_context = "\n\n---\n\n".join(full_context_parts)

    # 4. Stream response
    async def event_generator():
        full_response = []
        try:
            stream = stream_chat(
                user_message=req.message,
                context=full_context,
                history=req.history,
                report_id=req.report_ids[0],
            )

            for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    full_response.append(delta.content)
                    yield f"data: {json.dumps({'type': 'text', 'content': delta.content})}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            log.error("portfolio_chat_stream_error", error=str(e))
            yield f"data: {json.dumps({'type': 'error', 'message': 'AI response unavailable.'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
