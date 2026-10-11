-- PR #76 review repairs: authenticated owner-only ledger reads and profile-bound stock.
-- Forward migration; production promotion requires a separate owner grant.

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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_pos
  FROM public.fabricator_positions_v2
  WHERE id = p_position_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'position not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_pos.owner_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'position owner mismatch' USING ERRCODE = '42501';
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
    IF coalesce(v_prof->>'evidenceStatus', '') <> 'approved' THEN
      CONTINUE;
    END IF;
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
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_authority->'profiles') AS p
      WHERE p->>'evidenceStatus' = 'approved'
        AND trim(p->>'profileId') = v_profile
        AND (p->>'stockLengthMm')::NUMERIC = v_stock
    ) THEN
      RAISE EXCEPTION 'cuttingPlan[%] stock length is not approved for this profile', i;
    END IF;
  END LOOP;
END;
$$;

-- Supabase default privileges can explicitly grant anon EXECUTE; revoke it too.
REVOKE ALL ON FUNCTION public.derive_required_cuts_from_position(UUID, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.derive_required_cuts_from_position(UUID, BIGINT) TO authenticated;
REVOKE ALL ON FUNCTION public.record_fabricator_optimization_evidence(UUID, BIGINT, BIGINT, TEXT, BIGINT, TEXT, INTEGER, JSONB) FROM PUBLIC, anon;


-- Decimal fingerprints preserve shortest decimal input without float noise.
CREATE OR REPLACE FUNCTION public.canonical_jsonb_serialize(p_value JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_type TEXT;
  v_keys TEXT[];
  v_parts TEXT[] := ARRAY[]::TEXT[];
  v_key TEXT;
  v_num NUMERIC;
  v_num_text TEXT;
  i INT;
BEGIN
  IF p_value IS NULL THEN
    RETURN 'null';
  END IF;

  v_type := jsonb_typeof(p_value);

  IF v_type = 'null' THEN
    RETURN 'null';
  ELSIF v_type = 'boolean' THEN
    IF (p_value #>> '{}') = 'true' THEN
      RETURN 'true';
    END IF;
    RETURN 'false';
  ELSIF v_type = 'number' THEN
    v_num := (p_value #>> '{}')::NUMERIC;
    RETURN trim_scale(v_num)::TEXT;
  ELSIF v_type = 'string' THEN
    -- jsonb string scalar → JSON-escaped via to_json (text form includes quotes)
    RETURN to_json(p_value #>> '{}')::TEXT;
  ELSIF v_type = 'array' THEN
    IF jsonb_array_length(p_value) = 0 THEN
      RETURN '[]';
    END IF;
    FOR i IN 0 .. jsonb_array_length(p_value) - 1 LOOP
      v_parts := array_append(v_parts, public.canonical_jsonb_serialize(p_value->i));
    END LOOP;
    RETURN '[' || array_to_string(v_parts, ', ') || ']';
  ELSIF v_type = 'object' THEN
    SELECT coalesce(array_agg(k ORDER BY k COLLATE "C"), ARRAY[]::TEXT[])
      INTO v_keys
    FROM jsonb_object_keys(p_value) AS k;
    IF coalesce(array_length(v_keys, 1), 0) = 0 THEN
      RETURN '{}';
    END IF;
    FOREACH v_key IN ARRAY v_keys LOOP
      v_parts := array_append(
        v_parts,
        to_json(v_key)::TEXT || ': ' || public.canonical_jsonb_serialize(p_value->v_key)
      );
    END LOOP;
    RETURN '{' || array_to_string(v_parts, ', ') || '}';
  END IF;

  RETURN 'null';
END;
$$;

-- pgcrypto lives in extensions on Supabase; do not depend on out-of-repo public wrappers.
ALTER FUNCTION public.validate_optimization_evidence_payload(JSONB, INTEGER)
  SET search_path = pg_catalog, public, extensions;
ALTER FUNCTION public.approved_rule_content_fingerprint(JSONB)
  SET search_path = pg_catalog, public, extensions;
ALTER FUNCTION public.authority_content_fingerprint(JSONB)
  SET search_path = pg_catalog, public, extensions;
