"""
Reality Capture Gateway
Constitutional enforcement for Principle 1
(Human-Verified Before System-Trusted).
"""

from .gateway_skeleton import (
    RealityCaptureGateway,
    CaptureData,
)
from .types import (
    ValidationError,
    ValidationSeverity,
    CaptureValidationResult,
)
from .exceptions import (
    ConstitutionalViolationError,
    QRValidationError,
    PhotoManipulationError,
    GPSAnomalyError,
    TimestampAnomalyError,
    CorrelationAnomalyError,
)
from .confidence_scorer import ConfidenceScorer
from .auditor_formatter import AuditorOutputFormatter
from .fraud_detector import FraudPatternDetector
from .evidence import ValidationEvidence

__all__ = [
    "RealityCaptureGateway",
    "CaptureData",
    "CaptureValidationResult",
    "ValidationError",
    "ValidationSeverity",
    "ConstitutionalViolationError",
    "QRValidationError",
    "PhotoManipulationError",
    "GPSAnomalyError",
    "TimestampAnomalyError",
    "CorrelationAnomalyError",
    "ConfidenceScorer",
    "AuditorOutputFormatter",
    "FraudPatternDetector",
    "ValidationEvidence",
]
