-- Disposable PostgreSQL only. Never run against a linked Supabase database.
-- psql -v ON_ERROR_STOP=1 -d approval_replay_test_<suffix> -f <this file>
\set ON_ERROR_STOP on
DO $test$ BEGIN
  IF current_database() !~ '^approval_replay_test_' THEN
    RAISE EXCEPTION 'This fixture requires a disposable approval_replay_test_ database';
  END IF;
END $test$;

DO $roles$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $roles$;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
CREATE TABLE public.fabricator_manufacturing_authority_revisions (
  approval_id uuid PRIMARY KEY, system_pack_id text, system_pack_revision bigint,
  authority_payload jsonb, approved_by uuid REFERENCES auth.users(id)
);
CREATE TABLE public.fabricator_projects_v2 (id uuid PRIMARY KEY, owner_user_id uuid);
CREATE TABLE public.fabricator_projects (LIKE public.fabricator_projects_v2 INCLUDING ALL);
CREATE TABLE public.fabricator_positions_v2 (
  id uuid PRIMARY KEY, owner_user_id uuid, qc_revision bigint, system_pack_id text, project_id uuid
);
CREATE TABLE public.fabricator_positions (LIKE public.fabricator_positions_v2 INCLUDING ALL);
INSERT INTO auth.users VALUES ('10000000-0000-0000-0000-000000000001'), ('10000000-0000-0000-0000-000000000002');
INSERT INTO public.fabricator_projects_v2 VALUES ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');
INSERT INTO public.fabricator_positions_v2 VALUES (
  '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
  1, 'fixture-pack', '20000000-0000-0000-0000-000000000001'
);

-- Cold install must retain the original privilege boundary and valid request path.
\ir ../../supabase/migrations/20261006000000_manufacturing_approval_requests.sql
DO $test$ BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.fabricator_manufacturing_approval_requests'::regclass)
     OR has_table_privilege('anon', 'public.fabricator_manufacturing_approval_requests', 'SELECT')
     OR has_table_privilege('authenticated', 'public.fabricator_manufacturing_approval_requests', 'INSERT')
     OR has_function_privilege('anon', 'public.request_fabricator_manufacturing_approval(uuid,bigint,text,text,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.review_fabricator_manufacturing_approval(uuid,uuid,jsonb)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.review_fabricator_manufacturing_approval(uuid,uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Cold-install grants/RLS regression';
  END IF;
END $test$;
INSERT INTO public.fabricator_manufacturing_approval_requests
  (owner_user_id, position_id, position_revision, system_pack_id, catalogue_reference, rule_reference, notes)
VALUES ('10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 1, 'fixture-pack', 'catalogue', 'rules', 'other owner');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
SELECT public.request_fabricator_manufacturing_approval('30000000-0000-0000-0000-000000000001',1,'catalogue','rules','fixture');
DO $test$ BEGIN
  IF (SELECT count(*) FROM public.fabricator_manufacturing_approval_requests) <> 1
     OR EXISTS (SELECT 1 FROM public.fabricator_manufacturing_approval_requests WHERE owner_user_id='10000000-0000-0000-0000-000000000002') THEN
    RAISE EXCEPTION 'Owner isolation regression';
  END IF;
END $test$;
RESET ROLE;

-- Simulate definitions and stricter ACLs installed by a later migration.
CREATE OR REPLACE FUNCTION public.request_fabricator_manufacturing_approval(p_position_id uuid,p_expected_revision bigint,p_catalogue_reference text,p_rule_reference text,p_notes text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN RAISE EXCEPTION 'later hardened request'; END;
$$;
REVOKE ALL ON FUNCTION public.request_fabricator_manufacturing_approval(uuid,bigint,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.request_fabricator_manufacturing_approval(uuid,bigint,text,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.review_fabricator_manufacturing_approval(p_request_id uuid,p_approved_by uuid,p_authority_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN RAISE EXCEPTION 'later hardened review'; END;
$$;
ALTER POLICY owner_read_approval_requests ON public.fabricator_manufacturing_approval_requests
  USING (owner_user_id=auth.uid() AND notes <> 'future-blocked');
CREATE TEMP TABLE replay_snapshot AS SELECT
  (SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM public.fabricator_manufacturing_approval_requests r) AS rows,
  pg_get_functiondef('public.request_fabricator_manufacturing_approval(uuid,bigint,text,text,text)'::regprocedure) AS request_body,
  pg_get_functiondef('public.review_fabricator_manufacturing_approval(uuid,uuid,jsonb)'::regprocedure) AS review_body,
  (SELECT qual FROM pg_policies WHERE schemaname='public' AND tablename='fabricator_manufacturing_approval_requests' AND policyname='owner_read_approval_requests') AS policy;

-- Warm replay twice must be safe and must not restore historical RPCs or grants.
\ir ../../supabase/migrations/20261006000000_manufacturing_approval_requests.sql
\ir ../../supabase/migrations/20261006000000_manufacturing_approval_requests.sql
DO $test$ BEGIN
  IF (SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM public.fabricator_manufacturing_approval_requests r)
       IS DISTINCT FROM (SELECT rows FROM replay_snapshot)
     OR pg_get_functiondef('public.request_fabricator_manufacturing_approval(uuid,bigint,text,text,text)'::regprocedure)
       IS DISTINCT FROM (SELECT request_body FROM replay_snapshot)
     OR pg_get_functiondef('public.review_fabricator_manufacturing_approval(uuid,uuid,jsonb)'::regprocedure)
       IS DISTINCT FROM (SELECT review_body FROM replay_snapshot)
     OR (SELECT qual FROM pg_policies WHERE schemaname='public' AND tablename='fabricator_manufacturing_approval_requests' AND policyname='owner_read_approval_requests')
       IS DISTINCT FROM (SELECT policy FROM replay_snapshot)
     OR has_function_privilege('authenticated', 'public.request_fabricator_manufacturing_approval(uuid,bigint,text,text,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.review_fabricator_manufacturing_approval(uuid,uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Replay changed data, hardened RPCs, policy or grants';
  END IF;
END $test$;

-- A missing RPC is restored without replacing the existing hardened sibling.
DROP FUNCTION public.review_fabricator_manufacturing_approval(uuid,uuid,jsonb);
\ir ../../supabase/migrations/20261006000000_manufacturing_approval_requests.sql
DO $test$ BEGIN
  IF NOT has_function_privilege('service_role', 'public.review_fabricator_manufacturing_approval(uuid,uuid,jsonb)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.review_fabricator_manufacturing_approval(uuid,uuid,jsonb)', 'EXECUTE')
     OR pg_get_functiondef('public.request_fabricator_manufacturing_approval(uuid,bigint,text,text,text)'::regprocedure)
       IS DISTINCT FROM (SELECT request_body FROM replay_snapshot) THEN
    RAISE EXCEPTION 'Missing-object repair failed';
  END IF;
END $test$;
SELECT 'PASS: cold install, owner isolation, repeated replay, hardened RPC/policy/ACL preservation and missing-RPC initialization' AS result;
