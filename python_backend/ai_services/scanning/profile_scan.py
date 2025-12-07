"""
Profile scanning utilities for SmartScan Tier 1.

Steps:
- Decode uploaded image bytes.
- Preprocess (grayscale, blur, Otsu binarization, small clean-up).
- Extract primary contour and bounding box.
- Vectorize to SVG path (Potrace if available, otherwise contour fallback).
- Compute basic quality heuristics (blur, contrast, fill ratio).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)

try:
    import potracer  # type: ignore
except ImportError:  # pragma: no cover - optional dependency
    potracer = None
    logger.warning("potracer not available; falling back to contour vectorization.")


@dataclass
class ProfileScanResult:
    svg_path: str
    width_px: int
    height_px: int
    aspect_ratio: float
    bbox: Tuple[int, int, int, int]
    quality: Dict[str, float]
    vectorizer: str
    width_mm: Optional[float] = None
    height_mm: Optional[float] = None
    scale_mm_per_px: Optional[float] = None


class ProfileScanner:
    """Pure-Python scanner for catalog profile drawings."""

    @classmethod
    def scan(
        cls,
        image_bytes: bytes,
        scale_mm_per_px: Optional[float] = None,
    ) -> ProfileScanResult:
        image = cls._decode_image(image_bytes)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        blur_sigma = 1.2
        blurred = cv2.GaussianBlur(gray, (5, 5), blur_sigma)

        _, binary_inv = cv2.threshold(
            blurred,
            0,
            255,
            cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU,
        )

        binary_clean = cls._clean_mask(binary_inv)
        main_contour = cls._extract_main_contour(binary_clean)
        x, y, w, h = cv2.boundingRect(main_contour)

        vectorizer_used = "potracer"
        try:
            svg_path = cls._vectorize_with_potracer(binary_clean)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Potrace vectorization failed, using contour fallback: %s", exc)
            svg_path = cls._vectorize_with_contour(main_contour)
            vectorizer_used = "contour"

        if not svg_path:
            svg_path = cls._vectorize_with_contour(main_contour)
            vectorizer_used = "contour"

        aspect_ratio = float(w) / float(h) if h > 0 else 0.0
        fill_ratio = float(cv2.contourArea(main_contour)) / float(
            binary_clean.shape[0] * binary_clean.shape[1]
        )
        blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        contrast_score = float(gray.std())

        width_mm = height_mm = None
        if scale_mm_per_px:
            width_mm = w * scale_mm_per_px
            height_mm = h * scale_mm_per_px

        return ProfileScanResult(
            svg_path=svg_path,
            width_px=int(w),
            height_px=int(h),
            aspect_ratio=aspect_ratio,
            bbox=(int(x), int(y), int(w), int(h)),
            quality={
                "blur_score": blur_score,
                "contrast": contrast_score,
                "fill_ratio": fill_ratio,
            },
            vectorizer=vectorizer_used,
            width_mm=width_mm,
            height_mm=height_mm,
            scale_mm_per_px=scale_mm_per_px,
        )

    @staticmethod
    def _decode_image(image_bytes: bytes) -> np.ndarray:
        arr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Unable to decode image bytes")
        return image

    @staticmethod
    def _clean_mask(binary_mask: np.ndarray) -> np.ndarray:
        kernel = np.ones((3, 3), np.uint8)
        cleaned = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, kernel, iterations=1)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel, iterations=1)
        return cleaned

    @staticmethod
    def _extract_main_contour(binary_mask: np.ndarray) -> np.ndarray:
        contours, _ = cv2.findContours(
            binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        if not contours:
            raise ValueError("No contours detected in scan")
        main = max(contours, key=cv2.contourArea)
        if cv2.contourArea(main) <= 0:
            raise ValueError("Detected contour has zero area")
        return main

    @staticmethod
    def _vectorize_with_contour(contour: np.ndarray) -> str:
        if contour.ndim > 2:
            contour = contour.squeeze()
        approx = cv2.approxPolyDP(contour, 0.01 * cv2.arcLength(contour, True), True)
        pts = approx.reshape(-1, 2).tolist()
        if not pts:
            return ""
        segments = [f"M {pts[0][0]} {pts[0][1]}"]
        segments.extend(f"L {x} {y}" for x, y in pts[1:])
        segments.append("Z")
        return " ".join(segments)

    @staticmethod
    def _vectorize_with_potracer(binary_mask: np.ndarray) -> str:
        if potracer is None:
            raise RuntimeError("potracer not installed")

        # Potracer expects foreground as 1/True values
        bitmap = potracer.Bitmap((binary_mask > 0).astype(np.uint8))
        path = bitmap.trace()

        segments = []
        for curve in path:
            start = curve.start_point
            segments.append(f"M {start.x} {start.y}")
            for segment in curve:
                end = segment.end_point
                if segment.is_corner:
                    c = segment.c
                    segments.append(f"L {c.x} {c.y}")
                    segments.append(f"L {end.x} {end.y}")
                else:
                    c1, c2 = segment.c1, segment.c2
                    segments.append(
                        f"C {c1.x} {c1.y} {c2.x} {c2.y} {end.x} {end.y}"
                    )
            segments.append("Z")

        return " ".join(segments)

