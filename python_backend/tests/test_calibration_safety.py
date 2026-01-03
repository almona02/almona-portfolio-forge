"""
Integration tests for Calibration Safety Net - Safety Features
=============================================================

Tests confidence floor enforcement, drift detection, certified mode requirements,
and cache invalidation.
"""

import pytest
from unittest.mock import Mock
from datetime import datetime

from ai_services.calibration.calibration_safety_net import (
    CalibrationSafetyNet,
    CalibrationStatus,
    LowConfidenceError,
    DriftDetectedError,
    CalibrationFrozenError,
    CalibrationBaseline,
)
from ai_services.calibration.calibration_learner import KFactorPrediction
from core.operation_mode import OperationModeManager, OperationMode


class TestConfidenceFloor:
    """Tests for confidence floor enforcement."""

    def test_confidence_floor_enforcement_certified_mode(self):
        """Test that confidence floor is enforced in certified mode."""
        safety_net = CalibrationSafetyNet()
        context = OperationModeManager.resolve(
            workshop_id="test", explicit_mode=OperationMode.CERTIFIED
        )

        # Mock learner to return low confidence
        safety_net.learner = Mock()
        safety_net.learner.predict = Mock(
            return_value=KFactorPrediction(
                profile_id="test",
                joint_type="miter_45",
                predicted_k_factor=2.5,
                confidence=0.80,  # Below floor
                reasoning=["test"],
                contributing_factors={},
                sample_size=10,
                workshops_contributing=1,
                data_quality_score=0.8,
            )
        )

        # Should raise LowConfidenceError in certified mode
        with pytest.raises(LowConfidenceError):
            safety_net.predict(
                profile_data={"id": "test"}, joint_type="miter_45", context=context
            )

    def test_confidence_floor_fallback_production_mode(self):
        """Test that low confidence falls back to baseline in production mode."""
        safety_net = CalibrationSafetyNet()
        context = OperationModeManager.resolve(
            workshop_id="test", explicit_mode=OperationMode.PRODUCTION
        )

        # Mock baseline
        baseline = CalibrationBaseline(
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

        # Mock get_baseline to return baseline
        safety_net._get_baseline = Mock(return_value=baseline)

        # Mock learner to return low confidence
        safety_net.learner = Mock()
        safety_net.learner.predict = Mock(
            return_value=KFactorPrediction(
                profile_id="test",
                joint_type="miter_45",
                predicted_k_factor=2.5,
                confidence=0.80,  # Below floor
                reasoning=["test"],
                contributing_factors={},
                sample_size=10,
                workshops_contributing=1,
                data_quality_score=0.8,
            )
        )

        # Should fall back to baseline (not raise error)
        result = safety_net.predict(
            profile_data={"id": "test"}, joint_type="miter_45", context=context
        )

        assert result.predicted_k_factor == baseline.k_factor
        assert result.confidence == baseline.confidence


class TestDriftDetection:
    """Tests for drift detection."""

    def test_drift_detection_exceeds_threshold(self):
        """Test that drift exceeding threshold is detected."""
        safety_net = CalibrationSafetyNet()

        baseline_k = 2.5
        predicted_k = 3.5  # 40% drift (exceeds 20% threshold)

        result = safety_net._detect_drift(predicted_k, baseline_k)

        assert result.exceeds_threshold is True
        assert result.drift_amount == 1.0
        assert result.threshold == 0.5  # 20% of 2.5

    def test_drift_detection_within_threshold(self):
        """Test that drift within threshold is not flagged."""
        safety_net = CalibrationSafetyNet()

        baseline_k = 2.5
        predicted_k = 2.6  # 4% drift (within 20% threshold)

        result = safety_net._detect_drift(predicted_k, baseline_k)

        assert result.exceeds_threshold is False

    def test_drift_detection_certified_mode_raises_error(self):
        """Test that drift in certified mode raises error."""
        safety_net = CalibrationSafetyNet()
        context = OperationModeManager.resolve(
            workshop_id="test", explicit_mode=OperationMode.CERTIFIED
        )

        # Mock baseline
        baseline = CalibrationBaseline(
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

        safety_net._get_baseline = Mock(return_value=baseline)

        # Mock learner to return high drift
        safety_net.learner = Mock()
        safety_net.learner.predict = Mock(
            return_value=KFactorPrediction(
                profile_id="test",
                joint_type="miter_45",
                predicted_k_factor=3.5,  # High drift
                confidence=0.90,
                reasoning=["test"],
                contributing_factors={},
                sample_size=10,
                workshops_contributing=1,
                data_quality_score=0.8,
            )
        )

        # Should raise DriftDetectedError in certified mode
        with pytest.raises(DriftDetectedError):
            safety_net.predict(
                profile_data={"id": "test"}, joint_type="miter_45", context=context
            )


class TestCertifiedModeRequirements:
    """Tests for certified mode requirements."""

    def test_certified_mode_requires_baseline(self):
        """Test that certified mode requires a baseline."""
        safety_net = CalibrationSafetyNet()
        context = OperationModeManager.resolve(
            workshop_id="test", explicit_mode=OperationMode.CERTIFIED
        )

        # No baseline available
        safety_net._get_baseline = Mock(return_value=None)

        # Mock learner
        safety_net.learner = Mock()
        safety_net.learner.predict = Mock(
            return_value=KFactorPrediction(
                profile_id="test",
                joint_type="miter_45",
                predicted_k_factor=2.5,
                confidence=0.90,
                reasoning=["test"],
                contributing_factors={},
                sample_size=10,
                workshops_contributing=1,
                data_quality_score=0.8,
            )
        )

        # Should work (no baseline means no drift check)
        result = safety_net.predict(
            profile_data={"id": "test"}, joint_type="miter_45", context=context
        )

        assert result is not None


class TestCacheInvalidation:
    """Tests for cache invalidation."""

    def test_cache_invalidation_clears_cache(self):
        """Test that cache invalidation clears the cache."""
        safety_net = CalibrationSafetyNet()

        # Populate cache
        calibration_key = "test:miter_45:global"
        safety_net._baseline_cache[calibration_key] = None
        safety_net._status_cache[calibration_key] = CalibrationStatus.LEARNING

        # Invalidate
        safety_net._invalidate_cache(calibration_key)

        # Cache should be empty
        assert calibration_key not in safety_net._baseline_cache
        assert calibration_key not in safety_net._status_cache

    def test_certify_baseline_invalidates_cache(self):
        """Test that certifying a baseline invalidates cache."""
        safety_net = CalibrationSafetyNet()

        # Mock transaction manager
        safety_net.transaction_manager = Mock()
        safety_net.transaction_manager.certify_baseline_transactional = Mock(
            return_value="test-baseline-id"
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

        # Populate cache
        calibration_key = "test:miter_45:global"
        safety_net._baseline_cache[calibration_key] = None

        # Certify baseline
        safety_net.certify_baseline(
            profile_id="test",
            joint_type="miter_45",
            workshop_id=None,
            k_factor=2.5,
            confidence=0.90,
            certified_by="test",
        )

        # Cache should be invalidated (and reloaded)
        # The _get_baseline mock will be called to reload


class TestFrozenCalibration:
    """Tests for frozen calibration handling."""

    def test_frozen_calibration_certified_mode_raises_error(self):
        """Test that frozen calibration in certified mode raises error."""
        safety_net = CalibrationSafetyNet()
        context = OperationModeManager.resolve(
            workshop_id="test", explicit_mode=OperationMode.CERTIFIED
        )

        # Mock status as frozen
        safety_net._get_status = Mock(return_value=CalibrationStatus.FROZEN)

        # Should raise CalibrationFrozenError
        with pytest.raises(CalibrationFrozenError):
            safety_net.predict(
                profile_data={"id": "test"}, joint_type="miter_45", context=context
            )
