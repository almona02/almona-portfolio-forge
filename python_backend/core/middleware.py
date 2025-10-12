"""
Rate limiting, security headers, and request validation middleware.
"""
import time
import logging
from typing import Dict, Optional, Callable
from collections import defaultdict, deque
from datetime import datetime, timedelta

from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from core.config import settings
from core.errors import ErrorContext, DomainError, handle_domain_error
from core.monitoring import get_structured_logger, record_error_metrics, trace_operation

logger = get_structured_logger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware with sliding window."""
    
    def __init__(self, app, requests_per_minute: int = 60, burst_limit: int = 10):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.burst_limit = burst_limit
        self.clients: Dict[str, deque] = defaultdict(deque)
        self.burst_clients: Dict[str, deque] = defaultdict(deque)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = self._get_client_ip(request)
        now = time.time()
        
        # Check burst limit (requests per second)
        burst_window = self.burst_clients[client_ip]
        self._clean_old_requests(burst_window, now - 1)  # 1 second window
        
        if len(burst_window) >= self.burst_limit:
            return self._rate_limit_response("Burst limit exceeded")
        
        # Check rate limit (requests per minute)
        rate_window = self.clients[client_ip]
        self._clean_old_requests(rate_window, now - 60)  # 1 minute window
        
        if len(rate_window) >= self.requests_per_minute:
            return self._rate_limit_response("Rate limit exceeded")
        
        # Record request
        burst_window.append(now)
        rate_window.append(now)
        
        response = await call_next(request)
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address."""
        # Check for forwarded headers first
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def _clean_old_requests(self, window: deque, cutoff_time: float):
        """Remove old requests from the window."""
        while window and window[0] < cutoff_time:
            window.popleft()
    
    def _rate_limit_response(self, message: str) -> JSONResponse:
        """Return rate limit exceeded response."""
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error_code": "RATE_LIMIT_EXCEEDED",
                "message": message,
                "retry_after": 60
            },
            headers={"Retry-After": "60"}
        )


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        
        # Remove server header
        if "Server" in response.headers:
            del response.headers["Server"]
        
        return response


class RequestValidationMiddleware(BaseHTTPMiddleware):
    """Request validation and sanitization."""
    
    def __init__(self, app, max_request_size: int = 10 * 1024 * 1024):  # 10MB
        super().__init__(app)
        self.max_request_size = max_request_size
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Check request size
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_request_size:
            return JSONResponse(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                content={
                    "error_code": "REQUEST_TOO_LARGE",
                    "message": f"Request size exceeds {self.max_request_size} bytes"
                }
            )
        
        # Validate content type for POST/PUT requests
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            if not content_type.startswith(("application/json", "multipart/form-data", "application/x-www-form-urlencoded")):
                return JSONResponse(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    content={
                        "error_code": "UNSUPPORTED_MEDIA_TYPE",
                        "message": "Content-Type must be application/json, multipart/form-data, or application/x-www-form-urlencoded"
                    }
                )
        
        response = await call_next(request)
        return response


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Global error handling middleware."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            response = await call_next(request)
            return response
        except DomainError as e:
            logger.error(
                "Domain error occurred",
                error_code=e.error_code.value,
                status_code=e.status_code,
                user_id=e.context.user_id,
                request_id=e.context.request_id,
                message=e.message
            )
            record_error_metrics("domain_error", "error")
            return JSONResponse(
                status_code=e.status_code,
                content={
                    "error_code": e.error_code.value,
                    "message": e.message,
                    "details": e.details
                }
            )
        except HTTPException as e:
            return JSONResponse(
                status_code=e.status_code,
                content={
                    "error_code": "HTTP_ERROR",
                    "message": e.detail
                }
            )
        except Exception as e:
            logger.exception(
                "Unexpected error occurred",
                error=str(e),
                error_type=type(e).__name__
            )
            record_error_metrics("unexpected_error", "error")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error_code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred"
                }
            )


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Request/response logging middleware."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        request_id = f"req_{int(start_time * 1000)}"
        
        # Log request with structured logging
        logger.info(
            "Request started",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            query_params=str(request.query_params),
            client_ip=request.client.host if request.client else "unknown",
            user_agent=request.headers.get("user-agent", "")
        )
        
        response = await call_next(request)
        
        # Log response with structured logging
        duration = time.time() - start_time
        logger.info(
            "Request completed",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration * 1000
        )
        
        return response
