import logging
import os
import tempfile
from typing import Any, Dict, List, Optional

import cv2
import easyocr
import numpy as np

from .scale_engine import ScaleDetectionPipeline

logger = logging.getLogger(__name__)


class ScaleDetectorService:
    """
    Wrapper for the advanced scale engine (OCR + lines + consensus).
    """

    def __init__(self, use_gpu: bool = False):
        logger.info(f"Initializing EasyOCR (GPU={use_gpu})...")
        self.reader = easyocr.Reader(["en"], gpu=use_gpu, verbose=False)
        self.pipeline = ScaleDetectionPipeline(
            min_line_length=20,
            max_line_gap=10,
            ocr_confidence_threshold=0.7,
            scale_confidence_gate=0.5,
        )

    def _run_ocr(self, img: np.ndarray) -> List[Dict[str, Any]]:
        """Run EasyOCR and map bboxes to x1,y1,x2,y2 rectangles."""
        results = self.reader.readtext(img, detail=1)
        mapped: List[Dict[str, Any]] = []
        for (bbox, text, conf) in results:
            try:
                xs = [int(float(p[0])) for p in bbox]
                ys = [int(float(p[1])) for p in bbox]
                x1, x2 = min(xs), max(xs)
                y1, y2 = min(ys), max(ys)
                mapped.append(
                    {
                        "text": text,
                        "confidence": float(conf),
                        "bbox": [x1, y1, x2, y2],
                    }
                )
            except Exception:
                continue
        return mapped

    def detect_scale(self, image_bytes: bytes) -> Dict[str, Any]:
        """Decode image, run OCR, and execute the scale detection pipeline."""
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"detected": False, "error": "Image decode failed"}

        ocr_results = self._run_ocr(img)

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name

        try:
            result = self.pipeline.process_image(tmp_path, ocr_results)
            # Choose best association (highest confidence)
            best_assoc = (
                sorted(
                    result.get("associations", []),
                    key=lambda a: a.get("confidence", 0),
                    reverse=True,
                )[0]
                if result.get("associations")
                else None
            )
            resp = {
                "detected": result.get("success", False),
                "scale_mm_per_px": result.get("scale_mm_per_px"),
                "confidence": result.get("scale_confidence"),
                "reference_line": (
                    best_assoc["line"]["pts"]
                    if best_assoc
                    else None
                ),
                "detected_label": (
                    best_assoc["text"]["text"]
                    if best_assoc
                    else None
                ),
                "debug_info": {
                    "method": result.get(
                        "scale_computation", {}
                    ).get("method"),
                    "samples": result.get("scale_computation", {}).get(
                        "n_samples", 0
                    ),
                    "dimensions": len(result.get("detected_dimensions", [])),
                    "lines": len(result.get("detected_lines", [])),
                    "associations": len(result.get("associations", [])),
                    "scale_candidates": result.get(
                        "scale_computation", {}
                    ).get("scale_candidates"),
                    "outliers": result.get("scale_computation", {}).get(
                        "outliers"
                    ),
                },
                "detected_dimensions": result.get("detected_dimensions", []),
                "detected_lines": result.get("detected_lines", []),
                "associations": result.get("associations", []),
                "full_debug": result,
            }
            return resp
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def detect_scale_with_debug(self, image_bytes: bytes) -> Dict[str, Any]:
        """Alias for detect_scale that emphasizes debug payload."""
        return self.detect_scale(image_bytes)

    def create_visualization(self, image_bytes: bytes) -> Optional[bytes]:
        """Create a debug visualization overlay."""
        result = self.detect_scale(image_bytes)
        try:
            from python_backend.helpers.visualization import (
                ScaleDetectionVisualizer,
            )
        except Exception:
            return None
        try:
            return ScaleDetectionVisualizer.create_debug_overlay(
                image_bytes=image_bytes,
                scale_result=result,
                detected_dimensions=result.get("detected_dimensions"),
                detected_lines=result.get("detected_lines"),
                associations=result.get("associations"),
            )
        except Exception:
            return None
