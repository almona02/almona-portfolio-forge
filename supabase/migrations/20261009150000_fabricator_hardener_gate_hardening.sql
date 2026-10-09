-- #68 harden: require full named compatibility checks + engineering evidence,
-- reject fabricated/empty proposals, wire hardener authority into
-- optimization / convert / release gates, scoped overrides, N/A packs.
-- Local/staging only — STOP before remote/production apply.
BEGIN;

-- Packs that explicitly do not require hardeners (applicability gate).
CREATE OR REPLACE FUNCTION public.system_pack_requires_hardener(p_system_pack_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF p_system_pack_id IS NULL OR length(trim(p_system_pack_id)) = 0 THEN
    RETURN TRUE; -- fail-closed when pack unknown
  END IF;
  IF lower(trim(p_system_pack_id)) IN (
    'sandbox-no-hardener',
    'estimate-manual',
    'no-hardener',
    'fixed-estimate-only'
  ) OR lower(trim(p_system_pack_id)) LIKE '%-no-hardener' THEN
    RETURN FALSE;
  END IF;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.system_pack_requires_hardener(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.system_pack_requires_hardener(TEXT) TO authenticated;

-- Named compatibility-check set (must all be present on every proposal).
CREATE OR REPLACE FUNCTION public.fabricator_hardener_required_checks()
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY[
    'system_profile',
    'material',
    'glass_thickness',
    'sash_dimensions',
    'sash_weight',
    'opening_type'
  ]::TEXT[];
$$;

REVOKE ALL ON FUNCTION public.fabricator_hardener_required_checks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fabricator_hardener_required_checks() TO authenticated;

-- Validate proposal payload: full named checks, evidence, dimensions, mappings.
CREATE OR REPLACE FUNCTION public.validate_fabricator_hardener_proposal_payload(
  p_system_pack_id TEXT,
  p_proposed_hardener_code TEXT,
  p_engineering_evidence JSONB,
  p_compatibility_checks JSONB,
  p_opening_type TEXT,
  p_material TEXT,
  p_glass_thickness_mm NUMERIC,
  p_sash_width_mm NUMERIC,
  p_sash_height_mm NUMERIC,
  p_sash_weight_kg NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_required TEXT[] := public.fabricator_hardener_required_checks();
  v_name TEXT;
  v_elem JSONB;
  v_found TEXT[] := '{}';
  v_passed BOOLEAN;
  v_code TEXT := trim(coalesce(p_proposed_hardener_code, ''));
  v_keys INT;
BEGIN
  IF length(v_code) < 4 OR v_code !~ '^(HX-|H-PS-|H-)' THEN
    RAISE EXCEPTION 'unsupported hardener/profile mapping for code %', v_code;
  END IF;

  -- HX catalog codes encode material/opening; reject obvious mismatches.
  IF v_code ~ '^HX-' THEN
    IF p_material IS NOT NULL THEN
      IF upper(left(p_material, 1)) = 'A' AND v_code !~ '-A-' THEN
        RAISE EXCEPTION 'unsupported hardener/profile mapping: material mismatch';
      END IF;
      IF lower(p_material) LIKE '%upvc%' AND v_code !~ '-U-' THEN
        RAISE EXCEPTION 'unsupported hardener/profile mapping: material mismatch';
      END IF;
    END IF;
    IF p_opening_type IS NOT NULL THEN
      IF lower(p_opening_type) LIKE '%slid%' AND v_code !~ '-S$' AND v_code !~ '-S-' THEN
        RAISE EXCEPTION 'unsupported hardener/profile mapping: opening type mismatch';
      END IF;
    END IF;
  END IF;

  IF p_engineering_evidence IS NULL
     OR jsonb_typeof(p_engineering_evidence) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'engineering evidence object required';
  END IF;
  SELECT count(*) INTO v_keys FROM jsonb_object_keys(p_engineering_evidence);
  IF v_keys < 2 THEN
    RAISE EXCEPTION 'engineering evidence incomplete (need method/reference fields)';
  END IF;
  IF coalesce(p_engineering_evidence->>'method', '') = ''
     AND coalesce(p_engineering_evidence->>'calc', '') = '' THEN
    RAISE EXCEPTION 'engineering evidence missing method/calc';
  END IF;
  IF coalesce(p_engineering_evidence->>'reference', '') = ''
     AND coalesce(p_engineering_evidence->>'source', '') = '' THEN
    RAISE EXCEPTION 'engineering evidence missing reference/source';
  END IF;

  IF p_compatibility_checks IS NULL
     OR jsonb_typeof(p_compatibility_checks) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_compatibility_checks) = 0 THEN
    RAISE EXCEPTION 'compatibility checks required (empty rejected)';
  END IF;

  FOREACH v_name IN ARRAY v_required LOOP
    v_elem := NULL;
    SELECT c INTO v_elem
    FROM jsonb_array_elements(p_compatibility_checks) c
    WHERE c->>'check' = v_name
    LIMIT 1;
    IF v_elem IS NULL THEN
      RAISE EXCEPTION 'compatibility check "%" required', v_name;
    END IF;
    IF NOT (v_elem ? 'passed') OR jsonb_typeof(v_elem->'passed') IS DISTINCT FROM 'boolean' THEN
      RAISE EXCEPTION 'compatibility check "%" must include boolean passed', v_name;
    END IF;
    v_passed := (v_elem->>'passed')::boolean;
    v_found := array_append(v_found, v_name);

    -- Reject fabricated passed flags when required dimensions/evidence are missing.
    IF v_name = 'material' AND v_passed AND (p_material IS NULL OR length(trim(p_material)) = 0) THEN
      RAISE EXCEPTION 'fabricated passed flag for material without material dimension';
    END IF;
    IF v_name = 'glass_thickness' AND v_passed AND p_glass_thickness_mm IS NULL THEN
      RAISE EXCEPTION 'fabricated passed flag for glass_thickness without dimension';
    END IF;
    IF v_name = 'sash_dimensions' AND v_passed
       AND (p_sash_width_mm IS NULL OR p_sash_height_mm IS NULL) THEN
      RAISE EXCEPTION 'fabricated passed flag for sash_dimensions without dimensions';
    END IF;
    IF v_name = 'sash_weight' AND v_passed AND p_sash_weight_kg IS NULL THEN
      RAISE EXCEPTION 'fabricated passed flag for sash_weight without dimension';
    END IF;
    IF v_name = 'opening_type' AND v_passed
       AND (p_opening_type IS NULL OR length(trim(p_opening_type)) = 0) THEN
      RAISE EXCEPTION 'fabricated passed flag for opening_type without dimension';
    END IF;
    IF v_name = 'system_profile' AND v_passed
       AND (p_system_pack_id IS NULL OR length(trim(p_system_pack_id)) = 0) THEN
      RAISE EXCEPTION 'fabricated passed flag for system_profile without pack';
    END IF;
  END LOOP;

  -- Require physical dimensions on every proposal for hardener-required packs.
  IF p_opening_type IS NULL OR length(trim(p_opening_type)) = 0 THEN
    RAISE EXCEPTION 'opening type dimension required';
  END IF;
  IF p_material IS NULL OR length(trim(p_material)) = 0 THEN
    RAISE EXCEPTION 'material dimension required';
  END IF;
  IF p_glass_thickness_mm IS NULL OR p_glass_thickness_mm <= 0 THEN
    RAISE EXCEPTION 'glass thickness dimension required';
  END IF;
  IF p_sash_width_mm IS NULL OR p_sash_width_mm <= 0
     OR p_sash_height_mm IS NULL OR p_sash_height_mm <= 0 THEN
    RAISE EXCEPTION 'sash dimensions required';
  END IF;
  IF p_sash_weight_kg IS NULL OR p_sash_weight_kg <= 0 THEN
    RAISE EXCEPTION 'sash weight dimension required';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_fabricator_hardener_proposal_payload(
  TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_fabricator_hardener_proposal_payload(
  TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC
) TO authenticated;

-- Harden propose RPC
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

  IF NOT public.system_pack_requires_hardener(v_pos.system_pack_id) THEN
    RAISE EXCEPTION 'system pack does not require hardener verification';
  END IF;

  PERFORM public.validate_fabricator_hardener_proposal_payload(
    coalesce(v_pos.system_pack_id, 'unknown'),
    trim(p_proposed_hardener_code),
    coalesce(p_engineering_evidence, '{}'::JSONB),
    coalesce(p_compatibility_checks, '[]'::JSONB),
    p_opening_type,
    p_material,
    p_glass_thickness_mm,
    p_sash_width_mm,
    p_sash_height_mm,
    p_sash_weight_kg
  );

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

-- Authority with N/A packs + scoped override enforcement
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
  v_scope TEXT;
  v_override_position UUID;
  v_source_pack TEXT;
  v_source_project UUID;
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

  IF NOT public.system_pack_requires_hardener(v_pos.system_pack_id) THEN
    proposal_id := NULL;
    hardener_code := NULL;
    status := 'not_applicable';
    approval_version := NULL;
    override_id := NULL;
    manufacturing_cleared := TRUE;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Direct approved proposal for this position + revision
  SELECT p.id, p.proposed_hardener_code, p.status, p.approval_version, o.id, o.scope, o.position_id
    INTO v_proposal_id, v_code, v_status, v_version, v_override_id, v_scope, v_override_position
  FROM public.fabricator_hardener_proposals p
  LEFT JOIN public.fabricator_hardener_overrides o
    ON o.proposal_id = p.id AND o.revoked_at IS NULL
  WHERE p.position_id = p_position_id
    AND p.status = 'approved'
    AND p.position_revision = v_pos.qc_revision
  ORDER BY p.updated_at DESC
  LIMIT 1;

  -- Scoped override from another position in same project / system pack
  IF v_proposal_id IS NULL THEN
    SELECT p.id, coalesce(o.hardener_code, p.proposed_hardener_code), p.status, p.approval_version,
           o.id, o.scope, o.position_id, p.system_pack_id, pos.project_id
      INTO v_proposal_id, v_code, v_status, v_version, v_override_id, v_scope, v_override_position,
           v_source_pack, v_source_project
    FROM public.fabricator_hardener_overrides o
    JOIN public.fabricator_hardener_proposals p ON p.id = o.proposal_id
    JOIN public.fabricator_positions_v2 pos ON pos.id = o.position_id
    WHERE o.revoked_at IS NULL
      AND p.status = 'approved'
      AND (
        (o.scope = 'project' AND pos.project_id = v_pos.project_id)
        OR (o.scope = 'system_pack' AND p.system_pack_id = v_pos.system_pack_id)
      )
    ORDER BY o.created_at DESC
    LIMIT 1;
  END IF;

  IF v_proposal_id IS NULL THEN
    -- Explicitly block known non-approved proposal states for clearer errors
    IF EXISTS (
      SELECT 1 FROM public.fabricator_hardener_proposals p
      WHERE p.position_id = p_position_id
        AND p.position_revision = v_pos.qc_revision
        AND p.status IN ('pending', 'rejected', 'stale', 'revoked')
    ) THEN
      RAISE EXCEPTION 'hardener proposal not approved (pending/rejected/stale/revoked block manufacturing)'
        USING ERRCODE = 'P0001';
    END IF;
    RAISE EXCEPTION 'hardener verification required (manufacturing stop)'
      USING ERRCODE = 'P0001';
  END IF;

  -- Position-scoped override must match this position only
  IF v_override_id IS NOT NULL AND v_scope = 'position'
     AND v_override_position IS DISTINCT FROM p_position_id THEN
    RAISE EXCEPTION 'hardener override scope does not cover this position'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_override_id IS NOT NULL AND v_scope = 'project'
     AND v_source_project IS NOT NULL AND v_source_project IS DISTINCT FROM v_pos.project_id THEN
    RAISE EXCEPTION 'hardener override scope does not cover this project'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_override_id IS NOT NULL AND v_scope = 'system_pack'
     AND v_source_pack IS NOT NULL AND v_source_pack IS DISTINCT FROM v_pos.system_pack_id THEN
    RAISE EXCEPTION 'hardener override scope does not cover this system pack'
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

-- Shared assert used by manufacturing / optimization / release gates
CREATE OR REPLACE FUNCTION public.assert_fabricator_hardener_cleared(
  p_position_id UUID,
  p_expected_revision BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_cleared BOOLEAN;
BEGIN
  SELECT manufacturing_cleared INTO v_cleared
  FROM public.get_fabricator_hardener_authority(p_position_id, p_expected_revision)
  LIMIT 1;
  IF v_cleared IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'hardener verification required (manufacturing stop)'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_fabricator_hardener_cleared(UUID, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_fabricator_hardener_cleared(UUID, BIGINT) TO authenticated;

-- Wire into optimization evidence recording / convert-to-order
CREATE OR REPLACE FUNCTION public.record_fabricator_optimization_evidence(
  p_position_id UUID,
  p_expected_revision BIGINT,
  p_design_revision BIGINT,
  p_ledger_fingerprint TEXT,
  p_system_pack_revision BIGINT,
  p_rule_version TEXT,
  p_cut_count INTEGER,
  p_evidence_payload JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_pos public.fabricator_positions_v2%ROWTYPE;
  v_authority_id UUID;
  v_authority_pack TEXT;
  v_authority_rev BIGINT;
  v_authority_revoked TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_position_id IS NULL OR coalesce(p_expected_revision, 0) <= 0 THEN
    RAISE EXCEPTION 'position and positive expected revision required';
  END IF;
  IF coalesce(p_design_revision, 0) <= 0 THEN
    RAISE EXCEPTION 'positive design revision required';
  END IF;
  IF length(trim(coalesce(p_ledger_fingerprint, ''))) < 8 THEN
    RAISE EXCEPTION 'ledger fingerprint required';
  END IF;
  IF coalesce(p_system_pack_revision, 0) <= 0 THEN
    RAISE EXCEPTION 'positive system pack revision required';
  END IF;
  IF length(trim(coalesce(p_rule_version, ''))) < 1 THEN
    RAISE EXCEPTION 'rule version required';
  END IF;
  IF coalesce(p_cut_count, 0) <= 0 THEN
    RAISE EXCEPTION 'positive cut count required';
  END IF;

  SELECT * INTO v_pos
  FROM public.fabricator_positions_v2
  WHERE id = p_position_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'position not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_pos.owner_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'position owner mismatch' USING ERRCODE = '42501';
  END IF;
  IF v_pos.qc_revision IS DISTINCT FROM p_expected_revision THEN
    RAISE EXCEPTION 'stale position revision (expected %, actual %)',
      p_expected_revision, v_pos.qc_revision;
  END IF;
  IF v_pos.system_pack_id IS NULL OR length(trim(v_pos.system_pack_id)) = 0 THEN
    RAISE EXCEPTION 'position system pack required';
  END IF;
  IF coalesce(v_pos.quantity, 0) <= 0 THEN
    RAISE EXCEPTION 'position quantity required';
  END IF;

  -- #68 hardener gate (N/A packs clear automatically)
  PERFORM public.assert_fabricator_hardener_cleared(p_position_id, p_expected_revision);

  SELECT a.approval_id, a.system_pack_id, a.system_pack_revision, a.revoked_at
    INTO v_authority_id, v_authority_pack, v_authority_rev, v_authority_revoked
  FROM public.fabricator_manufacturing_authority_revisions a
  WHERE a.system_pack_id = v_pos.system_pack_id
    AND a.revoked_at IS NULL
  ORDER BY a.system_pack_revision DESC
  LIMIT 1;

  IF v_authority_id IS NULL THEN
    RAISE EXCEPTION 'approved manufacturing authority is unavailable'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_authority_revoked IS NOT NULL THEN
    RAISE EXCEPTION 'manufacturing authority revoked' USING ERRCODE = 'P0001';
  END IF;
  IF v_authority_rev IS DISTINCT FROM p_system_pack_revision THEN
    RAISE EXCEPTION 'system pack revision mismatch (evidence %, authority %)',
      p_system_pack_revision, v_authority_rev;
  END IF;

  -- Upsert authoritative stamp (one row per position; history via invalidation timestamps).
  INSERT INTO public.fabricator_optimization_evidence (
    position_id, owner_user_id, project_id,
    position_revision, design_revision, ledger_fingerprint,
    system_pack_id, system_pack_revision, rule_version,
    quantity, cut_count, authority_approval_id, evidence_payload,
    validated_at, invalidated_at, invalidation_reason
  ) VALUES (
    p_position_id, v_uid, v_pos.project_id,
    v_pos.qc_revision, p_design_revision, trim(p_ledger_fingerprint),
    v_pos.system_pack_id, p_system_pack_revision, trim(p_rule_version),
    v_pos.quantity, p_cut_count, v_authority_id,
    coalesce(p_evidence_payload, '{}'::JSONB),
    now(), NULL, NULL
  )
  ON CONFLICT (position_id) DO UPDATE SET
    owner_user_id = EXCLUDED.owner_user_id,
    project_id = EXCLUDED.project_id,
    position_revision = EXCLUDED.position_revision,
    design_revision = EXCLUDED.design_revision,
    ledger_fingerprint = EXCLUDED.ledger_fingerprint,
    system_pack_id = EXCLUDED.system_pack_id,
    system_pack_revision = EXCLUDED.system_pack_revision,
    rule_version = EXCLUDED.rule_version,
    quantity = EXCLUDED.quantity,
    cut_count = EXCLUDED.cut_count,
    authority_approval_id = EXCLUDED.authority_approval_id,
    evidence_payload = EXCLUDED.evidence_payload,
    validated_at = now(),
    invalidated_at = NULL,
    invalidation_reason = NULL;

  -- Do not UPDATE fabricator_positions_v2 here: qc_revision bump triggers would
  -- invalidate the evidence we just stamped. Convert reads this table only;
  -- client JSON on positions_v2.optimization never qualifies.

  RETURN p_position_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_fabricator_optimization_evidence(
  UUID, BIGINT, BIGINT, TEXT, BIGINT, TEXT, INTEGER, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_fabricator_optimization_evidence(
  UUID, BIGINT, BIGINT, TEXT, BIGINT, TEXT, INTEGER, JSONB
) TO authenticated;

CREATE OR REPLACE FUNCTION public.convert_fabricator_pose_quote_to_order(
  p_project_id UUID,
  p_position_id UUID,
  p_revision BIGINT,
  p_subtotal NUMERIC,
  p_tax_amount NUMERIC,
  p_total_amount NUMERIC,
  p_currency TEXT DEFAULT 'EGP',
  p_tax_rate NUMERIC DEFAULT 0.14,
  p_markup_percent NUMERIC DEFAULT NULL,
  p_line_items JSONB DEFAULT '[]'::JSONB,
  p_quote_payload JSONB DEFAULT '{}'::JSONB,
  p_customer_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  order_id UUID,
  pose_quote_id UUID,
  reused BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_pos public.fabricator_positions_v2%ROWTYPE;
  v_ev public.fabricator_optimization_evidence%ROWTYPE;
  v_authority_revoked TIMESTAMPTZ;
  v_quote_id UUID;
  v_existing_sub NUMERIC;
  v_existing_tax NUMERIC;
  v_existing_total NUMERIC;
  v_existing_items JSONB;
  v_existing_payload JSONB;
  v_order_id UUID;
  v_order_number TEXT;
  v_notes TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_project_id IS NULL OR p_position_id IS NULL THEN
    RAISE EXCEPTION 'project and position are required';
  END IF;
  IF coalesce(p_revision, 0) <= 0 THEN
    RAISE EXCEPTION 'positive revision required';
  END IF;
  IF p_subtotal IS NULL OR p_tax_amount IS NULL OR p_total_amount IS NULL
     OR p_subtotal < 0 OR p_tax_amount < 0 OR p_total_amount < 0 THEN
    RAISE EXCEPTION 'quote money fields must be finite and non-negative';
  END IF;
  IF abs(p_total_amount - (p_subtotal + p_tax_amount)) > 0.02 THEN
    RAISE EXCEPTION 'quote totals inconsistent (subtotal + tax ≠ total)';
  END IF;

  SELECT * INTO v_pos
  FROM public.fabricator_positions_v2
  WHERE id = p_position_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'position not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_pos.owner_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'position owner mismatch' USING ERRCODE = '42501';
  END IF;
  IF v_pos.project_id IS DISTINCT FROM p_project_id THEN
    RAISE EXCEPTION 'project/position mismatch';
  END IF;

  -- #68 hardener gate before convert
  PERFORM public.assert_fabricator_hardener_cleared(p_position_id, p_revision);

  -- Authoritative evidence: separate table only (ignore client optimization JSON).
  SELECT * INTO v_ev
  FROM public.fabricator_optimization_evidence e
  WHERE e.position_id = p_position_id
    AND e.invalidated_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'optimization evidence missing (server validation required)'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_ev.owner_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'evidence owner mismatch' USING ERRCODE = '42501';
  END IF;
  IF v_ev.position_revision IS DISTINCT FROM v_pos.qc_revision
     OR v_ev.position_revision IS DISTINCT FROM p_revision THEN
    RAISE EXCEPTION 'stale optimization evidence (revision mismatch)';
  END IF;
  IF v_ev.system_pack_id IS DISTINCT FROM v_pos.system_pack_id THEN
    RAISE EXCEPTION 'optimization evidence system pack mismatch';
  END IF;
  IF v_ev.quantity IS DISTINCT FROM v_pos.quantity THEN
    RAISE EXCEPTION 'optimization evidence quantity mismatch';
  END IF;

  SELECT a.revoked_at INTO v_authority_revoked
  FROM public.fabricator_manufacturing_authority_revisions a
  WHERE a.approval_id = v_ev.authority_approval_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'manufacturing authority missing for evidence';
  END IF;
  IF v_authority_revoked IS NOT NULL THEN
    RAISE EXCEPTION 'manufacturing authority revoked' USING ERRCODE = 'P0001';
  END IF;

  -- Look up existing quote at this revision (no silent money overwrite).
  SELECT q.id, q.subtotal, q.tax_amount, q.total_amount, q.line_items, q.quote_payload
    INTO v_quote_id, v_existing_sub, v_existing_tax, v_existing_total, v_existing_items, v_existing_payload
  FROM public.fabricator_pose_quotes q
  WHERE q.project_id = p_project_id
    AND q.position_id = p_position_id
    AND q.revision = p_revision
  FOR UPDATE;

  IF v_quote_id IS NOT NULL THEN
    IF v_existing_sub IS DISTINCT FROM p_subtotal
       OR v_existing_tax IS DISTINCT FROM p_tax_amount
       OR v_existing_total IS DISTINCT FROM p_total_amount
       OR coalesce(v_existing_items, '[]'::JSONB) IS DISTINCT FROM coalesce(p_line_items, '[]'::JSONB)
       OR coalesce(v_existing_payload, '{}'::JSONB) IS DISTINCT FROM coalesce(p_quote_payload, '{}'::JSONB)
    THEN
      RAISE EXCEPTION 'quote money/payload changed; use a new revision'
        USING ERRCODE = 'P0001';
    END IF;

    SELECT o.id INTO v_order_id
    FROM public.orders o
    WHERE o.fabricator_pose_quote_id = v_quote_id
      AND o.user_id = v_uid
    LIMIT 1;

    IF v_order_id IS NOT NULL THEN
      order_id := v_order_id;
      pose_quote_id := v_quote_id;
      reused := TRUE;
      RETURN NEXT;
      RETURN;
    END IF;
  ELSE
    INSERT INTO public.fabricator_pose_quotes (
      owner_user_id, project_id, position_id, revision, status,
      currency, subtotal, tax_amount, tax_rate, total_amount, markup_percent,
      line_items, quote_payload, updated_at
    ) VALUES (
      v_uid, p_project_id, p_position_id, p_revision, 'accepted',
      coalesce(nullif(trim(p_currency), ''), 'EGP'),
      p_subtotal, p_tax_amount, coalesce(p_tax_rate, 0.14), p_total_amount, p_markup_percent,
      coalesce(p_line_items, '[]'::JSONB),
      coalesce(p_quote_payload, '{}'::JSONB),
      now()
    )
    RETURNING id INTO v_quote_id;
  END IF;

  v_order_number := 'FO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  v_notes := coalesce(
    nullif(trim(p_customer_notes), ''),
    format('Pose quote %s · project=%s · position=%s · revision=%s', v_quote_id, p_project_id, p_position_id, p_revision)
  );

  INSERT INTO public.orders (
    order_number, user_id, fabricator_pose_quote_id, status,
    subtotal, tax_amount, discount_amount, shipping_cost, total_amount,
    currency, payment_status, billing_address, shipping_address
  ) VALUES (
    v_order_number, v_uid, v_quote_id, 'pending',
    p_subtotal, p_tax_amount, 0, 0, p_total_amount,
    coalesce(nullif(trim(p_currency), ''), 'EGP'),
    'pending',
    jsonb_build_object('notes', v_notes),
    '{}'::JSONB
  )
  RETURNING id INTO v_order_id;

  order_id := v_order_id;
  pose_quote_id := v_quote_id;
  reused := FALSE;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_fabricator_pose_quote_to_order(
  UUID, UUID, BIGINT, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC, NUMERIC, JSONB, JSONB, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_fabricator_pose_quote_to_order(
  UUID, UUID, BIGINT, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC, NUMERIC, JSONB, JSONB, TEXT
) TO authenticated;

-- Release gate: block insert without hardener clearance
CREATE OR REPLACE FUNCTION public.trg_assert_hardener_on_position_release()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.position_source = 'v2' THEN
    PERFORM public.assert_fabricator_hardener_cleared(NEW.position_id, NEW.revision);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assert_hardener_on_position_release ON public.fabricator_position_releases;
CREATE TRIGGER trg_assert_hardener_on_position_release
  BEFORE INSERT ON public.fabricator_position_releases
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_assert_hardener_on_position_release();

COMMENT ON FUNCTION public.assert_fabricator_hardener_cleared IS
  'Certified manufacturing/optimization/release gate: approved hardener or N/A pack, else stop.';

COMMIT;
