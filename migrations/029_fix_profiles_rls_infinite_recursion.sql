-- Migration 029: Fix infinite recursion in profiles RLS policies
-- Problem: Policies on profiles table use get_user_role() which queries profiles, causing infinite recursion
-- Solution: Remove get_user_role() from profiles policies, use direct checks instead
-- Step 1: Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
-- Step 2: Create fixed policies WITHOUT using get_user_role() or any function that queries profiles
-- These policies use direct comparisons and JWT claims to avoid recursion
-- Users can view their own profile (direct comparison, no subqueries)
CREATE POLICY "Users can view their own profile" ON public.profiles FOR
SELECT USING (auth.uid() = id);
-- Admins can view all profiles (using JWT claim, NOT get_user_role())
-- Note: This assumes admin role is set in JWT token via Supabase auth metadata
-- If you need to check role from database, you MUST use SECURITY DEFINER function
-- that bypasses RLS, OR use a different approach
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR
SELECT USING (
        auth.uid() = id
        OR (auth.jwt()->>'role') = 'admin'
        OR (auth.jwt()->>'user_role') = 'admin' -- Alternative: Check if role column exists and equals 'admin' (but this requires careful handling)
        -- OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        -- BUT: The above would cause recursion! So we use JWT claims instead.
    );
-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR
INSERT WITH CHECK (auth.uid() = id);
-- Service role can insert profiles (for triggers and admin operations)
CREATE POLICY "Service role can insert profiles" ON public.profiles FOR
INSERT WITH CHECK (true);
-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles FOR
UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
-- Optional: If you need admin update access, add this (using JWT, not get_user_role())
-- CREATE POLICY "Admins can update all profiles" 
-- ON public.profiles 
-- FOR UPDATE 
-- USING ((auth.jwt()->>'role') = 'admin')
-- WITH CHECK ((auth.jwt()->>'role') = 'admin');
-- Step 3: Verify policies are correct
-- Run this query to check:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'profiles';
-- Step 4: If you need to check admin role from database (not JWT), create a SECURITY DEFINER function
-- that bypasses RLS to avoid recursion:
-- First, drop existing function if it exists (with any parameter name variation)
DROP FUNCTION IF EXISTS public.is_admin(UUID);
DROP FUNCTION IF EXISTS public.is_admin(uuid);
DROP FUNCTION IF EXISTS public.is_admin(p_user_id UUID);
DROP FUNCTION IF EXISTS public.is_admin(p_user_id uuid);
-- Now create the new function
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID) RETURNS BOOLEAN AS $$
DECLARE user_role TEXT;
BEGIN -- SECURITY DEFINER bypasses RLS, so this won't cause recursion
SELECT role INTO user_role
FROM public.profiles
WHERE id = user_id;
RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
-- Then you can use it in policies like:
-- CREATE POLICY "Admins can view all profiles" 
-- ON public.profiles 
-- FOR SELECT 
-- USING (auth.uid() = id OR public.is_admin(auth.uid()));
-- However, the JWT approach is preferred as it's faster and doesn't require a function call.