-- The application and migration 011 use plan_type, not plan_id.
-- Fail before changing anything if a different subscription schema is deployed.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
      AND column_name = 'plan_type'
  ) THEN
    RAISE EXCEPTION 'Expected subscriptions.plan_type; inspect the deployed schema before applying this repair';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_free_subscription_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_type, projects_limit, status)
  VALUES (NEW.id, 'free', 3, 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_free_subscription ON public.profiles;
CREATE TRIGGER trigger_create_free_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_free_subscription_for_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, 'User'))
  ON CONFLICT (id) DO NOTHING;
  -- Do not swallow failures: auth, profile and subscription must commit together.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Repair missing rows only. Preserve existing roles and paid subscriptions.
INSERT INTO public.profiles (id, full_name)
SELECT u.id, COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), u.email, 'User')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subscriptions (user_id, plan_type, projects_limit, status)
SELECT p.id, 'free', 3, 'active' FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.id)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
