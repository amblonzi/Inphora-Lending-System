from fastapi import Request, HTTPException, Depends
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session, sessionmaker
import os
import logging
from typing import Optional, Dict
from database import get_engine, SessionLocal

logger = logging.getLogger(__name__)

# Context var for tenant ID if needed, but we bind to the session directly
import contextvars
_tenant_id_ctx = contextvars.ContextVar("tenant_id", default=None)

class TenantManager:
    def __init__(self):
        self.tenant_map: Dict[str, str] = {}
        self.load_tenants()

    def load_tenants(self):
        # Format: TENANT_DB_MAP="tenant1:db_url1,tenant2:db_url2"
        tenant_str = os.getenv("TENANT_DB_MAP", "")
        if tenant_str:
            for item in tenant_str.split(","):
                if ":" in item:
                    tenant, url = item.split(":", 1)
                    self.tenant_map[tenant.strip()] = url.strip()
        
        logger.info(f"Loaded {len(self.tenant_map)} tenants")

    def get_db_url(self, tenant: str) -> Optional[str]:
        return self.tenant_map.get(tenant)

tenant_manager = TenantManager()

class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Check X-Tenant header
        tenant = request.headers.get("X-Tenant")
        
        # 2. Check subdomain if no header (e.g. tenant1.inphora.net)
        if not tenant:
            host_header = request.headers.get("host", "")
            host = host_header.split(":")[0] # Remove port
            if host != "localhost" and host != "127.0.0.1":
                parts = host.split(".")
                # Ensure it's not an IP address (simplified check) and has enough parts for a subdomain
                if len(parts) > 2 and not all(p.isdigit() for p in parts):
                    tenant = parts[0]
        
        # 3. Store in request state
        request.state.tenant = tenant
        _tenant_id_ctx.set(tenant)
        
        response = await call_next(request)
        return response

def get_tenant_db(request: Request):
    tenant = getattr(request.state, "tenant", None)
    
    if not tenant:
        # Fallback to default DB for local/single-tenant
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
        return

    db_url = tenant_manager.get_db_url(tenant)
    if not db_url:
        # If tenant provided but not found in map, error for security
        raise HTTPException(status_code=400, detail=f"Invalid tenant: {tenant}")

    # Get cached engine for this tenant
    engine = get_engine(db_url)
    TenantSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    db = TenantSessionLocal()
    try:
        yield db
    finally:
        db.close()
