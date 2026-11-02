-- Admin: stamp manufacturing authority from a client-built pack payload
-- (full catalogue packs outside the closed vendor one-click allowlist).
-- Provenance = admin_review (already permitted). No identity / cut-ledger bypass.

CREATE OR REPLACE FUNCTION public.admin_approve_pack_authority(
  p_system_pack_id TEXT,
  p_authority_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_id UUID := gen_random_uuid();
  v_rev BIGINT;
  v_pack TEXT := trim(coalesce(p_system_pack_id, ''));
  v_payload JSONB := coalesce(p_authority_payload, '{}'::JSONB);
  v_payload_pack TEXT;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF public.is_admin(v_admin) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'admin role required' USING ERRCODE = '42501';
  END IF;
  IF length(v_pack) < 2 THEN
    RAISE EXCEPTION 'system pack id required';
  END IF;

  IF coalesce(v_payload->>'schema', '') IS DISTINCT FROM 'almona.manufacturing-authority' THEN
    RAISE EXCEPTION 'authority payload schema required';
  END IF;
  IF coalesce((v_payload->>'schemaVersion')::INT, 0) < 1 THEN
    RAISE EXCEPTION 'authority payload schemaVersion required';
  END IF;

  v_payload_pack := coalesce(
    nullif(trim(v_payload->'systemPack'->>'id'), ''),
    nullif(trim(v_payload->'system'->>'id'), ''),
    ''
  );
  IF v_payload_pack IS DISTINCT FROM v_pack THEN
    RAISE EXCEPTION 'authority payload pack id mismatch (% vs %)', v_payload_pack, v_pack;
  END IF;

  IF jsonb_typeof(v_payload->'profiles') IS DISTINCT FROM 'array'
     OR jsonb_array_length(v_payload->'profiles') < 2 THEN
    RAISE EXCEPTION 'authority payload requires at least two approved profiles';
  END IF;

  IF jsonb_typeof(v_payload->'cuttingRules') IS DISTINCT FROM 'array'
     OR jsonb_array_length(v_payload->'cuttingRules') < 1 THEN
    RAISE EXCEPTION 'authority payload cuttingRules required';
  END IF;

  IF v_payload->'manufacturingSettings' IS NULL
     OR (v_payload->'manufacturingSettings'->>'sawKerfMm') IS NULL
     OR (v_payload->'manufacturingSettings'->>'trimCutMm') IS NULL THEN
    RAISE EXCEPTION 'authority payload manufacturingSettings.sawKerfMm/trimCutMm required';
  END IF;

  UPDATE public.fabricator_manufacturing_authority_revisions
    SET revoked_at = now(),
        revocation_reason = 'superseded by admin pack authority approval'
    WHERE system_pack_id = v_pack
      AND revoked_at IS NULL;

  SELECT COALESCE(MAX(system_pack_revision), 0) + 1 INTO v_rev
  FROM public.fabricator_manufacturing_authority_revisions
  WHERE system_pack_id = v_pack;

  v_payload := jsonb_set(v_payload, '{systemPack,revision}', to_jsonb(v_rev), true);
  v_payload := jsonb_set(v_payload, '{systemPack,approvalId}', to_jsonb(v_id::TEXT), true);
  v_payload := jsonb_set(v_payload, '{systemPack,evidenceStatus}', '"approved"'::JSONB, true);

  INSERT INTO public.fabricator_manufacturing_authority_revisions(
    approval_id, system_pack_id, system_pack_revision, authority_payload,
    approved_by, provenance
  ) VALUES (
    v_id, v_pack, v_rev, v_payload, v_admin, 'admin_review'
  );

  INSERT INTO public.fabricator_qc_tolerance_rules(
    system_pack_id, dimensional_tolerance_mm, approved, approved_by, approved_at
  )
  VALUES (v_pack, 1.5, TRUE, v_admin, now())
  ON CONFLICT (system_pack_id) DO UPDATE
    SET dimensional_tolerance_mm = EXCLUDED.dimensional_tolerance_mm,
        approved = TRUE,
        approved_by = EXCLUDED.approved_by,
        approved_at = COALESCE(public.fabricator_qc_tolerance_rules.approved_at, now());

  INSERT INTO public.fabricator_manufacturing_authority_audit(
    event, actor_user_id, approval_id, system_pack_id, details
  ) VALUES (
    'approve', v_admin, v_id, v_pack,
    jsonb_build_object('via', 'admin_pack_authority', 'provenance', 'admin_review', 'revision', v_rev)
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_pack_authority(TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_pack_authority(TEXT, JSONB) TO authenticated, service_role;
