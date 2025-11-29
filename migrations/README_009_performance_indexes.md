# Database Performance Indexes - Migration Guide

## ⚠️ Important: CONCURRENTLY Limitation

PostgreSQL's `CREATE INDEX CONCURRENTLY` **cannot run inside a transaction block**. 

**Supabase SQL Editor ALWAYS wraps queries in transactions**, which causes this error:
```
ERROR: 25001: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
```

## ✅ Solution: Use the Non-Concurrent Version for Supabase

**For Supabase SQL Editor, you MUST use the non-concurrent version.**

### ✅ Option 1: Use Supabase-Compatible Version (RECOMMENDED)

**File:** `009_performance_indexes_SUPABASE.sql` ⭐ **USE THIS ONE**

1. Open Supabase SQL Editor
2. Copy the **ENTIRE** file content
3. Paste and execute all at once
4. Wait for completion (5-10 minutes)

**Benefits:**
- ✅ Works in Supabase SQL Editor
- ✅ Can run all at once
- ✅ Simple and straightforward

**Warnings:**
- ⚠️ Will briefly lock tables during creation
- ⚠️ For large tables, consider off-peak hours
- ⚠️ Each index takes seconds to minutes depending on table size

**Time:** ~5-10 minutes total

---

### Option 2: Alternative Non-Concurrent Version

**File:** `009_performance_indexes_no_concurrent.sql`

Same as Option 1, but with more detailed comments. Use `009_performance_indexes_SUPABASE.sql` instead (it's cleaner).

---

### Option 3: Use psql Command Line (If Available)

If you have access to `psql` command line:

```bash
# Connect to your database
psql -h your-db-host -U postgres -d postgres

# Run the migration
\i migrations/009_performance_indexes.sql
```

**Benefits:**
- ✅ CONCURRENTLY works properly
- ✅ Can run entire file at once
- ✅ Better for automation

---

## 📋 Step-by-Step: Recommended Approach

### ✅ For Supabase SQL Editor (RECOMMENDED)

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor

2. **Open the Supabase-compatible file**
   - File: `migrations/009_performance_indexes_SUPABASE.sql` ⭐

3. **Copy the entire file and execute:**
   - Select all (Ctrl+A / Cmd+A)
   - Copy (Ctrl+C / Cmd+C)
   - Paste into Supabase SQL Editor
   - Click "Run" or press Ctrl+Enter

4. **Wait for completion:**
   - Watch the progress in the SQL Editor
   - Should complete in 5-10 minutes
   - Each index will be created sequentially

5. **Verify indexes were created:**
   ```sql
   SELECT 
     schemaname,
     tablename,
     indexname,
     pg_size_pretty(pg_relation_size(indexrelid)) as size
   FROM pg_stat_user_indexes
   WHERE indexname LIKE 'idx_%'
     AND schemaname = 'public'
   ORDER BY tablename, indexname;
   ```

### For Development (Quick Setup)

1. **Open Supabase SQL Editor**
2. **Copy entire file:** `009_performance_indexes_no_concurrent.sql`
3. **Execute all at once**
4. **Done!** (May have brief table locks)

---

## 🔍 Verification Queries

### Check if indexes exist:
```sql
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
  AND schemaname = 'public'
ORDER BY tablename, indexname;
```

### Check index sizes:
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Check index usage (after some time):
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as times_used,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;
```

---

## 🚨 Troubleshooting

### Error: "relation does not exist"
- **Cause:** Table name doesn't match your schema
- **Solution:** Check your actual table names and update the migration file

### Error: "column does not exist"
- **Cause:** Column name doesn't match your schema
- **Solution:** Check your actual column names and update the migration file

### Error: "index already exists"
- **Cause:** Index was already created
- **Solution:** This is fine - `IF NOT EXISTS` should prevent this, but if it happens, the index is already there

### Index creation is slow
- **Normal:** Large tables take time to index
- **CONCURRENTLY** is slower but doesn't lock tables
- **Non-concurrent** is faster but locks tables

---

## 📊 Expected Indexes

After successful migration, you should have:

- `idx_profiles_project_id`
- `idx_inventory_remnants`
- `idx_optimization_results`
- `idx_orders_created_at`
- `idx_orders_customer_created`
- `idx_service_tickets_customer`
- `idx_service_tickets_status_created`
- `idx_quotes_digital_twin`
- `idx_quotes_customer_created`
- `idx_fabricator_profiles_user_brand`
- `idx_fabricator_profiles_stock_alerts`
- `idx_fabricator_accessories_user_type`
- `idx_workspace_snapshots_user_created`

**Total: 13 indexes**

---

## 🎯 Next Steps

After indexes are created:

1. **Monitor index usage** (run verification queries after a few days)
2. **Check query performance** (should see 50-80% improvement)
3. **Remove unused indexes** (if any show 0 usage after a week)

---

**Questions?** Check the main migration file comments or adjust table/column names to match your schema.

