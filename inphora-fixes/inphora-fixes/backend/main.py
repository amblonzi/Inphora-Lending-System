"""
Inphora Lending System — FastAPI Backend
FIXED: Rate limiting, health check, CORS hardening, structured logging, lifespan events
"""

import logging
import os
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from .database import engine, Base
from .routers import auth, borrowers, loans, payments, reports
from .middleware.security import SecurityHeadersMiddleware

# ── Structured logging setup ──────────────────────────────────────────────────
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)
log = structlog.get_logger()

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])


# ── App lifespan (replaces deprecated on_event) ───────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    log.info("inphora_backend_starting", tenant=os.getenv("TENANT_NAME", "unknown"))
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    log.info("inphora_backend_stopped")


# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Inphora Lending API",
    version="2.0.0",
    docs_url="/api/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/api/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
    openapi_url="/api/openapi.json" if os.getenv("ENVIRONMENT") != "production" else None,
    lifespan=lifespan,
)

# ── Middleware stack ──────────────────────────────────────────────────────────

# 1. Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# 2. Security headers (custom middleware — see middleware/security.py)
app.add_middleware(SecurityHeadersMiddleware)

# 3. Trusted hosts — only accept requests via known subdomains
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost").split(",")
app.add_middleware(TrustedHostMiddleware, allowed_hosts=ALLOWED_HOSTS)

# 4. CORS — restrict to known frontend origin, not wildcard
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,      prefix="/api/auth",      tags=["Authentication"])
app.include_router(borrowers.router, prefix="/api/borrowers", tags=["Borrowers"])
app.include_router(loans.router,     prefix="/api/loans",     tags=["Loans"])
app.include_router(payments.router,  prefix="/api/payments",  tags=["Payments"])
app.include_router(reports.router,   prefix="/api/reports",   tags=["Reports"])


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"], include_in_schema=False)
async def health_check():
    """
    FIXED: Added proper health check endpoint for Docker HEALTHCHECK + load balancer probes.
    Checks DB connectivity so a healthy container == actually usable container.
    """
    from .database import SessionLocal
    from sqlalchemy import text
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "healthy", "tenant": os.getenv("TENANT_NAME", "unknown")}
    except Exception as e:
        log.error("health_check_failed", error=str(e))
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unhealthy", "detail": "Database unreachable"},
        )


# ── Global exception handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.error("unhandled_exception", path=request.url.path, error=str(exc), exc_info=exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        # FIXED: Never leak internal error details to the client in production
        content={"detail": "An internal error occurred. Please contact support."},
    )
