from fastapi import FastAPI, Depends, HTTPException, status, Body, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from datetime import datetime, timedelta, timezone
import models, schemas, auth, auth_enhanced, database, random
from database import engine, get_db, Base
from tenant import TenantMiddleware, get_tenant_db
from pagination import paginate
from utils import log_activity, create_notification
from services.email import send_email
from services.sms_service import SmsService
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

app = FastAPI(title="Inphora Lending System API")

# Auto-create database tables on startup (only in development)
if os.getenv("ENVIRONMENT") != "production":
    try:
        Base.metadata.create_all(bind=engine, checkfirst=True)
        logger.info("Database tables verified/created successfully")
    except Exception as e:
        logger.warning(f"Could not auto-create tables: {e}")
else:
    logger.info("Skipping auto-table creation (production mode uses migrations)")

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

# Add Production Origins
allowed_origins = os.getenv("ALLOWED_ORIGINS")
if allowed_origins:
    origins.extend(allowed_origins.split(","))

# Remove duplicates
origins = list(set(origins))
logger.info(f"Allowed CORS origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting setup
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security middleware removed (handled by Nginx reverse proxy)

# Custom middleware for authentication and rate limiting
# app.add_middleware(TenantMiddleware) # Removed because each container is single-tenant now

@app.middleware("http")
async def security_middleware(request: Request, call_next):
    # Rate limiting check
    client_ip = request.client.host
    if not auth_enhanced.rate_limiter.is_allowed(client_ip):
        return JSONResponse(
            status_code=429,
            content={
                "success": False,
                "message": "Rate limit exceeded",
                "error": "Too many requests"
            }
        )
    
    response = await call_next(request)
    
    # Add security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    return response

# Import routers
from routers import (
    users, clients, loan_products, loans, expenses, reports, dashboard,
    branches, customer_groups, upload, mpesa, settings, disbursements,
    organization_config, notifications, pwa, sms, logs, repayments,
    cheque_discounting
)

# Register routers
app.include_router(pwa.router, prefix="/api")
app.include_router(sms.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(clients.router, prefix="/api")
app.include_router(loan_products.router, prefix="/api")
app.include_router(loans.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(branches.router, prefix="/api")
app.include_router(customer_groups.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(mpesa.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(disbursements.router, prefix="/api")
app.include_router(organization_config.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(logs.router, prefix="/api")
app.include_router(repayments.router, prefix="/api")
app.include_router(cheque_discounting.router, prefix="/api")

# Global error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "error": exc.status_code,
            "path": str(request.url.path)
        } if isinstance(exc.detail, dict) else {
            "success": False,
            "message": exc.detail,
            "error": "HTTP_EXCEPTION",
            "path": str(request.url.path)
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    import traceback
    error_details = traceback.format_exc()
    logger.error(f"Unhandled exception: {error_details}")
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "error": "INTERNAL_ERROR",
            "path": str(request.url.path)
        }
    )












@app.post("/api/token", response_model=schemas.LoginResponse)
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_tenant_db)
):
    # Sanitize input
    try:
        email = auth_enhanced.sanitize_email(form_data.username)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "message": "Invalid email format",
                "error": "VALIDATION_ERROR"
            }
        )
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "message": "Incorrect email or password",
                "error": "INVALID_CREDENTIALS"
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "message": "Account is inactive",
                "error": "ACCOUNT_INACTIVE"
            }
        )
    
    # Check if 2FA is enabled
    if user.two_factor_enabled:
        otp = str(random.randint(100000, 999999))
        user.otp_code = otp
        user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        db.commit()
        
        # Send OTP via Email
        email_subject = "Your Security Code - Inphora"
        email_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #0d9488;">Inphora Security</h2>
                    <p>Hello {user.full_name or 'User'},</p>
                    <p>Your One-Time Password (OTP) for login is:</p>
                    <div style="font-size: 32px; font-weight: bold; color: #333; margin: 20px 0; letter-spacing: 5px;">
                        {otp}
                    </div>
                    <p>This code expires in 10 minutes. Do not share it with anyone.</p>
                </div>
            </body>
        </html>
        """
        try:
            send_email(user.email, email_subject, email_body)
        except Exception as e:
            logger.warning(f"Failed to send email OTP: {e}")
        
        # Send OTP via SMS if phone number available
        if user.phone:
            try:
                sms_service = SmsService(provider="simulator")  # Will use configured provider in production
                formatted_phone = SmsService.format_phone(user.phone)
                sms_message = f"Your Inphora OTP is: {otp}. Valid for 10 minutes. Do not share."
                sms_result = sms_service.send_sms(formatted_phone, sms_message)
                logger.info(f"SMS OTP result: {sms_result}")
            except Exception as e:
                logger.warning(f"Failed to send SMS OTP: {e}")

        return {
            "two_factor_required": True,
            "user_id": user.id,
            "message": f"OTP sent to {user.email}" + (f" and {user.phone}" if user.phone else "")
        }

    # Log login activity
    log_activity(db, user.id, "login", "user", user.id, {"email": user.email})
    
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_enhanced.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    refresh_token = auth_enhanced.create_refresh_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "two_factor_required": False
    }

@app.post("/api/verify-otp", response_model=schemas.LoginResponse)
def verify_otp(data: schemas.OTPVerify, db: Session = Depends(get_tenant_db)):
    user = db.query(models.User).filter(models.User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.otp_code or user.otp_code != data.otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    if datetime.now(timezone.utc) > user.otp_expires_at:
        raise HTTPException(status_code=400, detail="OTP expired")
    
    # Clear OTP
    user.otp_code = None
    user.otp_expires_at = None
    
    # Log login activity
    log_activity(db, user.id, "login", "user", user.id, {"email": user.email, "method": "2fa"})
    
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_enhanced.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    refresh_token = auth_enhanced.create_refresh_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "two_factor_required": False
    }

# Enhanced Authentication Endpoints
@app.post("/api/auth/refresh", response_model=schemas.TokenRefreshResponse)
def refresh_token(
    request: Request,
    refresh_data: schemas.TokenRefreshRequest,
    db: Session = Depends(get_tenant_db)
):
    """Refresh access token using refresh token"""
    try:
        result = auth_enhanced.TokenManager.refresh_token(refresh_data.refresh_token, db)
        return {
            "success": True,
            "data": result,
            "message": "Token refreshed successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "message": "Token refresh failed",
                "error": "REFRESH_FAILED"
            }
        )

@app.post("/api/auth/logout")
def logout(
    request: Request,
    token_data: schemas.LogoutRequest,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth_enhanced.get_current_active_user)
):
    """Logout and blacklist tokens"""
    try:
        # Blacklist access token
        if token_data.access_token:
            auth_enhanced.TokenManager.revoke_token(token_data.access_token)
        
        # Blacklist refresh token if provided
        if token_data.refresh_token:
            auth_enhanced.TokenManager.revoke_token(token_data.refresh_token)
        
        # Log activity
        log_activity(db, current_user.id, "logout", "user", current_user.id, {"email": current_user.email})
        
        return {
            "success": True,
            "message": "Logged out successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "message": "Logout failed",
                "error": "LOGOUT_FAILED"
            }
        )

@app.post("/api/auth/verify-2fa")
def verify_2fa(
    request: Request,
    otp_data: schemas.TwoFactorVerify,
    db: Session = Depends(get_tenant_db)
):
    """Verify 2FA OTP code"""
    user = db.query(models.User).filter(models.User.email == otp_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "message": "User not found",
                "error": "USER_NOT_FOUND"
            }
        )
    
    if not user.otp_code or user.otp_code != otp_data.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "message": "Invalid OTP",
                "error": "INVALID_OTP"
            }
        )
    
    if datetime.now(timezone.utc) > user.otp_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "message": "OTP expired",
                "error": "OTP_EXPIRED"
            }
        )
    
    # Clear OTP
    user.otp_code = None
    user.otp_expires_at = None
    
    # Generate tokens
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    refresh_token = auth_enhanced.create_refresh_token(data={"sub": user.email})
    
    # Log activity
    log_activity(db, user.id, "login", "user", user.id, {"email": user.email, "method": "2fa"})
    
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    
    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": auth.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role
            }
        },
        "message": "Login successful"
    }

@app.get("/api/health")
def health_check():
    """System health check including Redis status"""
    from services.redis_service import redis_service
    
    redis_health = redis_service.health_check()
    
    return {
        "status": "healthy" if redis_health["status"] == "healthy" else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
        "services": {
            "database": "healthy",  # Could add actual DB health check
            "redis": redis_health["status"],
            "authentication": "healthy"
        },
        "redis_info": redis_health.get("info", {})
    }

@app.get("/api/auth/me")
def get_current_user_info(
    current_user: models.User = Depends(auth_enhanced.get_current_active_user)
):
    """Get current user information"""
    return {
        "success": True,
        "data": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "role": current_user.role,
            "is_active": current_user.is_active,
            "two_factor_enabled": current_user.two_factor_enabled,
            "last_login": current_user.last_login,
            "created_at": current_user.created_at
        }
    }

# Endpoints moved to appropriate modules if needed, keeping global ones here

# Static Files & SPA Handling
# This expects the frontend build (dist) to be placed in a 'static' folder
static_root = Path("static")
static_index = static_root / "index.html"

# Mount uploads folder (always available for file uploads)
if static_root.exists():
    uploads_dir = static_root / "uploads"
    if not uploads_dir.exists():
        uploads_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# Mount assets and serve SPA only if a built frontend exists
if static_index.is_file():
    assets_dir = static_root / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{catchall:path}")
    async def serve_react_app(catchall: str):
        if catchall.startswith("api"):
            raise HTTPException(status_code=404, detail="API endpoint not found")

        # Serve the request file if it exists in the frontend build
        file_path = static_root / catchall
        if file_path.is_file():
            return FileResponse(str(file_path))

        # Fall back to the SPA entrypoint
        return FileResponse(str(static_index))

else:
    # Fallback if no frontend build is present
    @app.get("/")
    def read_root():
        return {"message": "TytajExpress API is running (No Setup)"}
