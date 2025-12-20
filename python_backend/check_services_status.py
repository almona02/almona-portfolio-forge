#!/usr/bin/env python3
"""Quick status check for all SmartScan services"""
import sys
import socket
import requests
import redis

print("=" * 60)
print("SmartScan Services Status Check")
print("=" * 60)

# Check Redis
print("\n1. Redis:")
try:
    r = redis.Redis(host='localhost', port=6379, socket_connect_timeout=2)
    r.ping()
    print("   [OK] Running on localhost:6379")
except Exception as e:
    print(f"   [ERROR] Not running: {e}")

# Check Backend Server
print("\n2. Backend Server:")
for port in [8003, 8000, 8002]:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex(('localhost', port))
        sock.close()
        if result == 0:
            try:
                response = requests.get(f"http://localhost:{port}/health", timeout=2)
                print(f"   [OK] Running on port {port} (status: {response.status_code})")
                break
            except:
                print(f"   [WARN] Port {port} open but not responding")
        else:
            print(f"   [INFO] Port {port} not open")
    except:
        pass
else:
    print("   [ERROR] Backend server not found on any port")

# Check Celery (via Redis)
print("\n3. Celery Worker:")
try:
    r = redis.Redis(host='localhost', port=6379, socket_connect_timeout=2)
    # Check for Celery keys in Redis
    keys = r.keys('celery*')
    if keys:
        print(f"   [OK] Celery tasks found in Redis ({len(keys)} keys)")
    else:
        print("   [WARN] No Celery activity in Redis (worker may not be running)")
except Exception as e:
    print(f"   [ERROR] Cannot check Celery: {e}")

print("\n" + "=" * 60)
print("Status Check Complete")
print("=" * 60)

