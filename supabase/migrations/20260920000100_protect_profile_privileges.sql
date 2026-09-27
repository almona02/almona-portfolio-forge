-- Browser clients may edit their profile, but never its authority fields.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Check both the SQL role and the signed request role. This also protects
  -- writes made through SECURITY DEFINER functions on behalf of a browser.
  IF current_user IN ('anon', 'authenticated')
     OR COALESCE(auth.role(), '') IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.id IS DISTINCT FROM auth.uid()
         OR NEW.role::text IS DISTINCT FROM 'customer'
         OR NEW.is_verified IS DISTINCT FROM false
         OR COALESCE(to_jsonb(NEW)->'workshop_id', 'null'::jsonb) <> 'null'::jsonb THEN
        RAISE EXCEPTION 'Profile privileges can only be assigned by the server'
          USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR (to_jsonb(NEW)->'workshop_id') IS DISTINCT FROM (to_jsonb(OLD)->'workshop_id') THEN
      RAISE EXCEPTION 'Profile privileges can only be changed by the server'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileges ON public.profiles;
CREATE TRIGGER protect_profile_privileges
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

-- The deployed policy was named "Service role" but actually applied to PUBLIC.
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles" ON public.profiles
  FOR INSERT TO service_role WITH CHECK (true);

-- RLS does not protect TRUNCATE, REFERENCES or TRIGGER privileges.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.profiles FROM anon, authenticated;
COMMIT;
