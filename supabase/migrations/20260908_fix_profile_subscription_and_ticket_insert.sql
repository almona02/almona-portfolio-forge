-- AICS-001: Deterministic schema repair (no ML).
-- Apply in Supabase SQL Editor if CLI is not wired to this project.
--
-- Production 2026-09-08:
--   INSERT profiles failed: column "plan_id" of relation "subscriptions" does not exist
--   (trigger create_free_subscription_for_new_user from migration 024).
--   Live subscriptions table uses plan_type (migration 011), not plan_id.
--   Ticket create then 403/FK because service_tickets.user_id → profiles.id.

CREATE OR REPLACE FUNCTION public.create_free_subscription_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  has_table boolean;
  has_plan_type boolean;
  has_plan_id boolean;
  has_projects_limit boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
  ) INTO has_table;
  IF NOT has_table THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'plan_type'
  ) INTO has_plan_type;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'plan_id'
  ) INTO has_plan_id;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'projects_limit'
  ) INTO has_projects_limit;

  BEGIN
    IF has_plan_type AND has_projects_limit THEN
      INSERT INTO public.subscriptions (user_id, plan_type, projects_limit, status)
      VALUES (NEW.id, 'free', 3, 'active')
      ON CONFLICT (user_id) DO NOTHING;
    ELSIF has_plan_type THEN
      INSERT INTO public.subscriptions (user_id, plan_type, status)
      VALUES (NEW.id, 'free', 'active')
      ON CONFLICT (user_id) DO NOTHING;
    ELSIF has_plan_id THEN
      INSERT INTO public.subscriptions (user_id, plan_id, status)
      VALUES (NEW.id, 'free', 'active')
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  EXCEPTION
    WHEN undefined_column OR undefined_table OR unique_violation OR not_null_violation THEN
      RAISE WARNING 'create_free_subscription_for_new_user skipped: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_free_subscription ON public.profiles;
CREATE TRIGGER trigger_create_free_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_free_subscription_for_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, 'User')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user profile insert skipped: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Safety net: authenticated users may insert their own profile if the trigger failed.
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

GRANT INSERT ON public.profiles TO authenticated;

-- Existing auth users (e.g. operator) who never got a profiles row.
INSERT INTO public.profiles (id, full_name)
SELECT
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), u.email, 'User')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Ticket create: owner insert must succeed once the profile row exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'service_tickets'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can create their own tickets" ON public.service_tickets';
    EXECUTE $policy$
      CREATE POLICY "Users can create their own tickets" ON public.service_tickets
        FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = user_id)
    $policy$;
  END IF;
END;
$$;

-- Optional inspect (do not run as a migration step):
-- SELECT polname, polcmd, pg_get_expr(polqual, polrelid) AS using_expr
-- FROM pg_policy
-- WHERE polrelid = 'public.service_tickets'::regclass;
-- If a SELECT policy uses `true` for authenticated, tighten later after
-- confirming staff/admin policies exist. Do not drop those blindly.
