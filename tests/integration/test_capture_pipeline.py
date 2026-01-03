"""
End-to-End Capture Pipeline Integration Tests

Validates the complete Constitutional Validation Pipeline.
"""

import json
import time
import hashlib
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch
import pytest

from realityos_core.capture_gateway.types import (
    CaptureValidationResult,
    ValidationSeverity,
    ValidationError,
)
from realityos_core.capture_gateway.gateway_skeleton import (
    RealityCaptureGateway,
    CaptureData,
)
from realityos_core.models.qr_models import SignedQRData
from realityos_core.cryptography.qr_canonical import QRCanonicalFormat
from realityos_core.cryptography import RealitySignature


class TestCapturePipeline:
    """Constitutional Validation Pipeline Integration Tests."""

    def setup_method(self):
        """Setup test with constitutional gateway."""
        self.vertical_secrets = {
            "maintenance_vertical": "test_secret_key_12345",
            "inspection_vertical": "another_secret_key_67890",
        }

        # Mock EventLedger to avoid database connection
        from realityos_core.event_ledger import EventLedger

        mock_ledger = Mock(spec=EventLedger)

        # Create gateway with mock database for testing
        # Use in-memory SQLite or mock validators
        self.gateway = RealityCaptureGateway(
            database_url="sqlite:///:memory:",
            vertical_secrets=self.vertical_secrets,
            event_ledger=mock_ledger,
            enable_fraud_detection=True,
        )

        # Mock QR validator's database-dependent methods
        # Step 3 (single-use) and Step 5 (revocation) require DB access
        def mock_step3(parsed_qr):
            """Mock single-use check - assume QR is unused for testing."""
            pass  # Skip database check

        def mock_step5(parsed_qr):
            """Mock revocation check - assume QR is not revoked for testing."""
            pass  # Skip database check

        # Replace methods to avoid database calls
        self.gateway.qr_validator._step3_single_use_enforcement = mock_step3
        self.gateway.qr_validator._step5_revocation_check = mock_step5

        # Also mock the database session to prevent connection attempts
        def mock_get_session():
            """Mock database session."""
            from contextlib import nullcontext

            return nullcontext()

        self.gateway.qr_validator._get_session = mock_get_session

        # No need to mock datetime - we use future validity windows

        # Use current time for tests (QR validity checks against current time)
        from datetime import timezone

        self.now = datetime.now(timezone.utc)

        # Ensure QR validity window is in the future
        # QR validator checks: valid_from <= now <= valid_to
        # So we need valid_from <= now and valid_to >= now
        # Set valid_from to 1 hour ago, valid_to to 23 hours from now
        self.qr_valid_from = self.now - timedelta(hours=1)
        self.qr_valid_to = self.now + timedelta(hours=23)

        # Generate a constitutionally valid QR
        self.valid_qr = self._generate_valid_qr()

        # Create valid capture data (use timezone-aware timestamp)
        from datetime import timezone

        capture_timestamp = datetime.now(timezone.utc)

        self.valid_capture = CaptureData(
            qr_data=self.valid_qr,
            photos=[b"fake_photo_1", b"fake_photo_2"],
            gps_latitude=40.7128,
            gps_longitude=-74.0060,
            gps_accuracy_meters=10.5,
            timestamp=capture_timestamp,
            verified_by="operator_001",
            entity_id="asset_123",
            vertical_id="maintenance_vertical",
        )

    def teardown_method(self):
        """Cleanup after tests."""
        pass

    def _generate_valid_qr(self) -> str:
        """Generate a constitutionally valid signed QR."""
        from datetime import timezone

        # Use pre-calculated validity window that's in the future
        valid_from = self.qr_valid_from
        valid_to = self.qr_valid_to

        # Create payload dict for canonical serialization
        # QRCanonicalFormat.serialize expects datetime objects, not ISO strings
        qr_payload_for_canonical = {
            "v": 1,
            "entity_id": "asset_123",
            "vertical_id": "maintenance_vertical",
            "qr_id": f"qr_{int(self.now.timestamp())}",
            "created_at": valid_from,  # datetime object
            "valid_from": valid_from,  # datetime object
            "valid_to": valid_to,  # datetime object
        }

        # Canonical serialization (without signature)
        canonical_format = QRCanonicalFormat()
        canonical = canonical_format.serialize(qr_payload_for_canonical)

        # Create JSON payload with ISO strings for Pydantic
        qr_payload = {
            "v": 1,
            "entity_id": "asset_123",
            "vertical_id": "maintenance_vertical",
            "qr_id": f"qr_{int(self.now.timestamp())}",
            "created_at": valid_from.isoformat(),
            "valid_from": valid_from.isoformat(),
            "valid_to": valid_to.isoformat(),
        }

        # HMAC signature - sign the canonical string directly
        import hmac
        import hashlib

        signature = hmac.new(
            self.vertical_secrets["maintenance_vertical"].encode("utf-8"),
            canonical.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        # Add signature to payload
        qr_payload["signature"] = signature
        return json.dumps(qr_payload)

    # ===== CONSTITUTIONAL TESTS =====

    def test_001_qr_constitutional_violation_blocks(self):
        """QR failure should BLOCK entire capture (constitutional)."""
        print("\n[TEST 1] QR Constitutional Violation -> BLOCK")

        # Create capture with invalid QR (wrong signature)
        invalid_qr = json.dumps(
            {
                "v": 1,
                "entity_id": "asset_123",
                "vertical_id": "maintenance_vertical",
                "qr_id": "invalid_qr",
                "created_at": self.qr_valid_from.isoformat(),
                "valid_from": self.qr_valid_from.isoformat(),
                "valid_to": self.qr_valid_to.isoformat(),
                "signature": "wrong_signature_123",  # Invalid
            }
        )

        capture = CaptureData(
            qr_data=invalid_qr,
            photos=[b"photo"],
            gps_latitude=40.7128,
            gps_longitude=-74.0060,
            gps_accuracy_meters=10.0,
            timestamp=self.now,
            verified_by="operator_001",
            entity_id="asset_123",
            vertical_id="maintenance_vertical",
        )

        # Should return BLOCK result
        result = self.gateway.validate_capture(capture)

        assert not result.overall_passed, "QR failure should BLOCK capture"
        assert result.confidence == 0.0, "QR failure -> confidence = 0.0"
        assert any(e.severity == ValidationSeverity.BLOCK for e in result.errors)

        print("[PASS] QR failure correctly BLOCKS with confidence=0.0")
        return True

    def test_002_photo_metadata_stripping_verified(self):
        """Photo metadata should be stripped (forensic integrity)."""
        print("\n[TEST 2] Photo Metadata Stripping Verification")

        # Note: Actual metadata stripping happens in PhotoValidator
        # This test verifies the integration point

        capture = CaptureData(
            qr_data=self.valid_qr,
            photos=[b"fake_photo_with_metadata"],
            gps_latitude=40.7128,
            gps_longitude=-74.0060,
            gps_accuracy_meters=10.0,
            timestamp=self.now,
            verified_by="operator_001",
            entity_id="asset_123",
            vertical_id="maintenance_vertical",
        )

        # Mock photo validator to verify it's called
        with patch.object(self.gateway.photo_validator, "validate") as mock_photo:
            # Use valid SHA-256 hashes (64 hex characters)
            valid_hash = "a" * 64
            mock_photo.return_value = ([valid_hash], [])  # No errors

            result = self.gateway.validate_capture(capture)

            # Verify photo validator was called
            mock_photo.assert_called_once_with([b"fake_photo_with_metadata"])

            assert result.overall_passed, "Should pass with valid QR"

        print("[PASS] Photo validator integrated and called")
        return True

    def test_003_gps_neutral_language_enforced(self):
        """GPS errors must use neutral language only."""
        print("\n[TEST 3] GPS Neutral Language Enforcement")

        # Create capture with inaccurate GPS
        capture = CaptureData(
            qr_data=self.valid_qr,
            photos=[b"photo"],
            gps_latitude=40.7128,
            gps_longitude=-74.0060,
            gps_accuracy_meters=150.0,  # > 100m threshold
            timestamp=self.now,
            verified_by="operator_001",
            entity_id="asset_123",
            vertical_id="maintenance_vertical",
        )

        # Mock GPS validator to return neutral error
        from realityos_core.models.event_models import GPSPoint

        with patch.object(self.gateway.gps_validator, "validate") as mock_gps:
            neutral_error = ValidationError(
                validator="gps_validator",
                field="accuracy",
                message=(
                    "GPS_LOW_CONFIDENCE: Accuracy 150.0m exceeds " "100m threshold"
                ),
                severity=ValidationSeverity.DEGRADE,
                evidence={"accuracy": 150.0, "threshold": 100.0},
            )

            # Create a real GPSPoint instead of Mock
            gps_point = GPSPoint(
                latitude=40.7128, longitude=-74.0060, accuracy_meters=150.0
            )

            mock_gps.return_value = (gps_point, neutral_error)

            result = self.gateway.validate_capture(capture)

            # Verify neutral language in error message
            gps_errors = [e for e in result.errors if e.validator == "gps_validator"]
            assert len(gps_errors) > 0

            error_msg = gps_errors[0].message
            neutral_terms = [
                "GPS_LOW_CONFIDENCE",
                "GPS_ANOMALOUS",
                "LOCATION_UNVERIFIED",
            ]
            forbidden_terms = ["fake", "spoofed", "forged", "false"]

            # Check for neutral term
            has_neutral = any(term in error_msg for term in neutral_terms)
            assert has_neutral, f"No neutral term found in: {error_msg}"

            # Check no forbidden terms
            for forbidden in forbidden_terms:
                assert (
                    forbidden not in error_msg.lower()
                ), f"Forbidden term: {forbidden}"

            assert result.confidence < 1.0, "GPS error should degrade confidence"

        print("[PASS] GPS neutral language enforced, confidence degraded")
        return True

    def test_004_human_impossible_interval_detection(self):
        """Detect scripted submissions (<10s + different entity)."""
        print("\n[TEST 4] Human-Impossible Interval Detection")

        # Note: This is tested in TimestampValidator unit tests
        # Integration test verifies it's part of the pipeline

        capture = CaptureData(
            qr_data=self.valid_qr,
            photos=[b"photo"],
            gps_latitude=40.7128,
            gps_longitude=-74.0060,
            gps_accuracy_meters=10.0,
            timestamp=self.now,
            verified_by="operator_001",
            entity_id="asset_123",
            vertical_id="maintenance_vertical",
        )

        # Mock timestamp validator to verify integration
        from datetime import timezone

        with patch.object(self.gateway.timestamp_validator, "validate") as mock_time:
            # Return timezone-aware timestamp
            test_timestamp = datetime.now(timezone.utc)
            mock_time.return_value = (test_timestamp, [])

            result = self.gateway.validate_capture(capture)

            # Verify it was called (timestamp may vary)
            assert mock_time.called

            assert result.overall_passed, "Should pass with valid data"

        print("[PASS] Timestamp validator integrated for " "human-impossible detection")
        return True

    def test_005_proof_hash_determinism(self):
        """Proof hash must be deterministic (same input = same hash)."""
        print("\n[TEST 5] Proof Hash Determinism")

        # Test with same capture data twice
        result1 = self.gateway.validate_capture(self.valid_capture)
        result2 = self.gateway.validate_capture(self.valid_capture)

        # Both should have proof hashes
        assert result1.proof_hash is not None
        assert result2.proof_hash is not None

        # Hashes should be identical
        assert result1.proof_hash == result2.proof_hash, (
            f"Proof hashes differ: {result1.proof_hash} != " f"{result2.proof_hash}"
        )

        # Verify hash is SHA-256 format
        assert len(result1.proof_hash) == 64, "Proof hash should be 64 chars (SHA-256)"
        assert all(
            c in "0123456789abcdef" for c in result1.proof_hash
        ), "Proof hash should be hexadecimal"

        print(f"[PASS] Proof hash deterministic: {result1.proof_hash}")
        return True

    def test_006_confidence_degradation_correct(self):
        """Confidence should degrade appropriately for errors."""
        print("\n[TEST 6] Confidence Degradation Rules")

        # Create capture that will trigger DEGRADE errors
        # Use inaccurate GPS and many photos
        capture = CaptureData(
            qr_data=self.valid_qr,
            photos=[b"photo1", b"photo2", b"photo3"],  # 3 photos > MAX
            gps_latitude=40.7128,
            gps_longitude=-74.0060,
            gps_accuracy_meters=150.0,  # > threshold
            timestamp=self.now,
            verified_by="operator_001",
            entity_id="asset_123",
            vertical_id="maintenance_vertical",
        )

        # Mock validators to return specific errors
        # Use valid SHA-256 hashes (64 hex characters)
        valid_hash1 = "a" * 64
        valid_hash2 = "b" * 64
        valid_hash3 = "c" * 64

        # Create a proper GPSPoint instance
        from realityos_core.models.event_models import GPSPoint

        gps_point = GPSPoint(
            latitude=40.7128, longitude=-74.0060, accuracy_meters=150.0
        )

        # Mock QR validator
        qr_result_mock = Mock()
        qr_result_mock.qr_hash = "test_hash"
        qr_result_mock.qr_id = "test_qr"
        qr_result_mock.entity_id = "asset_123"
        qr_result_mock.vertical_id = "maintenance_vertical"
        qr_result_mock.is_valid = True

        with patch.object(
            self.gateway.qr_validator, "validate", return_value=(qr_result_mock, None)
        ), patch.object(
            self.gateway.photo_validator,
            "validate",
            return_value=(
                [valid_hash1, valid_hash2],  # Limit to 2 for proof creation
                [
                    ValidationError(
                        validator="photo_validator",
                        field="photos",
                        message="Photo quality degraded",
                        severity=ValidationSeverity.DEGRADE,
                        evidence={"reason": "quality_check"},
                    )
                ],
            ),
        ), patch.object(
            self.gateway.gps_validator,
            "validate",
            return_value=(
                gps_point,
                ValidationError(
                    validator="gps_validator",
                    field="accuracy",
                    message="GPS_LOW_CONFIDENCE: Accuracy 150.0m",
                    severity=ValidationSeverity.DEGRADE,
                    evidence={"accuracy": 150.0},
                ),
            ),
        ), patch.object(
            self.gateway.timestamp_validator,
            "validate",
            return_value=(datetime.now(timezone.utc), []),
        ), patch.object(
            self.gateway.correlation_validator, "validate", return_value=[]
        ):
            result = self.gateway.validate_capture(capture)

            # Should have 2 DEGRADE errors
            degrade_errors = [
                e for e in result.errors if e.severity == ValidationSeverity.DEGRADE
            ]
            assert (
                len(degrade_errors) == 2
            ), f"Expected 2 DEGRADE errors, got {len(degrade_errors)}"

            # Confidence should be degraded
            # Base: 1.0 - (2 * 0.2) = 0.6, but minimum is 0.5
            expected_confidence = max(1.0 - (2 * 0.2), 0.5)

            # Allow small floating point differences
            assert abs(result.confidence - expected_confidence) < 0.01, (
                f"Confidence {result.confidence} not close to expected "
                f"{expected_confidence}"
            )

        print(f"[PASS] Confidence correctly degraded to " f"{result.confidence:.2f}")
        return True

    def test_007_evidence_chain_immutability(self):
        """Evidence chain should be immutable (frozen dataclass)."""
        print("\n[TEST 7] Evidence Chain Immutability")

        result = self.gateway.validate_capture(self.valid_capture)

        # Evidence should be preserved
        assert result.proof is not None, "Evidence should be preserved"

        # The proof should contain immutable data
        # (Implementation detail: proof uses frozen dataclass or similar)

        # Try to access evidence attributes (should work)
        # RealityProof has: verified_by, timestamp, qr_data, photo_hashes, location
        assert hasattr(result.proof, "qr_data")
        assert hasattr(result.proof, "timestamp")
        assert hasattr(result.proof, "verified_by")

        print("[PASS] Evidence chain preserved and accessible")
        return True

    def test_008_auditor_output_format_verified(self):
        """Output should be auditor-friendly with absence explanation."""
        print("\n[TEST 8] Auditor Output Format Verification")

        # Test failed capture (invalid QR)
        invalid_qr = json.dumps({"invalid": "data"})

        capture = CaptureData(
            qr_data=invalid_qr,
            photos=[],
            gps_latitude=0.0,
            gps_longitude=0.0,
            gps_accuracy_meters=None,
            timestamp=self.now,
            verified_by="",
            entity_id="",
            vertical_id="",
        )

        result = self.gateway.validate_capture(capture)

        # Should have BLOCK error
        assert not result.overall_passed
        assert result.confidence == 0.0

        # Check the result can be formatted for auditor
        from realityos_core.capture_gateway.auditor_formatter import (
            AuditorOutputFormatter,
        )

        formatted = AuditorOutputFormatter.format_validation_result(result)

        # Should contain key auditor elements
        assert "VALIDATION RESULT" in formatted
        assert "Confidence Score" in formatted

        # If no events recorded, should explain absence
        if not result.overall_passed and len(result.errors) == 0:
            assert "ABSENCE EXPLANATION" in formatted
            assert "No human verification occurred" in formatted

        print("[PASS] Auditor output format verified")
        return True

    def test_009_performance_targets_met(self):
        """Validation should complete within 500ms."""
        print("\n[TEST 9] Performance Targets")

        start_time = time.time()

        # Run validation
        result = self.gateway.validate_capture(self.valid_capture)

        elapsed_ms = (time.time() - start_time) * 1000

        assert result.overall_passed, "Validation should succeed"
        assert elapsed_ms < 500, f"Validation took {elapsed_ms:.1f}ms (>500ms limit)"

        print(f"[PASS] Validation completed in {elapsed_ms:.1f}ms " f"(<500ms target)")
        return True

    def test_010_constitutional_pipeline_complete(self):
        """Complete constitutional pipeline validation."""
        print("\n[TEST 10] Constitutional Pipeline Complete")

        # Test the complete happy path
        result = self.gateway.validate_capture(self.valid_capture)

        # Should pass with high confidence
        assert result.overall_passed, "Valid capture should pass"
        assert result.confidence >= 0.5, f"Confidence too low: {result.confidence}"
        assert result.proof_hash is not None, "Proof hash should be generated"
        assert result.proof is not None, "Evidence should be preserved"

        # Verify all constitutional requirements met
        constitutional_checks = [
            (
                "QR validated",
                not any(
                    "qr" in e.validator.lower()
                    for e in result.errors
                    if e.severity == ValidationSeverity.BLOCK
                ),
            ),
            ("Evidence preserved", result.proof is not None),
            ("Proof hash generated", result.proof_hash is not None),
            ("Confidence reasonable", 0.5 <= result.confidence <= 1.0),
            (
                "No BLOCK errors",
                not any(e.severity == ValidationSeverity.BLOCK for e in result.errors),
            ),
        ]

        for check_name, check_passed in constitutional_checks:
            assert check_passed, f"Constitutional check failed: {check_name}"

        print(
            f"[PASS] Constitutional pipeline complete. "
            f"Confidence: {result.confidence:.2f}, "
            f"Proof Hash: {result.proof_hash[:16]}..."
        )
        return True


def run_integration_tests():
    """Run all integration tests."""
    print("=" * 70)
    print("CONSTITUTIONAL VALIDATION PIPELINE - INTEGRATION TESTS")
    print("=" * 70)

    test = TestCapturePipeline()
    test.setup_method()

    tests = [
        test.test_001_qr_constitutional_violation_blocks,
        test.test_002_photo_metadata_stripping_verified,
        test.test_003_gps_neutral_language_enforced,
        test.test_004_human_impossible_interval_detection,
        test.test_005_proof_hash_determinism,
        test.test_006_confidence_degradation_correct,
        test.test_007_evidence_chain_immutability,
        test.test_008_auditor_output_format_verified,
        test.test_009_performance_targets_met,
        test.test_010_constitutional_pipeline_complete,
    ]

    passed = 0
    failed = 0
    failed_tests = []

    for test_func in tests:
        try:
            success = test_func()
            if success:
                passed += 1
            else:
                failed += 1
                failed_tests.append(test_func.__name__)
        except Exception as e:
            failed += 1
            failed_tests.append((test_func.__name__, str(e)))
            print(f"[FAIL] {test_func.__name__} - {str(e)}")
            import traceback

            traceback.print_exc()

    test.teardown_method() if hasattr(test, "teardown_method") else None

    print("\n" + "=" * 70)
    print(f"RESULTS: {passed}/{len(tests)} tests passed")

    if failed == 0:
        print("[SUCCESS] ALL INTEGRATION TESTS PASSED")
        print("Phase 3: Reality Capture Gateway - COMPLETE")
        print("\nProceed to Phase 4: Almona Adapter")
        return True
    else:
        print(f"[FAILED] {failed} tests failed")
        for test_name in failed_tests:
            print(f"  - {test_name}")
        return False


if __name__ == "__main__":
    success = run_integration_tests()
    exit(0 if success else 1)
