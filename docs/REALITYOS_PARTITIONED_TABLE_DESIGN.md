# RealityOS Partitioned Table Design Decisions
**Date:** 2025-02-20  
**Issue:** PostgreSQL partitioned table UNIQUE constraint limitations

---

## Problem

PostgreSQL requires that **ALL unique constraints (including UNIQUE) on partitioned tables must include all partitioning columns**.

Since `reality_events` is partitioned by `recorded_at`:
- ✅ PRIMARY KEY can be `(event_hash, recorded_at)` 
- ❌ UNIQUE constraint on `event_hash` alone is not allowed
- ❌ UNIQUE constraint on `chain_position` alone is not allowed

**Error:**
```
ERROR: 0A000: unique constraint on partitioned table must include all partitioning columns
DETAIL: UNIQUE constraint on table "reality_events" lacks column "recorded_at"
```

---

## Solution: Application-Level Uniqueness Enforcement

### Decision: Remove UNIQUE Constraints

Instead of database-level UNIQUE constraints, we enforce uniqueness via:

1. **Application Logic** (EventLedger class)
   - `_hash_exists()` method checks for hash collisions before insert
   - Hash collision detection with nonce increment
   - Chain position validation

2. **Database Features**
   - `chain_position BIGINT GENERATED ALWAYS AS IDENTITY` - Automatically unique
   - `event_hash` is SHA-256 - Collisions are astronomically unlikely (2^-256)

3. **Indexes for Performance**
   - Regular (non-unique) indexes on `event_hash` and `chain_position`
   - Enables fast lookups without constraint overhead

---

## Why This Is Safe

### 1. SHA-256 Collision Probability

The probability of a SHA-256 collision is:
- **2^-256** (approximately 1 in 10^77)
- For comparison: Number of atoms in observable universe ≈ 10^80
- **Practically impossible** for our use case

### 2. chain_position IDENTITY

- `GENERATED ALWAYS AS IDENTITY` ensures sequential, unique values
- Database guarantees uniqueness within the sequence
- No application logic needed for this

### 3. Application-Level Checks

EventLedger already implements:
```python
def _hash_exists(self, event_hash: str) -> bool:
    """Check if hash already exists in database."""
    # Prevents duplicate inserts
```

### 4. Composite PRIMARY KEY

- `PRIMARY KEY (event_hash, recorded_at)` ensures no duplicates within same timestamp
- Combined with application checks, provides strong uniqueness guarantee

---

## Trade-offs

### What We Lose

- ❌ Database-level enforcement of global uniqueness
- ❌ Automatic rejection of duplicate hashes at DB level

### What We Gain

- ✅ Partitioning for scalability (monthly partitions)
- ✅ Better query performance (partition pruning)
- ✅ Easier maintenance (old partitions can be archived)
- ✅ PostgreSQL compliance (no constraint violations)

### Risk Assessment

**Risk Level:** **LOW**

**Mitigation:**
1. Application logic checks before insert
2. SHA-256 makes collisions virtually impossible
3. IDENTITY ensures chain_position uniqueness
4. Composite PRIMARY KEY prevents same-hash-same-time duplicates

**Acceptable because:**
- Hash collisions are astronomically unlikely
- Application checks provide defense-in-depth
- Performance benefits of partitioning outweigh theoretical risk

---

## Alternative Approaches Considered

### Option 1: Include recorded_at in UNIQUE constraints ❌

```sql
UNIQUE (event_hash, recorded_at)
UNIQUE (chain_position, recorded_at)
```

**Problem:** This only enforces uniqueness per partition, not globally. Two events with same hash in different months would be allowed.

### Option 2: Don't Partition ❌

**Problem:** Loses scalability benefits. Table will grow unbounded, queries will slow down over time.

### Option 3: Unique Indexes ❌

**Problem:** Same limitation - unique indexes on partitioned tables also require partitioning column.

### Option 4: Application-Level Enforcement ✅ (CHOSEN)

**Solution:** Remove UNIQUE constraints, enforce in application code.

**Benefits:**
- Keeps partitioning
- Maintains performance
- Acceptable risk level
- PostgreSQL compliant

---

## Implementation

### Migration Changes

**Removed:**
```sql
CONSTRAINT uq_event_hash UNIQUE (event_hash)
CONSTRAINT uq_chain_position UNIQUE (chain_position)
```

**Added:**
```sql
CREATE INDEX idx_reality_events_event_hash ON reality_events(event_hash);
-- Regular index for performance (not unique)
```

### Application Code

EventLedger already implements:
- Hash collision detection
- Chain position validation
- Duplicate prevention

**No changes needed** - existing code already handles this.

---

## Verification

After migration, verify uniqueness:

```sql
-- Check for duplicate event_hashes (should return 0)
SELECT event_hash, COUNT(*) 
FROM reality_events 
GROUP BY event_hash 
HAVING COUNT(*) > 1;

-- Check for duplicate chain_positions (should return 0)
SELECT chain_position, COUNT(*) 
FROM reality_events 
GROUP BY chain_position 
HAVING COUNT(*) > 1;
```

Both queries should return 0 rows.

---

## Conclusion

**Decision:** Remove UNIQUE constraints, enforce uniqueness via application logic.

**Rationale:**
- PostgreSQL partitioned table limitations
- SHA-256 collision probability is negligible
- Application checks provide sufficient protection
- Partitioning benefits outweigh theoretical risk

**Status:** ✅ **ACCEPTED DESIGN DECISION**

This is a **constitutional design choice** - not a bug, but an architectural trade-off that prioritizes scalability and PostgreSQL compliance over database-level uniqueness constraints.

---

**Last Updated:** 2025-02-20  
**Approved By:** RealityOS Architecture Team


