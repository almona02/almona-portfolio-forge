-- Hardener admin verification + audited overrides.
-- Manufacturing remains stopped until verification or a permitted override.
-- Local/staging only — STOP before remote/production apply.
BEGIN;

CREATE TABLE IF NOT EXISTS public.fabricator_hardener_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id),
  position_id UUID NOT NULL REFERENCES public.fabricator_positions_v2(id) ON DELETE CASCADE,
  position_revision BIGINT NOT NULL CHECK (position_revision > 0),
  system_pack_id TEXT NOT NULL,
  proposed_hardener_code TEXT NOT NULL,
  opening_type TEXT,
  material TEXT,
  glass_thickness_mm NUMERIC,
  sash_width_mm NUMERIC,
  sash_height_mm NUMERIC,
  sash_weight_kg NUMERIC,
  engineering_evidence JSONB NOT NULL DEFAULT '{}'::JSONB,
  compatibility_checks JSONB NOT NULL DEFAULT '[]'::JSONB,
  missing_evidence TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'revoked', 'stale')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  approval_version BIGINT NOT NULL DEFAULT 1 CHECK (approval_version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(engineering_evidence) = 'object'),
  CHECK (jsonb_typeof(compatibility_checks) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_hardener_proposals_status
  ON public.fabricator_hardener_proposals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hardener_proposals_position
  ON public.fabricator_hardener_proposals(position_id, position_revision);

CREATE TABLE IF NOT EXISTS public.fabricator_hardener_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.fabricator_hardener_proposals(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES public.fabricator_positions_v2(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL CHECK (length(trim(reason)) >= 8),
  supporting_evidence JSONB NOT NULL DEFAULT '{}'::JSONB,
  scope TEXT NOT NULL CHECK (scope IN ('position', 'project', 'system_pack')),
  override_version BIGINT NOT NULL CHECK (override_version > 0),
  hardener_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  CHECK (jsonb_typeof(supporting_evidence) = 'object'),
  CHECK (
    (revoked_at IS NULL AND revocation_reason IS NULL)
    OR (revoked_at IS NOT NULL AND length(trim(coalesce(revocation_reason, ''))) >= 3)
  )
);

CREATE TABLE IF NOT EXISTS public.fabricator_hardener_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL CHECK (event IN (
    'propose', 'approve', 'reject', 'override', 'revoke', 'stale'
  )),
  actor_user_id UUID REFERENCES auth.users(id),
  proposal_id UUID,
  override_id UUID,
  position_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fabricator_hardener_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabricator_hardener_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabricator_hardener_audit ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.fabricator_hardener_proposals FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.fabricator_hardener_overrides FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.fabricator_hardener_audit FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.fabricator_hardener_proposals TO authenticated;
GRANT SELECT ON public.fabricator_hardener_overrides TO authenticated;
GRANT SELECT ON public.fabricator_hardener_audit TO authenticated;

DROP POLICY IF EXISTS hardener_proposals_select ON public.fabricator_hardener_proposals;
CREATE POLICY hardener_proposals_select ON public.fabricator_hardener_proposals
  FOR SELECT TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR public.is_admin(auth.uid()) IS TRUE
  );

DROP POLICY IF EXISTS hardener_overrides_select ON public.fabricator_hardener_overrides;
CREATE POLICY hardener_overrides_select ON public.fabricator_hardener_overrides
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid()) IS TRUE
    OR EXISTS (
      SELECT 1 FROM public.fabricator_positions_v2 p
      WHERE p.id = position_id AND p.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS hardener_audit_select ON public.fabricator_hardener_audit;
CREATE POLICY hardener_audit_select ON public.fabricator_hardener_audit
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) IS TRUE);

-- Invalidate approvals when position design inputs change
CREATE OR REPLACE FUNCTION public.trg_stale_hardener_proposals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.qc_revision IS DISTINCT FROM OLD.qc_revision
    OR NEW.system_pack_id IS DISTINCT FROM OLD.system_pack_id
    OR NEW.overall_width_mm IS DISTINCT FROM OLD.overall_width_mm
    OR NEW.overall_height_mm IS DISTINCT FROM OLD.overall_height_mm
    OR NEW.type IS DISTINCT FROM OLD.type
    OR NEW.components IS DISTINCT FROM OLD.components
  ) THEN
    UPDATE public.fabricator_hardener_proposals p
       SET status = 'stale',
           updated_at = now()
     WHERE p.position_id = NEW.id
       AND p.status IN ('pending', 'approved');

    UPDATE public.fabricator_hardener_overrides o
       SET revoked_at = now(),
           revocation_reason = 'hardener/design inputs changed'
     WHERE o.position_id = NEW.id
       AND o.revoked_at IS NULL;

    INSERT INTO public.fabricator_hardener_audit(event, actor_user_id, position_id, details)
    VALUES (
      'stale', auth.uid(), NEW.id,
      jsonb_build_object('reason', 'position inputs changed', 'qc_revision', NEW.qc_revision)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stale_hardener_proposals ON public.fabricator_positions_v2;
CREATE TRIGGER trg_stale_hardener_proposals
  AFTER UPDATE ON public.fabricator_positions_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_stale_hardener_proposals();

-- Owner proposes a hardener for admin review (manufacturing remains stopped)
CREATE OR REPLACE FUNCTION public.request_fabricator_hardener_verification(
  p_position_id UUID,
  p_expected_revision BIGINT,
  p_proposed_hardener_code TEXT,
  p_engineering_evidence JSONB DEFAULT '{}'::JSONB,
  p_compatibility_checks JSONB DEFAULT '[]'::JSONB,
  p_missing_evidence TEXT[] DEFAULT '{}',
  p_opening_type TEXT DEFAULT NULL,
  p_material TEXT DEFAULT NULL,
  p_glass_thickness_mm NUMERIC DEFAULT NULL,
  p_sash_width_mm NUMERIC DEFAULT NULL,
  p_sash_height_mm NUMERIC DEFAULT NULL,
  p_sash_weight_kg NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_pos public.fabricator_positions_v2%ROWTYPE;
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_position_id IS NULL OR coalesce(p_expected_revision, 0) <= 0 THEN
    RAISE EXCEPTION 'position and positive revision required';
  END IF;
  IF length(trim(coalesce(p_proposed_hardener_code, ''))) < 2 THEN
    RAISE EXCEPTION 'proposed hardener code required';
  END IF;

  SELECT * INTO v_pos FROM public.fabricator_positions_v2
  WHERE id = p_position_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'position not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_pos.owner_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'position owner mismatch' USING ERRCODE = '42501';
  END IF;
  IF v_pos.qc_revision IS DISTINCT FROM p_expected_revision THEN
    RAISE EXCEPTION 'stale position revision';
  END IF;

  -- Mark prior pending proposals stale for this revision
  UPDATE public.fabricator_hardener_proposals
     SET status = 'stale', updated_at = now()
   WHERE position_id = p_position_id
     AND status = 'pending';

  INSERT INTO public.fabricator_hardener_proposals (
    owner_user_id, position_id, position_revision, system_pack_id,
    proposed_hardener_code, opening_type, material, glass_thickness_mm,
    sash_width_mm, sash_height_mm, sash_weight_kg,
    engineering_evidence, compatibility_checks, missing_evidence
  ) VALUES (
    v_uid, p_position_id, v_pos.qc_revision, coalesce(v_pos.system_pack_id, 'unknown'),
    trim(p_proposed_hardener_code), p_opening_type, p_material, p_glass_thickness_mm,
    p_sash_width_mm, p_sash_height_mm, p_sash_weight_kg,
    coalesce(p_engineering_evidence, '{}'::JSONB),
    coalesce(p_compatibility_checks, '[]'::JSONB),
    coalesce(p_missing_evidence, '{}')
  )
  RETURNING id INTO v_id;

  INSERT INTO public.fabricator_hardener_audit(event, actor_user_id, proposal_id, position_id, details)
  VALUES (
    'propose', v_uid, v_id, p_position_id,
    jsonb_build_object('hardenerCode', trim(p_proposed_hardener_code), 'revision', v_pos.qc_revision)
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_fabricator_hardener_verification(
  UUID, BIGINT, TEXT, JSONB, JSONB, TEXT[], TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_fabricator_hardener_verification(
  UUID, BIGINT, TEXT, JSONB, JSONB, TEXT[], TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC
) TO authenticated;

-- Admin approve / reject
CREATE OR REPLACE FUNCTION public.admin_review_fabricator_hardener(
  p_proposal_id UUID,
  p_decision TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prop public.fabricator_hardener_proposals%ROWTYPE;
  v_failed INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF public.is_admin(v_uid) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'admin role required' USING ERRCODE = '42501';
  END IF;
  IF p_decision IS DISTINCT FROM 'approve' AND p_decision IS DISTINCT FROM 'reject' THEN
    RAISE EXCEPTION 'decision must be approve or reject';
  END IF;

  SELECT * INTO v_prop FROM public.fabricator_hardener_proposals
  WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'proposal not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_prop.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'proposal is not pending (status=%)', v_prop.status;
  END IF;

  IF p_decision = 'approve' THEN
    SELECT count(*) INTO v_failed
    FROM jsonb_array_elements(v_prop.compatibility_checks) c
    WHERE coalesce(c->>'passed', 'false') IS DISTINCT FROM 'true';

    IF v_failed > 0 AND coalesce(array_length(v_prop.missing_evidence, 1), 0) > 0 THEN
      RAISE EXCEPTION 'cannot approve: % failed checks and missing evidence present', v_failed;
    END IF;
    IF v_failed > 0 THEN
      RAISE EXCEPTION 'cannot approve: % compatibility checks failed — use scoped override', v_failed;
    END IF;
    IF coalesce(array_length(v_prop.missing_evidence, 1), 0) > 0 THEN
      RAISE EXCEPTION 'cannot approve: missing evidence — use scoped override';
    END IF;

    UPDATE public.fabricator_hardener_proposals
       SET status = 'approved',
           reviewed_by = v_uid,
           reviewed_at = now(),
           review_notes = p_notes,
           approval_version = approval_version + 1,
           updated_at = now()
     WHERE id = p_proposal_id;

    INSERT INTO public.fabricator_hardener_audit(event, actor_user_id, proposal_id, position_id, details)
    VALUES ('approve', v_uid, p_proposal_id, v_prop.position_id,
            jsonb_build_object('notes', p_notes, 'hardenerCode', v_prop.proposed_hardener_code));
  ELSE
    UPDATE public.fabricator_hardener_proposals
       SET status = 'rejected',
           reviewed_by = v_uid,
           reviewed_at = now(),
           review_notes = p_notes,
           updated_at = now()
     WHERE id = p_proposal_id;

    INSERT INTO public.fabricator_hardener_audit(event, actor_user_id, proposal_id, position_id, details)
    VALUES ('reject', v_uid, p_proposal_id, v_prop.position_id,
            jsonb_build_object('notes', p_notes));
  END IF;

  RETURN p_proposal_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_fabricator_hardener(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_fabricator_hardener(UUID, TEXT, TEXT) TO authenticated;

-- Admin scoped override (audited); still records reason + evidence + version
CREATE OR REPLACE FUNCTION public.admin_override_fabricator_hardener(
  p_proposal_id UUID,
  p_hardener_code TEXT,
  p_reason TEXT,
  p_supporting_evidence JSONB,
  p_scope TEXT DEFAULT 'position'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prop public.fabricator_hardener_proposals%ROWTYPE;
  v_id UUID;
  v_version BIGINT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF public.is_admin(v_uid) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'admin role required' USING ERRCODE = '42501';
  END IF;
  IF length(trim(coalesce(p_reason, ''))) < 8 THEN
    RAISE EXCEPTION 'override reason must be at least 8 characters';
  END IF;
  IF p_scope IS DISTINCT FROM 'position'
     AND p_scope IS DISTINCT FROM 'project'
     AND p_scope IS DISTINCT FROM 'system_pack' THEN
    RAISE EXCEPTION 'invalid override scope';
  END IF;
  IF length(trim(coalesce(p_hardener_code, ''))) < 2 THEN
    RAISE EXCEPTION 'hardener code required';
  END IF;

  SELECT * INTO v_prop FROM public.fabricator_hardener_proposals
  WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'proposal not found';
  END IF;
  IF v_prop.status = 'stale' OR v_prop.status = 'revoked' THEN
    RAISE EXCEPTION 'cannot override stale/revoked proposal';
  END IF;

  v_version := v_prop.approval_version + 1;

  UPDATE public.fabricator_hardener_overrides
     SET revoked_at = now(),
         revocation_reason = 'superseded by new override'
   WHERE proposal_id = p_proposal_id
     AND revoked_at IS NULL;

  INSERT INTO public.fabricator_hardener_overrides (
    proposal_id, position_id, admin_user_id, reason, supporting_evidence,
    scope, override_version, hardener_code
  ) VALUES (
    p_proposal_id, v_prop.position_id, v_uid, trim(p_reason),
    coalesce(p_supporting_evidence, '{}'::JSONB),
    p_scope, v_version, trim(p_hardener_code)
  )
  RETURNING id INTO v_id;

  UPDATE public.fabricator_hardener_proposals
     SET status = 'approved',
         proposed_hardener_code = trim(p_hardener_code),
         reviewed_by = v_uid,
         reviewed_at = now(),
         review_notes = trim(p_reason),
         approval_version = v_version,
         updated_at = now()
   WHERE id = p_proposal_id;

  INSERT INTO public.fabricator_hardener_audit(event, actor_user_id, proposal_id, override_id, position_id, details)
  VALUES (
    'override', v_uid, p_proposal_id, v_id, v_prop.position_id,
    jsonb_build_object(
      'reason', trim(p_reason),
      'scope', p_scope,
      'version', v_version,
      'hardenerCode', trim(p_hardener_code),
      'evidence', coalesce(p_supporting_evidence, '{}'::JSONB)
    )
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_override_fabricator_hardener(UUID, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_override_fabricator_hardener(UUID, TEXT, TEXT, JSONB, TEXT) TO authenticated;

-- Revoke approval or override
CREATE OR REPLACE FUNCTION public.admin_revoke_fabricator_hardener(
  p_proposal_id UUID,
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prop public.fabricator_hardener_proposals%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF public.is_admin(v_uid) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'admin role required' USING ERRCODE = '42501';
  END IF;
  IF length(trim(coalesce(p_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'revocation reason required';
  END IF;

  SELECT * INTO v_prop FROM public.fabricator_hardener_proposals
  WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'proposal not found';
  END IF;

  UPDATE public.fabricator_hardener_proposals
     SET status = 'revoked',
         review_notes = trim(p_reason),
         reviewed_by = v_uid,
         reviewed_at = now(),
         updated_at = now()
   WHERE id = p_proposal_id;

  UPDATE public.fabricator_hardener_overrides
     SET revoked_at = now(),
         revocation_reason = trim(p_reason)
   WHERE proposal_id = p_proposal_id
     AND revoked_at IS NULL;

  INSERT INTO public.fabricator_hardener_audit(event, actor_user_id, proposal_id, position_id, details)
  VALUES ('revoke', v_uid, p_proposal_id, v_prop.position_id,
          jsonb_build_object('reason', trim(p_reason)));

  RETURN p_proposal_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_fabricator_hardener(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_revoke_fabricator_hardener(UUID, TEXT) TO authenticated;

-- Manufacturing stop: active verified hardener (or audited override) required
CREATE OR REPLACE FUNCTION public.get_fabricator_hardener_authority(
  p_position_id UUID,
  p_expected_revision BIGINT
)
RETURNS TABLE (
  proposal_id UUID,
  hardener_code TEXT,
  status TEXT,
  approval_version BIGINT,
  override_id UUID,
  manufacturing_cleared BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_pos public.fabricator_positions_v2%ROWTYPE;
  v_proposal_id UUID;
  v_code TEXT;
  v_status TEXT;
  v_version BIGINT;
  v_override_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pos FROM public.fabricator_positions_v2 WHERE id = p_position_id;
  IF NOT FOUND OR v_pos.owner_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'position not found or not owned' USING ERRCODE = '42501';
  END IF;
  IF v_pos.qc_revision IS DISTINCT FROM p_expected_revision THEN
    RAISE EXCEPTION 'position revision changed';
  END IF;

  SELECT p.id, p.proposed_hardener_code, p.status, p.approval_version, o.id
    INTO v_proposal_id, v_code, v_status, v_version, v_override_id
  FROM public.fabricator_hardener_proposals p
  LEFT JOIN public.fabricator_hardener_overrides o
    ON o.proposal_id = p.id AND o.revoked_at IS NULL
  WHERE p.position_id = p_position_id
    AND p.status = 'approved'
    AND p.position_revision = v_pos.qc_revision
  ORDER BY p.updated_at DESC
  LIMIT 1;

  IF v_proposal_id IS NULL THEN
    RAISE EXCEPTION 'hardener verification required (manufacturing stop)'
      USING ERRCODE = 'P0001';
  END IF;

  proposal_id := v_proposal_id;
  hardener_code := v_code;
  status := v_status;
  approval_version := v_version;
  override_id := v_override_id;
  manufacturing_cleared := TRUE;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_fabricator_hardener_authority(UUID, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_fabricator_hardener_authority(UUID, BIGINT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_hardener_proposals(
  p_status TEXT DEFAULT 'pending'
)
RETURNS SETOF public.fabricator_hardener_proposals
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
    SELECT *
    FROM public.fabricator_hardener_proposals r
    WHERE (p_status IS NULL OR r.status = p_status)
    ORDER BY r.created_at DESC
    LIMIT 200;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_hardener_proposals(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_hardener_proposals(TEXT) TO authenticated;

COMMENT ON TABLE public.fabricator_hardener_proposals IS
  'Admin-reviewed hardener proposals; manufacturing stop until approved or audited override.';

COMMIT;
