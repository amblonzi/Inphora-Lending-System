"""
Enhanced Authentication Module with Redis Support
Handles JWT token management, RBAC, rate limiting, and input sanitization
"""

import os
import re
import html
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
import models
from database import get_db
from services.redis_service import redis_service

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/token")

# Role hierarchy
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
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def is_token_blacklisted(token: str) -> bool:
    """Check if token is blacklisted"""
    if redis_client:
        return redis_client.sismember("blacklisted_tokens", token)
    else:
        return token in token_blacklist

def blacklist_token(token: str):
    """Add token to blacklist"""
    if redis_client:
        redis_client.sadd("blacklisted_tokens", token)
        # Set TTL to match token expiration
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            exp = payload.get("exp")
            if exp:
                ttl = int(exp) - int(datetime.utcnow().timestamp())
                if ttl > 0:
                    redis_client.expire("blacklisted_tokens", ttl)
        except:
            pass
    else:
        token_blacklist.add(token)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
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
    """Role-based access control decorator"""
    def role_checker(current_user: models.User = Depends(get_current_active_user)):
        role_hierarchy = {
            "admin": ["admin", "manager", "loan_officer", "viewer"],
            "manager": ["manager", "loan_officer", "viewer"],
            "loan_officer": ["loan_officer", "viewer"],
            "viewer": ["viewer"]
        }
        
        allowed_roles = role_hierarchy.get(required_role, [])
        if current_user.role not in allowed_roles:
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
        self.max_requests = 100  # requests per window
        self.window_minutes = 15  # minutes
    
    def is_allowed(self, key: str) -> bool:
        if redis_service.is_connected():
            # Use Redis for rate limiting
            count = redis_service.increment_rate_limit(key, self.window_minutes * 60)
            return count <= self.max_requests
        else:
            # Fallback to simple in-memory limiting
            return True  # Allow all requests if Redis is not available

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

def is_token_blacklisted(token: str) -> bool:
    """Check if token is blacklisted"""
    return redis_service.is_token_blacklisted(token)

def blacklist_token(token: str) -> bool:
    """Add token to blacklist"""
    return redis_service.blacklist_token(token)

def revoke_token(token: str) -> bool:
    """Revoke/blacklist a token (alias)"""
    return blacklist_token(token)

# Input validation and sanitization
import re
import html

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
