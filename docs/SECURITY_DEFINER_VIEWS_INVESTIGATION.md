# Security Definer Views Investigation

## Problem

Two views are being flagged by Supabase linter as having `SECURITY DEFINER` property:
- `public.qr_lifecycle_audit`
- `public.reality_events_readonly`

## Root Cause Analysis

### Important: Views Don't Have SECURITY DEFINER

In PostgreSQL, **only functions** can have `SECURITY DEFINER` or `SECURITY INVOKER` properties. Views do not have this property. However, the Supabase linter flags views that:

1. **Are owned by a superuser** (`postgres` role)
2. **Might be confused with functions** (if a function with the same name exists)
3. **Have dependencies on SECURITY DEFINER functions**

### Current State

Based on the investigation:
- Both views are owned by `postgres` (superuser)
- No functions with these names exist
- Views are simple SELECT statements with no function calls

## Solution

### Migration 044: Comprehensive Fix

The migration `044_diagnose_and_fix_security_definer_views.sql` provides:

1. **Diagnostics** - Checks current state of views, functions, and dependencies
2. **Aggressive Cleanup** - Drops all variations (functions, views, materialized views)
3. **Recreation** - Creates views as simple SELECT statements
4. **Ownership Change** - Attempts to change ownership from `postgres` to `authenticator`
5. **Verification** - Checks final state and warns if ownership change failed

### Manual Fix (If Automatic Fails)

If the automatic ownership change fails (requires superuser privileges), run these commands manually in Supabase SQL Editor:

```sql
-- Change ownership to authenticator (non-superuser role)
ALTER VIEW public.qr_lifecycle_audit OWNER TO authenticator;
ALTER VIEW public.reality_events_readonly OWNER TO authenticator;

-- Verify ownership changed
SELECT schemaname, viewname, viewowner 
FROM pg_views 
WHERE viewname IN ('qr_lifecycle_audit', 'reality_events_readonly');
```

Both views should show `viewowner = 'authenticator'` (not `postgres`).

## Why This Works

The Supabase linter flags views owned by superusers because:
- Superuser-owned objects can bypass RLS in certain contexts
- The linter assumes superuser ownership = potential security risk
- Changing ownership to a regular role (`authenticator`) removes the flag

## Alternative Solutions

If changing ownership doesn't work, consider:

1. **Create a dedicated role** for view ownership:
   ```sql
   CREATE ROLE view_owner;
   ALTER VIEW public.qr_lifecycle_audit OWNER TO view_owner;
   ALTER VIEW public.reality_events_readonly OWNER TO view_owner;
   ```

2. **Use SECURITY INVOKER functions** instead of views (if views are not required):
   ```sql
   CREATE FUNCTION public.qr_lifecycle_audit()
   RETURNS TABLE(...)
   LANGUAGE sql
   SECURITY INVOKER  -- Explicitly set
   AS $$
   SELECT ... FROM public.qr_lifecycle ...
   $$;
   ```

3. **Contact Supabase Support** if the linter continues to flag views after ownership change

## Verification Queries

After running the migration, verify with:

```sql
-- Check view ownership
SELECT schemaname, viewname, viewowner 
FROM pg_views 
WHERE viewname IN ('qr_lifecycle_audit', 'reality_events_readonly');

-- Check for functions with same names (should return 0 rows)
SELECT n.nspname, p.proname, p.prosecdef
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('qr_lifecycle_audit', 'reality_events_readonly');

-- Check view definitions
SELECT schemaname, viewname, definition
FROM pg_views
WHERE viewname IN ('qr_lifecycle_audit', 'reality_events_readonly');
```

## Expected Results

After successful fix:
- ✅ Views owned by `authenticator` (or another non-superuser role)
- ✅ No functions with same names exist
- ✅ Views are simple SELECT statements
- ✅ Linter no longer flags them as SECURITY DEFINER

## Related Files

- `migrations/044_diagnose_and_fix_security_definer_views.sql` - Comprehensive fix
- `migrations/043_fix_security_linter_issues.sql` - Original fix attempt
- `migrations/041_realityos_event_ledger.sql` - Original view creation
- `migrations/042_qr_lifecycle.sql` - Original view creation

