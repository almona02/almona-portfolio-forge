"""
Tests for v2 API rate limiting middleware.
"""
import pytest
import time
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from apis.v2.app import v2_app
from apis.v2.middleware.rate_limiting import V2RateLimitMiddleware, RateLimitTiers
from apis.v2.middleware.config import is_rate_limiting_enabled


class TestRateLimitingMiddleware:
    """Test rate limiting middleware functionality."""
    
    def setup_method(self):
        """Set up test client."""
        self.client = TestClient(v2_app)
    
    def test_rate_limit_headers_present(self):
        """Test that rate limit headers are present in responses."""
        response = self.client.get("/health")
        
        # Check that rate limit headers are present
        assert "X-RateLimit-Limit" in response.headers
        assert "X-RateLimit-Remaining" in response.headers
        assert "X-RateLimit-Reset" in response.headers
        assert "X-RateLimit-Tier" in response.headers
        assert "X-RateLimit-Burst-Limit" in response.headers
        assert "X-RateLimit-Hourly-Limit" in response.headers
    
    def test_anonymous_rate_limiting(self):
        """Test rate limiting for anonymous users."""
        # Make requests up to the limit
        responses = []
        for i in range(35):  # Exceed the 30/minute limit
            response = self.client.get("/health")
            responses.append(response)
        
        # Check that the last request was rate limited
        last_response = responses[-1]
        assert last_response.status_code == 429
        assert "RATE_LIMIT_EXCEEDED" in last_response.json()["error"]["code"]
        
        # Check rate limit headers in the error response
        assert "Retry-After" in last_response.headers
        assert "X-RateLimit-Limit" in last_response.headers
        assert "X-RateLimit-Remaining" in last_response.headers
    
    def test_authenticated_user_rate_limiting(self):
        """Test rate limiting for authenticated users."""
        # Mock JWT token for authenticated user
        mock_payload = {
            "sub": "test-user-123",
            "type": "access",
            "exp": int(time.time()) + 3600
        }
        
        with patch('jose.jwt.decode', return_value=mock_payload):
            # Make requests up to the authenticated limit
            responses = []
            for i in range(105):  # Exceed the 100/minute limit
                response = self.client.get(
                    "/health",
                    headers={"Authorization": "Bearer fake-token"}
                )
                responses.append(response)
            
            # Check that the last request was rate limited
            last_response = responses[-1]
            assert last_response.status_code == 429
            
            # Check that the tier is authenticated
            assert "authenticated" in last_response.json()["error"]["details"]["tier"]
    
    def test_burst_limit(self):
        """Test burst rate limiting."""
        responses = []
        for i in range(10):  # Exceed the 5/second burst limit
            response = self.client.get("/health")
            responses.append(response)
        
        # Check that burst limit was exceeded
        last_response = responses[-1]
        assert last_response.status_code == 429
        assert "burst" in last_response.json()["error"]["message"].lower()
    
    def test_rate_limit_reset(self):
        """Test that rate limits reset after the window."""
        # Exceed the rate limit
        for i in range(35):
            response = self.client.get("/health")
            if response.status_code == 429:
                break
        
        # Wait for rate limit to reset (in real scenario, this would be 60 seconds)
        # For testing, we'll mock the time
        with patch('time.time', return_value=time.time() + 61):
            response = self.client.get("/health")
            assert response.status_code == 200
    
    def test_different_user_limits(self):
        """Test that different users have separate rate limits."""
        # User 1
        mock_payload_1 = {
            "sub": "user-1",
            "type": "access",
            "exp": int(time.time()) + 3600
        }
        
        # User 2
        mock_payload_2 = {
            "sub": "user-2", 
            "type": "access",
            "exp": int(time.time()) + 3600
        }
        
        with patch('jose.jwt.decode') as mock_decode:
            # User 1 makes requests
            mock_decode.return_value = mock_payload_1
            for i in range(50):
                response = self.client.get(
                    "/health",
                    headers={"Authorization": "Bearer token-1"}
                )
                assert response.status_code == 200
            
            # User 2 makes requests (should not be affected by user 1's limits)
            mock_decode.return_value = mock_payload_2
            for i in range(50):
                response = self.client.get(
                    "/health",
                    headers={"Authorization": "Bearer token-2"}
                )
                assert response.status_code == 200
    
    def test_ip_fallback_rate_limiting(self):
        """Test IP-based rate limiting when user is not authenticated."""
        # Make requests without authentication
        responses = []
        for i in range(35):  # Exceed the 30/minute limit
            response = self.client.get("/health")
            responses.append(response)
        
        # Should be rate limited based on IP
        last_response = responses[-1]
        assert last_response.status_code == 429
        assert "anonymous" in last_response.json()["error"]["details"]["tier"]
    
    def test_rate_limit_info_endpoint(self):
        """Test the rate limit info endpoint."""
        response = self.client.get("/rate-limits")
        assert response.status_code == 200
        
        data = response.json()
        assert "enabled" in data
        assert "tiers" in data
        
        if data["enabled"]:
            assert "anonymous" in data["tiers"]
            assert "authenticated" in data["tiers"]
            assert "premium" in data["tiers"]
            assert "admin" in data["tiers"]
    
    def test_skip_rate_limit_paths(self):
        """Test that certain paths skip rate limiting."""
        # These paths should not be rate limited
        skip_paths = ["/docs", "/redoc", "/openapi.json"]
        
        for path in skip_paths:
            # Make many requests to these paths
            for i in range(100):
                response = self.client.get(path)
                # Should not be rate limited
                assert response.status_code != 429
    
    def test_invalid_token_handling(self):
        """Test that invalid tokens fall back to IP-based rate limiting."""
        # Make requests with invalid token
        for i in range(35):  # Exceed the 30/minute limit
            response = self.client.get(
                "/health",
                headers={"Authorization": "Bearer invalid-token"}
            )
            if response.status_code == 429:
                # Should be rate limited as anonymous user
                assert "anonymous" in response.json()["error"]["details"]["tier"]
                break
    
    def test_rate_limit_cleanup(self):
        """Test that rate limit data is cleaned up periodically."""
        # This test would require mocking time and checking internal state
        # For now, we'll just verify the cleanup method exists
        middleware = V2RateLimitMiddleware(None)
        assert hasattr(middleware, '_periodic_cleanup')
        assert hasattr(middleware, 'get_rate_limit_stats')


class TestRateLimitConfiguration:
    """Test rate limit configuration."""
    
    def test_rate_limit_tiers(self):
        """Test that rate limit tiers are properly configured."""
        assert RateLimitTiers.ANONYMOUS.requests_per_minute == 30
        assert RateLimitTiers.AUTHENTICATED.requests_per_minute == 100
        assert RateLimitTiers.PREMIUM.requests_per_minute == 200
        assert RateLimitTiers.ADMIN.requests_per_minute == 500
    
    def test_configuration_from_settings(self):
        """Test that configuration is loaded from settings."""
        from apis.v2.middleware.config import get_rate_limit_tiers
        
        tiers = get_rate_limit_tiers()
        assert "anonymous" in tiers
        assert "authenticated" in tiers
        assert "premium" in tiers
        assert "admin" in tiers
    
    @patch('apis.v2.middleware.config.settings.RATE_LIMIT_ENABLED', False)
    def test_rate_limiting_disabled(self):
        """Test behavior when rate limiting is disabled."""
        from apis.v2.middleware.config import is_rate_limiting_enabled
        assert not is_rate_limiting_enabled()


if __name__ == "__main__":
    pytest.main([__file__])
