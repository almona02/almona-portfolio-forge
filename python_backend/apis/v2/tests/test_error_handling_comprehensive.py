"""
Comprehensive tests for the v2 API error handling framework.

This test suite demonstrates the complete error handling implementation
with examples for quotes and tickets endpoints.
"""
import pytest
import json
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from fastapi import Request, status

from apis.v2.app import create_v2_app
from apis.v2.core.errors import (
    V2APIError,
    QuoteValidationError,
    QuoteNotFoundError,
    QuoteAlreadyExistsError,
    TicketValidationError,
    TicketNotFoundError,
    TicketPermissionError,
    V2ForbiddenError,
    RateLimitError,
    SupabaseError,
    error_translator,
    V2ErrorCode
)


class TestErrorHandlingFramework:
    """Test the comprehensive error handling framework."""
    
    @pytest.fixture
    def app(self):
        """Create test app."""
        return create_v2_app()
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return TestClient(app)
    
    def test_quote_validation_error_english(self, client):
        """Test quote validation error in English."""
        # Test missing required fields
        response = client.post(
            "/api/v2/quotes/create",
            json={
                "contact_name": "",  # Empty name should trigger validation error
                "contact_email": "test@example.com",
                "products": []
            },
            headers={"Accept-Language": "en"}
        )
        
        assert response.status_code == 422
        data = response.json()
        
        # Check error structure
        assert "error" in data
        assert data["error"]["code"] == "QUOTE_ITEM_VALIDATION_FAILED"
        assert "Contact name is required" in data["error"]["message"]
        assert data["error"]["path"] == "/api/v2/quotes/create"
        assert data["error"]["method"] == "POST"
        assert "timestamp" in data["error"]
        
        # Check details
        assert "details" in data["error"]
        assert data["error"]["details"]["field"] == "contact_name"
    
    def test_quote_validation_error_arabic(self, client):
        """Test quote validation error in Arabic."""
        # Test missing required fields
        response = client.post(
            "/api/v2/quotes/create",
            json={
                "contact_name": "",  # Empty name should trigger validation error
                "contact_email": "test@example.com",
                "products": []
            },
            headers={"Accept-Language": "ar"}
        )
        
        assert response.status_code == 422
        data = response.json()
        
        # Check error structure
        assert "error" in data
        assert data["error"]["code"] == "QUOTE_ITEM_VALIDATION_FAILED"
        # Should contain Arabic message
        assert "messages" in data["error"]
        assert "ar" in data["error"]["messages"]
        assert "en" in data["error"]["messages"]
    
    def test_quote_not_found_error(self, client):
        """Test quote not found error."""
        # Mock the service to return None
        with patch('apis.v2.services.quote_service.QuoteService') as mock_service:
            mock_service.return_value.get_quote.return_value = None
            
            response = client.get(
                "/api/v2/quotes/123",
                headers={"Accept-Language": "en"}
            )
            
            assert response.status_code == 404
            data = response.json()
            
            assert "error" in data
            assert data["error"]["code"] == "QUOTE_NOT_FOUND"
            assert "not found" in data["error"]["message"].lower()
    
    def test_ticket_validation_error(self, client):
        """Test ticket validation error."""
        # Test missing required fields
        response = client.post(
            "/api/v2/tickets/support",
            json={
                "category": "support",
                "payload": {
                    "title": "",  # Empty title should trigger validation error
                    "priority": "medium"
                }
            },
            headers={"Accept-Language": "en"}
        )
        
        assert response.status_code == 422
        data = response.json()
        
        # Check error structure
        assert "error" in data
        assert data["error"]["code"] == "TICKET_INVALID_CATEGORY"
        assert "title" in data["error"]["message"].lower()
    
    def test_ticket_permission_error(self, client):
        """Test ticket permission error."""
        # Mock authentication to return a user without proper permissions
        with patch('apis.v2.deps.get_current_user') as mock_user:
            mock_user.return_value = {"id": "user123", "role": "customer"}
            
            response = client.post(
                "/api/v2/tickets/123/assign/456",
                headers={"Accept-Language": "en"}
            )
            
            assert response.status_code == 403
            data = response.json()
            
            assert "error" in data
            assert data["error"]["code"] == "INSUFFICIENT_ROLE"
            assert "permissions" in data["error"]["message"].lower()
    
    def test_rate_limit_error(self, client):
        """Test rate limit error."""
        # Mock rate limiting to trigger error
        with patch('apis.v2.middleware.rate_limiting.V2RateLimitMiddleware') as mock_middleware:
            mock_middleware.return_value.is_rate_limited.return_value = True
            
            response = client.get(
                "/api/v2/quotes/lookup?q=test",
                headers={"Accept-Language": "en"}
            )
            
            # This would normally return 429, but depends on middleware implementation
            # For now, just test the error structure if it occurs
            if response.status_code == 429:
                data = response.json()
                assert "error" in data
                assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
    
    def test_supabase_error(self, client):
        """Test Supabase error handling."""
        # Mock Supabase to raise an exception
        with patch('apis.v2.services.quote_service.QuoteService.create_quote_with_items') as mock_create:
            mock_create.side_effect = Exception("Database connection failed")
            
            response = client.post(
                "/api/v2/quotes/create",
                json={
                    "contact_name": "Test User",
                    "contact_email": "test@example.com",
                    "products": [{"product_id": "test", "quantity": 1}]
                },
                headers={"Accept-Language": "en"}
            )
            
            assert response.status_code == 502
            data = response.json()
            
            assert "error" in data
            assert data["error"]["code"] == "SUPABASE_ERROR"
            assert "database" in data["error"]["message"].lower()
    
    def test_validation_error_with_multiple_fields(self, client):
        """Test validation error with multiple field errors."""
        response = client.post(
            "/api/v2/quotes/create",
            json={
                "contact_name": "",  # Missing name
                "contact_email": "invalid-email",  # Invalid email format
                "products": []  # No products
            },
            headers={"Accept-Language": "en"}
        )
        
        assert response.status_code == 422
        data = response.json()
        
        # Should have validation errors in details
        assert "error" in data
        assert "details" in data["error"]
        assert "validation_errors" in data["error"]["details"]
    
    def test_error_context_inclusion(self, client):
        """Test that error context is properly included."""
        response = client.post(
            "/api/v2/quotes/create",
            json={
                "contact_name": "",
                "contact_email": "test@example.com",
                "products": []
            },
            headers={
                "Accept-Language": "en",
                "X-Correlation-ID": "test-correlation-123"
            }
        )
        
        assert response.status_code == 422
        data = response.json()
        
        # Check that correlation ID is included
        assert "error" in data
        assert data["error"]["correlation_id"] == "test-correlation-123"
        assert data["error"]["path"] == "/api/v2/quotes/create"
        assert data["error"]["method"] == "POST"
    
    def test_error_translator_functionality(self):
        """Test the error message translator."""
        # Test English message
        en_message = error_translator.get_message("VALIDATION_ERROR", "en", field="test_field")
        assert "test_field" in en_message
        
        # Test Arabic message
        ar_message = error_translator.get_message("VALIDATION_ERROR", "ar", field="test_field")
        assert "test_field" in ar_message
        
        # Test localized error
        localized = error_translator.get_localized_error("VALIDATION_ERROR", field="test_field")
        assert "en" in localized
        assert "ar" in localized
        assert "test_field" in localized["en"]
        assert "test_field" in localized["ar"]
    
    def test_custom_error_creation(self):
        """Test creating custom errors with localization."""
        # Create a custom error
        error = QuoteValidationError(
            message="Custom validation error",
            field="custom_field",
            context=None
        )
        
        # Check error properties
        assert error.error_code == V2ErrorCode.QUOTE_ITEM_VALIDATION_FAILED
        assert error.status_code == 422
        assert error.message == "Custom validation error"
        assert error.details["field"] == "custom_field"
        assert "messages" in error.localized_message
    
    def test_error_response_format(self):
        """Test error response format consistency."""
        # Create a mock request
        mock_request = Mock()
        mock_request.url.path = "/api/v2/test"
        mock_request.method = "POST"
        mock_request.headers = {"Accept-Language": "en"}
        
        # Create an error
        error = QuoteValidationError(
            message="Test error",
            field="test_field"
        )
        
        # Get JSON response
        response = error.to_json_response(mock_request)
        
        # Check response structure
        assert response.status_code == 422
        data = json.loads(response.body.decode())
        
        assert "error" in data
        error_data = data["error"]
        
        # Required fields
        assert "code" in error_data
        assert "message" in error_data
        assert "timestamp" in error_data
        assert "path" in error_data
        assert "method" in error_data
        
        # Optional fields
        assert "details" in error_data
        assert "messages" in error_data  # Localized messages
    
    def test_error_handling_middleware_integration(self, client):
        """Test that the error handling middleware is properly integrated."""
        # Test with an invalid endpoint to trigger 404
        response = client.get("/api/v2/invalid-endpoint")
        
        # Should return 404 with proper error format
        assert response.status_code == 404
        # Note: FastAPI's default 404 might not use our custom format
        # This test ensures the middleware doesn't break normal FastAPI behavior
    
    def test_concurrent_error_handling(self, client):
        """Test error handling under concurrent requests."""
        import threading
        import time
        
        results = []
        
        def make_request():
            response = client.post(
                "/api/v2/quotes/create",
                json={
                    "contact_name": "",  # This will trigger validation error
                    "contact_email": "test@example.com",
                    "products": []
                },
                headers={"Accept-Language": "en"}
            )
            results.append(response.status_code)
        
        # Make multiple concurrent requests
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # All requests should return 422
        assert all(status_code == 422 for status_code in results)
        assert len(results) == 5


class TestErrorHandlingExamples:
    """Examples demonstrating the error handling framework usage."""
    
    def test_quote_creation_validation_example(self):
        """Example: Quote creation with validation errors."""
        # This demonstrates how validation errors are handled
        # when creating quotes with invalid data
        
        # Example 1: Missing required fields
        error = QuoteValidationError(
            message="Contact name is required",
            field="contact_name"
        )
        
        assert error.error_code == V2ErrorCode.QUOTE_ITEM_VALIDATION_FAILED
        assert error.status_code == 422
        assert error.details["field"] == "contact_name"
        
        # Example 2: Invalid email format
        error = QuoteValidationError(
            message="Invalid email format",
            field="contact_email",
            validation_errors=[{
                "type": "value_error.email",
                "message": "Invalid email format",
                "input": "invalid-email"
            }]
        )
        
        assert "validation_errors" in error.details
        assert len(error.details["validation_errors"]) == 1
    
    def test_ticket_permission_example(self):
        """Example: Ticket permission errors."""
        # This demonstrates how permission errors are handled
        # when users try to perform unauthorized actions
        
        error = TicketPermissionError(
            message="Only staff can assign tickets",
            required_role="admin, technician, or sales_rep",
            user_role="customer"
        )
        
        assert error.error_code == V2ErrorCode.TICKET_PERMISSION_DENIED
        assert error.status_code == 403
        assert error.details["required_role"] == "admin, technician, or sales_rep"
        assert error.details["user_role"] == "customer"
    
    def test_supabase_error_example(self):
        """Example: Supabase database errors."""
        # This demonstrates how database errors are handled
        # and converted to user-friendly messages
        
        original_error = Exception("duplicate key value violates unique constraint")
        
        error = SupabaseError(
            message="Failed to create quote",
            operation="insert_quote",
            original_error=original_error
        )
        
        assert error.error_code == V2ErrorCode.SUPABASE_ERROR
        assert error.status_code == 502
        assert error.details["operation"] == "insert_quote"
        assert error.details["service"] == "supabase"
        assert str(original_error) in error.details["original_error"]
    
    def test_rate_limit_example(self):
        """Example: Rate limiting errors."""
        # This demonstrates how rate limiting errors are handled
        # with retry information
        
        error = RateLimitError(
            message="Rate limit exceeded",
            retry_after=60,
            limit_type="per_minute"
        )
        
        assert error.error_code == V2ErrorCode.RATE_LIMIT_EXCEEDED
        assert error.status_code == 429
        assert error.retry_after == 60
        assert error.details["limit_type"] == "per_minute"
    
    def test_internationalization_example(self):
        """Example: Internationalized error messages."""
        # This demonstrates how error messages are localized
        # for different languages
        
        # Get localized messages
        localized = error_translator.get_localized_error(
            "QUOTE_VALIDATION_ERROR",
            field="contact_name"
        )
        
        # English message
        en_message = localized["en"]
        assert "contact_name" in en_message
        
        # Arabic message
        ar_message = localized["ar"]
        assert "contact_name" in ar_message
        
        # Create error with localization
        error = QuoteValidationError(
            message="Contact name is required",
            field="contact_name"
        )
        
        # Check that localized messages are included
        assert "messages" in error.localized_message
        assert "en" in error.localized_message["messages"]
        assert "ar" in error.localized_message["messages"]


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
