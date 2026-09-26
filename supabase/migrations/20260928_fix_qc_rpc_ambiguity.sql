BEGIN;

CREATE OR REPLACE FUNCTION public.approve_fabricator_quality_control(p_position_id UUID, p_expected_revision BIGINT, p_evidence JSONB, p_idempotency_key UUID)
RETURNS TABLE(approval_id UUID, project_id UUID, position_id UUID, revision BIGINT, inspector_id UUID, approved_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user UUID := auth.uid();
  v_ctx RECORD;
  v_existing public.fabricator_quality_approvals%ROWTYPE;
  v_required TEXT[] := ARRAY['measurements','design','model','optimization','materials','commands','documents'];
  v_check TEXT;
  v_width_text TEXT;
  v_height_text TEXT;
  v_width NUMERIC;
  v_height NUMERIC;
  v_hash TEXT := md5(p_evidence::TEXT);
  v_canonical JSONB;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;

  SELECT approval.* INTO v_existing
  FROM public.fabricator_quality_approvals AS approval
  WHERE approval.inspector_id = v_user AND approval.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing.position_id IS DISTINCT FROM p_position_id
       OR v_existing.revision IS DISTINCT FROM p_expected_revision
       OR v_existing.request_hash IS DISTINCT FROM v_hash THEN
      RAISE EXCEPTION 'idempotency key was reused for a different approval request';
    END IF;
    RETURN QUERY SELECT v_existing.id, v_existing.project_id, v_existing.position_id, v_existing.revision, v_existing.inspector_id, v_existing.approved_at;
    RETURN;
  END IF;

  SELECT context.* INTO v_ctx FROM public.get_fabricator_qc_context(p_position_id) AS context;
  IF v_ctx.revision IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'position revision changed'; END IF;

  FOREACH v_check IN ARRAY v_required LOOP
    IF COALESCE((p_evidence -> 'checks' ->> v_check)::BOOLEAN, FALSE) IS NOT TRUE THEN
      RAISE EXCEPTION 'required inspection check missing: %', v_check;
    END IF;
  END LOOP;
  IF length(trim(COALESCE(p_evidence ->> 'notes', ''))) < 3 THEN RAISE EXCEPTION 'inspection notes are required'; END IF;
  IF p_evidence #> '{measurements,width,targetMm}' IS NOT NULL OR p_evidence #> '{measurements,height,targetMm}' IS NOT NULL
     OR p_evidence #> '{measurements,width,toleranceMm}' IS NOT NULL OR p_evidence #> '{measurements,height,toleranceMm}' IS NOT NULL THEN
    RAISE EXCEPTION 'targets and tolerances must not be supplied by the client';
  END IF;

  v_width_text := p_evidence #>> '{measurements,width,actualMm}';
  v_height_text := p_evidence #>> '{measurements,height,actualMm}';
  IF v_width_text IS NULL OR v_height_text IS NULL OR v_width_text !~ '^[0-9]+([.][0-9]+)?$' OR v_height_text !~ '^[0-9]+([.][0-9]+)?$' THEN
    RAISE EXCEPTION 'finite dimensional measurements are required';
  END IF;
  v_width := v_width_text::NUMERIC;
  v_height := v_height_text::NUMERIC;
  IF v_width <= 0 OR v_height <= 0 OR abs(v_width - v_ctx.target_width_mm) > v_ctx.tolerance_mm OR abs(v_height - v_ctx.target_height_mm) > v_ctx.tolerance_mm THEN
    RAISE EXCEPTION 'dimensional evidence is outside approved tolerance';
  END IF;

  v_canonical := jsonb_set(
    jsonb_set(p_evidence, '{measurements,width}', (p_evidence #> '{measurements,width}') || jsonb_build_object('targetMm', v_ctx.target_width_mm, 'toleranceMm', v_ctx.tolerance_mm)),
    '{measurements,height}', (p_evidence #> '{measurements,height}') || jsonb_build_object('targetMm', v_ctx.target_height_mm, 'toleranceMm', v_ctx.tolerance_mm)
  );

  RETURN QUERY
  INSERT INTO public.fabricator_quality_approvals AS approval(project_id, position_id, position_source, revision, inspector_id, evidence, idempotency_key, request_hash)
  VALUES(v_ctx.project_id, p_position_id, v_ctx.position_source, v_ctx.revision, v_user, v_canonical, p_idempotency_key, v_hash)
  RETURNING approval.id, approval.project_id, approval.position_id, approval.revision, approval.inspector_id, approval.approved_at;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_fabricator_quality_control(UUID, BIGINT, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_fabricator_quality_control(UUID, BIGINT, JSONB, UUID) TO authenticated;

COMMIT;
