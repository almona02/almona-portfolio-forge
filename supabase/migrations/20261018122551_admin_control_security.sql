-- PR95 follow-up: preserve browser privilege protections; audit real DB mutations.
BEGIN;
SET LOCAL lock_timeout = '5s';
-- The original schema predates the support role already offered by the UI.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'support';

-- Clients may read history but cannot manufacture actor identities or fake events.
DROP POLICY IF EXISTS admin_audit_insert_admin ON public.admin_audit_log;
REVOKE INSERT, UPDATE, DELETE ON public.admin_audit_log FROM PUBLIC, anon, authenticated;

CREATE SCHEMA IF NOT EXISTS admin_private;
REVOKE ALL ON SCHEMA admin_private FROM PUBLIC, anon, authenticated;

-- Definer is needed only to append history while the caller has read-only grants.
-- Kept outside exposed schemas; not callable by browser roles.
CREATE OR REPLACE FUNCTION admin_private.record_entity_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_name text;
  v_action text;
  v_details jsonb;
BEGIN
  IF TG_TABLE_NAME = 'products' THEN
    IF NEW.price IS NOT DISTINCT FROM OLD.price THEN RETURN NEW; END IF;
    v_action := 'price_updated';
    v_details := jsonb_build_object('sku', NEW.sku, 'previous_price', OLD.price, 'new_price', NEW.price);
  ELSIF TG_TABLE_NAME = 'service_tickets' THEN
    IF NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to
       AND NEW.status IS NOT DISTINCT FROM OLD.status
       AND NEW.priority IS NOT DISTINCT FROM OLD.priority THEN RETURN NEW; END IF;
    v_action := CASE WHEN NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN 'ticket_assigned'
                     WHEN NEW.status IS DISTINCT FROM OLD.status THEN 'ticket_status'
                     ELSE 'ticket_priority' END;
    v_details := jsonb_build_object(
      'previous_assigned_to', OLD.assigned_to, 'assigned_to', NEW.assigned_to,
      'previous_status', OLD.status, 'new_status', NEW.status,
      'previous_priority', OLD.priority, 'new_priority', NEW.priority);
  ELSE
    RAISE EXCEPTION 'Unsupported audit source';
  END IF;
  SELECT COALESCE(p.full_name, p.username) INTO v_name FROM public.profiles p WHERE p.id = v_actor;
  INSERT INTO public.admin_audit_log(actor_id, actor_name, action, entity_type, entity_id, details)
  VALUES (v_actor, COALESCE(v_name, CASE WHEN v_actor IS NULL THEN 'Server' ELSE v_actor::text END),
          v_action, CASE WHEN TG_TABLE_NAME = 'products' THEN 'product' ELSE 'ticket' END, NEW.id::text, v_details);
  -- Any insertion failure aborts the enclosing business mutation too.
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION admin_private.record_entity_change() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS admin_audit_product_price ON public.products;
CREATE TRIGGER admin_audit_product_price AFTER UPDATE OF price ON public.products
  FOR EACH ROW EXECUTE FUNCTION admin_private.record_entity_change();
DROP TRIGGER IF EXISTS admin_audit_ticket_change ON public.service_tickets;
CREATE TRIGGER admin_audit_ticket_change AFTER UPDATE OF assigned_to, status, priority ON public.service_tickets
  FOR EACH ROW EXECUTE FUNCTION admin_private.record_entity_change();

-- Only the Edge Function's server client may call this transaction. It verifies
-- the caller's JWT via Auth and supplies the verified id, never a request-body id.
-- SECURITY INVOKER leaves protect_profile_privileges fully intact for browsers.
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
  IF p_role IS NULL OR p_role NOT IN ('customer', 'sales_rep', 'technician', 'support', 'admin') THEN
    RAISE EXCEPTION 'Invalid role' USING ERRCODE = '22023';
  END IF;
  -- Serialize this endpoint's role edits and recheck authority under row locks.
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
