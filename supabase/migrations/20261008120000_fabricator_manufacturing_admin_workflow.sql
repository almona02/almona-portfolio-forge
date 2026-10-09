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
  ADD COLUMN IF NOT EXISTS provenance TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE public.fabricator_manufacturing_authority_revisions
  DROP CONSTRAINT IF EXISTS fabricator_manufacturing_authority_revisions_provenance_check;

ALTER TABLE public.fabricator_manufacturing_authority_revisions
  ADD CONSTRAINT fabricator_manufacturing_authority_revisions_provenance_check
  CHECK (provenance IN ('manual', 'seed', 'admin_review', 'vendor'));

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
  v_pack TEXT;
  v_rev BIGINT;
  v_payload JSONB := p_authority_payload;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF public.is_admin(v_admin) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'admin role required' USING ERRCODE = '42501';
  END IF;

  SELECT r.system_pack_id INTO v_pack
  FROM public.fabricator_manufacturing_approval_requests r
  WHERE r.id = p_request_id;
  IF v_pack IS NULL THEN
    RAISE EXCEPTION 'approval request not found';
  END IF;

  -- Always assign next free revision (client may hardcode 1; unique is pack+revision).
  SELECT COALESCE(MAX(a.system_pack_revision), 0) + 1 INTO v_rev
  FROM public.fabricator_manufacturing_authority_revisions a
  WHERE a.system_pack_id = v_pack;
  v_payload := jsonb_set(v_payload, '{systemPack,revision}', to_jsonb(v_rev), true);

  -- Reuse service_role review implementation; browser never holds the service key.
  v_id := public.review_fabricator_manufacturing_approval(p_request_id, v_admin, v_payload);

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

-- ---------------------------------------------------------------------------
-- Built-in vendor catalogue members (aligned with vendorCataloguePacks.ts)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._vendor_catalogue_frame_sash(p_pack_id TEXT)
RETURNS TABLE(frame_id TEXT, sash_id TEXT)
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
  SELECT v.frame_id, v.sash_id
  FROM (
    VALUES
      ('caluminium-ps', 'PS-6601-FRAME', 'PS-5600-SASH'),
      ('panda-50', 'P50-FRAME', 'P50-SASH'),
      ('panda-100', 'P100-FRAME', 'P100-SASH'),
      ('wintech_6400_detailed', 'WT6400-FRAME', 'WT6400-SASH'),
      ('kompen_60_eco', 'K60-FRAME', 'K60-SASH'),
      ('veka_70_softline', 'V70-FRAME', 'V70-SASH'),
      ('rehau_geneo', 'RG-FRAME', 'RG-SASH'),
      ('emapen_ema60_complete', 'EMA60-FRAME', 'EMA60-SASH'),
      ('emapen_ema60s_sliding', 'EMA60S-FRAME', 'EMA60S-SASH')
  ) AS v(pack_id, frame_id, sash_id)
  WHERE v.pack_id = p_pack_id;
$$;
REVOKE ALL ON FUNCTION public._vendor_catalogue_frame_sash(TEXT) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._vendor_catalogue_authority_payload(
  p_pack_id TEXT,
  p_approval_id UUID,
  p_revision BIGINT
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_frame TEXT;
  v_sash TEXT;
  v_profiles JSONB;
BEGIN
  SELECT frame_id, sash_id INTO v_frame, v_sash
  FROM public._vendor_catalogue_frame_sash(p_pack_id);
  IF v_frame IS NULL THEN
    RAISE EXCEPTION 'unknown vendor catalogue pack: %', p_pack_id;
  END IF;

  v_profiles := jsonb_build_array(
    jsonb_build_object(
      'role', 'frame', 'profileId', v_frame, 'stockLengthMm', 6000,
      'evidenceStatus', 'approved', 'approvalId', 'b1000000-0000-4000-8000-000000000001'
    ),
    jsonb_build_object(
      'role', 'sash', 'profileId', v_sash, 'stockLengthMm', 6000,
      'evidenceStatus', 'approved', 'approvalId', 'b1000000-0000-4000-8000-000000000002'
    )
  );

  IF p_pack_id = 'caluminium-ps' THEN
    v_profiles := v_profiles || jsonb_build_array(
      jsonb_build_object('role', 'frame', 'profileId', 'PS-9601-FRAME', 'stockLengthMm', 6000, 'evidenceStatus', 'approved', 'approvalId', 'b1000000-0000-4000-8000-000000000010'),
      jsonb_build_object('role', 'sash', 'profileId', 'PS-6601-SASH', 'stockLengthMm', 6000, 'evidenceStatus', 'approved', 'approvalId', 'b1000000-0000-4000-8000-000000000011'),
      jsonb_build_object('role', 'interlock', 'profileId', 'PS-6601-INTERLOCK', 'stockLengthMm', 6000, 'evidenceStatus', 'approved', 'approvalId', 'b1000000-0000-4000-8000-000000000012'),
      jsonb_build_object('role', 'track', 'profileId', 'PS-6601-TRACK', 'stockLengthMm', 6000, 'evidenceStatus', 'approved', 'approvalId', 'b1000000-0000-4000-8000-000000000013'),
      jsonb_build_object('role', 'bead', 'profileId', 'PS-6601-BEAD', 'stockLengthMm', 6000, 'evidenceStatus', 'approved', 'approvalId', 'b1000000-0000-4000-8000-000000000014'),
      jsonb_build_object('role', 'frame', 'profileId', 'PS-5600-FRAME', 'stockLengthMm', 6000, 'evidenceStatus', 'approved', 'approvalId', 'b1000000-0000-4000-8000-000000000015'),
      jsonb_build_object('role', 'frame', 'profileId', 'PS-4800-FRAME', 'stockLengthMm', 6000, 'evidenceStatus', 'approved', 'approvalId', 'b1000000-0000-4000-8000-000000000016'),
      jsonb_build_object('role', 'mullion', 'profileId', 'PS-101-MULLION', 'stockLengthMm', 6000, 'evidenceStatus', 'approved', 'approvalId', 'b1000000-0000-4000-8000-000000000017')
    );
  END IF;

  RETURN jsonb_build_object(
    'schema', 'almona.manufacturing-authority',
    'schemaVersion', 1,
    'system', jsonb_build_object('id', p_pack_id),
    'systemPack', jsonb_build_object(
      'id', p_pack_id,
      'revision', p_revision,
      'evidenceStatus', 'approved',
      'approvalId', p_approval_id::TEXT
    ),
    'profiles', v_profiles,
    'cuttingRules', jsonb_build_array(
      jsonb_build_object(
        'ruleId', p_pack_id || '-cut',
        'revision', 1,
        'evidenceStatus', 'approved',
        'approvalId', 'c1000000-0000-4000-8000-000000000001'
      )
    ),
    'toleranceRule', jsonb_build_object(
      'ruleId', p_pack_id || '-tolerance',
      'revision', 1,
      'evidenceStatus', 'approved',
      'approvalId', 'c1000000-0000-4000-8000-000000000002'
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION public._vendor_catalogue_authority_payload(TEXT, UUID, BIGINT) FROM PUBLIC;

-- One-click admin: approve built-in vendor catalogue (provenance=vendor). No blanket seed.
CREATE OR REPLACE FUNCTION public.admin_approve_vendor_catalogue(p_system_pack_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_id UUID := gen_random_uuid();
  v_rev BIGINT;
  v_payload JSONB;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF public.is_admin(v_admin) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'admin role required' USING ERRCODE = '42501';
  END IF;
  IF coalesce(length(trim(p_system_pack_id)), 0) < 2 THEN
    RAISE EXCEPTION 'system pack id required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public._vendor_catalogue_frame_sash(trim(p_system_pack_id))) THEN
    RAISE EXCEPTION 'unknown vendor catalogue pack: %', p_system_pack_id;
  END IF;

  -- Supersede any active revision (reapproval = new revision; never un-revoke in place).
  UPDATE public.fabricator_manufacturing_authority_revisions
    SET revoked_at = now(),
        revocation_reason = 'superseded by vendor catalogue approval'
    WHERE system_pack_id = trim(p_system_pack_id)
      AND revoked_at IS NULL;

  SELECT COALESCE(MAX(system_pack_revision), 0) + 1 INTO v_rev
  FROM public.fabricator_manufacturing_authority_revisions
  WHERE system_pack_id = trim(p_system_pack_id);

  v_payload := public._vendor_catalogue_authority_payload(trim(p_system_pack_id), v_id, v_rev);

  INSERT INTO public.fabricator_manufacturing_authority_revisions(
    approval_id, system_pack_id, system_pack_revision, authority_payload,
    approved_by, provenance
  ) VALUES (
    v_id, trim(p_system_pack_id), v_rev, v_payload, v_admin, 'vendor'
  );

  INSERT INTO public.fabricator_qc_tolerance_rules(
    system_pack_id, dimensional_tolerance_mm, approved, approved_by, approved_at
  )
  VALUES (trim(p_system_pack_id), 1.5, TRUE, v_admin, now())
  ON CONFLICT (system_pack_id) DO UPDATE
    SET dimensional_tolerance_mm = EXCLUDED.dimensional_tolerance_mm,
        approved = TRUE,
        approved_by = EXCLUDED.approved_by,
        approved_at = COALESCE(public.fabricator_qc_tolerance_rules.approved_at, now());

  INSERT INTO public.fabricator_manufacturing_authority_audit(
    event, actor_user_id, approval_id, system_pack_id, details
  ) VALUES (
    'approve', v_admin, v_id, trim(p_system_pack_id),
    jsonb_build_object('via', 'vendor_catalogue', 'provenance', 'vendor', 'revision', v_rev)
  );

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_approve_vendor_catalogue(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_vendor_catalogue(TEXT) TO authenticated;

-- List active authorities (admin) for revoke UI
CREATE OR REPLACE FUNCTION public.admin_list_active_manufacturing_authority()
RETURNS TABLE (
  approval_id UUID,
  system_pack_id TEXT,
  system_pack_revision BIGINT,
  provenance TEXT,
  approved_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF public.is_admin(auth.uid()) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'admin role required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT a.approval_id, a.system_pack_id, a.system_pack_revision, a.provenance, a.approved_at
    FROM public.fabricator_manufacturing_authority_revisions a
    WHERE a.revoked_at IS NULL
    ORDER BY a.system_pack_id, a.system_pack_revision DESC
    LIMIT 200;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_active_manufacturing_authority() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_active_manufacturing_authority() TO authenticated;

COMMIT;
