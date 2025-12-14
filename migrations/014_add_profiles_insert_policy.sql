-- Migration 014: Add INSERT policy for profiles table
-- This allows authenticated users to insert their own profile if the trigger fails
-- Note: The trigger should handle this automatically, but this is a safety net
-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
-- Create INSERT policy for authenticated users to insert their own profile
-- This is useful if the trigger fails or if we need to manually create profiles
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR
INSERT WITH CHECK (auth.uid() = id);
-- Also allow service role to insert (for triggers and admin operations)
-- Note: SECURITY DEFINER functions bypass RLS, but this is for completeness
CREATE POLICY "Service role can insert profiles" ON public.profiles FOR
INSERT WITH CHECK (true);
-- Grant INSERT permission to authenticated role
GRANT INSERT ON public.profiles TO authenticated;