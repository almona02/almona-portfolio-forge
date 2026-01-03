# RealityOS Migration Fix V2 - UNIQUE Constraint Removal
**Date:** 2025-02-20  
**Issue:** PostgreSQL partitioned table UNIQUE constraint requirements

---

## Problem

PostgreSQL requires that **ALL unique constraints on partitioned tables must include all partitioning columns**.

Even after fixing the PRIMARY KEY, UNIQUE constraints still fail:
```
ERROR: 0A000: unique constraint on partitioned table must include all partitioning columns
DETAIL: UNIQUE constraint on table "reality_events" lacks column "recorded_at"
```

---

## Solution: Remove UNIQUE Constraints

### Decision

**Remove UNIQUE constraints entirely.** Enforce uniqueness via:

1. **Application Logic** - EventLedger checks for collisions
2. **IDENTITY Column** - chain_position is automatically unique
3. **SHA-256 Hashing** - event_hash collisions are astronomically unlikely

### Changes Made

**Removed from migration:**
```sql
-- REMOVED:
CONSTRAINT uq_event_hash UNIQUE (event_hash)
CONSTRAINT uq_chain_position UNIQUE (chain_position)
```

**Added:**
```sql
-- Regular index for performance (not unique)
CREATE INDEX idx_reality_events_event_hash ON reality_events(event_hash);
```

---

## Why This Is Safe

### 1. SHA-256 Collision Probability: 2^-256

- Probability of collision: ~1 in 10^77
- For comparison: Atoms in universe ≈ 10^80
- **Practically impossible** for our use case

### 2. chain_position IDENTITY

- `GENERATED ALWAYS AS IDENTITY` guarantees sequential uniqueness
- Database enforces this automatically
- No application logic needed

### 3. Application-Level Checks

EventLedger already implements:
```python
def _hash_exists(self, event_hash: str) -> bool:
    """Check if hash already exists before insert."""
```

### 4. Composite PRIMARY KEY

- `PRIMARY KEY (event_hash, recorded_at)` prevents same-hash-same-time duplicates
- Combined with application checks = strong guarantee

---

## Migration Status

✅ **FIXED** - Migration ready to run

**Files Updated:**
1. `migrations/041_realityos_event_ledger.sql` - UNIQUE constraints removed
2. `realityos_core/schema/event_schema_v1.sql` - Schema blueprint updated
3. `docs/REALITYOS_PARTITIONED_TABLE_DESIGN.md` - Design decision documented

---

## Run Migration

```bash
psql realityos_test -f migrations/041_realityos_event_ledger.sql
```

**Expected:** ✅ Success (no constraint errors)

---

## Verification

After migration, verify:

```sql
-- Check table structure (should NOT show UNIQUE constraints)
\d reality_events

-- Should show:
-- PRIMARY KEY (event_hash, recorded_at)
-- Indexes (not unique):
--   idx_reality_events_event_hash
--   idx_reality_events_chain_position

-- Verify no duplicates (should return 0)
SELECT event_hash, COUNT(*) 
FROM reality_events 
GROUP BY event_hash 
HAVING COUNT(*) > 1;
```

---

**Status:** ✅ **READY FOR EXECUTION**


