"""
Security middleware for FastAPI application
"""

from fastapi import FastAPI, Request
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import time
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

class RailwayAwareTrustedHostMiddleware(TrustedHostMiddleware):
    """Custom TrustedHostMiddleware that allows Railway health checks"""
    
    async def __call__(self, scope, receive, send):
        # Check if this is a health check request
        if scope["type"] == "http":
            path = scope.get("path", "")
            client_ip = None
            if scope.get("client"):
                client_ip = scope["client"][0] if isinstance(scope["client"], tuple) else None
            
            # Allow health checks or Railway internal IPs
            if (
                path.startswith("/health") or
                (client_ip and client_ip.startswith("100.64."))
            ):
                # Modify scope headers in place to set localhost host
                headers = list(scope.get("headers", []))
                host_modified = False
                for i, (key, value) in enumerate(headers):
                    if key == b"host":
                        headers[i] = (b"host", b"localhost")
                        host_modified = True
                        break
                if not host_modified:
                    headers.append((b"host", b"localhost"))
                scope["headers"] = headers
        
        # Call parent middleware with (possibly modified) scope
        return await super().__call__(scope, receive, send)


def setup_security_middleware(app: FastAPI):
    """Configure all security middleware"""
    
    # Use custom TrustedHostMiddleware that allows Railway health checks
    allowed_hosts = [
        "localhost",
        "127.0.0.1",
        "almona.com",
        "*.almona.com",
        "testserver",  # allow FastAPI TestClient host to avoid 400 in tests
    ]
    app.add_middleware(RailwayAwareTrustedHostMiddleware, allowed_hosts=allowed_hosts)
    
    # Add security headers
    app.add_middleware(SecurityHeadersMiddleware)
    
    # Add rate limiting for specific endpoints
    # Note: For more sophisticated rate limiting, consider using slowapi
    
    logger.info("Security middleware configured")

