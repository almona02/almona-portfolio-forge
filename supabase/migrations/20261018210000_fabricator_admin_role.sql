-- Role model: add "fabricator_admin" (factory owner), assignable by the Almona
-- admin (CEO). Fabricator admin is NOT "admin", so the /admin page guard keeps
-- redirecting them — only the CEO role reaches the Almona admin page.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'fabricator_admin';

-- Re-create the role-change RPC to accept the new role (unchanged security).
CREATE OR REPLACE FUNCTION public.admin_change_user_role(p_actor_id uuid, p_user_id uuid, p_role text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_actor public.profiles%ROWTYPE;
  v_target public.profiles%ROWTYPE;
  v_role public.profiles.role%TYPE;
BEGIN
  IF current_user <> 'service_role' OR COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Server access required' USING ERRCODE = '42501';
  END IF;
  IF p_role IS NULL OR p_role NOT IN ('customer', 'sales_rep', 'technician', 'support', 'fabricator_admin', 'admin') THEN
    RAISE EXCEPTION 'Invalid role' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(603951, 95);
  SELECT * INTO v_actor FROM public.profiles WHERE id = p_actor_id FOR UPDATE;
  IF NOT FOUND OR v_actor.role::text IS DISTINCT FROM 'admin' OR p_actor_id = p_user_id THEN
    RAISE EXCEPTION 'Role change is not permitted' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_target FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002'; END IF;
  IF v_target.role::text = p_role THEN RETURN jsonb_build_object('id', p_user_id, 'role', p_role); END IF;
  v_role := p_role;
  UPDATE public.profiles SET role = v_role WHERE id = p_user_id;
  INSERT INTO public.admin_audit_log(actor_id, actor_name, action, entity_type, entity_id, details)
  VALUES (p_actor_id, COALESCE(v_actor.full_name, v_actor.username, p_actor_id::text),
    'role_changed', 'profile', p_user_id::text,
    jsonb_build_object('previous_role', v_target.role, 'new_role', p_role));
  RETURN jsonb_build_object('id', p_user_id, 'role', p_role);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_change_user_role(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_change_user_role(uuid, uuid, text) TO service_role;

COMMIT;
