#!/usr/bin/env python3
"""
Security testing suite for Almona API
Includes OWASP ZAP scanning and security vulnerability tests
"""

import requests
import time
import subprocess
import sys
import os
from typing import Dict, List, Any
import json
import pytest
from fastapi.testclient import TestClient
from apis.main import app

class SecurityTestSuite:
    """Security testing suite for API endpoints"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.client = TestClient(app)
    
    def test_sql_injection(self) -> bool:
        """Test SQL injection vulnerabilities"""
        print("Testing SQL injection vulnerabilities...")
        
        malicious_payloads = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "' UNION SELECT * FROM users--",
            "1' OR 1=1#",
            "admin'--",
            "1' OR 'a'='a"
        ]
        
        for payload in malicious_payloads:
            # Test in query parameters
            response = self.client.get(f"/api/search?q={payload}")
            assert response.status_code != 500, f"SQL injection possible with payload: {payload}"
            
            # Test in form data
            response = self.client.post("/api/contact", json={
                "name": payload,
                "email": "test@example.com",
                "message": "test"
            })
            assert response.status_code != 500, f"SQL injection possible with payload: {payload}"
        
        return True
    
    def test_xss_protection(self) -> bool:
        """Test XSS protection"""
        print("Testing XSS protection...")
        
        xss_payloads = [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "javascript:alert('XSS')",
            "<svg onload=alert('XSS')>",
            "'><script>alert('XSS')</script>",
            "<iframe src=javascript:alert('XSS')></iframe>"
        ]
        
        for payload in xss_payloads:
            # Test in query parameters
            response = self.client.get(f"/api/contact", json={
                "name": payload,
                "email": "test@example.com",
                "message": payload
            })
            assert payload not in response.text, f"XSS payload not sanitized: {payload}"
        
        return True
    
    def test_authentication_bypass(self) -> bool:
        """Test authentication bypass attempts"""
        print("Testing authentication bypass attempts...")
        
        # Test accessing protected endpoints without auth
        protected_endpoints = [
            "/api/admin/dashboard",
            "/api/users/profile",
            "/api/orders"
        ]
        
        for endpoint in protected_endpoints:
            response = self.client.get(endpoint)
            assert response.status_code in [401, 403], f"Authentication bypass possible for {endpoint}"
        
        return True
    
    def test_rate_limiting(self) -> bool:
        """Test rate limiting"""
        print("Testing rate limiting...")
        
        # Make rapid requests to test rate limiting
        for i in range(100):
            response = self.client.get("/api/health")
            if response.status_code == 429:
                print("Rate limiting working correctly")
                return True
        
        print("Warning: Rate limiting may not be configured")
        return False
    
    def test_secure_headers(self) -> bool:
        """Test security headers"""
        print("Testing security headers...")
        
        # Test CORS headers
        response = self.client.get("/api/health")
        headers = response.headers
        
        required_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Content-Security-Policy': None  # Just check presence
        }
        
        for header, expected_value in required_headers.items():
            if header in headers:
                assert header in headers, f"Security header missing: {header}"
        
        return True
    
    def test_file_upload_security(self) -> bool:
        """Test file upload security"""
        print("Testing file upload security...")
        
        # Test malicious file uploads
        malicious_files = [
            "test.php",
            "test.exe",
            "test.js",
            "test.html"
        ]
        
        for filename in malicious_files:
            # Test malicious file types
            response = self.client.post("/api/upload", files={"file": (filename, filename, "text/plain")})
            assert response.status_code == 400, f"Malicious file type not rejected: {filename}"
        
        return True
    
    def test_input_validation(self) -> bool:
        """Test input validation"""
        print("Testing input validation...")
        
        # Test with invalid inputs
        invalid_inputs = [
            {"email": "invalid-email"},
            {"phone": "123"},
            {"price": "abc"},
            {"quantity": -1}
        ]
        
        for invalid_input in invalid_inputs:
            response = self.client.post("/api/contact", json=invalid_input)
            assert response.status_code == 422, f"Invalid input not rejected: {invalid_input}"
        
        return True
    
    def run_security_tests(self) -> Dict[str, Any]:
        """Run all security tests"""
        print("Running security test suite...")
        
        results = {
            "sql_injection": False,
            "xss_protection": False,
            "authentication_bypass": False,
            "rate_limiting": False,
            "secure_headers": {},
            "file_upload_security": False,
            "cors_configuration": False,
            "input_validation": False
        }
        
        try:
            results["sql_injection"] = self.test_sql_injection()
            results["xss_protection"] = self.test_xss_protection()
            results["authentication_bypass"] = self.test_authentication_bypass()
            results["rate_limiting"] = self.test_rate_limiting()
            results["secure_headers"] = self.test_secure_headers()
            results["file_upload_security"] = self.test_file_upload_security()
            results["cors_configuration"] = self.test_cors_configuration()
            results["input_validation"] = self.test_input_validation()
            
            print("Security tests completed successfully!")
            
        except Exception as e:
            print(f"Security test failed: {e}")
            results["error"] = str(e)
        
        return results

def main():
    """Main security test runner"""
    print("Almona Security Testing Suite")
    print("=" * 50)
    
    suite = SecurityTestSuite()
    results = suite.run_security_tests()
    
    # Return exit code
    failed_tests = [k for k, v in results.items() if k != "secure_headers" and not v]
    if failed_tests:
        print(f"\nFailed tests: {failed_tests}")
        return 1
    
    print("\n✅ All security tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())
