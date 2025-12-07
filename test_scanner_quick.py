import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "python_backend"))


def quick_test():
    """Quick smoke test of the scanner core."""
    try:
        from ai_services.vision.profile_scanner import ProfileScanner
        import cv2
        import numpy as np

        print("[SmartScan] Testing ProfileScanner...")

        # Create simple test image
        img = np.ones((400, 600, 3), dtype=np.uint8) * 255
        cv2.rectangle(img, (100, 100), (500, 300), (0, 0, 0), 2)

        # Encode to bytes
        _, buffer = cv2.imencode(".png", img)
        image_bytes = buffer.tobytes()

        scanner = ProfileScanner()
        result = scanner.process_image(image_bytes)

        print("[SmartScan] Success")
        print(f"   SVG length: {len(result['svg_path'])} chars")
        print(
            f"   Dimensions: {result['dimensions']['width_mm']}mm x "
            f"{result['dimensions']['height_mm']}mm"
        )
        print(f"   Confidence: {result['quality']['confidence_score']}")

        svg_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg width="600" height="400" viewBox="0 0 600 400">
<path d="{result['svg_path']}" fill="black"/>
</svg>"""

        with open("test_output.svg", "w") as f:
            f.write(svg_content)

        print("[SmartScan] SVG saved to: test_output.svg")
        return True
    except Exception as exc:  # pragma: no cover - smoke test helper
        print(f"[SmartScan] Test failed: {exc}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = quick_test()
    sys.exit(0 if success else 1)

