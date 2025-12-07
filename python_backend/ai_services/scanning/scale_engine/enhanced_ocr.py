import re
from typing import Dict, List, Tuple


class DimensionFilter:
    def __init__(self, image_shape: Tuple[int, int]):
        self.image_height, self.image_width = image_shape
        patterns = [
            r"kg\.?\/?ml\.?",
            r"[kK][gG]",
            r"[mM][lL]",
            r"[rR][pP][mM]",
            r"[hH][zZ]",
            r"\d{5,}",
            r"[A-Z]{3,}",
            r"[a-z]{5,}",
        ]
        self.compiled_patterns = [re.compile(p, re.IGNORECASE) for p in patterns]

    def filter_dimensions(
        self, ocr_results: List[Dict], confidence_threshold: float = 0.7
    ) -> List[Dict]:
        filtered: List[Dict] = []
        for res in ocr_results:
            text = res.get("text", "").strip()
            confidence = float(res.get("confidence", 0.0))
            bbox = res.get("bbox")
            if not self._passes_basic_filters(text, confidence, bbox, confidence_threshold):
                continue
            value, ok = self._parse_dimension_value(text)
            if not ok:
                continue
            if not self._passes_position_filters(bbox, value):
                continue
            if self._is_non_dimension_text(text):
                continue

            x1, y1, x2, y2 = bbox
            cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
            w, h = x2 - x1, y2 - y1
            if w > h * 1.5:
                orientation = "horizontal"
            elif h > w * 1.5:
                orientation = "vertical"
            else:
                orientation = "unknown"

            filtered.append(
                {
                    "text": text,
                    "value": value,
                    "confidence": confidence,
                    "bbox": [x1, y1, x2, y2],
                    "center": (cx, cy),
                    "orientation": orientation,
                    "original_ocr_result": res,
                }
            )
        filtered.sort(key=lambda x: x["value"])
        return filtered

    @staticmethod
    def _passes_basic_filters(
        text: str, confidence: float, bbox: List[int], min_conf: float
    ) -> bool:
        if confidence < min_conf:
            return False
        if not text:
            return False
        if (
            not isinstance(bbox, list)
            or len(bbox) != 4
            or bbox[2] <= bbox[0]
            or bbox[3] <= bbox[1]
        ):
            return False
        if len(text) > 10:
            return False
        return True

    @staticmethod
    def _parse_dimension_value(text: str) -> Tuple[float, bool]:
        cleaned = text.strip()
        replacements = {"O": "0", "o": "0", "l": "1", "I": "1", "S": "5", "s": "5", "B": "8", ",": "."}
        for old, new in replacements.items():
            cleaned = cleaned.replace(old, new)
        for pattern in [r"mm", r"cm", r"m", r'in', r'"', r"'"]:
            cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
        cleaned = cleaned.strip()
        try:
            numbers = re.findall(r"[-+]?\d*\.\d+|\d+", cleaned)
            if not numbers:
                return 0.0, False
            value = float(numbers[0])
            if not (5 <= value <= 3000):
                return value, False
            return value, True
        except (ValueError, TypeError):
            return 0.0, False

    def _passes_position_filters(self, bbox: List[int], value: float) -> bool:
        x1, y1, x2, y2 = bbox
        margin = 5
        if (
            x1 < -margin
            or y1 < -margin
            or x2 > self.image_width + margin
            or y2 > self.image_height + margin
        ):
            return False

        edge_margin = 0.02
        min_x = self.image_width * edge_margin
        max_x = self.image_width * (1 - edge_margin)
        min_y = self.image_height * edge_margin
        max_y = self.image_height * (1 - edge_margin)
        if x1 < min_x or x2 > max_x or y1 < min_y or y2 > max_y:
            if value > 50:
                return False

        w, h = x2 - x1, y2 - y1
        min_size = max(10, self.image_width * 0.005)
        if w < min_size or h < min_size:
            return False
        max_size = self.image_width * 0.3
        if w > max_size or h > max_size:
            return False
        return True

    def _is_non_dimension_text(self, text: str) -> bool:
        for pattern in self.compiled_patterns:
            if pattern.search(text):
                return True
        if re.search(r"[A-Za-z].*\d|\d.*[A-Za-z]", text):
            if not re.match(r"^[A-Za-z]?\d+(\.\d+)?[A-Za-z]?$", text):
                return True
        if re.search(r"[^\w\s\.\-]", text):
            clean = re.sub(r"[\.\-]", "", text)
            if re.search(r"[^\w\s]", clean):
                return True
        return False

