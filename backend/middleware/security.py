"""
middleware/security.py — NEW (IMPR-04)
Adds security headers to every HTTP response.
Prevents clickjacking, MIME sniffing, and helps with XSS mitigation.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # HSTS — force HTTPS for 1 year, include subdomains
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )
        # Block framing (clickjacking protection)
        response.headers["X-Frame-Options"] = "DENY"
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        # Restrict referrer info
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Minimal permissions policy
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=()"
        )
        # Remove server banner (don't leak uvicorn version)
        response.headers.pop("server", None)
        response.headers.pop("x-powered-by", None)

        return response
