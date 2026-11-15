-- Authenticated users must read their own profiles.role for client role routing.
-- Without this, AuthContext falls back to optimistic role=customer and
-- ProtectedRoute requireRoles(['technician',...]) bounces /technician to marketing home.
-- Staff ticket policies use admin_private.caller_role() (SECURITY DEFINER).
-- This policy does NOT allow reading other users' profiles.
-- Staging-only apply under B2 authorization. Production unauthorized.

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());
