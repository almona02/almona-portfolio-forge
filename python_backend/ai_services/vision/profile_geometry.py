import math
from typing import Dict, List, Optional, Tuple

import numpy as np


class ProfileGeometryAnalyzer:
    """Engineering analysis utilities for fenestration profiles."""

    ALUMINUM_DENSITY = 2700  # kg/m^3
    STEEL_DENSITY = 7850
    PVC_DENSITY = 1380

    @classmethod
    def _get_density(cls, material: str) -> float:
        material = (material or "aluminum").lower()
        if "steel" in material:
            return cls.STEEL_DENSITY
        if "pvc" in material:
            return cls.PVC_DENSITY
        return cls.ALUMINUM_DENSITY

    @classmethod
    def calculate_wall_thickness(
        cls,
        weight_kg_per_m: float,
        outer_width_mm: float,
        outer_height_mm: float,
        material: str = "aluminum",
    ) -> Dict:
        """Estimate wall thickness and cross-section area for a hollow profile."""
        if (
            weight_kg_per_m is None
            or weight_kg_per_m <= 0
            or outer_width_mm <= 0
            or outer_height_mm <= 0
        ):
            return {"error": "Invalid dimensions or weight"}

        density = cls._get_density(material)
        area_m2 = weight_kg_per_m / density
        area_mm2 = area_m2 * 1e6
        perimeter_mm = 2 * (outer_width_mm + outer_height_mm)
        avg_thickness_mm = area_mm2 / perimeter_mm if perimeter_mm > 0 else 0.0

        # Solve 2t^2 - (a+b)t + A/2 = 0 for a hollow rectangle approximation.
        a, b = outer_width_mm, outer_height_mm
        coeff_a = 2.0
        coeff_b = -(a + b)
        coeff_c = area_mm2 / 2.0
        discriminant = coeff_b**2 - 4 * coeff_a * coeff_c
        accurate_thickness = avg_thickness_mm
        if discriminant >= 0:
            sqrt_disc = math.sqrt(discriminant)
            t1 = (-coeff_b + sqrt_disc) / (2 * coeff_a)
            t2 = (-coeff_b - sqrt_disc) / (2 * coeff_a)
            candidates = [t for t in (t1, t2) if 0.4 <= t <= 6.0]
            if candidates:
                accurate_thickness = min(candidates)

        checks = cls._engineering_checks(
            accurate_thickness, outer_width_mm, outer_height_mm, material
        )
        return {
            "cross_section_area_mm2": round(area_mm2, 2),
            "perimeter_mm": round(perimeter_mm, 2),
            "avg_thickness_mm_simple": round(avg_thickness_mm, 3),
            "accurate_thickness_mm": round(accurate_thickness, 3),
            "material_density_kg_m3": density,
            "weight_per_meter_kg": weight_kg_per_m,
            "outer_dimensions_mm": {
                "width": outer_width_mm,
                "height": outer_height_mm,
            },
            "volume_per_meter_m3": area_m2,
            "engineering_checks": checks,
        }

    @classmethod
    def estimate_profile_type(
        cls,
        dimensions: List[float],
        weight_kg_per_m: Optional[float] = None,
        material: str = "aluminum",
    ) -> Dict:
        """Infer profile type, thickness, thermal hint, and applications."""
        if not dimensions or len(dimensions) < 2:
            return {"error": "Insufficient dimension data"}

        dims_sorted = sorted(dimensions, reverse=True)
        width, height = dims_sorted[0], dims_sorted[1]
        thickness_info = (
            cls.calculate_wall_thickness(weight_kg_per_m, width, height, material)
            if weight_kg_per_m
            else {}
        )
        thickness = thickness_info.get("accurate_thickness_mm")
        area = thickness_info.get("cross_section_area_mm2")

        profile_type = cls._classify_profile(width, height, thickness, area)
        thermal = cls._estimate_thermal_performance(width, height, thickness, material)

        return {
            "estimated_profile_type": profile_type,
            "calculated_thickness_mm": thickness,
            "cross_section_area_mm2": area,
            "primary_dimensions_mm": {"width": width, "height": height},
            "aspect_ratio": round(width / height, 2) if height else None,
            "linear_weight_kg_m": weight_kg_per_m,
            "engineering_analysis": thickness_info,
            "thermal_performance": thermal,
            "suggested_applications": cls._suggest_application(
                profile_type, width, thickness or 0.0
            ),
        }

    @staticmethod
    def _engineering_checks(
        thickness: float, width: float, height: float, material: str
    ) -> Dict:
        ranges = {
            "aluminum": (1.0, 3.0),
            "steel": (1.2, 2.5),
            "pvc": (2.0, 3.5),
        }
        min_t, max_t = ranges.get(material.lower(), (1.0, 3.0))
        smaller = min(width, height) if min(width, height) > 0 else 1.0
        pct = (thickness / smaller) * 100 if smaller else 0.0
        return {
            "thickness_within_typical_range": min_t <= thickness <= max_t,
            "thickness_to_width_ratio_pct": round(
                thickness / width * 100, 2
            )
            if width
            else None,
            "aspect_ratio": round(width / height, 2) if height else None,
            "structural_soundness": 1.0 <= pct <= 5.0,
            "weight_distribution_ok": pct < 10,
        }

    @staticmethod
    def _classify_profile(
        width: float, height: float, thickness: Optional[float], area: Optional[float]
    ) -> str:
        aspect_ratio = width / height if height else 1.0
        if aspect_ratio > 2.0:
            return "SLIDING_FRAME_PROFILE"
        if 1.2 <= aspect_ratio <= 2.0:
            if thickness and thickness > 2.0:
                return "STRUCTURAL_MULLION"
            return "CASEMENT_FRAME"
        if area and area > 800:
            return "SLIDING_DOOR_PROFILE"
        return "WINDOW_SASH_PROFILE"

    @staticmethod
    def _estimate_thermal_performance(
        width: float, height: float, thickness: Optional[float], material: str
    ) -> Dict:
        if material.lower() == "aluminum":
            if width > 50 or height > 50:
                u_value = 2.0
                has_thermal_break = True
            else:
                u_value = 5.7
                has_thermal_break = False
        else:
            u_value = 1.8
            has_thermal_break = False
        return {
            "estimated_u_value_w_m2k": u_value,
            "likely_has_thermal_break": has_thermal_break,
            "thermal_performance": "Good" if u_value < 3.0 else "Standard",
            "energy_class": "A" if u_value < 1.4 else ("B" if u_value < 2.0 else "C"),
        }

    @staticmethod
    def _suggest_application(
        profile_type: str, width: float, thickness: float
    ) -> List[str]:
        apps: List[str] = []
        if "SLIDING" in profile_type:
            apps.append("Sliding windows/doors")
            apps.append("Large sliding doors" if width > 70 else "Standard sliding windows")
        if "CASEMENT" in profile_type or "SASH" in profile_type:
            apps.append("Opening casement windows")
            apps.append("Ventilated facades")
        if "MULLION" in profile_type or "STRUCTURAL" in profile_type:
            apps.append("Structural glazing")
            apps.append("Curtain wall mullions")
            apps.append("Large span applications")
        if thickness > 2.5:
            apps.append("Heavy-duty applications")
            apps.append("Commercial buildings")
        else:
            apps.append("Residential windows")
            apps.append("Light commercial")
        return apps

