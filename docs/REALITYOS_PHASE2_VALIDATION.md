# RealityOS Phase 2: Validation Guide
**Date:** 2025-02-20  
**Purpose:** Step-by-step guide to validate Event Ledger implementation

---

## Prerequisites

Before running validation, ensure you have:

1. ✅ PostgreSQL installed and running
2. ✅ Database created: `realityos_test`
3. ✅ Migration executed: `migrations/041_realityos_event_ledger.sql`
4. ✅ Python dependencies installed (SQLAlchemy, Pydantic)

---

## Step 1: Create Test Database

```bash
# Create test database
createdb realityos_test

# Verify it exists
psql -l | grep realityos_test
```

**Expected Output:**
```
realityos_test | postgres | UTF8     | ...
```

---

## Step 2: Run Migration

```bash
# Run migration script
psql realityos_test -f migrations/041_realityos_event_ledger.sql
```

**Expected Output:**
```
BEGIN
CREATE TYPE
CREATE TABLE
CREATE TABLE
ALTER TABLE
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
INSERT 0 1
CREATE VIEW
GRANT
GRANT
REVOKE
GRANT
COMMIT
✅ Migration Successful | 1 | 1 | 1
```

**Verify Genesis Event:**
```sql
psql realityos_test -c "SELECT event_hash, entity_id, chain_position FROM reality_events WHERE prev_hash IS NULL;"
```

**Expected Output:**
```
                    event_hash                    |      entity_id      | chain_position 
--------------------------------------------------+---------------------+----------------
 0000000000000000000000000000000000000000000000000000000000000000 | realityos_genesis |              1
```

---

## Step 3: Test Append-Only Enforcement

```sql
psql realityos_test
```

```sql
-- This should FAIL with permission denied
UPDATE reality_events SET entity_id = 'test' WHERE chain_position = 1;

-- This should also FAIL
DELETE FROM reality_events WHERE chain_position = 1;
```

**Expected Output:**
```
ERROR:  permission denied for table reality_events
```

✅ If you see permission denied errors, append-only is working correctly.

---

## Step 4: Set Environment Variable

```bash
# Linux/Mac
export DATABASE_URL="postgresql://localhost/realityos_test"

# Windows (PowerShell)
$env:DATABASE_URL="postgresql://localhost/realityos_test"

# Windows (CMD)
set DATABASE_URL=postgresql://localhost/realityos_test
```

**Verify:**
```bash
echo $DATABASE_URL  # Linux/Mac
echo %DATABASE_URL%  # Windows CMD
$env:DATABASE_URL   # Windows PowerShell
```

---

## Step 5: Run Validation Script

```bash
python scripts/validate_event_ledger.py
```

**Expected Output:**
```
============================================================
  RealityOS Event Ledger Validation
============================================================

============================================================
  Testing Database Connection
============================================================
✅ PASS: Database connection
   Connected to: localhost/realityos_test

============================================================
  Testing Genesis Event
============================================================
✅ PASS: prev_hash is NULL
✅ PASS: chain_position is 1
✅ PASS: entity_id is 'realityos_genesis'
✅ PASS: vertical_id is 'realityos_core'
✅ PASS: Genesis event verified
   Hash: 0000000000000000...

[... more tests ...]

============================================================
  Validation Summary
============================================================
✅ PASS: Genesis Event
✅ PASS: Append-Only Enforcement
✅ PASS: Chain Integrity
✅ PASS: Constraint Enforcement
✅ PASS: Event Retrieval

============================================================
Results: 5/5 tests passed
============================================================

✅ All tests passing. Event Ledger is ready for Phase 3.
```

---

## Troubleshooting

### Issue: "Database connection failed"

**Solution:**
1. Check PostgreSQL is running: `pg_isready`
2. Verify database exists: `psql -l | grep realityos_test`
3. Check connection string: `echo $DATABASE_URL`
4. Test connection manually: `psql realityos_test -c "SELECT 1;"`

---

### Issue: "No genesis event found"

**Solution:**
1. Re-run migration: `psql realityos_test -f migrations/041_realityos_event_ledger.sql`
2. Verify genesis exists: `psql realityos_test -c "SELECT * FROM reality_events WHERE prev_hash IS NULL;"`
3. If still missing, check migration script executed successfully

---

### Issue: "Permission denied" when testing append-only

**This is CORRECT behavior!** Append-only is working.

If you need to modify data for testing:
```sql
-- Connect as superuser
psql realityos_test -U postgres

-- Temporarily grant permissions (for testing only)
GRANT UPDATE, DELETE ON reality_events TO your_user;

-- After testing, revoke again
REVOKE UPDATE, DELETE ON reality_events FROM your_user;
```

---

### Issue: "Chain integrity verification failed"

**Solution:**
1. Check if chain is broken: `psql realityos_test -c "SELECT chain_position, prev_hash, event_hash FROM reality_events ORDER BY chain_position;"`
2. Verify prev_hash links correctly
3. If broken, drop and recreate database:
   ```bash
   dropdb realityos_test
   createdb realityos_test
   psql realityos_test -f migrations/041_realityos_event_ledger.sql
   ```

---

### Issue: "Pydantic validation errors"

**Solution:**
1. Check Python version: `python --version` (should be 3.9+)
2. Install dependencies: `pip install pydantic sqlalchemy`
3. Verify imports work: `python -c "from realityos_core.models.event_models import BaseEvent"`

---

## Validation Checklist

Before proceeding to Phase 3, verify:

- [ ] Database created: `realityos_test`
- [ ] Migration executed successfully
- [ ] Genesis event exists (chain_position = 1, prev_hash = NULL)
- [ ] Append-only enforced (UPDATE/DELETE fail)
- [ ] Validation script passes all 5 tests
- [ ] Chain integrity verification works
- [ ] Events can be recorded and retrieved

---

## Success Criteria

✅ **All 5 validation tests pass**

1. ✅ Database Connection
2. ✅ Genesis Event
3. ✅ Append-Only Enforcement
4. ✅ Chain Integrity
5. ✅ Constraint Enforcement
6. ✅ Event Retrieval

---

## Next Steps

Once validation passes:

1. **Commit Changes:**
   ```bash
   git add .
   git commit -m "feat: RealityOS Phase 2 - Generic Event Ledger complete

   - Event schema with constitutional constraints
   - Append-only reality_events table with partitioning
   - Genesis event for chain starting point
   - EventLedger with cryptographic chaining
   - Chain verification system
   - All validation tests passing"
   ```

2. **Proceed to Phase 3:**
   - Reality Capture Gateway
   - QR validation
   - Photo validation
   - GPS validation
   - Timestamp validation

---

**Last Updated:** 2025-02-20  
**Status:** Ready for validation


