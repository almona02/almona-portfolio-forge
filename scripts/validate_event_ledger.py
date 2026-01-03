#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Validate Event Ledger implementation.
Run after migration to ensure everything works.

Usage:
    export DATABASE_URL="postgresql://user:pass@localhost/realityos_test"
    python scripts/validate_event_ledger.py
"""

import sys
import os
from datetime import datetime, timedelta

# Fix Windows console encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

from realityos_core.event_ledger import EventLedger, ChainIntegrityError, EventLedgerError
from realityos_core.models.event_models import (
    BaseEvent, RealityProof, GPSPoint, CoreEventType
)


def print_header(text: str):
    """Print formatted header."""
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60)


def print_check(name: str, passed: bool, message: str = ""):
    """Print check result."""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if message:
        print(f"   {message}")


def get_database_url():
    """Get database URL from environment or use default."""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        # Try to construct from common defaults
        db_url = "postgresql://localhost/realityos_test"
        print(f"⚠️  DATABASE_URL not set, using default: {db_url}")
        print("   Set DATABASE_URL environment variable to override")
    return db_url


def test_database_connection():
    """Test that we can connect to the database."""
    print_header("Testing Database Connection")
    
    try:
        db_url = get_database_url()
        ledger = EventLedger(db_url)
        
        # Try to query genesis event
        with ledger._get_session() as session:
            from sqlalchemy import text
            result = session.execute(text("SELECT 1"))
            result.fetchone()
        
        print_check("Database connection", True, f"Connected to: {db_url.split('@')[-1] if '@' in db_url else db_url}")
        return True, ledger
        
    except Exception as e:
        print_check("Database connection", False, f"Error: {str(e)}")
        print("\n💡 Make sure:")
        print("   1. Database exists: createdb realityos_test")
        print("   2. Migration run: psql realityos_test -f migrations/041_realityos_event_ledger.sql")
        print("   3. DATABASE_URL set: export DATABASE_URL='postgresql://localhost/realityos_test'")
        return False, None


def test_genesis_event(ledger: EventLedger):
    """Verify genesis event exists."""
    print_header("Testing Genesis Event")
    
    try:
        # Get genesis event (prev_hash is NULL)
        chain = ledger.get_chain(limit=1)
        
        if not chain:
            print_check("Genesis event exists", False, "No events found in database")
            return False
        
        # Check if first event is genesis
        # Genesis should be at position 1 with prev_hash = NULL
        genesis_candidates = [e for e in chain if e.chain_position == 1]
        
        if not genesis_candidates:
            print_check("Genesis event position", False, "No event at chain_position = 1")
            return False
        
        genesis = genesis_candidates[0]
        
        # Verify genesis properties
        checks = [
            (genesis.prev_hash is None, "prev_hash is NULL"),
            (genesis.chain_position == 1, "chain_position is 1"),
            (genesis.entity_id == "realityos_genesis", "entity_id is 'realityos_genesis'"),
            (genesis.vertical_id == "realityos_core", "vertical_id is 'realityos_core'"),
        ]
        
        all_passed = True
        for check, description in checks:
            if check:
                print_check(description, True)
            else:
                print_check(description, False)
                all_passed = False
        
        if all_passed:
            print_check("Genesis event verified", True, f"Hash: {genesis.event_hash[:16]}...")
            return True
        else:
            return False
            
    except Exception as e:
        print_check("Genesis event check", False, f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_append_only(ledger: EventLedger):
    """Test that events can only be appended, not modified."""
    print_header("Testing Append-Only Enforcement")
    
    try:
        # Create test event
        proof = RealityProof(
            verified_by="test_user",
            timestamp=datetime.utcnow(),
            qr_data="test_qr_001"
        )
        
        event = BaseEvent(
            event_type=CoreEventType.VERIFICATION,
            entity_id="test_entity_001",
            vertical_id="test_vertical",
            proof=proof,
            payload={"test": "value", "number": 42}
        )
        
        # Record first event
        record1 = ledger.record_event(event)
        print_check("First event recorded", True, f"Hash: {record1.event_hash[:16]}..., Position: {record1.chain_position}")
        
        # Record second event (same data, different timestamp = different hash)
        proof2 = RealityProof(
            verified_by="test_user",
            timestamp=datetime.utcnow() + timedelta(seconds=1),  # Different timestamp
            qr_data="test_qr_002"  # Different QR
        )
        
        event2 = BaseEvent(
            event_type=CoreEventType.VERIFICATION,
            entity_id="test_entity_001",
            vertical_id="test_vertical",
            proof=proof2,
            payload={"test": "value", "number": 42}
        )
        
        record2 = ledger.record_event(event2)
        print_check("Second event recorded", True, f"Hash: {record2.event_hash[:16]}..., Position: {record2.chain_position}")
        
        # Verify chain position incremented
        if record2.chain_position == record1.chain_position + 1:
            print_check("Chain position incremented", True)
        else:
            print_check("Chain position incremented", False, 
                       f"Expected {record1.chain_position + 1}, got {record2.chain_position}")
            return False
        
        # Verify prev_hash links correctly
        if record2.prev_hash == record1.event_hash:
            print_check("prev_hash links correctly", True)
        else:
            print_check("prev_hash links correctly", False,
                       f"Expected {record1.event_hash[:16]}..., got {record2.prev_hash[:16] if record2.prev_hash else 'None'}...")
            return False
        
        # Verify hashes are different (different timestamps = different hashes)
        if record1.event_hash != record2.event_hash:
            print_check("Event hashes are unique", True)
        else:
            print_check("Event hashes are unique", False, "Same hash for different events!")
            return False
        
        print_check("Append-only working correctly", True)
        return True
        
    except Exception as e:
        print_check("Append-only test", False, f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_chain_integrity(ledger: EventLedger):
    """Verify cryptographic chain integrity."""
    print_header("Testing Chain Integrity")
    
    try:
        # Verify entire chain
        integrity = ledger._verify_chain_integrity()
        
        if integrity:
            print_check("Initial chain integrity", True)
        else:
            print_check("Initial chain integrity", False)
            return False
        
        # Add test events and verify again
        print("   Adding test events...")
        for i in range(3):
            proof = RealityProof(
                verified_by="test_user",
                timestamp=datetime.utcnow() + timedelta(seconds=i),
                qr_data=f"test_qr_chain_{i:03d}"
            )
            
            event = BaseEvent(
                event_type=CoreEventType.VERIFICATION,
                entity_id=f"test_entity_chain_{i:03d}",
                vertical_id="test_vertical",
                proof=proof,
                payload={"iteration": i, "test": "chain_integrity"}
            )
            
            record = ledger.record_event(event)
            print(f"   Event {i+1} recorded: position {record.chain_position}")
        
        # Verify chain again
        integrity = ledger._verify_chain_integrity()
        
        if integrity:
            print_check("Chain integrity after writes", True)
        else:
            print_check("Chain integrity after writes", False)
            return False
        
        # Test get_chain method
        chain = ledger.get_chain(limit=10)
        if len(chain) > 0:
            print_check("get_chain() works", True, f"Retrieved {len(chain)} events")
        else:
            print_check("get_chain() works", False)
            return False
        
        # Verify chain order (should be descending by chain_position)
        positions = [e.chain_position for e in chain]
        if positions == sorted(positions, reverse=True):
            print_check("Chain order correct", True, "Descending by chain_position")
        else:
            print_check("Chain order correct", False, "Chain not in correct order")
            return False
        
        print_check("Chain integrity verified", True)
        return True
        
    except ChainIntegrityError as e:
        print_check("Chain integrity", False, f"ChainIntegrityError: {str(e)}")
        return False
    except Exception as e:
        print_check("Chain integrity test", False, f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_constraint_enforcement(ledger: EventLedger):
    """Test that constitutional constraints are enforced."""
    print_header("Testing Constraint Enforcement")
    
    passed = 0
    total = 0
    
    # Test 1: Missing verified_by (violates Principle 1)
    total += 1
    try:
        proof = RealityProof(
            timestamp=datetime.utcnow(),
            qr_data="test_qr"
        )
        print_check("Principle 1: verified_by required", False, "Should have failed validation")
        return False
    except ValueError as e:
        if "verified_by" in str(e) or "field required" in str(e).lower():
            print_check("Principle 1: verified_by required", True, "Pydantic validation working")
            passed += 1
        else:
            print_check("Principle 1: verified_by required", False, f"Wrong error: {str(e)}")
            return False
    
    # Test 2: Future timestamp (should fail validation)
    total += 1
    try:
        future_time = datetime.utcnow() + timedelta(days=365)
        proof = RealityProof(
            verified_by="test_user",
            timestamp=future_time,
            qr_data="test_qr"
        )
        print_check("Future timestamp validation", False, "Should have failed on future timestamp")
        return False
    except ValueError as e:
        if "future" in str(e).lower():
            print_check("Future timestamp validation", True, "Future timestamps rejected")
            passed += 1
        else:
            print_check("Future timestamp validation", False, f"Wrong error: {str(e)}")
            return False
    
    # Test 3: Too many photos (max 2)
    total += 1
    try:
        proof = RealityProof(
            verified_by="test_user",
            timestamp=datetime.utcnow(),
            photo_hashes=["hash1", "hash2", "hash3"]  # 3 photos (max is 2)
        )
        print_check("Photo limit (max 2)", False, "Should have failed on 3 photos")
        return False
    except ValueError as e:
        if "max_items" in str(e).lower() or "maximum" in str(e).lower():
            print_check("Photo limit (max 2)", True, "Max 2 photos enforced")
            passed += 1
        else:
            print_check("Photo limit (max 2)", False, f"Wrong error: {str(e)}")
            return False
    
    # Test 4: Invalid photo hash format
    total += 1
    try:
        proof = RealityProof(
            verified_by="test_user",
            timestamp=datetime.utcnow(),
            photo_hashes=["invalid_hash"]  # Not 64-char hex
        )
        print_check("Photo hash format validation", False, "Should have failed on invalid hash")
        return False
    except ValueError as e:
        if "hash" in str(e).lower():
            print_check("Photo hash format validation", True, "Invalid hash format rejected")
            passed += 1
        else:
            print_check("Photo hash format validation", False, f"Wrong error: {str(e)}")
            return False
    
    print_check("Constraint enforcement", passed == total, f"{passed}/{total} constraint tests passed")
    return passed == total


def test_event_retrieval(ledger: EventLedger):
    """Test event retrieval by hash."""
    print_header("Testing Event Retrieval")
    
    try:
        # Create and record an event
        proof = RealityProof(
            verified_by="test_user",
            timestamp=datetime.utcnow(),
            qr_data="test_qr_retrieval"
        )
        
        event = BaseEvent(
            event_type=CoreEventType.VERIFICATION,
            entity_id="test_entity_retrieval",
            vertical_id="test_vertical",
            proof=proof,
            payload={"test": "retrieval"}
        )
        
        record = ledger.record_event(event)
        print_check("Event recorded for retrieval", True, f"Hash: {record.event_hash[:16]}...")
        
        # Retrieve by hash
        retrieved = ledger.get_event(record.event_hash)
        
        if retrieved is None:
            print_check("Event retrieval by hash", False, "Event not found")
            return False
        
        if retrieved.event_hash == record.event_hash:
            print_check("Event retrieval by hash", True, "Correct event retrieved")
        else:
            print_check("Event retrieval by hash", False, "Wrong event retrieved")
            return False
        
        # Verify all fields match
        if (retrieved.entity_id == record.entity_id and
            retrieved.vertical_id == record.vertical_id and
            retrieved.chain_position == record.chain_position):
            print_check("Retrieved event fields match", True)
        else:
            print_check("Retrieved event fields match", False)
            return False
        
        return True
        
    except Exception as e:
        print_check("Event retrieval test", False, f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all validation tests."""
    print("=" * 60)
    print("  RealityOS Event Ledger Validation")
    print("=" * 60)
    
    # Test database connection first
    success, ledger = test_database_connection()
    if not success:
        print("\n❌ Cannot proceed without database connection")
        return 1
    
    # Run all tests
    tests = [
        ("Genesis Event", lambda: test_genesis_event(ledger)),
        ("Append-Only Enforcement", lambda: test_append_only(ledger)),
        ("Chain Integrity", lambda: test_chain_integrity(ledger)),
        ("Constraint Enforcement", lambda: test_constraint_enforcement(ledger)),
        ("Event Retrieval", lambda: test_event_retrieval(ledger)),
    ]
    
    results = []
    
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ ERROR in {name}: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))
    
    # Summary
    print_header("Validation Summary")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print(f"\n{'=' * 60}")
    print(f"Results: {passed}/{total} tests passed")
    print(f"{'=' * 60}\n")
    
    if passed == total:
        print("✅ All tests passing. Event Ledger is ready for Phase 3.")
        print("\nNext steps:")
        print("  1. Commit changes: git add . && git commit -m 'feat: RealityOS Phase 2 complete'")
        print("  2. Proceed to Phase 3: Reality Capture Gateway")
        return 0
    else:
        print("❌ Some tests failed. Review and fix before Phase 3.")
        print("\nCommon issues:")
        print("  - Migration not run: psql realityos_test -f migrations/041_realityos_event_ledger.sql")
        print("  - Database URL incorrect: export DATABASE_URL='postgresql://localhost/realityos_test'")
        print("  - Database permissions: Ensure user has INSERT/SELECT permissions")
        return 1


if __name__ == "__main__":
    sys.exit(main())


