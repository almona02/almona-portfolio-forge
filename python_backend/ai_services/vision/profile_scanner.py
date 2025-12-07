import cv2
import numpy as np
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Potrace / potracer fallback
try:
    import potrace
    POTRACE_AVAILABLE = True
except ImportError:
    try:
        import potracer.potrace as potrace
        POTRACE_AVAILABLE = True
        logger.info("Using potracer (Python) instead of potrace (C)")
    except ImportError:
        POTRACE_AVAILABLE = False
        logger.error("Neither potrace nor potracer available!")


class ProfileScanner:
    """Industrial-grade profile scanner: raster -> SVG path + dimensions."""

    MAX_IMAGE_DIMENSION = 5000  # px

    def __init__(self, enable_ocr: bool = True):
        if not POTRACE_AVAILABLE:
            raise ImportError("Potrace/potracer not installed. Run: pip install potracer")
        self.blur_kernel = (5, 5)
        self.min_profile_size_mm = 10
        self.max_profile_size_mm = 300
        self.enable_ocr = enable_ocr  # reserved hook for future OCR scale detection

    # ---------- preprocessing ----------
    def _create_clean_bitmap(self, image: np.ndarray) -> np.ndarray:
        """Preprocessing pipeline to clean noisy catalog scans."""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        denoised = cv2.bilateralFilter(gray, 9, 75, 75)

        binary = cv2.adaptiveThreshold(
            denoised,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            11,
            2,
        )

        kernel = np.ones((3, 3), np.uint8)
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
        return cleaned

    # ---------- vectorization ----------
    def _trace_to_svg_path(self, binary: np.ndarray) -> str:
        """Convert binary bitmap to SVG Path using Potrace."""
        if not POTRACE_AVAILABLE:
            raise RuntimeError("Potrace not available")

        try:
            bitmap = potrace.Bitmap(binary)
            turn_policy = getattr(
                potrace,
                "TURNPOLICY_MINORITY",
                getattr(potrace, "POTRACE_TURNPOLICY_MINORITY", 0),
            )
            path = bitmap.trace(
                turdsize=2,
                turnpolicy=turn_policy,
                alphamax=1,
            )

            svg_parts = []
            for curve in path:
                parts = []
                start = curve.start_point
                parts.append(f"M {start.x:.2f} {start.y:.2f}")
                for segment in curve:
                    if segment.is_corner:
                        c = segment.c
                        end = segment.end_point
                        parts.append(
                            f"L {c.x:.2f} {c.y:.2f} L {end.x:.2f} {end.y:.2f}"
                        )
                    else:
                        c1 = segment.c1
                        c2 = segment.c2
                        end = segment.end_point
                        parts.append(
                            f"C {c1.x:.2f} {c1.y:.2f} "
                            f"{c2.x:.2f} {c2.y:.2f} "
                            f"{end.x:.2f} {end.y:.2f}"
                        )
                parts.append("Z")
                svg_parts.append(" ".join(parts))

            return " ".join(svg_parts)
        except Exception as exc:  # pragma: no cover - defensive
            logger.error("Vectorization failed: %s", exc)
            raise ValueError(f"Vectorization failed: {str(exc)}") from exc

    # ---------- scale heuristics ----------
    def _get_sensible_scale(self, img_width_px: int) -> float:
        if img_width_px > 2500:
            return 0.04  # high-res ~600 DPI
        elif img_width_px > 1500:
            return 0.07  # medium-res ~300 DPI
        elif img_width_px > 800:
            return 0.12  # low-res ~150 DPI
        return 0.25  # thumbnail / screen capture

    # ---------- main pipeline ----------
    def process_image(
        self, image_bytes: bytes, known_width_mm: Optional[float] = None
    ) -> Dict[str, Any]:
        """Bytes -> SVG path + dimensions with basic QA."""
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image")

        if img.shape[0] > self.MAX_IMAGE_DIMENSION or img.shape[1] > self.MAX_IMAGE_DIMENSION:
            raise ValueError(
                f"Image too large: {img.shape[1]}x{img.shape[0]}. "
                f"Max {self.MAX_IMAGE_DIMENSION}px"
            )

        binary = self._create_clean_bitmap(img)
        svg_path = self._trace_to_svg_path(binary)

        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            min_area = binary.size * 0.005
            valid = [c for c in contours if cv2.contourArea(c) > min_area]
            main_contour = max(valid, key=cv2.contourArea) if valid else max(
                contours, key=cv2.contourArea
            )
            x, y, w, h = cv2.boundingRect(main_contour)
            contour_area = cv2.contourArea(main_contour)
        else:
            w, h = img.shape[1], img.shape[0]
            contour_area = 0

        if known_width_mm:
            scale_mm_per_px = known_width_mm / w if w > 0 else 0.1
            scale_source = "user_input"
            confidence = 0.95
        else:
            scale_mm_per_px = self._get_sensible_scale(img.shape[1])
            scale_source = "heuristic"
            confidence = 0.5

        width_mm = w * scale_mm_per_px
        height_mm = h * scale_mm_per_px

        validation_errors = []
        if not (self.min_profile_size_mm <= width_mm <= self.max_profile_size_mm):
            validation_errors.append(f"Width {width_mm:.1f}mm outside realistic range")
        if not (self.min_profile_size_mm <= height_mm <= self.max_profile_size_mm):
            validation_errors.append(f"Height {height_mm:.1f}mm outside realistic range")
        if len(svg_path) < 50:
            validation_errors.append("SVG path too short")

        return {
            "svg_path": svg_path,
            "view_box": f"0 0 {img.shape[1]} {img.shape[0]}",
            "dimensions": {
                "width_mm": round(width_mm, 2),
                "height_mm": round(height_mm, 2),
                "scale_mm_per_px": round(scale_mm_per_px, 4),
                "scale_source": scale_source,
            },
            "quality": {
                "confidence_score": confidence,
                "requires_verification": len(validation_errors) > 0,
                "validation_errors": validation_errors,
            },
            "metadata": {
                "resolution": f"{img.shape[1]}x{img.shape[0]}",
                "contour_area": int(contour_area),
                "processing_time_ms": 0,
            },
        }

