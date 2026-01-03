"""
Pydantic schemas for Calibration Safety Net API validation.
These schemas ensure input data quality and prevent bad inputs.
"""

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class ProfileData(BaseModel):
    """Validated profile data schema for calibration predictions."""

    id: str = Field(..., description="Profile identifier")
    material_type: str = Field(..., description="Material type (aluminum, upvc, steel)")
    thickness_mm: float = Field(
        ..., gt=0, le=100, description="Material thickness in mm"
    )
    width_mm: float = Field(..., gt=0, le=1000, description="Profile width in mm")
    height_mm: Optional[float] = Field(
        None, gt=0, le=1000, description="Profile height in mm"
    )
    weight_kg: Optional[float] = Field(None, gt=0, description="Profile weight in kg")
    system_pack: Optional[str] = Field(None, description="System pack identifier")

    @field_validator("material_type")
    @classmethod
    def validate_material_type(cls, v: str) -> str:
        """Validate material type."""
        valid_types = {"aluminum", "upvc", "steel", "wood", "composite"}
        if v.lower() not in valid_types:
            raise ValueError(f"Material type must be one of {valid_types}")
        return v.lower()

    @field_validator("thickness_mm")
    @classmethod
    def validate_thickness(cls, v: float) -> float:
        """Validate thickness range."""
        if v < 0.1 or v > 100:
            raise ValueError(f"Thickness {v}mm out of range (0.1-100mm)")
        return v


class PredictionRequest(BaseModel):
    """Request schema for K-factor prediction."""

    profile_data: ProfileData = Field(..., description="Profile characteristics")
    joint_type: str = Field(
        ..., description="Type of joint (miter_45, miter_90, butt, etc.)"
    )
    workshop_id: Optional[str] = Field(
        None, description="Workshop identifier (optional)"
    )
    current_k_factor: Optional[float] = Field(
        None, ge=0, le=10, description="Current K-factor (optional)"
    )

    @field_validator("joint_type")
    @classmethod
    def validate_joint_type(cls, v: str) -> str:
        """Validate joint type."""
        valid_types = {
            "miter_45",
            "miter_90",
            "butt",
            "corner",
            "t_joint",
            "cross_joint",
        }
        if v.lower() not in valid_types:
            raise ValueError(f"Joint type must be one of {valid_types}")
        return v.lower()

    @field_validator("current_k_factor")
    @classmethod
    def validate_k_factor(cls, v: Optional[float]) -> Optional[float]:
        """Validate K-factor range."""
        if v is not None and (v < 0 or v > 10):
            raise ValueError(f"K-factor {v} out of range (0-10)")
        return v


class CertifyBaselineRequest(BaseModel):
    """Request schema for baseline certification."""

    profile_id: str = Field(..., description="Profile identifier")
    joint_type: str = Field(..., description="Type of joint")
    workshop_id: Optional[str] = Field(
        None, description="Workshop identifier (optional)"
    )
    k_factor: float = Field(..., ge=0, le=10, description="K-factor value")
    confidence: float = Field(
        ..., ge=0.85, le=1.0, description="Confidence score (must be >= 0.85)"
    )
    certified_by: str = Field(
        ..., description="User identifier who certified this baseline"
    )
    sample_size: int = Field(
        0, ge=0, description="Number of samples used for certification"
    )
    model_version: str = Field(..., description="Model version used")
    reasoning: Optional[List[str]] = Field(
        None, description="Reasoning for this baseline"
    )

    @field_validator("confidence")
    @classmethod
    def validate_confidence(cls, v: float) -> float:
        """Validate confidence floor."""
        if v < 0.85:
            raise ValueError(f"Confidence {v} below minimum threshold (0.85)")
        return v

    @field_validator("joint_type")
    @classmethod
    def validate_joint_type(cls, v: str) -> str:
        """Validate joint type."""
        valid_types = {
            "miter_45",
            "miter_90",
            "butt",
            "corner",
            "t_joint",
            "cross_joint",
        }
        if v.lower() not in valid_types:
            raise ValueError(f"Joint type must be one of {valid_types}")
        return v.lower()


class KFactorPredictionResponse(BaseModel):
    """Response schema for K-factor prediction."""

    profile_id: str
    joint_type: str
    predicted_k_factor: float
    confidence: float
    reasoning: List[str]
    contributing_factors: Dict[str, float]
    sample_size: int
    workshops_contributing: int
    data_quality_score: float
    current_k_factor: Optional[float] = None
    suggested_adjustment: Optional[float] = None
    model_version: str
    predicted_at: datetime


class BaselineCertificationResponse(BaseModel):
    """Response schema for baseline certification."""

    baseline_id: str
    profile_id: str
    joint_type: str
    workshop_id: Optional[str]
    k_factor: float
    confidence: float
    baseline_version: str
    certified_at: datetime
    certified_by: str
    status: str
