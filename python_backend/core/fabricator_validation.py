"""
Shared Fabricator validation utilities for backend enforcement.

These constraints mirror (and slightly broaden) the front‑end safety rails used
in the Fabricator workflow so that critical limits are enforced server‑side as
well, not just in React/TypeScript.
"""

from typing import Optional, Sequence


class ProductionConstraints:
    """
    High‑level production constraints for profiles / window units.

    Values are intentionally generous to avoid breaking existing data, while
    still catching obviously invalid dimensions in production.

    Implemented as a simple constants container (not a Pydantic model) so that
    tests and application code can reliably access class attributes like
    ``ProductionConstraints.MAX_WIDTH_MM``.
    """

    # Hard safety rails (keep in sync with frontend where possible)
    MAX_STOCK_LENGTH_MM: int = 8000  # Global max bar length in mm
    MAX_WIDTH_MM: int = 10000        # Max allowed profile/window width in mm
    MAX_HEIGHT_MM: int = 5000        # Max allowed profile/window height in mm
    MAX_AREA_M2: int = 50            # Max allowed window area in square meters

    @classmethod
    def validate_profile_dimensions(
        cls,
        width_mm: Optional[float],
        height_mm: Optional[float],
    ) -> None:
        """
        Basic guardrails for profile dimensions. This should stay in sync with
        frontend constraints but is allowed to be slightly more permissive.
        """
        if width_mm is not None and width_mm > cls.MAX_WIDTH_MM:
            raise ValueError(f"Width {width_mm}mm exceeds maximum {cls.MAX_WIDTH_MM}mm")

        if height_mm is not None and height_mm > cls.MAX_HEIGHT_MM:
            raise ValueError(f"Height {height_mm}mm exceeds maximum {cls.MAX_HEIGHT_MM}mm")

    @classmethod
    def validate_window_unit_area(cls, width_mm: float, height_mm: float) -> None:
        """
        Optional area‑based check for full window units.
        """
        area_m2 = (width_mm * height_mm) / 1_000_000.0
        if area_m2 > cls.MAX_AREA_M2:
            raise ValueError(
                f"Area {area_m2:.2f}m² exceeds maximum {cls.MAX_AREA_M2}m²"
            )

    @classmethod
    def validate_cutting_plan(cls, cuts_mm: Sequence[float]) -> None:
        """
        Validate that no requested cut exceeds the maximum stock length.

        This is used by production tests to ensure backend cutting optimization
        cannot silently accept over-length stock requirements.
        """
        for length in cuts_mm:
            if length > cls.MAX_STOCK_LENGTH_MM:
                raise ValueError(
                    f"Cut length {length}mm exceeds maximum stock length "
                    f"{cls.MAX_STOCK_LENGTH_MM}mm"
                )



