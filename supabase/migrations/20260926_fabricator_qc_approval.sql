BEGIN;

ALTER TABLE public.fabricator_positions ADD COLUMN IF NOT EXISTS qc_revision BIGINT NOT NULL DEFAULT 1;
ALTER TABLE public.fabricator_positions_v2 ADD COLUMN IF NOT EXISTS qc_revision BIGINT NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.bump_fabricator_qc_revision()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.qc_revision := OLD.qc_revision + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bump_fabricator_positions_qc_revision ON public.fabricator_positions;
CREATE TRIGGER bump_fabricator_positions_qc_revision BEFORE UPDATE ON public.fabricator_positions
FOR EACH ROW EXECUTE FUNCTION public.bump_fabricator_qc_revision();

DROP TRIGGER IF EXISTS bump_fabricator_positions_v2_qc_revision ON public.fabricator_positions_v2;
CREATE TRIGGER bump_fabricator_positions_v2_qc_revision BEFORE UPDATE ON public.fabricator_positions_v2
FOR EACH ROW EXECUTE FUNCTION public.bump_fabricator_qc_revision();

CREATE TABLE IF NOT EXISTS public.fabricator_quality_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  position_id UUID NOT NULL,
  position_source TEXT NOT NULL CHECK (position_source IN ('v1', 'v2')),
  revision BIGINT NOT NULL CHECK (revision > 0),
  inspector_id UUID NOT NULL REFERENCES auth.users(id),
  evidence JSONB NOT NULL,
  idempotency_key UUID NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (inspector_id, idempotency_key),
  UNIQUE (position_id, position_source, revision)
);

ALTER TABLE public.fabricator_quality_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fabricator_quality_approvals_select_own ON public.fabricator_quality_approvals;
CREATE POLICY fabricator_quality_approvals_select_own ON public.fabricator_quality_approvals
FOR SELECT USING (inspector_id = auth.uid());

CREATE OR REPLACE FUNCTION public.approve_fabricator_quality_control(
  p_position_id UUID,
  p_expected_revision BIGINT,
  p_evidence JSONB,
  p_idempotency_key UUID
) RETURNS TABLE (
  approval_id UUID,
  project_id UUID,
  position_id UUID,
  revision BIGINT,
  inspector_id UUID,
  approved_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_project_id UUID;
  v_owner_id UUID;
  v_revision BIGINT;
  v_source TEXT;
  v_required TEXT[] := ARRAY['measurements','design','model','optimization','materials','commands','documents'];
  v_check TEXT;
  v_measurement JSONB;
  v_actual NUMERIC;
  v_target NUMERIC;
  v_tolerance NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;

  SELECT project_id, owner_user_id, qc_revision INTO v_project_id, v_owner_id, v_revision
  FROM public.fabricator_positions_v2 WHERE id = p_position_id FOR UPDATE;
  v_source := 'v2';
  IF NOT FOUND THEN
    SELECT project_id, owner_user_id, qc_revision INTO v_project_id, v_owner_id, v_revision
    FROM public.fabricator_positions WHERE id = p_position_id FOR UPDATE;
    v_source := 'v1';
  END IF;
  IF v_project_id IS NULL OR v_owner_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'position not found or not owned by inspector' USING ERRCODE = '42501';
  END IF;
  IF (v_source = 'v2' AND NOT EXISTS (SELECT 1 FROM public.fabricator_projects_v2 WHERE id = v_project_id AND owner_user_id = v_user_id))
     OR (v_source = 'v1' AND NOT EXISTS (SELECT 1 FROM public.fabricator_projects WHERE id = v_project_id AND owner_user_id = v_user_id)) THEN
    RAISE EXCEPTION 'project not found or not owned by inspector' USING ERRCODE = '42501';
  END IF;
  IF v_revision IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'position revision changed'; END IF;

  FOREACH v_check IN ARRAY v_required LOOP
    IF COALESCE((p_evidence -> 'checks' ->> v_check)::BOOLEAN, FALSE) IS NOT TRUE THEN
      RAISE EXCEPTION 'required inspection check missing: %', v_check;
    END IF;
  END LOOP;
  IF length(trim(COALESCE(p_evidence ->> 'notes', ''))) < 3 THEN RAISE EXCEPTION 'inspection notes are required'; END IF;

  FOREACH v_measurement IN ARRAY ARRAY[p_evidence -> 'measurements' -> 'width', p_evidence -> 'measurements' -> 'height'] LOOP
    v_actual := (v_measurement ->> 'actualMm')::NUMERIC;
    v_target := (v_measurement ->> 'targetMm')::NUMERIC;
    v_tolerance := (v_measurement ->> 'toleranceMm')::NUMERIC;
    IF v_actual <= 0 OR v_target <= 0 OR v_tolerance < 0 OR abs(v_actual - v_target) > v_tolerance THEN
      RAISE EXCEPTION 'dimensional evidence is outside approved tolerance';
    END IF;
  END LOOP;

  RETURN QUERY
  INSERT INTO public.fabricator_quality_approvals(project_id, position_id, position_source, revision, inspector_id, evidence, idempotency_key)
  VALUES (v_project_id, p_position_id, v_source, v_revision, v_user_id, p_evidence, p_idempotency_key)
  ON CONFLICT (inspector_id, idempotency_key) DO UPDATE SET idempotency_key = EXCLUDED.idempotency_key
  RETURNING id, fabricator_quality_approvals.project_id, fabricator_quality_approvals.position_id,
    fabricator_quality_approvals.revision, fabricator_quality_approvals.inspector_id, fabricator_quality_approvals.approved_at;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_fabricator_quality_control(UUID, BIGINT, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_fabricator_quality_control(UUID, BIGINT, JSONB, UUID) TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.fabricator_quality_approvals FROM anon, authenticated;

COMMIT;
