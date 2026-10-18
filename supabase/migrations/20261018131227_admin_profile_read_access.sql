-- Admin reads use the stored profile role, not optional JWT custom claims.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE SCHEMA IF NOT EXISTS admin_private;
CREATE OR REPLACE FUNCTION admin_private.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text = 'admin');
$$;
REVOKE ALL ON FUNCTION admin_private.is_admin() FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA admin_private TO authenticated;
GRANT EXECUTE ON FUNCTION admin_private.is_admin() TO authenticated;
DROP POLICY IF EXISTS admin_profiles_read_database_role ON public.profiles;
CREATE POLICY admin_profiles_read_database_role ON public.profiles
  FOR SELECT TO authenticated USING ((SELECT admin_private.is_admin()));
-- No profile write privileges or policies are broadened.
COMMIT;
