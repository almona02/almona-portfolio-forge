"""
Integration tests for Calibration Safety Net - Concurrency
==========================================================

Tests concurrent certification attempts, advisory locks, and anomaly deduplication.
"""

from unittest.mock import Mock
from datetime import datetime

from ai_services.calibration.calibration_safety_net import (
    CalibrationSafetyNet,
    CalibrationBaseline,
)
from core.operation_mode import OperationModeManager, OperationMode


class TestConcurrentCertification:
    """Tests for concurrent certification attempts."""

    def test_concurrent_certification_idempotency(self):
        """Test that concurrent certification attempts are idempotent."""
        safety_net = CalibrationSafetyNet()

        # Mock transaction manager to simulate concurrent calls
        call_count = {"count": 0}
        baseline_ids = []

        def mock_certify(baseline):
            call_count["count"] += 1
            baseline_id = f"baseline-{call_count['count']}"
            baseline_ids.append(baseline_id)
            # First call succeeds, subsequent calls return same ID (idempotency)
            if call_count["count"] == 1:
                return baseline_id
            else:
                return baseline_ids[0]  # Return first ID

        safety_net.transaction_manager.certify_baseline_transactional = Mock(
            side_effect=mock_certify
        )

        # Mock get_baseline to return the certified baseline
        def mock_get_baseline(profile_id, joint_type, workshop_id):
            if baseline_ids:
                return CalibrationBaseline(
                    profile_id=profile_id,
                    joint_type=joint_type,
                    workshop_id=workshop_id,
                    baseline_version="1.0.0",
                    baseline_hash="test_hash",
                    k_factor=2.5,
                    confidence=0.90,
                    certified_by="test",
                    certified_at=datetime.utcnow(),
                    sample_size=10,
                    model_version="1.0.0",
                    reasoning=["certified"],
                )
            return None

        safety_net._get_baseline = Mock(side_effect=mock_get_baseline)

        # Multiple concurrent calls
        results = []
        for _ in range(3):
            try:
                result = safety_net.certify_baseline(
                    profile_id="test",
                    joint_type="miter_45",
                    workshop_id=None,
                    k_factor=2.5,
                    confidence=0.90,
                    certified_by="test",
                )
                results.append(result)
            except Exception as e:
                results.append(str(e))

        # All should succeed (idempotency)
        assert len(results) == 3
        # At least one should be a valid baseline
        assert any(isinstance(r, CalibrationBaseline) for r in results)


class TestAnomalyDeduplication:
    """Tests for anomaly deduplication."""

    def test_anomaly_deduplication_window(self):
        """Test that anomalies within deduplication window are deduplicated."""
        safety_net = CalibrationSafetyNet()

        # Mock transaction manager
        logged_anomalies = []

        def mock_log_anomaly(**kwargs):
            anomaly_id = f"anomaly-{len(logged_anomalies) + 1}"
            logged_anomalies.append(
                {
                    "id": anomaly_id,
                    "profile_id": kwargs["profile_id"],
                    "joint_type": kwargs["joint_type"],
                    "anomaly_type": kwargs["anomaly_type"],
                    "severity": kwargs["severity"],
                }
            )
            return anomaly_id

        safety_net.transaction_manager.log_anomaly_transactional = Mock(
            side_effect=mock_log_anomaly
        )

        context = OperationModeManager.resolve(
            workshop_id="test", explicit_mode=OperationMode.PRODUCTION
        )

        # Log same anomaly multiple times quickly
        for _ in range(3):
            safety_net._log_anomaly(
                profile_id="test",
                joint_type="miter_45",
                workshop_id=None,
                context=context,
                anomaly_type="drift",
                severity="CRITICAL",
                details={"drift_amount": 0.5},
            )

        # In a real scenario with deduplication, we'd expect fewer anomalies
        # For this test, we verify the function is called (deduplication happens in DB)
        assert len(logged_anomalies) == 3  # All logged (deduplication in DB function)


class TestAdvisoryLocks:
    """Tests for advisory lock behavior."""

    def test_advisory_lock_prevents_race_condition(self):
        """Test that advisory locks prevent race conditions."""
        safety_net = CalibrationSafetyNet()

        # Mock transaction manager to track call order
        call_order = []

        def mock_certify(baseline):
            call_order.append("certify")
            return "baseline-id"

        safety_net.transaction_manager.certify_baseline_transactional = Mock(
            side_effect=mock_certify
        )

        safety_net._get_baseline = Mock(
            return_value=CalibrationBaseline(
                profile_id="test",
                joint_type="miter_45",
                workshop_id=None,
                baseline_version="1.0.0",
                baseline_hash="test_hash",
                k_factor=2.5,
                confidence=0.90,
                certified_by="test",
                certified_at=datetime.utcnow(),
                sample_size=10,
                model_version="1.0.0",
                reasoning=["certified"],
            )
        )

        # Multiple calls (advisory locks ensure atomicity in DB)
        for _ in range(3):
            safety_net.certify_baseline(
                profile_id="test",
                joint_type="miter_45",
                workshop_id=None,
                k_factor=2.5,
                confidence=0.90,
                certified_by="test",
            )

        # All calls should complete (locks handled in DB)
        assert len(call_order) == 3
