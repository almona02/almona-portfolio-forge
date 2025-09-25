"""
V2 API Core module.

This module provides core functionality for the v2 APIs including
error handling, validation, and common utilities.
"""

from .errors import (
    # Error classes
    V2APIError,
    QuoteNotFoundError,
    QuoteAlreadyExistsError,
    QuoteValidationError,
    TicketNotFoundError,
    TicketPermissionError,
    TicketValidationError,
    V2UnauthorizedError,
    V2ForbiddenError,
    SupabaseError,
    ExternalServiceError,
    RateLimitError,
    
    # Error handlers
    v2_error_handler,
    v2_validation_error_handler,
    v2_http_exception_handler,
    v2_general_exception_handler,
    
    # Utility functions
    handle_supabase_error,
    create_error_context,
    
    # Error codes and context
    V2ErrorCode,
    V2ErrorContext,
    
    # Common responses
    COMMON_ERROR_RESPONSES
)

__all__ = [
    # Error classes
    "V2APIError",
    "QuoteNotFoundError",
    "QuoteAlreadyExistsError", 
    "QuoteValidationError",
    "TicketNotFoundError",
    "TicketPermissionError",
    "TicketValidationError",
    "V2UnauthorizedError",
    "V2ForbiddenError",
    "SupabaseError",
    "ExternalServiceError",
    "RateLimitError",
    
    # Error handlers
    "v2_error_handler",
    "v2_validation_error_handler",
    "v2_http_exception_handler",
    "v2_general_exception_handler",
    
    # Utility functions
    "handle_supabase_error",
    "create_error_context",
    
    # Error codes and context
    "V2ErrorCode",
    "V2ErrorContext",
    
    # Common responses
    "COMMON_ERROR_RESPONSES"
]
