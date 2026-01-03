"""
BaseRealityRule - Abstract base class for all vertical rules.

Constitutional requirement: All vertical rules must extend this class.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

from realityos_core.models.event_models import BaseEvent, CoreEventType
from realityos_core.capture_gateway.types import (
    ValidationError,
    ValidationSeverity,
)


@dataclass
class RuleValidationResult:
    """Result of rule validation."""

    is_valid: bool
    errors: List[ValidationError]
    transformed_payload: Optional[Dict[str, Any]] = None
    additional_metadata: Optional[Dict[str, Any]] = None


class BaseRealityRule(ABC):
    """
    Abstract base class for all vertical reality rules.

    Constitutional Principles:
    1. Must respect human verification (cannot bypass capture gateway)
    2. Must respect append-only reality (cannot modify/delete events)
    3. Must respect cryptographic chain (cannot break hash chain)
    4. Must be vertical-agnostic (cannot access other verticals' data)
    5. Must use per-vertical signing keys
    6. Cannot have admin override mechanisms
    """

    @property
    @abstractmethod
    def rule_id(self) -> str:
        """Unique identifier for this rule."""
        pass

    @property
    @abstractmethod
    def vertical_id(self) -> str:
        """ID of the vertical this rule belongs to."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Human-readable description of this rule."""
        pass

    @property
    @abstractmethod
    def event_types(self) -> List[CoreEventType]:
        """Event types this rule handles."""
        pass

    @abstractmethod
    def validate_event(self, event: BaseEvent) -> RuleValidationResult:
        """
        Validate event according to vertical-specific rules.

        This is called AFTER constitutional validation (capture gateway).
        Vertical rules add domain-specific validation.

        Args:
            event: BaseEvent to validate

        Returns:
            RuleValidationResult with validation outcome
        """
        pass

    @abstractmethod
    def transform_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform event payload for vertical-specific needs.

        This can add vertical-specific metadata or transform data,
        but cannot remove constitutional proof elements.

        Args:
            payload: Original event payload

        Returns:
            Transformed payload
        """
        pass

    def get_required_proof_elements(self) -> List[str]:
        """
        Get proof elements required by this vertical.

        Default: ["verified_by", "timestamp"]
        Override to add vertical-specific requirements.

        Returns:
            List of required proof element names
        """
        return ["verified_by", "timestamp"]

    def check_constitutional_compliance(self) -> bool:
        """
        Check if this rule complies with constitutional principles.

        Called during plugin registration.

        Returns:
            True if compliant, False otherwise
        """
        # Check for forbidden patterns
        forbidden_attributes = [
            "bypass_gateway",
            "allow_admin_override",
            "modify_event",
            "delete_event",
            "access_other_vertical",
        ]

        for attr in forbidden_attributes:
            if hasattr(self, attr):
                return False

        return True

