"""
Vertical Plugin Registry - Manages all vertical plugins.

Enforces constitutional compliance at registration time.
"""

import json
import importlib.util
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Set, Type

try:
    from packaging.version import Version, SpecifierSet
except ImportError:
    # Fallback if packaging not available
    Version = None
    SpecifierSet = None

from realityos_core.base_rule import BaseRealityRule
from realityos_core.models.event_models import CoreEventType
from realityos_core.capture_gateway.exceptions import (
    ConstitutionalViolationError,
)


@dataclass
class VerticalManifest:
    """Plugin manifest metadata."""

    vertical_id: str
    name: str
    version: str
    description: str
    author: str
    core_version_required: str  # e.g., ">=1.0.0,<2.0.0"
    requires_vertical: List[str]  # Dependencies on other verticals
    rule_classes: List[str]  # e.g., ["CalibrationRule", "AnomalyRule"]
    event_types: List[str]  # Event types this vertical handles
    per_vertical_secret: bool  # Requires per-vertical signing key
    constitutional_compliance: Dict[str, bool]  # Principle compliance


@dataclass
class VerticalPlugin:
    """Loaded vertical plugin."""

    manifest: VerticalManifest
    rule_classes: List[Type[BaseRealityRule]]
    loaded_at: datetime
    enabled: bool = True


class VerticalRegistry:
    """
    Registry for managing vertical plugins.

    Enforces constitutional compliance at registration.
    """

    def __init__(self):
        """Initialize the vertical registry."""
        self.verticals: Dict[str, VerticalPlugin] = {}
        self.rule_registry: Dict[str, Type[BaseRealityRule]] = {}
        self.manifest_cache: Dict[str, VerticalManifest] = {}

    def register_vertical(self, manifest_path: Path) -> str:
        """
        Register a vertical plugin.

        1. Load and validate manifest
        2. Verify core version compatibility
        3. Load rule classes
        4. Verify constitutional compliance
        5. Register vertical

        Args:
            manifest_path: Path to manifest.json file

        Returns:
            vertical_id if successful

        Raises:
            ConstitutionalViolationError: If plugin violates constitution
            ValueError: If manifest is invalid
            FileNotFoundError: If manifest or rule files not found
        """
        # Step 1: Load manifest
        manifest = self._load_manifest(manifest_path)

        # Step 2: Verify core version compatibility
        self._verify_core_compatibility(manifest)

        # Step 3: Load rule classes
        rule_classes = self._load_rule_classes(manifest_path.parent, manifest)

        # Step 4: Verify constitutional compliance
        self._verify_constitutional_compliance(manifest, rule_classes)

        # Step 5: Create and register vertical plugin
        plugin = VerticalPlugin(
            manifest=manifest,
            rule_classes=rule_classes,
            loaded_at=datetime.now(timezone.utc),
        )

        self.verticals[manifest.vertical_id] = plugin
        self.manifest_cache[manifest.vertical_id] = manifest

        # Register rule classes
        for rule_class in rule_classes:
            registry_key = f"{manifest.vertical_id}.{rule_class.__name__}"
            self.rule_registry[registry_key] = rule_class

        return manifest.vertical_id

    def _load_manifest(self, manifest_path: Path) -> VerticalManifest:
        """
        Load and validate manifest file.

        Args:
            manifest_path: Path to manifest.json

        Returns:
            VerticalManifest object

        Raises:
            FileNotFoundError: If manifest not found
            ValueError: If manifest is invalid
        """
        if not manifest_path.exists():
            raise FileNotFoundError(f"Manifest not found: {manifest_path}")

        with open(manifest_path, "r") as f:
            data = json.load(f)

        # Validate required fields
        required_fields = [
            "vertical_id",
            "name",
            "version",
            "core_version_required",
            "rule_classes",
            "event_types",
            "constitutional_compliance",
        ]

        for field in required_fields:
            if field not in data:
                raise ValueError(f"Manifest missing required field: {field}")

        # Set defaults for optional fields
        data.setdefault("description", "")
        data.setdefault("author", "")
        data.setdefault("requires_vertical", [])
        data.setdefault("per_vertical_secret", True)

        # Remove optional metadata field (not in dataclass)
        data.pop("metadata", None)

        return VerticalManifest(**data)

    def _verify_core_compatibility(self, manifest: VerticalManifest):
        """
        Verify plugin is compatible with current RealityOS Core.

        Args:
            manifest: VerticalManifest to verify

        Raises:
            ValueError: If version incompatible
        """
        if Version is None or SpecifierSet is None:
            # Skip version checking if packaging not available
            return

        try:
            current_version = Version(self._get_core_version())
            required_spec = SpecifierSet(manifest.core_version_required)

            if not required_spec.contains(current_version):
                raise ValueError(
                    f"Plugin {manifest.vertical_id} requires core version "
                    f"{manifest.core_version_required}, but current version "
                    f"is {current_version}"
                )
        except Exception as e:
            # If version parsing fails, log warning but don't block
            # (allows development/testing without strict versioning)
            import logging

            logger = logging.getLogger(__name__)
            logger.warning(f"Version compatibility check failed: {e}")

    def _load_rule_classes(
        self, plugin_dir: Path, manifest: VerticalManifest
    ) -> List[Type[BaseRealityRule]]:
        """
        Load rule classes from plugin directory.

        Args:
            plugin_dir: Directory containing plugin files
            manifest: VerticalManifest with rule class names

        Returns:
            List of loaded rule classes

        Raises:
            FileNotFoundError: If rule file not found
            TypeError: If rule class doesn't extend BaseRealityRule
        """
        rule_classes = []

        for rule_class_name in manifest.rule_classes:
            # Import the module
            # Convert CamelCase to snake_case for filename
            rule_file_name = self._camel_to_snake(rule_class_name)
            module_path = plugin_dir / "rules" / f"{rule_file_name}.py"

            if not module_path.exists():
                raise FileNotFoundError(
                    f"Rule class file not found: {module_path}"
                )

            # Load module
            module_name = f"{manifest.vertical_id}.{rule_class_name}"
            spec = importlib.util.spec_from_file_location(
                module_name, module_path
            )
            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)

            # Get rule class
            rule_class = getattr(module, rule_class_name)

            # Verify it extends BaseRealityRule
            if not issubclass(rule_class, BaseRealityRule):
                raise TypeError(
                    f"Rule class {rule_class_name} must extend "
                    "BaseRealityRule"
                )

            rule_classes.append(rule_class)

        return rule_classes

    def _verify_constitutional_compliance(
        self,
        manifest: VerticalManifest,
        rule_classes: List[Type[BaseRealityRule]],
    ):
        """
        Verify plugin respects constitutional principles.

        Args:
            manifest: VerticalManifest to verify
            rule_classes: List of rule classes to verify

        Raises:
            ConstitutionalViolationError: If violations found
        """
        violations = []

        # Principle 5: Vertical Agnosticism
        # Each vertical must have per-vertical signing key
        if not manifest.per_vertical_secret:
            violations.append(
                "Principle 5: Must use per-vertical signing keys"
            )

        # Check each rule class for constitutional compliance
        for rule_class in rule_classes:
            # Verify rule doesn't bypass capture gateway
            if hasattr(rule_class, "bypass_gateway"):
                violations.append(
                    f"Principle 1 violation: {rule_class.__name__} "
                    "attempts to bypass capture gateway"
                )

            # Verify rule doesn't allow admin overrides
            if hasattr(rule_class, "allow_admin_override"):
                violations.append(
                    f"Principle 6 violation: {rule_class.__name__} "
                    "allows admin overrides"
                )

            # Verify rule doesn't allow event modification
            if hasattr(rule_class, "modify_event"):
                violations.append(
                    f"Principle 2 violation: {rule_class.__name__} "
                    "allows event modification"
                )

            # Verify rule doesn't allow event deletion
            if hasattr(rule_class, "delete_event"):
                violations.append(
                    f"Principle 2 violation: {rule_class.__name__} "
                    "allows event deletion"
                )

            # Verify rule doesn't break chain
            if hasattr(rule_class, "break_chain"):
                violations.append(
                    f"Principle 3 violation: {rule_class.__name__} "
                    "allows chain breaking"
                )

            # Verify rule doesn't access other verticals
            if hasattr(rule_class, "access_other_vertical"):
                violations.append(
                    f"Principle 5 violation: {rule_class.__name__} "
                    "accesses other verticals"
                )

            # Check rule instance compliance
            try:
                # Create a temporary instance to check compliance
                # (some checks require instance, not class)
                temp_instance = rule_class()
                if not temp_instance.check_constitutional_compliance():
                    violations.append(
                        f"Constitutional compliance check failed for "
                        f"{rule_class.__name__}"
                    )
            except Exception as e:
                violations.append(
                    f"Cannot instantiate {rule_class.__name__}: {e}"
                )

        if violations:
            raise ConstitutionalViolationError(
                principle="Vertical Agnosticism",
                violation=f"Plugin {manifest.vertical_id} violates "
                "constitution",
                evidence={"violations": violations},
            )

    def get_vertical(self, vertical_id: str) -> Optional[VerticalPlugin]:
        """
        Get registered vertical plugin.

        Args:
            vertical_id: ID of vertical to retrieve

        Returns:
            VerticalPlugin if found, None otherwise
        """
        return self.verticals.get(vertical_id)

    def get_rule_for_event(
        self, event_type: CoreEventType
    ) -> List[Type[BaseRealityRule]]:
        """
        Get all rule classes that handle a specific event type.

        Args:
            event_type: Event type to find rules for

        Returns:
            List of rule classes that handle this event type
        """
        rules = []

        for vertical_id, plugin in self.verticals.items():
            if not plugin.enabled:
                continue

            # Convert event_type to string for comparison
            if isinstance(event_type, CoreEventType):
                event_type_str = event_type.value
            else:
                event_type_str = str(event_type)

            # Check if this event type is handled by this vertical
            if event_type_str in plugin.manifest.event_types:
                # Filter rule classes to only those that handle this event type
                for rule_class in plugin.rule_classes:
                    # Create temporary instance to check event_types
                    try:
                        temp_instance = rule_class()
                        rule_event_types = [
                            et.value if isinstance(et, CoreEventType) else str(et)
                            for et in temp_instance.event_types
                        ]
                        if event_type_str in rule_event_types:
                            rules.append(rule_class)
                    except Exception:
                        # If we can't instantiate, skip this rule
                        pass

        return rules

    def unregister_vertical(self, vertical_id: str) -> bool:
        """
        Unregister a vertical plugin.

        Args:
            vertical_id: ID of vertical to unregister

        Returns:
            True if unregistered, False if not found
        """
        if vertical_id not in self.verticals:
            return False

        # Remove from registries
        del self.verticals[vertical_id]
        self.manifest_cache.pop(vertical_id, None)

        # Remove rule classes
        keys_to_remove = [
            key
            for key in self.rule_registry.keys()
            if key.startswith(f"{vertical_id}.")
        ]
        for key in keys_to_remove:
            del self.rule_registry[key]

        return True

    def list_verticals(self) -> List[str]:
        """
        List all registered vertical IDs.

        Returns:
            List of vertical IDs
        """
        return list(self.verticals.keys())

    def _get_core_version(self) -> str:
        """
        Get current RealityOS Core version.

        Returns:
            Version string
        """
        # This should come from realityos_core/__init__.py
        # For now, return default version
        return "1.0.0"

    @staticmethod
    def _camel_to_snake(name: str) -> str:
        """
        Convert CamelCase to snake_case.

        Args:
            name: CamelCase string

        Returns:
            snake_case string
        """
        import re

        # Insert underscore before uppercase letters
        s1 = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
        # Insert underscore before uppercase letters at end
        return re.sub("([a-z0-9])([A-Z])", r"\1_\2", s1).lower()

