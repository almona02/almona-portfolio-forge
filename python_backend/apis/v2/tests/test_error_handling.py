"""
Test suite for v2 error handling framework.
"""
import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from fastapi.exceptions import RequestValidationError
from unittest.mock import Mock

from apis.v2.core.errors import (
    V2APIError,
    QuoteNotFoundError,
    QuoteValidationError,
    TicketNotFoundError,
    V2ForbiddenError,
    SupabaseError,
    RateLimitError,
    v2_error_handler,
    v2_validation_error_handler,
    v2_http_exception_handler,
    v2_general_exception_handler,
    handle_supabase_error,
    create_error_context,
    V2ErrorContext
)


@pytest.fixture
def test_app():
    """Create a test FastAPI app with error handlers."""
    app = FastAPI()
    
    # Add error handlers
    app.add_exception_handler(V2APIError, v2_error_handler)
    app.add_exception_handler(RequestValidationError, v2_validation_error_handler)
    app.add_exception_handler(RuntimeError, v2_general_exception_handler)
    
    @app.get("/test/quote-not-found")
    async def test_quote_not_found():
        raise QuoteNotFoundError("test-quote-123")
    
    @app.get("/test/quote-validation")
    async def test_quote_validation():
        raise QuoteValidationError(
            "Invalid quote data",
            field="contact_email",
            validation_errors=[{
                "field": "contact_email",
                "message": "Invalid email format",
                "type": "value_error.email"
            }]
        )
    
    @app.get("/test/ticket-not-found")
    async def test_ticket_not_found():
        raise TicketNotFoundError("test-ticket-456")
    
    @app.get("/test/forbidden")
    async def test_forbidden():
        raise V2ForbiddenError(
            "Insufficient permissions",
            required_role="admin",
            user_role="user"
        )
    
    @app.get("/test/supabase-error")
    async def test_supabase_error():
        raise SupabaseError(
            "Database connection failed",
            operation="test_query",
            original_error=Exception("Connection timeout")
        )
    
    @app.get("/test/rate-limit")
    async def test_rate_limit():
        raise RateLimitError(
            "Rate limit exceeded",
            retry_after=60,
            limit_type="per_minute"
        )
    
    @app.get("/test/general-error")
    async def test_general_error():
        raise RuntimeError("Unexpected error")
    
    return app


@pytest.fixture
def client(test_app):
    """Create test client."""
    return TestClient(test_app)


class TestV2ErrorHandling:
    """Test v2 error handling framework."""
    
    def test_quote_not_found_error(self, client):
        """Test quote not found error response."""
        response = client.get("/test/quote-not-found")
        
        assert response.status_code == 404
        data = response.json()
        
        assert "error" in data
        assert data["error"]["code"] == "QUOTE_NOT_FOUND"
        assert data["error"]["message"] == "Quote with ID 'test-quote-123' not found"
        assert data["error"]["details"]["quote_id"] == "test-quote-123"
        assert data["error"]["details"]["resource_type"] == "quote"
        assert "timestamp" in data["error"]
        assert "path" in data["error"]
    
    def test_quote_validation_error(self, client):
        """Test quote validation error response."""
        response = client.get("/test/quote-validation")
        
        assert response.status_code == 422
        data = response.json()
        
        assert "error" in data
        assert data["error"]["code"] == "QUOTE_ITEM_VALIDATION_FAILED"
        assert data["error"]["message"] == "Invalid quote data"
        assert data["error"]["details"]["field"] == "contact_email"
        assert "validation_errors" in data["error"]["details"]
        assert len(data["error"]["details"]["validation_errors"]) == 1
    
    def test_ticket_not_found_error(self, client):
        """Test ticket not found error response."""
        response = client.get("/test/ticket-not-found")
        
        assert response.status_code == 404
        data = response.json()
        
        assert "error" in data
        assert data["error"]["code"] == "TICKET_NOT_FOUND"
        assert data["error"]["message"] == "Ticket with ID 'test-ticket-456' not found"
        assert data["error"]["details"]["ticket_id"] == "test-ticket-456"
        assert data["error"]["details"]["resource_type"] == "ticket"
    
    def test_forbidden_error(self, client):
        """Test forbidden error response."""
        response = client.get("/test/forbidden")
        
        assert response.status_code == 403
        data = response.json()
        
        assert "error" in data
        assert data["error"]["code"] == "INSUFFICIENT_ROLE"
        assert data["error"]["message"] == "Insufficient permissions"
        assert data["error"]["details"]["required_role"] == "admin"
        assert data["error"]["details"]["user_role"] == "user"
    
    def test_supabase_error(self, client):
        """Test Supabase error response."""
        response = client.get("/test/supabase-error")
        
        assert response.status_code == 502
        data = response.json()
        
        assert "error" in data
        assert data["error"]["code"] == "SUPABASE_ERROR"
        assert data["error"]["message"] == "Database connection failed"
        assert data["error"]["details"]["operation"] == "test_query"
        assert data["error"]["details"]["service"] == "supabase"
        assert "original_error" in data["error"]["details"]
    
    def test_rate_limit_error(self, client):
        """Test rate limit error response."""
        response = client.get("/test/rate-limit")
        
        assert response.status_code == 429
        data = response.json()
        
        assert "error" in data
        assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
        assert data["error"]["message"] == "Rate limit exceeded"
        assert data["error"]["retry_after"] == 60
        assert data["error"]["details"]["limit_type"] == "per_minute"
        
        # Check Retry-After header
        assert response.headers["Retry-After"] == "60"
    
    def test_general_error(self, client):
        """Test general error response."""
        response = client.get("/test/general-error")
        
        assert response.status_code == 500
        data = response.json()
        
        assert "error" in data
        assert data["error"]["code"] == "INTERNAL_ERROR"
        assert data["error"]["message"] == "An unexpected error occurred"
        assert "timestamp" in data["error"]
        assert "path" in data["error"]


class TestErrorContext:
    """Test error context creation."""
    
    def test_create_error_context_basic(self):
        """Test basic error context creation."""
        context = create_error_context(
            user_id="user-123",
            operation="test_operation",
            resource_id="resource-456"
        )
        
        assert isinstance(context, V2ErrorContext)
        assert context.user_id == "user-123"
        assert context.operation == "test_operation"
        assert context.resource_id == "resource-456"
    
    def test_create_error_context_with_request(self):
        """Test error context creation with request."""
        mock_request = Mock()
        mock_request.url.path = "/api/v2/test"
        mock_request.method = "GET"
        mock_request.state.request_id = "req-789"
        mock_request.headers = {"X-Correlation-ID": "corr-123"}
        
        context = create_error_context(
            request=mock_request,
            user_id="user-123",
            operation="test_operation"
        )
        
        assert context.endpoint == "/api/v2/test"
        assert context.method == "GET"
        assert context.request_id == "req-789"
        assert context.correlation_id == "corr-123"
        assert context.user_id == "user-123"
        assert context.operation == "test_operation"


class TestSupabaseErrorHandling:
    """Test Supabase error handling utilities."""
    
    def test_handle_duplicate_key_error(self):
        """Test handling duplicate key errors."""
        error = Exception("duplicate key value violates unique constraint")
        result = handle_supabase_error(error, "test_operation")
        
        assert isinstance(result, QuoteValidationError)
        assert result.status_code == 422
        assert "already exists" in result.message
    
    def test_handle_foreign_key_error(self):
        """Test handling foreign key errors."""
        error = Exception("foreign key constraint fails")
        result = handle_supabase_error(error, "test_operation")
        
        assert isinstance(result, QuoteValidationError)
        assert result.status_code == 422
        assert "Referenced resource not found" in result.message
    
    def test_handle_permission_denied_error(self):
        """Test handling permission denied errors."""
        error = Exception("permission denied for table")
        result = handle_supabase_error(error, "test_operation")
        
        assert isinstance(result, V2ForbiddenError)
        assert result.status_code == 403
        assert "Access denied" in result.message
    
    def test_handle_connection_error(self):
        """Test handling connection errors."""
        error = Exception("connection timeout")
        result = handle_supabase_error(error, "test_operation")
        
        assert isinstance(result, SupabaseError)
        assert result.status_code == 502
        assert "connection error" in result.message
    
    def test_handle_generic_error(self):
        """Test handling generic errors."""
        error = Exception("some random error")
        result = handle_supabase_error(error, "test_operation")
        
        assert isinstance(result, SupabaseError)
        assert result.status_code == 502
        assert "Database operation failed" in result.message


if __name__ == "__main__":
    pytest.main([__file__])
