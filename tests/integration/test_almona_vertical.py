"""
Test Almona vertical registration and functionality.
"""

from pathlib import Path
from datetime import datetime, timezone
import sys

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from realityos_core.vertical_registry import VerticalRegistry
from realityos_core.models.event_models import BaseEvent, CoreEventType, RealityProof


class TestAlmonaVertical:
    """Test Almona vertical plugin registration."""

    def setup_method(self):
        """Setup registry for testing."""
        self.registry = VerticalRegistry()
        manifest_path = Path(__file__).parent.parent.parent / "vertical_almona" / "manifest.json"
        self.manifest_path = manifest_path

    def test_001_almona_registration_success(self):
        """Almona vertical registers successfully."""
        print("\n[TEST 1] Almona Vertical Registration")

        # Register Almona vertical
        vertical_id = self.registry.register_vertical(self.manifest_path)

        assert vertical_id == "almona_vertical"
        assert vertical_id in self.registry.verticals

        print(f"[PASS] Almona vertical registered: {vertical_id}")
        return True

    def test_002_almona_rule_classes_loaded(self):
        """Almona rule classes are loaded correctly."""
        print("\n[TEST 2] Almona Rule Classes")

        self.registry.register_vertical(self.manifest_path)

        # Check rule classes are registered
        rule_keys = list(self.registry.rule_registry.keys())

        expected_rules = [
            "almona_vertical.AlmonaCalibrationRule",
            "almona_vertical.AlmonaAnomalyRule",
            "almona_vertical.AlmonaFreezeRule",
        ]

        for expected in expected_rules:
            assert expected in rule_keys, f"Missing rule: {expected}"

        print(f"[PASS] {len(rule_keys)} rule classes loaded")
        return True

    def test_003_almona_constitutional_compliance(self):
        """Almona rules pass constitutional compliance check."""
        print("\n[TEST 3] Constitutional Compliance")

        self.registry.register_vertical(self.manifest_path)

        # Get the vertical
        vertical = self.registry.get_vertical("almona_vertical")

        # Check constitutional compliance in manifest
        manifest = vertical.manifest
        assert manifest.constitutional_compliance["principle_1"] is True
        assert manifest.constitutional_compliance["principle_5"] is True
        assert manifest.per_vertical_secret is True

        print("[PASS] Almona vertical constitutionally compliant")
        return True

    def test_004_almona_rule_validation(self):
        """Almona rule validation works correctly."""
        print("\n[TEST 4] Rule Validation")

        self.registry.register_vertical(self.manifest_path)

        # Get calibration rule
        rule_class = self.registry.rule_registry[
            "almona_vertical.AlmonaCalibrationRule"
        ]
        rule_instance = rule_class()

        # Create a test event
        event = BaseEvent(
            event_type=CoreEventType.VERIFICATION,
            entity_id="test_profile:miter_45",
            vertical_id="almona_vertical",
            proof=RealityProof(
                verified_by="test_operator",
                timestamp=datetime.now(timezone.utc),
            ),
            payload={
                "almona_event_type": "calibration_baseline",
                "k_factor": 2.5,
                "profile_id": "profile_60",
                "joint_type": "miter_45",
                "confidence": 0.92,
            },
        )

        # Validate event
        result = rule_instance.validate_event(event)

        assert result.is_valid is True
        assert len(result.errors) == 0
        assert result.transformed_payload is not None

        print("[PASS] Almona rule validation successful")
        return True

    def test_005_almona_payload_transformation(self):
        """Almona payload transformation adds metadata."""
        print("\n[TEST 5] Payload Transformation")

        self.registry.register_vertical(self.manifest_path)

        # Get calibration rule
        rule_class = self.registry.rule_registry[
            "almona_vertical.AlmonaCalibrationRule"
        ]
        rule_instance = rule_class()

        # Test payload transformation
        original_payload = {
            "almona_event_type": "calibration_baseline",
            "k_factor": 2.5,
        }

        transformed = rule_instance.transform_payload(original_payload)

        # Check vertical metadata added
        assert "vertical_id" in transformed
        assert transformed["vertical_id"] == "almona_vertical"
        assert "rule_id" in transformed
        assert "almona_processed_at" in transformed

        # Original payload preserved
        assert transformed["almona_event_type"] == "calibration_baseline"
        assert transformed["k_factor"] == 2.5

        print("[PASS] Almona payload transformation successful")
        return True

    def test_006_almona_anomaly_rule_validation(self):
        """Almona anomaly rule validation works correctly."""
        print("\n[TEST 6] Anomaly Rule Validation")

        self.registry.register_vertical(self.manifest_path)

        # Get anomaly rule
        rule_class = self.registry.rule_registry[
            "almona_vertical.AlmonaAnomalyRule"
        ]
        rule_instance = rule_class()

        # Create a test anomaly event
        event = BaseEvent(
            event_type=CoreEventType.FAULT,
            entity_id="test_profile:miter_45",
            vertical_id="almona_vertical",
            proof=RealityProof(
                verified_by="system",
                timestamp=datetime.now(timezone.utc),
            ),
            payload={
                "almona_event_type": "calibration_anomaly",
                "anomaly_type": "drift",
                "severity": "high",
                "details": {
                    "detected_value": 2.8,
                    "expected_value": 2.5,
                },
            },
        )

        # Validate event
        result = rule_instance.validate_event(event)

        assert result.is_valid is True
        assert len(result.errors) == 0
        assert result.transformed_payload is not None
        assert "requires_human_review" in result.transformed_payload
        assert result.transformed_payload["requires_human_review"] is True

        print("[PASS] Almona anomaly rule validation successful")
        return True

    def test_007_almona_freeze_rule_validation(self):
        """Almona freeze rule validation works correctly."""
        print("\n[TEST 7] Freeze Rule Validation")

        self.registry.register_vertical(self.manifest_path)

        # Get freeze rule
        rule_class = self.registry.rule_registry[
            "almona_vertical.AlmonaFreezeRule"
        ]
        rule_instance = rule_class()

        # Create a test freeze event
        event = BaseEvent(
            event_type=CoreEventType.OFF,
            entity_id="test_profile:miter_45",
            vertical_id="almona_vertical",
            proof=RealityProof(
                verified_by="system",
                timestamp=datetime.now(timezone.utc),
            ),
            payload={
                "almona_event_type": "calibration_freeze",
                "frozen_reason": "drift_detected",
            },
        )

        # Validate event
        result = rule_instance.validate_event(event)

        assert result.is_valid is True
        assert len(result.errors) == 0
        assert result.transformed_payload is not None

        print("[PASS] Almona freeze rule validation successful")
        return True

    def test_008_almona_rule_for_event_lookup(self):
        """Test getting rules for specific event types."""
        print("\n[TEST 8] Rule Lookup by Event Type")

        self.registry.register_vertical(self.manifest_path)

        # Get rules for VERIFICATION events
        rules = self.registry.get_rule_for_event(CoreEventType.VERIFICATION)
        assert len(rules) == 1
        assert rules[0].__name__ == "AlmonaCalibrationRule"

        # Get rules for FAULT events
        rules = self.registry.get_rule_for_event(CoreEventType.FAULT)
        assert len(rules) == 1
        assert rules[0].__name__ == "AlmonaAnomalyRule"

        # Get rules for OFF events
        rules = self.registry.get_rule_for_event(CoreEventType.OFF)
        assert len(rules) == 1
        assert rules[0].__name__ == "AlmonaFreezeRule"

        print("[PASS] Rule lookup by event type successful")
        return True


def run_almona_vertical_tests():
    """Run all Almona vertical tests."""
    print("=" * 70)
    print("ALMONA VERTICAL PLUGIN - INTEGRATION TESTS")
    print("=" * 70)

    test = TestAlmonaVertical()
    test.setup_method()

    tests = [
        test.test_001_almona_registration_success,
        test.test_002_almona_rule_classes_loaded,
        test.test_003_almona_constitutional_compliance,
        test.test_004_almona_rule_validation,
        test.test_005_almona_payload_transformation,
        test.test_006_almona_anomaly_rule_validation,
        test.test_007_almona_freeze_rule_validation,
        test.test_008_almona_rule_for_event_lookup,
    ]

    passed = 0
    failed = 0

    for test_func in tests:
        try:
            success = test_func()
            if success:
                passed += 1
            else:
                failed += 1
                print(f"[FAIL] {test_func.__name__}")
        except Exception as e:
            failed += 1
            print(f"[FAIL] {test_func.__name__} - {str(e)}")
            import traceback
            traceback.print_exc()

    print("\n" + "=" * 70)
    print(f"RESULTS: {passed}/{len(tests)} tests passed")

    if failed == 0:
        print("[SUCCESS] Almona vertical plugin ready")
        return True
    else:
        print(f"[FAILED] {failed} tests failed")
        return False


if __name__ == "__main__":
    success = run_almona_vertical_tests()
    exit(0 if success else 1)

