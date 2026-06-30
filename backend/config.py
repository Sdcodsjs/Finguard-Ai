"""
FinGuard AI — Application Settings
All Nebius model names are configurable via environment variables.
No model names are hardcoded anywhere in the codebase.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # ──────────────────────────────────────────
    # Nebius Token Factory (Open Models ONLY)
    # ──────────────────────────────────────────
    nebius_api_key: str = ""
    nebius_base_url: str = "https://api.studio.nebius.ai/v1/"

    # Model routing tiers — NEVER hardcoded, always from env
    # Reasoning Tier: fraud detection, investment recs, self-critique, portfolio risk
    nebius_reasoning_model: str = ""
    # Long Context Tier: annual report analysis, multi-year trends, document diff
    nebius_long_context_model: str = ""
    # Fast Inference Tier: metric extraction, sentiment, classification, chat follow-ups
    nebius_extraction_model: str = ""
    # Chat Tier: interactive AI assistant
    nebius_chat_model: str = ""
    # Embedding Tier: RAG, semantic search, similarity retrieval
    nebius_embedding_model: str = ""

    # ──────────────────────────────────────────
    # Database
    # ──────────────────────────────────────────
    database_url: str = "sqlite+aiosqlite:///./finguard.db"

    # ──────────────────────────────────────────
    # Auth (JWT)
    # ──────────────────────────────────────────
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days

    # ──────────────────────────────────────────
    # App
    # ──────────────────────────────────────────
    environment: str = "development"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 50

    # ──────────────────────────────────────────
    # ChromaDB (RAG Vector Store)
    # ──────────────────────────────────────────
    chroma_persist_dir: str = "./chroma_db"

    # ──────────────────────────────────────────
    # Notifications (optional)
    # ──────────────────────────────────────────
    resend_api_key: str = ""
    slack_webhook_url: str = ""

    # ──────────────────────────────────────────
    # Export
    # ──────────────────────────────────────────
    export_dir: str = "./exports"

    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    def get_model(self, tier: str) -> str:
        """
        Dynamically resolve a model name by tier.
        Raises a clear error if the env var is not set.
        """
        tier_map = {
            "reasoning": self.nebius_reasoning_model,
            "long_context": self.nebius_long_context_model,
            "extraction": self.nebius_extraction_model,
            "chat": self.nebius_chat_model,
            "embedding": self.nebius_embedding_model,
        }
        model = tier_map.get(tier, "")
        if not model:
            raise ValueError(
                f"Nebius model for tier '{tier}' is not configured. "
                f"Set NEBIUS_{tier.upper()}_MODEL in your .env file."
            )
        return model


@lru_cache()
def get_settings() -> Settings:
    return Settings()
