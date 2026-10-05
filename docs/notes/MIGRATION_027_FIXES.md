# Migration 027 - Fixed Issues

## Problem
The migration was failing with error:
```
ERROR: 42703: column "user_id" does not exist
```

This happened because some tables don't have a `user_id` column, but the migration was trying to use it directly.

## Solution
Updated the migration to check for column existence before using it, similar to migration 026. The following tables now check for `user_id` column before creating policies:

1. **bending_calculations** - Fixed ✅
2. **machining_templates** - Fixed ✅ (also checks for `is_public`)
3. **mass_production_runs** - Fixed ✅
4. **predictive_maintenance_logs** - Fixed ✅
5. **thermal_analysis** - Fixed ✅

## How It Works

For each table, the migration now:
1. Checks if the table exists
2. Checks if `user_id` column exists
3. Creates appropriate policy based on available columns:
   - If `user_id` exists: Uses `user_id = auth.uid()` for user-specific access
   - If `user_id` doesn't exist: Uses `auth.role() = 'authenticated'` for general authenticated access

## Testing

After applying the migration, verify:

```sql
-- Check that policies were created successfully
SELECT schemaname, tablename, policyname, roles
FROM pg_policies
WHERE tablename IN (
    'bending_calculations',
    'machining_templates',
    'mass_production_runs',
    'predictive_maintenance_logs',
    'thermal_analysis'
)
ORDER BY tablename, policyname;
```

All policies should show `roles = ARRAY['authenticated']`.

## Next Steps

1. ✅ Apply the fixed migration
2. ⚠️ Enable Leaked Password Protection (see SUPABASE_DASHBOARD_GUIDE.md)
3. ⚠️ Upgrade PostgreSQL (see SUPABASE_DASHBOARD_GUIDE.md)

