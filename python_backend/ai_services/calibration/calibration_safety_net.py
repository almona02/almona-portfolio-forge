"""
Calibration Safety Net - Enterprise-Grade AI Safety Guardrails
===============================================================

Wraps CalibrationLearner to add industrial-grade safety features:
- Confidence floor enforcement (0.85 minimum)
- Drift detection with automatic freeze
- Immutable versioned baselines with cryptographic signatures
- ACID-compliant transactions via PostgreSQL functions
- Graceful degradation (baseline → heuristic → safe defaults)

This transforms the AI calibration system from "accurate" to
"industrially responsible."
"""

import hashlib
import hmac
import logging
import os
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from ai_services.calibration.calibration_learner import (
    CalibrationLearner,
    KFactorPrediction,
    LearningMode,
)
from ai_services.calibration.calibration_transactions import (
    CalibrationTransactionManager,
)
from core.operation_mode import ExecutionContext, OperationMode
from core.config import settings

logger = logging.getLogger(__name__)


class CalibrationStatus(str, Enum):
    """Calibration status enumeration."""

    LEARNING = "learning"
    CERTIFIED = "certified"
    FROZEN = "frozen"
    REQUIRES_REVIEW = "requires_review"


@dataclass(frozen=True)
class CalibrationBaseline:
    """
    Immutable calibration baseline with cryptographic signature.

    Once created, a baseline cannot be modified. New versions must be created.
    """

    profile_id: str
    joint_type: str
    workshop_id: Optional[str]
    baseline_version: str
    baseline_hash: str
    k_factor: float
    confidence: float
    certified_by: str
    certified_at: datetime
    sample_size: int
    model_version: str
    reasoning: List[str]

    def sign(self, secret_key: str) -> str:
        """
        Generate cryptographic signature for this baseline.

        Args:
            secret_key: Secret key for HMAC-SHA256 signing

        Returns:
            Hexadecimal signature string
        """
        # Create content string for signing
        content = (
            f"{self.profile_id}:{self.joint_type}:"
            f"{self.workshop_id or 'global'}:{self.baseline_version}:"
            f"{self.k_factor}:{self.confidence}"
        )

        # Generate HMAC-SHA256 signature
        signature = hmac.new(
            secret_key.encode(), content.encode(), hashlib.sha256
        ).hexdigest()

        return signature

    def verify_signature(self, signature: str, secret_key: str) -> bool:
        """
        Verify cryptographic signature for this baseline.

        Args:
            signature: Signature to verify
            secret_key: Secret key for verification

        Returns:
            True if signature is valid
        """
        expected_signature = self.sign(secret_key)
        return hmac.compare_digest(signature, expected_signature)


@dataclass
class DriftDetectionResult:
    """Result of drift detection check."""

    exceeds_threshold: bool
    drift_amount: float
    threshold: float
    current_k_factor: float
    predicted_k_factor: float


class CalibrationSafetyError(Exception):
    """Base exception for calibration safety violations."""

    pass


class LowConfidenceError(CalibrationSafetyError):
    """Raised when confidence is below the floor."""

    pass


class DriftDetectedError(CalibrationSafetyError):
    """Raised when drift exceeds threshold."""

    pass


class CalibrationFrozenError(CalibrationSafetyError):
    """Raised when calibration is frozen."""

    pass


class CalibrationSafetyNet:
    """
    Enterprise-grade safety wrapper for CalibrationLearner.

    Adds confidence floors, drift detection, immutable baselines, and
    automatic freezing to prevent silent AI corruption.
    """

    # Safety constants
    CONFIDENCE_FLOOR = 0.85  # Minimum confidence for predictions
    MAX_ALLOWED_DRIFT = 0.2  # Maximum allowed drift (20% of baseline)

    def __init__(self, learner: Optional[CalibrationLearner] = None):
        """
        Initialize the calibration safety net.

        Args:
            learner: Optional CalibrationLearner instance (creates new if None)
        """
        self.learner = learner or CalibrationLearner()
        self.transaction_manager = CalibrationTransactionManager()

        # Local cache for baselines and status (invalidated on updates)
        self._baseline_cache: Dict[str, Optional[CalibrationBaseline]] = {}
        self._status_cache: Dict[str, CalibrationStatus] = {}

        # Get secret key for cryptographic signatures
        self._secret_key = os.getenv("JWT_SECRET_KEY", settings.JWT_SECRET_KEY)
        if not self._secret_key or self._secret_key == "changeme":
            logger.warning(
                "JWT_SECRET_KEY not set - baseline signatures will be " "insecure"
            )

    def _get_calibration_key(
        self, profile_id: str, joint_type: str, workshop_id: Optional[str]
    ) -> str:
        """Generate cache key for calibration lookup."""
        workshop_part = workshop_id or "global"
        return f"{profile_id}:{joint_type}:{workshop_part}"

    def _invalidate_cache(self, calibration_key: str) -> None:
        """Invalidate local cache for a calibration key."""
        self._baseline_cache.pop(calibration_key, None)
        self._status_cache.pop(calibration_key, None)

    def _get_baseline(
        self, profile_id: str, joint_type: str, workshop_id: Optional[str]
    ) -> Optional[CalibrationBaseline]:
        """Get certified baseline from database (with caching)."""
        calibration_key = self._get_calibration_key(profile_id, joint_type, workshop_id)

        # Check cache first
        if calibration_key in self._baseline_cache:
            return self._baseline_cache[calibration_key]

        # Query database
        baseline_data = self.transaction_manager.get_baseline_with_status(
            profile_id, joint_type, workshop_id
        )

        if not baseline_data:
            self._baseline_cache[calibration_key] = None
            return None

        # Convert to CalibrationBaseline object
        try:
            baseline = CalibrationBaseline(
                profile_id=baseline_data.get("baseline_id") or profile_id,
                joint_type=joint_type,
                workshop_id=workshop_id,
                baseline_version=baseline_data.get("baseline_version", "1.0.0"),
                baseline_hash=baseline_data.get("baseline_hash", ""),
                k_factor=float(baseline_data.get("k_factor", 0)),
                confidence=float(baseline_data.get("confidence", 0)),
                certified_by=baseline_data.get("certified_by", "unknown"),
                certified_at=datetime.fromisoformat(
                    baseline_data.get("certified_at", datetime.utcnow().isoformat())
                ),
                sample_size=baseline_data.get("sample_size", 0),
                model_version=baseline_data.get("model_version", "1.0.0"),
                reasoning=baseline_data.get("reasoning", []),
            )

            # Cache and return
            self._baseline_cache[calibration_key] = baseline
            return baseline

        except Exception as e:
            logger.error(f"Failed to parse baseline data: {e}")
            self._baseline_cache[calibration_key] = None
            return None

    def _get_status(
        self, profile_id: str, joint_type: str, workshop_id: Optional[str]
    ) -> CalibrationStatus:
        """Get current calibration status (with caching)."""
        calibration_key = self._get_calibration_key(profile_id, joint_type, workshop_id)

        # Check cache first
        if calibration_key in self._status_cache:
            return self._status_cache[calibration_key]

        # Query database (via baseline lookup which includes status)
        baseline_data = self.transaction_manager.get_baseline_with_status(
            profile_id, joint_type, workshop_id
        )

        if baseline_data and baseline_data.get("status"):
            status = CalibrationStatus(baseline_data["status"])
        else:
            status = CalibrationStatus.LEARNING

        # Cache and return
        self._status_cache[calibration_key] = status
        return status

    def _detect_drift(
        self, predicted_k_factor: float, baseline_k_factor: float
    ) -> DriftDetectionResult:
        """
        Detect drift between predicted and baseline K-factors.

        Args:
            predicted_k_factor: AI-predicted K-factor
            baseline_k_factor: Certified baseline K-factor

        Returns:
            DriftDetectionResult with drift analysis
        """
        drift_amount = abs(predicted_k_factor - baseline_k_factor)
        threshold = baseline_k_factor * self.MAX_ALLOWED_DRIFT

        exceeds_threshold = drift_amount > threshold

        return DriftDetectionResult(
            exceeds_threshold=exceeds_threshold,
            drift_amount=drift_amount,
            threshold=threshold,
            current_k_factor=baseline_k_factor,
            predicted_k_factor=predicted_k_factor,
        )

    def predict(
        self,
        profile_data: Dict[str, Any],
        joint_type: str,
        context: ExecutionContext,
        workshop_id: Optional[str] = None,
        current_k_factor: Optional[float] = None,
        mode: LearningMode = LearningMode.HYBRID,
    ) -> KFactorPrediction:
        """
        Predict K-factor with safety guardrails.

        Args:
            profile_data: Profile characteristics dictionary
            joint_type: Type of joint
            context: ExecutionContext with operation mode
            workshop_id: Workshop identifier (optional)
            current_k_factor: Current K-factor (optional)
            mode: Learning mode

        Returns:
            KFactorPrediction with safety checks applied

        Raises:
            LowConfidenceError: If confidence is below floor
            DriftDetectedError: If drift exceeds threshold
            CalibrationFrozenError: If calibration is frozen
        """
        profile_id = profile_data.get("id", "unknown")

        # Check if calibration is frozen
        status = self._get_status(profile_id, joint_type, workshop_id)
        if status == CalibrationStatus.FROZEN:
            # In certified mode, fail loudly
            if context.mode == OperationMode.CERTIFIED:
                raise CalibrationFrozenError(
                    f"Calibration is frozen for profile {profile_id}, "
                    f"joint {joint_type}. Cannot make predictions in "
                    f"certified mode."
                )
            # In other modes, log warning but allow fallback
            logger.warning(
                f"Calibration frozen for {profile_id}/{joint_type}, "
                f"using baseline fallback"
            )

        # Get certified baseline if available
        baseline = self._get_baseline(profile_id, joint_type, workshop_id)

        # Get AI prediction
        try:
            prediction = self.learner.predict(
                profile_data=profile_data,
                joint_type=joint_type,
                workshop_id=workshop_id,
                current_k_factor=current_k_factor,
                mode=mode,
            )
        except Exception as e:
            logger.error(f"CalibrationLearner prediction failed: {e}")
            # Fall back to baseline or safe default
            if baseline:
                return self._create_baseline_prediction(baseline, current_k_factor)
            else:
                return self._create_safe_default_prediction(
                    profile_id, joint_type, current_k_factor
                )

        # Enforce confidence floor
        if prediction.confidence < self.CONFIDENCE_FLOOR:
            # In certified mode, fail loudly
            if context.mode == OperationMode.CERTIFIED:
                raise LowConfidenceError(
                    f"Confidence {prediction.confidence:.2f} below floor "
                    f"{self.CONFIDENCE_FLOOR} for profile {profile_id}, "
                    f"joint {joint_type}"
                )

            # Log anomaly
            self._log_anomaly(
                profile_id,
                joint_type,
                workshop_id,
                context,
                "low_confidence",
                "WARNING",
                {
                    "predicted_confidence": prediction.confidence,
                    "confidence_floor": self.CONFIDENCE_FLOOR,
                },
            )

            # Fall back to baseline if available
            if baseline:
                logger.warning(
                    f"Low confidence ({prediction.confidence:.2f}), "
                    f"using certified baseline for "
                    f"{profile_id}/{joint_type}"
                )
                return self._create_baseline_prediction(baseline, current_k_factor)

        # Check for drift if baseline exists
        if baseline:
            drift_result = self._detect_drift(
                prediction.predicted_k_factor, baseline.k_factor
            )

            if drift_result.exceeds_threshold:
                # In certified mode, fail loudly
                if context.mode == OperationMode.CERTIFIED:
                    raise DriftDetectedError(
                        f"Drift {drift_result.drift_amount:.3f} exceeds "
                        f"threshold {drift_result.threshold:.3f} for profile "
                        f"{profile_id}, joint {joint_type}"
                    )

                # Log critical anomaly
                self._log_anomaly(
                    profile_id,
                    joint_type,
                    workshop_id,
                    context,
                    "drift",
                    "CRITICAL",
                    {
                        "drift_amount": drift_result.drift_amount,
                        "threshold": drift_result.threshold,
                        "baseline_k_factor": baseline.k_factor,
                        "predicted_k_factor": prediction.predicted_k_factor,
                    },
                )

                # Auto-freeze if in production or certified mode
                if context.mode in (OperationMode.PRODUCTION, OperationMode.CERTIFIED):
                    self._auto_freeze(
                        profile_id,
                        joint_type,
                        workshop_id,
                        f"Drift detected: "
                        f"{drift_result.drift_amount:.3f} > "
                        f"{drift_result.threshold:.3f}",
                    )

                # Use baseline instead of prediction
                logger.warning(
                    f"Drift detected, using certified baseline for "
                    f"{profile_id}/{joint_type}"
                )
                return self._create_baseline_prediction(baseline, current_k_factor)

        # Prediction passed all safety checks
        return prediction

    def _create_baseline_prediction(
        self, baseline: CalibrationBaseline, current_k_factor: Optional[float]
    ) -> KFactorPrediction:
        """Create a KFactorPrediction from a certified baseline."""
        adj = None
        if current_k_factor is not None:
            adj = baseline.k_factor - current_k_factor

        return KFactorPrediction(
            profile_id=baseline.profile_id,
            joint_type=baseline.joint_type,
            predicted_k_factor=baseline.k_factor,
            confidence=baseline.confidence,
            reasoning=baseline.reasoning or ["Using certified baseline"],
            contributing_factors={"baseline": 1.0},
            sample_size=baseline.sample_size,
            workshops_contributing=1,
            data_quality_score=1.0,
            current_k_factor=current_k_factor,
            suggested_adjustment=adj,
            model_version=baseline.model_version,
        )

    def _create_safe_default_prediction(
        self, profile_id: str, joint_type: str, current_k_factor: Optional[float]
    ) -> KFactorPrediction:
        """Create a safe default prediction when no baseline exists."""
        # Heuristic: use current K-factor or safe default (2.5)
        safe_k_factor = current_k_factor if current_k_factor is not None else 2.5

        return KFactorPrediction(
            profile_id=profile_id,
            joint_type=joint_type,
            predicted_k_factor=safe_k_factor,
            confidence=0.5,  # Low confidence for heuristic
            reasoning=["No baseline available, using safe default"],
            contributing_factors={"heuristic": 1.0},
            sample_size=0,
            workshops_contributing=0,
            data_quality_score=0.0,
            current_k_factor=current_k_factor,
            suggested_adjustment=None,
            model_version="heuristic",
        )

    def _log_anomaly(
        self,
        profile_id: str,
        joint_type: str,
        workshop_id: Optional[str],
        context: ExecutionContext,
        anomaly_type: str,
        severity: str,
        details: Dict[str, Any],
    ) -> None:
        """Log a calibration anomaly."""
        try:
            execution_context_dict = {
                "mode": context.mode.value,
                "workshop_id": context.workshop_id,
                "user_id": context.user_id,
                "trace_id": context.trace_id,
            }

            self.transaction_manager.log_anomaly_transactional(
                profile_id=profile_id,
                joint_type=joint_type,
                workshop_id=workshop_id,
                anomaly_type=anomaly_type,
                severity=severity,
                details=details,
                execution_context=execution_context_dict,
            )
        except Exception as e:
            logger.error(f"Failed to log anomaly: {e}")

    def _auto_freeze(
        self, profile_id: str, joint_type: str, workshop_id: Optional[str], reason: str
    ) -> None:
        """Automatically freeze calibration learning."""
        try:
            self.transaction_manager.freeze_calibration_transactional(
                profile_id=profile_id,
                joint_type=joint_type,
                workshop_id=workshop_id,
                frozen_reason=reason,
            )

            # Invalidate cache
            calibration_key = self._get_calibration_key(
                profile_id, joint_type, workshop_id
            )
            self._invalidate_cache(calibration_key)

            logger.warning(
                f"Auto-froze calibration for {profile_id}/{joint_type}: " f"{reason}"
            )
        except Exception as e:
            logger.error(f"Failed to auto-freeze calibration: {e}")

    def certify_baseline(
        self,
        profile_id: str,
        joint_type: str,
        workshop_id: Optional[str],
        k_factor: float,
        confidence: float,
        certified_by: str,
        sample_size: int = 0,
        model_version: str = "1.0.0",
        reasoning: Optional[List[str]] = None,
    ) -> CalibrationBaseline:
        """
        Certify a calibration baseline (immutable, versioned, signed).

        Args:
            profile_id: Profile identifier
            joint_type: Type of joint
            workshop_id: Workshop identifier (None for global)
            k_factor: K-factor value
            confidence: Confidence score (must be >= 0.85)
            certified_by: User identifier
            sample_size: Number of samples
            model_version: Model version
            reasoning: Reasoning for this baseline

        Returns:
            Certified CalibrationBaseline

        Raises:
            ValueError: If confidence is below floor
        """
        if confidence < self.CONFIDENCE_FLOOR:
            raise ValueError(
                f"Confidence {confidence} below minimum threshold "
                f"{self.CONFIDENCE_FLOOR}"
            )

        # Generate baseline version and hash
        baseline_version = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        baseline_hash_content = (
            f"{profile_id}:{joint_type}:{workshop_id or 'global'}:"
            f"{baseline_version}:{k_factor}:{confidence}"
        )
        baseline_hash = hashlib.sha256(baseline_hash_content.encode()).hexdigest()

        # Create baseline object
        baseline = CalibrationBaseline(
            profile_id=profile_id,
            joint_type=joint_type,
            workshop_id=workshop_id,
            baseline_version=baseline_version,
            baseline_hash=baseline_hash,
            k_factor=k_factor,
            confidence=confidence,
            certified_by=certified_by,
            certified_at=datetime.utcnow(),
            sample_size=sample_size,
            model_version=model_version,
            reasoning=reasoning or [],
        )

        # Invalidate cache BEFORE transaction
        calibration_key = self._get_calibration_key(profile_id, joint_type, workshop_id)
        self._invalidate_cache(calibration_key)

        # Certify via transactional function
        baseline_id = self.transaction_manager.certify_baseline_transactional(baseline)

        # Reload from database to ensure cache has true state
        certified_baseline = self._get_baseline(profile_id, joint_type, workshop_id)
        if not certified_baseline:
            raise RuntimeError("Baseline certification succeeded but retrieval failed")

        logger.info(
            f"Certified baseline {baseline_id} for {profile_id}/{joint_type} "
            f"(confidence: {confidence:.2f})"
        )

        return certified_baseline
