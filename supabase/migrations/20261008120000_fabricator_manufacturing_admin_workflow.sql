-- #54 rewrite: manufacturing authority admin workflow (schema + RPCs only).
-- NO blanket provenance='seed' approvals for catalogue packs.
-- Fail-closed admin checks (IS DISTINCT FROM TRUE). Local/staging only — STOP before remote apply.
BEGIN;

-- Admin helper first (policies/RPCs depend on it). Never returns NULL.
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
STABLE
AS $$
DECLARE user_role TEXT;
BEGIN
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  RETURN COALESCE(user_role = 'admin', false);
END;
$$;
REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Schema: provenance + audit
-- ---------------------------------------------------------------------------
ALTER TABLE public.fabricator_manufacturing_authority_revisions
  ADD COLUMN IF NOT EXISTS provenance TEXT NOT NULL DEFAULT 'manual'
    CHECK (provenance IN ('manual', 'seed', 'admin_review'));

CREATE TABLE IF NOT EXISTS public.fabricator_manufacturing_authority_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL CHECK (event IN ('seed', 'approve', 'reject', 'revoke')),
  actor_user_id UUID REFERENCES auth.users(id),
  system_pack_id TEXT,
  approval_id UUID,
  request_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fabricator_manufacturing_authority_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fabricator_manufacturing_authority_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.fabricator_manufacturing_authority_audit TO authenticated;

DROP POLICY IF EXISTS admin_read_authority_audit ON public.fabricator_manufacturing_authority_audit;
CREATE POLICY admin_read_authority_audit ON public.fabricator_manufacturing_authority_audit
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) IS TRUE);

-- ---------------------------------------------------------------------------
-- Admin list pending requests
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_manufacturing_approval_requests(
  p_status TEXT DEFAULT 'pending'
)
RETURNS TABLE (
  id UUID,
  owner_user_id UUID,
  position_id UUID,
  position_revision BIGINT,
  system_pack_id TEXT,
  catalogue_reference TEXT,
  rule_reference TEXT,
  notes TEXT,
  status TEXT,
  approval_id UUID,
  requested_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  -- Fail closed: NULL / false both deny (IS DISTINCT FROM TRUE).
  IF public.is_admin(auth.uid()) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'admin role required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT r.id, r.owner_user_id, r.position_id, r.position_revision, r.system_pack_id,
           r.catalogue_reference, r.rule_reference, r.notes, r.status, r.approval_id, r.requested_at
    FROM public.fabricator_manufacturing_approval_requests r
    WHERE (p_status IS NULL OR r.status = p_status)
    ORDER BY r.requested_at DESC
    LIMIT 200;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_manufacturing_approval_requests(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_manufacturing_approval_requests(TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- Admin approve pending request (calls service-only review RPC internally)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_approve_fabricator_manufacturing_approval(
  p_request_id UUID,
  p_authority_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_id UUID;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF public.is_admin(v_admin) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'admin role required' USING ERRCODE = '42501';
  END IF;

  -- Reuse service_role review implementation; browser never holds the service key.
  v_id := public.review_fabricator_manufacturing_approval(p_request_id, v_admin, p_authority_payload);

  UPDATE public.fabricator_manufacturing_authority_revisions
    SET provenance = 'admin_review'
    WHERE approval_id = v_id;

  INSERT INTO public.fabricator_manufacturing_authority_audit(
    event, actor_user_id, approval_id, request_id, system_pack_id, details
  )
  SELECT 'approve', v_admin, v_id, p_request_id, r.system_pack_id, jsonb_build_object('via', 'admin_rpc')
  FROM public.fabricator_manufacturing_approval_requests r WHERE r.id = p_request_id;

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_approve_fabricator_manufacturing_approval(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_fabricator_manufacturing_approval(UUID, JSONB) TO authenticated;

-- ---------------------------------------------------------------------------
-- Admin reject pending request
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reject_fabricator_manufacturing_approval(
  p_request_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_request public.fabricator_manufacturing_approval_requests;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF public.is_admin(v_admin) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'admin role required' USING ERRCODE = '42501';
  END IF;
  IF coalesce(length(trim(p_reason)), 0) < 3 THEN
    RAISE EXCEPTION 'rejection reason required';
  END IF;

  SELECT * INTO STRICT v_request
  FROM public.fabricator_manufacturing_approval_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'request already reviewed';
  END IF;

  UPDATE public.fabricator_manufacturing_approval_requests
    SET status = 'rejected', notes = trim(coalesce(notes, '') || E'\n[reject] ' || trim(p_reason))
    WHERE id = p_request_id;

  INSERT INTO public.fabricator_manufacturing_authority_audit(
    event, actor_user_id, request_id, system_pack_id, details
  ) VALUES (
    'reject', v_admin, p_request_id, v_request.system_pack_id,
    jsonb_build_object('reason', trim(p_reason))
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_reject_fabricator_manufacturing_approval(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_fabricator_manufacturing_approval(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- Admin revoke active authority (reapproval must insert a new revision)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_revoke_fabricator_manufacturing_authority(
  p_approval_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_pack TEXT;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF public.is_admin(v_admin) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'admin role required' USING ERRCODE = '42501';
  END IF;
  IF coalesce(length(trim(p_reason)), 0) < 3 THEN
    RAISE EXCEPTION 'revocation reason required';
  END IF;

  UPDATE public.fabricator_manufacturing_authority_revisions
    SET revoked_at = now(), revocation_reason = trim(p_reason)
    WHERE approval_id = p_approval_id AND revoked_at IS NULL
    RETURNING system_pack_id INTO v_pack;

  IF v_pack IS NULL THEN
    RAISE EXCEPTION 'authority not found or already revoked';
  END IF;

  INSERT INTO public.fabricator_manufacturing_authority_audit(
    event, actor_user_id, approval_id, system_pack_id, details
  ) VALUES (
    'revoke', v_admin, p_approval_id, v_pack,
    jsonb_build_object('reason', trim(p_reason))
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_revoke_fabricator_manufacturing_authority(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_revoke_fabricator_manufacturing_authority(UUID, TEXT) TO authenticated;

-- Keep owner SELECT; admins read via fail-closed is_admin.
DROP POLICY IF EXISTS admin_read_approval_requests ON public.fabricator_manufacturing_approval_requests;
CREATE POLICY admin_read_approval_requests ON public.fabricator_manufacturing_approval_requests
  FOR SELECT TO authenticated
  USING (
    (public.is_admin(auth.uid()) IS TRUE)
    OR owner_user_id = auth.uid()
  );

COMMIT;
