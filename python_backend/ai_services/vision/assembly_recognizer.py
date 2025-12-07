"""
Assembly Intelligence - First Pass Recognizer (MVP)
"""
from typing import Dict, List, Optional, Tuple
import re

import cv2
import numpy as np
import pytesseract


class AssemblyMetrics:
    """Lightweight metrics tracking."""

    def __init__(self):
        self.metrics = {
            "total_scans": 0,
            "successful_scans": 0,
            "avg_confidence": 0.0,
            "user_corrections": 0,
        }

    def track_scan(self, confidence: float, user_corrections: int = 0) -> None:
        self.metrics["total_scans"] += 1
        if confidence > 0.5:
            self.metrics["successful_scans"] += 1

        prev_total = self.metrics["total_scans"] - 1
        prev_avg = self.metrics["avg_confidence"]
        self.metrics["avg_confidence"] = (
            (prev_avg * prev_total) + confidence
        ) / self.metrics["total_scans"]
        self.metrics["user_corrections"] += user_corrections

    def get_summary(self) -> Dict:
        return {
            **self.metrics,
            "success_rate": self.metrics["successful_scans"]
            / max(self.metrics["total_scans"], 1),
            "avg_user_corrections": self.metrics["user_corrections"]
            / max(self.metrics["total_scans"], 1),
        }


class AssemblyRecognizer:
    """MVP Assembly Intelligence Recognizer."""

    def __init__(self):
        self.metrics = AssemblyMetrics()

        self.system_patterns = {
            "sliding": {
                "text": ["sliding", "glider", "roller", "track", "slide"],
                "visual_weight": 0.6,
            },
            "casement": {
                "text": ["casement", "hinge", "hinged", "swing", "open out"],
                "visual_weight": 0.5,
            },
            "tilt_turn": {
                "text": ["tilt", "turn", "tilt & turn", "tilt-turn"],
                "visual_weight": 0.4,
            },
            "fixed": {
                "text": ["fixed", "non-opening", "stationary"],
                "visual_weight": 0.3,
            },
        }

        self.role_hierarchy = ["frame", "sash", "transom", "mullion", "sill", "hardware"]
        self.hardware_patterns = {
            "lock": ["lock", "locking", "catch"],
            "hinge": ["hinge", "pivot", "butt"],
            "roller": ["roller", "glider", "wheel"],
            "handle": ["handle", "knob", "grip"],
        }

    def recognize_assembly(self, image_path: str) -> Dict:
        """Main recognition pipeline."""
        try:
            image = cv2.imread(image_path)
            if image is None:
                return self._empty_result("Failed to load image")

            ocr_text = self._extract_text(image)
            system_type, system_conf = self._detect_system_type(image, ocr_text)
            components = self._extract_components(ocr_text, system_type)
            connections = self._infer_connections(components, system_type)
            validation = self._validate_assembly(components, connections, system_type)
            confidence = self._calculate_confidence(system_conf, components, validation)

            self.metrics.track_scan(confidence)

            return {
                "success": True,
                "system_type": system_type,
                "system_confidence": system_conf,
                "components": components,
                "connections": connections,
                "validation": validation,
                "confidence": confidence,
                "requires_review": confidence < 0.7 or validation.get("issues"),
                "validation_rules_applied": list(self.system_patterns.keys())[:3],
            }
        except Exception as exc:  # pragma: no cover - defensive
            return self._empty_result(f"Recognition error: {exc}")

    def _extract_text(self, image: np.ndarray) -> str:
        """Extract text from image with preprocessing."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        height, width = gray.shape
        if max(height, width) < 1000:
            scale = 1500 / max(height, width)
            gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        configs = ["--psm 6", "--psm 11", "--psm 4"]
        all_text = ""
        for config in configs:
            try:
                text = pytesseract.image_to_string(binary, config=config)
                if text.strip():
                    all_text += text + "\n"
            except Exception:
                continue
        return all_text

    def _detect_system_type(self, image: np.ndarray, text: str) -> Tuple[str, float]:
        """Detect window/door system type."""
        text_lower = text.lower()
        scores: Dict[str, float] = {}

        for system, patterns in self.system_patterns.items():
            score = 0.0
            for keyword in patterns["text"]:
                if keyword in text_lower:
                    score += 0.3

            if system == "sliding":
                edges = cv2.Canny(image, 50, 150)
                lines = cv2.HoughLinesP(edges, 1, np.pi / 180, 50, minLineLength=50, maxLineGap=10)
                if lines is not None and len(lines) > 1:
                    horizontal_lines = 0
                    for line in lines[:5]:
                        x1, y1, x2, y2 = line[0]
                        if abs(y2 - y1) < 10:
                            horizontal_lines += 1
                    if horizontal_lines > 0:
                        score += patterns["visual_weight"]

            scores[system] = min(score, 1.0)

        if not scores or max(scores.values()) < 0.3:
            return "sliding", 0.3

        best_system = max(scores, key=scores.get)
        return best_system, scores[best_system]

    def _extract_components(self, text: str, system_type: str) -> List[Dict]:
        """Extract components from OCR text."""
        components: List[Dict] = []

        profile_patterns = [
            r"\b\d+\s+\d+\s+\d+\b",  # "1 061 1130"
            r"\b\d+:\d+\s+\d+\b",  # "1:00 2010"
            r"\b[A-Z]+\d+[-_]\d+\b",  # "AL50-1000"
        ]

        profile_codes: List[str] = []
        for pattern in profile_patterns:
            matches = re.findall(pattern, text)
            profile_codes.extend(matches)

        for idx, code in enumerate(profile_codes[:6]):
            if idx == 0:
                role = "frame"
                confidence = 0.8
            elif idx == 1:
                role = "sash"
                confidence = 0.7
            elif "transom" in text.lower():
                role = "transom"
                confidence = 0.6
            elif "mullion" in text.lower():
                role = "mullion"
                confidence = 0.6
            else:
                role = "sash"
                confidence = 0.5

            components.append(
                {
                    "id": f"comp_{idx}",
                    "profile_code": code,
                    "detected_role": role,
                    "confidence": confidence,
                    "suggestions": self._get_role_suggestions(role),
                    "metadata": {
                        "extraction_index": idx,
                        "system_context": system_type,
                    },
                }
            )

        hardware_idx = len(components)
        for hw_type, patterns in self.hardware_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    components.append(
                        {
                            "id": f"hw_{hardware_idx}",
                            "profile_code": None,
                            "detected_role": "hardware",
                            "confidence": 0.7,
                            "suggestions": ["hardware"],
                            "metadata": {
                                "hardware_type": hw_type,
                                "mentioned_in_text": True,
                            },
                        }
                    )
                    hardware_idx += 1
                    break

        return components

    def _get_role_suggestions(self, primary_role: str) -> List[str]:
        """Get alternative role suggestions."""
        all_roles = ["frame", "sash", "transom", "mullion", "sill", "hardware"]
        suggestions = [role for role in all_roles if role != primary_role]
        return suggestions[:3]

    def _infer_connections(self, components: List[Dict], system_type: str) -> List[Dict]:
        """Infer connections between components."""
        connections: List[Dict] = []
        if system_type == "sliding":
            frames = [c for c in components if c["detected_role"] == "frame"]
            sashes = [c for c in components if c["detected_role"] == "sash"]
            for sash in sashes[:2]:
                if frames:
                    connections.append(
                        {
                            "from_component": frames[0]["id"],
                            "to_component": sash["id"],
                            "connection_type": "sliding_track",
                            "location_hint": "bottom_rail",
                        }
                    )
        elif system_type == "casement":
            frames = [c for c in components if c["detected_role"] == "frame"]
            sashes = [c for c in components if c["detected_role"] == "sash"]
            for sash in sashes[:2]:
                if frames:
                    connections.append(
                        {
                            "from_component": frames[0]["id"],
                            "to_component": sash["id"],
                            "connection_type": "hinged",
                            "location_hint": "side_rail",
                        }
                    )

        if not connections and len(components) >= 2:
            connections.append(
                {
                    "from_component": components[0]["id"],
                    "to_component": components[1]["id"],
                    "connection_type": "generic_connection",
                    "location_hint": None,
                }
            )
        return connections

    def _validate_assembly(
        self, components: List[Dict], connections: List[Dict], system_type: str
    ) -> Dict:
        """Basic assembly validation."""
        validation = {"passed": True, "issues": [], "warnings": [], "missing_components": []}
        required_counts = {
            "sliding": {"frame": 1, "sash": 1},
            "casement": {"frame": 1, "sash": 1, "hinge": 1},
            "tilt_turn": {"frame": 1, "sash": 1},
            "fixed": {"frame": 1},
        }

        required = required_counts.get(system_type, {})
        role_counts: Dict[str, int] = {}
        for comp in components:
            role = comp["detected_role"]
            role_counts[role] = role_counts.get(role, 0) + 1

        for role, min_count in required.items():
            current_count = role_counts.get(role, 0)
            if current_count < min_count:
                validation["missing_components"].append(
                    f"{role} (need {min_count}, have {current_count})"
                )
                validation["passed"] = False

        if not connections:
            validation["warnings"].append("No connections detected between components")

        low_conf_components = [c["id"] for c in components if c.get("confidence", 0) < 0.5]
        if low_conf_components:
            validation["warnings"].append(f"Low confidence components: {low_conf_components}")

        if validation["missing_components"]:
            validation["issues"].append(
                f"Missing: {', '.join(validation['missing_components'])}"
            )
        return validation

    def _calculate_confidence(
        self, system_conf: float, components: List[Dict], validation: Dict
    ) -> float:
        """Calculate overall assembly confidence."""
        if not components:
            return 0.0
        comp_confidences = [c.get("confidence", 0.5) for c in components]
        avg_comp_conf = sum(comp_confidences) / len(comp_confidences)

        system_weight = 0.4
        comp_weight = 0.4
        validation_weight = 0.2

        validation_score = 1.0
        if not validation["passed"]:
            validation_score = 0.5
        elif validation.get("warnings"):
            validation_score = 0.8

        confidence = (
            system_conf * system_weight
            + avg_comp_conf * comp_weight
            + validation_score * validation_weight
        )
        return min(max(confidence, 0.0), 1.0)

    def _empty_result(self, error_message: str = "") -> Dict:
        """Return empty result with error."""
        return {
            "success": False,
            "system_type": "unknown",
            "system_confidence": 0.0,
            "components": [],
            "connections": [],
            "validation": {
                "passed": False,
                "issues": [error_message] if error_message else [],
                "warnings": [],
                "missing_components": [],
            },
            "confidence": 0.0,
            "requires_review": True,
        }

    def get_metrics_summary(self) -> Dict:
        """Get current metrics summary."""
        return self.metrics.get_summary()

