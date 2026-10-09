-- Authoritative optimization evidence hardening (local/staging candidate).
-- DO NOT apply to production without explicit owner authorization.
--
-- Closes gaps where record_fabricator_optimization_evidence accepted
-- client-supplied fingerprint + cut_count without validating placement payload:
-- stock overruns, missing cuts, cut_count mismatch, unspecified rules.

ALTER TABLE public.fabricator_optimization_evidence
  ADD COLUMN IF NOT EXISTS placement_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS server_cut_count INTEGER,
  ADD COLUMN IF NOT EXISTS validation_schema_version INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.fabricator_optimization_evidence.placement_fingerprint IS
  'Server-computed sha256 hex of canonicalized cuttingPlan placement (not client-trusted).';
COMMENT ON COLUMN public.fabricator_optimization_evidence.server_cut_count IS
  'Cut count recomputed from evidence_payload.cuttingPlan on the server.';

CREATE OR REPLACE FUNCTION public.canonicalize_optimization_placement(p_payload JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_plan JSONB;
  v_cut JSONB;
  v_parts TEXT[] := ARRAY[]::TEXT[];
  v_cuts TEXT[];
  v_stock TEXT;
  v_profile TEXT;
  i INT;
  j INT;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload->'cuttingPlan') IS DISTINCT FROM 'array' THEN
    RETURN '';
  END IF;

  FOR i IN 0 .. coalesce(jsonb_array_length(p_payload->'cuttingPlan'), 0) - 1 LOOP
    v_plan := p_payload->'cuttingPlan'->i;
    v_stock := coalesce(v_plan->>'stockLength', v_plan->>'stockLengthMm', '');
    v_profile := coalesce(v_plan->'profile'->>'id', v_plan->>'profileId', '');
    v_cuts := ARRAY[]::TEXT[];
    IF jsonb_typeof(v_plan->'cuts') = 'array' THEN
      FOR j IN 0 .. coalesce(jsonb_array_length(v_plan->'cuts'), 0) - 1 LOOP
        v_cut := v_plan->'cuts'->j;
        v_cuts := array_append(
          v_cuts,
          concat_ws(
            ':',
            coalesce(v_cut->>'cutId', v_cut->>'componentId', j::text),
            coalesce(v_cut->>'length', ''),
            coalesce(v_cut->>'angle', '0')
          )
        );
      END LOOP;
    END IF;
    SELECT coalesce(array_agg(x ORDER BY x), ARRAY[]::TEXT[]) INTO v_cuts FROM unnest(v_cuts) AS x;
    v_parts := array_append(
      v_parts,
      concat_ws('|', v_profile, v_stock, coalesce(array_to_string(v_cuts, ','), ''))
    );
  END LOOP;

  SELECT coalesce(array_agg(x ORDER BY x), ARRAY[]::TEXT[]) INTO v_parts FROM unnest(v_parts) AS x;
  RETURN coalesce(array_to_string(v_parts, ';'), '');
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_optimization_evidence_payload(
  p_payload JSONB,
  p_cut_count INTEGER,
  OUT o_server_cut_count INTEGER,
  OUT o_placement_fingerprint TEXT
)
RETURNS RECORD
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_plan JSONB;
  v_cut JSONB;
  v_stock NUMERIC;
  v_len NUMERIC;
  v_sum NUMERIC;
  v_count INTEGER := 0;
  i INT;
  j INT;
  v_canonical TEXT;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'evidence payload must be a JSON object';
  END IF;
  IF coalesce(p_payload->>'schema', '') IS DISTINCT FROM 'almona.optimization-result' THEN
    RAISE EXCEPTION 'evidence payload schema must be almona.optimization-result';
  END IF;
  IF coalesce((p_payload->>'schemaVersion')::INT, 0) < 1 THEN
    RAISE EXCEPTION 'evidence payload schemaVersion must be >= 1';
  END IF;
  IF jsonb_typeof(p_payload->'cuttingPlan') IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_payload->'cuttingPlan') = 0 THEN
    RAISE EXCEPTION 'evidence payload cuttingPlan required';
  END IF;

  FOR i IN 0 .. jsonb_array_length(p_payload->'cuttingPlan') - 1 LOOP
    v_plan := p_payload->'cuttingPlan'->i;
    BEGIN
      v_stock := NULLIF(coalesce(v_plan->>'stockLength', v_plan->>'stockLengthMm'), '')::NUMERIC;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'cuttingPlan[%] stockLength must be positive', i;
    END;
    IF v_stock IS NULL OR v_stock <= 0 THEN
      RAISE EXCEPTION 'cuttingPlan[%] stockLength must be positive', i;
    END IF;
    IF jsonb_typeof(v_plan->'cuts') IS DISTINCT FROM 'array'
       OR jsonb_array_length(v_plan->'cuts') = 0 THEN
      RAISE EXCEPTION 'cuttingPlan[%] has no placed cuts', i;
    END IF;

    v_sum := 0;
    FOR j IN 0 .. jsonb_array_length(v_plan->'cuts') - 1 LOOP
      v_cut := v_plan->'cuts'->j;
      BEGIN
        v_len := NULLIF(v_cut->>'length', '')::NUMERIC;
      EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'cuttingPlan[%].cuts[%] length missing or non-positive', i, j;
      END;
      IF v_len IS NULL OR v_len <= 0 THEN
        RAISE EXCEPTION 'cuttingPlan[%].cuts[%] length missing or non-positive', i, j;
      END IF;
      v_sum := v_sum + v_len;
      v_count := v_count + 1;
    END LOOP;

    IF v_sum > v_stock THEN
      RAISE EXCEPTION 'cuttingPlan[%] stock overrun (placed % mm > stock % mm)', i, v_sum, v_stock;
    END IF;
  END LOOP;

  IF v_count <= 0 THEN
    RAISE EXCEPTION 'no placed cuts in evidence payload';
  END IF;
  IF p_cut_count IS DISTINCT FROM v_count THEN
    RAISE EXCEPTION 'cut_count mismatch (client %, server %)', p_cut_count, v_count;
  END IF;

  v_canonical := public.canonicalize_optimization_placement(p_payload);
  IF length(v_canonical) < 8 THEN
    RAISE EXCEPTION 'placement canonicalization failed';
  END IF;

  o_server_cut_count := v_count;
  o_placement_fingerprint := encode(digest(v_canonical, 'sha256'), 'hex');
END;
$$;

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
  v_authority_rev BIGINT;
  v_authority_revoked TIMESTAMPTZ;
  v_server_cut_count INTEGER;
  v_placement_fp TEXT;
  v_ledger TEXT;
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

  v_ledger := trim(coalesce(p_ledger_fingerprint, ''));
  IF length(v_ledger) < 8 THEN
    RAISE EXCEPTION 'ledger fingerprint required';
  END IF;
  IF lower(v_ledger) IN ('undefined', 'null', 'placeholder', 'test', 'unspecified')
     OR v_ledger ~* '^ledger-fp-' THEN
    RAISE EXCEPTION 'ledger fingerprint is not authoritative';
  END IF;
  IF coalesce(p_system_pack_revision, 0) <= 0 THEN
    RAISE EXCEPTION 'positive system pack revision required';
  END IF;
  IF length(trim(coalesce(p_rule_version, ''))) < 1
     OR lower(trim(p_rule_version)) IN ('unspecified', 'unknown', 'n/a') THEN
    RAISE EXCEPTION 'rule version required';
  END IF;
  IF coalesce(p_cut_count, 0) <= 0 THEN
    RAISE EXCEPTION 'positive cut count required';
  END IF;

  SELECT v.o_server_cut_count, v.o_placement_fingerprint
    INTO v_server_cut_count, v_placement_fp
  FROM public.validate_optimization_evidence_payload(p_evidence_payload, p_cut_count) AS v;

  -- Ledger must equal placement digest or end with ||<placement digest>.
  IF v_ledger IS DISTINCT FROM v_placement_fp
     AND right(v_ledger, 64) IS DISTINCT FROM v_placement_fp
     AND position('||' || v_placement_fp IN v_ledger) = 0 THEN
    RAISE EXCEPTION 'ledger fingerprint does not bind to validated placement';
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
  IF p_design_revision IS DISTINCT FROM v_pos.qc_revision THEN
    RAISE EXCEPTION 'stale design revision (evidence %, position %)',
      p_design_revision, v_pos.qc_revision;
  END IF;
  IF v_pos.system_pack_id IS NULL OR length(trim(v_pos.system_pack_id)) = 0 THEN
    RAISE EXCEPTION 'position system pack required';
  END IF;
  IF coalesce(v_pos.quantity, 0) <= 0 THEN
    RAISE EXCEPTION 'position quantity required';
  END IF;

  PERFORM public.assert_fabricator_hardener_cleared(p_position_id, p_expected_revision);

  SELECT a.approval_id, a.system_pack_revision, a.revoked_at
    INTO v_authority_id, v_authority_rev, v_authority_revoked
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

  INSERT INTO public.fabricator_optimization_evidence (
    position_id, owner_user_id, project_id,
    position_revision, design_revision, ledger_fingerprint,
    system_pack_id, system_pack_revision, rule_version,
    quantity, cut_count, authority_approval_id, evidence_payload,
    placement_fingerprint, server_cut_count, validation_schema_version,
    validated_at, invalidated_at, invalidation_reason
  ) VALUES (
    p_position_id, v_uid, v_pos.project_id,
    v_pos.qc_revision, p_design_revision, v_ledger,
    v_pos.system_pack_id, p_system_pack_revision, trim(p_rule_version),
    v_pos.quantity, v_server_cut_count, v_authority_id,
    coalesce(p_evidence_payload, '{}'::JSONB),
    v_placement_fp, v_server_cut_count, 2,
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
    placement_fingerprint = EXCLUDED.placement_fingerprint,
    server_cut_count = EXCLUDED.server_cut_count,
    validation_schema_version = EXCLUDED.validation_schema_version,
    validated_at = now(),
    invalidated_at = NULL,
    invalidation_reason = NULL;

  RETURN p_position_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_fabricator_optimization_evidence(
  UUID, BIGINT, BIGINT, TEXT, BIGINT, TEXT, INTEGER, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_fabricator_optimization_evidence(
  UUID, BIGINT, BIGINT, TEXT, BIGINT, TEXT, INTEGER, JSONB
) TO authenticated;

REVOKE ALL ON FUNCTION public.validate_optimization_evidence_payload(JSONB, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_optimization_evidence_payload(JSONB, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.canonicalize_optimization_placement(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.canonicalize_optimization_placement(JSONB) TO authenticated;
