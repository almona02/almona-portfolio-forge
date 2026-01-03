"""
Calibration Transaction Manager - Wrapper for PostgreSQL RPC Functions
======================================================================

Provides Python interface to atomic, transactional calibration operations.
All operations use PostgreSQL functions with SECURITY DEFINER and advisory
locks for ACID compliance and concurrency control.
"""

import logging
from typing import Any, Dict, Optional, TYPE_CHECKING

from core.supabase_client import get_supabase_client

if TYPE_CHECKING:
    from ai_services.calibration.calibration_safety_net import CalibrationBaseline

logger = logging.getLogger(__name__)


class CalibrationTransactionManager:
    """
    Manages transactional calibration operations via PostgreSQL RPC functions.
    """

    def __init__(self):
        """Initialize transaction manager with Supabase client."""
        self._supabase = get_supabase_client()

    def certify_baseline_transactional(self, baseline: "CalibrationBaseline") -> str:
        """
        Atomically certify a calibration baseline.

        Args:
            baseline: CalibrationBaseline object to certify

        Returns:
            Baseline ID (UUID as string)

        Raises:
            RuntimeError: If certification fails
        """
        try:
            # Prepare parameters (explicitly handle NULL workshop_id)
            # Note: Parameter order matches function signature
            # (required params first, then defaults)
            params = {
                "p_profile_id": baseline.profile_id,
                "p_joint_type": baseline.joint_type,
                "p_baseline_version": baseline.baseline_version,
                "p_baseline_hash": baseline.baseline_hash,
                "p_k_factor": float(baseline.k_factor),
                "p_confidence": float(baseline.confidence),
                "p_certified_by": baseline.certified_by,
                "p_model_version": baseline.model_version,
                "p_workshop_id": (
                    baseline.workshop_id if baseline.workshop_id else None
                ),
                "p_sample_size": baseline.sample_size,
                "p_reasoning": baseline.reasoning,
            }

            # Call PostgreSQL function via RPC
            response = self._supabase.rpc(
                "certify_calibration_baseline", params
            ).execute()

            # Extract result from response
            if hasattr(response, "data") and response.data:
                baseline_id = response.data
                if isinstance(baseline_id, list) and len(baseline_id) > 0:
                    baseline_id = baseline_id[0]
                return str(baseline_id)
            elif hasattr(response, "data") and response.data is not None:
                return str(response.data)
            else:
                raise RuntimeError(f"Unexpected RPC response format: {response}")

        except Exception as e:
            logger.error(f"Failed to certify baseline: {e}")
            raise RuntimeError(f"Baseline certification failed: {str(e)}") from e

    def freeze_calibration_transactional(
        self,
        profile_id: str,
        joint_type: str,
        workshop_id: Optional[str],
        frozen_reason: str,
    ) -> bool:
        """
        Freeze calibration learning for a profile/joint.

        Args:
            profile_id: Profile identifier
            joint_type: Type of joint
            workshop_id: Workshop identifier (None for global)
            frozen_reason: Reason for freezing

        Returns:
            True if successful

        Raises:
            RuntimeError: If freeze operation fails
        """
        try:
            params = {
                "p_profile_id": profile_id,
                "p_joint_type": joint_type,
                "p_frozen_reason": frozen_reason,
                "p_workshop_id": workshop_id if workshop_id else None,
            }

            response = self._supabase.rpc("freeze_calibration", params).execute()

            # Extract result
            if hasattr(response, "data"):
                result = response.data
                if isinstance(result, list) and len(result) > 0:
                    result = result[0]
                return bool(result) if result is not None else True
            else:
                return True  # Assume success if no error

        except Exception as e:
            logger.error(f"Failed to freeze calibration: {e}")
            raise RuntimeError(f"Calibration freeze failed: {str(e)}") from e

    def log_anomaly_transactional(
        self,
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
        Log a calibration anomaly with deduplication.

        Args:
            profile_id: Profile identifier
            joint_type: Type of joint
            workshop_id: Workshop identifier (None for global)
            anomaly_type: Type of anomaly (drift, low_confidence, freeze, etc.)
            severity: Severity level (WARNING, CRITICAL)
            details: Anomaly details as dictionary
            execution_context: Execution context as dictionary
            deduplicate_window_minutes: Deduplication window in minutes

        Returns:
            Anomaly ID (UUID as string)

        Raises:
            RuntimeError: If logging fails
        """
        try:
            params = {
                "p_profile_id": profile_id,
                "p_joint_type": joint_type,
                "p_anomaly_type": anomaly_type,
                "p_severity": severity,
                "p_workshop_id": workshop_id if workshop_id else None,
                # JSONB will be converted automatically
                "p_details": details,
                "p_execution_context": execution_context,
                "p_deduplicate_window_minutes": deduplicate_window_minutes,
            }

            response = self._supabase.rpc("log_calibration_anomaly", params).execute()

            # Extract result
            if hasattr(response, "data") and response.data:
                anomaly_id = response.data
                if isinstance(anomaly_id, list) and len(anomaly_id) > 0:
                    anomaly_id = anomaly_id[0]
                return str(anomaly_id)
            elif hasattr(response, "data") and response.data is not None:
                return str(response.data)
            else:
                raise RuntimeError(f"Unexpected RPC response format: {response}")

        except Exception as e:
            logger.error(f"Failed to log anomaly: {e}")
            raise RuntimeError(f"Anomaly logging failed: {str(e)}") from e

    def get_baseline_with_status(
        self, profile_id: str, joint_type: str, workshop_id: Optional[str]
    ) -> Optional[Dict[str, Any]]:
        """
        Get current certified baseline with status.

        Args:
            profile_id: Profile identifier
            joint_type: Type of joint
            workshop_id: Workshop identifier (None for global)

        Returns:
            Dictionary with baseline data or None if not found
        """
        try:
            params = {
                "p_profile_id": profile_id,
                "p_joint_type": joint_type,
                "p_workshop_id": workshop_id if workshop_id else None,
            }

            response = self._supabase.rpc("get_calibration_baseline", params).execute()

            # Extract result
            if hasattr(response, "data") and response.data:
                data = response.data
                if isinstance(data, list) and len(data) > 0:
                    return data[0]
                elif isinstance(data, dict):
                    return data
                else:
                    return None
            else:
                return None

        except Exception as e:
            logger.warning(f"Failed to get baseline: {e}")
            return None
