"""
Demonstration script for the comprehensive v2 API error handling framework.

This script shows how the error handling framework works with examples
for quotes and tickets endpoints, including Arabic/English support.
"""
import asyncio
import json
from typing import Dict, Any
from fastapi import Request
from fastapi.testclient import TestClient

from apis.v2.app import create_v2_app
from apis.v2.core.errors import (
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
    create_error_context
)


class ErrorHandlingDemo:
    """Demonstration of the error handling framework."""
    
    def __init__(self):
        self.app = create_v2_app()
        self.client = TestClient(self.app)
    
    def demo_quote_validation_errors(self):
        """Demonstrate quote validation errors."""
        print("=" * 60)
        print("QUOTE VALIDATION ERRORS DEMO")
        print("=" * 60)
        
        # Example 1: Missing required fields
        print("\n1. Missing required fields:")
        response = self.client.post(
            "/api/v2/quotes/create",
            json={
                "contact_name": "",  # Empty name
                "contact_email": "test@example.com",
                "products": []
            },
            headers={"Accept-Language": "en"}
        )
        
        print(f"Status Code: {response.status_code}")
        print("Response:")
        print(json.dumps(response.json(), indent=2))
        
        # Example 2: No products or services
        print("\n2. No products or services specified:")
        response = self.client.post(
            "/api/v2/quotes/create",
            json={
                "contact_name": "Test User",
                "contact_email": "test@example.com",
                "products": [],
                "services": []
            },
            headers={"Accept-Language": "en"}
        )
        
        print(f"Status Code: {response.status_code}")
        print("Response:")
        print(json.dumps(response.json(), indent=2))
        
        # Example 3: Arabic language support
        print("\n3. Arabic language support:")
        response = self.client.post(
            "/api/v2/quotes/create",
            json={
                "contact_name": "",
                "contact_email": "test@example.com",
                "products": []
            },
            headers={"Accept-Language": "ar"}
        )
        
        print(f"Status Code: {response.status_code}")
        print("Response:")
        print(json.dumps(response.json(), indent=2))
    
    def demo_ticket_validation_errors(self):
        """Demonstrate ticket validation errors."""
        print("\n" + "=" * 60)
        print("TICKET VALIDATION ERRORS DEMO")
        print("=" * 60)
        
        # Example 1: Missing title
        print("\n1. Missing ticket title:")
        response = self.client.post(
            "/api/v2/tickets/support",
            json={
                "category": "support",
                "payload": {
                    "title": "",  # Empty title
                    "priority": "medium"
                }
            },
            headers={"Accept-Language": "en"}
        )
        
        print(f"Status Code: {response.status_code}")
        print("Response:")
        print(json.dumps(response.json(), indent=2))
        
        # Example 2: Invalid priority
        print("\n2. Invalid priority value:")
        response = self.client.post(
            "/api/v2/tickets/support",
            json={
                "category": "support",
                "payload": {
                    "title": "Test Ticket",
                    "priority": "invalid_priority"
                }
            },
            headers={"Accept-Language": "en"}
        )
        
        print(f"Status Code: {response.status_code}")
        print("Response:")
        print(json.dumps(response.json(), indent=2))
    
    def demo_permission_errors(self):
        """Demonstrate permission errors."""
        print("\n" + "=" * 60)
        print("PERMISSION ERRORS DEMO")
        print("=" * 60)
        
        # Example 1: Unauthorized ticket assignment
        print("\n1. Unauthorized ticket assignment:")
        response = self.client.post(
            "/api/v2/tickets/123/assign/456",
            headers={"Accept-Language": "en"}
        )
        
        print(f"Status Code: {response.status_code}")
        print("Response:")
        print(json.dumps(response.json(), indent=2))
        
        # Example 2: Arabic permission error
        print("\n2. Arabic permission error:")
        response = self.client.post(
            "/api/v2/tickets/123/assign/456",
            headers={"Accept-Language": "ar"}
        )
        
        print(f"Status Code: {response.status_code}")
        print("Response:")
        print(json.dumps(response.json(), indent=2))
    
    def demo_not_found_errors(self):
        """Demonstrate not found errors."""
        print("\n" + "=" * 60)
        print("NOT FOUND ERRORS DEMO")
        print("=" * 60)
        
        # Example 1: Quote not found
        print("\n1. Quote not found:")
        response = self.client.get(
            "/api/v2/quotes/nonexistent-id",
            headers={"Accept-Language": "en"}
        )
        
        print(f"Status Code: {response.status_code}")
        print("Response:")
        print(json.dumps(response.json(), indent=2))
        
        # Example 2: Ticket not found
        print("\n2. Ticket not found:")
        response = self.client.get(
            "/api/v2/tickets/nonexistent-id",
            headers={"Accept-Language": "en"}
        )
        
        print(f"Status Code: {response.status_code}")
        print("Response:")
        print(json.dumps(response.json(), indent=2))
    
    def demo_custom_error_creation(self):
        """Demonstrate creating custom errors programmatically."""
        print("\n" + "=" * 60)
        print("CUSTOM ERROR CREATION DEMO")
        print("=" * 60)
        
        # Example 1: Quote validation error
        print("\n1. Creating QuoteValidationError:")
        error = QuoteValidationError(
            message="Custom validation error",
            field="custom_field",
            validation_errors=[{
                "type": "custom_error",
                "message": "This is a custom validation error",
                "input": "invalid_value"
            }]
        )
        
        print(f"Error Code: {error.error_code.value}")
        print(f"Status Code: {error.status_code}")
        print(f"Message: {error.message}")
        print(f"Details: {error.details}")
        print(f"Localized Messages: {error.localized_message}")
        
        # Example 2: Ticket permission error
        print("\n2. Creating TicketPermissionError:")
        error = TicketPermissionError(
            message="Custom permission error",
            required_role="admin",
            user_role="customer"
        )
        
        print(f"Error Code: {error.error_code.value}")
        print(f"Status Code: {error.status_code}")
        print(f"Message: {error.message}")
        print(f"Details: {error.details}")
        
        # Example 3: Supabase error
        print("\n3. Creating SupabaseError:")
        original_error = Exception("Database connection failed")
        error = SupabaseError(
            message="Database operation failed",
            operation="insert_quote",
            original_error=original_error
        )
        
        print(f"Error Code: {error.error_code.value}")
        print(f"Status Code: {error.status_code}")
        print(f"Message: {error.message}")
        print(f"Details: {error.details}")
    
    def demo_error_translator(self):
        """Demonstrate the error message translator."""
        print("\n" + "=" * 60)
        print("ERROR TRANSLATOR DEMO")
        print("=" * 60)
        
        # Example 1: Get English message
        print("\n1. English error message:")
        en_message = error_translator.get_message(
            "QUOTE_VALIDATION_ERROR",
            language="en",
            field="contact_name"
        )
        print(f"English: {en_message}")
        
        # Example 2: Get Arabic message
        print("\n2. Arabic error message:")
        ar_message = error_translator.get_message(
            "QUOTE_VALIDATION_ERROR",
            language="ar",
            field="contact_name"
        )
        print(f"Arabic: {ar_message}")
        
        # Example 3: Get localized error
        print("\n3. Localized error messages:")
        localized = error_translator.get_localized_error(
            "TICKET_VALIDATION_ERROR",
            field="title"
        )
        print(f"English: {localized['en']}")
        print(f"Arabic: {localized['ar']}")
    
    def demo_error_context(self):
        """Demonstrate error context creation."""
        print("\n" + "=" * 60)
        print("ERROR CONTEXT DEMO")
        print("=" * 60)
        
        # Example 1: Create context from request
        print("\n1. Creating error context:")
        mock_request = Request(
            scope={
                "type": "http",
                "method": "POST",
                "path": "/api/v2/quotes/create",
                "headers": [
                    (b"accept-language", b"en"),
                    (b"x-correlation-id", b"test-correlation-123")
                ]
            }
        )
        
        context = create_error_context(
            request=mock_request,
            user_id="user123",
            user_role="customer",
            operation="create_quote",
            resource_id="quote456",
            additional_data={"test": "value"}
        )
        
        print(f"User ID: {context.user_id}")
        print(f"User Role: {context.user_role}")
        print(f"Operation: {context.operation}")
        print(f"Resource ID: {context.resource_id}")
        print(f"Endpoint: {context.endpoint}")
        print(f"Method: {context.method}")
        print(f"Correlation ID: {context.correlation_id}")
        print(f"Additional Data: {context.additional_data}")
    
    def demo_error_response_format(self):
        """Demonstrate error response format."""
        print("\n" + "=" * 60)
        print("ERROR RESPONSE FORMAT DEMO")
        print("=" * 60)
        
        # Example 1: Create error and get JSON response
        print("\n1. Error response format:")
        error = QuoteValidationError(
            message="Test validation error",
            field="test_field"
        )
        
        # Create mock request
        mock_request = Request(
            scope={
                "type": "http",
                "method": "POST",
                "path": "/api/v2/quotes/create",
                "headers": [(b"accept-language", b"en")]
            }
        )
        
        response = error.to_json_response(mock_request)
        
        print(f"Status Code: {response.status_code}")
        print("Response Body:")
        print(json.dumps(response.body.decode(), indent=2))
        
        # Example 2: Error with retry information
        print("\n2. Error with retry information:")
        error = RateLimitError(
            message="Rate limit exceeded",
            retry_after=60,
            limit_type="per_minute"
        )
        
        response = error.to_json_response(mock_request)
        
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {response.headers}")
        print("Response Body:")
        print(json.dumps(response.body.decode(), indent=2))
    
    def run_all_demos(self):
        """Run all demonstrations."""
        print("V2 API ERROR HANDLING FRAMEWORK DEMONSTRATION")
        print("=" * 60)
        
        self.demo_quote_validation_errors()
        self.demo_ticket_validation_errors()
        self.demo_permission_errors()
        self.demo_not_found_errors()
        self.demo_custom_error_creation()
        self.demo_error_translator()
        self.demo_error_context()
        self.demo_error_response_format()
        
        print("\n" + "=" * 60)
        print("DEMONSTRATION COMPLETE")
        print("=" * 60)


def main():
    """Run the error handling demonstration."""
    demo = ErrorHandlingDemo()
    demo.run_all_demos()


if __name__ == "__main__":
    main()
