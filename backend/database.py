from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import os
import logging
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    logger.warning(
        "DATABASE_URL is not set! Falling back to local SQLite database. "
        "Set DATABASE_URL in your .env file for MySQL/MariaDB."
    )
    DATABASE_URL = "sqlite:///./app.db"

# Engine cache for multi-tenancy
# Maps database URL -> Engine
_engines: Dict[str, Any] = {}
_async_engines: Dict[str, Any] = {}

def get_engine_kwargs(url: str):
    kwargs = {}
    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs["pool_size"] = int(os.getenv("DB_POOL_SIZE", 10))
        kwargs["max_overflow"] = int(os.getenv("DB_MAX_OVERFLOW", 20))
        kwargs["pool_recycle"] = int(os.getenv("DB_POOL_RECYCLE", 3600))
        kwargs["pool_pre_ping"] = True
    return kwargs

def get_engine(url: str = None):
    url = url or DATABASE_URL
    if url not in _engines:
        logger.info(f"Creating new sync engine for {url}")
        _engines[url] = create_engine(url, **get_engine_kwargs(url))
    return _engines[url]

def get_async_engine(url: str = None):
    url = url or DATABASE_URL
    # Convert mysql+pymysql to mysql+aiomysql for async
    if url.startswith("mysql+pymysql"):
        url = url.replace("mysql+pymysql", "mysql+aiomysql")
    elif url.startswith("sqlite"):
        url = url.replace("sqlite://", "sqlite+aiosqlite://")
        
    if url not in _async_engines:
        logger.info(f"Creating new async engine for {url}")
        # Async Engines don't support pool_size etc in the same way for all drivers, 
        # but SQLAlchemy handles it well via create_async_engine
        _async_engines[url] = create_async_engine(url, **get_engine_kwargs(url))
    return _async_engines[url]

# Default engine and session for single-tenant / local dev
engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_async_db():
    async_engine = get_async_engine()
    async_session = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
