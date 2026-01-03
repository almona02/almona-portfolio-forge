# RealityOS Event Ledger - Supabase Test Guide
**Date:** 2025-02-20  
**Purpose:** Step-by-step guide to test Event Ledger in Supabase SQL Editor

---

## Quick Start

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor** (left sidebar)

2. **Run Migration First** (if not already done)
   - Copy contents of `migrations/041_realityos_event_ledger.sql`
   - Paste into SQL Editor
   - Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

3. **Run Test Script**
   - Copy contents of `scripts/test_event_ledger_supabase.sql`
   - Paste into SQL Editor
   - Click **Run**

4. **Review Results**
   - Check all test results in the output
   - All checks should show ✅

---

## What the Test Script Does

### Step 1: Verify Migration
- Checks if `reality_events` table exists
- Alerts if migration needs to be run

### Step 2: Verify Schema Structure
- Checks for required columns:
  - `event_hash`
  - `prev_hash`
  - `chain_position`
  - `recorded_at`

### Step 3: Verify Genesis Event
- Checks if genesis event exists
- Shows genesis event details

### Step 4: Test Append-Only Enforcement
- Attempts UPDATE (should be blocked)
- Attempts DELETE (should be blocked)
- Verifies permissions are correctly set

### Step 5: Test Event Insertion
- Inserts a test event
- Verifies insertion succeeds
- Checks chain position increment

### Step 6: Verify Chain Integrity
- Checks all chain positions are unique
- Verifies `prev_hash` links are valid
- Detects broken chain links

### Step 7: Test Constraints
- Tests proof structure constraint
- Verifies invalid data is rejected

### Step 8: Test Indexes
- Lists all indexes on `reality_events`
- Verifies indexes exist for performance

### Step 9: Test Partitioning
- Lists all partitions
- Verifies partitioning is set up

### Step 10: Summary Report
- Provides overall validation status
- Shows key metrics

### Step 11: Show All Events
- Displays all events for manual inspection
- Useful for debugging

---

## Expected Results

### ✅ All Tests Should Pass

```
✅ Table reality_events exists
✅ event_hash column exists
✅ prev_hash column exists
✅ chain_position column exists
✅ recorded_at column exists
✅ Genesis event found
✅ UPDATE blocked by permissions
✅ DELETE blocked by permissions
✅ Test event inserted successfully
✅ All chain links valid
✅ Proof structure constraint enforced
✅ All positions unique
```

---

## Troubleshooting

### Issue: "Table reality_events does not exist"

**Solution:**
1. Run migration first: `migrations/041_realityos_event_ledger.sql`
2. Verify migration completed successfully
3. Check for errors in migration output

---

### Issue: "UPDATE/DELETE allowed"

**Solution:**
- Permissions may not be set correctly
- Check migration script ran completely
- Verify `REVOKE` statements executed

---

### Issue: "Genesis event missing"

**Solution:**
- Re-run migration
- Check migration script includes genesis event insertion
- Verify no errors during migration

---

### Issue: "Broken chain links"

**Solution:**
- This indicates data corruption
- Check if manual modifications were made
- Consider re-running migration on fresh database

---

## Manual Verification Queries

### Check Genesis Event
```sql
SELECT * FROM reality_events WHERE prev_hash IS NULL;
```

### Check Chain Integrity
```sql
SELECT 
    chain_position,
    event_hash,
    prev_hash,
    entity_id
FROM reality_events
ORDER BY chain_position;
```

### Check Event Count
```sql
SELECT COUNT(*) as total_events FROM reality_events;
```

### Check Constraints
```sql
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'reality_events'::regclass;
```

---

## Next Steps

After validation passes:

1. ✅ **Phase 2 Complete** - Event Ledger is working
2. 📝 **Commit Changes** - Save your progress
3. 🚀 **Proceed to Phase 3** - Reality Capture Gateway

---

**Last Updated:** 2025-02-20  
**Status:** Ready for testing


