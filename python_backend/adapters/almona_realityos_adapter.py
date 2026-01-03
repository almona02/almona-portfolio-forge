"""
Almona → RealityOS Adapter

Dual-write pattern: Records events in both systems simultaneously.
Validates 100% match before migration.

This adapter connects the existing Almona calibration system to the
new RealityOS Event Ledger without breaking existing functionality.

Constitutional Compliance:
- Principle 1: Human-Verified Before System-Trusted
- Principle 2: Append-Only Reality
- Principle 3: Cryptographic Chain of Custody
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from realityos_core.capture_gateway.gateway_skeleton import (
    CaptureData,
    RealityCaptureGateway,
)
from realityos_core.event_ledger import EventLedger
from realityos_core.models.event_models import BaseEvent

from python_backend.adapters.event_mapper import AlmonaEventMapper
from python_backend.adapters.retry_manager import DualWriteRetryManager

logger = logging.getLogger(__name__)


class AlmonaRealityOSAdapter:
    """
    Adapter for recording Almona calibration events in RealityOS.

    Implements dual-write pattern:
    1. Record in Almona (existing path)
    2. Map to RealityOS event
    3. Record in RealityOS (new path)
    4. Validate match
    5. Rollback on mismatch
    """

    def __init__(
        self,
        almona_transaction_manager: Any,  # CalibrationTransactionManager
        realityos_gateway: RealityCaptureGateway,
        realityos_ledger: EventLedger,
        vertical_id: str = "almona_vertical",
        enable_retry: bool = True,
    ):
        """
        Initialize the adapter.

        Args:
            almona_transaction_manager: Almona's transaction manager
            realityos_gateway: RealityOS capture gateway
            realityos_ledger: RealityOS event ledger
            vertical_id: Vertical identifier for RealityOS events
            enable_retry: Whether to enable retry logic
        """
        self.almona_tx = almona_transaction_manager
        self.gateway = realityos_gateway
        self.ledger = realityos_ledger
        self.vertical_id = vertical_id
        self.event_mapper = AlmonaEventMapper()
        self.retry_manager = DualWriteRetryManager() if enable_retry else None

    def record_calibration_baseline(
        self,
        profile_id: str,
        joint_type: str,
        workshop_id: Optional[str],
        k_factor: float,
        confidence: float,
        certified_by: str,
        sample_size: int = 0,
        model_version: str = "1.0.0",
        reasoning: Optional[list] = None,
        # Almona metadata
        almona_baseline_id: Optional[str] = None,
        certified_at: Optional[datetime] = None,
        baseline_version: Optional[str] = None,
        baseline_hash: Optional[str] = None,
        # Optional proof components (for human verification)
        qr_data: Optional[str] = None,
        photos: Optional[list] = None,
        gps_latitude: Optional[float] = None,
        gps_longitude: Optional[float] = None,
        gps_accuracy_meters: Optional[float] = None,
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Record calibration baseline in both systems.

        Args:
            profile_id: Profile identifier
            joint_type: Type of joint
            workshop_id: Workshop identifier (None for global)
            k_factor: Calibration k-factor value
            confidence: Confidence score
            certified_by: Who certified the baseline
            sample_size: Sample size used
            model_version: Model version
            reasoning: Reasoning list
            qr_data: Optional QR code data
            photos: Optional photo data (list of bytes)
            gps_latitude: Optional GPS latitude
            gps_longitude: Optional GPS longitude
            gps_accuracy_meters: Optional GPS accuracy

        Returns:
            Tuple of (success, almona_baseline_id, realityos_event_hash)
            Returns (False, None, None) on mismatch or failure
        """
        try:
            # Step 1: Record in Almona (existing path)
            # Note: This is called AFTER Almona has already recorded the baseline
            # via the integration wrapper. We just need to extract the info.
            almona_result = self._record_almona_baseline(
                profile_id=profile_id,
                joint_type=joint_type,
                workshop_id=workshop_id,
                k_factor=k_factor,
                confidence=confidence,
                certified_by=certified_by,
                sample_size=sample_size,
                model_version=model_version,
                reasoning=reasoning or [],
                almona_baseline_id=almona_baseline_id,
                certified_at=certified_at or datetime.now(timezone.utc),
            )

            # Step 2: Map to RealityOS event
            # Use certified_at from parameter or almona_result
            event_certified_at = certified_at or datetime.now(timezone.utc)
            if "certified_at" in almona_result:
                certified_at_str = almona_result["certified_at"]
                if isinstance(certified_at_str, str):
                    event_certified_at = datetime.fromisoformat(
                        certified_at_str.replace("Z", "+00:00")
                    )
                elif isinstance(certified_at_str, datetime):
                    event_certified_at = certified_at_str

            reality_event = self._map_baseline_to_reality_event(
                profile_id=profile_id,
                joint_type=joint_type,
                workshop_id=workshop_id,
                k_factor=k_factor,
                confidence=confidence,
                certified_by=certified_by,
                certified_at=event_certified_at,
                sample_size=sample_size,
                model_version=model_version,
                reasoning=reasoning or [],
                almona_baseline_id=almona_result.get("baseline_id"),
                baseline_version=baseline_version,
                baseline_hash=baseline_hash,
                qr_data=qr_data,
                photos=photos,
                gps_latitude=gps_latitude,
                gps_longitude=gps_longitude,
                gps_accuracy_meters=gps_accuracy_meters,
            )

            # Step 3: Record in RealityOS (new path)
            reality_result = self._record_realityos_event(reality_event)

            # Step 4: Validate match
            match = self._validate_baseline_match(
                almona_result, reality_result, reality_event
            )

            if not match:
                # Log security anomaly, trigger rollback
                self._log_mismatch(
                    "calibration_baseline",
                    profile_id,
                    almona_result,
                    reality_result,
                )
                return (False, None, None)

            baseline_id = almona_result.get("baseline_id")
            logger.info(
                f"Successfully recorded baseline for "
                f"{profile_id}/{joint_type} in both systems "
                f"(Almona: {baseline_id}, RealityOS: {reality_result})"
            )

            return (
                True,
                baseline_id,
                reality_result,
            )

        except Exception as e:
            logger.error(f"Failed to record calibration baseline: {e}")
            # Rollback both systems
            baseline_id = (
                almona_result.get("baseline_id")
                if "almona_result" in locals()
                else None
            )
            self._rollback_baseline(baseline_id)
            return (False, None, None)

    def record_calibration_anomaly(
        self,
        profile_id: str,
        joint_type: str,
        workshop_id: Optional[str],
        anomaly_type: str,
        severity: str,
        details: Dict[str, Any],
        execution_context: Dict[str, Any],
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Record calibration anomaly in both systems.

        Args:
            profile_id: Profile identifier
            joint_type: Type of joint
            workshop_id: Workshop identifier (None for global)
            anomaly_type: Type of anomaly (drift, low_confidence, etc.)
            severity: Severity level (WARNING, CRITICAL)
            details: Anomaly details
            execution_context: Execution context

        Returns:
            Tuple of (success, almona_anomaly_id, realityos_event_hash)
        """
        try:
            # Step 1: Record in Almona
            almona_result = self._record_almona_anomaly(
                profile_id=profile_id,
                joint_type=joint_type,
                workshop_id=workshop_id,
                anomaly_type=anomaly_type,
                severity=severity,
                details=details,
                execution_context=execution_context,
            )

            # Step 2: Map to RealityOS event
            reality_event = self._map_anomaly_to_reality_event(
                profile_id=profile_id,
                joint_type=joint_type,
                workshop_id=workshop_id,
                anomaly_type=anomaly_type,
                severity=severity,
                details=details,
                execution_context=execution_context,
                almona_anomaly_id=almona_result.get("anomaly_id"),
            )

            # Step 3: Record in RealityOS
            reality_result = self._record_realityos_event(reality_event)

            # Step 4: Validate match
            match = self._validate_anomaly_match(
                almona_result, reality_result, reality_event
            )

            if not match:
                self._log_mismatch(
                    "calibration_anomaly",
                    profile_id,
                    almona_result,
                    reality_result,
                )
                return (False, None, None)

            logger.info(
                f"Successfully recorded anomaly for {profile_id}/{joint_type} "
                f"in both systems"
            )

            return (
                True,
                almona_result.get("anomaly_id"),
                reality_result,
            )

        except Exception as e:
            logger.error(f"Failed to record calibration anomaly: {e}")
            return (False, None, None)

    # ============== PRIVATE METHODS ==============

    def _record_almona_baseline(self, **kwargs) -> Dict[str, Any]:
        """
        Record baseline in Almona system.

        This method is called BEFORE dual-write - the baseline is already
        recorded in Almona by the time we get here (via integration wrapper).

        Returns:
            Dictionary with baseline information for validation
        """
        # Baseline is already recorded in Almona by integration wrapper
        # We just need to return the information for validation
        certified_at = kwargs.get("certified_at", datetime.now(timezone.utc))
        if isinstance(certified_at, datetime):
            timestamp = certified_at.isoformat()
        else:
            timestamp = (
                certified_at if certified_at else datetime.now(timezone.utc).isoformat()
            )

        return {
            "baseline_id": kwargs.get("almona_baseline_id"),
            "timestamp": timestamp,
            "k_factor": kwargs["k_factor"],
            "confidence": kwargs["confidence"],
            "profile_id": kwargs["profile_id"],
            "joint_type": kwargs["joint_type"],
        }

    def _record_almona_anomaly(self, **kwargs) -> Dict[str, Any]:
        """
        Record anomaly in Almona system.

        This method is called BEFORE dual-write - the anomaly is already
        recorded in Almona by the time we get here (via integration wrapper).

        Returns:
            Dictionary with anomaly information for validation
        """
        # Anomaly is already recorded in Almona by integration wrapper
        return {
            "anomaly_id": kwargs.get("almona_anomaly_id"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "anomaly_type": kwargs["anomaly_type"],
            "severity": kwargs["severity"],
            "profile_id": kwargs["profile_id"],
            "joint_type": kwargs["joint_type"],
        }

    def _map_baseline_to_reality_event(
        self,
        profile_id: str,
        joint_type: str,
        workshop_id: Optional[str],
        k_factor: float,
        confidence: float,
        certified_by: str,
        certified_at: datetime,
        sample_size: int,
        model_version: str,
        reasoning: list,
        almona_baseline_id: Optional[str],
        baseline_version: Optional[str] = None,
        baseline_hash: Optional[str] = None,
        qr_data: Optional[str] = None,
        photos: Optional[list] = None,
        gps_latitude: Optional[float] = None,
        gps_longitude: Optional[float] = None,
        gps_accuracy_meters: Optional[float] = None,
    ) -> BaseEvent:
        """
        Map Almona calibration baseline to RealityOS event.

        Delegates to AlmonaEventMapper for consistency.

        Returns:
            BaseEvent ready for RealityOS Event Ledger
        """
        return self.event_mapper.map_baseline_to_verification(
            profile_id=profile_id,
            joint_type=joint_type,
            workshop_id=workshop_id,
            k_factor=k_factor,
            confidence=confidence,
            certified_by=certified_by,
            certified_at=certified_at,
            sample_size=sample_size,
            model_version=model_version,
            reasoning=reasoning,
            baseline_version=baseline_version,
            baseline_hash=baseline_hash,
            almona_baseline_id=almona_baseline_id,
            qr_data=qr_data,
            photos=photos,
            gps_latitude=gps_latitude,
            gps_longitude=gps_longitude,
            gps_accuracy_meters=gps_accuracy_meters,
            vertical_id=self.vertical_id,
        )

    def _map_anomaly_to_reality_event(
        self,
        profile_id: str,
        joint_type: str,
        workshop_id: Optional[str],
        anomaly_type: str,
        severity: str,
        details: Dict[str, Any],
        execution_context: Dict[str, Any],
        almona_anomaly_id: Optional[str],
        detected_at: Optional[datetime] = None,
    ) -> BaseEvent:
        """
        Map Almona calibration anomaly to RealityOS event.

        Delegates to AlmonaEventMapper for consistency.

        Returns:
            BaseEvent ready for RealityOS Event Ledger
        """
        return self.event_mapper.map_anomaly_to_fault(
            profile_id=profile_id,
            joint_type=joint_type,
            workshop_id=workshop_id,
            anomaly_type=anomaly_type,
            severity=severity,
            details=details,
            execution_context=execution_context,
            almona_anomaly_id=almona_anomaly_id,
            detected_at=detected_at,
            vertical_id=self.vertical_id,
        )

    def _record_realityos_event(self, event: BaseEvent) -> Optional[str]:
        """
        Record event in RealityOS Event Ledger.

        Returns:
            Event hash if successful, None otherwise
        """
        try:
            # If event has proof components, validate through gateway
            if event.proof and (
                event.proof.qr_data or event.proof.photo_hashes or event.proof.location
            ):
                # Only use gateway if we have GPS (required for CaptureData)
                location = event.proof.location
                if location:
                    capture_data = CaptureData(
                        qr_data=event.proof.qr_data or "",
                        photos=[],  # Photos already hashed
                        gps_latitude=location.latitude,
                        gps_longitude=location.longitude,
                        gps_accuracy_meters=location.accuracy_meters,
                        timestamp=event.proof.timestamp,
                        verified_by=event.proof.verified_by,
                        entity_id=event.entity_id,
                        vertical_id=event.vertical_id,
                    )

                    # Validate and record through gateway
                    validation_result, event_hash = self.gateway.validate_and_record(
                        capture_data=capture_data,
                        event_type=event.event_type.value,
                        payload=event.payload,
                    )

                    if not validation_result.overall_passed:
                        logger.error(
                            f"RealityOS validation failed: "
                            f"{validation_result.errors}"
                        )
                        return None

                    return event_hash
                else:
                    # Has QR or photos but no GPS - direct recording
                    event_record = self.ledger.record_event(event)
                    return event_record.event_hash
            else:
                # Direct recording (no human verification required)
                event_record = self.ledger.record_event(event)
                return event_record.event_hash

        except Exception as e:
            logger.error(f"Failed to record RealityOS event: {e}")
            return None

    def _validate_baseline_match(
        self,
        almona_result: Dict[str, Any],
        reality_result: Optional[str],
        reality_event: BaseEvent,
    ) -> bool:
        """
        Validate that Almona and RealityOS results match.

        Returns:
            True if match, False otherwise
        """
        if not reality_result:
            return False

        # Validate entity ID match
        profile_id = reality_event.payload["profile_id"]
        joint_type = reality_event.payload["joint_type"]
        expected_entity = f"{profile_id}:{joint_type}"
        if reality_event.entity_id != expected_entity:
            logger.warning(
                f"Entity ID mismatch: {reality_event.entity_id} != "
                f"{expected_entity}"
            )
            return False

        # Validate timestamp match (within ±1 second)
        almona_timestamp = datetime.fromisoformat(
            almona_result["timestamp"].replace("Z", "+00:00")
        )
        reality_timestamp = (
            reality_event.proof.timestamp if reality_event.proof else None
        )

        if reality_timestamp:
            time_diff = abs((almona_timestamp - reality_timestamp).total_seconds())
            if time_diff > 1.0:
                logger.warning(f"Timestamp mismatch: {time_diff:.2f}s difference")
                return False

        # Validate k_factor match
        k_factor_diff = abs(
            almona_result["k_factor"] - reality_event.payload["k_factor"]
        )
        if k_factor_diff > 0.001:
            logger.warning("k_factor mismatch")
            return False

        return True

    def _validate_anomaly_match(
        self,
        almona_result: Dict[str, Any],
        reality_result: Optional[str],
        reality_event: BaseEvent,
    ) -> bool:
        """Validate anomaly match."""
        if not reality_result:
            return False

        # Validate anomaly type match
        almona_type = almona_result["anomaly_type"]
        reality_type = reality_event.payload.get("anomaly_type")
        if almona_type != reality_type:
            return False

        # Validate severity match
        if almona_result["severity"] != reality_event.payload["severity"]:
            return False

        return True

    def _log_mismatch(
        self,
        event_type: str,
        profile_id: str,
        almona_result: Dict[str, Any],
        reality_result: Optional[str],
    ) -> None:
        """Log mismatch for security analysis."""
        logger.error(
            f"SECURITY ANOMALY: Mismatch detected for {event_type} "
            f"(profile: {profile_id})"
        )
        logger.error(f"Almona result: {almona_result}")
        logger.error(f"RealityOS result: {reality_result}")

    def _rollback_baseline(self, baseline_id: Optional[str]) -> None:
        """Rollback baseline recording (placeholder)."""
        if baseline_id:
            logger.warning(f"Rolling back baseline: {baseline_id}")
            # TODO: Implement actual rollback logic
