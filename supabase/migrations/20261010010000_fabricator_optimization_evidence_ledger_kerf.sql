-- Authoritative design-ledger reconciliation + kerf/trim bar-pack accounting.
-- Staging/local/prod candidate — apply only with owner authorization.
-- Closes gaps in 20261009160000:
--   1) stock check ignored kerf/trim (FP-023B: Σ(piece+kerf)+trim)
--   2) placement hash alone did not prove required design cuts
--   3) rule_version accepted free-form labels instead of approved content

CREATE OR REPLACE FUNCTION public.canonicalize_required_cuts(p_required JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_cut JSONB;
  v_parts TEXT[] := ARRAY[]::TEXT[];
  i INT;
  v_angle TEXT;
BEGIN
  IF p_required IS NULL OR jsonb_typeof(p_required) IS DISTINCT FROM 'array' THEN
    RETURN '';
  END IF;
  FOR i IN 0 .. coalesce(jsonb_array_length(p_required), 0) - 1 LOOP
    v_cut := p_required->i;
    v_angle := coalesce(v_cut->>'angle', '0');
    v_parts := array_append(
      v_parts,
      concat_ws(
        ':',
        coalesce(nullif(trim(v_cut->>'cutId'), ''), ''),
        coalesce(nullif(trim(v_cut->>'profileId'), ''), ''),
        to_char(coalesce((v_cut->>'length')::NUMERIC, 0), 'FM999999990.000'),
        v_angle
      )
    );
  END LOOP;
  SELECT coalesce(array_agg(x ORDER BY x), ARRAY[]::TEXT[]) INTO v_parts FROM unnest(v_parts) AS x;
  RETURN coalesce(array_to_string(v_parts, ';'), '');
END;
$$;

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
  v_kerf TEXT;
  v_trim TEXT;
  i INT;
  j INT;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload->'cuttingPlan') IS DISTINCT FROM 'array' THEN
    RETURN '';
  END IF;

  v_kerf := coalesce(p_payload->>'kerfMm', '4');
  v_trim := coalesce(p_payload->>'trimMm', '0');

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
      concat_ws(
        '|',
        v_profile,
        v_stock,
        'kerf=' || coalesce(v_plan->>'kerfMm', v_kerf),
        'trim=' || coalesce(v_plan->>'trimMm', v_trim),
        coalesce(array_to_string(v_cuts, ','), '')
      )
    );
  END LOOP;

  SELECT coalesce(array_agg(x ORDER BY x), ARRAY[]::TEXT[]) INTO v_parts FROM unnest(v_parts) AS x;
  RETURN coalesce(array_to_string(v_parts, ';'), '');
END;
$$;

CREATE OR REPLACE FUNCTION public.canonical_approved_rule_version(p_cutting_rules JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_parts TEXT[] := ARRAY[]::TEXT[];
  v_rule JSONB;
  i INT;
BEGIN
  IF p_cutting_rules IS NULL OR jsonb_typeof(p_cutting_rules) IS DISTINCT FROM 'array' THEN
    RETURN '';
  END IF;
  FOR i IN 0 .. coalesce(jsonb_array_length(p_cutting_rules), 0) - 1 LOOP
    v_rule := p_cutting_rules->i;
    IF coalesce(v_rule->>'evidenceStatus', '') IS DISTINCT FROM 'approved' THEN
      CONTINUE;
    END IF;
    v_parts := array_append(
      v_parts,
      concat_ws(
        ':',
        coalesce(v_rule->>'approvalId', ''),
        coalesce(v_rule->>'ruleId', ''),
        'r' || coalesce(v_rule->>'revision', '0')
      )
    );
  END LOOP;
  SELECT coalesce(array_agg(x ORDER BY x), ARRAY[]::TEXT[]) INTO v_parts FROM unnest(v_parts) AS x;
  RETURN coalesce(array_to_string(v_parts, '|'), '');
END;
$$;

CREATE OR REPLACE FUNCTION public.approved_rule_content_fingerprint(p_cutting_rules JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_parts TEXT[] := ARRAY[]::TEXT[];
  v_rule JSONB;
  i INT;
  v_canonical TEXT;
BEGIN
  IF p_cutting_rules IS NULL OR jsonb_typeof(p_cutting_rules) IS DISTINCT FROM 'array' THEN
    RETURN '';
  END IF;
  FOR i IN 0 .. coalesce(jsonb_array_length(p_cutting_rules), 0) - 1 LOOP
    v_rule := p_cutting_rules->i;
    IF coalesce(v_rule->>'evidenceStatus', '') IS DISTINCT FROM 'approved' THEN
      CONTINUE;
    END IF;
    v_parts := array_append(
      v_parts,
      concat_ws(
        '|',
        coalesce(v_rule->>'approvalId', ''),
        coalesce(v_rule->>'ruleId', ''),
        coalesce(v_rule->>'revision', '0'),
        'approved'
      )
    );
  END LOOP;
  SELECT coalesce(array_agg(x ORDER BY x), ARRAY[]::TEXT[]) INTO v_parts FROM unnest(v_parts) AS x;
  v_canonical := coalesce(array_to_string(v_parts, ';'), '');
  IF length(v_canonical) < 4 THEN
    RETURN '';
  END IF;
  RETURN encode(digest(v_canonical, 'sha256'), 'hex');
END;
$$;

DROP FUNCTION IF EXISTS public.validate_optimization_evidence_payload(JSONB, INTEGER);

CREATE OR REPLACE FUNCTION public.validate_optimization_evidence_payload(
  p_payload JSONB,
  p_cut_count INTEGER,
  OUT o_server_cut_count INTEGER,
  OUT o_placement_fingerprint TEXT,
  OUT o_design_fingerprint TEXT
)
RETURNS RECORD
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_plan JSONB;
  v_cut JSONB;
  v_req JSONB;
  v_stock NUMERIC;
  v_len NUMERIC;
  v_kerf NUMERIC;
  v_trim NUMERIC;
  v_consumed NUMERIC;
  v_count INTEGER := 0;
  i INT;
  j INT;
  v_canonical TEXT;
  v_design_canon TEXT;
  v_req_key TEXT;
  v_placed_key TEXT;
  v_required_keys TEXT[] := ARRAY[]::TEXT[];
  v_placed_keys TEXT[] := ARRAY[]::TEXT[];
  v_profile TEXT;
  v_cut_id TEXT;
  v_payload_kerf NUMERIC;
  v_payload_trim NUMERIC;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'evidence payload must be a JSON object';
  END IF;
  IF coalesce(p_payload->>'schema', '') IS DISTINCT FROM 'almona.optimization-result' THEN
    RAISE EXCEPTION 'evidence payload schema must be almona.optimization-result';
  END IF;
  IF coalesce((p_payload->>'schemaVersion')::INT, 0) < 2 THEN
    RAISE EXCEPTION 'evidence payload schemaVersion must be >= 2';
  END IF;
  IF jsonb_typeof(p_payload->'cuttingPlan') IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_payload->'cuttingPlan') = 0 THEN
    RAISE EXCEPTION 'evidence payload cuttingPlan required';
  END IF;
  IF jsonb_typeof(p_payload->'requiredCuts') IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_payload->'requiredCuts') = 0 THEN
    RAISE EXCEPTION 'evidence payload requiredCuts design ledger required';
  END IF;

  BEGIN
    v_payload_kerf := (p_payload->>'kerfMm')::NUMERIC;
    v_payload_trim := (p_payload->>'trimMm')::NUMERIC;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'kerfMm/trimMm must be non-negative numbers';
  END;
  IF v_payload_kerf IS NULL OR v_payload_kerf < 0 OR v_payload_trim IS NULL OR v_payload_trim < 0 THEN
    RAISE EXCEPTION 'kerfMm/trimMm must be non-negative numbers';
  END IF;

  FOR i IN 0 .. jsonb_array_length(p_payload->'requiredCuts') - 1 LOOP
    v_req := p_payload->'requiredCuts'->i;
    IF length(trim(coalesce(v_req->>'cutId', ''))) = 0
       OR length(trim(coalesce(v_req->>'profileId', ''))) = 0 THEN
      RAISE EXCEPTION 'requiredCuts[%] cutId and profileId required', i;
    END IF;
    BEGIN
      v_len := (v_req->>'length')::NUMERIC;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'requiredCuts[%] length must be positive', i;
    END;
    IF v_len IS NULL OR v_len <= 0 THEN
      RAISE EXCEPTION 'requiredCuts[%] length must be positive', i;
    END IF;
    v_required_keys := array_append(
      v_required_keys,
      concat_ws(
        ':',
        trim(v_req->>'cutId'),
        trim(v_req->>'profileId'),
        to_char(v_len, 'FM999999990.000'),
        coalesce(v_req->>'angle', '0')
      )
    );
  END LOOP;

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
    v_profile := coalesce(nullif(trim(v_plan->'profile'->>'id'), ''), nullif(trim(v_plan->>'profileId'), ''), '');
    IF length(v_profile) = 0 THEN
      RAISE EXCEPTION 'cuttingPlan[%] profile id required', i;
    END IF;
    IF jsonb_typeof(v_plan->'cuts') IS DISTINCT FROM 'array'
       OR jsonb_array_length(v_plan->'cuts') = 0 THEN
      RAISE EXCEPTION 'cuttingPlan[%] has no placed cuts', i;
    END IF;

    BEGIN
      v_kerf := coalesce(
        NULLIF(v_plan->>'kerfMm', '')::NUMERIC,
        NULLIF(v_plan->'profile'->'specifications'->>'sawKerf', '')::NUMERIC,
        v_payload_kerf
      );
      v_trim := coalesce(
        NULLIF(v_plan->>'trimMm', '')::NUMERIC,
        NULLIF(v_plan->'profile'->'specifications'->>'barEndTrim', '')::NUMERIC,
        v_payload_trim
      );
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'kerfMm/trimMm must be non-negative numbers';
    END;
    IF v_kerf IS NULL OR v_kerf < 0 OR v_trim IS NULL OR v_trim < 0 THEN
      RAISE EXCEPTION 'kerfMm/trimMm must be non-negative numbers';
    END IF;

    v_consumed := 0;
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
      v_cut_id := coalesce(nullif(trim(v_cut->>'cutId'), ''), nullif(trim(v_cut->>'componentId'), ''), '');
      IF length(v_cut_id) = 0 THEN
        RAISE EXCEPTION 'cuttingPlan[%].cuts[%] cutId required', i, j;
      END IF;
      v_consumed := v_consumed + v_len + v_kerf;
      v_count := v_count + 1;
      v_placed_keys := array_append(
        v_placed_keys,
        concat_ws(
          ':',
          v_cut_id,
          v_profile,
          to_char(v_len, 'FM999999990.000'),
          coalesce(v_cut->>'angle', '0')
        )
      );
    END LOOP;
    v_consumed := v_consumed + v_trim;

    IF v_consumed > v_stock THEN
      RAISE EXCEPTION
        'cuttingPlan[%] stock overrun (consumed % mm > stock % mm including kerf/trim)',
        i, v_consumed, v_stock;
    END IF;
  END LOOP;

  IF v_count <= 0 THEN
    RAISE EXCEPTION 'no placed cuts in evidence payload';
  END IF;
  IF p_cut_count IS DISTINCT FROM v_count THEN
    RAISE EXCEPTION 'cut_count mismatch (client %, server %)', p_cut_count, v_count;
  END IF;

  SELECT coalesce(array_agg(x ORDER BY x), ARRAY[]::TEXT[]) INTO v_required_keys FROM unnest(v_required_keys) AS x;
  SELECT coalesce(array_agg(x ORDER BY x), ARRAY[]::TEXT[]) INTO v_placed_keys FROM unnest(v_placed_keys) AS x;

  IF coalesce(array_length(v_required_keys, 1), 0) IS DISTINCT FROM coalesce(array_length(v_placed_keys, 1), 0) THEN
    RAISE EXCEPTION 'design ledger cut count mismatch (required %, placed %)',
      coalesce(array_length(v_required_keys, 1), 0),
      coalesce(array_length(v_placed_keys, 1), 0);
  END IF;

  FOR i IN 1 .. coalesce(array_length(v_required_keys, 1), 0) LOOP
    v_req_key := v_required_keys[i];
    IF NOT (v_req_key = ANY (v_placed_keys)) THEN
      -- Classify missing / wrong size / substituted
      IF EXISTS (
        SELECT 1 FROM unnest(v_placed_keys) pk
        WHERE split_part(pk, ':', 1) = split_part(v_req_key, ':', 1)
          AND split_part(pk, ':', 2) IS DISTINCT FROM split_part(v_req_key, ':', 2)
      ) THEN
        RAISE EXCEPTION 'design ledger substituted profile for cut %', split_part(v_req_key, ':', 1);
      END IF;
      IF EXISTS (
        SELECT 1 FROM unnest(v_placed_keys) pk
        WHERE split_part(pk, ':', 1) = split_part(v_req_key, ':', 1)
          AND split_part(pk, ':', 3) IS DISTINCT FROM split_part(v_req_key, ':', 3)
      ) THEN
        RAISE EXCEPTION 'design ledger wrongly sized cut %', split_part(v_req_key, ':', 1);
      END IF;
      RAISE EXCEPTION 'design ledger missing cut %', v_req_key;
    END IF;
  END LOOP;

  FOR i IN 1 .. coalesce(array_length(v_placed_keys, 1), 0) LOOP
    v_placed_key := v_placed_keys[i];
    IF (
      SELECT count(*) FROM unnest(v_placed_keys) pk WHERE pk = v_placed_key
    ) > (
      SELECT count(*) FROM unnest(v_required_keys) rk WHERE rk = v_placed_key
    ) THEN
      RAISE EXCEPTION 'design ledger duplicate cut %', v_placed_key;
    END IF;
    IF NOT (v_placed_key = ANY (v_required_keys)) THEN
      RAISE EXCEPTION 'design ledger unexpected cut %', v_placed_key;
    END IF;
  END LOOP;

  v_canonical := public.canonicalize_optimization_placement(p_payload);
  IF length(v_canonical) < 8 THEN
    RAISE EXCEPTION 'placement canonicalization failed';
  END IF;
  v_design_canon := public.canonicalize_required_cuts(p_payload->'requiredCuts');
  IF length(v_design_canon) < 8 THEN
    RAISE EXCEPTION 'design ledger canonicalization failed';
  END IF;

  o_server_cut_count := v_count;
  o_placement_fingerprint := encode(digest(v_canonical, 'sha256'), 'hex');
  o_design_fingerprint := encode(digest(v_design_canon, 'sha256'), 'hex');
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
  v_authority_payload JSONB;
  v_server_cut_count INTEGER;
  v_placement_fp TEXT;
  v_design_fp TEXT;
  v_ledger TEXT;
  v_expected_rule TEXT;
  v_rule_content_fp TEXT;
  v_rule TEXT;
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
  v_rule := trim(coalesce(p_rule_version, ''));
  IF length(v_rule) < 1
     OR lower(v_rule) IN ('unspecified', 'unknown', 'n/a') THEN
    RAISE EXCEPTION 'rule version required';
  END IF;
  IF coalesce(p_cut_count, 0) <= 0 THEN
    RAISE EXCEPTION 'positive cut count required';
  END IF;

  SELECT v.o_server_cut_count, v.o_placement_fingerprint, v.o_design_fingerprint
    INTO v_server_cut_count, v_placement_fp, v_design_fp
  FROM public.validate_optimization_evidence_payload(p_evidence_payload, p_cut_count) AS v;

  -- Ledger must bind design + placement: designFp||placementFp
  IF v_ledger IS DISTINCT FROM (v_design_fp || '||' || v_placement_fp) THEN
    RAISE EXCEPTION 'ledger fingerprint does not bind to design and placement digests';
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

  SELECT a.approval_id, a.system_pack_revision, a.revoked_at, a.authority_payload
    INTO v_authority_id, v_authority_rev, v_authority_revoked, v_authority_payload
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

  v_expected_rule := public.canonical_approved_rule_version(v_authority_payload->'cuttingRules');
  v_rule_content_fp := public.approved_rule_content_fingerprint(v_authority_payload->'cuttingRules');
  IF length(v_expected_rule) < 3 AND length(v_rule_content_fp) < 16 THEN
    RAISE EXCEPTION 'approved cutting-rule content unavailable';
  END IF;
  IF v_rule IS DISTINCT FROM v_expected_rule
     AND v_rule IS DISTINCT FROM v_rule_content_fp THEN
    RAISE EXCEPTION 'rule version does not match approved cutting-rule content';
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
    v_pos.system_pack_id, p_system_pack_revision, v_rule,
    v_pos.quantity, v_server_cut_count, v_authority_id,
    coalesce(p_evidence_payload, '{}'::JSONB),
    v_placement_fp, v_server_cut_count, 3,
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

REVOKE ALL ON FUNCTION public.validate_optimization_evidence_payload(JSONB, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_optimization_evidence_payload(JSONB, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.canonicalize_optimization_placement(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.canonicalize_optimization_placement(JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.canonicalize_required_cuts(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.canonicalize_required_cuts(JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.canonical_approved_rule_version(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.canonical_approved_rule_version(JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.approved_rule_content_fingerprint(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approved_rule_content_fingerprint(JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.record_fabricator_optimization_evidence(
  UUID, BIGINT, BIGINT, TEXT, BIGINT, TEXT, INTEGER, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_fabricator_optimization_evidence(
  UUID, BIGINT, BIGINT, TEXT, BIGINT, TEXT, INTEGER, JSONB
) TO authenticated;
