"""
AlmonaFreezeRule - Handles calibration freeze events.

Maps calibration freeze to OFF events.
"""

from typing import Dict, Any, List
from datetime import datetime, timezone

from realityos_core.base_rule import BaseRealityRule, RuleValidationResult
from realityos_core.models.event_models import BaseEvent, CoreEventType
from realityos_core.capture_gateway.types import (
    ValidationError,
    ValidationSeverity,
)


class AlmonaFreezeRule(BaseRealityRule):
    """
    Rule for Almona calibration freeze events.

    Maps calibration freeze to OFF events (system is "OFF" when frozen).
    """

    @property
    def rule_id(self) -> str:
        return "almona_freeze_rule"

    @property
    def vertical_id(self) -> str:
        return "almona_vertical"

    @property
    def description(self) -> str:
        return "Validates and enriches Almona calibration freeze events"

    @property
    def event_types(self) -> List[CoreEventType]:
        return [CoreEventType.OFF]

    def validate_event(self, event: BaseEvent) -> RuleValidationResult:
        """
        Validate Almona freeze event.

        Args:
            event: BaseEvent to validate

        Returns:
            RuleValidationResult with validation outcome
        """
        errors = []
        payload = event.payload or {}

        # Check required fields
        required_fields = ["almona_event_type", "frozen_reason"]
        for field in required_fields:
            if field not in payload:
                errors.append(
                    ValidationError(
                        validator=self.rule_id,
                        field="payload",
                        message=f"Missing required freeze field: {field}",
                        severity=ValidationSeverity.DEGRADE,
                        evidence={"missing_field": field},
                    )
                )

        # Check almona_event_type is "calibration_freeze"
        if payload.get("almona_event_type") != "calibration_freeze":
            errors.append(
                ValidationError(
                    validator=self.rule_id,
                    field="almona_event_type",
                    message=(
                        f"Expected 'calibration_freeze', got "
                        f"'{payload.get('almona_event_type')}'"
                    ),
                    severity=ValidationSeverity.DEGRADE,
                    evidence={"actual": payload.get("almona_event_type")},
                )
            )

        is_valid = len(errors) == 0

        return RuleValidationResult(
            is_valid=is_valid,
            errors=errors,
            transformed_payload=(
                self._add_freeze_metadata(payload) if is_valid else None
            ),
        )

    def transform_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add Almona freeze metadata.

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
        transformed["freeze_processed_at"] = (
            datetime.now(timezone.utc).isoformat()
        )

        return transformed

    def _add_freeze_metadata(
        self, payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Add freeze-specific metadata."""
        metadata = {
            "freeze_duration": self._estimate_freeze_duration(payload),
            "requires_manual_unfreeze": True,
            "freeze_category": self._categorize_freeze(payload),
        }

        return {**payload, **metadata}

    def _estimate_freeze_duration(self, payload: Dict[str, Any]) -> str:
        """Estimate expected freeze duration."""
        reason = payload.get("frozen_reason", "").lower()

        if "drift" in reason:
            return "until_review"
        elif "critical" in reason:
            return "until_manual_unfreeze"
        else:
            return "temporary"

    def _categorize_freeze(self, payload: Dict[str, Any]) -> str:
        """Categorize freeze for analytics."""
        reason = payload.get("frozen_reason", "").lower()

        if "drift" in reason:
            return "safety_drift"
        elif "critical" in reason or "error" in reason:
            return "critical_failure"
        else:
            return "manual_freeze"

