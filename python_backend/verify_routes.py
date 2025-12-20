#!/usr/bin/env python3
"""Verify routes are accessible via HTTP"""
import urllib.request
import urllib.error
import json

BASE = "http://localhost:8003"

def test(path):
    try:
        req = urllib.request.Request(f"{BASE}{path}")
        req.add_header('Accept', 'application/json')
        with urllib.request.urlopen(req, timeout=2) as r:
            print(f"[OK] {path} - {r.getcode()}")
            return True
    except urllib.error.HTTPError as e:
        if e.code == 405:  # Method not allowed is OK for GET on POST endpoint
            print(f"[OK] {path} - {e.code} (Method not allowed - route exists)")
            return True
        print(f"[FAIL] {path} - {e.code}")
        try:
            body = e.read().decode('utf-8')[:100]
            print(f"      {body}")
        except:
            pass
        return False
    except Exception as e:
        print(f"[ERROR] {path} - {e}")
        return False

print("Testing routes...")
print()

test("/api/v2/smart-scan/supported-formats")
test("/api/v2/profile-import/ingest")
test("/api/v2/health")

print()
print("If all show [FAIL], server needs restart to pick up code changes.")

