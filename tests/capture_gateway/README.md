# Capture Gateway Tests

## Day 3-4: Constitutional Guardrail Tests

This test suite validates that the Reality Capture Gateway enforces all constitutional principles correctly.

## Running the Tests

### Prerequisites

```bash
# Install test dependencies (if needed)
pip install pytest freezegun  # Optional - tests work without freezegun
```

### Run All Tests

```bash
# From project root
python tests/capture_gateway/test_fake_capture.py
```

### Expected Output

```
======================================================================
CONSTITUTIONAL GUARDRAIL TEST: FAKE CAPTURE END-TO-END
======================================================================

🔐 Test 1: Constitutional Guardrail - Per-Vertical Keys
✅ PASS: Constitutional requirement enforced

🔏 Test 2: Canonical Serialization - Frozen Format
✅ PASS: Format frozen (7 fields, separator='|')

🚫 Test 3: Failure Hierarchy - QR → BLOCK
✅ PASS: QR failure → Constitutional violation (BLOCK)

📉 Test 4: Failure Hierarchy - Photo → DEGRADE
✅ PASS: Photo failure → DEGRADE (interface validates hierarchy)

⚖️ Test 5: Neutral Language Enforcement
✅ PASS: Neutral language enforced: 'GPS_ANOMALOUS'

🧊 Test 6: Evidence Chain Immutability
✅ PASS: Evidence chain is immutable (frozen dataclass)

🔄 Test 7: Transaction Safety - Rollback on Failure
✅ PASS: Transaction safety interface exists (implementation in Day 5-7)

📋 Test 8: Auditor-Friendly Output Formatting
✅ PASS: Auditor-friendly output with absence explanation

🕵️ Test 9: Fraud Detection Hooks
✅ PASS: Fraud detection hooks active - QR_REPLAY_ATTEMPT

📜 Test 10: Constitutional Amendment Required for Changes
Public interface methods (3):
  - __init__
  - validate_and_record
  - validate_capture
✅ PASS: Constitutional interface is locked (amendment required for changes)

======================================================================
RESULTS: 10/10 tests passed
✅ ALL CONSTITUTIONAL GUARDRAILS VERIFIED
Proceed to Day 5-7: Validator Implementation
```

## Test Coverage

### Constitutional Guardrails

1. **Per-Vertical Keys Required** - Gateway cannot be created without vertical secrets
2. **Canonical Serialization Frozen** - QR field order and separator are locked
3. **Failure Hierarchy** - QR failures BLOCK, others DEGRADE
4. **Neutral Language** - No "fake/spoofed/forged" terms, only neutral terms
5. **Evidence Immutability** - Evidence chains are frozen dataclasses
6. **Transaction Safety** - Interface enforces atomic operations
7. **Auditor-Friendly Output** - Includes absence explanations
8. **Fraud Detection** - Hooks present for non-blocking detection
9. **Interface Locked** - Constitutional methods cannot be removed

## Success Criteria

- ✅ All 10 tests pass
- ✅ No constitutional violations detected
- ✅ Interfaces are properly frozen
- ✅ Evidence chains are immutable
- ✅ Neutral language enforced

## Next Steps

After all tests pass:
- **Day 5-7**: Implement validator logic (QR, Photo, GPS, Timestamp, Correlation)
- **Day 8-10**: Integration testing with real database
- **Day 11-14**: Performance optimization and production hardening

