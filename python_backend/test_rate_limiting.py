#!/usr/bin/env python3
"""
Simple test script to verify rate limiting functionality.
"""
import requests
import time
import json

BASE_URL = "http://localhost:8000/api/v2"

def test_rate_limiting():
    """Test rate limiting functionality."""
    print("Testing V2 API Rate Limiting...")
    
    # Test 1: Check rate limit info endpoint
    print("\n1. Testing rate limit info endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/rate-limits")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Rate limiting enabled: {data.get('enabled', False)}")
            if data.get('enabled'):
                print("Available tiers:")
                for tier, config in data.get('tiers', {}).items():
                    print(f"  {tier}: {config['requests_per_minute']}/min")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 2: Test anonymous rate limiting
    print("\n2. Testing anonymous rate limiting...")
    try:
        for i in range(35):  # Exceed the 30/minute limit
            response = requests.get(f"{BASE_URL}/health")
            print(f"Request {i+1}: Status {response.status_code}")
            
            # Check headers
            if "X-RateLimit-Limit" in response.headers:
                limit = response.headers["X-RateLimit-Limit"]
                remaining = response.headers["X-RateLimit-Remaining"]
                tier = response.headers.get("X-RateLimit-Tier", "unknown")
                print(f"  Limit: {limit}, Remaining: {remaining}, Tier: {tier}")
            
            if response.status_code == 429:
                print("  Rate limit exceeded!")
                error_data = response.json()
                print(f"  Error: {error_data.get('error', {}).get('message', 'Unknown error')}")
                break
            
            time.sleep(0.1)  # Small delay between requests
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 3: Test with fake JWT token (should fall back to IP-based)
    print("\n3. Testing with invalid JWT token...")
    try:
        headers = {"Authorization": "Bearer invalid-token"}
        for i in range(5):
            response = requests.get(f"{BASE_URL}/health", headers=headers)
            print(f"Request {i+1}: Status {response.status_code}")
            if "X-RateLimit-Tier" in response.headers:
                print(f"  Tier: {response.headers['X-RateLimit-Tier']}")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\nRate limiting test completed!")

if __name__ == "__main__":
    test_rate_limiting()
