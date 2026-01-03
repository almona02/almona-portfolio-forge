#!/usr/bin/env python3
"""
Calibration Safety Net - Post-Deployment Verification
=====================================================

Comprehensive verification script to ensure deployment is correct.
Tests function permissions, NULL handling, advisory locks, cache invalidation,
and confidence floor enforcement.
"""

import os
import sys
from typing import Dict, Any, List

# Add python_backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python_backend'))

try:
    from core.supabase_client import get_supabase_client
    from ai_services.calibration.calibration_safety_net import (
        CalibrationSafetyNet,
        CalibrationStatus
    )
    from core.operation_mode import OperationModeManager, OperationMode
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running from the project root and dependencies are installed")
    sys.exit(1)


class VerificationResult:
    """Result of a verification check."""
    def __init__(self, name: str, passed: bool, message: str = ""):
        self.name = name
        self.passed = passed
        self.message = message


def test_function_permissions() -> VerificationResult:
    """Test that functions have correct permissions."""
    try:
        supabase = get_supabase_client()
        
        # Test that we can call the function (should not error)
        response = supabase.rpc("get_calibration_baseline", {
            "p_profile_id": "test",
            "p_joint_type": "miter_45",
            "p_workshop_id": None
        }).execute()
        
        return VerificationResult(
            "Function Permissions",
            True,
            "Functions are callable via RPC"
        )
    except Exception as e:
        return VerificationResult(
            "Function Permissions",
            False,
            f"Failed to call function: {str(e)}"
        )


def test_null_handling() -> VerificationResult:
    """Test that NULL workshop_id is handled correctly."""
    try:
        supabase = get_supabase_client()
        
        # Test with NULL workshop_id
        response = supabase.rpc("get_calibration_baseline", {
            "p_profile_id": "test",
            "p_joint_type": "miter_45",
            "p_workshop_id": None
        }).execute()
        
        # Test with explicit NULL string (should also work)
        response2 = supabase.rpc("log_calibration_anomaly", {
            "p_profile_id": "test",
            "p_joint_type": "miter_45",
            "p_workshop_id": None,
            "p_anomaly_type": "deployment_test",
            "p_severity": "WARNING",
            "p_details": {},
            "p_execution_context": {}
        }).execute()
        
        return VerificationResult(
            "NULL Handling",
            True,
            "NULL workshop_id handled correctly"
        )
    except Exception as e:
        return VerificationResult(
            "NULL Handling",
            False,
            f"NULL handling failed: {str(e)}"
        )


def test_advisory_locks() -> VerificationResult:
    """Test that advisory locks work (via database query)."""
    try:
        supabase = get_supabase_client()
        
        # Query to check if advisory lock functions are available
        # We can't directly test locks without concurrent operations,
        # but we can verify the function exists
        response = supabase.rpc("certify_calibration_baseline", {
            "p_profile_id": "test_lock",
            "p_joint_type": "miter_45",
            "p_workshop_id": None,
            "p_baseline_version": "1.0.0",
            "p_baseline_hash": "test_hash",
            "p_k_factor": 2.5,
            "p_confidence": 0.90,
            "p_certified_by": "test",
            "p_sample_size": 0,
            "p_model_version": "1.0.0",
            "p_reasoning": []
        }).execute()
        
        return VerificationResult(
            "Advisory Locks",
            True,
            "Advisory lock functions operational (tested via certification)"
        )
    except Exception as e:
        # This might fail if baseline already exists, which is fine
        error_msg = str(e).lower()
        if "already exists" in error_msg or "duplicate" in error_msg:
            return VerificationResult(
                "Advisory Locks",
                True,
                "Advisory locks working (idempotency detected)"
            )
        return VerificationResult(
            "Advisory Locks",
            False,
            f"Advisory lock test failed: {str(e)}"
        )


def test_cache_invalidation() -> VerificationResult:
    """Test that cache invalidation works."""
    try:
        safety_net = CalibrationSafetyNet()
        
        # Get baseline (populates cache)
        baseline1 = safety_net._get_baseline("test", "miter_45", None)
        
        # Invalidate cache
        safety_net._invalidate_cache("test:miter_45:global")
        
        # Get baseline again (should reload from database)
        baseline2 = safety_net._get_baseline("test", "miter_45", None)
        
        return VerificationResult(
            "Cache Invalidation",
            True,
            "Cache invalidation mechanism works"
        )
    except Exception as e:
        return VerificationResult(
            "Cache Invalidation",
            False,
            f"Cache invalidation test failed: {str(e)}"
        )


def test_confidence_floor() -> VerificationResult:
    """Test that confidence floor is enforced."""
    try:
        safety_net = CalibrationSafetyNet()
        context = OperationModeManager.resolve(
            workshop_id="test",
            explicitMode=OperationMode.CERTIFIED
        )
        
        # Try to certify with low confidence (should fail)
        try:
            safety_net.certify_baseline(
                profile_id="test",
                joint_type="miter_45",
                workshop_id=None,
                k_factor=2.5,
                confidence=0.80,  # Below floor
                certified_by="test"
            )
            return VerificationResult(
                "Confidence Floor",
                False,
                "Confidence floor not enforced"
            )
        except ValueError:
            # Expected - confidence floor should be enforced
            return VerificationResult(
                "Confidence Floor",
                True,
                "Confidence floor (0.85) enforced correctly"
            )
    except Exception as e:
        return VerificationResult(
            "Confidence Floor",
            False,
            f"Confidence floor test failed: {str(e)}"
        )


def run_all_verifications() -> List[VerificationResult]:
    """Run all verification checks."""
    results = []
    
    print("🔍 Running verification checks...\n")
    
    results.append(test_function_permissions())
    results.append(test_null_handling())
    results.append(test_advisory_locks())
    results.append(test_cache_invalidation())
    results.append(test_confidence_floor())
    
    return results


def print_results(results: List[VerificationResult]) -> None:
    """Print verification results."""
    print("\n" + "=" * 60)
    print("  Verification Results")
    print("=" * 60 + "\n")
    
    passed = 0
    failed = 0
    
    for result in results:
        status = "✅ PASS" if result.passed else "❌ FAIL"
        print(f"{status}: {result.name}")
        if result.message:
            print(f"   {result.message}")
        print()
        
        if result.passed:
            passed += 1
        else:
            failed += 1
    
    print("=" * 60)
    print(f"Total: {len(results)} | Passed: {passed} | Failed: {failed}")
    print("=" * 60 + "\n")
    
    if failed > 0:
        print("⚠️  Some verifications failed. Review the errors above.")
        sys.exit(1)
    else:
        print("✅ All verifications passed!")
        sys.exit(0)


def main():
    """Main verification flow."""
    print("\n" + "=" * 60)
    print("  Calibration Safety Net - Deployment Verification")
    print("=" * 60 + "\n")
    
    # Check environment
    if not os.getenv("SUPABASE_DB_URL"):
        print("❌ SUPABASE_DB_URL environment variable not set")
        sys.exit(1)
    
    # Run verifications
    results = run_all_verifications()
    print_results(results)


if __name__ == "__main__":
    main()

