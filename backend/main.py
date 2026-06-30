"""
FinGuard AI — FastAPI Application Entry Point
"""
import os
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from db.database import create_tables
from api.auth import router as auth_router
from api.reports import router as reports_router
from api.analysis import router as analysis_router
from api.chat import router as chat_router
from api.features import (
    portfolio_router, watchlist_router, alerts_router,
    earnings_router, annotations_router, export_router,
    compare_router, admin_router,
)
from api.extra_routes import (
    diff_router, benchmark_router, news_router, insider_router,
)

log = structlog.get_logger()
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create DB tables and required directories."""
    log.info("finguard_starting", environment=settings.environment)
    await create_tables()
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.export_dir, exist_ok=True)
    os.makedirs(settings.chroma_persist_dir, exist_ok=True)

    # Validate Nebius config on startup
    missing_models = []
    for tier in ["reasoning", "long_context", "extraction", "chat", "embedding"]:
        try:
            settings.get_model(tier)
        except ValueError:
            missing_models.append(f"NEBIUS_{tier.upper()}_MODEL")

    if missing_models:
        log.warning(
            "nebius_models_not_configured",
            missing=missing_models,
            note="Set these env vars before running analysis. See .env.example.",
        )

    log.info("finguard_ready")
    yield
    log.info("finguard_shutdown")


app = FastAPI(
    title="FinGuard AI",
    description=(
        "Enterprise Financial Risk Intelligence Platform. "
        "Powered by Open Models on Nebius Token Factory."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── Middleware ─────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ─────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(reports_router)
app.include_router(analysis_router)
app.include_router(chat_router)
app.include_router(portfolio_router)
app.include_router(watchlist_router)
app.include_router(alerts_router)
app.include_router(earnings_router)
app.include_router(annotations_router)
app.include_router(export_router)
app.include_router(compare_router)
app.include_router(admin_router)
app.include_router(diff_router)
app.include_router(benchmark_router)
app.include_router(news_router)
app.include_router(insider_router)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "FinGuard AI",
        "nebius_base_url": settings.nebius_base_url,
        "models_configured": {
            "reasoning": bool(settings.nebius_reasoning_model),
            "long_context": bool(settings.nebius_long_context_model),
            "extraction": bool(settings.nebius_extraction_model),
            "chat": bool(settings.nebius_chat_model),
            "embedding": bool(settings.nebius_embedding_model),
        },
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.error("unhandled_exception", path=str(request.url), error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again."},
    )
