import logging
import time
import re
from typing import Dict, Optional, Any

import numpy as np

from ai_services.vision.profile_scanner import ProfileScanner
from ai_services.vision.ocr_service import TechnicalOCRService
from ai_services.vision.egyptian_standards import EgyptianStandardsMatcher
from ai_services.vision.profile_geometry import ProfileGeometryAnalyzer
from middleware.smartscan_logger import SmartScanMetricLogger

logger = logging.getLogger(__name__)


class EnhancedProfileScanner:
    """
    Wrapper that augments ProfileScanner with scale detector, OCR extraction,
    and Egyptian standards matching. Designed to fail gracefully if auxiliary
    services are unavailable.
    """

    def __init__(self, enable_ocr: bool = True):
        # base handles vectorization/heuristics
        self.base_scanner = ProfileScanner(enable_ocr=False)
        self.enable_ocr = enable_ocr
        self.ocr_service = TechnicalOCRService() if enable_ocr else None
        self.standards_matcher = EgyptianStandardsMatcher()
        try:
            from ai_services.scanning.scale_detector import (
                ScaleDetectorService,
            )

            self.scale_detector = ScaleDetectorService(use_gpu=False)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("ScaleDetectorService unavailable: %s", exc)
            self.scale_detector = None

    def _compute_px_from_dims(
        self, dims: Dict[str, Any]
    ) -> Optional[Dict[str, float]]:
        """Derive px dimensions via view_box or scale when needed."""
        width_px = dims.get("width_px")
        height_px = dims.get("height_px")
        scale = dims.get("scale_mm_per_px")
        width_mm_val = dims.get("width_mm")
        height_mm_val = dims.get("height_mm")
        if (width_px is None or height_px is None) and scale:
            try:
                width_px = width_px or (
                    width_mm_val / scale if width_mm_val else None
                )
                height_px = height_px or (
                    height_mm_val / scale if height_mm_val else None
                )
            except Exception:
                width_px = width_px
                height_px = height_px
        if isinstance(width_px, (int, float)) and isinstance(
            height_px, (int, float)
        ):
            return {
                "width_px": float(width_px),
                "height_px": float(height_px),
            }
        return None

    def _apply_scale_override(
        self,
        result: Dict[str, Any],
        override_scale: float,
        confidence: float,
        source: str,
    ) -> Dict[str, Any]:
        """Apply a better scale to dimensions and attach metadata."""
        dims = result.get("dimensions", {})
        width_mm = dims.get("width_mm")
        height_mm = dims.get("height_mm")
        if width_mm is None or height_mm is None:
            return result

        px_dims = self._compute_px_from_dims(dims)
        if not px_dims:
            return result

        width_mm_new = px_dims["width_px"] * override_scale
        height_mm_new = px_dims["height_px"] * override_scale

        result["dimensions"] = {
            **dims,
            "width_mm": round(width_mm_new, 2),
            "height_mm": round(height_mm_new, 2),
            "scale_mm_per_px": round(override_scale, 4),
            "scale_source": source,
            "enhanced_scale": {
                "method": source,
                "scale_mm_per_px": override_scale,
                "confidence": confidence,
            },
            "scale_confidence": confidence,
        }
        quality = result.get("quality", {})
        base_conf = quality.get("confidence_score", 0) or 0
        quality["confidence_score"] = max(base_conf, confidence)
        quality.setdefault("validation_errors", [])
        result["quality"] = quality
        return result

    def _enhance_with_scale_detector(
        self, image_bytes: bytes, result: Dict[str, Any]
    ) -> Dict[str, Any]:
        if not self.scale_detector:
            return result
        try:
            det = self.scale_detector.detect_scale(image_bytes)
            if (
                det.get("detected")
                and det.get("confidence", 0) > 0.6
                and det.get("scale_mm_per_px")
            ):
                result = self._apply_scale_override(
                    result,
                    override_scale=det["scale_mm_per_px"],
                    confidence=det["confidence"],
                    source="scale_detector",
                )
                result.setdefault("metadata", {})["scale_detector"] = det
            return result
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("ScaleDetectorService failed: %s", exc)
        return result

    def _extract_technical_data(self, image_bytes: bytes) -> Dict[str, Any]:
        """Use OCR service to extract structured technical data."""
        if not self.ocr_service:
            return {
                "raw_texts": [],
                "profile_name": None,
                "dimension_labels": [],
                "material_hints": [],
                "thermal_break_mentions": None,
                "detected_brands": [],
                "confidence": 0.0,
                "weight_kg_per_m": None,
            }
        try:
            technical = self.ocr_service.extract_from_image(image_bytes)
            return {
                "raw_texts": technical.raw_texts,
                "profile_name": technical.profile_name,
                "dimension_labels": technical.dimensions,
                "material_hints": technical.material_hints,
                "thermal_break_mentions": technical.thermal_break,
                "detected_brands": technical.detected_brands,
                "confidence": technical.confidence,
                "weight_kg_per_m": None,
            }
        except Exception as exc:  # pragma: no cover - defensive
            logger.error("Technical data extraction failed: %s", exc)
            return {
                "raw_texts": [],
                "profile_name": None,
                "dimension_labels": [],
                "material_hints": [],
                "thermal_break_mentions": None,
                "detected_brands": [],
                "confidence": 0.0,
                "weight_kg_per_m": None,
            }

    def _match_egyptian_standard(
        self, dimensions: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Match to Egyptian standard profiles."""
        try:
            return self.standards_matcher.match_profile(
                float(dimensions.get("width_mm", 0)),
                float(dimensions.get("height_mm", 0)),
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Standards matching failed: %s", exc)
            return None

    def _infer_material(
        self, ocr_data: Dict[str, Any], dimensions: Dict[str, Any]
    ) -> str:
        """Infer material using OCR hints, standards, and size heuristics."""
        if ocr_data.get("material_hints"):
            return ocr_data["material_hints"][0]

        standard_match = self._match_egyptian_standard(dimensions)
        if standard_match:
            return standard_match.get("material", "aluminum")

        # Heuristic: large profiles likely aluminum
        if (
            dimensions.get("width_mm", 0) >= 100
            or dimensions.get("height_mm", 0) >= 100
        ):
            return "aluminum"
        return "upvc"

    def _suggest_profile_name(
        self, ocr_data: Dict[str, Any], dimensions: Dict[str, Any]
    ) -> str:
        """Suggest profile name from OCR or standards."""
        if ocr_data.get("profile_name"):
            return ocr_data["profile_name"]
        standard_match = self._match_egyptian_standard(dimensions)
        if standard_match:
            return standard_match["name"]
        material = self._infer_material(ocr_data, dimensions)
        width_val = dimensions.get("width_mm", 0) if dimensions else 0
        width = int(round(width_val / 10) * 10) if width_val else 0
        return f"{material.upper()}_{width or 'PROFILE'}"

    def _calculate_enhanced_confidence(
        self, base_conf: float, scale_conf: float, ocr_conf: float
    ) -> float:
        """Blend confidence scores from base, scale detector, and OCR."""
        weights = [0.6, 0.25, 0.15]
        confs = [base_conf or 0, scale_conf or 0, ocr_conf or 0]
        blended = sum(c * w for c, w in zip(confs, weights))
        return round(min(max(blended, 0.0), 1.0), 3)

    def _determine_accuracy_tier(
        self, confidence: float, requires_verification: bool
    ) -> str:
        if confidence >= 0.82 and not requires_verification:
            return "production"
        if confidence >= 0.65:
            return "verified_required"
        return "review_required"

    def _generate_verification_notes(
        self,
        base_result: Dict[str, Any],
        enhanced_scale: Optional[Dict[str, Any]],
        ocr_data: Dict[str, Any],
    ) -> list:
        notes = []
        if enhanced_scale:
            notes.append(
                f"Enhanced scale applied via {enhanced_scale.get('method')} "
                f"(confidence {enhanced_scale.get('confidence', 0):.2f})"
            )
        if ocr_data.get("confidence", 0) < 0.3:
            notes.append("OCR confidence low; verify labels and dimensions.")
        if base_result.get("quality", {}).get("validation_errors"):
            notes.extend(base_result["quality"]["validation_errors"])
        return notes

    def _convert_numpy_types(self, obj: Any) -> Any:
        """Convert numpy scalars to native Python for JSON serialization."""
        if isinstance(obj, (np.integer, np.floating)):
            return obj.item()
        if isinstance(obj, dict):
            return {k: self._convert_numpy_types(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [self._convert_numpy_types(v) for v in obj]
        if isinstance(obj, tuple):
            return tuple(self._convert_numpy_types(v) for v in obj)
        return obj

    def _extract_profile_code(self, texts: list[str]) -> Optional[str]:
        """Detect fenestration profile codes (e.g., 1 061 1130, 6063-T5)."""
        patterns = [
            (
                r"\b(\d+)\s+(\d+)\s+(\d+)\b",
                lambda m: f"{m.group(1)}_{m.group(2)}_{m.group(3)}",
            ),
            (
                r"\b(\d+)\s+(\d+)\s+(\d+)\s+\d+(?:\.\d+)?\b",
                lambda m: f"{m.group(1)}_{m.group(2)}_{m.group(3)}",
            ),
            (
                r"\b(\d+:\d+)\s+(\d+)\b",
                lambda m: f"{m.group(1)}_{m.group(2)}",
            ),
            (
                r"\b([A-Z]+)(\d+)[-_](\d+)\b",
                lambda m: f"{m.group(1)}{m.group(2)}_{m.group(3)}",
            ),
            (
                r"\b(\d+[A-Z]+[-_]?\d+)\b",
                lambda m: m.group(1).replace("-", "_"),
            ),
            (r"\b([A-Z]+\d+[A-Z]*)\b", lambda m: m.group(1)),
        ]
        best_code = None
        best_score = -1
        for text in texts:
            upper = text.upper()
            has_weight = "KG" in upper
            for pattern, formatter in patterns:
                for match in re.finditer(pattern, text):
                    code = formatter(match).upper()
                    score = len(code)
                    if has_weight:
                        score += 3
                    if any(ch.isalpha() for ch in code):
                        score += 1
                    if score > best_score:
                        best_score = score
                        best_code = code
        return best_code

    def _extract_weight(self, texts: list[str]) -> Optional[float]:
        """Extract weight annotations such as '1.241 kg/ml' or '1.24 kg/m'."""
        patterns = [
            r"(\d+\.?\d*)\s*KG/ML",
            r"(\d+\.?\d*)\s*KG/M(?![A-Z])",
            r"(\d+\.?\d*)\s*KG\b",
            r"WEIGHT[:\s]+(\d+\.?\d*)",
        ]
        for text in texts:
            upper = text.upper()
            for pattern in patterns:
                match = re.search(pattern, upper)
                if match:
                    try:
                        return float(match.group(1))
                    except Exception:
                        continue
        return None

    def _extract_dimension_callouts(self, texts: list[str]) -> list[float]:
        """Pull numeric callouts like 61.00, 28.00 from OCR text."""
        dims: list[float] = []
        pattern = r"\b\d+\.\d{2}\b"
        for text in texts:
            for match in re.findall(pattern, text):
                try:
                    val = float(match)
                    if 5.0 <= val <= 500.0:
                        dims.append(val)
                except Exception:
                    continue
        # deduplicate and sort descending
        uniq = sorted({round(d, 2) for d in dims}, reverse=True)
        return uniq

    def scan_with_enhancements(
        self,
        image_bytes: bytes,
        known_width_mm: Optional[float] = None,
        enable_ocr: Optional[bool] = None,
        filename: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Run base scanner, apply scale detector override,
        OCR extraction, suggestions/tiers, and emit structured scan logs.
        """
        start_time = time.time()
        name = filename or "upload"
        SmartScanMetricLogger.log_scan_start(
            scan_type="enhanced", filename=name, file_size=len(image_bytes)
        )

        try:
            base_result = self.base_scanner.process_image(
                image_bytes, known_width_mm=known_width_mm
            )
            enhanced = self._enhance_with_scale_detector(
                image_bytes, base_result
            )

            use_ocr = self.enable_ocr if enable_ocr is None else enable_ocr
            ocr_data = (
                self._extract_technical_data(image_bytes)
                if use_ocr
                else {
                    "raw_texts": [],
                    "profile_name": None,
                    "dimension_labels": [],
                    "material_hints": [],
                    "thermal_break_mentions": None,
                    "detected_brands": [],
                    "confidence": 0.0,
                    "weight_kg_per_m": None,
                }
            )
            # Fenestration-aware enrichments
            fen_code = self._extract_profile_code(
                ocr_data.get("raw_texts", [])
            )
            weight = self._extract_weight(ocr_data.get("raw_texts", []))
            callouts = self._extract_dimension_callouts(
                ocr_data.get("raw_texts", [])
            )
            if fen_code and not ocr_data.get("profile_name"):
                ocr_data["profile_name"] = fen_code
            if weight is not None:
                ocr_data["weight_kg_per_m"] = weight
            if callouts:
                ocr_data["dimension_callouts"] = callouts
            enhanced["technical_data"] = ocr_data

            # If we have callouts, prefer them for width/height reporting
            if callouts and len(callouts) >= 2:
                dims = enhanced.get("dimensions", {}) or {}
                sorted_callouts = sorted(callouts, reverse=True)
                dims["width_mm"] = sorted_callouts[0]
                dims["height_mm"] = sorted_callouts[1]
                dims["scale_source"] = "callout_extraction"
                dims["scale_confidence"] = max(
                    dims.get("scale_confidence", 0), 0.85
                )
                enhanced["dimensions"] = dims

            # Engineering analysis: thickness, profile type, applications
            weight_kg_per_m = ocr_data.get("weight_kg_per_m")
            if weight_kg_per_m and callouts and len(callouts) >= 2:
                material = (
                    ocr_data.get("material_hints", [None])[0] or "aluminum"
                )
                engineering = ProfileGeometryAnalyzer.estimate_profile_type(
                    dimensions=callouts,
                    weight_kg_per_m=weight_kg_per_m,
                    material=material,
                )
                enhanced["engineering_analysis"] = engineering
                thickness = engineering.get("calculated_thickness_mm")
                if thickness is not None:
                    enhanced["quality"].setdefault(
                        "verification_notes", []
                    ).append(
                        f"Estimated wall thickness {thickness:.2f}mm "
                        f"(typical aluminum 1.0-3.0mm)"
                    )

            suggestions = {
                "profile_name": fen_code
                or self._suggest_profile_name(
                    ocr_data, enhanced.get("dimensions", {})
                ),
                "likely_material": self._infer_material(
                    ocr_data, enhanced.get("dimensions", {})
                ),
                "likely_role": (
                    "frame"
                    if enhanced.get("dimensions", {}).get("width_mm", 0) >= 70
                    else "sash"
                ),
                "egyptian_standard_match": self._match_egyptian_standard(
                    enhanced.get("dimensions", {})
                ),
            }
            enhanced["suggestions"] = suggestions

            enhanced_scale = enhanced.get("dimensions", {}).get(
                "enhanced_scale"
            )
            base_conf = enhanced.get("quality", {}).get(
                "confidence_score", 0
            )
            scale_conf = enhanced.get("dimensions", {}).get(
                "scale_confidence", 0
            )
            if not scale_conf and enhanced_scale:
                scale_conf = enhanced_scale.get("confidence", 0)
            ocr_conf = ocr_data.get("confidence", 0)
            if fen_code:
                ocr_conf = max(ocr_conf, 0.8)
            if weight is not None:
                ocr_conf = max(ocr_conf, 0.7)
            new_conf = self._calculate_enhanced_confidence(
                base_conf, scale_conf, ocr_conf
            )
            enhanced["quality"]["confidence_score"] = new_conf
            requires_verification = enhanced.get("quality", {}).get(
                "requires_verification", False
            )
            accuracy_tier = self._determine_accuracy_tier(
                new_conf, requires_verification
            )
            enhanced["quality"]["accuracy_tier"] = accuracy_tier
            enhanced["quality"]["verification_notes"] = (
                self._generate_verification_notes(
                    base_result, enhanced_scale, ocr_data
                )
            )

            if ocr_data:
                SmartScanMetricLogger.log_ocr_extraction(
                    filename=name,
                    profile_name=ocr_data.get("profile_name"),
                    confidence=ocr_data.get("confidence"),
                    materials=ocr_data.get("material_hints"),
                    brands=ocr_data.get("detected_brands"),
                )

            standard_match = suggestions.get("egyptian_standard_match")
            if standard_match:
                SmartScanMetricLogger.log_egyptian_standard_match(
                    filename=name,
                    standard_name=standard_match.get("name"),
                    match_score=standard_match.get("match_score", 0),
                    width_mm=enhanced.get("dimensions", {}).get("width_mm", 0),
                    height_mm=enhanced.get("dimensions", {}).get(
                        "height_mm", 0
                    ),
                )

            processing_time_ms = (time.time() - start_time) * 1000
            SmartScanMetricLogger.log_scan_complete(
                scan_type="enhanced",
                filename=name,
                success=True,
                processing_time_ms=processing_time_ms,
                confidence_score=new_conf,
                accuracy_tier=accuracy_tier,
                ocr_success=bool(ocr_data.get("profile_name")),
                standard_match=bool(standard_match),
            )

            enhanced.setdefault("metadata", {})
            enhanced["metadata"]["processing_time_ms"] = processing_time_ms
            enhanced["metadata"]["logging"] = {
                "scan_type": "enhanced",
            }
            return self._convert_numpy_types(enhanced)

        except Exception as exc:
            processing_time_ms = (time.time() - start_time) * 1000
            SmartScanMetricLogger.log_scan_complete(
                scan_type="enhanced",
                filename=name,
                success=False,
                processing_time_ms=processing_time_ms,
                error=str(exc),
            )
            raise
