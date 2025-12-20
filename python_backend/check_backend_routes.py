#!/usr/bin/env python3
"""
Check which backend app is running and verify routes
"""
import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://localhost:8003"

def test_route(path, expected_status=200):
    """Test a route and return True if it works"""
    try:
        url = f"{BASE_URL}{path}"
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'BackendRouteChecker/1.0')
        
        with urllib.request.urlopen(req, timeout=2) as response:
            status = response.getcode()
            if status == expected_status:
                print(f"[OK] {path} - Status: {status}")
                return True
            else:
                print(f"[FAIL] {path} - Status: {status} (expected {expected_status})")
                if status == 404:
                    body = response.read().decode('utf-8')[:100]
                    print(f"   Response: {body}")
                return False
    except urllib.error.HTTPError as e:
        status = e.code
        if status == expected_status:
            print(f"[OK] {path} - Status: {status}")
            return True
        else:
            print(f"[FAIL] {path} - Status: {status} (expected {expected_status})")
            if status == 404:
                try:
                    body = e.read().decode('utf-8')[:100]
                    print(f"   Response: {body}")
                except:
                    pass
            return False
    except Exception as e:
        print(f"[ERROR] {path} - Error: {e}")
        return False

print("=" * 60)
print("Backend Route Checker")
print("=" * 60)
print()

# Test routes without /api/v2 (v2_app directly)
print("Testing routes WITHOUT /api/v2 prefix (v2_app directly):")
test_route("/smart-scan/supported-formats")
test_route("/profile-import/ingest", expected_status=405)  # Method not allowed for GET
test_route("/health")
print()

# Test routes WITH /api/v2 (main app with mounted v2_app)
print("Testing routes WITH /api/v2 prefix (main app):")
v2_works = test_route("/api/v2/smart-scan/supported-formats")
test_route("/api/v2/profile-import/ingest", expected_status=405)
test_route("/api/v2/health")
print()

# Conclusion
print("=" * 60)
if v2_works:
    print("[OK] Backend is running with apis.main:app")
    print("   Routes are correctly mounted under /api/v2")
else:
    print("[FAIL] Backend is running with apis.v2.app:v2_app")
    print("   Routes are NOT under /api/v2 prefix")
    print()
    print("SOLUTION: Restart backend with:")
    print("   python -m uvicorn apis.main:app --host 0.0.0.0 --port 8003 --reload")
print("=" * 60)

