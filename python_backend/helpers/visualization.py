import cv2
import numpy as np
from typing import Any, Dict, List, Optional


class ScaleDetectionVisualizer:
    """Create visualization overlays for scale detection results."""

    @staticmethod
    def create_debug_overlay(
        image_bytes: bytes,
        scale_result: Dict[str, Any],
        detected_dimensions: Optional[List[Dict]] = None,
        detected_lines: Optional[List[Dict]] = None,
        associations: Optional[List[Dict]] = None,
    ) -> bytes:
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Could not decode image")

        overlay = image.copy()

        # Reference line and label
        if scale_result.get("detected") and scale_result.get("reference_line"):
            line_data = scale_result["reference_line"]
            if (
                isinstance(line_data, list)
                and len(line_data) == 2
                and len(line_data[0]) == 2
                and len(line_data[1]) == 2
            ):
                pt1 = tuple(line_data[0])
                pt2 = tuple(line_data[1])
                cv2.line(overlay, pt1, pt2, (0, 255, 0), 4)
                cv2.circle(overlay, pt1, 6, (0, 255, 0), -1)
                cv2.circle(overlay, pt2, 6, (0, 255, 0), -1)

                if scale_result.get("detected_label"):
                    label = scale_result["detected_label"]
                    mid_x = (pt1[0] + pt2[0]) // 2
                    mid_y = (pt1[1] + pt2[1]) // 2
                    text = f"{label} mm"
                    font_scale = 0.9
                    thickness = 2
                    (tw, th), _ = cv2.getTextSize(
                        text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness
                    )
                    bg1 = (mid_x - tw // 2 - 6, mid_y - th // 2 - 6)
                    bg2 = (mid_x + tw // 2 + 6, mid_y + th // 2 + 6)
                    cv2.rectangle(overlay, bg1, bg2, (0, 0, 0), -1)
                    cv2.rectangle(overlay, bg1, bg2, (0, 255, 0), 1)
                    cv2.putText(
                        overlay,
                        text,
                        (mid_x - tw // 2, mid_y + th // 2),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        font_scale,
                        (255, 255, 255),
                        thickness,
                        cv2.LINE_AA,
                    )

        # Detected lines (subset)
        if detected_lines:
            for line in detected_lines[:100]:
                if "pts" in line and len(line["pts"]) == 2:
                    pt1, pt2 = line["pts"]
                    orient = line.get("orientation")
                    if orient == "horizontal":
                        color = (255, 150, 0)
                    elif orient == "vertical":
                        color = (0, 150, 255)
                    else:
                        color = (255, 0, 0)
                    cv2.line(overlay, pt1, pt2, color, 1)

        # Detected dimensions
        if detected_dimensions:
            for dim in detected_dimensions[:50]:
                bbox = dim.get("bbox")
                if bbox and len(bbox) == 4:
                    x1, y1, x2, y2 = bbox
                    conf = float(dim.get("confidence", 0.5))
                    if conf > 0.9:
                        color = (0, 255, 0)
                    elif conf > 0.7:
                        color = (0, 255, 255)
                    else:
                        color = (0, 165, 255)
                    cv2.rectangle(overlay, (x1, y1), (x2, y2), color, 2)
                    if "text" in dim and "value" in dim:
                        label = f"{dim['text']} ({dim['value']}mm)"
                        cv2.putText(
                            overlay,
                            label,
                            (x1, y1 - 4),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.45,
                            color,
                            1,
                        )

        # Associations
        if associations:
            for assoc in associations[:30]:
                text_center = assoc.get("text", {}).get("center")
                line_center = assoc.get("line", {}).get("center")
                if text_center and line_center:
                    conf = float(assoc.get("confidence", 0.5))
                    if conf > 0.8:
                        color = (0, 255, 0)
                    elif conf > 0.6:
                        color = (0, 255, 255)
                    else:
                        color = (0, 0, 255)
                    cv2.line(
                        overlay,
                        text_center,
                        line_center,
                        color,
                        1,
                        cv2.LINE_AA,
                    )
                    mid = (
                        (text_center[0] + line_center[0]) // 2,
                        (text_center[1] + line_center[1]) // 2,
                    )
                    cv2.putText(
                        overlay,
                        f"{conf:.2f}",
                        mid,
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.4,
                        color,
                        1,
                    )

        # Info banner
        cv2.rectangle(overlay, (10, 10), (600, 90), (0, 0, 0), -1)
        cv2.rectangle(overlay, (10, 10), (600, 90), (255, 255, 255), 1)
        if scale_result.get("detected"):
            scale_text = f"Scale: {scale_result.get('scale_mm_per_px', 0):.6f} mm/px"
            conf = scale_result.get("confidence", 0)
            conf_text = f"Confidence: {conf:.2f}"
            conf_color = (0, 255, 0) if conf > 0.8 else (0, 255, 255) if conf > 0.6 else (0, 0, 255)
            cv2.putText(
                overlay, scale_text, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2
            )
            cv2.putText(
                overlay, conf_text, (20, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.7, conf_color, 2
            )
        else:
            cv2.putText(
                overlay, "NO SCALE DETECTED", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2
            )

        alpha = 0.7
        blended = cv2.addWeighted(image, 1 - alpha, overlay, alpha, 0)
        ok, encoded = cv2.imencode(".jpg", blended, [cv2.IMWRITE_JPEG_QUALITY, 90])
        if not ok:
            raise ValueError("Could not encode visualization")
        return encoded.tobytes()

    @staticmethod
    def save_visualization_to_file(
        image_bytes: bytes,
        scale_result: Dict[str, Any],
        output_path: str,
        **kwargs,
    ) -> bool:
        try:
            data = ScaleDetectionVisualizer.create_debug_overlay(
                image_bytes=image_bytes,
                scale_result=scale_result,
                detected_dimensions=kwargs.get("detected_dimensions"),
                detected_lines=kwargs.get("detected_lines"),
                associations=kwargs.get("associations"),
            )
            with open(output_path, "wb") as f:
                f.write(data)
            return True
        except Exception:
            return False

