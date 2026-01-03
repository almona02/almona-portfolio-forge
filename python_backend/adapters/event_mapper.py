"""
Almona Event Mapper

Complete event mapping from Almona calibration system to RealityOS events.

Constitutional Compliance:
- Principle 1: Human-Verified Before System-Trusted
- Principle 2: Append-Only Reality
- Principle 3: Cryptographic Chain of Custody
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from realityos_core.models.event_models import (
    BaseEvent,
    CoreEventType,
    GPSPoint,
    RealityProof,
)

logger = logging.getLogger(__name__)


class AlmonaEventMapper:
    """Maps Almona calibration events to RealityOS events."""

    @staticmethod
    def map_baseline_to_verification(
        profile_id: str,
        joint_type: str,
        workshop_id: Optional[str],
        k_factor: float,
        confidence: float,
        certified_by: str,
        certified_at: datetime,
        sample_size: int = 0,
        model_version: str = "1.0.0",
        reasoning: Optional[list] = None,
        baseline_version: Optional[str] = None,
        baseline_hash: Optional[str] = None,
        almona_baseline_id: Optional[str] = None,
        # Optional proof components (for human verification)
        qr_data: Optional[str] = None,
        photos: Optional[list] = None,
        gps_latitude: Optional[float] = None,
        gps_longitude: Optional[float] = None,
        gps_accuracy_meters: Optional[float] = None,
        vertical_id: str = "almona_vertical",
    ) -> BaseEvent:
        """
        Map calibration_baseline → VERIFICATION event.

        Args:
            profile_id: Profile identifier
            joint_type: Type of joint
            workshop_id: Workshop identifier (None for global)
            k_factor: Calibration k-factor value
            confidence: Confidence score
            certified_by: Who certified the baseline
            certified_at: When baseline was certified
            sample_size: Sample size used
            model_version: Model version
            reasoning: Reasoning list
            baseline_version: Baseline version string
            baseline_hash: Baseline cryptographic hash
            almona_baseline_id: Almona baseline ID
            qr_data: Optional QR code data
            photos: Optional photo data (list of bytes)
            gps_latitude: Optional GPS latitude
            gps_longitude: Optional GPS longitude
            gps_accuracy_meters: Optional GPS accuracy
            vertical_id: Vertical identifier

        Returns:
            BaseEvent ready for RealityOS Event Ledger
        """
        # Create entity ID from profile_id and joint_type
        entity_id = f"{profile_id}:{joint_type}"
        if workshop_id:
            entity_id = f"{entity_id}:{workshop_id}"

        # Ensure certified_at is timezone-aware
        if certified_at.tzinfo is None:
            certified_at = certified_at.replace(tzinfo=timezone.utc)
        else:
            certified_at = certified_at.astimezone(timezone.utc)

        # Create proof (Principle 1: Human-Verified Before System-Trusted)
        # Build GPS point if provided
        location = None
        if gps_latitude is not None and gps_longitude is not None:
            location = GPSPoint(
                latitude=gps_latitude,
                longitude=gps_longitude,
                accuracy_meters=gps_accuracy_meters,
            )

        # Convert photos to hashes (if provided)
        photo_hashes = None
        if photos:
            import hashlib

            # Limit to 2 photos (constitutional maximum)
            photo_hashes = [
                hashlib.sha256(photo).hexdigest() for photo in photos[:2]
            ]

        proof = RealityProof(
            verified_by=certified_by or "system",
            timestamp=certified_at,
            qr_data=qr_data,
            photo_hashes=photo_hashes,
            location=location,
        )

        # Create payload with all Almona metadata
        payload = {
            "almona_event_type": "calibration_baseline",
            "almona_baseline_id": almona_baseline_id,
            "profile_id": profile_id,
            "joint_type": joint_type,
            "workshop_id": workshop_id,
            "baseline_version": baseline_version,
            "baseline_hash": baseline_hash,
            "k_factor": float(k_factor),
            "confidence": float(confidence),
            "sample_size": sample_size,
            "model_version": model_version,
            "reasoning": reasoning or [],
            "certified_by": certified_by,
            "certified_at": certified_at.isoformat(),
        }

        return BaseEvent(
            event_type=CoreEventType.VERIFICATION,
            entity_id=entity_id,
            vertical_id=vertical_id,
            proof=proof,
            payload=payload,
        )

    @staticmethod
    def map_anomaly_to_fault(
        profile_id: str,
        joint_type: str,
        workshop_id: Optional[str],
        anomaly_type: str,
        severity: str,
        details: Dict[str, Any],
        execution_context: Dict[str, Any],
        almona_anomaly_id: Optional[str] = None,
        detected_at: Optional[datetime] = None,
        vertical_id: str = "almona_vertical",
    ) -> BaseEvent:
        """
        Map calibration_anomaly → FAULT event.

        Args:
            profile_id: Profile identifier
            joint_type: Type of joint
            workshop_id: Workshop identifier (None for global)
            anomaly_type: Type of anomaly (drift, low_confidence, etc.)
            severity: Severity level (WARNING, CRITICAL)
            details: Anomaly details
            execution_context: Execution context
            almona_anomaly_id: Almona anomaly ID
            detected_at: When anomaly was detected
            vertical_id: Vertical identifier

        Returns:
            BaseEvent ready for RealityOS Event Ledger
        """
        # Create entity ID
        entity_id = f"{profile_id}:{joint_type}"
        if workshop_id:
            entity_id = f"{entity_id}:{workshop_id}"

        # Use detected_at or current time
        if detected_at:
            if detected_at.tzinfo is None:
                detected_at = detected_at.replace(tzinfo=timezone.utc)
            else:
                detected_at = detected_at.astimezone(timezone.utc)
        else:
            detected_at = datetime.now(timezone.utc)

        # Anomalies are system-detected (no human verification)
        # But we still create a proof for audit trail
        proof = RealityProof(
            verified_by="system",
            timestamp=detected_at,
        )

        # Create payload with all original metadata
        payload = {
            "almona_event_type": "calibration_anomaly",
            "almona_anomaly_id": almona_anomaly_id,
            "profile_id": profile_id,
            "joint_type": joint_type,
            "workshop_id": workshop_id,
            "anomaly_type": anomaly_type,
            "severity": severity,
            "details": details,
            "execution_context": execution_context,
            "detected_at": detected_at.isoformat(),
        }

        return BaseEvent(
            event_type=CoreEventType.FAULT,
            entity_id=entity_id,
            vertical_id=vertical_id,
            proof=proof,
            payload=payload,
        )

    @staticmethod
    def map_freeze_to_off(
        profile_id: str,
        joint_type: str,
        workshop_id: Optional[str],
        frozen_reason: str,
        frozen_at: Optional[datetime] = None,
        frozen_by: Optional[str] = None,
        vertical_id: str = "almona_vertical",
    ) -> BaseEvent:
        """
        Map calibration_freeze → OFF event.

        When calibration is frozen, the system is effectively "OFF"
        for that profile/joint combination.

        Args:
            profile_id: Profile identifier
            joint_type: Type of joint
            workshop_id: Workshop identifier (None for global)
            frozen_reason: Reason for freezing
            frozen_at: When calibration was frozen
            frozen_by: Who froze the calibration
            vertical_id: Vertical identifier

        Returns:
            BaseEvent ready for RealityOS Event Ledger
        """
        # Create entity ID
        entity_id = f"{profile_id}:{joint_type}"
        if workshop_id:
            entity_id = f"{entity_id}:{workshop_id}"

        # Use frozen_at or current time
        if frozen_at:
            if frozen_at.tzinfo is None:
                frozen_at = frozen_at.replace(tzinfo=timezone.utc)
            else:
                frozen_at = frozen_at.astimezone(timezone.utc)
        else:
            frozen_at = datetime.now(timezone.utc)

        # Freeze events are system-initiated (no human verification)
        proof = RealityProof(
            verified_by=frozen_by or "system",
            timestamp=frozen_at,
        )

        # Create payload
        payload = {
            "almona_event_type": "calibration_freeze",
            "profile_id": profile_id,
            "joint_type": joint_type,
            "workshop_id": workshop_id,
            "frozen_reason": frozen_reason,
            "frozen_by": frozen_by,
            "frozen_at": frozen_at.isoformat(),
        }

        return BaseEvent(
            event_type=CoreEventType.OFF,
            entity_id=entity_id,
            vertical_id=vertical_id,
            proof=proof,
            payload=payload,
        )

