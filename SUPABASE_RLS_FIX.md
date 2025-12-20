# Supabase RLS Infinite Recursion Fix

## Problem

After importing a DXF profile and saving it, the application is getting this error:

```
Error: infinite recursion detected in policy for relation "profiles"
Code: 42P17
```

This is a **PostgreSQL/Supabase Row Level Security (RLS) policy issue**, not a frontend code issue.

## Root Cause

The RLS policies on the `profiles` table are creating a circular dependency. This typically happens when:

1. A policy references the same table it's protecting
2. Policies have circular dependencies between tables
3. A policy uses a function that queries the same table

## Solution

You need to fix the RLS policies in your Supabase dashboard. Here's how:

### Step 1: Access Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Policies** (or **Database** → **Policies**)
3. Find the `profiles` table

### Step 2: Review Current Policies

Check all RLS policies on the `profiles` table. Look for policies that:

- Reference `profiles` table within the policy definition
- Use functions that query `profiles`
- Have circular dependencies with other tables

### Step 3: Fix Common Issues

#### Issue 1: Policy References Same Table

**Bad:**
```sql
-- This creates infinite recursion
CREATE POLICY "Users can read their own profiles"
ON profiles FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM profiles WHERE id = profiles.id
  )
);
```

**Good:**
```sql
-- Direct comparison without subquery
CREATE POLICY "Users can read their own profiles"
ON profiles FOR SELECT
USING (auth.uid() = user_id);
```

#### Issue 2: Function Queries Same Table

**Bad:**
```sql
CREATE FUNCTION check_profile_access(profile_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = profile_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "Access check"
ON profiles FOR SELECT
USING (check_profile_access(id)); -- This can cause recursion
```

**Good:**
```sql
-- Use direct RLS without function, or use SECURITY INVOKER
CREATE POLICY "Users can read their own profiles"
ON profiles FOR SELECT
USING (auth.uid() = user_id);
```

### Step 3: Recommended Policy Structure

For the `profiles` table, use simple, direct policies:

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profiles
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own profiles
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own profiles
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own profiles
CREATE POLICY "Users can delete own profile"
ON profiles FOR DELETE
USING (auth.uid() = user_id);
```

### Step 4: Test the Fix

1. After updating policies, test by:
   - Importing a DXF file
   - Saving it to the library
   - Verifying it can be fetched without errors

2. Check Supabase logs for any remaining policy errors

## Temporary Workaround

The frontend code has been updated to:
- Catch the RLS error and prevent infinite retries
- Cache the error state to avoid repeated attempts
- Log clear error messages

However, **the database policies must be fixed** for the feature to work correctly.

## Verification

After fixing the policies, verify:

1. ✅ No more "infinite recursion" errors in console
2. ✅ Imported profiles can be saved successfully
3. ✅ Saved profiles can be fetched and displayed
4. ✅ Profile data appears in Profile Tuning Studio

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Best Practices](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Common RLS Mistakes](https://supabase.com/docs/guides/auth/row-level-security#common-mistakes)

