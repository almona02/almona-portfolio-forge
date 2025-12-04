"""
Structural Engineering Statics Calculator
==========================================

Integrates engineering physics directly into the design flow.
Calculates Moment of Inertia (Ix, Iy) requirements based on
wind load and glass weight.

The Gap: Optimization is great, but is the window safe?
Logikal wins because it calculates static loads.

The Prestige Solution: Integrate Engineering Physics directly
into the design flow. Calculate required structural capacity
based on wind load, glass weight, and profile properties.

Features:
- Moment of Inertia (Ix, Iy) calculations
- Wind load analysis per EN 12210
- Profile viability checking with safety factors
- Glass weight distribution
- Deflection calculations per building codes

Standards Reference:
- EN 12210: Windows and doors - Resistance to wind load
- EN 14351-1: Windows and doors - Product standard
- AAMA/WDMA/CSA 101/I.S.2: North American standard
"""

import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class LoadCase(Enum):
    """Load case types for structural analysis."""
    WIND_POSITIVE = "wind_positive"  # Wind pressure (into building)
    WIND_NEGATIVE = "wind_negative"  # Wind suction (out of building)
    DEAD_LOAD = "dead_load"          # Self-weight
    LIVE_LOAD = "live_load"          # Operational loads
    COMBINED = "combined"             # Combined load cases


class SupportCondition(Enum):
    """Beam support conditions."""
    SIMPLY_SUPPORTED = "simply_supported"
    FIXED_FIXED = "fixed_fixed"
    FIXED_FREE = "fixed_free"  # Cantilever
    CONTINUOUS = "continuous"


class PerformanceClass(Enum):
    """EN 12210 wind resistance performance classes."""
    CLASS_1 = "1"    # 400 Pa
    CLASS_2 = "2"    # 800 Pa
    CLASS_3 = "3"    # 1200 Pa
    CLASS_4 = "4"    # 1600 Pa
    CLASS_5 = "5"    # 2000 Pa
    CLASS_E = "E"    # > 2000 Pa (exceptional)


@dataclass
class ProfileProperties:
    """Structural properties of a profile section."""
    name: str

    # Cross-section properties
    area: float                  # mm²
    ix: float                    # Moment of inertia about X, cm⁴
    iy: float                    # Moment of inertia about Y, cm⁴
    wx: float = 0                # Section modulus X, cm³
    wy: float = 0                # Section modulus Y, cm³

    # Dimensions
    depth: float = 60            # Profile depth, mm
    width: float = 40            # Profile width, mm
    wall_thickness: float = 1.5  # Wall thickness, mm

    # Material properties
    material: str = "aluminum"
    # MPa (N/mm²) - Aluminum 6063-T5
    youngs_modulus: float = 70000
    yield_strength: float = 170    # MPa
    density: float = 2700          # kg/m³

    # Weight
    weight_per_meter: float = 0    # kg/m (calculated if 0)

    def __post_init__(self):
        """Calculate derived properties."""
        if self.weight_per_meter == 0:
            self.weight_per_meter = self.area * self.density / 1e6

        if self.wx == 0 and self.ix > 0:
            # Approximate section modulus
            # Convert cm⁴ to cm³
            self.wx = self.ix * 10 / (self.depth / 2)  # noqa: E501

        if self.wy == 0 and self.iy > 0:
            self.wy = self.iy * 10 / (self.width / 2)


@dataclass
class WindLoadResult:
    """Result of wind load calculation."""
    wind_pressure: float         # Pa
    total_load: float            # N
    distributed_load: float      # N/m
    
    performance_class: PerformanceClass
    safety_factor: float
    
    # Load distribution
    mullion_load: float = 0      # N/m on mullion
    transom_load: float = 0      # N/m on transom


@dataclass
class DeflectionResult:
    """Result of deflection calculation."""
    max_deflection: float        # mm
    deflection_ratio: float      # L/xxx
    allowable_deflection: float  # mm
    allowable_ratio: float       # Typically L/200 or L/300
    
    is_acceptable: bool
    utilization: float           # Actual/Allowable
    
    # Position
    deflection_at: str = "mid-span"


@dataclass
class ProfileViability:
    """Complete viability assessment for a profile."""
    profile_name: str
    is_viable: bool

    # Required vs Available
    required_ix: float           # cm⁴
    available_ix: float          # cm⁴
    required_iy: float = 0       # cm⁴
    available_iy: float = 0      # cm⁴

    # Utilization (%)
    ix_utilization: float
    iy_utilization: float = 0

    # Safety
    safety_factor: float
    stress_ratio: float = 0      # Actual/Yield

    # Deflection
    deflection: Optional[DeflectionResult] = None
    
    # Recommendations
    recommendations: List[str] = field(default_factory=list)
    alternative_profiles: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        if self.deflection and self.deflection.deflection_ratio > 0:
            ratio_str = f"L/{int(1/self.deflection.deflection_ratio)}"
        else:
            ratio_str = "N/A"

        return {
            "profile_name": self.profile_name,
            "is_viable": self.is_viable,
            "required_ix_cm4": round(self.required_ix, 2),
            "available_ix_cm4": round(self.available_ix, 2),
            "ix_utilization_percent": round(self.ix_utilization, 1),
            "safety_factor": round(self.safety_factor, 2),
            "deflection": {
                "max_mm": round(self.deflection.max_deflection, 2),
                "ratio": ratio_str,
                "is_acceptable": self.deflection.is_acceptable
            } if self.deflection else None,
            "recommendations": self.recommendations,
            "alternative_profiles": self.alternative_profiles
        }


class StaticsCalculator:
    """
    Structural engineering calculator for window/door systems.

    Performs load calculations, deflection analysis, and profile
    selection verification per EN 12210 and other standards.
    """

    # Standard deflection limits (L/ratio)
    DEFLECTION_LIMITS = {
        "mullion": 200,      # L/200 for mullions
        "transom": 300,      # L/300 for transoms
        "frame": 200,        # L/200 for frames
        "curtain_wall": 175  # L/175 for curtain walls
    }

    # EN 12210 wind pressure classes (Pa)
    WIND_CLASSES = {
        PerformanceClass.CLASS_1: 400,
        PerformanceClass.CLASS_2: 800,
        PerformanceClass.CLASS_3: 1200,
        PerformanceClass.CLASS_4: 1600,
        PerformanceClass.CLASS_5: 2000,
        PerformanceClass.CLASS_E: 2400
    }

    def __init__(self, safety_factor: float = 1.5):
        """
        Initialize the statics calculator.

        Args:
            safety_factor: Design safety factor (typically 1.5)
        """
        self.safety_factor = safety_factor

    def calculate_required_inertia(
        self,
        span_m: float,
        tributary_width_m: float,
        wind_pressure_pa: float,
        max_deflection_ratio: float = 200,
        support: SupportCondition = SupportCondition.SIMPLY_SUPPORTED,
        youngs_modulus_mpa: float = 70000
    ) -> float:
        """
        Calculate required Moment of Inertia (Ix) in cm⁴.

        Based on beam theory for uniformly distributed load.

        Args:
            span_m: Mullion/transom span in meters
            tributary_width_m: Tributary width for load collection
            wind_pressure_pa: Wind pressure in Pascal
            max_deflection_ratio: Allowable deflection ratio
                (e.g., 200 for L/200)
            support: Beam support condition
            youngs_modulus_mpa: Material Young's modulus in MPa

        Returns:
            Required moment of inertia in cm⁴
        """
        # Convert units
        L = span_m * 1000  # mm
        w = tributary_width_m * 1000  # mm
        P = wind_pressure_pa  # Pa = N/m²
        E = youngs_modulus_mpa  # MPa = N/mm²

        # Maximum allowable deflection
        delta_max = L / max_deflection_ratio  # mm

        # Distributed load (N/mm)
        q = P * w / 1e6  # Convert Pa·mm to N/mm

        # Required I based on deflection formula
        # For simply supported beam: delta = 5·q·L⁴ / (384·E·I)
        # Solving for I: I = 5·q·L⁴ / (384·E·delta)

        if support == SupportCondition.SIMPLY_SUPPORTED:
            coefficient = 5 / 384
        elif support == SupportCondition.FIXED_FIXED:
            coefficient = 1 / 384
        elif support == SupportCondition.FIXED_FREE:  # Cantilever
            coefficient = 1 / 8
        else:
            coefficient = 5 / 384  # Default to simply supported

        # Calculate required I (mm⁴)
        # Formula: I = coefficient * q * L⁴ / (E * delta_max)
        I_mm4 = coefficient * q * (L ** 4) / (E * delta_max)  # noqa: E501

        # Apply safety factor
        I_mm4 *= self.safety_factor

        # Convert to cm⁴
        I_cm4 = I_mm4 / 10000

        return round(I_cm4, 2)

    def calculate_wind_load(
        self,
        width_m: float,
        height_m: float,
        wind_pressure_pa: float,
        safety_factor: float = 1.5
    ) -> WindLoadResult:
        """
        Calculate wind load on a window/door unit.

        Args:
            width_m: Unit width in meters
            height_m: Unit height in meters
            wind_pressure_pa: Design wind pressure in Pascal
            safety_factor: Load safety factor

        Returns:
            WindLoadResult with load values and classification
        """
        # Total area
        area = width_m * height_m  # m²

        # Total load
        total_load = wind_pressure_pa * area * safety_factor  # N

        # Distributed load on mullion (assumes equal distribution)
        mullion_load = (
            wind_pressure_pa * (width_m / 2) * safety_factor
        )  # N/m

        # Distributed load on transom
        transom_load = (
            wind_pressure_pa * (height_m / 2) * safety_factor
        )  # N/m
        
        # Determine performance class
        performance_class = PerformanceClass.CLASS_1
        for cls, pressure in sorted(
            self.WIND_CLASSES.items(),
            key=lambda x: x[1],
            reverse=True
        ):
            if wind_pressure_pa >= pressure:
                performance_class = cls
                break
        
        return WindLoadResult(
            wind_pressure=wind_pressure_pa,
            total_load=round(total_load, 1),
            distributed_load=round(total_load / height_m, 1),
            performance_class=performance_class,
            safety_factor=safety_factor,
            mullion_load=round(mullion_load, 1),
            transom_load=round(transom_load, 1)
        )
    
    def calculate_deflection(
        self,
        span_m: float,
        tributary_width_m: float,
        wind_pressure_pa: float,
        profile: ProfileProperties,
        support: SupportCondition = SupportCondition.SIMPLY_SUPPORTED,
        member_type: str = "mullion"
    ) -> DeflectionResult:
        """
        Calculate deflection for a structural member.

        Args:
            span_m: Member span in meters
            tributary_width_m: Tributary width in meters
            wind_pressure_pa: Wind pressure in Pascal
            profile: Profile properties
            support: Support condition
            member_type: Type of member for deflection limit

        Returns:
            DeflectionResult with deflection values and assessment
        """
        # Convert units
        L = span_m * 1000  # mm
        w = tributary_width_m * 1000  # mm
        E = profile.youngs_modulus  # MPa
        I = profile.ix * 10000  # Convert cm⁴ to mm⁴

        # Distributed load (N/mm)
        q = wind_pressure_pa * w / 1e6

        # Calculate maximum deflection
        # Formula: delta = coefficient * q * L⁴ / (E * I)
        if support == SupportCondition.SIMPLY_SUPPORTED:
            # delta_max = 5·q·L⁴ / (384·E·I)
            delta = (5 * q * L**4) / (384 * E * I)  # noqa: E501
        elif support == SupportCondition.FIXED_FIXED:
            delta = (q * L**4) / (384 * E * I)  # noqa: E501
        elif support == SupportCondition.FIXED_FREE:
            delta = (q * L**4) / (8 * E * I)  # noqa: E501
        else:
            delta = (5 * q * L**4) / (384 * E * I)  # noqa: E501

        # Deflection ratio
        deflection_ratio = delta / L if L > 0 else 0

        # Allowable deflection
        allowable_ratio = self.DEFLECTION_LIMITS.get(member_type, 200)
        allowable_deflection = L / allowable_ratio

        is_acceptable = delta <= allowable_deflection
        utilization = (
            delta / allowable_deflection
            if allowable_deflection > 0 else 999
        )
        
        return DeflectionResult(
            max_deflection=round(delta, 2),
            deflection_ratio=deflection_ratio,
            allowable_deflection=round(allowable_deflection, 2),
            allowable_ratio=allowable_ratio,
            is_acceptable=is_acceptable,
            utilization=round(utilization, 2)
        )
    
    def check_profile_viability(
        self,
        profile: ProfileProperties,
        span_m: float,
        tributary_width_m: float,
        wind_pressure_pa: float,
        member_type: str = "mullion"
    ) -> ProfileViability:
        """
        Check if a profile is structurally viable for the application.

        Args:
            profile: Profile properties to check
            span_m: Member span in meters
            tributary_width_m: Tributary width in meters
            wind_pressure_pa: Design wind pressure in Pascal
            member_type: Type of structural member

        Returns:
            ProfileViability with complete assessment
        """
        # Calculate required inertia
        deflection_limit = self.DEFLECTION_LIMITS.get(member_type, 200)
        required_ix = self.calculate_required_inertia(
            span_m=span_m,
            tributary_width_m=tributary_width_m,
            wind_pressure_pa=wind_pressure_pa,
            max_deflection_ratio=deflection_limit
        )

        # Calculate deflection
        deflection = self.calculate_deflection(
            span_m=span_m,
            tributary_width_m=tributary_width_m,
            wind_pressure_pa=wind_pressure_pa,
            profile=profile,
            member_type=member_type
        )

        # Calculate utilization
        ix_utilization = (
            (required_ix / profile.ix * 100) if profile.ix > 0 else 999
        )

        # Calculate safety factor
        actual_safety_factor = (
            profile.ix / required_ix if required_ix > 0 else 0
        )

        # Determine viability
        is_viable = (
            profile.ix >= required_ix and
            deflection.is_acceptable
        )

        # Generate recommendations
        recommendations = []

        if not is_viable:
            if profile.ix < required_ix:
                deficit = required_ix - profile.ix
                recommendations.append(
                    f"Profile Ix ({profile.ix:.1f} cm⁴) is insufficient. "
                    f"Need {required_ix:.1f} cm⁴ "
                    f"(deficit: {deficit:.1f} cm⁴)"
                )

            if not deflection.is_acceptable:
                recommendations.append(
                    f"Deflection {deflection.max_deflection:.1f}mm exceeds "
                    f"limit of {deflection.allowable_deflection:.1f}mm "
                    f"(L/{deflection.allowable_ratio})"
                )
        else:
            if actual_safety_factor > 3:
                recommendations.append(
                    f"Profile is over-designed "
                    f"(SF={actual_safety_factor:.1f}). "
                    "Consider smaller profile for cost savings."
                )
            elif actual_safety_factor < 1.5:
                recommendations.append(
                    f"Safety factor ({actual_safety_factor:.2f}) is below "
                    f"recommended 1.5"
                )
            else:
                recommendations.append(
                    "Profile is suitable for this application"
                )

        return ProfileViability(
            profile_name=profile.name,
            is_viable=is_viable,
            required_ix=required_ix,
            available_ix=profile.ix,
            ix_utilization=ix_utilization,
            safety_factor=actual_safety_factor,
            deflection=deflection,
            recommendations=recommendations
        )

    def calculate_glass_weight(
        self,
        width_m: float,
        height_m: float,
        glass_thickness_mm: float,
        glass_count: int = 2,  # Double glazing
        glass_density: float = 2500  # kg/m³
    ) -> Dict[str, float]:
        """
        Calculate glass weight for a window unit.

        Args:
            width_m: Glass width in meters
            height_m: Glass height in meters
            glass_thickness_mm: Thickness of each pane in mm
            glass_count: Number of glass panes (2 for double, 3 for triple)
            glass_density: Glass density in kg/m³

        Returns:
            Dictionary with weight information
        """
        area = width_m * height_m  # m²
        volume_per_pane = area * (glass_thickness_mm / 1000)  # m³

        weight_per_pane = volume_per_pane * glass_density  # kg
        total_weight = weight_per_pane * glass_count

        # Weight per meter of perimeter (for frame loading)
        perimeter = 2 * (width_m + height_m)
        weight_per_meter = (
            total_weight / perimeter if perimeter > 0 else 0
        )

        return {
            "total_weight_kg": round(total_weight, 2),
            "weight_per_pane_kg": round(weight_per_pane, 2),
            "weight_per_meter_kg": round(weight_per_meter, 2),
            "area_m2": round(area, 2),
            "glass_count": glass_count
        }

    def get_wind_class_pressure(
        self, performance_class: PerformanceClass
    ) -> float:
        """Get test pressure for a given EN 12210 performance class."""
        return self.WIND_CLASSES.get(performance_class, 1200)


# Convenience function
def check_mullion_design(
    span_m: float,
    spacing_m: float,
    wind_pressure_pa: float,
    profile_ix_cm4: float,
    profile_name: str = "Custom"
) -> Dict[str, Any]:
    """
    Quick check for mullion structural adequacy.

    Args:
        span_m: Mullion height/span in meters
        spacing_m: Mullion spacing (tributary width) in meters
        wind_pressure_pa: Design wind pressure in Pascal
        profile_ix_cm4: Profile moment of inertia in cm⁴
        profile_name: Profile identification

    Returns:
        Dictionary with check results
    """
    calculator = StaticsCalculator()

    profile = ProfileProperties(
        name=profile_name,
        area=500,  # Placeholder
        ix=profile_ix_cm4,
        iy=profile_ix_cm4 * 0.5  # Approximate
    )

    viability = calculator.check_profile_viability(
        profile=profile,
        span_m=span_m,
        tributary_width_m=spacing_m,
        wind_pressure_pa=wind_pressure_pa,
        member_type="mullion"
    )

    return viability.to_dict()


