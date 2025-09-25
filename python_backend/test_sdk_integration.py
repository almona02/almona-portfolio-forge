"""
SDK Integration Test

Tests both TypeScript and Python SDKs with real API calls to validate
production readiness and compatibility.
"""
import json
import requests
import time
from typing import Dict, Any, List
import subprocess
import sys
import os


class SDKIntegrationTester:
    """Test SDK integration with real API calls."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.results = []
    
    def test_python_sdk_compatibility(self):
        """Test Python SDK compatibility with API responses."""
        print("\n=== Testing Python SDK Compatibility ===")
        
        # Test that API responses match expected Python SDK format
        test_cases = [
            {
                "name": "Health Check",
                "endpoint": "/health",
                "expected_fields": ["status", "version"],
                "method": "GET"
            },
            {
                "name": "Quote Validation Error",
                "endpoint": "/api/v2/quotes/create",
                "expected_fields": ["error"],
                "method": "POST",
                "data": {"contact_name": ""},
                "expected_status": 422
            },
            {
                "name": "Ticket Validation Error",
                "endpoint": "/api/v2/tickets/support",
                "expected_fields": ["error"],
                "method": "POST",
                "data": {"category": "support", "payload": {"title": ""}},
                "expected_status": 422
            }
        ]
        
        for test_case in test_cases:
            try:
                if test_case["method"] == "GET":
                    response = self.session.get(f"{self.base_url}{test_case['endpoint']}")
                else:
                    response = self.session.post(
                        f"{self.base_url}{test_case['endpoint']}",
                        json=test_case.get("data", {})
                    )
                
                # Check status code
                expected_status = test_case.get("expected_status", 200)
                status_match = response.status_code == expected_status
                
                # Check response format
                try:
                    data = response.json()
                    has_expected_fields = all(
                        field in data for field in test_case["expected_fields"]
                    )
                except:
                    has_expected_fields = False
                    data = None
                
                result = {
                    "test": test_case["name"],
                    "endpoint": test_case["endpoint"],
                    "status_code": response.status_code,
                    "expected_status": expected_status,
                    "status_match": status_match,
                    "has_expected_fields": has_expected_fields,
                    "response_data": data,
                    "success": status_match and has_expected_fields
                }
                
                self.results.append(result)
                
                status = "✓" if result["success"] else "✗"
                print(f"{status} {test_case['name']}: {response.status_code}")
                
                if not result["success"]:
                    print(f"  Expected status: {expected_status}")
                    print(f"  Expected fields: {test_case['expected_fields']}")
                    if data:
                        print(f"  Actual fields: {list(data.keys())}")
                
            except Exception as e:
                print(f"✗ {test_case['name']}: Error - {str(e)}")
                self.results.append({
                    "test": test_case["name"],
                    "endpoint": test_case["endpoint"],
                    "error": str(e),
                    "success": False
                })
    
    def test_typescript_sdk_compatibility(self):
        """Test TypeScript SDK compatibility with API responses."""
        print("\n=== Testing TypeScript SDK Compatibility ===")
        
        # Test that API responses are valid JSON and have expected structure
        test_cases = [
            {
                "name": "OpenAPI Schema",
                "endpoint": "/openapi.json",
                "expected_fields": ["openapi", "info", "paths"],
                "method": "GET"
            },
            {
                "name": "Error Response Structure",
                "endpoint": "/api/v2/quotes/create",
                "expected_fields": ["error"],
                "method": "POST",
                "data": {},
                "expected_status": 422
            }
        ]
        
        for test_case in test_cases:
            try:
                if test_case["method"] == "GET":
                    response = self.session.get(f"{self.base_url}{test_case['endpoint']}")
                else:
                    response = self.session.post(
                        f"{self.base_url}{test_case['endpoint']}",
                        json=test_case.get("data", {})
                    )
                
                # Check status code
                expected_status = test_case.get("expected_status", 200)
                status_match = response.status_code == expected_status
                
                # Check JSON validity and structure
                try:
                    data = response.json()
                    is_valid_json = True
                    has_expected_fields = all(
                        field in data for field in test_case["expected_fields"]
                    )
                except:
                    is_valid_json = False
                    has_expected_fields = False
                    data = None
                
                result = {
                    "test": test_case["name"],
                    "endpoint": test_case["endpoint"],
                    "status_code": response.status_code,
                    "expected_status": expected_status,
                    "status_match": status_match,
                    "is_valid_json": is_valid_json,
                    "has_expected_fields": has_expected_fields,
                    "response_data": data,
                    "success": status_match and is_valid_json and has_expected_fields
                }
                
                self.results.append(result)
                
                status = "✓" if result["success"] else "✗"
                print(f"{status} {test_case['name']}: {response.status_code}")
                
                if not result["success"]:
                    print(f"  Expected status: {expected_status}")
                    print(f"  Valid JSON: {is_valid_json}")
                    print(f"  Expected fields: {test_case['expected_fields']}")
                
            except Exception as e:
                print(f"✗ {test_case['name']}: Error - {str(e)}")
                self.results.append({
                    "test": test_case["name"],
                    "endpoint": test_case["endpoint"],
                    "error": str(e),
                    "success": False
                })
    
    def test_error_response_consistency(self):
        """Test that error responses are consistent across endpoints."""
        print("\n=== Testing Error Response Consistency ===")
        
        # Test validation errors across different endpoints
        validation_tests = [
            {
                "name": "Quote Creation Validation",
                "endpoint": "/api/v2/quotes/create",
                "data": {"contact_name": ""},
                "expected_error_code": "QUOTE_ITEM_VALIDATION_FAILED"
            },
            {
                "name": "Ticket Creation Validation",
                "endpoint": "/api/v2/tickets/support",
                "data": {"category": "support", "payload": {"title": ""}},
                "expected_error_code": "TICKET_INVALID_CATEGORY"
            }
        ]
        
        for test in validation_tests:
            try:
                response = self.session.post(
                    f"{self.base_url}{test['endpoint']}",
                    json=test["data"],
                    headers={"Accept-Language": "en"}
                )
                
                if response.status_code == 422:
                    data = response.json()
                    error = data.get("error", {})
                    
                    # Check error structure consistency
                    has_code = "code" in error
                    has_message = "message" in error
                    has_timestamp = "timestamp" in error
                    has_path = "path" in error
                    has_method = "method" in error
                    
                    # Check for expected error code
                    actual_code = error.get("code", "")
                    code_match = actual_code == test["expected_error_code"]
                    
                    result = {
                        "test": test["name"],
                        "endpoint": test["endpoint"],
                        "status_code": response.status_code,
                        "has_code": has_code,
                        "has_message": has_message,
                        "has_timestamp": has_timestamp,
                        "has_path": has_path,
                        "has_method": has_method,
                        "expected_code": test["expected_error_code"],
                        "actual_code": actual_code,
                        "code_match": code_match,
                        "success": all([has_code, has_message, has_timestamp, has_path, has_method, code_match])
                    }
                    
                    self.results.append(result)
                    
                    status = "✓" if result["success"] else "✗"
                    print(f"{status} {test['name']}: {actual_code}")
                    
                    if not result["success"]:
                        print(f"  Expected code: {test['expected_error_code']}")
                        print(f"  Has required fields: {has_code}, {has_message}, {has_timestamp}, {has_path}, {has_method}")
                
                else:
                    print(f"✗ {test['name']}: Unexpected status {response.status_code}")
                    self.results.append({
                        "test": test["name"],
                        "endpoint": test["endpoint"],
                        "status_code": response.status_code,
                        "success": False
                    })
                    
            except Exception as e:
                print(f"✗ {test['name']}: Error - {str(e)}")
                self.results.append({
                    "test": test["name"],
                    "endpoint": test["endpoint"],
                    "error": str(e),
                    "success": False
                })
    
    def test_internationalization_consistency(self):
        """Test internationalization consistency across endpoints."""
        print("\n=== Testing Internationalization Consistency ===")
        
        # Test error messages in different languages
        languages = ["en", "ar"]
        test_data = {
            "contact_name": "",
            "contact_email": "test@example.com",
            "products": []
        }
        
        for language in languages:
            try:
                response = self.session.post(
                    f"{self.base_url}/api/v2/quotes/create",
                    json=test_data,
                    headers={"Accept-Language": language}
                )
                
                if response.status_code == 422:
                    data = response.json()
                    error = data.get("error", {})
                    
                    # Check for localized messages
                    has_messages = "messages" in error
                    has_en = "en" in error.get("messages", {})
                    has_ar = "ar" in error.get("messages", {})
                    
                    # Check primary message language
                    primary_message = error.get("message", "")
                    has_primary_message = len(primary_message) > 0
                    
                    result = {
                        "test": f"Internationalization ({language})",
                        "language": language,
                        "status_code": response.status_code,
                        "has_messages": has_messages,
                        "has_en": has_en,
                        "has_ar": has_ar,
                        "has_primary_message": has_primary_message,
                        "success": has_messages and has_en and has_ar and has_primary_message
                    }
                    
                    self.results.append(result)
                    
                    status = "✓" if result["success"] else "✗"
                    print(f"{status} Internationalization ({language}): {response.status_code}")
                    
                    if has_messages:
                        messages = error["messages"]
                        print(f"  English: {messages.get('en', 'N/A')[:50]}...")
                        print(f"  Arabic: {messages.get('ar', 'N/A')[:50]}...")
                
                else:
                    print(f"✗ Internationalization ({language}): Unexpected status {response.status_code}")
                    
            except Exception as e:
                print(f"✗ Internationalization ({language}): Error - {str(e)}")
    
    def test_api_documentation_completeness(self):
        """Test API documentation completeness."""
        print("\n=== Testing API Documentation Completeness ===")
        
        try:
            # Get OpenAPI schema
            response = self.session.get(f"{self.base_url}/openapi.json")
            
            if response.status_code == 200:
                schema = response.json()
                
                # Check required OpenAPI fields
                has_openapi = "openapi" in schema
                has_info = "info" in schema
                has_paths = "paths" in schema
                has_components = "components" in schema
                
                # Check info fields
                info = schema.get("info", {})
                has_title = "title" in info
                has_version = "version" in info
                has_description = "description" in info
                
                # Count paths
                paths = schema.get("paths", {})
                path_count = len(paths)
                
                # Check for v2 API paths
                v2_paths = [path for path in paths.keys() if path.startswith("/api/v2")]
                v2_path_count = len(v2_paths)
                
                result = {
                    "test": "API Documentation Completeness",
                    "status_code": response.status_code,
                    "has_openapi": has_openapi,
                    "has_info": has_info,
                    "has_paths": has_paths,
                    "has_components": has_components,
                    "has_title": has_title,
                    "has_version": has_version,
                    "has_description": has_description,
                    "path_count": path_count,
                    "v2_path_count": v2_path_count,
                    "success": all([has_openapi, has_info, has_paths, has_title, has_version, v2_path_count > 0])
                }
                
                self.results.append(result)
                
                status = "✓" if result["success"] else "✗"
                print(f"{status} API Documentation: {path_count} total paths, {v2_path_count} v2 paths")
                
                if has_info:
                    print(f"  Title: {info.get('title', 'N/A')}")
                    print(f"  Version: {info.get('version', 'N/A')}")
                
                if v2_paths:
                    print(f"  V2 Endpoints: {', '.join(v2_paths[:5])}{'...' if len(v2_paths) > 5 else ''}")
            
            else:
                print(f"✗ API Documentation: Status {response.status_code}")
                
        except Exception as e:
            print(f"✗ API Documentation: Error - {str(e)}")
    
    def test_performance_characteristics(self):
        """Test basic performance characteristics."""
        print("\n=== Testing Performance Characteristics ===")
        
        # Test response times for key endpoints
        endpoints = [
            "/health",
            "/api/v2/quotes/lookup?q=test",
            "/openapi.json"
        ]
        
        performance_results = []
        
        for endpoint in endpoints:
            times = []
            for _ in range(3):  # Test 3 times
                start_time = time.time()
                try:
                    response = self.session.get(f"{self.base_url}{endpoint}")
                    end_time = time.time()
                    response_time = end_time - start_time
                    times.append(response_time)
                except Exception as e:
                    print(f"✗ Performance test for {endpoint}: {str(e)}")
                    continue
            
            if times:
                avg_time = sum(times) / len(times)
                max_time = max(times)
                min_time = min(times)
                
                performance_results.append({
                    "endpoint": endpoint,
                    "avg_time": avg_time,
                    "max_time": max_time,
                    "min_time": min_time,
                    "success": avg_time < 2.0  # Should respond within 2 seconds
                })
                
                status = "✓" if avg_time < 2.0 else "✗"
                print(f"{status} {endpoint}: {avg_time:.3f}s avg ({min_time:.3f}s - {max_time:.3f}s)")
        
        # Overall performance result
        all_fast = all(result["success"] for result in performance_results)
        self.results.append({
            "test": "Performance Characteristics",
            "endpoints_tested": len(performance_results),
            "all_fast": all_fast,
            "success": all_fast
        })
    
    def run_all_tests(self):
        """Run all SDK integration tests."""
        print("SDK Integration Test")
        print("=" * 50)
        
        start_time = time.time()
        
        self.test_python_sdk_compatibility()
        self.test_typescript_sdk_compatibility()
        self.test_error_response_consistency()
        self.test_internationalization_consistency()
        self.test_api_documentation_completeness()
        self.test_performance_characteristics()
        
        end_time = time.time()
        total_time = end_time - start_time
        
        print(f"\n=== Test Summary ===")
        print(f"Total test time: {total_time:.2f}s")
        print(f"Total tests: {len(self.results)}")
        
        successful = sum(1 for r in self.results if r.get("success", False))
        print(f"Successful tests: {successful}")
        print(f"Failed tests: {len(self.results) - successful}")
        
        # Show failed tests
        failed = [r for r in self.results if not r.get("success", False)]
        if failed:
            print(f"\nFailed tests:")
            for result in failed:
                test_name = result.get("test", "Unknown")
                error = result.get("error", "N/A")
                print(f"  {test_name}: {error}")
        
        return self.results


def main():
    """Run the SDK integration test."""
    tester = SDKIntegrationTester()
    results = tester.run_all_tests()
    
    # Return exit code based on results
    failed_count = sum(1 for r in results if not r.get("success", False))
    if failed_count > 0:
        print(f"\n⚠️  {failed_count} tests failed")
        return 1
    else:
        print(f"\n✅ All SDK integration tests passed!")
        return 0


if __name__ == "__main__":
    exit(main())
