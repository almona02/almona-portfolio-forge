"""
AlmonaAnomalyRule - Handles calibration anomaly events.

Extracted from AlmonaRealityOSAdapter.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime, timezone

from realityos_core.base_rule import BaseRealityRule, RuleValidationResult
from realityos_core.models.event_models import BaseEvent, CoreEventType
from realityos_core.capture_gateway.types import (
    ValidationError,
    ValidationSeverity,
)


@dataclass
class AnomalyMetadata:
    """Almona-specific anomaly metadata."""

    anomaly_type: str  # "drift", "freeze", "low_confidence"
    severity: str  # "low", "medium", "high", "critical"
    detected_value: float
    expected_value: float
    delta: float
    exceeds_threshold: bool


class AlmonaAnomalyRule(BaseRealityRule):
    """
    Rule for Almona calibration anomaly events.

    Maps calibration anomalies to FAULT events.
    """

    @property
    def rule_id(self) -> str:
        return "almona_anomaly_rule"

    @property
    def vertical_id(self) -> str:
        return "almona_vertical"

    @property
    def description(self) -> str:
        return "Validates and enriches Almona calibration anomaly events"

    @property
    def event_types(self) -> List[CoreEventType]:
        return [CoreEventType.FAULT]

    def validate_event(self, event: BaseEvent) -> RuleValidationResult:
        """
        Validate Almona anomaly event.

        Args:
            event: BaseEvent to validate

        Returns:
            RuleValidationResult with validation outcome
        """
        errors = []
        payload = event.payload or {}

        # Check required fields
        required_fields = ["almona_event_type", "anomaly_type", "severity"]
        for field in required_fields:
            if field not in payload:
                errors.append(
                    ValidationError(
                        validator=self.rule_id,
                        field="payload",
                        message=f"Missing required anomaly field: {field}",
                        severity=ValidationSeverity.DEGRADE,
                        evidence={"missing_field": field},
                    )
                )

        # Check almona_event_type is "calibration_anomaly"
        if payload.get("almona_event_type") != "calibration_anomaly":
            errors.append(
                ValidationError(
                    validator=self.rule_id,
                    field="almona_event_type",
                    message=(
                        f"Expected 'calibration_anomaly', got "
                        f"'{payload.get('almona_event_type')}'"
                    ),
                    severity=ValidationSeverity.DEGRADE,
                    evidence={"actual": payload.get("almona_event_type")},
                )
            )

        # Validate anomaly type is known
        valid_anomaly_types = [
            "drift",
            "freeze",
            "low_confidence",
            "system_error",
        ]
        anomaly_type = payload.get("anomaly_type")
        if anomaly_type not in valid_anomaly_types:
            errors.append(
                ValidationError(
                    validator=self.rule_id,
                    field="anomaly_type",
                    message=f"Unknown anomaly type: {anomaly_type}",
                    severity=ValidationSeverity.DEGRADE,
                    evidence={
                        "actual": anomaly_type,
                        "valid_types": valid_anomaly_types,
                    },
                )
            )

        # Validate severity is known
        valid_severities = ["low", "medium", "high", "critical"]
        severity = payload.get("severity")
        if severity not in valid_severities:
            errors.append(
                ValidationError(
                    validator=self.rule_id,
                    field="severity",
                    message=f"Unknown severity: {severity}",
                    severity=ValidationSeverity.DEGRADE,
                    evidence={
                        "actual": severity,
                        "valid_severities": valid_severities,
                    },
                )
            )

        is_valid = len(errors) == 0

        return RuleValidationResult(
            is_valid=is_valid,
            errors=errors,
            transformed_payload=(
                self._add_anomaly_metadata(payload) if is_valid else None
            ),
            additional_metadata=(
                self._extract_anomaly_metadata(payload) if is_valid else None
            ),
        )

    def transform_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add Almona anomaly metadata.

        Args:
            payload: Original event payload

        Returns:
            Transformed payload
        """
        transformed = payload.copy()

        # Add vertical identifier
        transformed["vertical_id"] = self.vertical_id
        transformed["rule_id"] = self.rule_id

        # Add processing info
        transformed["anomaly_detected_at"] = (
            datetime.now(timezone.utc).isoformat()
        )

        return transformed

    def _add_anomaly_metadata(
        self, payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Add anomaly-specific metadata."""
        metadata = {
            "requires_human_review": payload.get("severity")
            in ["high", "critical"],
            "automatic_response": self._determine_response(payload),
            "escalation_path": self._determine_escalation(payload),
        }

        return {**payload, **metadata}

    def _extract_anomaly_metadata(
        self, payload: Dict[str, Any]
    ) -> Optional[AnomalyMetadata]:
        """Extract structured anomaly metadata."""
        try:
            details = payload.get("details", {})
            detected_value = float(details.get("detected_value", 0))
            expected_value = float(details.get("expected_value", 0))
            delta = abs(detected_value - expected_value)

            return AnomalyMetadata(
                anomaly_type=payload.get("anomaly_type", "unknown"),
                severity=payload.get("severity", "medium"),
                detected_value=detected_value,
                expected_value=expected_value,
                delta=delta,
                exceeds_threshold=delta > 0.2,  # 0.2mm threshold
            )
        except (ValueError, TypeError):
            return None

    def _determine_response(self, payload: Dict[str, Any]) -> str:
        """Determine automatic response to anomaly."""
        severity = payload.get("severity")
        anomaly_type = payload.get("anomaly_type")

        if severity == "critical":
            return "immediate_freeze"
        elif severity == "high" and anomaly_type == "drift":
            return "requires_review"
        elif severity == "medium":
            return "log_and_monitor"
        else:
            return "log_only"

    def _determine_escalation(self, payload: Dict[str, Any]) -> List[str]:
        """Determine escalation path for anomaly."""
        severity = payload.get("severity")

        if severity == "critical":
            return ["operator", "supervisor", "manager", "cto"]
        elif severity == "high":
            return ["operator", "supervisor"]
        elif severity == "medium":
            return ["operator"]
        else:
            return []

