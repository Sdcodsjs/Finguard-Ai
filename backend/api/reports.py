"""Reports API Routes — Upload, Status, Company Management"""
import os
import uuid
import structlog
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from db.database import get_db, AsyncSessionLocal
from db.models import Report, Company, User, ReportStatus, Analysis
from services.auth_service import get_current_user
from jobs.pipeline import run_report_pipeline
from config import get_settings

router = APIRouter(prefix="/api", tags=["reports"])
log = structlog.get_logger()
settings = get_settings()

ALLOWED_MIME = {"application/pdf"}
MAX_SIZE = settings.max_upload_size_mb * 1024 * 1024


class CompanyCreate(BaseModel):
    name: str
    sector: str | None = None
    ticker: str | None = None
    currency: str = "INR"
    accounting_standard: str = "Ind-AS"


@router.post("/reports/upload")
async def upload_report(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    company_name: str = Form(...),
    company_sector: str = Form(""),
    year: int = Form(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a PDF annual report and trigger async analysis pipeline."""
    # Validate file type
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(400, "Only PDF files are accepted.")

    # Read and validate size
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(413, f"File exceeds {settings.max_upload_size_mb}MB limit.")

    # Get or create company
    result = await db.execute(
        select(Company).where(Company.name.ilike(f"%{company_name}%"))
    )
    company = result.scalar_one_or_none()
    if not company:
        company = Company(
            name=company_name,
            sector=company_sector or None,
        )
        db.add(company)
        await db.flush()

    # Save file
    os.makedirs(settings.upload_dir, exist_ok=True)
    report_id = str(uuid.uuid4())
    safe_filename = os.path.basename(file.filename or "report.pdf")
    filename = f"{report_id}_{safe_filename}"
    file_path = os.path.join(settings.upload_dir, filename)

    with open(file_path, "wb") as f:
        f.write(content)

    # Create report record
    report = Report(
        report_id=report_id,
        company_id=company.company_id,
        year=year,
        file_url=file_path,
        file_name=file.filename,
        file_size_bytes=len(content),
        status=ReportStatus.uploaded,
    )
    db.add(report)
    await db.commit()

    # Kick off async pipeline (non-blocking).
    # IMPORTANT: We do NOT pass the request-scoped db session here — it is closed
    # after the response returns. The pipeline creates its own independent session.
    background_tasks.add_task(
        _run_pipeline_in_background,
        report_id=report_id,
        file_path=file_path,
    )

    log.info("report_uploaded", report_id=report_id, user_id=current_user.user_id, company=company_name)

    return {
        "report_id": report_id,
        "company_id": company.company_id,
        "status": "uploaded",
        "message": "Report uploaded. Analysis pipeline started. Poll /api/reports/{report_id}/status for progress.",
    }


async def _run_pipeline_in_background(report_id: str, file_path: str):
    """Wrapper that creates a fresh DB session for the background pipeline task."""
    async with AsyncSessionLocal() as db:
        try:
            await run_report_pipeline(report_id=report_id, file_path=file_path, db=db)
        except Exception as e:
            log.error("background_pipeline_error", report_id=report_id, error=str(e))


@router.get("/reports/{report_id}/status")
async def get_report_status(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Report).where(Report.report_id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")

    return {
        "report_id": report_id,
        "status": report.status.value,
        "page_count": report.page_count,
        "ocr_quality": report.ocr_quality,
        "error_message": report.error_message,
        "updated_at": report.updated_at.isoformat() if report.updated_at else None,
    }


@router.get("/companies/{company_id}")
async def get_company(
    company_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Company).where(Company.company_id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(404, "Company not found")

    return {
        "company_id": company.company_id,
        "name": company.name,
        "sector": company.sector,
        "ticker": company.ticker,
        "currency": company.currency,
        "accounting_standard": company.accounting_standard,
    }


@router.get("/companies/{company_id}/reports")
async def get_company_reports(
    company_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report)
        .where(Report.company_id == company_id)
        .order_by(desc(Report.year))
    )
    reports = result.scalars().all()

    return [
        {
            "report_id": r.report_id,
            "year": r.year,
            "status": r.status.value,
            "file_name": r.file_name,
            "created_at": r.created_at.isoformat(),
        }
        for r in reports
    ]


@router.get("/companies")
async def list_companies(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
):
    result = await db.execute(select(Company).limit(limit))
    companies = result.scalars().all()
    return [
        {"company_id": c.company_id, "name": c.name, "sector": c.sector, "ticker": c.ticker}
        for c in companies
    ]


@router.get("/reports")
async def list_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
):
    """List all uploaded reports with company details and analysis scores."""
    result = await db.execute(
        select(Report, Company, Analysis)
        .join(Company, Report.company_id == Company.company_id)
        .outerjoin(Analysis, Report.report_id == Analysis.report_id)
        .order_by(desc(Report.created_at))
        .limit(limit)
    )
    rows = result.all()
    return [
        {
            "report_id": r.report_id,
            "company_name": c.name,
            "year": r.year,
            "status": r.status.value,
            "health_score": a.health_score if a else None,
            "fraud_score": a.fraud_score if a else None,
            "created_at": r.created_at.isoformat(),
        }
        for r, c, a in rows
    ]
