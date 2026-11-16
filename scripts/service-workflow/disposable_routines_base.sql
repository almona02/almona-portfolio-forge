-- Lane A disposable base: auth/profile stubs + workflow actor/audit helpers.
-- TEST-ONLY. Never apply to staging/production.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ra_auth') THEN CREATE ROLE ra_auth LOGIN; END IF;
END $$;
GRANT authenticated TO ra_auth;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
  SELECT NULLIF(current_setting('app.b1_uid', true), '')::uuid;
$$;
GRANT USAGE ON SCHEMA auth TO authenticated;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL
);

INSERT INTO auth.users (id) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1'),
  ('dddddddd-dddd-dddd-dddd-ddddddddddd1'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1')
ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'support'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'technician'),
  ('dddddddd-dddd-dddd-dddd-ddddddddddd1', 'customer'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', 'sales')
ON CONFLICT DO NOTHING;

CREATE SCHEMA IF NOT EXISTS admin_private;
REVOKE ALL ON SCHEMA admin_private FROM PUBLIC;
GRANT USAGE ON SCHEMA admin_private TO authenticated;

CREATE OR REPLACE FUNCTION admin_private.caller_uid()
RETURNS uuid LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT NULLIF(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
$$;
CREATE OR REPLACE FUNCTION admin_private.caller_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT p.role::text FROM public.profiles p WHERE p.id = admin_private.caller_uid();
$$;
CREATE OR REPLACE FUNCTION admin_private.is_service_role_request()
RETURNS boolean LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
  SELECT current_user IN ('service_role', 'supabase_admin')
    OR COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), '') = 'service_role';
$$;

CREATE OR REPLACE FUNCTION admin_private.workflow_resolve_actor(p_actor_id uuid)
RETURNS TABLE(uid uuid, role text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, admin_private AS $$
DECLARE
  v_uid uuid := admin_private.caller_uid();
  v_role text;
BEGIN
  IF v_uid IS NULL THEN
    IF NOT admin_private.is_service_role_request() THEN
      RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;
    IF p_actor_id IS NULL THEN
      RAISE EXCEPTION 'Service-role actor required' USING ERRCODE = '42501';
    END IF;
    v_uid := p_actor_id;
  ELSIF p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Actor impersonation not permitted' USING ERRCODE = '42501';
  END IF;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT p.role::text INTO v_role FROM public.profiles p WHERE p.id = v_uid;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Unknown actor' USING ERRCODE = '42501';
  END IF;
  uid := v_uid; role := v_role; RETURN NEXT;
END;
$$;

CREATE TABLE IF NOT EXISTS public.service_workflow_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid,
  entity_type text NOT NULL,
  entity_id uuid,
  actor_id uuid NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  from_state text,
  to_state text,
  rationale text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION admin_private.workflow_audit(
  p_ticket_id uuid, p_entity_type text, p_entity_id uuid, p_actor_id uuid, p_actor_role text,
  p_action text, p_from text, p_to text, p_rationale text, p_details jsonb DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO public.service_workflow_audit (
    ticket_id, entity_type, entity_id, actor_id, actor_role, action, from_state, to_state, rationale, details
  ) VALUES (
    p_ticket_id, p_entity_type, p_entity_id, p_actor_id, p_actor_role, p_action, p_from, p_to, p_rationale,
    COALESCE(p_details, '{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_private.caller_uid() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_private.caller_role() TO authenticated;
