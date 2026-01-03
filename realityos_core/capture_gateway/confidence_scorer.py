"""
Confidence Scoring with Constitutional Degradation Rules
Computes confidence scores based on validation errors.
"""

from typing import List
from realityos_core.capture_gateway.types import (
    ValidationError,
    ValidationSeverity,
)


class ConfidenceScorer:
    """
    Computes confidence scores with constitutional degradation rules.

    Rules:
    1. QR failure → 0.0 (constitutional violation)
    2. Each DEGRADE error reduces by 0.2 (maximum)
    3. Each WARNING reduces by 0.05
    4. Minimum confidence after degradation: 0.5
       (unless constitutional violation)
    5. Multiple same-category errors don't stack
       (prevent over-penalization)
    """

    DEGRADE_PENALTY = 0.2
    WARNING_PENALTY = 0.05
    MINIMUM_CONFIDENCE = 0.5

    @classmethod
    def compute(cls, errors: List[ValidationError]) -> float:
        """
        Compute degraded confidence score.

        Args:
            errors: List of validation errors

        Returns:
            Confidence score (0.0 to 1.0)
        """
        # Check for constitutional violations (BLOCK)
        if any(e.severity == ValidationSeverity.BLOCK for e in errors):
            return 0.0  # Constitutional violation

        base_confidence = 1.0

        # Group by validator to prevent over-penalization
        degrade_validators = set()
        warning_validators = set()

        for error in errors:
            if error.severity == ValidationSeverity.DEGRADE:
                degrade_validators.add(error.validator)
            elif error.severity == ValidationSeverity.WARNING:
                warning_validators.add(error.validator)

        # Apply penalties
        confidence = base_confidence
        confidence -= len(degrade_validators) * cls.DEGRADE_PENALTY
        confidence -= len(warning_validators) * cls.WARNING_PENALTY

        return max(confidence, cls.MINIMUM_CONFIDENCE)
