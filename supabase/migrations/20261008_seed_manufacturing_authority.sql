-- Phase 1: Seed manufacturing authority + QC tolerance for built-in Egyptian packs.
-- provenance='seed' (vendor catalogue), revocable by admin, audited.
-- Admin SECURITY DEFINER wrappers for approve/reject/revoke (authenticated admins only).
BEGIN;

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

CREATE POLICY admin_read_authority_audit ON public.fabricator_manufacturing_authority_audit
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- Admin helper (idempotent; may already exist from older migrations)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
STABLE
AS $$
DECLARE user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  RETURN user_role = 'admin';
END;
$$;
REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Seed reviewer identity (local / deterministic; not a login account)
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
VALUES (
  'a1000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'seed-manufacturing-authority@almona.local',
  '',
  now(), now(), now(),
  '{"provider":"seed","providers":["seed"]}'::JSONB,
  '{"seed":true}'::JSONB
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed helper: build v1 authority payload for a pack
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._seed_authority_payload(
  p_pack_id TEXT,
  p_approval_id UUID,
  p_frame_id TEXT,
  p_sash_id TEXT
) RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
  SELECT jsonb_build_object(
    'schema', 'almona.manufacturing-authority',
    'schemaVersion', 1,
    'system', jsonb_build_object('id', p_pack_id),
    'systemPack', jsonb_build_object(
      'id', p_pack_id,
      'revision', 1,
      'evidenceStatus', 'approved',
      'approvalId', p_approval_id::TEXT
    ),
    'profiles', jsonb_build_array(
      jsonb_build_object(
        'role', 'frame',
        'profileId', p_frame_id,
        'stockLengthMm', 6000,
        'evidenceStatus', 'approved',
        'approvalId', 'b1000000-0000-4000-8000-000000000001'
      ),
      jsonb_build_object(
        'role', 'sash',
        'profileId', p_sash_id,
        'stockLengthMm', 6000,
        'evidenceStatus', 'approved',
        'approvalId', 'b1000000-0000-4000-8000-000000000002'
      )
    ),
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
$$;
REVOKE ALL ON FUNCTION public._seed_authority_payload(TEXT, UUID, TEXT, TEXT) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Seed authority + QC tolerance for built-in Egyptian packs
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_seed_user UUID := 'a1000000-0000-4000-8000-000000000001';
  r RECORD;
  v_approval UUID;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('caluminium-ps', 'PS-6601-FRAME', 'PS-5600-SASH', 'd1000000-0000-4000-8000-000000000001'::UUID),
      ('panda-50',      'P50-FRAME',     'P50-SASH',     'd1000000-0000-4000-8000-000000000002'::UUID),
      ('panda-100',     'P100-FRAME',    'P100-SASH',    'd1000000-0000-4000-8000-000000000003'::UUID),
      ('wintech_6400_detailed', 'WT6400-FRAME', 'WT6400-SASH', 'd1000000-0000-4000-8000-000000000004'::UUID),
      ('kompen_60_eco', 'K60-FRAME', 'K60-SASH', 'd1000000-0000-4000-8000-000000000005'::UUID),
      ('veka_70_softline', 'V70-FRAME', 'V70-SASH', 'd1000000-0000-4000-8000-000000000006'::UUID),
      ('rehau_geneo', 'RG-FRAME', 'RG-SASH', 'd1000000-0000-4000-8000-000000000007'::UUID),
      ('emapen_ema60_complete', 'EMA60-FRAME', 'EMA60-SASH', 'd1000000-0000-4000-8000-000000000008'::UUID),
      ('emapen_ema60s_sliding', 'EMA60S-FRAME', 'EMA60S-SASH', 'd1000000-0000-4000-8000-000000000009'::UUID)
    ) AS t(pack_id, frame_id, sash_id, approval_id)
  LOOP
    INSERT INTO public.fabricator_manufacturing_authority_revisions(
      approval_id, system_pack_id, system_pack_revision, authority_payload,
      approved_by, provenance
    )
    VALUES (
      r.approval_id,
      r.pack_id,
      1,
      public._seed_authority_payload(r.pack_id, r.approval_id, r.frame_id, r.sash_id),
      v_seed_user,
      'seed'
    )
    ON CONFLICT (system_pack_id, system_pack_revision) DO UPDATE
      SET authority_payload = EXCLUDED.authority_payload,
          provenance = 'seed',
          revoked_at = NULL,
          revocation_reason = NULL
      WHERE public.fabricator_manufacturing_authority_revisions.provenance = 'seed'
         OR public.fabricator_manufacturing_authority_revisions.revoked_at IS NOT NULL;

    INSERT INTO public.fabricator_qc_tolerance_rules(
      system_pack_id, dimensional_tolerance_mm, approved, approved_by, approved_at
    )
    VALUES (r.pack_id, 1.5, TRUE, v_seed_user, now())
    ON CONFLICT (system_pack_id) DO UPDATE
      SET dimensional_tolerance_mm = EXCLUDED.dimensional_tolerance_mm,
          approved = TRUE,
          approved_by = EXCLUDED.approved_by,
          approved_at = COALESCE(public.fabricator_qc_tolerance_rules.approved_at, now());

    INSERT INTO public.fabricator_manufacturing_authority_audit(
      event, actor_user_id, system_pack_id, approval_id, details
    )
    VALUES (
      'seed', v_seed_user, r.pack_id, r.approval_id,
      jsonb_build_object('provenance', 'seed', 'revocable', true)
    );
  END LOOP;
END;
$$;

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
  IF NOT public.is_admin(auth.uid()) THEN
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
-- Admin approve pending request (wraps review write path)
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
  IF NOT public.is_admin(v_admin) THEN
    RAISE EXCEPTION 'admin role required' USING ERRCODE = '42501';
  END IF;

  -- Reuse service_role review function body via direct call as DEFINER
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
  IF NOT public.is_admin(v_admin) THEN
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
-- Admin revoke active authority (including seed provenance)
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
  IF NOT public.is_admin(v_admin) THEN
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

-- Allow authenticated admins to read approval requests (via RPC only; table stays locked)
-- Keep owner SELECT policy; add admin SELECT
DROP POLICY IF EXISTS admin_read_approval_requests ON public.fabricator_manufacturing_approval_requests;
CREATE POLICY admin_read_approval_requests ON public.fabricator_manufacturing_approval_requests
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR owner_user_id = auth.uid());

COMMIT;
