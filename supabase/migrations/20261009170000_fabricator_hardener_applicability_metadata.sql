-- Replace name-based "%-no-hardener" exemptions with versioned applicability metadata.
-- Staging/local candidate — DO NOT apply to production without explicit authorization.
-- Not a manufacturing-authority seed: only marks estimate/sandbox packs as hardener N/A.

BEGIN;

CREATE TABLE IF NOT EXISTS public.fabricator_system_pack_hardener_applicability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_pack_id TEXT NOT NULL,
  requires_hardener BOOLEAN NOT NULL,
  applicability_version INTEGER NOT NULL CHECK (applicability_version > 0),
  reason TEXT NOT NULL CHECK (length(trim(reason)) >= 8),
  evidence JSONB NOT NULL DEFAULT '{}'::JSONB
    CHECK (jsonb_typeof(evidence) = 'object'),
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_by UUID NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (system_pack_id, applicability_version),
  CHECK (effective_until IS NULL OR effective_until > effective_from)
);

CREATE INDEX IF NOT EXISTS fabricator_hardener_applicability_pack_idx
  ON public.fabricator_system_pack_hardener_applicability (system_pack_id, applicability_version DESC);

ALTER TABLE public.fabricator_system_pack_hardener_applicability ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fabricator_system_pack_hardener_applicability FROM PUBLIC, anon;
GRANT SELECT ON public.fabricator_system_pack_hardener_applicability TO authenticated;

DROP POLICY IF EXISTS fabricator_hardener_applicability_select ON public.fabricator_system_pack_hardener_applicability;
CREATE POLICY fabricator_hardener_applicability_select
  ON public.fabricator_system_pack_hardener_applicability
  FOR SELECT TO authenticated
  USING (true);

COMMENT ON TABLE public.fabricator_system_pack_hardener_applicability IS
  'Versioned hardener applicability. Missing row = require hardener (fail-closed). Not manufacturing approval.';

-- Seed only known estimate/sandbox N/A packs (explicit evidence; no LIKE wildcard).
INSERT INTO public.fabricator_system_pack_hardener_applicability (
  system_pack_id, requires_hardener, applicability_version, reason, evidence, verified_by
) VALUES
  (
    'sandbox-no-hardener', false, 1,
    'Sandbox estimate pack: hardener gate intentionally N/A for fixture tests',
    jsonb_build_object(
      'kind', 'estimate_only',
      'source', 'fixture',
      'catalogueRef', 'sandbox-hardener-na-v1'
    ),
    NULL
  ),
  (
    'estimate-manual', false, 1,
    'Manual estimate pack: no catalogue hardener mapping required',
    jsonb_build_object(
      'kind', 'estimate_only',
      'source', 'catalogue',
      'catalogueRef', 'estimate-manual-na-v1'
    ),
    NULL
  ),
  (
    'no-hardener', false, 1,
    'Legacy estimate alias: hardener N/A with versioned evidence',
    jsonb_build_object(
      'kind', 'estimate_only',
      'source', 'legacy_alias',
      'catalogueRef', 'no-hardener-na-v1'
    ),
    NULL
  ),
  (
    'fixed-estimate-only', false, 1,
    'Fixed estimate-only pack: manufacturing hardener not applicable',
    jsonb_build_object(
      'kind', 'estimate_only',
      'source', 'catalogue',
      'catalogueRef', 'fixed-estimate-only-na-v1'
    ),
    NULL
  )
ON CONFLICT (system_pack_id, applicability_version) DO NOTHING;

CREATE OR REPLACE FUNCTION public.system_pack_requires_hardener(p_system_pack_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_requires BOOLEAN;
BEGIN
  IF p_system_pack_id IS NULL OR length(trim(p_system_pack_id)) = 0 THEN
    RETURN TRUE; -- fail-closed when pack unknown
  END IF;

  SELECT a.requires_hardener
    INTO v_requires
  FROM public.fabricator_system_pack_hardener_applicability a
  WHERE a.system_pack_id = trim(p_system_pack_id)
    AND a.effective_from <= now()
    AND (a.effective_until IS NULL OR a.effective_until > now())
  ORDER BY a.applicability_version DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN TRUE; -- no metadata ⇒ require hardener (closes %-no-hardener loophole)
  END IF;

  RETURN v_requires;
END;
$$;

REVOKE ALL ON FUNCTION public.system_pack_requires_hardener(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.system_pack_requires_hardener(TEXT) TO authenticated;

-- Admin upsert for versioned applicability (reason + evidence required).
CREATE OR REPLACE FUNCTION public.admin_upsert_hardener_applicability(
  p_system_pack_id TEXT,
  p_requires_hardener BOOLEAN,
  p_reason TEXT,
  p_evidence JSONB,
  p_effective_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_next INT;
  v_id UUID;
  v_keys INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF public.is_admin(v_uid) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'admin role required' USING ERRCODE = '42501';
  END IF;
  IF length(trim(coalesce(p_system_pack_id, ''))) < 2 THEN
    RAISE EXCEPTION 'system pack id required';
  END IF;
  IF length(trim(coalesce(p_reason, ''))) < 8 THEN
    RAISE EXCEPTION 'applicability reason must be at least 8 characters';
  END IF;
  IF p_evidence IS NULL OR jsonb_typeof(p_evidence) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'applicability evidence object required';
  END IF;
  SELECT count(*)::INT INTO v_keys FROM jsonb_object_keys(p_evidence);
  IF v_keys < 2 THEN
    RAISE EXCEPTION 'applicability evidence incomplete (need >= 2 fields)';
  END IF;

  SELECT coalesce(max(applicability_version), 0) + 1
    INTO v_next
  FROM public.fabricator_system_pack_hardener_applicability
  WHERE system_pack_id = trim(p_system_pack_id);

  -- Close prior open-ended versions for this pack.
  UPDATE public.fabricator_system_pack_hardener_applicability
     SET effective_until = now()
   WHERE system_pack_id = trim(p_system_pack_id)
     AND effective_until IS NULL;

  INSERT INTO public.fabricator_system_pack_hardener_applicability (
    system_pack_id, requires_hardener, applicability_version,
    reason, evidence, verified_by, effective_until
  ) VALUES (
    trim(p_system_pack_id), p_requires_hardener, v_next,
    trim(p_reason), p_evidence, v_uid, p_effective_until
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_hardener_applicability(TEXT, BOOLEAN, TEXT, JSONB, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_hardener_applicability(TEXT, BOOLEAN, TEXT, JSONB, TIMESTAMPTZ) TO authenticated;

-- Tighten overrides: supporting evidence must be a non-empty object.
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
  v_keys INT;
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
  IF p_supporting_evidence IS NULL OR jsonb_typeof(p_supporting_evidence) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'override supporting evidence object required';
  END IF;
  SELECT count(*)::INT INTO v_keys FROM jsonb_object_keys(p_supporting_evidence);
  IF v_keys < 1 THEN
    RAISE EXCEPTION 'override supporting evidence incomplete';
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
    p_supporting_evidence,
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
      'evidence', p_supporting_evidence
    )
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_override_fabricator_hardener(UUID, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_override_fabricator_hardener(UUID, TEXT, TEXT, JSONB, TEXT) TO authenticated;

COMMIT;
