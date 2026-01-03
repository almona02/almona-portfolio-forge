"""
Almona Integration Wrapper

Wraps existing Almona calibration functions to add RealityOS recording.
Uses decorator pattern to intercept calls without modifying existing code.

Constitutional Compliance:
- Principle 1: Human-Verified Before System-Trusted
- Principle 2: Append-Only Reality
- Principle 3: Cryptographic Chain of Custody
"""

import functools
import logging
from typing import Any, Callable, Dict, Optional

from python_backend.adapters.almona_realityos_adapter import (
    AlmonaRealityOSAdapter,
)

logger = logging.getLogger(__name__)


class AlmonaIntegrationWrapper:
    """
    Wraps existing Almona calibration functions to add RealityOS recording.

    Uses decorator pattern to intercept calls without modifying existing code.
    This ensures zero disruption to existing Almona operations.
    """

    def __init__(self, adapter: AlmonaRealityOSAdapter):
        """
        Initialize the integration wrapper.

        Args:
            adapter: AlmonaRealityOSAdapter instance for dual-write
        """
        self.adapter = adapter
        self.original_functions: Dict[str, Callable] = {}
        self.enabled = True  # Can be toggled for gradual rollout

    def wrap_certify_baseline(self, certify_func: Callable) -> Callable:
        """
        Wrap certify_baseline_transactional to add RealityOS recording.

        Args:
            certify_func: Original certify_baseline_transactional function

        Returns:
            Wrapped function that performs dual-write
        """

        @functools.wraps(certify_func)
        def wrapped_certify(baseline: Any) -> str:
            """
            Wrapped certify function with dual-write.

            Args:
                baseline: CalibrationBaseline object

            Returns:
                Baseline ID (from original function)
            """
            # 1. Call original function (existing Almona behavior)
            almona_baseline_id = certify_func(baseline)

            # 2. Dual-write to RealityOS (if enabled)
            if self.enabled:
                try:
                    # Record in RealityOS
                    # Note: almona_baseline_id is passed via adapter's
                    # _record_almona_baseline method
                    success, _, realityos_hash = (
                        self.adapter.record_calibration_baseline(
                            profile_id=baseline.profile_id,
                            joint_type=baseline.joint_type,
                            workshop_id=baseline.workshop_id,
                            k_factor=float(baseline.k_factor),
                            confidence=float(baseline.confidence),
                            certified_by=baseline.certified_by,
                            sample_size=baseline.sample_size,
                            model_version=baseline.model_version,
                            reasoning=baseline.reasoning or [],
                            almona_baseline_id=almona_baseline_id,
                            certified_at=baseline.certified_at,
                            baseline_version=baseline.baseline_version,
                            baseline_hash=baseline.baseline_hash,
                        )
                    )

                    if success:
                        logger.info(
                            f"Dual-write successful: baseline "
                            f"{almona_baseline_id} → RealityOS "
                            f"{realityos_hash}"
                        )
                    else:
                        logger.warning(
                            f"Dual-write failed for baseline "
                            f"{almona_baseline_id}, but Almona operation "
                            f"succeeded"
                        )

                except Exception as e:
                    # Log but don't fail - Almona operation succeeded
                    logger.error(
                        f"RealityOS dual-write error for baseline "
                        f"{almona_baseline_id}: {str(e)}",
                        exc_info=True,
                    )

            # 3. Return original result (no change to existing behavior)
            return almona_baseline_id

        # Store original for reference
        self.original_functions["certify_baseline"] = certify_func

        return wrapped_certify

    def wrap_log_anomaly(self, log_anomaly_func: Callable) -> Callable:
        """
        Wrap log_anomaly_transactional to add RealityOS recording.

        Args:
            log_anomaly_func: Original log_anomaly_transactional function

        Returns:
            Wrapped function that performs dual-write
        """

        @functools.wraps(log_anomaly_func)
        def wrapped_log_anomaly(
            profile_id: str,
            joint_type: str,
            workshop_id: Optional[str],
            anomaly_type: str,
            severity: str,
            details: Dict[str, Any],
            execution_context: Dict[str, Any],
            deduplicate_window_minutes: int = 5,
        ) -> str:
            """
            Wrapped log_anomaly function with dual-write.

            Returns:
                Anomaly ID (from original function)
            """
            # 1. Call original function (existing Almona behavior)
            almona_anomaly_id = log_anomaly_func(
                profile_id=profile_id,
                joint_type=joint_type,
                workshop_id=workshop_id,
                anomaly_type=anomaly_type,
                severity=severity,
                details=details,
                execution_context=execution_context,
                deduplicate_window_minutes=deduplicate_window_minutes,
            )

            # 2. Dual-write to RealityOS (if enabled)
            if self.enabled:
                try:
                    success, _, realityos_hash = (
                        self.adapter.record_calibration_anomaly(
                            profile_id=profile_id,
                            joint_type=joint_type,
                            workshop_id=workshop_id,
                            anomaly_type=anomaly_type,
                            severity=severity,
                            details=details,
                            execution_context=execution_context,
                        )
                    )

                    if success:
                        logger.info(
                            f"Dual-write successful: anomaly "
                            f"{almona_anomaly_id} → RealityOS {realityos_hash}"
                        )
                    else:
                        logger.warning(
                            f"Dual-write failed for anomaly "
                            f"{almona_anomaly_id}, but Almona operation "
                            f"succeeded"
                        )

                except Exception as e:
                    # Log but don't fail - Almona operation succeeded
                    logger.error(
                        f"RealityOS dual-write error for anomaly "
                        f"{almona_anomaly_id}: {str(e)}",
                        exc_info=True,
                    )

            # 3. Return original result (no change to existing behavior)
            return almona_anomaly_id

        # Store original for reference
        self.original_functions["log_anomaly"] = log_anomaly_func

        return wrapped_log_anomaly

    def _extract_baseline_data(self, baseline: Any, baseline_id: str) -> Dict[str, Any]:
        """
        Extract calibration data from baseline object.

        Args:
            baseline: CalibrationBaseline object
            baseline_id: Baseline ID from Almona

        Returns:
            Dictionary with calibration data
        """
        return {
            "baseline_id": baseline_id,
            "profile_id": baseline.profile_id,
            "joint_type": baseline.joint_type,
            "workshop_id": baseline.workshop_id,
            "baseline_version": baseline.baseline_version,
            "baseline_hash": baseline.baseline_hash,
            "k_factor": float(baseline.k_factor),
            "confidence": float(baseline.confidence),
            "certified_by": baseline.certified_by,
            "certified_at": (
                baseline.certified_at.isoformat()
                if hasattr(baseline.certified_at, "isoformat")
                else str(baseline.certified_at)
            ),
            "sample_size": baseline.sample_size,
            "model_version": baseline.model_version,
            "reasoning": baseline.reasoning or [],
        }

    def enable(self):
        """Enable dual-write operations."""
        self.enabled = True
        logger.info("Almona-RealityOS dual-write enabled")

    def disable(self):
        """Disable dual-write operations (fallback to Almona only)."""
        self.enabled = False
        logger.info("Almona-RealityOS dual-write disabled")
