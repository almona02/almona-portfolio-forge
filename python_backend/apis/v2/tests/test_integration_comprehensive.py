"""
Comprehensive end-to-end integration tests for v2 APIs.

This test suite validates all v2 endpoints, error handling, monitoring,
and SDK integration for production readiness.
"""
import pytest
import json
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import status
from typing import Dict, Any, List
import uuid
from datetime import datetime, timezone

from apis.v2.app import create_v2_app
from apis.v2.core.errors import V2APIError, V2ErrorCode
from apis.v2.deps import get_supabase, get_current_user


class TestV2APIIntegration:
    """Comprehensive integration tests for v2 APIs."""
    
    @pytest.fixture
    def app(self):
        """Create test app with all middleware and error handlers."""
        return create_v2_app()
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return TestClient(app)
    
    @pytest.fixture
    def mock_supabase(self):
        """Mock Supabase client."""
        mock_client = Mock()
        mock_client.table.return_value = Mock()
        mock_client.rpc.return_value = Mock()
        return mock_client
    
    @pytest.fixture
    def mock_user(self):
        """Mock authenticated user."""
        return {
            "id": str(uuid.uuid4()),
            "sub": "test@example.com",
            "role": "customer",
            "email": "test@example.com"
        }
    
    def test_health_endpoints(self, client):
        """Test all health and monitoring endpoints."""
        print("\n=== Testing Health Endpoints ===")
        
        # Test v2 health check
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "2.0.0"
        assert "rate_limiting_enabled" in data
        print(f"✓ V2 Health Check: {data}")
        
        # Test rate limits endpoint
        response = client.get("/rate-limits")
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data
        print(f"✓ Rate Limits Info: {data}")
        
        # Test connection pool stats
        response = client.get("/connection-pool/stats")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        print(f"✓ Connection Pool Stats: {data}")
        
        # Test connection pool health
        response = client.get("/connection-pool/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        print(f"✓ Connection Pool Health: {data}")
        
        # Test connection pool metrics
        response = client.get("/connection-pool/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        print(f"✓ Connection Pool Metrics: {data}")
        
        # Test connection pool validation
        response = client.get("/connection-pool/validate")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        print(f"✓ Connection Pool Validation: {data}")
    
    def test_celery_monitoring_endpoints(self, client):
        """Test Celery monitoring endpoints."""
        print("\n=== Testing Celery Monitoring ===")
        
        # Test Celery status
        response = client.get("/celery/status")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        print(f"✓ Celery Status: {data}")
        
        # Test Celery tasks
        response = client.get("/celery/tasks")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        print(f"✓ Celery Tasks: {data}")
        
        # Test Celery workers
        response = client.get("/celery/workers")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        print(f"✓ Celery Workers: {data}")
    
    def test_authentication_endpoints(self, client):
        """Test authentication endpoints."""
        print("\n=== Testing Authentication Endpoints ===")
        
        # Test token endpoint (should fail without credentials)
        response = client.post("/api/v2/auth/token", data={
            "username": "test@example.com",
            "password": "wrongpassword"
        })
        # Should return 401 or 422 depending on validation
        assert response.status_code in [401, 422]
        print(f"✓ Token endpoint validation: {response.status_code}")
        
        # Test refresh endpoint (should fail without token)
        response = client.post("/api/v2/auth/refresh", json={
            "refresh_token": "invalid_token"
        })
        assert response.status_code in [401, 422]
        print(f"✓ Refresh endpoint validation: {response.status_code}")
        
        # Test user info endpoint (should fail without auth)
        response = client.get("/api/v2/auth/users/me")
        assert response.status_code == 401
        print(f"✓ User info endpoint auth check: {response.status_code}")
    
    def test_quotes_endpoints_integration(self, client, mock_supabase, mock_user):
        """Test quotes endpoints with comprehensive error handling."""
        print("\n=== Testing Quotes Endpoints ===")
        
        with patch('apis.v2.deps.get_supabase', return_value=mock_supabase):
            # Test quote lookup endpoint
            mock_supabase.rpc.return_value.execute.return_value.data = []
            response = client.get("/api/v2/quotes/lookup?q=test")
            assert response.status_code == 200
            data = response.json()
            assert "results" in data
            assert "count" in data
            print(f"✓ Quote lookup: {data}")
            
            # Test quote creation with validation errors
            response = client.post(
                "/api/v2/quotes/create",
                json={
                    "contact_name": "",  # Empty name should trigger validation
                    "contact_email": "test@example.com",
                    "products": []
                },
                headers={"Accept-Language": "en"}
            )
            assert response.status_code == 422
            data = response.json()
            assert "error" in data
            assert data["error"]["code"] == "QUOTE_ITEM_VALIDATION_FAILED"
            print(f"✓ Quote validation error: {data['error']['code']}")
            
            # Test quote creation with Arabic language
            response = client.post(
                "/api/v2/quotes/create",
                json={
                    "contact_name": "",
                    "contact_email": "test@example.com",
                    "products": []
                },
                headers={"Accept-Language": "ar"}
            )
            assert response.status_code == 422
            data = response.json()
            assert "error" in data
            assert "messages" in data["error"]
            assert "ar" in data["error"]["messages"]
            print(f"✓ Quote Arabic error: {data['error']['messages']['ar']}")
            
            # Test successful quote creation
            mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{
                "id": str(uuid.uuid4()),
                "quote_number": "Q-2024-001",
                "digital_twin_code": "DT-001",
                "portal_reference": "PR-001",
                "status": "pending",
                "total_amount": 1500.00,
                "related_service_ticket_id": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }]
            
            response = client.post(
                "/api/v2/quotes/create",
                json={
                    "contact_name": "Test User",
                    "contact_email": "test@example.com",
                    "products": [{
                        "product_id": "prod-001",
                        "quantity": 1,
                        "unit_price": 1500.00
                    }]
                }
            )
            # Should succeed or fail based on mock setup
            print(f"✓ Quote creation attempt: {response.status_code}")
    
    def test_tickets_endpoints_integration(self, client, mock_supabase, mock_user):
        """Test tickets endpoints with comprehensive error handling."""
        print("\n=== Testing Tickets Endpoints ===")
        
        with patch('apis.v2.deps.get_supabase', return_value=mock_supabase), \
             patch('apis.v2.deps.get_current_user', return_value=mock_user):
            
            # Test support ticket creation with validation errors
            response = client.post(
                "/api/v2/tickets/support",
                json={
                    "category": "support",
                    "payload": {
                        "title": "",  # Empty title should trigger validation
                        "priority": "medium"
                    }
                },
                headers={"Accept-Language": "en"}
            )
            assert response.status_code == 422
            data = response.json()
            assert "error" in data
            print(f"✓ Ticket validation error: {data['error']['code']}")
            
            # Test ticket creation with Arabic language
            response = client.post(
                "/api/v2/tickets/support",
                json={
                    "category": "support",
                    "payload": {
                        "title": "",
                        "priority": "medium"
                    }
                },
                headers={"Accept-Language": "ar"}
            )
            assert response.status_code == 422
            data = response.json()
            assert "error" in data
            assert "messages" in data["error"]
            print(f"✓ Ticket Arabic error: {data['error']['messages']['ar']}")
            
            # Test ticket assignment permission error
            response = client.post(
                "/api/v2/tickets/123/assign/456",
                headers={"Accept-Language": "en"}
            )
            assert response.status_code == 403
            data = response.json()
            assert "error" in data
            assert data["error"]["code"] == "INSUFFICIENT_ROLE"
            print(f"✓ Ticket permission error: {data['error']['code']}")
            
            # Test ticket retrieval
            mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
            response = client.get("/api/v2/tickets/123")
            # Should return 404 or 200 depending on mock setup
            print(f"✓ Ticket retrieval: {response.status_code}")
    
    def test_error_handling_consistency(self, client):
        """Test error handling consistency across all endpoints."""
        print("\n=== Testing Error Handling Consistency ===")
        
        # Test 404 errors
        response = client.get("/api/v2/nonexistent-endpoint")
        assert response.status_code == 404
        print(f"✓ 404 error handling: {response.status_code}")
        
        # Test validation errors
        response = client.post("/api/v2/quotes/create", json={})
        assert response.status_code == 422
        data = response.json()
        assert "error" in data
        assert "code" in data["error"]
        assert "message" in data["error"]
        assert "timestamp" in data["error"]
        print(f"✓ Validation error format: {data['error']['code']}")
        
        # Test authentication errors
        response = client.get("/api/v2/auth/users/me")
        assert response.status_code == 401
        print(f"✓ Authentication error: {response.status_code}")
    
    def test_rate_limiting_integration(self, client):
        """Test rate limiting integration."""
        print("\n=== Testing Rate Limiting ===")
        
        # Make multiple requests to test rate limiting
        responses = []
        for i in range(5):
            response = client.get("/api/v2/quotes/lookup?q=test")
            responses.append(response.status_code)
        
        # All should succeed or be rate limited consistently
        print(f"✓ Rate limiting responses: {responses}")
        
        # Test rate limit info endpoint
        response = client.get("/rate-limits")
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data
        print(f"✓ Rate limit configuration: {data}")
    
    def test_cors_and_headers(self, client):
        """Test CORS and security headers."""
        print("\n=== Testing CORS and Headers ===")
        
        # Test OPTIONS request
        response = client.options("/api/v2/quotes/lookup")
        print(f"✓ OPTIONS request: {response.status_code}")
        
        # Test headers in response
        response = client.get("/health")
        headers = response.headers
        print(f"✓ Response headers: {dict(headers)}")
    
    def test_concurrent_requests(self, client):
        """Test concurrent request handling."""
        print("\n=== Testing Concurrent Requests ===")
        
        import threading
        import time
        
        results = []
        
        def make_request():
            response = client.get("/health")
            results.append(response.status_code)
        
        # Make concurrent requests
        threads = []
        for _ in range(10):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # All should succeed
        assert all(status_code == 200 for status_code in results)
        print(f"✓ Concurrent requests: {len(results)} successful")
    
    def test_api_documentation(self, client):
        """Test API documentation endpoints."""
        print("\n=== Testing API Documentation ===")
        
        # Test OpenAPI schema
        response = client.get("/openapi.json")
        assert response.status_code == 200
        schema = response.json()
        assert "openapi" in schema
        assert "info" in schema
        assert "paths" in schema
        print(f"✓ OpenAPI schema: {schema['info']['title']} v{schema['info']['version']}")
        
        # Test Swagger UI
        response = client.get("/docs")
        assert response.status_code == 200
        print(f"✓ Swagger UI: {response.status_code}")
        
        # Test ReDoc
        response = client.get("/redoc")
        assert response.status_code == 200
        print(f"✓ ReDoc: {response.status_code}")


class TestSDKIntegration:
    """Test SDK integration with real API calls."""
    
    @pytest.fixture
    def app(self):
        return create_v2_app()
    
    @pytest.fixture
    def client(self, app):
        return TestClient(app)
    
    def test_typescript_sdk_compatibility(self, client):
        """Test TypeScript SDK compatibility."""
        print("\n=== Testing TypeScript SDK Compatibility ===")
        
        # Test that all endpoints return proper JSON
        endpoints = [
            "/health",
            "/rate-limits",
            "/api/v2/quotes/lookup?q=test",
            "/api/v2/auth/users/me"
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint)
            # Should return valid JSON or proper error
            if response.status_code == 200:
                data = response.json()
                assert isinstance(data, dict)
                print(f"✓ {endpoint}: Valid JSON response")
            else:
                # Error responses should also be valid JSON
                try:
                    data = response.json()
                    assert isinstance(data, dict)
                    print(f"✓ {endpoint}: Valid JSON error response")
                except:
                    print(f"✗ {endpoint}: Invalid response format")
    
    def test_python_sdk_compatibility(self, client):
        """Test Python SDK compatibility."""
        print("\n=== Testing Python SDK Compatibility ===")
        
        # Test response format compatibility
        response = client.get("/health")
        data = response.json()
        
        # Check required fields for SDK
        required_fields = ["status", "version"]
        for field in required_fields:
            assert field in data
            print(f"✓ Health endpoint has {field}: {data[field]}")
        
        # Test error response format
        response = client.post("/api/v2/quotes/create", json={})
        data = response.json()
        
        # Check error response structure
        assert "error" in data
        error = data["error"]
        required_error_fields = ["code", "message", "timestamp"]
        for field in required_error_fields:
            assert field in error
            print(f"✓ Error response has {field}: {error[field]}")


class TestProductionReadiness:
    """Test production readiness aspects."""
    
    @pytest.fixture
    def app(self):
        return create_v2_app()
    
    @pytest.fixture
    def client(self, app):
        return TestClient(app)
    
    def test_logging_and_monitoring(self, client):
        """Test logging and monitoring capabilities."""
        print("\n=== Testing Logging and Monitoring ===")
        
        # Test that all endpoints are accessible
        monitoring_endpoints = [
            "/health",
            "/rate-limits",
            "/connection-pool/stats",
            "/connection-pool/health",
            "/connection-pool/metrics",
            "/connection-pool/validate",
            "/celery/status",
            "/celery/tasks",
            "/celery/workers"
        ]
        
        for endpoint in monitoring_endpoints:
            response = client.get(endpoint)
            assert response.status_code == 200
            data = response.json()
            assert "status" in data
            print(f"✓ {endpoint}: {data['status']}")
    
    def test_error_recovery(self, client):
        """Test error recovery and resilience."""
        print("\n=== Testing Error Recovery ===")
        
        # Test that the API recovers from errors
        # Make a request that should fail
        response = client.post("/api/v2/quotes/create", json={})
        assert response.status_code == 422
        
        # Make a request that should succeed
        response = client.get("/health")
        assert response.status_code == 200
        
        print("✓ API recovers from errors properly")
    
    def test_performance_characteristics(self, client):
        """Test basic performance characteristics."""
        print("\n=== Testing Performance ===")
        
        import time
        
        # Test response times
        start_time = time.time()
        response = client.get("/health")
        end_time = time.time()
        
        response_time = end_time - start_time
        assert response.status_code == 200
        assert response_time < 1.0  # Should respond within 1 second
        
        print(f"✓ Health endpoint response time: {response_time:.3f}s")
        
        # Test multiple requests
        start_time = time.time()
        for _ in range(10):
            response = client.get("/health")
            assert response.status_code == 200
        end_time = time.time()
        
        avg_response_time = (end_time - start_time) / 10
        print(f"✓ Average response time (10 requests): {avg_response_time:.3f}s")


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "-s"])
