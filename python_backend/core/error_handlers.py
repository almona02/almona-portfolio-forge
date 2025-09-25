"""Enhanced error handling patterns for FastAPI"""
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
import logging
from typing import Dict, Any, Optional
import traceback

logger = logging.getLogger(__name__)

class APIError(Exception):
    """Base API error with structured response"""
    def __init__(self, message: str, status_code: int = 400, details: Optional[Dict] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)

class DatabaseError(APIError):
    """Database operation errors"""
    def __init__(self, message: str = "Database operation failed", details: Optional[Dict] = None):
        super().__init__(message, status.HTTP_500_INTERNAL_SERVER_ERROR, details)

class ValidationError(APIError):
    """Input validation errors"""
    def __init__(self, message: str = "Validation failed", details: Optional[Dict] = None):
        super().__init__(message, status.HTTP_422_UNPROCESSABLE_ENTITY, details)

class AuthorizationError(APIError):
    """Authorization errors"""
    def __init__(self, message: str = "Access denied", details: Optional[Dict] = None):
        super().__init__(message, status.HTTP_403_FORBIDDEN, details)

async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    """Handle custom API errors"""
    logger.error(f"API Error: {exc.message}", extra={"details": exc.details})
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.message,
            "details": exc.details,
            "path": str(request.url.path)
        }
    )

async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle Pydantic validation errors"""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(x) for x in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation failed",
            "details": {"validation_errors": errors},
            "path": str(request.url.path)
        }
    )

async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected errors"""
    logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "details": {"type": type(exc).__name__} if logger.level <= logging.DEBUG else {},
            "path": str(request.url.path)
        }
    )

def handle_supabase_error(error: Exception) -> APIError:
    """Convert Supabase errors to structured API errors"""
    error_msg = str(error).lower()
    
    if "duplicate key" in error_msg:
        return ValidationError("Resource already exists", {"type": "duplicate"})
    elif "foreign key" in error_msg:
        return ValidationError("Referenced resource not found", {"type": "foreign_key"})
    elif "not null" in error_msg:
        return ValidationError("Required field missing", {"type": "not_null"})
    elif "permission denied" in error_msg or "rls" in error_msg:
        return AuthorizationError("Access denied")
    else:
        return DatabaseError("Database operation failed", {"original_error": str(error)})