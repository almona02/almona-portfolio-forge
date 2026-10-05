# Quick Fix for 500 Error on Registration

## The Problem
You're getting a 500 error from Supabase's `/auth/v1/signup` endpoint. This means the database trigger is failing when trying to create the user profile.

## Immediate Solution

**Run this migration FIRST** - it's the most defensive version:

### Migration 015 (Simplified & Safe)
**File:** `migrations/015_simplified_trigger_fix.sql`

This version:
- Creates a basic profile first (minimal fields)
- Then updates it with additional fields
- Has multiple layers of error handling
- Will NOT block user creation even if profile creation fails

### Steps:
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of `migrations/015_simplified_trigger_fix.sql`
3. Click **Run**
4. Test registration again

## If Migration 015 Still Fails

Try the more robust version:

### Migration 013 (Enhanced Error Handling)
**File:** `migrations/013_fix_user_registration_trigger.sql`

This has better validation but is more complex.

## Debugging Steps

If you still get 500 errors after running migrations:

### 1. Check Supabase Logs
- Go to **Logs** → **Postgres Logs**
- Look for errors related to `handle_new_user` function
- Check for any constraint violations or type errors

### 2. Test the Trigger Manually
Run this in SQL Editor to see if the function exists and works:

```sql
-- Check if function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Check if trigger exists
SELECT * FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
```

### 3. Check Table Structure
```sql
-- Verify profiles table has all required columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;
```

### 4. Check RLS Policies
```sql
-- List all policies on profiles table
SELECT * FROM pg_policies 
WHERE tablename = 'profiles';
```

## Common Issues & Solutions

### Issue: "invalid input value for enum sector_type"
**Solution:** The sector value doesn't match the enum. Migration 015 handles this automatically.

### Issue: "null value in column violates not-null constraint"
**Solution:** Migration 015 uses COALESCE and NULLIF to handle nulls safely.

### Issue: "permission denied for table profiles"
**Solution:** Run migration 014 to add INSERT policy.

### Issue: "relation profiles does not exist"
**Solution:** Run the initial schema migration first (`migrations/001_initial_schema.sql`).

## Recommended Migration Order

1. **First:** Run `migrations/015_simplified_trigger_fix.sql` (safest)
2. **Then:** Run `migrations/014_add_profiles_insert_policy.sql` (for safety)
3. **If needed:** Run `migrations/013_fix_user_registration_trigger.sql` (more features)

## After Running Migrations

1. Clear browser cache
2. Try registering a new user
3. Check browser console for any client-side errors
4. Check Supabase logs for database errors
5. Verify profile was created in Table Editor

## Still Having Issues?

Share:
1. The exact error message from browser console
2. Any errors from Supabase Postgres Logs
3. The result of the manual trigger test queries above

