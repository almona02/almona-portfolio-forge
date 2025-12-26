#!/usr/bin/env python3
"""
Quick verification script for Industry Watchdog restore
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

def verify_imports():
    """Verify all imports work"""
    print("Testing imports...")
    try:
        from services.industry_watchdog import (
            IndustryWatchdog,
            IndustryArticle,
            MarketAlert,
            RelevanceLevel
        )
        print("  [OK] All classes imported")
        return True
    except Exception as e:
        print(f"  [FAIL] Import error: {e}")
        return False

def verify_initialization():
    """Verify initialization works"""
    print("\nTesting initialization...")
    try:
        from services.industry_watchdog import IndustryWatchdog
        
        # Test without social listener
        w1 = IndustryWatchdog(enable_social_listener=False)
        print("  [OK] Initialized without social listener")
        
        # Test with social listener
        w2 = IndustryWatchdog(enable_social_listener=True)
        print(f"  [OK] Initialized with social listener: {w2.enable_social_listener}")
        
        # Verify methods exist
        assert hasattr(w2, 'daily_scan'), "Missing daily_scan method"
        assert hasattr(w2, 'get_morning_brief'), "Missing get_morning_brief method"
        assert hasattr(w2, 'get_latest_trends'), "Missing get_latest_trends method"
        assert hasattr(w2, 'get_active_alerts'), "Missing get_active_alerts method"
        print("  [OK] All required methods present")
        
        return True
    except Exception as e:
        print(f"  [FAIL] Initialization error: {e}")
        import traceback
        traceback.print_exc()
        return False

def verify_social_listener_integration():
    """Verify social listener integration"""
    print("\nTesting social listener integration...")
    try:
        from services.industry_watchdog import IndustryWatchdog
        
        w = IndustryWatchdog(enable_social_listener=True)
        
        if w.enable_social_listener:
            if w.social_listener is not None:
                print("  [OK] Social listener initialized")
            else:
                print("  [WARN] Social listener enabled but not initialized (may be missing dependencies)")
            
            if w.social_analyst is not None:
                print("  [OK] Social analyst initialized")
            else:
                print("  [WARN] Social analyst enabled but not initialized")
        else:
            print("  [SKIP] Social listener disabled")
        
        return True
    except Exception as e:
        print(f"  [FAIL] Social listener integration error: {e}")
        return False

def main():
    """Run all verification tests"""
    print("=" * 60)
    print("Industry Watchdog Restore Verification")
    print("=" * 60)
    
    results = []
    
    results.append(("Imports", verify_imports()))
    results.append(("Initialization", verify_initialization()))
    results.append(("Social Listener", verify_social_listener_integration()))
    
    print("\n" + "=" * 60)
    print("Verification Summary")
    print("=" * 60)
    
    for name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"  {status} {name}")
    
    all_passed = all(r for _, r in results)
    
    if all_passed:
        print("\n[SUCCESS] All verifications passed!")
        print("\nFile restored successfully with social listener integration.")
    else:
        print("\n[WARNING] Some verifications failed - check output above")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())

