"""
database.py
- Supports both DATABASE_URL (legacy local dev) and individual DB_* env vars (production Docker)
- Connection pool tuning for production
- Falls back to SQLite for local dev if no DB config is set
"""

import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)

# ── Resolve DATABASE_URL ──────────────────────────────────────────────────────
# Priority 1: Full DATABASE_URL (legacy local dev .env)
DATABASE_URL = os.getenv("DATABASE_URL")

# Priority 2: Build from individual DB_* vars (production Docker per-tenant)
if not DATABASE_URL:
    DB_USER     = os.getenv("DB_USER",     "inphora_user")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_HOST     = os.getenv("DB_HOST",     "mariadb")
    DB_PORT     = os.getenv("DB_PORT",     "3306")
    DB_NAME     = os.getenv("DB_NAME")

    if DB_PASSWORD and DB_NAME:
        import urllib.parse
        encoded_password = urllib.parse.quote_plus(DB_PASSWORD)
        DATABASE_URL = (
            f"mysql+pymysql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
            "?charset=utf8mb4"
        )
    else:
        # Priority 3: Hard fail missing DB in production context
        raise RuntimeError("CRITICAL: DATABASE_URL or DB credentials not set. Booting blocked.")

logger.info(f"Using database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")

# ── Engine ────────────────────────────────────────────────────────────────────
_is_sqlite = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    # SQLite doesn't support pool settings
    **(
        {
            "pool_size":     10,
            "max_overflow":  20,
            "pool_recycle":  3600,
            "pool_pre_ping": True,
        }
        if not _is_sqlite
        else {"connect_args": {"check_same_thread": False}}
    ),
    echo=os.getenv("SQL_ECHO", "false").lower() == "true",
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session and guarantees cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

