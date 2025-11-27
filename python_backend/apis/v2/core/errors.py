"""
Comprehensive error handling framework for v2 APIs.

This module provides custom exception classes and a global error handler
that ensures consistent error responses across all v2 endpoints with
Arabic/English internationalization support.
"""
import logging
import traceback
import json
import os
from typing import Any, Dict, Optional, Union, List
from enum import Enum
from dataclasses import dataclass
from datetime import datetime

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
# Import base error handling from core
from core.errors import (
    ErrorCode, ErrorContext, DomainError
)

logger = logging.getLogger(__name__)

# Internationalization support


class ErrorMessageTranslator:
    """Handles error message translation between Arabic and English."""
    
    def __init__(self):
        self._messages = {}
        self._load_messages()
    
    def _load_messages(self):
        """Load error messages from locale files."""
        try:
            # Load English messages
            en_path = os.path.join(
                os.path.dirname(__file__), "../../../locales/en/errors.json"
            )
            if os.path.exists(en_path):
                with open(en_path, 'r', encoding='utf-8') as f:
                    self._messages['en'] = json.load(f)

            # Load Arabic messages
            ar_path = os.path.join(
                os.path.dirname(__file__), "../../../locales/ar/errors.json"
            )
            if os.path.exists(ar_path):
                with open(ar_path, 'r', encoding='utf-8') as f:
                    self._messages['ar'] = json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load error messages: {e}")
            self._messages = {'en': {}, 'ar': {}}
    
    def get_message(self, error_code: str, language: str = 'en', **kwargs) -> str:
        """Get translated error message."""
        messages = self._messages.get(
            language, self._messages.get('en', {})
        )
        message_template = messages.get(error_code, error_code)

        # Replace placeholders
        try:
            return message_template.format(**kwargs)
        except (KeyError, ValueError):
            return message_template

    def get_localized_error(
        self, error_code: str, language: str = 'en', **kwargs
    ) -> Dict[str, str]:
        """Get error message in both languages."""
        return {
            'en': self.get_message(error_code, 'en', **kwargs),
            'ar': self.get_message(error_code, 'ar', **kwargs)
        }

# Global translator instance
error_translator = ErrorMessageTranslator()


class V2ErrorCode(Enum):
    """V2-specific error codes extending the base error codes."""
    # General errors
    INVALID_INPUT = "INVALID_INPUT"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    DOMAIN_ERROR = "DOMAIN_ERROR"

    # Quote-specific errors
    QUOTE_NOT_FOUND = "QUOTE_NOT_FOUND"
    QUOTE_ALREADY_EXISTS = "QUOTE_ALREADY_EXISTS"
    QUOTE_INVALID_STATUS = "QUOTE_INVALID_STATUS"
    QUOTE_ITEM_VALIDATION_FAILED = "QUOTE_ITEM_VALIDATION_FAILED"
    QUOTE_CALCULATION_ERROR = "QUOTE_CALCULATION_ERROR"

    # Ticket-specific errors
    TICKET_NOT_FOUND = "TICKET_NOT_FOUND"
    TICKET_INVALID_CATEGORY = "TICKET_INVALID_CATEGORY"
    TICKET_INVALID_STATUS = "TICKET_INVALID_STATUS"
    TICKET_ASSIGNMENT_FAILED = "TICKET_ASSIGNMENT_FAILED"
    TICKET_MESSAGE_FAILED = "TICKET_MESSAGE_FAILED"
    TICKET_PERMISSION_DENIED = "TICKET_PERMISSION_DENIED"

    # Authentication/Authorization errors
    INVALID_TOKEN = "INVALID_TOKEN"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    INSUFFICIENT_ROLE = "INSUFFICIENT_ROLE"
    USER_NOT_FOUND = "USER_NOT_FOUND"

    # External service errors
    SUPABASE_ERROR = "SUPABASE_ERROR"
    EXTERNAL_API_ERROR = "EXTERNAL_API_ERROR"
    INTEGRATION_ERROR = "INTEGRATION_ERROR"

    # Rate limiting and throttling
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    QUOTA_EXCEEDED = "QUOTA_EXCEEDED"


@dataclass
class V2ErrorContext(ErrorContext):
    """Extended error context for v2 APIs."""
    endpoint: Optional[str] = None
    method: Optional[str] = None
    user_role: Optional[str] = None
    tenant_id: Optional[str] = None
    correlation_id: Optional[str] = None


class V2APIError(DomainError):
    """Base class for all v2 API errors with internationalization support."""
    
    def __init__(
        self,
        message: str,
        error_code: Union[ErrorCode, V2ErrorCode],
        status_code: int,
        context: Optional[V2ErrorContext] = None,
        details: Optional[Dict[str, Any]] = None,
        retry_after: Optional[int] = None,
        localized_message: Optional[Dict[str, str]] = None
    ):
        self.retry_after = retry_after
        self.localized_message = localized_message or {}
        super().__init__(message, error_code, status_code, context, details)
    
    def to_json_response(
        self, request: Optional[Request] = None, language: str = 'en'
    ) -> JSONResponse:
        """Convert to JSON response with v2-specific formatting and localization."""
        # Get language from request headers or default to 'en'
        if request:
            accept_language = request.headers.get('Accept-Language', 'en')
            if 'ar' in accept_language.lower():
                language = 'ar'
        
        # Use localized message if available, otherwise fall back to default
        display_message = self.localized_message.get(language, self.message)
        
        response_data = {
            "error": {
                "code": self.error_code.value,
                "message": display_message,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "path": str(request.url.path) if request else None,
                "method": request.method if request else None,
                "request_id": self.context.request_id,
                "correlation_id": getattr(
                    self.context, 'correlation_id', None
                )
            }
        }
        
        # Include all language versions if available
        if self.localized_message:
            response_data["error"]["messages"] = self.localized_message
        
        if self.details:
            response_data["error"]["details"] = self.details
        
        if self.retry_after:
            response_data["error"]["retry_after"] = self.retry_after
        
        headers = {}
        if self.retry_after:
            headers["Retry-After"] = str(self.retry_after)
        
        return JSONResponse(
            status_code=self.status_code,
            content=response_data,
            headers=headers
        )


class V2ValidationError(V2APIError):
    """Base validation error for v2 APIs."""

    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        validation_errors: Optional[List[Dict[str, Any]]] = None,
        context: Optional[V2ErrorContext] = None
    ):
        details = {}
        if field:
            details["field"] = field
        if validation_errors:
            details["validation_errors"] = validation_errors

        # Get localized messages
        localized_message = error_translator.get_localized_error(
            "VALIDATION_ERROR", field=field or "unknown"
        )

        super().__init__(
            message=message,
            error_code=V2ErrorCode.VALIDATION_ERROR,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            context=context,
            details=details,
            localized_message=localized_message
        )


class V2NotFoundError(V2APIError):
    """Base not found error for v2 APIs."""

    def __init__(
        self,
        message: str,
        resource_type: str,
        resource_id: Union[str, int],
        context: Optional[V2ErrorContext] = None
    ):
        super().__init__(
            message=message,
            error_code=V2ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
            context=context,
            details={
                "resource_type": resource_type,
                "resource_id": str(resource_id)
            }
        )


# Quote-specific errors
class QuoteNotFoundError(V2APIError):
    """Quote not found error."""
    
    def __init__(
        self,
        quote_id: Union[str, int],
        context: Optional[V2ErrorContext] = None
    ):
        super().__init__(
            message=f"Quote with ID '{quote_id}' not found",
            error_code=V2ErrorCode.QUOTE_NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
            context=context,
            details={"quote_id": str(quote_id), "resource_type": "quote"}
        )


class QuoteAlreadyExistsError(V2APIError):
    """Quote already exists error."""

    def __init__(
        self,
        quote_number: str,
        context: Optional[V2ErrorContext] = None
    ):
        super().__init__(
            message=f"Quote with number '{quote_number}' already exists",
            error_code=V2ErrorCode.QUOTE_ALREADY_EXISTS,
            status_code=status.HTTP_409_CONFLICT,
            context=context,
            details={"quote_number": quote_number, "resource_type": "quote"}
        )


class QuoteValidationError(V2APIError):
    """Quote validation error."""
    
    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        validation_errors: Optional[List[Dict[str, Any]]] = None,
        context: Optional[V2ErrorContext] = None
    ):
        details = {}
        if field:
            details["field"] = field
        if validation_errors:
            details["validation_errors"] = validation_errors

        # Get localized messages
        localized_message = error_translator.get_localized_error(
            "QUOTE_VALIDATION_ERROR", field=field or "unknown"
        )
            
        super().__init__(
            message=message,
            error_code=V2ErrorCode.QUOTE_ITEM_VALIDATION_FAILED,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            context=context,
            details=details,
            localized_message=localized_message
        )


# Ticket-specific errors
class TicketNotFoundError(V2APIError):
    """Ticket not found error."""
    
    def __init__(
        self,
        ticket_id: Union[str, int],
        context: Optional[V2ErrorContext] = None
    ):
        super().__init__(
            message=f"Ticket with ID '{ticket_id}' not found",
            error_code=V2ErrorCode.TICKET_NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
            context=context,
            details={"ticket_id": str(ticket_id), "resource_type": "ticket"}
        )


class TicketPermissionError(V2APIError):
    """Ticket permission error."""

    def __init__(
        self,
        message: str = "Insufficient permissions for this ticket operation",
        required_role: Optional[str] = None,
        user_role: Optional[str] = None,
        context: Optional[V2ErrorContext] = None
    ):
        details = {}
        if required_role:
            details["required_role"] = required_role
        if user_role:
            details["user_role"] = user_role

        super().__init__(
            message=message,
            error_code=V2ErrorCode.TICKET_PERMISSION_DENIED,
            status_code=status.HTTP_403_FORBIDDEN,
            context=context,
            details=details
        )


class TicketValidationError(V2APIError):
    """Ticket validation error."""
    
    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        validation_errors: Optional[List[Dict[str, Any]]] = None,
        context: Optional[V2ErrorContext] = None
    ):
        details = {}
        if field:
            details["field"] = field
        if validation_errors:
            details["validation_errors"] = validation_errors

        # Get localized messages
        localized_message = error_translator.get_localized_error(
            "TICKET_VALIDATION_ERROR", field=field or "unknown"
        )
            
        super().__init__(
            message=message,
            error_code=V2ErrorCode.TICKET_INVALID_CATEGORY,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            context=context,
            details=details,
            localized_message=localized_message
        )


# Authentication/Authorization errors
class V2UnauthorizedError(V2APIError):
    """V2-specific unauthorized error."""

    def __init__(
        self,
        message: str = "Authentication required",
        token_type: Optional[str] = None,
        context: Optional[V2ErrorContext] = None
    ):
        details = {}
        if token_type:
            details["token_type"] = token_type

        super().__init__(
            message=message,
            error_code=V2ErrorCode.INVALID_TOKEN,
            status_code=status.HTTP_401_UNAUTHORIZED,
            context=context,
            details=details
        )


class V2ForbiddenError(V2APIError):
    """V2-specific forbidden error."""

    def __init__(
        self,
        message: str = "Insufficient permissions",
        required_role: Optional[str] = None,
        user_role: Optional[str] = None,
        context: Optional[V2ErrorContext] = None
    ):
        details = {}
        if required_role:
            details["required_role"] = required_role
        if user_role:
            details["user_role"] = user_role

        super().__init__(
            message=message,
            error_code=V2ErrorCode.INSUFFICIENT_ROLE,
            status_code=status.HTTP_403_FORBIDDEN,
            context=context,
            details=details
        )


# External service errors
class SupabaseError(V2APIError):
    """Supabase-specific error."""

    def __init__(
        self,
        message: str,
        operation: str,
        original_error: Optional[Exception] = None,
        context: Optional[V2ErrorContext] = None
    ):
        details = {
            "operation": operation,
            "service": "supabase"
        }
        if original_error:
            details["original_error"] = str(original_error)

        super().__init__(
            message=message,
            error_code=V2ErrorCode.SUPABASE_ERROR,
            status_code=status.HTTP_502_BAD_GATEWAY,
            context=context,
            details=details
        )


class ExternalServiceError(V2APIError):
    """External service error."""

    def __init__(
        self,
        message: str,
        service_name: str,
        operation: str,
        original_error: Optional[Exception] = None,
        context: Optional[V2ErrorContext] = None
    ):
        details = {
            "service": service_name,
            "operation": operation
        }
        if original_error:
            details["original_error"] = str(original_error)

        super().__init__(
            message=message,
            error_code=V2ErrorCode.EXTERNAL_API_ERROR,
            status_code=status.HTTP_502_BAD_GATEWAY,
            context=context,
            details=details
        )


# Rate limiting errors
class RateLimitError(V2APIError):
    """Rate limit exceeded error."""

    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after: int = 60,
        limit_type: Optional[str] = None,
        context: Optional[V2ErrorContext] = None
    ):
        details = {}
        if limit_type:
            details["limit_type"] = limit_type

        super().__init__(
            message=message,
            error_code=V2ErrorCode.RATE_LIMIT_EXCEEDED,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            context=context,
            details=details,
            retry_after=retry_after
        )


# Global error handlers
async def v2_error_handler(request: Request, exc: V2APIError) -> JSONResponse:
    """Handle V2 API errors."""
    return exc.to_json_response(request)


async def v2_validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle Pydantic validation errors for v2 APIs."""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(x) for x in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
            "input": error.get("input")
        })

    response_data = {
        "error": {
            "code": V2ErrorCode.VALIDATION_ERROR.value,
            "message": "Request validation failed",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "path": str(request.url.path),
            "method": request.method,
            "details": {
                "validation_errors": errors
            }
        }
    }

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=response_data
    )


async def v2_http_exception_handler(
    request: Request, exc: HTTPException
) -> JSONResponse:
    """Handle FastAPI HTTP exceptions for v2 APIs."""
    response_data = {
        "error": {
            "code": "HTTP_ERROR",
            "message": exc.detail,
            # Expose a `detail` field for compatibility with FastAPI's default
            # HTTPException schema and existing tests/clients.
            "detail": exc.detail,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "path": str(request.url.path),
            "method": request.method,
            "status_code": exc.status_code,
        }
    }

    return JSONResponse(
        status_code=exc.status_code,
        content=response_data
    )


async def v2_general_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Handle unexpected errors for v2 APIs."""
    # Log the full exception for debugging
    logger.exception(f"Unexpected error in v2 API: {str(exc)}")

    response_data = {
        "error": {
            "code": V2ErrorCode.INTERNAL_ERROR.value,
            "message": "An unexpected error occurred",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "path": str(request.url.path),
            "method": request.method,
            "request_id": getattr(request.state, 'request_id', None)
        }
    }

    # Only include error details in development
    if logger.level <= logging.DEBUG:
        response_data["error"]["details"] = {
            "type": type(exc).__name__,
            "traceback": traceback.format_exc()
        }

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=response_data
    )


# Utility functions for error handling
def handle_supabase_error(
    error: Exception, operation: str, context: Optional[V2ErrorContext] = None
) -> V2APIError:
    """Convert Supabase errors to V2 API errors."""
    error_msg = str(error).lower()

    if ("duplicate key" in error_msg or
            "unique constraint" in error_msg):
        return QuoteValidationError(
            message="Resource already exists",
            validation_errors=[{
                "type": "duplicate",
                "message": "A resource with this identifier already exists"
            }],
            context=context
        )
    elif "foreign key" in error_msg or "referential integrity" in error_msg:
        return QuoteValidationError(
            message="Referenced resource not found",
            validation_errors=[{
                "type": "foreign_key",
                "message": "Referenced resource does not exist"
            }],
            context=context
        )
    elif "not null" in error_msg:
        return QuoteValidationError(
            message="Required field missing",
            validation_errors=[{
                "type": "not_null",
                "message": "Required field cannot be null"
            }],
            context=context
        )
    elif ("permission denied" in error_msg or
          "rls" in error_msg or
          "row level security" in error_msg):
        return V2ForbiddenError(
            message="Access denied",
            context=context
        )
    elif "connection" in error_msg or "timeout" in error_msg:
        return SupabaseError(
            message="Database connection error",
            operation=operation,
            original_error=error,
            context=context
        )
    else:
        return SupabaseError(
            message="Database operation failed",
            operation=operation,
            original_error=error,
            context=context
        )


def create_error_context(
    request: Optional[Request] = None,
    user_id: Optional[str] = None,
    user_role: Optional[str] = None,
    operation: Optional[str] = None,
    resource_id: Optional[str] = None,
    **kwargs
) -> V2ErrorContext:
    """Create error context from request and additional parameters."""
    context = V2ErrorContext(
        user_id=user_id,
        user_role=user_role,
        operation=operation,
        resource_id=resource_id,
        **kwargs
    )

    if request:
        context.endpoint = str(request.url.path)
        context.method = request.method
        context.request_id = getattr(request.state, 'request_id', None)
        context.correlation_id = request.headers.get('X-Correlation-ID')

    return context


# Common error responses for OpenAPI documentation
COMMON_ERROR_RESPONSES = {
    400: {"description": "Bad Request"},
    401: {"description": "Unauthorized"},
    403: {"description": "Forbidden"},
    404: {"description": "Not Found"},
    409: {"description": "Conflict"},
    422: {"description": "Validation Error"},
    429: {"description": "Rate Limit Exceeded"},
    500: {"description": "Internal Server Error"},
    502: {"description": "Bad Gateway"}
}
