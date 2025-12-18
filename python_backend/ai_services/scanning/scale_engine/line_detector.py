import logging
import math
from typing import Dict, List, Tuple, Optional

import cv2
import numpy as np

try:
    from scipy.spatial import KDTree
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    KDTree = None  # type: ignore

logger = logging.getLogger(__name__)

if not SCIPY_AVAILABLE:
    logger.warning("scipy not available. Line detection will use slower brute-force nearest neighbor search.")


class DimensionLineDetector:
    def __init__(self, min_line_length: int = 20, max_line_gap: int = 10):
        self.min_line_length = min_line_length
        self.max_line_gap = max_line_gap

    def detect_lines(self, image: np.ndarray) -> List[Dict]:
        """Detect dimension lines using probabilistic Hough transform."""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        edges = cv2.Canny(enhanced, 50, 150, apertureSize=3)
        kernel = np.ones((2, 2), np.uint8)
        edges = cv2.dilate(edges, kernel, iterations=1)

        lines = cv2.HoughLinesP(
            edges,
            rho=1,
            theta=np.pi / 180,
            threshold=50,
            minLineLength=self.min_line_length,
            maxLineGap=self.max_line_gap,
        )

        detected: List[Dict] = []
        if lines is not None:
            lines = lines.reshape(-1, 4)
            for x1, y1, x2, y2 in lines:
                length = math.hypot(x2 - x1, y2 - y1)
                angle = abs(math.degrees(math.atan2(y2 - y1, x2 - x1)))
                orientation = "diagonal"
                if angle < 30 or angle > 150:
                    orientation = "horizontal"
                elif 60 < angle < 120:
                    orientation = "vertical"
                center = ((x1 + x2) // 2, (y1 + y2) // 2)
                detected.append(
                    {
                        "pts": [(int(x1), int(y1)), (int(x2), int(y2))],
                        "length": float(length),
                        "angle": float(angle % 180),
                        "center": center,
                        "orientation": orientation,
                    }
                )

        return self._merge_collinear_lines(detected)

    def _merge_collinear_lines(
        self, lines: List[Dict], angle_tol: float = 5.0, dist_tol: float = 20.0
    ) -> List[Dict]:
        if not lines:
            return []
        merged: List[Dict] = []
        used = [False] * len(lines)
        for i, line1 in enumerate(lines):
            if used[i]:
                continue
            group = [line1]
            used[i] = True
            for j, line2 in enumerate(lines[i + 1 :], i + 1):
                if used[j]:
                    continue
                angle_diff = abs(line1["angle"] - line2["angle"])
                angle_diff = min(angle_diff, 180 - angle_diff)
                if angle_diff < angle_tol:
                    if self._distance_between_lines(line1, line2) < dist_tol:
                        group.append(line2)
                        used[j] = True
            merged.append(self._merge_line_group(group))
        return merged

    @staticmethod
    def _distance_between_lines(line1: Dict, line2: Dict) -> float:
        p1, p2 = np.array(line1["pts"][0]), np.array(line1["pts"][1])
        p3, p4 = np.array(line2["pts"][0]), np.array(line2["pts"][1])
        dists = [
            np.linalg.norm(p1 - p3),
            np.linalg.norm(p1 - p4),
            np.linalg.norm(p2 - p3),
            np.linalg.norm(p2 - p4),
        ]
        return float(min(dists))

    @staticmethod
    def _merge_line_group(lines: List[Dict]) -> Dict:
        all_points = []
        for line in lines:
            all_points.extend(line["pts"])
        pts = np.array(all_points)
        hull = cv2.convexHull(pts)
        max_dist = 0.0
        extreme = (lines[0]["pts"][0], lines[0]["pts"][1])
        for i in range(len(hull)):
            for j in range(i + 1, len(hull)):
                pt1 = tuple(hull[i][0])
                pt2 = tuple(hull[j][0])
                dist = math.hypot(pt2[0] - pt1[0], pt2[1] - pt1[1])
                if dist > max_dist:
                    max_dist = dist
                    extreme = (pt1, pt2)
        pt1, pt2 = extreme
        angle = abs(math.degrees(math.atan2(pt2[1] - pt1[1], pt2[0] - pt1[0]))) % 180
        orientation = "diagonal"
        if angle < 30 or angle > 150:
            orientation = "horizontal"
        elif 60 < angle < 120:
            orientation = "vertical"
        return {
            "pts": [pt1, pt2],
            "length": float(max_dist),
            "angle": float(angle),
            "center": ((pt1[0] + pt2[0]) // 2, (pt1[1] + pt2[1]) // 2),
            "orientation": orientation,
            "merged_from": len(lines),
        }

    def associate_text_with_lines(
        self,
        text_detections: List[Dict],
        lines: List[Dict],
        max_distance: float = 100.0,
    ) -> List[Dict]:
        associations: List[Dict] = []
        if not text_detections or not lines:
            return associations

        centers = [line["center"] for line in lines]
        if not centers:
            return associations

        # Use KDTree if scipy is available, otherwise use brute-force search
        if SCIPY_AVAILABLE and KDTree is not None:
            tree = KDTree(centers)
            for text in text_detections:
                tx, ty = text.get("center", (0, 0))
                k = min(3, len(lines))
                result = tree.query([tx, ty], k=k)
                # Handle both single result (k=1) and multiple results (k>1)
                if k == 1:
                    dists = [result[0]]
                    idxs = [result[1]]
                else:
                    dists = result[0]
                    idxs = result[1]
                for dist, idx in zip(dists, idxs):
                    if dist >= max_distance:
                        continue
                    line = lines[idx]
                    conf = self._calculate_association_confidence(
                        text, line, float(dist), max_distance
                    )
                    if conf > 0.3:
                        assoc = {
                            "text": text,
                            "line": line,
                            "distance": float(dist),
                            "confidence": float(conf),
                            "scale_candidate": self._calculate_scale_candidate(text, line),
                        }
                        associations.append(assoc)
        else:
            # Fallback: brute-force nearest neighbor search using numpy
            centers_array = np.array(centers)
            for text in text_detections:
                tx, ty = text.get("center", (0, 0))
                query_point = np.array([tx, ty])
                distances = np.linalg.norm(centers_array - query_point, axis=1)
                # Get k nearest neighbors
                k = min(3, len(lines))
                nearest_indices = np.argsort(distances)[:k]
                for idx in nearest_indices:
                    dist = float(distances[idx])
                    if dist >= max_distance:
                        continue
                    line = lines[idx]
                    conf = self._calculate_association_confidence(
                        text, line, dist, max_distance
                    )
                    if conf > 0.3:
                        assoc = {
                            "text": text,
                            "line": line,
                            "distance": dist,
                            "confidence": float(conf),
                            "scale_candidate": self._calculate_scale_candidate(text, line),
                        }
                        associations.append(assoc)

        associations.sort(key=lambda x: x["confidence"], reverse=True)
        unique: List[Dict] = []
        seen = set()
        for assoc in associations:
            text_id = (
                tuple(map(int, assoc["text"]["bbox"][0:2] + assoc["text"]["bbox"][2:4]))
                if isinstance(assoc["text"]["bbox"], list)
                else id(assoc["text"])
            )
            if text_id in seen:
                continue
            seen.add(text_id)
            unique.append(assoc)
        return unique

    @staticmethod
    def _calculate_association_confidence(
        text: Dict, line: Dict, distance: float, max_distance: float
    ) -> float:
        dist_factor = 1.0 - min(distance / max_distance, 1.0)
        # Simplified orientation factor: boost if orientations align
        text_orient = text.get("orientation", "unknown")
        orient_factor = 0.7
        if text_orient != "unknown" and text_orient == line["orientation"]:
            orient_factor = 1.0
        confidence = 0.6 * dist_factor + 0.4 * orient_factor
        return max(0.0, min(1.0, confidence))

    @staticmethod
    def _calculate_scale_candidate(text: Dict, line: Dict) -> float | None:
        try:
            text_value = float(text.get("value", text.get("parsed_value_mm", 0)))
            line_len = float(line["length"])
            if text_value <= 0 or line_len <= 0:
                return None
            scale = text_value / line_len
            if 0.001 <= scale <= 1.0:
                return scale
            return None
        except (TypeError, ValueError):
            return None
