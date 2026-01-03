"""
AlmonaCalibrationRule - Handles calibration baseline events.

Extracted from AlmonaRealityOSAdapter with constitutional compliance.
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
class CalibrationMetadata:
    """Almona-specific calibration metadata."""

    profile_id: str
    joint_type: str
    k_factor: float
    confidence: float
    workshop_id: Optional[str]
    machine_type: Optional[str]
    material_type: str  # "aluminium" or "upvc"


class AlmonaCalibrationRule(BaseRealityRule):
    """
    Rule for Almona calibration baseline events.

    Maps calibration baselines to VERIFICATION events with
    Almona-specific metadata.
    """

    @property
    def rule_id(self) -> str:
        return "almona_calibration_rule"

    @property
    def vertical_id(self) -> str:
        return "almona_vertical"

    @property
    def description(self) -> str:
        return "Validates and enriches Almona calibration baseline events"

    @property
    def event_types(self) -> List[CoreEventType]:
        return [CoreEventType.VERIFICATION]

    def validate_event(self, event: BaseEvent) -> RuleValidationResult:
        """
        Validate Almona calibration event.

        Constitutional check: Already passed through capture gateway.
        Vertical check: Ensure required Almona metadata is present.

        Args:
            event: BaseEvent to validate

        Returns:
            RuleValidationResult with validation outcome
        """
        errors = []

        # Check payload has required Almona fields
        payload = event.payload or {}

        required_fields = ["almona_event_type", "k_factor"]
        for field in required_fields:
            if field not in payload:
                errors.append(
                    ValidationError(
                        validator=self.rule_id,
                        field="payload",
                        message=f"Missing required Almona field: {field}",
                        severity=ValidationSeverity.DEGRADE,
                        evidence={"missing_field": field},
                    )
                )

        # Check almona_event_type is "calibration_baseline"
        if payload.get("almona_event_type") != "calibration_baseline":
            errors.append(
                ValidationError(
                    validator=self.rule_id,
                    field="almona_event_type",
                    message=(
                        f"Expected 'calibration_baseline', got "
                        f"'{payload.get('almona_event_type')}'"
                    ),
                    severity=ValidationSeverity.DEGRADE,
                    evidence={"actual": payload.get("almona_event_type")},
                )
            )

        # Validate k_factor is reasonable (0.1 to 10.0)
        k_factor = payload.get("k_factor")
        if k_factor is not None:
            try:
                k_factor_float = float(k_factor)
                if not (0.1 <= k_factor_float <= 10.0):
                    errors.append(
                        ValidationError(
                            validator=self.rule_id,
                            field="k_factor",
                            message=(
                                f"k_factor {k_factor_float} outside reasonable "
                                "range (0.1-10.0)"
                            ),
                            severity=ValidationSeverity.DEGRADE,
                            evidence={"k_factor": k_factor_float},
                        )
                    )
            except (ValueError, TypeError):
                errors.append(
                    ValidationError(
                        validator=self.rule_id,
                        field="k_factor",
                        message=(
                            f"k_factor must be numeric, got "
                            f"{type(k_factor).__name__}"
                        ),
                        severity=ValidationSeverity.DEGRADE,
                        evidence={"k_factor_type": type(k_factor).__name__},
                    )
                )

        is_valid = len(errors) == 0

        return RuleValidationResult(
            is_valid=is_valid,
            errors=errors,
            transformed_payload=(
                self._add_almona_metadata(payload) if is_valid else None
            ),
            additional_metadata=(
                self._extract_calibration_metadata(payload)
                if is_valid
                else None
            ),
        )

    def transform_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add Almona-specific metadata to payload.

        Constitutional: Cannot remove proof elements.
        Vertical: Can add Almona-specific enrichment.

        Args:
            payload: Original event payload

        Returns:
            Transformed payload
        """
        transformed = payload.copy()

        # Add Almona vertical identifier
        transformed["vertical_id"] = self.vertical_id
        transformed["rule_id"] = self.rule_id

        # Add processing timestamp
        transformed["almona_processed_at"] = (
            datetime.now(timezone.utc).isoformat()
        )

        # Add version info
        transformed["almona_rule_version"] = "1.0.0"

        return transformed

    def _add_almona_metadata(
        self, payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Add Almona-specific metadata to validated payload."""
        metadata = {
            "almona_metadata_added": True,
            "material_type": self._infer_material_type(payload),
            "requires_cnc_export": self._requires_cnc_export(payload),
            "calibration_category": self._categorize_calibration(payload),
        }

        return {**payload, **metadata}

    def _extract_calibration_metadata(
        self, payload: Dict[str, Any]
    ) -> Optional[CalibrationMetadata]:
        """Extract structured calibration metadata."""
        try:
            return CalibrationMetadata(
                profile_id=payload.get("profile_id", "unknown"),
                joint_type=payload.get("joint_type", "unknown"),
                k_factor=float(payload.get("k_factor", 0)),
                confidence=float(payload.get("confidence", 0)),
                workshop_id=payload.get("workshop_id"),
                machine_type=payload.get("machine_type"),
                material_type=self._infer_material_type(payload),
            )
        except (ValueError, TypeError):
            return None

    def _infer_material_type(self, payload: Dict[str, Any]) -> str:
        """Infer material type from calibration data."""
        # This is a simplified version - real implementation would
        # use profile database or other signals
        joint_type = payload.get("joint_type", "").lower()

        if "upvc" in joint_type or "pvc" in joint_type:
            return "upvc"
        elif "alu" in joint_type or "aluminium" in joint_type:
            return "aluminium"
        else:
            return "unknown"

    def _requires_cnc_export(self, payload: Dict[str, Any]) -> bool:
        """Determine if this calibration requires CNC export."""
        # Real implementation would check if this is a production
        # calibration vs a test/development calibration
        k_factor = payload.get("k_factor")
        return k_factor is not None and 0.5 <= float(k_factor) <= 5.0

    def _categorize_calibration(self, payload: Dict[str, Any]) -> str:
        """Categorize calibration for analytics."""
        confidence = payload.get("confidence", 0)

        if confidence >= 0.9:
            return "certified_production"
        elif confidence >= 0.7:
            return "verified_workshop"
        else:
            return "experimental"

    def get_required_proof_elements(self) -> List[str]:
        """
        Almona calibration requires human verification.

        Override to add Almona-specific proof requirements.

        Returns:
            List of required proof element names
        """
        base_elements = super().get_required_proof_elements()
        return base_elements + ["qr_data"]  # Almona requires QR

