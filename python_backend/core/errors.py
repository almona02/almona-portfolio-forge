"""
Unified error handling framework with proper HTTP status mapping and structured logging.
"""
import logging
from typing import Any, Dict, Optional, Union
from enum import Enum
from dataclasses import dataclass

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


class ErrorCode(Enum):
    """Standardized error codes."""
    # Validation errors (4xx)
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_INPUT = "INVALID_INPUT"
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD"
    INVALID_FORMAT = "INVALID_FORMAT"
    
    # Authentication/Authorization errors (4xx)
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    
    # Resource errors (4xx)
    NOT_FOUND = "NOT_FOUND"
    RESOURCE_CONFLICT = "RESOURCE_CONFLICT"
    DUPLICATE_RESOURCE = "DUPLICATE_RESOURCE"
    
    # Business logic errors (4xx)
    BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    OPERATION_NOT_ALLOWED = "OPERATION_NOT_ALLOWED"
    
    # Server errors (5xx)
    INTERNAL_ERROR = "INTERNAL_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"


@dataclass
class ErrorContext:
    """Additional context for error reporting."""
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    operation: Optional[str] = None
    resource_id: Optional[str] = None
    additional_data: Optional[Dict[str, Any]] = None


class DomainError(Exception):
    """Base class for all domain-specific errors."""
    
    def __init__(
        self,
        message: str,
        error_code: ErrorCode,
        status_code: int,
        context: Optional[ErrorContext] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.context = context or ErrorContext()
        self.details = details or {}
        super().__init__(message)
        
        # Log the error with context
        self._log_error()
    
    def _log_error(self):
        """Log error with structured context."""
        log_data = {
            "error_code": self.error_code.value,
            "error_message": self.message,
            "status_code": self.status_code,
            "user_id": self.context.user_id,
            "request_id": self.context.request_id,
            "operation": self.context.operation,
            "resource_id": self.context.resource_id,
            "details": self.details
        }
        
        if self.status_code >= 500:
            logger.error("Server error occurred", extra=log_data)
        else:
            logger.warning("Client error occurred", extra=log_data)
    
    def to_http_exception(self) -> HTTPException:
        """Convert to FastAPI HTTPException."""
        return HTTPException(
            status_code=self.status_code,
            detail={
                "error_code": self.error_code.value,
                "message": self.message,
                "details": self.details
            }
        )


class ValidationError(DomainError):
    """Validation-related errors."""
    
    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        context: Optional[ErrorContext] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        if field:
            error_details["field"] = field
            
        super().__init__(
            message=message,
            error_code=ErrorCode.VALIDATION_ERROR,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            context=context,
            details=error_details
        )


class NotFoundError(DomainError):
    """Resource not found errors."""
    
    def __init__(
        self,
        resource_type: str,
        resource_id: Union[str, int],
        context: Optional[ErrorContext] = None
    ):
        message = f"{resource_type} with id '{resource_id}' not found"
        super().__init__(
            message=message,
            error_code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
            context=context,
            details={"resource_type": resource_type, "resource_id": str(resource_id)}
        )


class UnauthorizedError(DomainError):
    """Authentication errors."""
    
    def __init__(
        self,
        message: str = "Authentication required",
        context: Optional[ErrorContext] = None
    ):
        super().__init__(
            message=message,
            error_code=ErrorCode.UNAUTHORIZED,
            status_code=status.HTTP_401_UNAUTHORIZED,
            context=context
        )


class ForbiddenError(DomainError):
    """Authorization errors."""
    
    def __init__(
        self,
        message: str = "Insufficient permissions",
        context: Optional[ErrorContext] = None
    ):
        super().__init__(
            message=message,
            error_code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
            context=context
        )


class DatabaseError(DomainError):
    """Database operation errors."""
    
    def __init__(
        self,
        message: str,
        operation: str,
        context: Optional[ErrorContext] = None,
        original_error: Optional[Exception] = None
    ):
        details = {"operation": operation}
        if original_error:
            details["original_error"] = str(original_error)
            
        super().__init__(
            message=message,
            error_code=ErrorCode.DATABASE_ERROR,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            context=context,
            details=details
        )


class BusinessRuleViolationError(DomainError):
    """Business logic violation errors."""
    
    def __init__(
        self,
        message: str,
        rule: str,
        context: Optional[ErrorContext] = None
    ):
        super().__init__(
            message=message,
            error_code=ErrorCode.BUSINESS_RULE_VIOLATION,
            status_code=status.HTTP_400_BAD_REQUEST,
            context=context,
            details={"rule": rule}
        )


def handle_domain_error(error: DomainError) -> HTTPException:
    """Convert domain error to HTTP exception."""
    return error.to_http_exception()


def handle_generic_error(error: Exception, context: Optional[ErrorContext] = None) -> HTTPException:
    """Handle unexpected errors."""
    domain_error = DatabaseError(
        message="An unexpected error occurred",
        operation="unknown",
        context=context,
        original_error=error
    )
    return domain_error.to_http_exception()
