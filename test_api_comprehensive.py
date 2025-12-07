"""
Comprehensive SmartScan API tests.
Requires backend running at http://localhost:8001.
"""
import os
import json
import tempfile
import requests
import cv2
import numpy as np

BASE_URL = "http://localhost:8001/api/v2/smart-scan"


def create_test_image(width=600, height=400):
    """Create a high-contrast test image representing a profile."""
    img = np.ones((height, width, 3), dtype=np.uint8) * 255
    cv2.rectangle(img, (100, 100), (width - 100, height - 100), (0, 0, 0), -1)
    return img


def test_single_scan():
    """Test single file upload."""
    print("🧪 Testing /single endpoint...")

    img = create_test_image()
    _, buffer = cv2.imencode(".jpg", img)

    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(buffer.tobytes())
        image_path = tmp.name

    try:
        with open(image_path, "rb") as f:
            files = {"file": ("test_profile.jpg", f, "image/jpeg")}
            data = {"known_width_mm": "100", "auto_detect_scale": "true"}
            response = requests.post(f"{BASE_URL}/single", files=files, data=data)

        print(f"  Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("  ✅ Success!")
            print(f"     SVG length: {len(result['data']['svg_path'])} chars")
            print(
                "     Dimensions: "
                f"{result['data']['dimensions']['width_mm']}mm x "
                f"{result['data']['dimensions']['height_mm']}mm"
            )
            print(f"     Confidence: {result['data']['quality']['confidence_score']}")
            return True
        else:
            print(f"  ❌ Failed: {response.text[:200]}")
            return False
    finally:
        os.unlink(image_path)


def test_batch_scan():
    """Test batch file upload."""
    print("\n🧪 Testing /batch endpoint...")
    files_data = []
    for i in range(2):
        img = create_test_image(600 + i * 100, 400 + i * 50)
        _, buffer = cv2.imencode(".jpg", img)
        files_data.append(
            ("files", (f"profile_{i}.jpg", buffer.tobytes(), "image/jpeg"))
        )

    try:
        response = requests.post(f"{BASE_URL}/batch", files=files_data)
        print(f"  Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("  ✅ Batch successful!")
            print(f"     Session ID: {result['session_id']}")
            print(f"     Successful: {result['successful']}/{result['total_files']}")
            return True
        else:
            print(f"  ❌ Failed: {response.text[:200]}")
            return False
    except Exception as exc:  # pragma: no cover - network/IO
        print(f"  ❌ Exception: {exc}")
        return False


def test_format_support():
    """Test supported formats endpoint."""
    print("\n🧪 Testing /supported-formats endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/supported-formats")
        if response.status_code == 200:
            result = response.json()
            print("  ✅ Supported formats:")
            for fmt in result["supported"]:
                print(f"     - {fmt}")
            print(f"  Notes: {json.dumps(result['notes'], indent=4)}")
            return True
        else:
            print(f"  ❌ Failed: {response.text}")
            return False
    except Exception as exc:  # pragma: no cover - network/IO
        print(f"  ❌ Exception: {exc}")
        return False


def main():
    print("=" * 60)
    print("🔬 SMARTSCAN API COMPREHENSIVE TEST SUITE")
    print("=" * 60)

    try:
        requests.get("http://localhost:8001/docs", timeout=2)
        print("✅ Backend server is running")
    except Exception:
        print("❌ Backend server not detected")
        print("   Start with: cd python_backend && uvicorn apis.main:app --reload --port 8001")
        return

    tests = [
        ("Format Support", test_format_support),
        ("Single Scan", test_single_scan),
        ("Batch Scan", test_batch_scan),
    ]

    results = []
    for name, fn in tests:
        try:
            ok = fn()
            results.append((name, ok))
        except Exception as exc:  # pragma: no cover
            print(f"  ❌ {name} crashed: {exc}")
            results.append((name, False))

    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    for name, ok in results:
        status = "✅ PASS" if ok else "❌ FAIL"
        print(f"{status:10} {name}")

    all_passed = all(ok for _, ok in results)
    if all_passed:
        print("\n🎉 ALL API TESTS PASSED!")
        print("SmartScan Core is ready for frontend integration.")
    else:
        print("\n⚠️  SOME TESTS FAILED")
        print("Check the output above for details.")
    print("=" * 60)


if __name__ == "__main__":
    main()

