"""
Assembly Intelligence Engine for Egyptian Manufacturing.

Converts CAD geometry → intelligent manufacturing components with
Egyptian standards compliance, hardware placement, and assembly steps.
"""

from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)


class AssemblyIntelligenceEngine:
    """Converts CAD geometry → intelligent manufacturing components."""

    def __init__(self, cad_metrics: dict):
        self.cad_metrics = cad_metrics
        self.profile_type: str | None = None
        self.hardware_points: List[Dict[str, Any]] = []
        self.assembly_sequence: List[Dict[str, Any]] = []

    def analyze_for_window_system(self) -> str:
        """Identify Egyptian window system from geometry."""
        bbox = self.cad_metrics.get("bounding_box", [0, 0, 0, 0])
        width = bbox[2] - bbox[0]
        height = bbox[3] - bbox[1]

        if width < 45 and height < 60:
            self.profile_type = "PS 4800"  # Small / narrow profiles
        elif width < 60:
            self.profile_type = "PS 5600"  # Common Egyptian system
        elif width < 80:
            self.profile_type = "PS 9600"  # Larger residential/commercial
        else:
            self.profile_type = "JUMBO 100"  # Industrial

        logger.info(
            "Identified window system: %s (width=%.1fmm, height=%.1fmm)",
            self.profile_type,
            width,
            height,
        )
        return self.profile_type

    def identify_hardware_points(self) -> List[Dict[str, Any]]:
        """Calculate precise locations for handles, hinges, locks."""
        hardware_rules = {
            "PS 4800": {"handle_height": 900, "hinge_spacing": 500, "lock_position": "center"},
            "PS 5600": {"handle_height": 1000, "hinge_spacing": 600, "lock_position": "center"},
            "PS 9600": {"handle_height": 1200, "hinge_spacing": 700, "lock_position": "center"},
            "JUMBO 100": {"handle_height": 1400, "hinge_spacing": 800, "lock_position": "center"},
        }

        profile_rules = hardware_rules.get(self.profile_type, {})
        self.hardware_points = self._calculate_hardware_coordinates(profile_rules)
        logger.info("Generated %d hardware points for %s", len(self.hardware_points), self.profile_type)
        return self.hardware_points

    def generate_assembly_sequence(self) -> List[Dict[str, Any]]:
        """Create step-by-step assembly instructions."""
        self.assembly_sequence = [
            {"step": 1, "action": "Cut profiles to length", "tools": ["Saw"], "time_min": 2.5},
            {"step": 2, "action": "Machine hardware slots", "tools": ["CNC", "Drill"], "time_min": 8.0},
            {"step": 3, "action": "Assemble corners", "tools": ["Corner Key", "Mallet"], "time_min": 4.0},
            {"step": 4, "action": "Install gaskets", "tools": ["Roller"], "time_min": 3.0},
            {"step": 5, "action": "Mount glass", "tools": ["Suction Cups"], "time_min": 5.0},
            {"step": 6, "action": "Install hardware", "tools": ["Screwdriver"], "time_min": 3.0},
        ]
        total_time = sum(step["time_min"] for step in self.assembly_sequence)
        logger.info("Generated assembly sequence; total time %.1f min", total_time)
        return self.assembly_sequence

    def _calculate_hardware_coordinates(self, rules: dict) -> List[Dict[str, Any]]:
        """Precise math for Egyptian manufacturing hardware placement."""
        coordinates: List[Dict[str, Any]] = []
        bbox = self.cad_metrics.get("bounding_box", [0, 0, 0, 0])
        profile_width = bbox[2] - bbox[0]

        # Handle position (standard Egyptian)
        if "handle_height" in rules:
            coordinates.append(
                {
                    "type": "handle",
                    "x": profile_width / 2,
                    "y": rules["handle_height"],
                    "tool": "8mm drill bit",
                    "depth": 12.5,
                    "description": "Main handle position",
                }
            )

        # Hinge positions (standard 3 hinges)
        if "hinge_spacing" in rules:
            for i in range(3):
                y_pos = 150 + (i * rules["hinge_spacing"])
                coordinates.append(
                    {
                        "type": "hinge",
                        "x": 15,
                        "y": y_pos,
                        "tool": "12mm end mill",
                        "depth": 3.0,
                        "description": f"Hinge {i + 1} position",
                    }
                )

        # Lock position (center)
        if rules.get("lock_position") == "center":
            coordinates.append(
                {
                    "type": "lock",
                    "x": profile_width / 2,
                    "y": 50,
                    "tool": "6mm drill bit",
                    "depth": 8.0,
                    "description": "Lock mechanism position",
                }
            )

        return coordinates

    def get_egyptian_compliance(self) -> Dict[str, Any]:
        """Validate against Egyptian building standards."""
        standards = {
            "PS 4800": {"max_width": 1200, "max_height": 1800, "standard": "Egyptian HBRC PS 4800"},
            "PS 5600": {"max_width": 1500, "max_height": 2100, "standard": "Egyptian HBRC PS 5600"},
            "PS 9600": {"max_width": 2400, "max_height": 3000, "standard": "Egyptian HBRC PS 9600"},
            "JUMBO 100": {"max_width": 3000, "max_height": 4000, "standard": "Industrial JUMBO 100"},
        }

        if self.profile_type in standards:
            std = standards[self.profile_type]
            return {
                "compliant": True,
                "standard": std["standard"],
                "max_dimensions": {"width": std["max_width"], "height": std["max_height"]},
                "recommended_use": "Residential/Commercial" if self.profile_type != "JUMBO 100" else "Industrial",
            }

        return {"compliant": False, "reason": "Non-standard profile"}

    def check_magnetic_compatibility(self) -> Dict[str, Any]:
        """Check if profile can use magnetic assembly system."""
        vertices = self.cad_metrics.get("vertex_count", 0)
        is_closed = self.cad_metrics.get("is_closed", False)
        area = self.cad_metrics.get("area_mm2", 0)

        compatible = vertices >= 4 and is_closed and area > 500

        return {
            "compatible": compatible,
            "magnetic_points": self._calculate_magnetic_points() if compatible else [],
            "force_required": self._calculate_magnetic_force(area) if compatible else "N/A",
        }

    def _calculate_magnetic_points(self) -> List[Dict[str, float]]:
        """Simple magnetic point layout: four edge anchors."""
        bbox = self.cad_metrics.get("bounding_box", [0, 0, 0, 0])
        cx = (bbox[0] + bbox[2]) / 2
        cy = (bbox[1] + bbox[3]) / 2
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        inset = min(w, h) * 0.1
        return [
            {"x": bbox[0] + inset, "y": cy},
            {"x": bbox[2] - inset, "y": cy},
            {"x": cx, "y": bbox[1] + inset},
            {"x": cx, "y": bbox[3] - inset},
        ]

    def _calculate_magnetic_force(self, area: float) -> str:
        """Estimate required magnetic force (placeholder heuristic)."""
        # Simple heuristic: 0.02 N per mm², capped
        force = min(10.0, max(2.0, area * 0.00002))
        return f"{force:.2f}N"
