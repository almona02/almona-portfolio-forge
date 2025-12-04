"""
K-Factor Calibration Analytics API
==================================

The crown jewel of Fabricator Pro - provides full parameter control
for K-factor calibration, the platform's key differentiator.

Features:
- K-factor history and trend analysis
- Profile-specific calibration parameters
- ML-powered K-factor suggestions with confidence scores
- Verification event tracking
- Production feedback integration
- Per-workshop and collective learning

This API enables the "Define → Control → Calibrate → Reflect → Learn → Predict"
virtuous cycle that makes Fabricator Pro a self-learning platform.
"""

from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from enum import Enum
import logging
import statistics

from core.supabase_client import supabase_client
from core.security_logger import SecurityLogger

router = APIRouter(prefix="/calibration", tags=["calibration"])
logger = logging.getLogger(__name__)
security_logger = SecurityLogger()


# ============================================================================
# Enums and Constants
# ============================================================================

class JointType(str, Enum):
    """Types of profile joints."""
    MITER_45 = "miter_45"
    MITER_90 = "miter_90"
    BUTT = "butt"
    COPE = "cope"
    SCARF = "scarf"
    CUSTOM = "custom"


class FitStatus(str, Enum):
    """Production feedback fit status."""
    PERFECT = "perfect"
    TIGHT = "tight"
    LOOSE = "loose"
    ADJUST_NEEDED = "adjust_needed"
    REJECTED = "rejected"


class CalibrationSource(str, Enum):
    """Source of calibration data."""
    MANUAL = "manual"           # User entered manually
    TEST_CUT = "test_cut"       # From calibration test cut
    PRODUCTION = "production"   # From production feedback
    AI_SUGGESTED = "ai_suggested"  # AI recommendation
    IMPORTED = "imported"       # Imported from external source


# ============================================================================
# Pydantic Models
# ============================================================================

class KFactorEntry(BaseModel):
    """K-factor entry for a specific joint type."""
    joint_type: JointType
    k_factor: float = Field(
        ..., ge=-50, le=50, description="K-factor value in mm"
    )
    tolerance: float = Field(
        0.5, ge=0, le=5, description="Acceptable tolerance in mm"
    )
    confidence: float = Field(
        0.5, ge=0, le=1, description="Confidence score 0-1"
    )
    source: CalibrationSource = CalibrationSource.MANUAL
    notes: Optional[str] = None


class ProfileCalibration(BaseModel):
    """Complete calibration data for a profile."""
    profile_id: str = Field(..., description="Profile UUID")
    profile_name: str = Field(
        ..., description="Profile name for reference"
    )
    system_pack: Optional[str] = Field(
        None, description="System pack (e.g., ROCK 60)"
    )

    # K-factors per joint type
    k_factors: List[KFactorEntry] = Field(default_factory=list)

    # Material deductions
    frame_deduction: float = Field(0, description="Frame deduction in mm")
    sash_deduction: float = Field(0, description="Sash deduction in mm")
    glass_deduction: float = Field(0, description="Glass deduction in mm")

    # Machining parameters
    machining_speed: float = Field(
        1000, ge=0, description="Recommended feed rate mm/min"
    )
    spindle_rpm: int = Field(
        12000, ge=0, description="Recommended spindle RPM"
    )

    # Metadata
    last_verified: Optional[datetime] = None
    verified_count: int = Field(0, ge=0)
    rejection_count: int = Field(0, ge=0)

    # User overrides
    user_overrides: Dict[str, Any] = Field(default_factory=dict)


class CalibrationTestResult(BaseModel):
    """Result from a calibration test cut."""
    profile_id: str
    joint_type: JointType
    
    # Test parameters
    target_length: float = Field(
        ..., ge=0, description="Target cut length in mm"
    )
    actual_length: float = Field(
        ..., ge=0, description="Actual measured length in mm"
    )
    k_factor_used: float = Field(
        ..., description="K-factor used for this cut"
    )

    # Results
    deviation: float = Field(
        ..., description="Deviation from target in mm"
    )
    fit_status: FitStatus
    
    # Suggested adjustment
    suggested_k_adjustment: Optional[float] = None
    
    # Metadata
    operator_id: Optional[str] = None
    machine_id: Optional[str] = None
    notes: Optional[str] = None


class ProductionFeedback(BaseModel):
    """Production floor feedback via QR code scan."""
    production_label_id: str = Field(
        ..., description="QR code / production label ID"
    )
    profile_id: str
    joint_type: JointType

    # Feedback
    fit_status: FitStatus
    adjustment_applied: Optional[float] = Field(
        None, description="Manual adjustment made in mm"
    )

    # Context
    operator_id: Optional[str] = None
    machine_id: Optional[str] = None
    temperature: Optional[float] = Field(
        None, description="Workshop temperature °C"
    )
    humidity: Optional[float] = Field(
        None, description="Workshop humidity %"
    )

    notes: Optional[str] = None


class KFactorSuggestion(BaseModel):
    """AI-generated K-factor suggestion."""
    profile_id: str
    joint_type: JointType
    
    suggested_k_factor: float
    confidence: float = Field(..., ge=0, le=1)
    reasoning: List[str] = Field(default_factory=list)
    
    # Supporting data
    sample_size: int
    based_on_workshops: int
    trend_direction: str  # "stable", "increasing", "decreasing"
    
    # Comparison
    current_k_factor: Optional[float] = None
    suggested_adjustment: Optional[float] = None


class CalibrationTrend(BaseModel):
    """Trend analysis for a profile's calibration."""
    profile_id: str
    profile_name: str
    joint_type: JointType
    
    # Statistics
    current_k_factor: float
    average_k_factor: float
    std_deviation: float
    min_k_factor: float
    max_k_factor: float
    
    # Trend
    trend_direction: str
    trend_slope: float
    
    # Health indicators
    stability_score: float = Field(..., ge=0, le=1)
    accuracy_score: float = Field(..., ge=0, le=1)
    
    # Recommendations
    needs_attention: bool
    recommendations: List[str]
    
    # Period
    period_start: datetime
    period_end: datetime
    data_points: int


class WorkshopCalibrationStats(BaseModel):
    """Workshop-level calibration statistics."""
    workshop_id: str
    
    # Profile counts
    total_profiles: int
    calibrated_profiles: int
    profiles_needing_attention: int
    
    # Performance
    overall_accuracy: float
    average_confidence: float
    
    # Activity
    verifications_last_30_days: int
    adjustments_last_30_days: int
    
    # Top issues
    problematic_profiles: List[Dict[str, Any]]


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/profiles/{profile_id}", response_model=ProfileCalibration)
async def get_profile_calibration(profile_id: str):
    """
    Get complete calibration data for a profile.
    
    Returns K-factors, deductions, machining parameters, and history.
    """
    try:
        # Get profile data
        profile_result = supabase_client.table("fabricator_profiles")\
            .select("*")\
            .eq("id", profile_id)\
            .single()\
            .execute()
        
        if not profile_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        profile = profile_result.data
        
        # Get calibration data
        calibration_result = supabase_client.table("calibration_analytics")\
            .select("*")\
            .eq("profile_id", profile_id)\
            .order("created_at", desc=True)\
            .limit(100)\
            .execute()
        
        # Build K-factors from latest calibration data
        k_factors = []
        k_factor_map = {}
        
        for entry in calibration_result.data or []:
            joint_type = entry.get("joint_type", "miter_90")
            if joint_type not in k_factor_map:
                k_factor_map[joint_type] = KFactorEntry(
                    joint_type=JointType(joint_type),
                    k_factor=entry.get("k_factor", 0),
                    tolerance=entry.get("tolerance", 0.5),
                    confidence=entry.get("confidence", 0.5),
                    source=CalibrationSource(entry.get("source", "manual")),
                    notes=entry.get("notes")
                )
        
        k_factors = list(k_factor_map.values())
        
        # Calculate verification counts
        verified_count = sum(
            1 for e in (calibration_result.data or [])
            if (e.get("event_type") == "verification" and
                e.get("fit_status") == "perfect")
        )
        rejection_count = sum(
            1 for e in (calibration_result.data or [])
            if e.get("fit_status") in ["rejected", "adjust_needed"]
        )
        
        return ProfileCalibration(
            profile_id=profile_id,
            profile_name=profile.get("name", "Unknown"),
            system_pack=profile.get("system_pack"),
            k_factors=k_factors,
            frame_deduction=profile.get("frame_deduction", 0),
            sash_deduction=profile.get("sash_deduction", 0),
            glass_deduction=profile.get("glass_deduction", 0),
            machining_speed=profile.get("machining_speed", 1000),
            spindle_rpm=profile.get("spindle_rpm", 12000),
            last_verified=profile.get("last_verified"),
            verified_count=verified_count,
            rejection_count=rejection_count,
            user_overrides=profile.get("user_overrides", {})
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching profile calibration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch calibration: {str(e)}"
        )


@router.put("/profiles/{profile_id}/k-factors")
async def update_k_factors(
    profile_id: str,
    k_factors: List[KFactorEntry]
):
    """
    Update K-factors for a profile.
    
    This is the primary endpoint for calibration adjustments.
    Logs all changes for the learning pipeline.
    """
    try:
        # Verify profile exists
        profile_result = supabase_client.table("fabricator_profiles")\
            .select("id, name")\
            .eq("id", profile_id)\
            .single()\
            .execute()
        
        if not profile_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        # Log calibration changes
        for k_entry in k_factors:
            calibration_log = {
                "profile_id": profile_id,
                "event_type": "k_factor_update",
                "joint_type": k_entry.joint_type.value,
                "k_factor": k_entry.k_factor,
                "tolerance": k_entry.tolerance,
                "confidence": k_entry.confidence,
                "source": k_entry.source.value,
                "notes": k_entry.notes,
                "created_at": datetime.utcnow().isoformat()
            }
            
            supabase_client.table("calibration_analytics")\
                .insert(calibration_log)\
                .execute()
        
        # Update profile's last_calibrated timestamp
        supabase_client.table("fabricator_profiles")\
            .update({"last_calibrated": datetime.utcnow().isoformat()})\
            .eq("id", profile_id)\
            .execute()
        
        return {
            "message": "K-factors updated successfully",
            "profile_id": profile_id,
            "updated_count": len(k_factors)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating K-factors: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update K-factors: {str(e)}"
        )


@router.post("/test-results")
async def record_test_result(test_result: CalibrationTestResult):
    """
    Record a calibration test cut result.
    
    Used during the calibration wizard to record test cuts
    and calculate optimal K-factors.
    """
    try:
        # Calculate suggested adjustment
        deviation = test_result.actual_length - test_result.target_length
        suggested_adjustment = -deviation  # Adjust opposite to deviation
        
        # Log test result
        calibration_log = {
            "profile_id": test_result.profile_id,
            "event_type": "test_cut",
            "joint_type": test_result.joint_type.value,
            "k_factor": test_result.k_factor_used,
            "target_value": test_result.target_length,
            "actual_value": test_result.actual_length,
            "deviation": deviation,
            "fit_status": test_result.fit_status.value,
            "suggested_adjustment": suggested_adjustment,
            "operator_id": test_result.operator_id,
            "machine_id": test_result.machine_id,
            "notes": test_result.notes,
            "source": "test_cut",
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = supabase_client.table("calibration_analytics")\
            .insert(calibration_log)\
            .execute()
        
        return {
            "message": "Test result recorded",
            "deviation": deviation,
            "suggested_k_adjustment": suggested_adjustment,
            "new_suggested_k_factor": (
                test_result.k_factor_used + suggested_adjustment
            ),
            "id": result.data[0]["id"] if result.data else None
        }
        
    except Exception as e:
        logger.error(f"Error recording test result: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record test result: {str(e)}"
        )


@router.post("/production-feedback")
async def record_production_feedback(feedback: ProductionFeedback):
    """
    Record production floor feedback via QR code scan.
    
    This is the feedback loop endpoint - production workers scan
    QR codes on cut pieces and report fit status.
    """
    try:
        # Log production feedback
        feedback_log = {
            "profile_id": feedback.profile_id,
            "event_type": "production_feedback",
            "joint_type": feedback.joint_type.value,
            "fit_status": feedback.fit_status.value,
            "adjustment_applied": feedback.adjustment_applied,
            "production_label_id": feedback.production_label_id,
            "operator_id": feedback.operator_id,
            "machine_id": feedback.machine_id,
            "environmental_data": {
                "temperature": feedback.temperature,
                "humidity": feedback.humidity
            },
            "notes": feedback.notes,
            "source": "production",
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = supabase_client.table("calibration_analytics")\
            .insert(feedback_log)\
            .execute()
        
        # Trigger learning pipeline if adjustment was needed
        needs_adjustment = feedback.fit_status in [
            FitStatus.ADJUST_NEEDED, FitStatus.TIGHT, FitStatus.LOOSE
        ]
        if needs_adjustment:
            await _trigger_learning_update(
                feedback.profile_id, feedback.joint_type
            )
        
        return {
            "message": "Feedback recorded",
            "fit_status": feedback.fit_status.value,
            "id": result.data[0]["id"] if result.data else None
        }
        
    except Exception as e:
        logger.error(f"Error recording production feedback: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record feedback: {str(e)}"
        )


@router.get(
    "/suggestions/{profile_id}",
    response_model=List[KFactorSuggestion]
)
async def get_ai_suggestions(
    profile_id: str,
    include_collective: bool = Query(
        True, description="Include collective learning data"
    )
):
    """
    Get AI-powered K-factor suggestions for a profile.
    
    Uses the CalibrationLearner ML model to predict optimal K-factors
    based on historical data from this workshop and (optionally)
    collective data from all workshops.
    """
    try:
        # Get profile info
        profile_result = supabase_client.table("fabricator_profiles")\
            .select("*")\
            .eq("id", profile_id)\
            .single()\
            .execute()
        
        if not profile_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        profile = profile_result.data
        
        # Get historical calibration data
        history_result = supabase_client.table("calibration_analytics")\
            .select("*")\
            .eq("profile_id", profile_id)\
            .order("created_at", desc=True)\
            .limit(500)\
            .execute()
        
        suggestions = []
        
        # Analyze each joint type
        for joint_type in JointType:
            joint_data = [
                e for e in (history_result.data or [])
                if e.get("joint_type") == joint_type.value
            ]
            
            if not joint_data:
                continue
            
            # Extract K-factor values
            k_values = [
                e.get("k_factor", 0) for e in joint_data
                if e.get("k_factor") is not None
            ]
            
            if not k_values:
                continue
            
            # Calculate statistics
            avg_k = statistics.mean(k_values)
            std_k = statistics.stdev(k_values) if len(k_values) > 1 else 0
            
            # Determine trend
            recent_k = k_values[:10] if len(k_values) >= 10 else k_values
            if len(k_values) >= 20:
                older_k = k_values[10:20]
            else:
                older_k = k_values[len(k_values)//2:]
            
            if recent_k and older_k:
                recent_avg = statistics.mean(recent_k)
                older_avg = statistics.mean(older_k)
                if recent_avg > older_avg + 0.1:
                    trend = "increasing"
                elif recent_avg < older_avg - 0.1:
                    trend = "decreasing"
                else:
                    trend = "stable"
            else:
                trend = "stable"
            
            # Calculate confidence based on data quality
            confidence = min(1.0, len(k_values) / 50)  # Max confidence at 50 data points
            if std_k > 1.0:
                confidence *= 0.8  # Reduce confidence for high variance
            
            # Count perfect fits
            perfect_count = sum(
                1 for e in joint_data
                if e.get("fit_status") == "perfect"
            )
            if joint_data:
                accuracy_factor = perfect_count / len(joint_data)
                confidence *= (0.5 + 0.5 * accuracy_factor)
            
            # Get current K-factor
            current_k = profile.get("k_factors", {}).get(joint_type.value, avg_k)
            
            # Build reasoning
            reasoning = []
            if len(k_values) >= 10:
                reasoning.append(f"Based on {len(k_values)} calibration records")
            else:
                reasoning.append(f"Limited data: only {len(k_values)} records")
            
            if std_k < 0.3:
                reasoning.append("K-factor is highly consistent")
            elif std_k > 1.0:
                reasoning.append("High variance detected - recommend more test cuts")
            
            if trend != "stable":
                reasoning.append(f"K-factor trend is {trend}")
            
            if perfect_count > 0:
                reasoning.append(f"{perfect_count} cuts rated as 'perfect fit'")
            
            suggestions.append(KFactorSuggestion(
                profile_id=profile_id,
                joint_type=joint_type,
                suggested_k_factor=round(avg_k, 2),
                confidence=round(confidence, 2),
                reasoning=reasoning,
                sample_size=len(k_values),
                based_on_workshops=1,  # Would be higher with collective learning
                trend_direction=trend,
                current_k_factor=current_k,
                suggested_adjustment=round(avg_k - current_k, 2) if current_k else None
            ))
        
        return suggestions
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting AI suggestions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get suggestions: {str(e)}"
        )


@router.get("/trends/{profile_id}", response_model=List[CalibrationTrend])
async def get_calibration_trends(
    profile_id: str,
    days: int = Query(30, ge=7, le=365, description="Analysis period in days")
):
    """
    Get calibration trend analysis for a profile.
    
    Analyzes K-factor stability, accuracy, and provides
    recommendations for profiles needing attention.
    """
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get profile info
        profile_result = supabase_client.table("fabricator_profiles")\
            .select("id, name")\
            .eq("id", profile_id)\
            .single()\
            .execute()
        
        if not profile_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        profile = profile_result.data
        
        # Get calibration history
        history_result = supabase_client.table("calibration_analytics")\
            .select("*")\
            .eq("profile_id", profile_id)\
            .gte("created_at", start_date.isoformat())\
            .order("created_at")\
            .execute()
        
        trends = []
        
        for joint_type in JointType:
            joint_data = [
                e for e in (history_result.data or [])
                if e.get("joint_type") == joint_type.value
            ]
            
            if not joint_data:
                continue
            
            k_values = [e.get("k_factor", 0) for e in joint_data if e.get("k_factor") is not None]
            
            if not k_values:
                continue
            
            # Calculate statistics
            avg_k = statistics.mean(k_values)
            std_k = statistics.stdev(k_values) if len(k_values) > 1 else 0
            min_k = min(k_values)
            max_k = max(k_values)
            current_k = k_values[-1] if k_values else avg_k
            
            # Calculate trend slope (simple linear regression)
            if len(k_values) > 1:
                x_mean = (len(k_values) - 1) / 2
                y_mean = avg_k
                numerator = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(k_values))
                denominator = sum((i - x_mean) ** 2 for i in range(len(k_values)))
                slope = numerator / denominator if denominator != 0 else 0
            else:
                slope = 0
            
            # Determine trend direction
            if abs(slope) < 0.01:
                trend_direction = "stable"
            elif slope > 0:
                trend_direction = "increasing"
            else:
                trend_direction = "decreasing"
            
            # Calculate scores
            stability_score = max(0, 1 - (std_k / 2))  # Lower std = higher stability
            
            perfect_count = sum(1 for e in joint_data if e.get("fit_status") == "perfect")
            accuracy_score = perfect_count / len(joint_data) if joint_data else 0
            
            # Generate recommendations
            recommendations = []
            needs_attention = False
            
            if std_k > 1.0:
                recommendations.append("High variance in K-factor - consider recalibration")
                needs_attention = True
            
            if accuracy_score < 0.7:
                recommendations.append(
                    f"Only {accuracy_score:.0%} of cuts rated 'perfect' - "
                    f"review calibration"
                )
                needs_attention = True

            if trend_direction != "stable":
                recommendations.append(
                    f"K-factor is {trend_direction} - may indicate tool "
                    f"wear or material change"
                )
            
            if not recommendations:
                recommendations.append("Calibration is stable and accurate")
            
            trends.append(CalibrationTrend(
                profile_id=profile_id,
                profile_name=profile.get("name", "Unknown"),
                joint_type=joint_type,
                current_k_factor=current_k,
                average_k_factor=round(avg_k, 2),
                std_deviation=round(std_k, 3),
                min_k_factor=min_k,
                max_k_factor=max_k,
                trend_direction=trend_direction,
                trend_slope=round(slope, 4),
                stability_score=round(stability_score, 2),
                accuracy_score=round(accuracy_score, 2),
                needs_attention=needs_attention,
                recommendations=recommendations,
                period_start=start_date,
                period_end=datetime.utcnow(),
                data_points=len(k_values)
            ))
        
        return trends
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting calibration trends: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get trends: {str(e)}"
        )


@router.get("/workshop-stats/{workshop_id}", response_model=WorkshopCalibrationStats)
async def get_workshop_calibration_stats(workshop_id: str):
    """
    Get workshop-level calibration statistics.
    
    Provides overview of calibration health across all profiles
    in a workshop.
    """
    try:
        # Get all profiles for workshop
        profiles_result = supabase_client.table("fabricator_profiles")\
            .select("id, name, last_calibrated")\
            .eq("workshop_id", workshop_id)\
            .execute()
        
        profiles = profiles_result.data or []
        total_profiles = len(profiles)
        
        if not profiles:
            return WorkshopCalibrationStats(
                workshop_id=workshop_id,
                total_profiles=0,
                calibrated_profiles=0,
                profiles_needing_attention=0,
                overall_accuracy=0,
                average_confidence=0,
                verifications_last_30_days=0,
                adjustments_last_30_days=0,
                problematic_profiles=[]
            )
        
        # Get calibration data for last 30 days
        start_date = datetime.utcnow() - timedelta(days=30)
        
        profile_ids = [p["id"] for p in profiles]
        
        calibration_result = supabase_client.table("calibration_analytics")\
            .select("*")\
            .in_("profile_id", profile_ids)\
            .gte("created_at", start_date.isoformat())\
            .execute()
        
        calibration_data = calibration_result.data or []
        
        # Calculate metrics
        calibrated_profiles = len(set(e.get("profile_id") for e in calibration_data))
        
        verifications = sum(1 for e in calibration_data if e.get("event_type") == "verification")
        adjustments = sum(1 for e in calibration_data if e.get("event_type") == "k_factor_update")
        
        # Calculate accuracy
        perfect_count = sum(1 for e in calibration_data if e.get("fit_status") == "perfect")
        total_fits = sum(1 for e in calibration_data if e.get("fit_status") is not None)
        overall_accuracy = perfect_count / total_fits if total_fits > 0 else 0
        
        # Calculate average confidence
        confidences = [e.get("confidence", 0.5) for e in calibration_data if e.get("confidence")]
        average_confidence = statistics.mean(confidences) if confidences else 0.5
        
        # Find problematic profiles
        problematic = []
        for profile in profiles:
            profile_data = [e for e in calibration_data if e.get("profile_id") == profile["id"]]
            if not profile_data:
                continue
            
            rejection_count = sum(
                1 for e in profile_data
                if e.get("fit_status") in ["rejected", "adjust_needed"]
            )
            
            if rejection_count > 2:
                problematic.append({
                    "profile_id": profile["id"],
                    "profile_name": profile["name"],
                    "rejection_count": rejection_count,
                    "issue": "High rejection rate"
                })
        
        return WorkshopCalibrationStats(
            workshop_id=workshop_id,
            total_profiles=total_profiles,
            calibrated_profiles=calibrated_profiles,
            profiles_needing_attention=len(problematic),
            overall_accuracy=round(overall_accuracy, 2),
            average_confidence=round(average_confidence, 2),
            verifications_last_30_days=verifications,
            adjustments_last_30_days=adjustments,
            problematic_profiles=problematic[:10]  # Top 10
        )
        
    except Exception as e:
        logger.error(f"Error getting workshop stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get workshop stats: {str(e)}"
        )


@router.post("/verify/{profile_id}")
async def record_verification(
    profile_id: str,
    joint_type: JointType = Query(...),
    k_factor: float = Query(...),
    verified: bool = Query(...)
):
    """
    Record a K-factor verification event.
    
    Called when user confirms K-factor before production
    ("I verify these cut lengths are correct").
    """
    try:
        verification_log = {
            "profile_id": profile_id,
            "event_type": "verification",
            "joint_type": joint_type.value,
            "k_factor": k_factor,
            "fit_status": "perfect" if verified else "adjust_needed",
            "source": "manual",
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = supabase_client.table("calibration_analytics")\
            .insert(verification_log)\
            .execute()
        
        # Update profile verification timestamp
        supabase_client.table("fabricator_profiles")\
            .update({"last_verified": datetime.utcnow().isoformat()})\
            .eq("id", profile_id)\
            .execute()
        
        return {
            "message": "Verification recorded",
            "profile_id": profile_id,
            "verified": verified,
            "id": result.data[0]["id"] if result.data else None
        }
        
    except Exception as e:
        logger.error(f"Error recording verification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record verification: {str(e)}"
        )


# ============================================================================
# Helper Functions
# ============================================================================

async def _trigger_learning_update(profile_id: str, joint_type: JointType):
    """
    Trigger the calibration learning pipeline for a profile.
    
    Called when production feedback indicates adjustment was needed.
    """
    try:
        # This would trigger the CalibrationLearner to update its model
        # For now, just log the trigger
        logger.info(
            f"Learning trigger: profile={profile_id}, joint={joint_type.value}"
        )
        
        # In production, this would:
        # 1. Queue a background task to retrain the ML model
        # 2. Update the collective learning pool
        # 3. Generate new suggestions
        
    except Exception as e:
        logger.error(f"Error triggering learning update: {e}")

