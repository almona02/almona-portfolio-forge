BEGIN;

CREATE OR REPLACE FUNCTION public.get_fabricator_qc_context(p_position_id UUID)
RETURNS TABLE(project_id UUID, position_id UUID, position_source TEXT, revision BIGINT, target_width_mm NUMERIC, target_height_mm NUMERIC, tolerance_mm NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_user UUID := auth.uid(); v_owner UUID; v_system TEXT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  SELECT p.project_id, p.id, 'v2', p.qc_revision, p.overall_width_mm, p.overall_height_mm, p.owner_user_id, p.system_pack_id
    INTO project_id, position_id, position_source, revision, target_width_mm, target_height_mm, v_owner, v_system
    FROM public.fabricator_positions_v2 p WHERE p.id = p_position_id FOR SHARE;
  IF NOT FOUND THEN
    SELECT p.project_id, p.id, 'v1', p.qc_revision, p.overall_width_mm, p.overall_height_mm, p.owner_user_id, p.system_pack_id
      INTO project_id, position_id, position_source, revision, target_width_mm, target_height_mm, v_owner, v_system
      FROM public.fabricator_positions p WHERE p.id = p_position_id FOR SHARE;
  END IF;
  IF project_id IS NULL OR v_owner IS DISTINCT FROM v_user THEN RAISE EXCEPTION 'position not found or not owned by inspector' USING ERRCODE = '42501'; END IF;
  IF (position_source = 'v2' AND NOT EXISTS (SELECT 1 FROM public.fabricator_projects_v2 p WHERE p.id = project_id AND p.owner_user_id = v_user))
     OR (position_source = 'v1' AND NOT EXISTS (SELECT 1 FROM public.fabricator_projects p WHERE p.id = project_id AND p.owner_user_id = v_user)) THEN
    RAISE EXCEPTION 'project not found or not owned by inspector' USING ERRCODE = '42501';
  END IF;
  SELECT r.dimensional_tolerance_mm INTO tolerance_mm FROM public.fabricator_qc_tolerance_rules r
    WHERE r.system_pack_id = v_system AND r.approved IS TRUE AND r.approved_by IS NOT NULL AND r.approved_at IS NOT NULL;
  IF tolerance_mm IS NULL OR tolerance_mm <= 0 OR tolerance_mm::TEXT IN ('NaN', 'Infinity', '-Infinity') THEN
    RAISE EXCEPTION 'approved dimensional tolerance rule is unavailable';
  END IF;
  IF target_width_mm IS NULL OR target_height_mm IS NULL OR target_width_mm <= 0 OR target_height_mm <= 0
     OR target_width_mm::TEXT IN ('NaN', 'Infinity', '-Infinity') OR target_height_mm::TEXT IN ('NaN', 'Infinity', '-Infinity') THEN
    RAISE EXCEPTION 'authoritative dimensions are unavailable';
  END IF;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_fabricator_qc_context(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_fabricator_qc_context(UUID) TO authenticated;

COMMIT;
