"""
Reality Capture Gateway Exceptions
Constitutional violation exceptions with evidence preservation.
"""

from typing import Dict, Any


class ConstitutionalViolationError(Exception):
    """Raised when a constitutional principle is violated."""

    def __init__(self, principle: str, violation: str, evidence: Dict[str, Any]):
        self.principle = principle
        self.violation = violation
        self.evidence = evidence
        super().__init__(f"Constitutional Violation [{principle}]: {violation}")


class QRValidationError(ConstitutionalViolationError):
    """QR validation failure (constitutional violation)."""

    pass


class PhotoManipulationError(ConstitutionalViolationError):
    """Photo manipulation detected."""

    pass


class GPSAnomalyError(ConstitutionalViolationError):
    """GPS anomaly detected (neutral language only)."""

    pass


class TimestampAnomalyError(ConstitutionalViolationError):
    """Timestamp anomaly detected."""

    pass


class CorrelationAnomalyError(ConstitutionalViolationError):
    """Cross-validator correlation anomaly detected."""

    pass
