"""
Standalone test for v2 API endpoints without complex dependencies.

This test validates the core functionality without importing the full application.
"""
import json
import requests
from typing import Dict, Any, List
import time


class V2APITester:
    """Standalone tester for v2 API endpoints."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.results = []
    
    def test_endpoint(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Test a single endpoint and return results."""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, **kwargs)
            elif method.upper() == "POST":
                response = self.session.post(url, **kwargs)
            elif method.upper() == "PUT":
                response = self.session.put(url, **kwargs)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, **kwargs)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            result = {
                "endpoint": endpoint,
                "method": method,
                "status_code": response.status_code,
                "success": 200 <= response.status_code < 300,
                "response_time": response.elapsed.total_seconds(),
                "headers": dict(response.headers),
                "content_type": response.headers.get('content-type', ''),
                "has_json": False,
                "json_data": None,
                "error": None
            }
            
            # Try to parse JSON response
            try:
                if 'application/json' in result["content_type"]:
                    result["json_data"] = response.json()
                    result["has_json"] = True
            except:
                result["json_data"] = response.text[:500]  # First 500 chars
            
        except Exception as e:
            result = {
                "endpoint": endpoint,
                "method": method,
                "status_code": None,
                "success": False,
                "response_time": 0,
                "headers": {},
                "content_type": "",
                "has_json": False,
                "json_data": None,
                "error": str(e)
            }
        
        self.results.append(result)
        return result
    
    def test_health_endpoints(self):
        """Test health and monitoring endpoints."""
        print("\n=== Testing Health Endpoints ===")
        
        endpoints = [
            ("GET", "/health"),
            ("GET", "/rate-limits"),
            ("GET", "/connection-pool/stats"),
            ("GET", "/connection-pool/health"),
            ("GET", "/connection-pool/metrics"),
            ("GET", "/connection-pool/validate"),
            ("GET", "/celery/status"),
            ("GET", "/celery/tasks"),
            ("GET", "/celery/workers")
        ]
        
        for method, endpoint in endpoints:
            result = self.test_endpoint(method, endpoint)
            status = "✓" if result["success"] else "✗"
            print(f"{status} {method} {endpoint}: {result['status_code']} ({result['response_time']:.3f}s)")
            
            if result["error"]:
                print(f"  Error: {result['error']}")
    
    def test_auth_endpoints(self):
        """Test authentication endpoints."""
        print("\n=== Testing Authentication Endpoints ===")
        
        # Test token endpoint
        result = self.test_endpoint(
            "POST", 
            "/api/v2/auth/token",
            data={"username": "test@example.com", "password": "testpassword"}
        )
        status = "✓" if result["status_code"] in [401, 422] else "✗"
        print(f"{status} POST /api/v2/auth/token: {result['status_code']}")
        
        # Test refresh endpoint
        result = self.test_endpoint(
            "POST",
            "/api/v2/auth/refresh",
            json={"refresh_token": "test_token"}
        )
        status = "✓" if result["status_code"] in [401, 422] else "✗"
        print(f"{status} POST /api/v2/auth/refresh: {result['status_code']}")
        
        # Test user info endpoint
        result = self.test_endpoint("GET", "/api/v2/auth/users/me")
        status = "✓" if result["status_code"] == 401 else "✗"
        print(f"{status} GET /api/v2/auth/users/me: {result['status_code']}")
    
    def test_quotes_endpoints(self):
        """Test quotes endpoints."""
        print("\n=== Testing Quotes Endpoints ===")
        
        # Test quote lookup
        result = self.test_endpoint("GET", "/api/v2/quotes/lookup?q=test")
        status = "✓" if result["success"] else "✗"
        print(f"{status} GET /api/v2/quotes/lookup: {result['status_code']}")
        
        # Test quote creation with validation error
        result = self.test_endpoint(
            "POST",
            "/api/v2/quotes/create",
            json={
                "contact_name": "",
                "contact_email": "test@example.com",
                "products": []
            },
            headers={"Accept-Language": "en"}
        )
        status = "✓" if result["status_code"] == 422 else "✗"
        print(f"{status} POST /api/v2/quotes/create (validation): {result['status_code']}")
        
        if result["has_json"] and result["json_data"]:
            error_code = result["json_data"].get("error", {}).get("code", "N/A")
            print(f"  Error code: {error_code}")
    
    def test_tickets_endpoints(self):
        """Test tickets endpoints."""
        print("\n=== Testing Tickets Endpoints ===")
        
        # Test support ticket creation
        result = self.test_endpoint(
            "POST",
            "/api/v2/tickets/support",
            json={
                "category": "support",
                "payload": {
                    "title": "",
                    "priority": "medium"
                }
            },
            headers={"Accept-Language": "en"}
        )
        status = "✓" if result["status_code"] in [401, 422] else "✗"
        print(f"{status} POST /api/v2/tickets/support: {result['status_code']}")
        
        # Test ticket assignment
        result = self.test_endpoint("POST", "/api/v2/tickets/123/assign/456")
        status = "✓" if result["status_code"] in [401, 403] else "✗"
        print(f"{status} POST /api/v2/tickets/123/assign/456: {result['status_code']}")
    
    def test_api_documentation(self):
        """Test API documentation endpoints."""
        print("\n=== Testing API Documentation ===")
        
        # Test OpenAPI schema
        result = self.test_endpoint("GET", "/openapi.json")
        status = "✓" if result["success"] else "✗"
        print(f"{status} GET /openapi.json: {result['status_code']}")
        
        if result["has_json"] and result["json_data"]:
            info = result["json_data"].get("info", {})
            print(f"  API Title: {info.get('title', 'N/A')}")
            print(f"  API Version: {info.get('version', 'N/A')}")
            print(f"  Number of paths: {len(result['json_data'].get('paths', {}))}")
        
        # Test Swagger UI
        result = self.test_endpoint("GET", "/docs")
        status = "✓" if result["success"] else "✗"
        print(f"{status} GET /docs: {result['status_code']}")
        
        # Test ReDoc
        result = self.test_endpoint("GET", "/redoc")
        status = "✓" if result["success"] else "✗"
        print(f"{status} GET /redoc: {result['status_code']}")
    
    def test_error_handling(self):
        """Test error handling consistency."""
        print("\n=== Testing Error Handling ===")
        
        # Test 404 error
        result = self.test_endpoint("GET", "/api/v2/nonexistent")
        status = "✓" if result["status_code"] == 404 else "✗"
        print(f"{status} GET /api/v2/nonexistent: {result['status_code']}")
        
        # Test validation error
        result = self.test_endpoint("POST", "/api/v2/quotes/create", json={})
        status = "✓" if result["status_code"] == 422 else "✗"
        print(f"{status} POST /api/v2/quotes/create (empty): {result['status_code']}")
        
        if result["has_json"] and result["json_data"]:
            error = result["json_data"].get("error", {})
            print(f"  Error structure: {list(error.keys())}")
    
    def test_performance(self):
        """Test basic performance characteristics."""
        print("\n=== Testing Performance ===")
        
        # Test response times
        times = []
        for _ in range(5):
            result = self.test_endpoint("GET", "/health")
            if result["success"]:
                times.append(result["response_time"])
        
        if times:
            avg_time = sum(times) / len(times)
            max_time = max(times)
            min_time = min(times)
            print(f"✓ Response times - Avg: {avg_time:.3f}s, Min: {min_time:.3f}s, Max: {max_time:.3f}s")
        else:
            print("✗ No successful responses for performance testing")
    
    def test_internationalization(self):
        """Test internationalization support."""
        print("\n=== Testing Internationalization ===")
        
        # Test English error message
        result = self.test_endpoint(
            "POST",
            "/api/v2/quotes/create",
            json={"contact_name": ""},
            headers={"Accept-Language": "en"}
        )
        
        if result["has_json"] and result["json_data"]:
            error = result["json_data"].get("error", {})
            messages = error.get("messages", {})
            if "en" in messages:
                print(f"✓ English message: {messages['en'][:50]}...")
            if "ar" in messages:
                print(f"✓ Arabic message: {messages['ar'][:50]}...")
    
    def run_all_tests(self):
        """Run all tests."""
        print("V2 API Production Readiness Test")
        print("=" * 50)
        
        start_time = time.time()
        
        self.test_health_endpoints()
        self.test_auth_endpoints()
        self.test_quotes_endpoints()
        self.test_tickets_endpoints()
        self.test_api_documentation()
        self.test_error_handling()
        self.test_performance()
        self.test_internationalization()
        
        end_time = time.time()
        total_time = end_time - start_time
        
        print(f"\n=== Test Summary ===")
        print(f"Total test time: {total_time:.2f}s")
        print(f"Total endpoints tested: {len(self.results)}")
        
        successful = sum(1 for r in self.results if r["success"])
        print(f"Successful requests: {successful}")
        print(f"Failed requests: {len(self.results) - successful}")
        
        # Show failed requests
        failed = [r for r in self.results if not r["success"]]
        if failed:
            print(f"\nFailed requests:")
            for result in failed:
                print(f"  {result['method']} {result['endpoint']}: {result['status_code']} - {result.get('error', 'N/A')}")
        
        return self.results


def main():
    """Run the production readiness test."""
    tester = V2APITester()
    results = tester.run_all_tests()
    
    # Return exit code based on results
    failed_count = sum(1 for r in results if not r["success"])
    if failed_count > 0:
        print(f"\n⚠️  {failed_count} tests failed")
        return 1
    else:
        print(f"\n✅ All tests passed!")
        return 0


if __name__ == "__main__":
    exit(main())
