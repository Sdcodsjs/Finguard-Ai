"""
FinGuard AI — SQLAlchemy ORM Models
Full schema per specification §9 (all 24 modules).
"""
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text,
    ForeignKey, Enum as SAEnum, JSON
)
from sqlalchemy.orm import relationship, DeclarativeBase
import enum
import uuid


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


# ──────────────────────────────────────────
# Enums
# ──────────────────────────────────────────

class UserRole(str, enum.Enum):
    retail_investor = "retail_investor"
    analyst = "analyst"
    auditor = "auditor"
    admin = "admin"


class ReportStatus(str, enum.Enum):
    uploaded = "uploaded"
    processing = "processing"
    extracted = "extracted"
    analyzed = "analyzed"
    failed = "failed"


class AlertChannel(str, enum.Enum):
    email = "email"
    slack = "slack"
    in_app = "in_app"


class InsiderActivityType(str, enum.Enum):
    buy = "buy"
    sell = "sell"
    block_deal = "block_deal"
    pledge = "pledge"


class RiskLevel(str, enum.Enum):
    low = "Low"
    moderate = "Moderate"
    high = "High"
    critical = "Critical"


# ──────────────────────────────────────────
# Identity & Access
# ──────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    user_id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.retail_investor, nullable=False)
    org_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # Relationships
    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")
    watchlists = relationship("Watchlist", back_populates="user", cascade="all, delete-orphan")
    portfolios = relationship("Portfolio", back_populates="user", cascade="all, delete-orphan")
    alert_rules = relationship("AlertRule", back_populates="user", cascade="all, delete-orphan")
    annotations = relationship("Annotation", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")


class ApiKey(Base):
    """Module 21 — Institutional API Access"""
    __tablename__ = "api_keys"

    key_id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    name = Column(String(255), nullable=False)
    key_hash = Column(String(255), nullable=False, unique=True)
    key_prefix = Column(String(10), nullable=False)  # e.g., "fg_sk_"
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)
    rate_limit = Column(Integer, default=1000)  # requests per day
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="api_keys")


# ──────────────────────────────────────────
# Core Entities
# ──────────────────────────────────────────

class Company(Base):
    __tablename__ = "companies"

    company_id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False, index=True)
    ticker = Column(String(20), nullable=True)
    sector = Column(String(100), nullable=True)
    industry = Column(String(100), nullable=True)
    market_cap = Column(Float, nullable=True)  # in USD millions
    currency = Column(String(10), default="INR")  # Module 22
    accounting_standard = Column(String(20), default="Ind-AS")  # Module 22
    country = Column(String(50), default="India")
    exchange = Column(String(20), nullable=True)  # NSE, BSE, NYSE, etc.
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    reports = relationship("Report", back_populates="company", cascade="all, delete-orphan")
    watchlists = relationship("Watchlist", back_populates="company")
    insider_activities = relationship("InsiderActivity", back_populates="company", cascade="all, delete-orphan")
    news_feed = relationship("NewsFeedItem", back_populates="company", cascade="all, delete-orphan")
    earnings_calls = relationship("EarningsCall", back_populates="company", cascade="all, delete-orphan")
    document_diffs = relationship("DocumentDiff", back_populates="company", cascade="all, delete-orphan")
    portfolio_holdings = relationship("PortfolioHolding", back_populates="company")
    alert_rules = relationship("AlertRule", back_populates="company")


class Report(Base):
    __tablename__ = "reports"

    report_id = Column(String, primary_key=True, default=gen_uuid)
    company_id = Column(String, ForeignKey("companies.company_id"), nullable=False)
    year = Column(Integer, nullable=False)
    file_url = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    status = Column(SAEnum(ReportStatus), default=ReportStatus.uploaded)
    page_count = Column(Integer, nullable=True)
    ocr_quality = Column(Float, nullable=True)  # 0.0–1.0 confidence
    extraction_json = Column(JSON, nullable=True)  # raw extracted data
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    error_message = Column(Text, nullable=True)

    # Relationships
    company = relationship("Company", back_populates="reports")
    analysis = relationship("Analysis", back_populates="report", uselist=False, cascade="all, delete-orphan")
    analysis_history = relationship("AnalysisHistory", back_populates="report", cascade="all, delete-orphan")
    annotations = relationship("Annotation", back_populates="report", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="report", cascade="all, delete-orphan")


# ──────────────────────────────────────────
# Analysis
# ──────────────────────────────────────────

class Analysis(Base):
    __tablename__ = "analysis"

    analysis_id = Column(String, primary_key=True, default=gen_uuid)
    report_id = Column(String, ForeignKey("reports.report_id"), nullable=False, unique=True)

    # Core scores (0–100)
    health_score = Column(Float, nullable=True)
    fraud_score = Column(Float, nullable=True)
    risk_score = Column(Float, nullable=True)
    esg_score = Column(Float, nullable=True)  # Module 18
    investment_outlook = Column(String(20), nullable=True)  # buy/hold/sell (flagging)

    # Health sub-scores
    profitability_score = Column(Float, nullable=True)
    liquidity_score = Column(Float, nullable=True)
    solvency_score = Column(Float, nullable=True)
    growth_score = Column(Float, nullable=True)

    # ESG sub-scores (Module 18)
    esg_environmental = Column(Float, nullable=True)
    esg_social = Column(Float, nullable=True)
    esg_governance = Column(Float, nullable=True)

    # Key financial metrics (extracted)
    revenue = Column(Float, nullable=True)
    net_profit = Column(Float, nullable=True)
    ebitda = Column(Float, nullable=True)
    total_debt = Column(Float, nullable=True)
    cash_and_equivalents = Column(Float, nullable=True)
    total_assets = Column(Float, nullable=True)
    total_equity = Column(Float, nullable=True)
    operating_cash_flow = Column(Float, nullable=True)
    eps = Column(Float, nullable=True)

    # Ratios
    roe = Column(Float, nullable=True)
    roa = Column(Float, nullable=True)
    current_ratio = Column(Float, nullable=True)
    quick_ratio = Column(Float, nullable=True)
    debt_to_equity = Column(Float, nullable=True)
    interest_coverage = Column(Float, nullable=True)
    profit_margin = Column(Float, nullable=True)
    operating_margin = Column(Float, nullable=True)

    # Explainability (Module 10) — citations per score component
    fraud_citations = Column(JSON, nullable=True)  # list of {text, page, impact}
    health_citations = Column(JSON, nullable=True)
    risk_citations = Column(JSON, nullable=True)

    # AI narrative
    executive_summary = Column(Text, nullable=True)
    fraud_narrative = Column(Text, nullable=True)
    investment_narrative = Column(Text, nullable=True)
    risk_narrative = Column(Text, nullable=True)
    esg_narrative = Column(Text, nullable=True)  # Module 18

    # Sector-specific metrics (Module 8)
    sector_metrics = Column(JSON, nullable=True)

    # Currency normalization (Module 22)
    normalized_currency = Column(String(10), nullable=True)
    normalization_factor = Column(Float, nullable=True)

    # Self-critique (Module 15)
    self_critique_passed = Column(Boolean, nullable=True)
    self_critique_notes = Column(Text, nullable=True)

    # Investment Committee & Confidence
    bull_case = Column(JSON, nullable=True)
    bear_case = Column(JSON, nullable=True)
    confidence_score = Column(Float, nullable=True)

    # Metadata
    model_used = Column(String(100), nullable=True)
    prompt_version = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    report = relationship("Report", back_populates="analysis")


class AnalysisHistory(Base):
    """Module 9 — Multi-Year Trend & Restatement Tracker"""
    __tablename__ = "analysis_history"

    history_id = Column(String, primary_key=True, default=gen_uuid)
    report_id = Column(String, ForeignKey("reports.report_id"), nullable=False)
    company_id = Column(String, ForeignKey("companies.company_id"), nullable=False)
    year = Column(Integer, nullable=False)

    health_score = Column(Float, nullable=True)
    fraud_score = Column(Float, nullable=True)
    risk_score = Column(Float, nullable=True)
    esg_score = Column(Float, nullable=True)

    auditor_name = Column(String(255), nullable=True)
    auditor_changed = Column(Boolean, default=False)  # flag if auditor switched
    restated_flag = Column(Boolean, default=False)
    restatement_note = Column(Text, nullable=True)

    revenue = Column(Float, nullable=True)
    net_profit = Column(Float, nullable=True)
    total_debt = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("Report", back_populates="analysis_history")


# ──────────────────────────────────────────
# Document Diff (Module 19)
# ──────────────────────────────────────────

class DocumentDiff(Base):
    """Module 19 — Year-over-Year Document Diff (MD&A section)"""
    __tablename__ = "document_diffs"

    diff_id = Column(String, primary_key=True, default=gen_uuid)
    company_id = Column(String, ForeignKey("companies.company_id"), nullable=False)
    year_from = Column(Integer, nullable=False)
    year_to = Column(Integer, nullable=False)
    section = Column(String(100), default="MDA")  # MD&A, Risk Factors, etc.

    # Diff content
    diff_summary = Column(Text, nullable=True)  # AI-generated summary of changes
    added_phrases = Column(JSON, nullable=True)  # list of newly added phrases
    removed_phrases = Column(JSON, nullable=True)  # list of removed phrases
    softened_phrases = Column(JSON, nullable=True)  # list of {from, to} pairs
    risk_signals = Column(JSON, nullable=True)  # language-shift red flags

    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="document_diffs")


# ──────────────────────────────────────────
# Market Signals
# ──────────────────────────────────────────

class InsiderActivity(Base):
    """Module 17 — Insider Trading & Bulk/Block Deal Tracker"""
    __tablename__ = "insider_activity"

    activity_id = Column(String, primary_key=True, default=gen_uuid)
    company_id = Column(String, ForeignKey("companies.company_id"), nullable=False)
    activity_type = Column(SAEnum(InsiderActivityType), nullable=False)
    holder_name = Column(String(255), nullable=False)
    holder_category = Column(String(100), nullable=True)  # promoter, DII, FII, etc.
    shares_traded = Column(Float, nullable=True)
    pct_change = Column(Float, nullable=True)  # % of total shareholding
    value_inr_cr = Column(Float, nullable=True)
    date = Column(DateTime, nullable=False)
    source_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="insider_activities")


class NewsFeedItem(Base):
    """Module 16 — Regulatory & News Feed"""
    __tablename__ = "news_feed"

    news_id = Column(String, primary_key=True, default=gen_uuid)
    company_id = Column(String, ForeignKey("companies.company_id"), nullable=True)
    source = Column(String(100), nullable=False)  # SEBI, BSE, NSE, Reuters, etc.
    headline = Column(String(500), nullable=False)
    summary = Column(Text, nullable=True)
    url = Column(String(500), nullable=True)
    sentiment = Column(String(20), nullable=True)  # positive / neutral / negative
    relevance_score = Column(Float, nullable=True)  # 0.0–1.0
    published_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="news_feed")


# ──────────────────────────────────────────
# Earnings Calls (Module 5)
# ──────────────────────────────────────────

class EarningsCall(Base):
    __tablename__ = "earnings_calls"

    call_id = Column(String, primary_key=True, default=gen_uuid)
    company_id = Column(String, ForeignKey("companies.company_id"), nullable=False)
    quarter = Column(String(10), nullable=True)  # e.g., Q3FY25
    year = Column(Integer, nullable=True)
    transcript_url = Column(String(500), nullable=True)
    transcript_text = Column(Text, nullable=True)

    # Sentiment scores
    sentiment_pos = Column(Float, nullable=True)
    sentiment_neu = Column(Float, nullable=True)
    sentiment_neg = Column(Float, nullable=True)

    # Confidence signals
    confidence_phrases = Column(JSON, nullable=True)  # list of detected positive phrases
    warning_phrases = Column(JSON, nullable=True)  # list of detected warning phrases
    management_tone = Column(String(50), nullable=True)  # confident/cautious/defensive

    # AI narrative
    summary = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="earnings_calls")


# ──────────────────────────────────────────
# User-Facing Features
# ──────────────────────────────────────────

class Watchlist(Base):
    """Module 11 — Alerts & Watchlist"""
    __tablename__ = "watchlists"

    watchlist_id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    company_id = Column(String, ForeignKey("companies.company_id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="watchlists")
    company = relationship("Company", back_populates="watchlists")


class AlertRule(Base):
    """Module 20 — Custom Alert Rule Builder"""
    __tablename__ = "alert_rules"

    rule_id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    company_id = Column(String, ForeignKey("companies.company_id"), nullable=True)  # null = global

    name = Column(String(255), nullable=False)
    metric = Column(String(100), nullable=False)  # e.g., "fraud_score", "debt_to_equity"
    operator = Column(String(10), nullable=False)  # gt, lt, gte, lte, eq, change_pct
    threshold = Column(Float, nullable=False)
    channel = Column(SAEnum(AlertChannel), default=AlertChannel.in_app)

    is_active = Column(Boolean, default=True)
    last_triggered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="alert_rules")
    company = relationship("Company", back_populates="alert_rules")


class Portfolio(Base):
    """Module 12 — Portfolio Roll-Up"""
    __tablename__ = "portfolios"

    portfolio_id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="portfolios")
    holdings = relationship("PortfolioHolding", back_populates="portfolio", cascade="all, delete-orphan")


class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"

    holding_id = Column(String, primary_key=True, default=gen_uuid)
    portfolio_id = Column(String, ForeignKey("portfolios.portfolio_id"), nullable=False)
    company_id = Column(String, ForeignKey("companies.company_id"), nullable=False)
    weight_pct = Column(Float, nullable=False)  # 0–100
    cost_basis = Column(Float, nullable=True)
    added_at = Column(DateTime, default=datetime.utcnow)

    portfolio = relationship("Portfolio", back_populates="holdings")
    company = relationship("Company", back_populates="portfolio_holdings")


class Annotation(Base):
    """Module 23 — Collaborative Annotations"""
    __tablename__ = "annotations"

    annotation_id = Column(String, primary_key=True, default=gen_uuid)
    report_id = Column(String, ForeignKey("reports.report_id"), nullable=False)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)

    target_ref = Column(String(255), nullable=False)  # e.g., "fraud_citation_2" or "page:47"
    target_type = Column(String(50), default="citation")  # citation, chart, metric, page
    comment = Column(Text, nullable=False)
    resolved = Column(Boolean, default=False)
    parent_id = Column(String, ForeignKey("annotations.annotation_id"), nullable=True)  # threading

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    report = relationship("Report", back_populates="annotations")
    user = relationship("User", back_populates="annotations")
    replies = relationship("Annotation", back_populates="parent")
    parent = relationship("Annotation", back_populates="replies", remote_side=[annotation_id])


class ChatMessage(Base):
    """Module 4 — AI Investor Assistant chat history"""
    __tablename__ = "chat_messages"

    message_id = Column(String, primary_key=True, default=gen_uuid)
    report_id = Column(String, ForeignKey("reports.report_id"), nullable=False)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    role = Column(String(20), nullable=False)  # user / assistant
    content = Column(Text, nullable=False)
    citations = Column(JSON, nullable=True)  # page references in assistant responses
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("Report", back_populates="chat_messages")
    user = relationship("User", back_populates="chat_sessions")


# ──────────────────────────────────────────
# Observability
# ──────────────────────────────────────────

class UsageLog(Base):
    """Admin usage metrics — logs every LLM call"""
    __tablename__ = "usage_logs"

    log_id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=True)
    api_key_id = Column(String, ForeignKey("api_keys.key_id"), nullable=True)
    report_id = Column(String, nullable=True)

    module = Column(String(50), nullable=False)  # m1_extraction, m2_fraud, etc.
    model = Column(String(100), nullable=False)
    prompt_version = Column(String(20), nullable=True)
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    total_tokens = Column(Integer, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    cache_hit = Column(Boolean, default=False)
    error = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
