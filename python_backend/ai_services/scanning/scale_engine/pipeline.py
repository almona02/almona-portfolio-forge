import json
from pathlib import Path
from typing import Dict, List

import cv2
import numpy as np

from .enhanced_ocr import DimensionFilter
from .line_detector import DimensionLineDetector
from .scale_computer import ScaleComputer


class ScaleDetectionPipeline:
    def __init__(
        self,
        min_line_length: int = 20,
        max_line_gap: int = 10,
        ocr_confidence_threshold: float = 0.7,
        scale_confidence_gate: float = 0.6,
    ):
        self.line_detector = DimensionLineDetector(
            min_line_length=min_line_length,
            max_line_gap=max_line_gap,
        )
        self.scale_computer = ScaleComputer()
        self.ocr_confidence_threshold = ocr_confidence_threshold
        self.scale_confidence_gate = scale_confidence_gate

    def process_image(self, image_path: str, ocr_results: List[Dict]) -> Dict:
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not load image: {image_path}")

        dim_filter = DimensionFilter(image.shape[:2])
        filtered_dimensions = dim_filter.filter_dimensions(
            ocr_results, confidence_threshold=self.ocr_confidence_threshold
        )

        detected_lines = self.line_detector.detect_lines(image)
        associations = self.line_detector.associate_text_with_lines(
            filtered_dimensions, detected_lines
        )

        scale_result = self.scale_computer.compute_scale(associations)
        final_scale = None
        if scale_result["confidence"] >= self.scale_confidence_gate:
            final_scale = scale_result["scale_mm_per_px"]

        return {
            "success": final_scale is not None,
            "scale_mm_per_px": final_scale,
            "scale_confidence": scale_result["confidence"],
            "scale_computation": scale_result,
            "detected_dimensions": filtered_dimensions,
            "detected_lines": detected_lines,
            "associations": associations,
            "image_info": {
                "path": image_path,
                "height": image.shape[0],
                "width": image.shape[1],
                "channels": image.shape[2] if len(image.shape) == 3 else 1,
            },
        }

    def save_results(
        self, results: Dict, output_dir: str, save_visualization: bool = True
    ) -> Dict:
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        image_path = Path(results["image_info"]["path"])
        base_name = image_path.stem

        json_path = output_path / f"{base_name}_results.json"
        with open(json_path, "w") as f:
            json.dump(self._to_serializable(results), f, indent=2, default=str)

        vis_path = None
        if save_visualization:
            vis_path = output_path / f"{base_name}_visualization.jpg"
            self._create_visualization(results, str(vis_path))

        return {
            "json_path": str(json_path),
            "visualization_path": str(vis_path) if vis_path else None,
        }

    @staticmethod
    def _to_serializable(obj):
        if isinstance(obj, (np.integer, np.floating)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, dict):
            return {k: ScaleDetectionPipeline._to_serializable(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [ScaleDetectionPipeline._to_serializable(v) for v in obj]
        return obj

    def _create_visualization(self, results: Dict, output_path: str):
        image = cv2.imread(results["image_info"]["path"])
        if image is None:
            return
        vis = image.copy()

        for line in results.get("detected_lines", []):
            pt1, pt2 = line["pts"]
            cv2.line(vis, pt1, pt2, (0, 255, 0), 2)

        for dim in results.get("detected_dimensions", []):
            x1, y1, x2, y2 = dim["bbox"]
            cv2.rectangle(vis, (x1, y1), (x2, y2), (0, 0, 255), 2)
            cv2.putText(
                vis,
                f"{dim['value']}mm",
                (x1, y1 - 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 0, 255),
                2,
            )

        for assoc in results.get("associations", []):
            tx, ty = assoc["text"]["center"]
            lx, ly = assoc["line"]["center"]
            cv2.line(vis, (tx, ty), (lx, ly), (255, 0, 0), 1)
            mid = ((tx + lx) // 2, (ty + ly) // 2)
            cv2.putText(
                vis,
                f"{assoc['confidence']:.2f}",
                mid,
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 0, 0),
                1,
            )

        if results.get("scale_mm_per_px") is not None:
            cv2.putText(
                vis,
                f"Scale: {results['scale_mm_per_px']:.6f} mm/px",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.9,
                (255, 0, 0),
                2,
            )
            cv2.putText(
                vis,
                f"Confidence: {results['scale_confidence']:.2f}",
                (10, 60),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.9,
                (255, 0, 0),
                2,
            )

        cv2.imwrite(output_path, vis)

