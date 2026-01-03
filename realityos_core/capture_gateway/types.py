"""
Shared types for Capture Gateway
Prevents circular imports between gateway and validators.
"""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum


class ValidationSeverity(str, Enum):
    """Severity of validation failure."""

    BLOCK = "BLOCK"  # Constitutional violation - must reject
    DEGRADE = "DEGRADE"  # Reduces confidence but doesn't block
    WARNING = "WARNING"  # Informational only


@dataclass
class ValidationError:
    """Validation error with severity."""

    validator: str
    field: str
    message: str
    severity: ValidationSeverity
    evidence: Optional[Dict[str, Any]] = None


@dataclass
class CaptureValidationResult:
    """Result of capture validation."""

    overall_passed: bool  # True only if no BLOCK errors
    confidence: float  # 0.0 to 1.0, degraded by DEGRADE errors
    errors: List[ValidationError]
    warnings: List[ValidationError]
    proof: Optional[Any] = None  # Only set if overall_passed (RealityProof)
    proof_hash: Optional[str] = None  # SHA-256 of validated proof

