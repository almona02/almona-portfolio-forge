"""
Unit tests for VerticalRegistry.

Tests plugin registration, constitutional compliance, and rule loading.
"""

import json
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch
import pytest

from realityos_core.vertical_registry import (
    VerticalRegistry,
    VerticalManifest,
    VerticalPlugin,
)
from realityos_core.base_rule import BaseRealityRule, RuleValidationResult
from realityos_core.models.event_models import CoreEventType
from realityos_core.capture_gateway.exceptions import (
    ConstitutionalViolationError,
)
from realityos_core.capture_gateway.types import ValidationError


class MockRule(BaseRealityRule):
    """Mock rule for testing."""

    @property
    def rule_id(self) -> str:
        return "mock_rule"

    @property
    def vertical_id(self) -> str:
        return "test_vertical"

    @property
    def description(self) -> str:
        return "Mock rule for testing"

    @property
    def event_types(self):
        return [CoreEventType.VERIFICATION]

    def validate_event(self, event):
        return RuleValidationResult(is_valid=True, errors=[])

    def transform_payload(self, payload):
        return payload


class ViolatingRule(BaseRealityRule):
    """Rule that violates constitution (has bypass_gateway)."""

    bypass_gateway = True  # Constitutional violation

    @property
    def rule_id(self) -> str:
        return "violating_rule"

    @property
    def vertical_id(self) -> str:
        return "test_vertical"

    @property
    def description(self) -> str:
        return "Violating rule"

    @property
    def event_types(self):
        return [CoreEventType.VERIFICATION]

    def validate_event(self, event):
        return RuleValidationResult(is_valid=True, errors=[])

    def transform_payload(self, payload):
        return payload


class TestVerticalRegistry:
    """Test suite for VerticalRegistry."""

    def setup_method(self):
        """Set up test fixtures."""
        self.registry = VerticalRegistry()

    def test_register_vertical_success(self):
        """Test successful vertical registration."""
        with tempfile.TemporaryDirectory() as tmpdir:
            plugin_dir = Path(tmpdir) / "test_vertical"
            plugin_dir.mkdir()
            rules_dir = plugin_dir / "rules"
            rules_dir.mkdir()

            # Create manifest
            manifest = {
                "vertical_id": "test_vertical",
                "name": "Test Vertical",
                "version": "1.0.0",
                "description": "Test vertical for unit tests",
                "author": "Test Author",
                "core_version_required": ">=1.0.0,<2.0.0",
                "requires_vertical": [],
                "rule_classes": ["MockRule"],
                "event_types": ["VERIFICATION"],
                "per_vertical_secret": True,
                "constitutional_compliance": {
                    "principle_1": True,
                    "principle_2": True,
                    "principle_3": True,
                    "principle_5": True,
                    "principle_6": True,
                },
            }

            manifest_path = plugin_dir / "manifest.json"
            with open(manifest_path, "w") as f:
                json.dump(manifest, f)

            # Create rule file
            rule_file = rules_dir / "mock_rule.py"
            rule_file.write_text(
                """
from realityos_core.base_rule import BaseRealityRule, RuleValidationResult
from realityos_core.models.event_models import CoreEventType

class MockRule(BaseRealityRule):
    @property
    def rule_id(self):
        return "mock_rule"
    
    @property
    def vertical_id(self):
        return "test_vertical"
    
    @property
    def description(self):
        return "Mock rule"
    
    @property
    def event_types(self):
        return [CoreEventType.VERIFICATION]
    
    def validate_event(self, event):
        return RuleValidationResult(is_valid=True, errors=[])
    
    def transform_payload(self, payload):
        return payload
"""
            )

            # Register vertical
            vertical_id = self.registry.register_vertical(manifest_path)

            assert vertical_id == "test_vertical"
            assert vertical_id in self.registry.verticals
            assert self.registry.get_vertical(vertical_id) is not None

    def test_register_vertical_missing_manifest(self):
        """Test registration fails if manifest not found."""
        with pytest.raises(FileNotFoundError):
            self.registry.register_vertical(Path("/nonexistent/manifest.json"))

    def test_register_vertical_invalid_manifest(self):
        """Test registration fails if manifest is invalid."""
        with tempfile.TemporaryDirectory() as tmpdir:
            plugin_dir = Path(tmpdir) / "test_vertical"
            plugin_dir.mkdir()

            # Create invalid manifest (missing required field)
            manifest = {
                "vertical_id": "test_vertical",
                # Missing "name" field
            }

            manifest_path = plugin_dir / "manifest.json"
            with open(manifest_path, "w") as f:
                json.dump(manifest, f)

            with pytest.raises(ValueError, match="missing required field"):
                self.registry.register_vertical(manifest_path)

    def test_register_vertical_no_per_vertical_secret(self):
        """Test registration fails if per_vertical_secret is False."""
        with tempfile.TemporaryDirectory() as tmpdir:
            plugin_dir = Path(tmpdir) / "test_vertical"
            plugin_dir.mkdir()
            rules_dir = plugin_dir / "rules"
            rules_dir.mkdir()

            # Create manifest without per_vertical_secret
            manifest = {
                "vertical_id": "test_vertical",
                "name": "Test Vertical",
                "version": "1.0.0",
                "description": "Test",
                "author": "Test",
                "core_version_required": ">=1.0.0,<2.0.0",
                "requires_vertical": [],
                "rule_classes": ["MockRule"],
                "event_types": ["VERIFICATION"],
                "per_vertical_secret": False,  # Violation
                "constitutional_compliance": {},
            }

            manifest_path = plugin_dir / "manifest.json"
            with open(manifest_path, "w") as f:
                json.dump(manifest, f)

            # Create rule file
            rule_file = rules_dir / "mock_rule.py"
            rule_file.write_text(
                """
from realityos_core.base_rule import BaseRealityRule, RuleValidationResult
from realityos_core.models.event_models import CoreEventType

class MockRule(BaseRealityRule):
    @property
    def rule_id(self):
        return "mock_rule"
    
    @property
    def vertical_id(self):
        return "test_vertical"
    
    @property
    def description(self):
        return "Mock rule"
    
    @property
    def event_types(self):
        return [CoreEventType.VERIFICATION]
    
    def validate_event(self, event):
        return RuleValidationResult(is_valid=True, errors=[])
    
    def transform_payload(self, payload):
        return payload
"""
            )

            with pytest.raises(ConstitutionalViolationError):
                self.registry.register_vertical(manifest_path)

    def test_get_vertical(self):
        """Test getting a registered vertical."""
        # Register a mock vertical
        self.registry.verticals["test_vertical"] = Mock(spec=VerticalPlugin)

        vertical = self.registry.get_vertical("test_vertical")
        assert vertical is not None

        # Test non-existent vertical
        vertical = self.registry.get_vertical("nonexistent")
        assert vertical is None

    def test_list_verticals(self):
        """Test listing all registered verticals."""
        # Register mock verticals
        self.registry.verticals["vertical1"] = Mock(spec=VerticalPlugin)
        self.registry.verticals["vertical2"] = Mock(spec=VerticalPlugin)

        verticals = self.registry.list_verticals()
        assert len(verticals) == 2
        assert "vertical1" in verticals
        assert "vertical2" in verticals

    def test_unregister_vertical(self):
        """Test unregistering a vertical."""
        # Register a mock vertical
        self.registry.verticals["test_vertical"] = Mock(spec=VerticalPlugin)
        self.registry.rule_registry["test_vertical.MockRule"] = MockRule

        # Unregister
        result = self.registry.unregister_vertical("test_vertical")
        assert result is True
        assert "test_vertical" not in self.registry.verticals
        assert "test_vertical.MockRule" not in self.registry.rule_registry

        # Test unregistering non-existent
        result = self.registry.unregister_vertical("nonexistent")
        assert result is False

    def test_get_rule_for_event(self):
        """Test getting rules for a specific event type."""
        # Create mock plugin
        mock_manifest = VerticalManifest(
            vertical_id="test_vertical",
            name="Test",
            version="1.0.0",
            description="",
            author="",
            core_version_required=">=1.0.0",
            requires_vertical=[],
            rule_classes=["MockRule"],
            event_types=["VERIFICATION"],
            per_vertical_secret=True,
            constitutional_compliance={},
        )

        mock_plugin = VerticalPlugin(
            manifest=mock_manifest,
            rule_classes=[MockRule],
            loaded_at=None,
            enabled=True,
        )

        self.registry.verticals["test_vertical"] = mock_plugin

        # Get rules for VERIFICATION event
        rules = self.registry.get_rule_for_event(CoreEventType.VERIFICATION)
        assert len(rules) == 1
        assert rules[0] == MockRule

        # Get rules for different event type
        rules = self.registry.get_rule_for_event(CoreEventType.FAULT)
        assert len(rules) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

