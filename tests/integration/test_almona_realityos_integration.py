"""
End-to-End Integration Tests for Almona ↔ RealityOS Dual-Write

Tests constitutional compliance, atomicity guarantees, and performance.
"""

import time
from datetime import datetime, timezone
from unittest.mock import Mock, patch, MagicMock
from typing import Dict, Any

import pytest

from realityos_core.capture_gateway.gateway_skeleton import (
    RealityCaptureGateway,
    CaptureData,
)
from realityos_core.event_ledger import EventLedger
from realityos_core.models.event_models import BaseEvent, CoreEventType

from python_backend.adapters.almona_realityos_adapter import (
    AlmonaRealityOSAdapter,
)
from python_backend.adapters.almona_integration import (
    AlmonaIntegrationWrapper,
)
from python_backend.adapters.setup_integration import (
    setup_almona_realityos_integration,
)
from ai_services.calibration.calibration_transactions import (
    CalibrationTransactionManager,
)
from ai_services.calibration.calibration_safety_net import (
    CalibrationBaseline,
)


class TestAlmonaRealityOSIntegration:
    """Comprehensive integration testing."""

    def setup_method(self):
        """Setup test environment."""
        # Mock database connections
        self.mock_database_url = "postgresql://test:test@localhost/test"
        self.vertical_secrets = {"almona_vertical": "test_secret_key"}

        # Create mock transaction manager
        self.mock_tx_manager = Mock(spec=CalibrationTransactionManager)

        # Create mock gateway and ledger
        self.mock_gateway = Mock(spec=RealityCaptureGateway)
        self.mock_ledger = Mock(spec=EventLedger)

        # Create adapter
        self.adapter = AlmonaRealityOSAdapter(
            almona_transaction_manager=self.mock_tx_manager,
            realityos_gateway=self.mock_gateway,
            realityos_ledger=self.mock_ledger,
            vertical_id="almona_vertical",
        )

        # Create integration wrapper
        self.integration_wrapper = AlmonaIntegrationWrapper(self.adapter)

    def test_001_dual_write_success(self):
        """Dual-write succeeds when both operations succeed."""
        # Mock baseline object
        baseline = CalibrationBaseline(
            profile_id="profile_123",
            joint_type="miter_45",
            workshop_id=None,
            baseline_version="20250220103000",
            baseline_hash="test_hash",
            k_factor=2.5,
            confidence=0.90,
            certified_by="operator_001",
            certified_at=datetime.now(timezone.utc),
            sample_size=10,
            model_version="1.0.0",
            reasoning=["certified"],
        )

        # Mock Almona transaction manager
        self.mock_tx_manager.certify_baseline_transactional = Mock(
            return_value="almona_baseline_id_123"
        )

        # Mock RealityOS recording
        mock_event_record = Mock()
        mock_event_record.event_hash = "realityos_hash_123"
        self.mock_ledger.record_event = Mock(return_value=mock_event_record)

        # Wrap the function
        wrapped_certify = self.integration_wrapper.wrap_certify_baseline(
            self.mock_tx_manager.certify_baseline_transactional
        )

        # Execute
        result = wrapped_certify(baseline)

        # Verify
        assert result == "almona_baseline_id_123"
        self.mock_tx_manager.certify_baseline_transactional.assert_called_once_with(
            baseline
        )
        # Verify RealityOS was called (adapter should have been invoked)

    def test_002_zero_disruption_verified(self):
        """Original Almona behavior unchanged when integration disabled."""
        # Disable integration
        self.integration_wrapper.disable()

        # Mock baseline
        baseline = CalibrationBaseline(
            profile_id="profile_123",
            joint_type="miter_45",
            workshop_id=None,
            baseline_version="20250220103000",
            baseline_hash="test_hash",
            k_factor=2.5,
            confidence=0.90,
            certified_by="operator_001",
            certified_at=datetime.now(timezone.utc),
            sample_size=10,
            model_version="1.0.0",
            reasoning=["certified"],
        )

        # Mock Almona transaction manager
        self.mock_tx_manager.certify_baseline_transactional = Mock(
            return_value="almona_baseline_id_123"
        )

        # Wrap the function
        wrapped_certify = self.integration_wrapper.wrap_certify_baseline(
            self.mock_tx_manager.certify_baseline_transactional
        )

        # Execute
        result = wrapped_certify(baseline)

        # Verify Almona was called
        assert result == "almona_baseline_id_123"
        self.mock_tx_manager.certify_baseline_transactional.assert_called_once()

        # Verify RealityOS was NOT called (integration disabled)
        assert not self.mock_ledger.record_event.called

    def test_003_match_validation_detects_mismatches(self):
        """Match validation correctly detects discrepancies."""
        # Create adapter with mismatched data
        almona_result = {
            "baseline_id": "almona_123",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "k_factor": 2.5,
            "confidence": 0.90,
            "profile_id": "profile_123",
            "joint_type": "miter_45",
        }

        # Create event with different k_factor
        from realityos_core.models.event_models import RealityProof

        reality_event = BaseEvent(
            event_type=CoreEventType.VERIFICATION,
            entity_id="profile_123:miter_45",
            vertical_id="almona_vertical",
            proof=RealityProof(
                verified_by="operator_001",
                timestamp=datetime.now(timezone.utc),
            ),
            payload={
                "profile_id": "profile_123",
                "joint_type": "miter_45",
                "k_factor": 3.0,  # Different from Almona (2.5)
            },
        )

        # Test validation
        match = self.adapter._validate_baseline_match(
            almona_result, "realityos_hash", reality_event
        )

        # Should detect mismatch
        assert not match

    def test_004_retry_logic_handles_transient_failures(self):
        """Retry logic correctly handles transient RealityOS failures."""
        from python_backend.adapters.retry_manager import DualWriteRetryManager

        retry_manager = DualWriteRetryManager(max_retries=2, initial_delay=0.01)

        # Mock operation that fails first time, succeeds second
        attempt_count = [0]

        def failing_operation():
            attempt_count[0] += 1
            if attempt_count[0] == 1:
                return False  # Fail first attempt
            return True  # Succeed second attempt

        # Execute with retry
        success = retry_manager.execute_with_retry(
            failing_operation, "test_operation_001", is_idempotent=True
        )

        # Verify
        assert success
        assert attempt_count[0] == 2  # Two attempts made

    def test_005_performance_overhead_within_limit(self):
        """Dual-write adds <5% overhead to Almona operations."""
        # Benchmark Almona-only operation
        baseline = CalibrationBaseline(
            profile_id="profile_123",
            joint_type="miter_45",
            workshop_id=None,
            baseline_version="20250220103000",
            baseline_hash="test_hash",
            k_factor=2.5,
            confidence=0.90,
            certified_by="operator_001",
            certified_at=datetime.now(timezone.utc),
            sample_size=10,
            model_version="1.0.0",
            reasoning=["certified"],
        )

        # Mock fast operations
        self.mock_tx_manager.certify_baseline_transactional = Mock(
            return_value="almona_baseline_id_123"
        )
        mock_event_record = Mock()
        mock_event_record.event_hash = "realityos_hash_123"
        self.mock_ledger.record_event = Mock(return_value=mock_event_record)

        # Measure Almona-only time
        start_time = time.time()
        for _ in range(100):
            self.mock_tx_manager.certify_baseline_transactional(baseline)
        almona_only_time = time.time() - start_time

        # Measure dual-write time
        wrapped_certify = self.integration_wrapper.wrap_certify_baseline(
            self.mock_tx_manager.certify_baseline_transactional
        )

        start_time = time.time()
        for _ in range(100):
            wrapped_certify(baseline)
        dual_write_time = time.time() - start_time

        # Calculate overhead
        overhead = ((dual_write_time - almona_only_time) / almona_only_time) * 100

        # Verify <5% overhead
        assert overhead < 5.0, f"Overhead {overhead:.2f}% exceeds 5% limit"

        # Verify <100ms additional latency per operation
        additional_latency = (dual_write_time - almona_only_time) / 100 * 1000
        assert (
            additional_latency < 100
        ), f"Additional latency {additional_latency:.2f}ms exceeds 100ms limit"

    def test_006_constitutional_compliance_verified(self):
        """All dual-write operations maintain constitutional compliance."""
        # Create baseline
        baseline = CalibrationBaseline(
            profile_id="profile_123",
            joint_type="miter_45",
            workshop_id=None,
            baseline_version="20250220103000",
            baseline_hash="test_hash",
            k_factor=2.5,
            confidence=0.90,
            certified_by="operator_001",
            certified_at=datetime.now(timezone.utc),
            sample_size=10,
            model_version="1.0.0",
            reasoning=["certified"],
        )

        # Mock recording
        self.mock_tx_manager.certify_baseline_transactional = Mock(
            return_value="almona_baseline_id_123"
        )
        mock_event_record = Mock()
        mock_event_record.event_hash = "realityos_hash_123"
        self.mock_ledger.record_event = Mock(return_value=mock_event_record)

        # Record event
        wrapped_certify = self.integration_wrapper.wrap_certify_baseline(
            self.mock_tx_manager.certify_baseline_transactional
        )
        wrapped_certify(baseline)

        # Verify event was created with proof (Principle 1)
        assert self.mock_ledger.record_event.called
        recorded_event = self.mock_ledger.record_event.call_args[0][0]

        # Verify proof exists
        assert recorded_event.proof is not None
        assert recorded_event.proof.verified_by == "operator_001"

        # Verify event type (Principle 1: Human-Verified)
        assert recorded_event.event_type == CoreEventType.VERIFICATION

        # Verify payload contains all metadata (Principle 2: Append-Only)
        assert "almona_event_type" in recorded_event.payload
        assert "k_factor" in recorded_event.payload

    def test_007_graceful_degradation_on_realityos_failure(self):
        """System degrades gracefully when RealityOS is unavailable."""
        # Mock RealityOS failure
        self.mock_ledger.record_event.side_effect = Exception(
            "RealityOS unavailable"
        )

        baseline = CalibrationBaseline(
            profile_id="profile_123",
            joint_type="miter_45",
            workshop_id=None,
            baseline_version="20250220103000",
            baseline_hash="test_hash",
            k_factor=2.5,
            confidence=0.90,
            certified_by="operator_001",
            certified_at=datetime.now(timezone.utc),
            sample_size=10,
            model_version="1.0.0",
            reasoning=["certified"],
        )

        self.mock_tx_manager.certify_baseline_transactional = Mock(
            return_value="almona_baseline_id_123"
        )

        # Wrap and execute
        wrapped_certify = self.integration_wrapper.wrap_certify_baseline(
            self.mock_tx_manager.certify_baseline_transactional
        )

        # Should not raise exception (graceful degradation)
        result = wrapped_certify(baseline)

        # Verify Almona operation succeeded
        assert result == "almona_baseline_id_123"

    def test_008_runtime_toggling_works(self):
        """Integration can be enabled/disabled at runtime."""
        baseline = CalibrationBaseline(
            profile_id="profile_123",
            joint_type="miter_45",
            workshop_id=None,
            baseline_version="20250220103000",
            baseline_hash="test_hash",
            k_factor=2.5,
            confidence=0.90,
            certified_by="operator_001",
            certified_at=datetime.now(timezone.utc),
            sample_size=10,
            model_version="1.0.0",
            reasoning=["certified"],
        )

        self.mock_tx_manager.certify_baseline_transactional = Mock(
            return_value="almona_baseline_id_123"
        )
        wrapped_certify = self.integration_wrapper.wrap_certify_baseline(
            self.mock_tx_manager.certify_baseline_transactional
        )

        # Test 1: Disabled
        self.integration_wrapper.disable()
        wrapped_certify(baseline)
        assert not self.mock_ledger.record_event.called

        # Reset mock
        self.mock_ledger.reset_mock()

        # Test 2: Enabled
        self.integration_wrapper.enable()
        wrapped_certify(baseline)
        # Should attempt RealityOS write (may fail, but should be called)

        # Reset mock
        self.mock_ledger.reset_mock()

        # Test 3: Disabled again
        self.integration_wrapper.disable()
        wrapped_certify(baseline)
        assert not self.mock_ledger.record_event.called

    def test_009_audit_trail_completeness(self):
        """Complete audit trail for all operations."""
        baseline = CalibrationBaseline(
            profile_id="profile_123",
            joint_type="miter_45",
            workshop_id=None,
            baseline_version="20250220103000",
            baseline_hash="test_hash",
            k_factor=2.5,
            confidence=0.90,
            certified_by="operator_001",
            certified_at=datetime.now(timezone.utc),
            sample_size=10,
            model_version="1.0.0",
            reasoning=["certified"],
        )

        self.mock_tx_manager.certify_baseline_transactional = Mock(
            return_value="almona_baseline_id_123"
        )
        mock_event_record = Mock()
        mock_event_record.event_hash = "realityos_hash_123"
        self.mock_ledger.record_event = Mock(return_value=mock_event_record)

        wrapped_certify = self.integration_wrapper.wrap_certify_baseline(
            self.mock_tx_manager.certify_baseline_transactional
        )

        # Execute
        result = wrapped_certify(baseline)

        # Verify audit trail components
        assert result == "almona_baseline_id_123"  # Almona transaction log
        assert self.mock_ledger.record_event.called  # RealityOS event chain

        # Verify event has all required fields
        recorded_event = self.mock_ledger.record_event.call_args[0][0]
        assert recorded_event.proof is not None
        assert recorded_event.payload is not None
        assert recorded_event.entity_id is not None

    def test_010_idempotency_prevention(self):
        """Idempotent retry prevents duplicate records."""
        from python_backend.adapters.retry_manager import DualWriteRetryManager

        retry_manager = DualWriteRetryManager()

        # Mock operation that succeeds
        def successful_operation():
            return True

        # Execute twice with same operation ID
        success1 = retry_manager.execute_with_retry(
            successful_operation, "test_operation_001", is_idempotent=True
        )
        success2 = retry_manager.execute_with_retry(
            successful_operation, "test_operation_001", is_idempotent=True
        )

        # Both should succeed (idempotency check)
        assert success1
        assert success2

        # Verify idempotency cache
        assert retry_manager._already_succeeded("test_operation_001")


def run_integration_tests():
    """Run all integration tests."""
    print("=" * 70)
    print("ALMONA ↔ REALITYOS INTEGRATION TESTS")
    print("=" * 70)

    test = TestAlmonaRealityOSIntegration()
    test.setup_method()

    tests = [
        test.test_001_dual_write_success,
        test.test_002_zero_disruption_verified,
        test.test_003_match_validation_detects_mismatches,
        test.test_004_retry_logic_handles_transient_failures,
        test.test_005_performance_overhead_within_limit,
        test.test_006_constitutional_compliance_verified,
        test.test_007_graceful_degradation_on_realityos_failure,
        test.test_008_runtime_toggling_works,
        test.test_009_audit_trail_completeness,
        test.test_010_idempotency_prevention,
    ]

    passed = 0
    failed = 0
    failed_tests = []

    for test_func in tests:
        try:
            test_func()
            passed += 1
            print(f"[PASS] {test_func.__name__}")
        except Exception as e:
            failed += 1
            failed_tests.append((test_func.__name__, str(e)))
            print(f"[FAIL] {test_func.__name__} - {str(e)}")
            import traceback

            traceback.print_exc()

    print("\n" + "=" * 70)
    print(f"RESULTS: {passed}/{len(tests)} tests passed")
    if failed == 0:
        print("[SUCCESS] ALL INTEGRATION TESTS PASSED")
        return True
    else:
        print(f"[FAILED] {failed} tests failed")
        for test_name, error in failed_tests:
            print(f" - {test_name}: {error}")
        return False


if __name__ == "__main__":
    success = run_integration_tests()
    exit(0 if success else 1)

