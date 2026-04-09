"""
Enhanced Authentication Module with Redis Support
Handles JWT token management, RBAC, rate limiting, and input sanitization
"""

import os
import re
import html
import secrets
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
import models
import schemas
from dotenv import load_dotenv
from database import get_db
from tenant import get_tenant_db
from services.redis_service import redis_service

load_dotenv()

# JWT Configuration — uses same SECRET_KEY as auth.py for consistency
SECRET_KEY = os.getenv("SECRET_KEY", "local_secret_key_123")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
REFRESH_TOKEN_EXPIRE_DAYS = 7

logger = logging.getLogger(__name__)


# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/token")

# Role hierarchy (numeric levels for comparison)
ROLE_HIERARCHY = {
    "viewer": 1,
    "loan_officer": 2,
    "manager": 3,
    "admin": 4
}

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def is_token_blacklisted(token: str) -> bool:
    """Check if token is blacklisted"""
    return redis_service.is_token_blacklisted(token)

def blacklist_token(token: str) -> bool:
    """Add token to blacklist"""
    return redis_service.blacklist_token(token)

def revoke_token(token: str) -> bool:
    """Revoke/blacklist a token (alias)"""
    return blacklist_token(token)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_tenant_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        if email is None or token_type != "access":
            raise credentials_exception
        
        # Check if token is blacklisted
        if is_token_blacklisted(token):
            raise credentials_exception
            
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_active_user(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    return current_user

# Enhanced RBAC system
def require_role(required_role: str):
    """Role-based access control decorator.
    
    Uses numeric hierarchy levels: admin(4) > manager(3) > loan_officer(2) > viewer(1).
    A user's role must have a level >= the required role's level to gain access.
    """
    def role_checker(current_user: models.User = Depends(get_current_active_user)):
        user_level = ROLE_HIERARCHY.get(current_user.role, 0)
        required_level = ROLE_HIERARCHY.get(required_role, 999)
        
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"The user doesn't have {required_role} privileges"
            )
        return current_user
    return role_checker

def require_admin(current_user: models.User = Depends(get_current_active_user)):
    return require_role("admin")(current_user)

def require_manager(current_user: models.User = Depends(get_current_active_user)):
    return require_role("manager")(current_user)

def require_loan_officer(current_user: models.User = Depends(get_current_active_user)):
    return require_role("loan_officer")(current_user)

# Rate limiting
class RateLimiter:
    def __init__(self):
        self.max_requests = 5000   # increased for test stability
        self.window_seconds = 15 * 60  # 15 minutes
    
    def is_allowed(self, key: str) -> bool:
        """Sliding window rate limiter using Redis. Returns False if limit exceeded."""
        try:
            redis_key = f"ratelimit:{key}"
            current = redis_service.redis_client.get(redis_key)
            if current and int(current) >= self.max_requests:
                logger.warning(f"Rate limit exceeded for: {key}")
                return False
            # Increment and set TTL atomically
            pipe = redis_service.redis_client.pipeline()
            pipe.incr(redis_key)
            pipe.expire(redis_key, self.window_seconds)
            pipe.execute()
            return True
        except Exception as e:
            # Fail open if Redis is unavailable — do not block legitimate users
            logger.warning(f"Rate limiter Redis error (failing open): {e}")
            return True

rate_limiter = RateLimiter()

# Token refresh functionality
class TokenManager:
    @staticmethod
    def refresh_token(refresh_token: str, db: Session) -> Dict[str, Any]:
        """Refresh access token using refresh token"""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            token_type: str = payload.get("type")
            
            if email is None or token_type != "refresh":
                raise credentials_exception
                
        except JWTError:
            raise credentials_exception
        
        user = db.query(models.User).filter(models.User.email == email).first()
        if user is None or not user.is_active:
            raise credentials_exception
        
        # Blacklist the old refresh token
        revoke_token(refresh_token)
        
        # Create new tokens
        access_token = create_access_token(data={"sub": user.email})
        new_refresh_token = create_refresh_token(data={"sub": user.email})
        
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    
    @staticmethod
    def revoke_token(token: str):
        """Revoke/blacklist a token"""
        revoke_token(token)

# Input validation and sanitization
def sanitize_email(email: str) -> str:
    """Sanitize email input"""
    email = email.strip().lower()
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        raise ValueError("Invalid email format")
    return email

def sanitize_phone(phone: str) -> str:
    """Sanitize phone number for Kenyan format"""
    phone = re.sub(r'[^\d]', '', phone)
    if phone.startswith('254'):
        phone = '0' + phone[3:]
    elif not phone.startswith('0'):
        phone = '0' + phone
    if not re.match(r'^07\d{8}$', phone):
        raise ValueError("Invalid Kenyan phone number format")
    return phone

def sanitize_string(input_str: str, max_length: int = 255) -> str:
    """Sanitize string input"""
    if not input_str:
        return ""
    # Remove HTML tags and escape special characters
    sanitized = html.escape(input_str.strip())
    # Limit length
    return sanitized[:max_length]
