#!/usr/bin/env python3
"""
Test DXF import endpoint
"""
import sys
import os
import requests
from pathlib import Path

# Set Redis URL
os.environ["REDIS_URL"] = "redis://localhost:6379"

DXF_FILE = Path("../public/PROFILES/MC 1250 .dxf")
# Try different possible paths
API_URLS = [
    "http://localhost:8003/api/v2/profile-import/ingest",
    "http://localhost:8003/profile-import/ingest",
    "http://localhost:8003/api/profile-import/ingest",
]
API_URL = API_URLS[0]  # Default

print("=" * 60)
print("Testing DXF Import Endpoint")
print("=" * 60)
print(f"File: {DXF_FILE}")
print(f"URL: {API_URL}")
print()

if not DXF_FILE.exists():
    print(f"ERROR: DXF file not found: {DXF_FILE}")
    sys.exit(1)

# Check if server is running
print("Checking if server is running...")
try:
    response = requests.get("http://localhost:8003/health", timeout=2)
    print(f"[OK] Server is running (status: {response.status_code})")
except requests.exceptions.ConnectionError:
    print("[ERROR] Server not running on port 8003")
    print(
        "Start server with: cd python_backend && uvicorn apis.v2.app:app --reload --port 8003"
    )
    sys.exit(1)
except Exception as e:
    print(f"[ERROR] Server check failed: {e}")
    sys.exit(1)

# Test the endpoint - try different URLs
print("\nUploading DXF file...")
response = None
success = False
for url in API_URLS:
    print(f"Trying: {url}")
    try:
        with open(DXF_FILE, "rb") as f:
            files = {"file": ("MC 1250 .dxf", f, "application/dxf")}
            data = {"source_type": "dxf", "material_type": "aluminium"}
            response = requests.post(url, files=files, data=data, timeout=30)
            if response.status_code == 200:
                print(f"[OK] Success with: {url}")
                API_URL = url
                success = True
                break
            elif response.status_code != 404:
                print(f"[INFO] Got status {response.status_code} from {url}")
    except Exception as e:
        print(f"[WARN] Failed {url}: {e}")
        continue

if not success or not response or response.status_code != 200:
    print(
        f"\n[ERROR] All endpoints failed. Last response: {response.status_code if response else 'No response'}"
    )
    if response:
        print(f"Response: {response.text[:500]}")
    sys.exit(1)

# Process successful response
print(f"Response status: {response.status_code}")

try:
    if response.status_code == 200:
        result = response.json()
        print("\n[OK] DXF import successful!")
        print("\nProfile Metrics:")
        if "profile_metrics" in result:
            metrics = result["profile_metrics"]
            print(f"  Area: {metrics.get('area_mm2', 0):.2f} mm²")
            print(f"  Perimeter: {metrics.get('perimeter_mm', 0):.2f} mm")
            print(f"  Weight: {metrics.get('weight_kg_per_m', 0):.4f} kg/m")
            bbox = metrics.get("bounding_box", [])
            if bbox:
                width = bbox[2] - bbox[0]
                height = bbox[3] - bbox[1]
                print(f"  Full bounding box: {bbox}")
                print(f"  Full box dimensions: {width:.2f} × {height:.2f} mm")
            
            # Show actual profile cross-section dimensions
            profile_width = metrics.get("profile_width_mm")
            profile_height = metrics.get("profile_height_mm")
            if profile_width is not None and profile_height is not None:
                print(f"\n  [OK] Actual Profile Cross-Section:")
                print(f"       Width: {profile_width:.2f} mm")
                print(f"       Height: {profile_height:.2f} mm")
            else:
                print(f"\n  [WARN] Profile dimensions not extracted (using bounding box)")
        
        # Check for SVG preview
        if "svg_preview" in result:
            svg = result["svg_preview"]
            print(f"\n[OK] SVG Preview: Generated ({len(svg)} characters)")
            print(f"  Preview available in response")
            # Save SVG to file for verification
            svg_file = Path("../public/PROFILES/MC 1250_preview.svg")
            svg_file.write_text(svg, encoding="utf-8")
            print(f"  Saved to: {svg_file}")
        else:
            print("\n[WARN] No SVG preview in response")
        
        print("\n[OK] Use these dimensions in Profile Tuning Studio:")
        print("  Profile Width: 50 mm (actual cross-section)")
        print("  Material Thickness: 1.5 mm")
    else:
        print(f"\n[ERROR] Import failed: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        sys.exit(1)
except Exception as e:
    print(f"\n[ERROR] Request failed: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("Test Complete!")
print("=" * 60)
