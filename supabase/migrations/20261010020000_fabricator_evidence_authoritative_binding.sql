-- Authoritative binding: server-derived design ledger + approved machining settings.
-- DO NOT apply to production without separate owner authorization.
--
-- - derive_required_cuts_from_position: pose components × quantity × catalogue
-- - record_*: compare placement to independent ledger (ignore client requiredCuts)
-- - kerf/trim/stock must match authority manufacturingSettings + profile stock lengths
-- - rule content fingerprint includes deductions, allowances, applicability

CREATE OR REPLACE FUNCTION public.derive_required_cuts_from_position(
  p_position_id UUID,
  p_expected_revision BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_pos public.fabricator_positions_v2%ROWTYPE;
  v_comp JSONB;
  v_cuts JSONB := '[]'::JSONB;
  v_profile_id TEXT;
  v_comp_id TEXT;
  v_qty INT;
  v_unit_qty INT;
  v_ci INT;
  v_li INT;
  v_q INT;
  v_u INT;
  v_length NUMERIC;
  v_ang NUMERIC;
  v_cut_id TEXT;
BEGIN
  SELECT * INTO v_pos
  FROM public.fabricator_positions_v2
  WHERE id = p_position_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'position not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_pos.qc_revision IS DISTINCT FROM p_expected_revision THEN
    RAISE EXCEPTION 'stale position revision (expected %, actual %)',
      p_expected_revision, v_pos.qc_revision;
  END IF;
  IF v_pos.components IS NULL OR jsonb_typeof(v_pos.components) IS DISTINCT FROM 'array'
     OR jsonb_array_length(v_pos.components) = 0 THEN
    RAISE EXCEPTION 'position design components required for design ledger';
  END IF;

  v_unit_qty := greatest(coalesce(v_pos.quantity, 1)::INT, 1);

  FOR v_ci IN 0 .. jsonb_array_length(v_pos.components) - 1 LOOP
    v_comp := v_pos.components->v_ci;
    v_comp_id := coalesce(nullif(trim(v_comp->>'id'), ''), '');
    v_profile_id := coalesce(
      nullif(trim(v_comp->'profile'->>'id'), ''),
      nullif(trim(v_comp->'profile'->>'profileCode'), ''),
      ''
    );
    IF length(v_comp_id) = 0 OR length(v_profile_id) = 0 THEN
      RAISE EXCEPTION 'component % missing id or profile id', v_ci;
    END IF;
    IF jsonb_typeof(v_comp->'cuttingLengths') IS DISTINCT FROM 'array'
       OR jsonb_array_length(v_comp->'cuttingLengths') = 0 THEN
      RAISE EXCEPTION 'component % cuttingLengths required', v_comp_id;
    END IF;

    v_qty := greatest(coalesce((v_comp->>'quantity')::INT, 1), 1);

    FOR v_q IN 1 .. v_qty LOOP
      FOR v_u IN 1 .. v_unit_qty LOOP
        FOR v_li IN 0 .. jsonb_array_length(v_comp->'cuttingLengths') - 1 LOOP
          BEGIN
            v_length := (v_comp->'cuttingLengths'->v_li #>> '{}')::NUMERIC;
          EXCEPTION WHEN others THEN
            RAISE EXCEPTION 'component % cut length invalid', v_comp_id;
          END;
          IF v_length IS NULL OR v_length <= 0 THEN
            RAISE EXCEPTION 'component % cut length must be positive', v_comp_id;
          END IF;

          v_ang := 0;
          IF jsonb_typeof(v_comp->'angles') = 'array'
             AND jsonb_array_length(v_comp->'angles') > v_li THEN
            BEGIN
              v_ang := coalesce((v_comp->'angles'->v_li #>> '{}')::NUMERIC, 0);
            EXCEPTION WHEN others THEN
              v_ang := 0;
            END;
          END IF;

          -- Match physicalCutForOccurrence: componentId:index (qty/unit expand as multiset copies)
          v_cut_id := concat_ws(':', v_comp_id, v_li::TEXT);
          v_cuts := v_cuts || jsonb_build_array(
            jsonb_build_object(
              'cutId', v_cut_id,
              'profileId', v_profile_id,
              'length', v_length,
              'angle', v_ang
            )
          );
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;

  IF jsonb_array_length(v_cuts) = 0 THEN
    RAISE EXCEPTION 'derived design ledger is empty';
  END IF;

  RETURN v_cuts;
END;
$$;

CREATE OR REPLACE FUNCTION public.authority_machining_settings(p_authority JSONB)
RETURNS TABLE(saw_kerf_mm NUMERIC, trim_cut_mm NUMERIC)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_kerf NUMERIC;
  v_trim NUMERIC;
BEGIN
  BEGIN
    v_kerf := NULLIF(p_authority #>> '{manufacturingSettings,sawKerfMm}', '')::NUMERIC;
    v_trim := NULLIF(p_authority #>> '{manufacturingSettings,trimCutMm}', '')::NUMERIC;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'authority manufacturingSettings kerf/trim invalid';
  END;
  -- Fail closed: approved settings required (no silent client defaults).
  IF v_kerf IS NULL OR v_kerf < 0 OR v_trim IS NULL OR v_trim < 0 THEN
    RAISE EXCEPTION 'authority manufacturingSettings.sawKerfMm/trimCutMm required';
  END IF;
  saw_kerf_mm := v_kerf;
  trim_cut_mm := v_trim;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.authority_permitted_stock_lengths(p_authority JSONB)
RETURNS NUMERIC[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_stocks NUMERIC[] := ARRAY[]::NUMERIC[];
  v_prof JSONB;
  v_stock NUMERIC;
  i INT;
BEGIN
  IF p_authority IS NULL OR jsonb_typeof(p_authority->'profiles') IS DISTINCT FROM 'array' THEN
    RETURN ARRAY[]::NUMERIC[];
  END IF;
  FOR i IN 0 .. jsonb_array_length(p_authority->'profiles') - 1 LOOP
    v_prof := p_authority->'profiles'->i;
    BEGIN
      v_stock := NULLIF(v_prof->>'stockLengthMm', '')::NUMERIC;
    EXCEPTION WHEN others THEN
      CONTINUE;
    END;
    IF v_stock IS NOT NULL AND v_stock > 0 AND NOT (v_stock = ANY (v_stocks)) THEN
      v_stocks := array_append(v_stocks, v_stock);
    END IF;
  END LOOP;
  RETURN v_stocks;
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
  v_deductions TEXT;
  v_allowances TEXT;
  v_applicability TEXT;
BEGIN
  IF p_cutting_rules IS NULL OR jsonb_typeof(p_cutting_rules) IS DISTINCT FROM 'array' THEN
    RETURN '';
  END IF;
  FOR i IN 0 .. coalesce(jsonb_array_length(p_cutting_rules), 0) - 1 LOOP
    v_rule := p_cutting_rules->i;
    IF coalesce(v_rule->>'evidenceStatus', '') IS DISTINCT FROM 'approved' THEN
      CONTINUE;
    END IF;
    v_deductions := coalesce(v_rule->'deductions', 'null'::JSONB)::TEXT;
    v_allowances := coalesce(v_rule->'allowances', 'null'::JSONB)::TEXT;
    v_applicability := coalesce(v_rule->'applicability', 'null'::JSONB)::TEXT;
    v_parts := array_append(
      v_parts,
      concat_ws(
        '|',
        coalesce(v_rule->>'approvalId', ''),
        coalesce(v_rule->>'ruleId', ''),
        coalesce(v_rule->>'revision', '0'),
        'approved',
        v_deductions,
        v_allowances,
        v_applicability
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

CREATE OR REPLACE FUNCTION public.authority_content_fingerprint(p_authority JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_settings TEXT;
  v_stocks TEXT;
  v_rules TEXT;
  v_canonical TEXT;
BEGIN
  v_settings := coalesce(p_authority->'manufacturingSettings', '{}'::JSONB)::TEXT;
  SELECT coalesce(string_agg(s::TEXT, ',' ORDER BY s), '')
    INTO v_stocks
  FROM unnest(public.authority_permitted_stock_lengths(p_authority)) AS s;
  v_rules := public.approved_rule_content_fingerprint(p_authority->'cuttingRules');
  v_canonical := concat_ws('||', v_settings, 'stocks=' || v_stocks, 'rules=' || v_rules);
  RETURN encode(digest(v_canonical, 'sha256'), 'hex');
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_evidence_against_authority(
  p_payload JSONB,
  p_authority JSONB
)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_kerf NUMERIC;
  v_trim NUMERIC;
  v_approved_kerf NUMERIC;
  v_approved_trim NUMERIC;
  v_stocks NUMERIC[];
  v_plan JSONB;
  v_stock NUMERIC;
  v_profile TEXT;
  v_approved_profiles TEXT[];
  i INT;
BEGIN
  SELECT saw_kerf_mm, trim_cut_mm
    INTO v_approved_kerf, v_approved_trim
  FROM public.authority_machining_settings(p_authority);

  BEGIN
    v_kerf := (p_payload->>'kerfMm')::NUMERIC;
    v_trim := (p_payload->>'trimMm')::NUMERIC;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'kerfMm/trimMm must be non-negative numbers';
  END;

  -- Reject reduced kerf/trim (zero-kerf tampering) and any mismatch vs approved.
  IF v_kerf IS DISTINCT FROM v_approved_kerf THEN
    RAISE EXCEPTION 'kerfMm does not match approved manufacturing settings';
  END IF;
  IF v_trim IS DISTINCT FROM v_approved_trim THEN
    RAISE EXCEPTION 'trimMm does not match approved manufacturing settings';
  END IF;

  v_stocks := public.authority_permitted_stock_lengths(p_authority);
  IF coalesce(array_length(v_stocks, 1), 0) = 0 THEN
    RAISE EXCEPTION 'authority permitted stock lengths required';
  END IF;

  SELECT coalesce(array_agg(DISTINCT trim(p->>'profileId')), ARRAY[]::TEXT[])
    INTO v_approved_profiles
  FROM jsonb_array_elements(p_authority->'profiles') AS p
  WHERE coalesce(p->>'evidenceStatus', '') = 'approved';

  FOR i IN 0 .. jsonb_array_length(p_payload->'cuttingPlan') - 1 LOOP
    v_plan := p_payload->'cuttingPlan'->i;
    BEGIN
      v_stock := NULLIF(coalesce(v_plan->>'stockLength', v_plan->>'stockLengthMm'), '')::NUMERIC;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'cuttingPlan[%] stockLength must be positive', i;
    END;
    IF v_stock IS NULL OR NOT (v_stock = ANY (v_stocks)) THEN
      RAISE EXCEPTION 'cuttingPlan[%] stock length is not in approved catalogue', i;
    END IF;
    v_profile := coalesce(nullif(trim(v_plan->'profile'->>'id'), ''), nullif(trim(v_plan->>'profileId'), ''), '');
    IF length(v_profile) = 0 OR NOT (v_profile = ANY (v_approved_profiles)) THEN
      RAISE EXCEPTION 'cuttingPlan[%] profile is not in approved catalogue', i;
    END IF;
  END LOOP;
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
  v_authority_fp TEXT;
  v_rule TEXT;
  v_derived_cuts JSONB;
  v_bound_payload JSONB;
  v_approved_kerf NUMERIC;
  v_approved_trim NUMERIC;
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

  -- Independent design ledger from saved pose (not client-supplied requiredCuts).
  v_derived_cuts := public.derive_required_cuts_from_position(p_position_id, p_expected_revision);

  SELECT saw_kerf_mm, trim_cut_mm
    INTO v_approved_kerf, v_approved_trim
  FROM public.authority_machining_settings(v_authority_payload);

  -- Bind payload to server ledger + approved machining settings (strip client requiredCuts).
  v_bound_payload := coalesce(p_evidence_payload, '{}'::JSONB)
    || jsonb_build_object(
      'schema', 'almona.optimization-result',
      'schemaVersion', 2,
      'requiredCuts', v_derived_cuts,
      'kerfMm', v_approved_kerf,
      'trimMm', v_approved_trim
    );

  PERFORM public.assert_evidence_against_authority(v_bound_payload, v_authority_payload);

  SELECT v.o_server_cut_count, v.o_placement_fingerprint, v.o_design_fingerprint
    INTO v_server_cut_count, v_placement_fp, v_design_fp
  FROM public.validate_optimization_evidence_payload(v_bound_payload, p_cut_count) AS v;

  -- Ledger must bind server design + placement.
  IF v_ledger IS DISTINCT FROM (v_design_fp || '||' || v_placement_fp) THEN
    RAISE EXCEPTION 'ledger fingerprint does not bind to design and placement digests';
  END IF;

  v_expected_rule := public.canonical_approved_rule_version(v_authority_payload->'cuttingRules');
  v_rule_content_fp := public.approved_rule_content_fingerprint(v_authority_payload->'cuttingRules');
  v_authority_fp := public.authority_content_fingerprint(v_authority_payload);
  IF length(v_rule_content_fp) < 16 OR length(v_authority_fp) < 16 THEN
    RAISE EXCEPTION 'approved cutting-rule content unavailable';
  END IF;
  -- Accept only content fingerprints (not bare ID labels).
  IF v_rule IS DISTINCT FROM v_rule_content_fp
     AND v_rule IS DISTINCT FROM v_authority_fp THEN
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
    v_pos.system_pack_id, p_system_pack_revision, v_rule_content_fp,
    v_pos.quantity, v_server_cut_count, v_authority_id,
    v_bound_payload,
    v_placement_fp, v_server_cut_count, 4,
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

REVOKE ALL ON FUNCTION public.derive_required_cuts_from_position(UUID, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.derive_required_cuts_from_position(UUID, BIGINT) TO authenticated;

REVOKE ALL ON FUNCTION public.authority_machining_settings(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authority_machining_settings(JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.authority_permitted_stock_lengths(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authority_permitted_stock_lengths(JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.authority_content_fingerprint(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authority_content_fingerprint(JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.assert_evidence_against_authority(JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_evidence_against_authority(JSONB, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.record_fabricator_optimization_evidence(
  UUID, BIGINT, BIGINT, TEXT, BIGINT, TEXT, INTEGER, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_fabricator_optimization_evidence(
  UUID, BIGINT, BIGINT, TEXT, BIGINT, TEXT, INTEGER, JSONB
) TO authenticated;

-- Vendor catalogue authority must ship versioned machining settings + rule content.
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
        'approvalId', 'c1000000-0000-4000-8000-000000000001',
        'deductions', jsonb_build_object('endDeductionMm', 20),
        'allowances', jsonb_build_object('weldMm', 3),
        'applicability', jsonb_build_object('materials', jsonb_build_array('aluminum'))
      )
    ),
    'toleranceRule', jsonb_build_object(
      'ruleId', p_pack_id || '-tolerance',
      'revision', 1,
      'evidenceStatus', 'approved',
      'approvalId', 'c1000000-0000-4000-8000-000000000002'
    ),
    'manufacturingSettings', jsonb_build_object(
      'sawKerfMm', 4,
      'trimCutMm', 0
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION public._vendor_catalogue_authority_payload(TEXT, UUID, BIGINT) FROM PUBLIC;
