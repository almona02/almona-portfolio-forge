-- Public registration always creates a normal user (the existing customer role).
-- Correct live default drift and do not trust user-editable signup metadata.
-- Existing account roles are intentionally unchanged.
SET lock_timeout = '5s';
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'customer'::public.user_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, is_verified)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, 'User'),
    'customer'::public.user_role,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Trigger execution is internal; this is not a browser-callable RPC.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
RESET lock_timeout;
