# 🔴 URGENT: Fix Profiles RLS Infinite Recursion

## The Problem

Your `profiles` table RLS policies are causing infinite recursion because they use `get_user_role()` which queries the `profiles` table itself.

## Quick Fix (Copy & Paste into Supabase SQL Editor)

```sql
-- Step 1: Drop all existing policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

-- Step 2: Create fixed policies (NO get_user_role() calls!)
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  auth.uid() = id 
  OR (auth.jwt()->>'role') = 'admin'
  OR (auth.jwt()->>'user_role') = 'admin'
);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role can insert profiles" 
ON public.profiles FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

## What Changed?

1. ✅ **Removed `get_user_role()` calls** - This was causing the recursion
2. ✅ **Used JWT claims for admin check** - `(auth.jwt()->>'role') = 'admin'` reads from token, not database
3. ✅ **Direct comparisons only** - `auth.uid() = id` is simple and fast

## If JWT Claims Don't Work

If your JWT doesn't have the role claim, use this SECURITY DEFINER function instead:

```sql
-- Drop existing function first (in case it has different parameter name)
DROP FUNCTION IF EXISTS public.is_admin(UUID);
DROP FUNCTION IF EXISTS public.is_admin(p_user_id UUID);

-- Create function that bypasses RLS
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE id = user_id;
  
  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Then update the admin policy:
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id OR public.is_admin(auth.uid()));
```

**Why this works:** `SECURITY DEFINER` functions bypass RLS, so they won't trigger the recursion.

## Verify the Fix

After running the SQL:

1. ✅ Try importing a DXF file
2. ✅ Save it to the library
3. ✅ Check browser console - no more "infinite recursion" errors
4. ✅ Profile should load in Profile Tuning Studio

## Your Current Policies (for reference)

Based on what you showed me:
- ✅ "Admins can view all profiles" - SELECT - authenticated, anonymous
- ✅ "Service role can insert profiles" - INSERT - public, anonymous  
- ✅ "Users can insert their own profile" - INSERT - public, anonymous
- ✅ "Users can update their own profile" - UPDATE - authenticated, anonymous
- ✅ "Users can view their own profile" - SELECT - authenticated, anonymous

The issue is likely in the **"Admins can view all profiles"** policy definition - it's probably using `get_user_role()`.

## Next Steps

1. **Run the SQL above** in Supabase SQL Editor
2. **Test** importing and saving a DXF profile
3. **Check logs** - errors should be gone
4. **If still broken**, check Supabase logs for the exact policy SQL that's failing

