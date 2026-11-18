-- Auth-aware prelude for the isolated Lane C checklist browser stack.
-- Does not replace auth.uid() and does not insert into auth.users.
-- Local disposable only. Never staging, production, or FR-1.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own_lane_c ON public.profiles;
CREATE POLICY profiles_select_own_lane_c ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

GRANT SELECT ON TABLE public.profiles TO authenticated;

CREATE SCHEMA IF NOT EXISTS admin_private;
REVOKE ALL ON SCHEMA admin_private FROM PUBLIC;
GRANT USAGE ON SCHEMA admin_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION admin_private.caller_uid()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT NULLIF(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
$$;

CREATE OR REPLACE FUNCTION admin_private.caller_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT p.role::text FROM public.profiles p WHERE p.id = admin_private.caller_uid();
$$;

CREATE OR REPLACE FUNCTION admin_private.is_service_role_request()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$
  SELECT current_user IN ('service_role', 'supabase_admin', 'postgres')
    OR COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), '') = 'service_role';
$$;

CREATE OR REPLACE FUNCTION admin_private.workflow_resolve_actor(p_actor_id uuid)
RETURNS TABLE(uid uuid, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
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
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.service_workflow_audit (
    ticket_id, entity_type, entity_id, actor_id, actor_role, action, from_state, to_state, rationale, details
  ) VALUES (
    p_ticket_id, p_entity_type, p_entity_id, p_actor_id, p_actor_role, p_action, p_from, p_to, p_rationale,
    COALESCE(p_details, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION admin_private.caller_uid() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION admin_private.caller_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_private.caller_uid() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_private.caller_role() TO authenticated;
