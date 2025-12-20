#!/usr/bin/env python3
"""
Test DXF file processing for SmartScan to diagnose the enqueue failure
"""
import sys
import io
from pathlib import Path

# Test 1: Check if FormatConverter can handle DXF
print("=" * 60)
print("TEST 1: FormatConverter DXF Support")
print("=" * 60)
try:
    from ai_services.vision.format_converter import FormatConverter
    
    dxf_file = Path("../public/PROFILES/MC 1250 .dxf")
    if not dxf_file.exists():
        print(f"ERROR: DXF file not found: {dxf_file}")
        sys.exit(1)
    
    file_bytes = dxf_file.read_bytes()
    print(f"[OK] File read: {len(file_bytes)} bytes")
    
    # Check if can convert
    can_convert, error = FormatConverter.can_convert("MC 1250 .dxf")
    print(f"[OK] Can convert: {can_convert}, Error: {error}")
    
    # Try to convert to image
    print("\nAttempting DXF to image conversion...")
    try:
        images = FormatConverter.convert_to_images(file_bytes, "MC 1250 .dxf", max_images=1)
        print(f"[OK] Conversion successful: {len(images)} image(s)")
        print(f"  First image size: {len(images[0])} bytes")
    except Exception as e:
        print(f"[ERROR] Conversion failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
        
except Exception as e:
    print(f"[ERROR] FormatConverter test failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 2: Check Celery task registration
print("\n" + "=" * 60)
print("TEST 2: Celery Task Registration")
print("=" * 60)
try:
    from core.celery_app import celery_app
    from tasks.heavy_computation_tasks import smart_scan_single_task
    
    print(f"[OK] Celery app loaded")
    print(f"[OK] Task registered: {smart_scan_single_task.name}")
    print(f"  Broker: {celery_app.conf.broker_url[:50]}..." if hasattr(celery_app.conf, 'broker_url') and celery_app.conf.broker_url else "  Broker: Not configured")
    print(f"  Backend: {celery_app.conf.result_backend[:50]}..." if hasattr(celery_app.conf, 'result_backend') and celery_app.conf.result_backend else "  Backend: Not configured")
    
    # Try to enqueue a test task (dry run)
    print("\nAttempting to enqueue test task...")
    try:
        # Don't actually call delay() as it requires Redis
        print("  (Skipping actual enqueue - requires Redis connection)")
        print("  Task signature:", smart_scan_single_task.signature())
    except Exception as e:
        print(f"[ERROR] Task enqueue test failed: {e}")
        import traceback
        traceback.print_exc()
        
except Exception as e:
    print(f"[ERROR] Celery test failed: {e}")
    import traceback
    traceback.print_exc()

# Test 3: Check if DXF can be processed directly (alternative)
print("\n" + "=" * 60)
print("TEST 3: Direct DXF Processing (Alternative)")
print("=" * 60)
try:
    from core.cad_ingest import CadProfileIngestor
    
    ingestor = CadProfileIngestor("aluminium")
    result = ingestor.process_dxf(file_bytes)
    
    if result.get("status") == "success":
        print("[OK] Direct DXF processing successful")
        metrics = result.get("profile_metrics", {})
        print(f"  Area: {metrics.get('area_mm2', 0):.2f} mm2")
        print(f"  Perimeter: {metrics.get('perimeter_mm', 0):.2f} mm")
        print(f"  Bounding box: {metrics.get('bounding_box', [])}")
    else:
        print(f"[ERROR] Direct DXF processing failed: {result.get('error', 'Unknown error')}")
        
except Exception as e:
    print(f"[ERROR] Direct processing test failed: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print("If FormatConverter works but Celery fails, the issue is likely:")
print("  1. Redis/Celery broker not running")
print("  2. Celery worker not started")
print("  3. Redis connection configuration issue")
print("\nAlternative: Use direct DXF processing via /api/v2/profile-import/ingest")
print("=" * 60)

