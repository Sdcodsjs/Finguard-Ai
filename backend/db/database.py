"""
FinGuard AI — Database Engine & Session Management
Supports SQLite (local dev) and PostgreSQL/Neon (production).
"""
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import event
from typing import AsyncGenerator
from config import get_settings

settings = get_settings()

# Create async engine
engine = create_async_engine(
    settings.database_url,
    echo=settings.environment == "development",
    pool_pre_ping=True,
)

# Enable WAL mode for SQLite (better concurrent read performance)
if "sqlite" in settings.database_url:
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables():
    """Create all tables on startup (dev only — use Alembic for production)."""
    from db.models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Automatically check and add new columns to the 'analysis' table (dev migration helper)
    if "sqlite" in settings.database_url:
        async with engine.begin() as conn:
            def migrate_sqlite(connection):
                res = connection.exec_driver_sql("PRAGMA table_info(analysis)")
                existing_cols = [row[1] for row in res.fetchall()]
                
                new_cols = [
                    ("quick_ratio", "FLOAT"),
                    ("interest_coverage", "FLOAT"),
                    ("operating_margin", "FLOAT"),
                    ("bull_case", "JSON"),
                    ("bear_case", "JSON"),
                    ("confidence_score", "FLOAT")
                ]
                
                for col_name, col_type in new_cols:
                    if col_name not in existing_cols:
                        connection.exec_driver_sql(f"ALTER TABLE analysis ADD COLUMN {col_name} {col_type}")
                
            await conn.run_sync(migrate_sqlite)
