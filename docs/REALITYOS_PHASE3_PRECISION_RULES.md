# Phase 3: Precision Rules & Hardening Notes

**Status:** LOCKED - Execution Ready  
**Date:** 2025-02-20

## QR Lifecycle - Final Hardening

### A. Canonical Serialization (FROZEN)

**Exact Format:**
```
v|entity_id|vertical_id|qr_id|created_at|valid_from|valid_to
```

**Rules:**
- No whitespace
- No JSON serialization
- No optional fields
- UTF-8 only
- Field separator is literal `|`
- Never reuse Python dict ordering

### B. Transactional Single-Use

**Pattern:**
```sql
BEGIN
  validate QR
  mark qr_id = USED
  insert event
COMMIT
```

If any step fails → ROLLBACK.

### C. Event-Based Revocation

- Revocation = new event
- `qr_lifecycle.revoked_at` is derived, not authoritative
- Keeps revocation auditable, chain-visible, legally defensible

### D. Per-Vertical Signing Keys

- Structure: `vertical_id → secret_key`
- No global QR secret
- Enables blast-radius isolation, client-specific key rotation, regulator trust

## Photo Validator - Forensic Enhancement

- SHA-256 + pHash dual system
- Exact reuse detection (SHA-256)
- Perceptual similarity detection (pHash)
- Flag, don't block: Similarity > threshold = warning, not rejection

## GPS Validation - Auditor-Safe Language

**Allowed Terms:**
- `GPS_ANOMALOUS`
- `GPS_LOW_CONFIDENCE`
- `LOCATION_UNVERIFIED`

**Never Use:**
- "spoofed"
- "forged"
- "false"

## Timestamp Validation - Human-Impossible Detection

- <10 seconds + different entity_id = flag (script detection)
- Flag only: Never block on temporal anomalies alone

## Correlation Validator - Confidence Degradation

- Only QR failures block (constitutional)
- All other failures reduce confidence
- Legal defensibility preserved

## Capture Gateway - Failure Hierarchy

```
QR Failure → BLOCK (Constitutional)
Photo/GPS/Time/Correlation Failure → DEGRADE CONFIDENCE
```

## Proof Hash - Deterministic Rules

- Sorted keys
- Normalized floats (GPS precision fixed)
- ISO-8601 only (no format drift)

## Runtime OFF Detection - Pure Derivation

- Never store as truth events
- Reference evidence hashes
- Recompute on demand

## Fraud Logging - Strict Separation

- `reality_events ≠ security_events`
- Never mix operational + security

## Auditor Tools - "Explain Absence"

- "No human verification occurred" explicit output
- System never infers truth → always state explicitly

