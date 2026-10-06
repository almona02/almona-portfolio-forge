BEGIN;
CREATE TABLE public.fabricator_manufacturing_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id),
  position_id UUID NOT NULL,
  position_revision BIGINT NOT NULL CHECK (position_revision > 0),
  system_pack_id TEXT NOT NULL,
  catalogue_reference TEXT NOT NULL CHECK (length(trim(catalogue_reference)) BETWEEN 3 AND 1000),
  rule_reference TEXT NOT NULL CHECK (length(trim(rule_reference)) BETWEEN 3 AND 1000),
  notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 10000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approval_id UUID REFERENCES public.fabricator_manufacturing_authority_revisions(approval_id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fabricator_manufacturing_approval_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fabricator_manufacturing_approval_requests FROM anon, authenticated;
GRANT SELECT ON public.fabricator_manufacturing_approval_requests TO authenticated;
CREATE POLICY owner_read_approval_requests ON public.fabricator_manufacturing_approval_requests
  FOR SELECT TO authenticated USING (owner_user_id = auth.uid());

CREATE FUNCTION public.request_fabricator_manufacturing_approval(
  p_position_id UUID, p_expected_revision BIGINT,
  p_catalogue_reference TEXT, p_rule_reference TEXT, p_notes TEXT DEFAULT ''
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_owner UUID; v_revision BIGINT; v_system TEXT; v_project UUID; v_source TEXT; v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
  SELECT owner_user_id, qc_revision, system_pack_id, project_id, 'v2'
    INTO v_owner, v_revision, v_system, v_project, v_source FROM public.fabricator_positions_v2 WHERE id=p_position_id;
  IF NOT FOUND THEN
    SELECT owner_user_id, qc_revision, system_pack_id, project_id, 'v1'
      INTO v_owner, v_revision, v_system, v_project, v_source FROM public.fabricator_positions WHERE id=p_position_id;
  END IF;
  IF v_owner IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'position not owned' USING ERRCODE='42501'; END IF;
  IF v_revision IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'position revision changed'; END IF;
  IF (v_source='v2' AND NOT EXISTS (SELECT 1 FROM public.fabricator_projects_v2 WHERE id=v_project AND owner_user_id=auth.uid()))
     OR (v_source='v1' AND NOT EXISTS (SELECT 1 FROM public.fabricator_projects WHERE id=v_project AND owner_user_id=auth.uid())) THEN
    RAISE EXCEPTION 'project not owned' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.fabricator_manufacturing_approval_requests(owner_user_id,position_id,position_revision,system_pack_id,catalogue_reference,rule_reference,notes)
    VALUES(auth.uid(),p_position_id,p_expected_revision,v_system,trim(p_catalogue_reference),trim(p_rule_reference),coalesce(p_notes,'')) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.request_fabricator_manufacturing_approval(UUID,BIGINT,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_fabricator_manufacturing_approval(UUID,BIGINT,TEXT,TEXT,TEXT) TO authenticated;

-- Reviewer writes use the trusted service role; browser users cannot self-approve.
CREATE FUNCTION public.review_fabricator_manufacturing_approval(
  p_request_id UUID, p_approved_by UUID, p_authority_payload JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_request public.fabricator_manufacturing_approval_requests; v_id UUID := gen_random_uuid(); v_payload JSONB; v_ref JSONB;
BEGIN
  SELECT * INTO STRICT v_request FROM public.fabricator_manufacturing_approval_requests WHERE id=p_request_id FOR UPDATE;
  IF v_request.status <> 'pending' THEN RAISE EXCEPTION 'request already reviewed'; END IF;
  IF p_authority_payload->>'schema' IS DISTINCT FROM 'almona.manufacturing-authority'
     OR p_authority_payload->>'schemaVersion' IS DISTINCT FROM '1'
     OR coalesce((p_authority_payload#>>'{systemPack,revision}')::BIGINT,0) <= 0
     OR p_authority_payload#>>'{system,id}' IS DISTINCT FROM v_request.system_pack_id
     OR p_authority_payload#>>'{systemPack,id}' IS DISTINCT FROM v_request.system_pack_id
     OR p_authority_payload#>>'{systemPack,evidenceStatus}' IS DISTINCT FROM 'approved'
     OR p_authority_payload#>>'{toleranceRule,evidenceStatus}' IS DISTINCT FROM 'approved'
     OR jsonb_typeof(p_authority_payload->'profiles') IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_authority_payload->'cuttingRules') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'invalid reviewed authority';
  END IF;
  IF jsonb_array_length(p_authority_payload->'profiles') < 2 OR jsonb_array_length(p_authority_payload->'cuttingRules') < 1 THEN
    RAISE EXCEPTION 'authority requires profiles and cutting rules';
  END IF;
  FOR v_ref IN SELECT value FROM jsonb_array_elements(p_authority_payload->'profiles')
    UNION ALL SELECT value FROM jsonb_array_elements(p_authority_payload->'cuttingRules')
    UNION ALL SELECT p_authority_payload->'toleranceRule' LOOP
    IF v_ref->>'evidenceStatus' IS DISTINCT FROM 'approved' OR coalesce(v_ref->>'approvalId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'unapproved profile or cutting rule';
    END IF;
  END LOOP;
  FOR v_ref IN SELECT value FROM jsonb_array_elements(p_authority_payload->'profiles') LOOP
    IF coalesce(length(trim(v_ref->>'profileId')),0)=0 OR coalesce(length(trim(v_ref->>'role')),0)=0
       OR coalesce((v_ref->>'stockLengthMm')::NUMERIC,0) <= 0 THEN RAISE EXCEPTION 'invalid profile'; END IF;
  END LOOP;
  FOR v_ref IN SELECT value FROM jsonb_array_elements(p_authority_payload->'cuttingRules')
    UNION ALL SELECT p_authority_payload->'toleranceRule' LOOP
    IF coalesce(length(trim(v_ref->>'ruleId')),0)=0 OR coalesce((v_ref->>'revision')::BIGINT,0) <= 0 THEN
      RAISE EXCEPTION 'invalid rule';
    END IF;
  END LOOP;
  v_payload := jsonb_set(p_authority_payload, '{systemPack,approvalId}', to_jsonb(v_id::TEXT));
  INSERT INTO public.fabricator_manufacturing_authority_revisions(approval_id,system_pack_id,system_pack_revision,authority_payload,approved_by)
    VALUES(v_id,v_request.system_pack_id,(v_payload#>>'{systemPack,revision}')::BIGINT,v_payload,p_approved_by);
  UPDATE public.fabricator_manufacturing_approval_requests SET status='approved',approval_id=v_id WHERE id=p_request_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.review_fabricator_manufacturing_approval(UUID,UUID,JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_fabricator_manufacturing_approval(UUID,UUID,JSONB) TO service_role;
COMMIT;
