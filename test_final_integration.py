# flake8: noqa
import json
import os
import sys
import time

import requests

AUTH_TOKEN = os.environ.get("SCAN_TEST_AUTH_TOKEN")
BASE_URL = os.environ.get("SCAN_TEST_BASE_URL", "http://localhost:8000")


def print_header(text: str):
    print("\n" + "=" * 70)
    print(f" {text}")
    print("=" * 70)


def test_api_health() -> bool:
    print_header("1. API Health Check")
    try:
        headers = {}
        if AUTH_TOKEN:
            headers["Authorization"] = f"Bearer {AUTH_TOKEN}"
        resp = requests.get(f"{BASE_URL}/api/v2/health", timeout=5, headers=headers)
        if resp.status_code == 200:
            print("API server is running")
            print(f"   Status: {resp.json().get('status', 'unknown')}")
            return True
        print(f"API responded with status: {resp.status_code}")
        return False
    except requests.exceptions.ConnectionError:
        print("Cannot connect to API server")
        print("\nPlease start the server with:")
        print("  cd python_backend")
        print("  uvicorn main:app --reload --host 0.0.0.0 --port 8000")
        return False
    except Exception as exc:  # pragma: no cover
        print(f"Health check failed: {exc}")
        return False


def find_test_image() -> str | None:
    test_files = [
        "profile_sample.jpg",
        "jumbo_100.jpg",
        "test_profile.jpg",
        "../profile_sample.jpg",
        "../test_images/profile_sample.jpg",
    ]
    for path in test_files:
        if os.path.exists(path):
            print(f"Found test image: {path}")
            return path
    print("No test image found. Please specify path manually.")
    return None


def test_tier2_auto_scale(image_path: str):
    print_header("2. Testing Tier 2 Auto-Scale Detection")
    url = f"{BASE_URL}/api/v2/scan/profile"
    print(f"Uploading: {os.path.basename(image_path)}")
    print("Parameters: auto_detect_scale=True, include_debug_overlay=True")

    with open(image_path, "rb") as f:
        files = {"file": (os.path.basename(image_path), f, "image/jpeg")}
        data = {"auto_detect_scale": "true", "include_debug_overlay": "true"}
        headers = {}
        if AUTH_TOKEN:
            headers["Authorization"] = f"Bearer {AUTH_TOKEN}"

        start = time.time()
        try:
            resp = requests.post(url, files=files, data=data, headers=headers, timeout=60)
            elapsed = time.time() - start
            if resp.status_code != 200:
                print(f"Request failed: {resp.status_code}")
                print(f"Response: {resp.text[:500]}")
                return None

            print(f"Request successful ({elapsed:.2f}s)")
            result = resp.json()

            scale_detection = result.get("scaleDetection")
            if scale_detection and scale_detection.get("detected"):
                print("\nSCALE DETECTION RESULTS:")
                print("   - Detected: yes")
                scale_val = scale_detection.get("scale_mm_per_px")
                conf = scale_detection.get("confidence", 0)
                label = scale_detection.get("detected_label")
                print(f"   - Scale: {scale_val:.6f} mm/px")
                print(f"   - Confidence: {conf:.2f}")
                print(f"   - Label: '{label}'")
                if conf > 0.8:
                    workflow = "AUTO-APPLY (High confidence)"
                elif conf > 0.6:
                    workflow = "SUGGEST & VERIFY (Medium confidence)"
                else:
                    workflow = "MANUAL REQUIRED (Low confidence)"
                print(f"   - Workflow: {workflow}")
                suggestion = scale_detection.get("suggestion_text", "N/A")
                print(f"   - Suggestion: {suggestion}")

                expected_scale = 0.1106
                if scale_val:
                    diff = abs(scale_val - expected_scale) / expected_scale * 100
                    if diff < 10:
                        print("   - Validation: Within expected range (+/-10%)")
                    else:
                        print(
                            f"   - Validation: Differs by {diff:.1f}% from expected {expected_scale}"
                        )
            else:
                print("\nSCALE DETECTION: none")

            dimensions = result.get("dimensions", {})
            scale_used = dimensions.get("scale_used")
            print("\nDIMENSIONS:")
            if scale_used is not None:
                print(f"   - Scale used: {scale_used:.6f} mm/px")
            if dimensions.get("mm"):
                print("   - Measurements in mm:")
                for key, val in sorted(dimensions["mm"].items()):
                    print(f"     * {key}: {val:.2f} mm")

            quality = result.get("qualityFlags", {})
            print("\nQUALITY ASSESSMENT:")
            flags = [
                ("Auto-scale detected", quality.get("auto_scale_detected")),
                ("Properly scaled", quality.get("is_properly_scaled")),
                ("Has dimension labels", quality.get("has_dimension_labels")),
                ("High contrast", quality.get("is_high_contrast")),
                ("Clear edges", quality.get("has_clear_edges")),
            ]
            for name, val in flags:
                status = "OK" if val else "FAIL"
                print(f"   - {name}: {status}")

            storage = result.get("storageUrls", {})
            print("\nSTORAGE URLs:")
            print(f"   - SVG: {storage.get('svg_url', 'N/A')}")
            if storage.get("debug_overlay_url"):
                print(f"   - Debug overlay: {storage.get('debug_overlay_url')}")

            print("\nPERFORMANCE:")
            print(f"   - Processing time: {result.get('processing_time_ms', 0)} ms")
            print(f"   - Total time: {elapsed:.2f} s")

            out_file = "tier2_response.json"
            with open(out_file, "w") as outf:
                json.dump(result, outf, indent=2, default=str)
            print(f"\nFull response saved to: {out_file}")
            return result
        except requests.exceptions.Timeout:
            print("Request timed out (60s)")
            return None
        except Exception as exc:  # pragma: no cover
            print(f"Request failed: {exc}")
            return None


def test_tier1_manual_scale(image_path: str):
    print_header("3. Testing Tier 1 Manual Scale Mode")
    url = f"{BASE_URL}/api/v2/scan/profile"
    print(f"Uploading: {os.path.basename(image_path)}")
    print("Parameters: scale_factor=0.1")

    with open(image_path, "rb") as f:
        files = {"file": (os.path.basename(image_path), f, "image/jpeg")}
        data = {"scale_factor": "0.1"}
        headers = {}
        if AUTH_TOKEN:
            headers["Authorization"] = f"Bearer {AUTH_TOKEN}"
        try:
            resp = requests.post(url, files=files, data=data, headers=headers, timeout=30)
            if resp.status_code == 200:
                print("Tier 1 request successful")
                result = resp.json()
                dims = result.get("dimensions", {})
                print(f"   - Scale used: {dims.get('scale_used', 'N/A')}")
                print(
                    f"   - Scale detection included: {result.get('scaleDetection') is not None}"
                )
                return result
            print(f"Tier 1 failed: {resp.status_code}")
            return None
        except Exception as exc:  # pragma: no cover
            print(f"Tier 1 request failed: {exc}")
            return None


def test_confidence_scenarios():
    print_header("4. Confidence Threshold Analysis")
    print("Based on JUMBO 100 result (confidence: ~0.68):\n")
    scenarios = [
        (0.90, "High Confidence"),
        (0.68, "Actual"),
        (0.50, "Low Confidence"),
    ]
    for conf, label in scenarios:
        print(f"Scenario: {label}")
        print(f"   Confidence: {conf:.2f}")
        if conf > 0.8:
            action = "AUTO-APPLY"
            ui = "Auto-fill scale; show success"
        elif conf > 0.6:
            action = "SUGGEST & VERIFY"
            ui = "Show suggestion with Apply button"
        else:
            action = "MANUAL REQUIRED"
            ui = "Show warning; manual entry"
        print(f"   -> Action: {action}")
        print(f"   -> UI: {ui}\n")


def generate_frontend_spec():
    print_header("5. Frontend Integration Guide")
    print(
        """
API CONTRACT:
POST /api/v2/scan/profile
  - file (image, required)
  - auto_detect_scale (bool)
  - scale_factor (number, optional)
  - include_debug_overlay (bool)

RESPONSE (key fields):
  svgPath
  dimensions: { pixels, mm, scale_used }
  qualityFlags
  storageUrls
  scaleDetection: {
    detected, scale_mm_per_px, confidence, detected_label,
    reference_line, suggestion_text, debug_info
  }

CONFIDENCE WORKFLOW:
  >0.8: Auto-apply
  0.6-0.8: Suggest & verify
  <0.6: Manual required

FRONTEND STEPS:
  1) Upload image with auto_detect_scale=true
  2) Read scaleDetection; use suggestion_text
  3) Apply based on confidence gates
  4) Provide manual override
  5) Optionally display debug overlay
"""
    )


def main() -> int:
    print("\n" + "TIER 2 BACKEND VALIDATION SUITE")
    print("=" * 70)
    if not test_api_health():
        return 1

    image_path = find_test_image()
    if not image_path:
        if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
            image_path = sys.argv[1]
            print(f"Using specified image: {image_path}")
        else:
            print("\nUsage: python test_final_integration.py [image_path]")
            return 1

    tier2_result = test_tier2_auto_scale(image_path)
    if tier2_result:
        test_tier1_manual_scale(image_path)
        test_confidence_scenarios()
        generate_frontend_spec()
        print_header("VALIDATION COMPLETE")
        sd = tier2_result.get("scaleDetection", {})
        conf = sd.get("confidence", 0)
        print("\nSUMMARY:")
        print("- Tier 2 Backend: IMPLEMENTED")
        print(f"- Scale Detection: {'SUCCESS' if sd.get('detected') else 'FAILED'}")
        print(f"- Confidence Score: {conf:.2f}")
        if conf > 0.8:
            print("- Workflow: AUTO-APPLY")
        elif conf > 0.6:
            print("- Workflow: SUGGEST & VERIFY")
        else:
            print("- Workflow: MANUAL REQUIRED")
        print("\nReady for frontend integration!")
        return 0

    print_header("VALIDATION FAILED")
    return 1


if __name__ == "__main__":
    sys.exit(main())

