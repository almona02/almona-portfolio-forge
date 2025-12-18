"""
Security middleware for FastAPI application
"""

from fastapi import FastAPI, Request
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import time
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        
        # Content Security Policy (adjust based on your needs)
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://*.supabase.co;"
        )
        response.headers["Content-Security-Policy"] = csp
        
        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple rate limiting middleware"""
    
    def __init__(self, app, max_requests: int = 100, window: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window = window
        self.requests = {}
    
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host
        
        # Clean old entries
        current_time = time.time()
        if client_ip in self.requests:
            self.requests[client_ip] = [
                t for t in self.requests[client_ip] 
                if current_time - t < self.window
            ]
        
        # Check rate limit
        if client_ip not in self.requests:
            self.requests[client_ip] = []
        
        if len(self.requests[client_ip]) >= self.max_requests:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please try again later."
            )
        
        # Add current request
        self.requests[client_ip].append(current_time)
        
        return await call_next(request)

class RailwayHealthCheckMiddleware(BaseHTTPMiddleware):
    """Bypass host validation for Railway health checks"""
    
    async def dispatch(self, request: Request, call_next):
        # Allow Railway health checks from internal network
        # Railway uses 100.64.0.0/10 for internal networking
        client_ip = request.client.host if request.client else None
        
        # Skip host validation for health endpoints or Railway internal IPs
        if (
            request.url.path.startswith("/health") or
            (client_ip and client_ip.startswith("100.64."))
        ):
            # Bypass TrustedHostMiddleware by setting a valid host
            headers = list(request.scope.get("headers", []))
            for i, (key, value) in enumerate(headers):
                if key == b"host":
                    headers[i] = (b"host", b"localhost")
                    break
            else:
                headers.append((b"host", b"localhost"))
            request.scope["headers"] = headers
        
        return await call_next(request)


def setup_security_middleware(app: FastAPI):
    """Configure all security middleware"""
    
    # Add Railway health check bypass FIRST (before TrustedHostMiddleware)
    app.add_middleware(RailwayHealthCheckMiddleware)
    
    # Add TrustedHostMiddleware (adjust allowed hosts as needed)
    allowed_hosts = [
        "localhost",
        "127.0.0.1",
        "almona.com",
        "*.almona.com",
        "testserver",  # allow FastAPI TestClient host to avoid 400 in tests
    ]
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)
    
    # Add security headers
    app.add_middleware(SecurityHeadersMiddleware)
    
    # Add rate limiting for specific endpoints
    # Note: For more sophisticated rate limiting, consider using slowapi
    
    logger.info("Security middleware configured")

