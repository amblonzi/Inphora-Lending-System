"""
database.py — FIXED
- Connection string fully from environment variables (no hardcoded values)
- Connection pool tuning for production
- Tenant-aware session factory
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# ── FIXED: All config from env vars — no hardcoded credentials ────────────────
DB_USER     = os.getenv("DB_USER",     "inphora_user")
DB_PASSWORD = os.getenv("DB_PASSWORD")          # Must be set — no default!
DB_HOST     = os.getenv("DB_HOST",     "mariadb")
DB_PORT     = os.getenv("DB_PORT",     "3306")
DB_NAME     = os.getenv("DB_NAME")              # Must be set — tenant-specific

if not DB_PASSWORD:
    raise RuntimeError("DB_PASSWORD environment variable is not set")
if not DB_NAME:
    raise RuntimeError("DB_NAME environment variable is not set")

DATABASE_URL = (
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    "?charset=utf8mb4"
)

# ── FIXED: Production-grade connection pool settings ──────────────────────────
engine = create_engine(
    DATABASE_URL,
    pool_size=10,           # Max persistent connections
    max_overflow=20,        # Burst connections above pool_size
    pool_recycle=3600,      # Recycle connections every hour (avoids stale conn)
    pool_pre_ping=True,     # Test connection before use (avoids dropped conn errors)
    echo=os.getenv("SQL_ECHO", "false").lower() == "true",  # Only log SQL in dev
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

