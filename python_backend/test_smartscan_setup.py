#!/usr/bin/env python3
"""
Test SmartScan setup: Redis, Celery, and DXF import endpoint
"""
import sys
import os
import requests
from pathlib import Path

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 60)
print("SmartScan Setup Test")
print("=" * 60)

# Test 1: Redis Connection
print("\n1. Testing Redis Connection...")
try:
    import redis
    r = redis.Redis(host='localhost', port=6379, decode_responses=True)
    ping_result = r.ping()
    print(f"   [OK] Redis ping: {ping_result}")
    print(f"   [OK] Redis version: {r.info('server')['redis_version']}")
except Exception as e:
    print(f"   [ERROR] Redis connection failed: {e}")
    sys.exit(1)

# Test 2: Celery Configuration
print("\n2. Testing Celery Configuration...")
try:
    os.environ['REDIS_URL'] = 'redis://localhost:6379'
    from core.celery_app import celery_app
    from tasks.heavy_computation_tasks import smart_scan_single_task
    
    print(f"   [OK] Celery app loaded")
    print(f"   [OK] Broker: {celery_app.conf.broker_url}")
    print(f"   [OK] Backend: {celery_app.conf.result_backend}")
    print(f"   [OK] Task registered: {smart_scan_single_task.name}")
except Exception as e:
    print(f"   [ERROR] Celery configuration failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 3: Test Celery Task Enqueue
print("\n3. Testing Celery Task Enqueue...")
try:
    # Read a small test file
    test_file = Path("../public/PROFILES/MC 1250 .dxf")
    if not test_file.exists():
        print(f"   [SKIP] Test file not found: {test_file}")
    else:
        with open(test_file, 'rb') as f:
            file_bytes = f.read()[:1000]  # Just first 1KB for test
        
        # Try to enqueue (this will fail if Redis not connected)
        task = smart_scan_single_task.delay(
            file_bytes, "test.dxf", None, True
        )
        print(f"   [OK] Task enqueued successfully!")
        print(f"   [OK] Task ID: {task.id}")
        print(f"   [OK] Task state: {task.state}")
        
        # Clean up - revoke the task
        task.revoke(terminate=True)
        print(f"   [OK] Test task revoked")
except Exception as e:
    print(f"   [ERROR] Task enqueue failed: {e}")
    import traceback
    traceback.print_exc()

# Test 4: DXF Import Endpoint (if server is running)
print("\n4. Testing DXF Import Endpoint...")
test_ports = [8000, 8003, 8002]
server_found = False

for port in test_ports:
    try:
        response = requests.get(f"http://localhost:{port}/health", timeout=2)
        if response.status_code == 200:
            print(f"   [OK] Server found on port {port}")
            server_found = True
            
            # Test DXF import
            test_file = Path("../public/PROFILES/MC 1250 .dxf")
            if test_file.exists():
                print(f"   [INFO] Testing DXF import endpoint...")
                with open(test_file, 'rb') as f:
                    files = {'file': ('MC 1250 .dxf', f, 'application/dxf')}
                    data = {
                        'source_type': 'dxf',
                        'material_type': 'aluminium'
                    }
                    response = requests.post(
                        f"http://localhost:{port}/api/v2/profile-import/ingest",
                        files=files,
                        data=data,
                        timeout=30
                    )
                    if response.status_code == 200:
                        result = response.json()
                        print(f"   [OK] DXF import successful!")
                        if 'profile_metrics' in result:
                            metrics = result['profile_metrics']
                            print(f"   [OK] Area: {metrics.get('area_mm2', 0):.2f} mm²")
                            print(f"   [OK] Bounding box: {metrics.get('bounding_box', [])}")
                    else:
                        print(f"   [ERROR] DXF import failed: {response.status_code}")
                        print(f"   Response: {response.text[:200]}")
            break
    except requests.exceptions.ConnectionError:
        continue
    except Exception as e:
        print(f"   [ERROR] Endpoint test failed: {e}")

if not server_found:
    print(f"   [WARN] Backend server not found on ports {test_ports}")
    print(f"   [INFO] Start server with: cd python_backend && uvicorn apis.v2.app:app --reload --port 8003")

print("\n" + "=" * 60)
print("Setup Test Complete!")
print("=" * 60)
print("\nNext steps:")
print("1. Start Celery worker: cd python_backend && celery -A core.celery_app worker --loglevel=info")
print("2. Start backend server: cd python_backend && uvicorn apis.v2.app:app --reload --port 8003")
print("3. Test SmartScan: Upload DXF file via /api/v2/smart-scan/single")
