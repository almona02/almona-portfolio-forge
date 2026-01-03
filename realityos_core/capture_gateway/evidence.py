"""
Validation Evidence Preservation
Immutable evidence bundles for audit trails.
"""

from dataclasses import dataclass
from typing import Dict, Any, Tuple, Optional
from datetime import datetime

from realityos_core.models.qr_models import SignedQRData
from realityos_core.models.event_models import GPSPoint


@dataclass(frozen=True)  # IMMUTABLE
class ValidationEvidence:
    """
    Immutable evidence bundle for audit trails.

    This class is frozen to prevent evidence tampering.
    All fields are set at creation and cannot be modified.
    """

    qr_raw: str
    qr_parsed: SignedQRData
    qr_hash: str
    photo_hashes: Tuple[str, ...]  # Frozen tuple, not list
    gps_raw: Dict[str, float]
    gps_normalized: Optional[GPSPoint]
    timestamp_raw: datetime
    timestamp_normalized: datetime
    verified_by: str
    validation_moment: datetime  # When validation occurred
    validator_versions: Dict[str, str]  # Validator versions used

    def to_audit_dict(self) -> Dict[str, Any]:
        """
        Serializable audit representation.

        Returns:
            Dictionary suitable for JSON serialization
        """
        return {
            "qr_hash": self.qr_hash,
            "photo_hashes": list(self.photo_hashes),
            "gps": (
                {
                    "latitude": self.gps_normalized.latitude,
                    "longitude": self.gps_normalized.longitude,
                    "accuracy_meters": self.gps_normalized.accuracy_meters,
                }
                if self.gps_normalized
                else None
            ),
            "timestamp": self.timestamp_normalized.isoformat(),
            "verified_by": self.verified_by,
            "validation_moment": self.validation_moment.isoformat(),
            "validator_versions": self.validator_versions,
        }
