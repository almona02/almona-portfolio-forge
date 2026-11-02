BEGIN;

CREATE TABLE IF NOT EXISTS public.fabricator_qc_tolerance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_pack_id TEXT NOT NULL,
  dimensional_tolerance_mm NUMERIC NOT NULL CHECK (dimensional_tolerance_mm > 0),
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (system_pack_id)
);

ALTER TABLE public.fabricator_qc_tolerance_rules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fabricator_qc_tolerance_rules FROM anon, authenticated;
ALTER TABLE public.fabricator_quality_approvals ADD COLUMN IF NOT EXISTS request_hash TEXT;
UPDATE public.fabricator_quality_approvals SET request_hash = md5(evidence::TEXT) WHERE request_hash IS NULL;
ALTER TABLE public.fabricator_quality_approvals ALTER COLUMN request_hash SET NOT NULL;

CREATE OR REPLACE FUNCTION public.get_fabricator_qc_context(p_position_id UUID)
RETURNS TABLE(project_id UUID, position_id UUID, position_source TEXT, revision BIGINT, target_width_mm NUMERIC, target_height_mm NUMERIC, tolerance_mm NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_user UUID := auth.uid(); v_owner UUID; v_system TEXT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  SELECT p.project_id, p.id, 'v2', p.qc_revision, p.overall_width_mm, p.overall_height_mm, p.owner_user_id, p.system_pack_id
    INTO project_id, position_id, position_source, revision, target_width_mm, target_height_mm, v_owner, v_system
    FROM public.fabricator_positions_v2 p WHERE p.id = p_position_id;
  IF NOT FOUND THEN
    SELECT p.project_id, p.id, 'v1', p.qc_revision, p.overall_width_mm, p.overall_height_mm, p.owner_user_id, p.system_pack_id
      INTO project_id, position_id, position_source, revision, target_width_mm, target_height_mm, v_owner, v_system
      FROM public.fabricator_positions p WHERE p.id = p_position_id;
  END IF;
  IF project_id IS NULL OR v_owner IS DISTINCT FROM v_user THEN RAISE EXCEPTION 'position not found or not owned by inspector' USING ERRCODE = '42501'; END IF;
  IF (position_source = 'v2' AND NOT EXISTS (SELECT 1 FROM public.fabricator_projects_v2 p WHERE p.id = project_id AND p.owner_user_id = v_user))
     OR (position_source = 'v1' AND NOT EXISTS (SELECT 1 FROM public.fabricator_projects p WHERE p.id = project_id AND p.owner_user_id = v_user)) THEN
    RAISE EXCEPTION 'project not found or not owned by inspector' USING ERRCODE = '42501';
  END IF;
  SELECT r.dimensional_tolerance_mm INTO tolerance_mm FROM public.fabricator_qc_tolerance_rules r
    WHERE r.system_pack_id = v_system AND r.approved IS TRUE AND r.approved_by IS NOT NULL AND r.approved_at IS NOT NULL;
  IF tolerance_mm IS NULL THEN RAISE EXCEPTION 'approved dimensional tolerance rule is unavailable'; END IF;
  IF target_width_mm IS NULL OR target_height_mm IS NULL OR target_width_mm <= 0 OR target_height_mm <= 0 THEN RAISE EXCEPTION 'authoritative dimensions are unavailable'; END IF;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_fabricator_quality_control(p_position_id UUID, p_expected_revision BIGINT, p_evidence JSONB, p_idempotency_key UUID)
RETURNS TABLE(approval_id UUID, project_id UUID, position_id UUID, revision BIGINT, inspector_id UUID, approved_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user UUID := auth.uid(); v_ctx RECORD; v_existing public.fabricator_quality_approvals%ROWTYPE;
  v_required TEXT[] := ARRAY['measurements','design','model','optimization','materials','commands','documents']; v_check TEXT;
  v_width_text TEXT; v_height_text TEXT; v_width NUMERIC; v_height NUMERIC; v_hash TEXT := md5(p_evidence::TEXT);
  v_canonical JSONB;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_existing FROM public.fabricator_quality_approvals WHERE inspector_id = v_user AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.position_id IS DISTINCT FROM p_position_id OR v_existing.revision IS DISTINCT FROM p_expected_revision OR v_existing.request_hash IS DISTINCT FROM v_hash THEN
      RAISE EXCEPTION 'idempotency key was reused for a different approval request';
    END IF;
    RETURN QUERY SELECT v_existing.id, v_existing.project_id, v_existing.position_id, v_existing.revision, v_existing.inspector_id, v_existing.approved_at;
    RETURN;
  END IF;

  SELECT * INTO v_ctx FROM public.get_fabricator_qc_context(p_position_id);
  IF v_ctx.revision IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'position revision changed'; END IF;

  FOREACH v_check IN ARRAY v_required LOOP
    IF COALESCE((p_evidence -> 'checks' ->> v_check)::BOOLEAN, FALSE) IS NOT TRUE THEN RAISE EXCEPTION 'required inspection check missing: %', v_check; END IF;
  END LOOP;
  IF length(trim(COALESCE(p_evidence ->> 'notes', ''))) < 3 THEN RAISE EXCEPTION 'inspection notes are required'; END IF;
  IF p_evidence #> '{measurements,width,targetMm}' IS NOT NULL OR p_evidence #> '{measurements,height,targetMm}' IS NOT NULL
     OR p_evidence #> '{measurements,width,toleranceMm}' IS NOT NULL OR p_evidence #> '{measurements,height,toleranceMm}' IS NOT NULL THEN
    RAISE EXCEPTION 'targets and tolerances must not be supplied by the client';
  END IF;
  v_width_text := p_evidence #>> '{measurements,width,actualMm}'; v_height_text := p_evidence #>> '{measurements,height,actualMm}';
  IF v_width_text IS NULL OR v_height_text IS NULL OR v_width_text !~ '^[0-9]+([.][0-9]+)?$' OR v_height_text !~ '^[0-9]+([.][0-9]+)?$' THEN
    RAISE EXCEPTION 'finite dimensional measurements are required';
  END IF;
  v_width := v_width_text::NUMERIC; v_height := v_height_text::NUMERIC;
  IF v_width <= 0 OR v_height <= 0 OR abs(v_width - v_ctx.target_width_mm) > v_ctx.tolerance_mm OR abs(v_height - v_ctx.target_height_mm) > v_ctx.tolerance_mm THEN
    RAISE EXCEPTION 'dimensional evidence is outside approved tolerance';
  END IF;
  v_canonical := jsonb_set(jsonb_set(p_evidence, '{measurements,width}', (p_evidence #> '{measurements,width}') || jsonb_build_object('targetMm', v_ctx.target_width_mm, 'toleranceMm', v_ctx.tolerance_mm)), '{measurements,height}', (p_evidence #> '{measurements,height}') || jsonb_build_object('targetMm', v_ctx.target_height_mm, 'toleranceMm', v_ctx.tolerance_mm));

  RETURN QUERY INSERT INTO public.fabricator_quality_approvals(project_id, position_id, position_source, revision, inspector_id, evidence, idempotency_key, request_hash)
    VALUES(v_ctx.project_id, p_position_id, v_ctx.position_source, v_ctx.revision, v_user, v_canonical, p_idempotency_key, v_hash)
    RETURNING id, fabricator_quality_approvals.project_id, fabricator_quality_approvals.position_id, fabricator_quality_approvals.revision, fabricator_quality_approvals.inspector_id, fabricator_quality_approvals.approved_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_fabricator_qc_context(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_fabricator_qc_context(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.approve_fabricator_quality_control(UUID, BIGINT, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_fabricator_quality_control(UUID, BIGINT, JSONB, UUID) TO authenticated;

COMMIT;
