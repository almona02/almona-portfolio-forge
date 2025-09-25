"""
Custom exceptions for Almona Industrial API client
"""

from typing import Optional, Dict, Any


class AlmonaAPIError(Exception):
    """Base exception for Almona API errors."""
    
    def __init__(
        self,
        message: str,
        code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
        status_code: Optional[int] = None
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details
        self.context = context
        self.status_code = status_code

    def __str__(self) -> str:
        error_str = f"AlmonaAPIError: {self.message}"
        if self.code:
            error_str += f" (code: {self.code})"
        if self.status_code:
            error_str += f" (status: {self.status_code})"
        return error_str

    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary."""
        return {
            "message": self.message,
            "code": self.code,
            "details": self.details,
            "context": self.context,
            "status_code": self.status_code
        }


class AuthenticationError(AlmonaAPIError):
    """Exception raised for authentication errors."""
    
    def __init__(self, message: str = "Authentication failed", **kwargs):
        super().__init__(message, code="AUTHENTICATION_ERROR", **kwargs)


class ValidationError(AlmonaAPIError):
    """Exception raised for validation errors."""
    
    def __init__(self, message: str = "Validation failed", **kwargs):
        super().__init__(message, code="VALIDATION_ERROR", **kwargs)


class RateLimitError(AlmonaAPIError):
    """Exception raised for rate limit errors."""
    
    def __init__(self, message: str = "Rate limit exceeded", **kwargs):
        super().__init__(message, code="RATE_LIMIT_ERROR", **kwargs)


class NotFoundError(AlmonaAPIError):
    """Exception raised for not found errors."""
    
    def __init__(self, message: str = "Resource not found", **kwargs):
        super().__init__(message, code="NOT_FOUND_ERROR", **kwargs)


class ServerError(AlmonaAPIError):
    """Exception raised for server errors."""
    
    def __init__(self, message: str = "Internal server error", **kwargs):
        super().__init__(message, code="SERVER_ERROR", **kwargs)


class NetworkError(AlmonaAPIError):
    """Exception raised for network errors."""
    
    def __init__(self, message: str = "Network error", **kwargs):
        super().__init__(message, code="NETWORK_ERROR", **kwargs)


class TimeoutError(AlmonaAPIError):
    """Exception raised for timeout errors."""
    
    def __init__(self, message: str = "Request timeout", **kwargs):
        super().__init__(message, code="TIMEOUT_ERROR", **kwargs)
