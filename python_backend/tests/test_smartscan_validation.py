"""
Quick validation script for SmartScan v2.0
Run: python test_smartscan_validation.py
"""

import os
import sys
import requests
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))


def validate_dependencies() -> bool:
    """Check if required dependencies are installed."""
    print("🔍 Checking dependencies...")
    deps = [
        ("opencv-python-headless", "cv2"),
        ("Pillow", "PIL"),
        ("numpy", "numpy"),
        ("easyocr", "easyocr"),  # Optional; will fallback to tesseract
    ]
    missing = []
    for pip_name, import_name in deps:
        try:
            if import_name == "cv2":
                import cv2  # noqa: F401
            elif import_name == "PIL":
                from PIL import Image  # noqa: F401
            else:
                __import__(import_name)
            print(f"  ✅ {pip_name}")
        except ImportError:
            missing.append(pip_name)
            print(f"  ❌ {pip_name}")
    if missing:
        print(f"\n⚠️  Missing dependencies: {', '.join(missing)}")
        print("Install with: pip install " + " ".join(missing))
        return False
    print("✅ All dependencies satisfied")
    return True


def test_endpoints(base_url: str = "http://localhost:8001") -> bool:
    """Test API endpoints."""
    print(f"\n🌐 Testing endpoints at {base_url}...")
    endpoints = [
        "/api/v2/smart-scan/supported-formats",
        "/api/v2/smart-scan/enhanced",
    ]
    for endpoint in endpoints:
        url = base_url + endpoint
        try:
            if "enhanced" in endpoint:
                response = requests.post(url, timeout=5)
            else:
                response = requests.get(url, timeout=5)
            print(f"  {endpoint}: HTTP {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict) and "supported" in data:
                    print(f"    Formats: {', '.join(data['supported'])}")
            else:
                print(f"    Response: {response.text[:200]}")
        except Exception as exc:
            print(f"  ❌ {endpoint}: {exc}")
            return False
    return True


def test_ocr_service() -> bool:
    """Test OCR service directly (if available)."""
    print("\n🔤 Testing OCR service...")
    try:
        from ai_services.vision.ocr_service import TechnicalOCRService

        ocr_service = TechnicalOCRService()
        if getattr(ocr_service, "reader", None):
            print("  ✅ EasyOCR initialized")
        else:
            print("  ⚠️  EasyOCR not available, using Tesseract fallback")

        test_image_path = "test_images/synthetic_test.png"
        if os.path.exists(test_image_path):
            with open(test_image_path, "rb") as f:
                test_data = ocr_service.extract_from_image(f.read())
                print(f"  ✅ OCR service test: {test_data.confidence:.2f} confidence")
        else:
            print("  ⚠️  No test image found, skipping OCR test")
        return True
    except Exception as exc:
        print(f"  ❌ OCR service test failed: {exc}")
        return False


def create_test_image() -> str | None:
    """Create a simple test image with Egyptian profile text."""
    print("\n🎨 Creating synthetic test image...")
    try:
        from PIL import Image, ImageDraw, ImageFont

        img = Image.new("RGB", (800, 400), color="white")
        draw = ImageDraw.Draw(img)

        try:
            font = ImageFont.truetype("arial.ttf", 40)
        except Exception:
            font = ImageFont.load_default()

        texts = [
            "JUMBO 100 PROFILE",
            "WIDTH: 100 MM  HEIGHT: 100 MM",
            "ALUMINIUM WITH THERMAL BREAK",
            "EGYPTIAN STANDARD",
        ]

        y = 50
        for text in texts:
            draw.text((50, y), text, fill="black", font=font)
            y += 60

        test_dir = Path("test_images")
        test_dir.mkdir(parents=True, exist_ok=True)
        test_path = test_dir / "synthetic_test.png"
        img.save(test_path)
        print(f"  ✅ Created: {test_path}")
        return str(test_path)
    except Exception as exc:
        print(f"  ⚠️  Could not create test image: {exc}")
        return None


def run_smartscan_test(image_path: str, base_url: str = "http://localhost:8001") -> bool:
    """Run a complete SmartScan test."""
    print(f"\n🔬 Running SmartScan test on {image_path}...")
    if not os.path.exists(image_path):
        print(f"  ❌ Test image not found: {image_path}")
        return False

    url = base_url + "/api/v2/smart-scan/enhanced"
    try:
        with open(image_path, "rb") as f:
            files = {"file": (os.path.basename(image_path), f, "image/png")}
            data = {"enable_ocr": "true", "require_validation": "true"}
            print(f"  Uploading {os.path.getsize(image_path) / 1024:.1f} KB...")
            response = requests.post(url, files=files, data=data, timeout=30)
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                data = result.get("data", {})
                print("  ✅ Enhanced scan successful!")
                print(f"    Processing time: {data.get('metadata', {}).get('processing_time_ms', 0)}ms")
                tech_data = data.get("technical_data", {}) or {}
                if tech_data:
                    print(f"    OCR Name: {tech_data.get('profile_name', 'None')}")
                    print(f"    OCR Confidence: {tech_data.get('confidence', 0):.2f}")
                    materials = tech_data.get("material_hints", []) or []
                    print(f"    Materials: {', '.join(materials) if materials else 'None'}")
                suggestions = data.get("suggestions", {}) or {}
                if suggestions.get("egyptian_standard_match"):
                    match = suggestions["egyptian_standard_match"]
                    print(f"    Egyptian Standard: {match.get('name')}")
                    print(f"    Match Score: {match.get('match_score', 0):.2f}")
                quality = data.get("quality", {}) or {}
                print(f"    Accuracy Tier: {quality.get('accuracy_tier', 'unknown')}")
                print(f"    Confidence: {quality.get('confidence_score', 0):.2f}")
                return True
            print(f"  ❌ Scan failed: {result.get('error', 'Unknown error')}")
            return False
        print(f"  ❌ HTTP {response.status_code}: {response.text[:200]}")
        return False
    except Exception as exc:
        print(f"  ❌ Test failed: {exc}")
        return False


def main() -> bool:
    """Main validation routine."""
    print("=" * 60)
    print("SMARTSCAN v2.0 VALIDATION SUITE")
    print("=" * 60)

    if not validate_dependencies():
        print("\n❌ Dependencies missing. Please install and retry.")
        return False

    test_image = create_test_image()
    base_url = "http://localhost:8001"
    print(f"\n🚀 Testing against backend at {base_url}")
    print("  (Make sure backend is running: uvicorn apis.main:app --reload --port 8001)")
    input("\nPress Enter to continue...")

    if not test_endpoints(base_url):
        print("\n❌ Endpoint tests failed. Is the backend running?")
        return False

    test_ocr_service()

    if test_image:
        success = run_smartscan_test(test_image, base_url)
        if success:
            print("\n" + "=" * 60)
            print("✅ SMARTSCAN v2.0 VALIDATION PASSED!")
            print("=" * 60)
            print("\nNext steps:")
            print("1. Test with real catalog images")
            print("2. Verify frontend integration")
            print("3. Monitor performance metrics")
            return True
        print("\n❌ SmartScan test failed. Check backend logs.")
        return False

    print("\n⚠️  No test image available. Skipping SmartScan test.")
    return True


if __name__ == "__main__":
    sys.exit(0 if main() else 1)

