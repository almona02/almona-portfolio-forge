#!/usr/bin/env python3
"""Quick Calibration Safety Net Test"""

import os
import sys

# Add python_backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python_backend'))

def test_imports():
    """Test that all imports work."""
    print("Testing imports...")
    try:
        from ai_services.calibration.calibration_safety_net import CalibrationSafetyNet
        from core.operation_mode import OperationModeManager, OperationMode
        print("[OK] All imports successful")
        return True
    except ImportError as e:
        print(f"[FAIL] Import failed: {e}")
        return False

def test_safety_net_creation():
    """Test creating a CalibrationSafetyNet instance."""
    print("\nTesting CalibrationSafetyNet creation...")
    try:
        from ai_services.calibration.calibration_safety_net import CalibrationSafetyNet
        safety_net = CalibrationSafetyNet()
        print("[OK] CalibrationSafetyNet created successfully")
        return True
    except Exception as e:
        print(f"[FAIL] Creation failed: {e}")
        return False

def test_operation_mode():
    """Test OperationModeManager."""
    print("\nTesting OperationModeManager...")
    try:
        from core.operation_mode import OperationModeManager, OperationMode
        context = OperationModeManager.resolve(
            workshop_id="test_workshop",
            explicit_mode=OperationMode.PRODUCTION
        )
        print(f"[OK] OperationMode resolved: {context.mode.value}")
        print(f"   Trace ID: {context.trace_id}")
        return True
    except Exception as e:
        print(f"[FAIL] OperationMode failed: {e}")
        return False

def test_prediction_without_db():
    """Test prediction without database (should use fallback)."""
    print("\nTesting prediction (fallback mode)...")
    try:
        from ai_services.calibration.calibration_safety_net import CalibrationSafetyNet
        from core.operation_mode import OperationModeManager, OperationMode
        
        safety_net = CalibrationSafetyNet()
        context = OperationModeManager.resolve(
            workshop_id="test_workshop",
            explicit_mode=OperationMode.SANDBOX  # Sandbox mode for testing
        )
        
        # This should work even without database (uses safe defaults)
        prediction = safety_net.predict(
            profile_data={"id": "test_profile"},
            joint_type="miter_45",
            context=context,
            workshop_id=None,
            current_k_factor=2.5
        )
        
        print(f"[OK] Prediction successful!")
        print(f"   Predicted K-factor: {prediction.predicted_k_factor:.2f}")
        print(f"   Confidence: {prediction.confidence:.2f}")
        return True
    except Exception as e:
        print(f"[FAIL] Prediction failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("  Calibration Safety Net - Quick Test")
    print("=" * 60)
    
    results = []
    results.append(("Imports", test_imports()))
    results.append(("Safety Net Creation", test_safety_net_creation()))
    results.append(("Operation Mode", test_operation_mode()))
    results.append(("Prediction", test_prediction_without_db()))
    
    print("\n" + "=" * 60)
    print("  Test Results")
    print("=" * 60)
    
    for name, passed in results:
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status}: {name}")
    
    all_passed = all(result[1] for result in results)
    print("\n" + "=" * 60)
    if all_passed:
        print("[OK] All tests passed!")
    else:
        print("[FAIL] Some tests failed")
    print("=" * 60)
    
    sys.exit(0 if all_passed else 1)

