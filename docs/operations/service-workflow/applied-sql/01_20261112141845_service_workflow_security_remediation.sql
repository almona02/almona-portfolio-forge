-- Corrective migration: B1/B2 staging security remediation.
-- Does NOT rewrite applied B1/B2 history (20261111222941 / 20261111223057).
-- Staging-only apply after Spark review. Production unauthorized. #155 frozen; #156 draft.
--
-- Fixes:
-- 1) workflow_resolve_actor: reject anonymous even with p_actor_id; actor override
--    only in verified service_role context; authenticated cannot impersonate.
-- 2) Activation durability: workflow_activated_at/by immutable once set (all roles).
-- 3) Close direct service_jobs writes for clients/service_role; RPC-only path.
-- 4) Strip anon EXECUTE (Supabase default privileges re-granted anon despite
--    REVOKE FROM PUBLIC in B1/B2). Restore contained entry points with secured defs.
-- 5) create_service_job accepts optional p_actor_id for legitimate service-role.


-- ---------------------------------------------------------------------------
-- 1) Shared actor resolver (all B1/B2 SECURITY DEFINER RPCs depend on this)
-- ---------------------------------------------------------------------------
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
    -- Anonymous / no JWT subject: never trust p_actor_id unless verified service_role
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

  uid := v_uid;
  role := v_role;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION admin_private.workflow_resolve_actor(uuid) FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION admin_private.workflow_resolve_actor(uuid) TO postgres';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION admin_private.workflow_resolve_actor(uuid) TO service_role';
  END IF;
END $$;
