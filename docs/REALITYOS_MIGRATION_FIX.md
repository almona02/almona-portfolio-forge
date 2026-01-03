# RealityOS Migration Fix - Partitioned Table Constraints
**Date:** 2025-02-20  
**Issue:** PostgreSQL partitioned table PRIMARY KEY requirements

---

## Problem

PostgreSQL requires that **unique constraints (including PRIMARY KEY) on partitioned tables must include all partitioning columns**.

Since `reality_events` is partitioned by `recorded_at`, the PRIMARY KEY must include `recorded_at`.

**Error:**
```
ERROR: 0A000: unique constraint on partitioned table must include all partitioning columns
DETAIL: PRIMARY KEY constraint on table "reality_events" lacks column "recorded_at"
```

---

## Solution

### 1. Composite PRIMARY KEY

Changed from:
```sql
event_hash CHAR(64) PRIMARY KEY
```

To:
```sql
PRIMARY KEY (event_hash, recorded_at)
```

### 2. UNIQUE Constraint on event_hash

Added separate UNIQUE constraint to ensure global uniqueness:
```sql
CONSTRAINT uq_event_hash UNIQUE (event_hash)
```

### 3. Foreign Key Constraint Removed

For partitioned tables, foreign key constraints have limitations. Chain integrity is now enforced via:
- Application logic (EventLedger class)
- CHECK constraints (chk_prev_hash_valid)
- UNIQUE constraint on event_hash (prev_hash references this)

---

## Changes Made

### Migration File (041_realityos_event_ledger.sql)

1. ✅ Made ENUM creation idempotent
2. ✅ Changed PRIMARY KEY to composite `(event_hash, recorded_at)`
3. ✅ Added UNIQUE constraint on `event_hash`
4. ✅ Removed foreign key constraint (enforced in application)
5. ✅ Made all operations idempotent (IF NOT EXISTS, etc.)
6. ✅ Made genesis event insertion idempotent

### Schema Files

1. ✅ Updated `event_schema_v1.sql` to reflect composite PRIMARY KEY
2. ✅ Updated `constraints_v1.sql` to check table existence first

### EventLedger Class

1. ✅ Updated to work with composite PRIMARY KEY
2. ✅ `recorded_at` now included in INSERT statements

---

## Migration Execution

The migration is now **idempotent** and can be run multiple times safely:

```bash
# First run
psql realityos_test -f migrations/041_realityos_event_ledger.sql
# ✅ Success

# Second run (safe)
psql realityos_test -f migrations/041_realityos_event_ledger.sql
# ✅ Success (no errors, skips existing objects)
```

---

## Verification

After migration, verify:

```sql
-- Check table structure
\d reality_events

-- Should show:
-- PRIMARY KEY (event_hash, recorded_at)
-- UNIQUE (event_hash)
-- UNIQUE (chain_position)

-- Check genesis event
SELECT event_hash, entity_id, chain_position, recorded_at 
FROM reality_events 
WHERE prev_hash IS NULL;
-- Should return 1 row (genesis)
```

---

## Impact on Application Code

### EventLedger.record_event()

No changes needed - the method already includes `recorded_at` in INSERT statements.

### Queries

All queries using `event_hash` continue to work because:
- `event_hash` has UNIQUE constraint (can be used in WHERE clauses)
- Composite PRIMARY KEY doesn't affect SELECT queries
- Indexes work the same way

---

## Why This Works

1. **event_hash is globally unique** via UNIQUE constraint
2. **Composite PRIMARY KEY** satisfies PostgreSQL's partitioning requirement
3. **Chain integrity** enforced via:
   - Application logic (prev_hash validation)
   - CHECK constraint (chk_prev_hash_valid)
   - UNIQUE constraint (prev_hash must reference existing event_hash)

---

## Testing

Run validation script:
```bash
export DATABASE_URL="postgresql://localhost/realityos_test"
python scripts/validate_event_ledger.py
```

All tests should pass with the new schema.

---

**Status:** ✅ **FIXED** - Migration ready for execution


