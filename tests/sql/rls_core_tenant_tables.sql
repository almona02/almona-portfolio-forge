-- Fails closed if any core tenant table lacks row level security, its
-- owner-scoped policy set, or still grants privileges to anon.
-- Run against a database built from supabase/migrations:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f tests/sql/rls_core_tenant_tables.sql
DO $$
DECLARE
  target RECORD;
  rls_enabled BOOLEAN;
  policy_count INTEGER;
  anon_grants INTEGER;
BEGIN
  FOR target IN
    SELECT * FROM (VALUES
      ('fabricator_positions',    'owner_user_id'),
      ('fabricator_positions_v2', 'owner_user_id'),
      ('fabricator_projects',     'owner_user_id'),
      ('fabricator_projects_v2',  'owner_user_id'),
      ('fabricator_profiles',     'user_id'),
      ('orders',                  'user_id'),
      ('stock_movements',         'user_id')
    ) AS t(table_name, owner_column)
  LOOP
    SELECT c.relrowsecurity INTO rls_enabled
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = target.table_name;

    IF rls_enabled IS NULL THEN
      RAISE EXCEPTION 'tenant table public.% is missing', target.table_name;
    END IF;
    IF rls_enabled IS NOT TRUE THEN
      RAISE EXCEPTION 'public.% has row level security DISABLED', target.table_name;
    END IF;

    SELECT count(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = target.table_name
      AND policyname IN (
        target.table_name || '_select_own',
        target.table_name || '_insert_own',
        target.table_name || '_update_own',
        target.table_name || '_delete_own'
      );
    IF policy_count <> 4 THEN
      RAISE EXCEPTION 'public.% has % of 4 owner-scoped policies', target.table_name, policy_count;
    END IF;

    SELECT count(*) INTO anon_grants
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = target.table_name AND grantee = 'anon';
    IF anon_grants <> 0 THEN
      RAISE EXCEPTION 'public.% still grants % privileges to anon', target.table_name, anon_grants;
    END IF;
  END LOOP;
  RAISE NOTICE 'RLS assertion passed for 7 core tenant tables';
END $$;