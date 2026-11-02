BEGIN;

CREATE TABLE IF NOT EXISTS public.fabricator_manufacturing_authority_revisions (
  approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_pack_id TEXT NOT NULL,
  system_pack_revision BIGINT NOT NULL CHECK (system_pack_revision > 0),
  authority_payload JSONB NOT NULL,
  approved_by UUID NOT NULL REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (system_pack_id, system_pack_revision),
  CHECK (jsonb_typeof(authority_payload) = 'object'),
  CHECK (authority_payload ->> 'schema' = 'almona.manufacturing-authority'),
  CHECK ((authority_payload ->> 'schemaVersion')::BIGINT = 1),
  CHECK (authority_payload #>> '{system,id}' = system_pack_id),
  CHECK ((authority_payload #>> '{systemPack,revision}')::BIGINT = system_pack_revision),
  CHECK (authority_payload #>> '{systemPack,evidenceStatus}' = 'approved'),
  CHECK (jsonb_typeof(authority_payload -> 'profiles') = 'array'),
  CHECK (jsonb_array_length(authority_payload -> 'profiles') >= 2),
  CHECK (jsonb_typeof(authority_payload -> 'cuttingRules') = 'array'),
  CHECK (jsonb_array_length(authority_payload -> 'cuttingRules') >= 1),
  CHECK (authority_payload #>> '{toleranceRule,evidenceStatus}' = 'approved'),
  CHECK ((revoked_at IS NULL AND revocation_reason IS NULL) OR
         (revoked_at IS NOT NULL AND length(trim(revocation_reason)) >= 3))
);

CREATE INDEX IF NOT EXISTS idx_fabricator_manufacturing_authority_active
  ON public.fabricator_manufacturing_authority_revisions(system_pack_id, system_pack_revision)
  WHERE revoked_at IS NULL;

ALTER TABLE public.fabricator_manufacturing_authority_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fabricator_manufacturing_authority_revisions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_fabricator_manufacturing_authority(
  p_position_id UUID,
  p_expected_revision BIGINT
)
RETURNS TABLE(
  project_id UUID,
  position_id UUID,
  position_source TEXT,
  position_revision BIGINT,
  authority_approval_id UUID,
  system_pack_id TEXT,
  system_pack_revision BIGINT,
  authority_payload JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_owner UUID;
  v_system_pack_id TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_expected_revision IS NULL OR p_expected_revision < 1 THEN
    RAISE EXCEPTION 'positive expected revision is required';
  END IF;

  SELECT position.project_id, position.id, 'v2', position.qc_revision,
         position.owner_user_id, position.system_pack_id
    INTO project_id, position_id, position_source, position_revision,
         v_owner, v_system_pack_id
  FROM public.fabricator_positions_v2 AS position
  WHERE position.id = p_position_id;

  IF NOT FOUND THEN
    SELECT position.project_id, position.id, 'v1', position.qc_revision,
           position.owner_user_id, position.system_pack_id
      INTO project_id, position_id, position_source, position_revision,
           v_owner, v_system_pack_id
    FROM public.fabricator_positions AS position
    WHERE position.id = p_position_id;
  END IF;

  IF position_id IS NULL OR v_owner IS DISTINCT FROM v_user THEN
    RAISE EXCEPTION 'position not found or not owned by requester' USING ERRCODE = '42501';
  END IF;
  IF position_revision IS DISTINCT FROM p_expected_revision THEN
    RAISE EXCEPTION 'position revision changed';
  END IF;
  IF (position_source = 'v2' AND NOT EXISTS (
        SELECT 1 FROM public.fabricator_projects_v2 AS project
        WHERE project.id = project_id AND project.owner_user_id = v_user
      )) OR
     (position_source = 'v1' AND NOT EXISTS (
        SELECT 1 FROM public.fabricator_projects AS project
        WHERE project.id = project_id AND project.owner_user_id = v_user
      )) THEN
    RAISE EXCEPTION 'project not found or not owned by requester' USING ERRCODE = '42501';
  END IF;

  SELECT authority.approval_id, authority.system_pack_id,
         authority.system_pack_revision, authority.authority_payload
    INTO authority_approval_id, system_pack_id,
         system_pack_revision, authority_payload
  FROM public.fabricator_manufacturing_authority_revisions AS authority
  WHERE authority.system_pack_id = v_system_pack_id
    AND authority.revoked_at IS NULL
  ORDER BY authority.system_pack_revision DESC
  LIMIT 1;

  IF authority_approval_id IS NULL THEN
    RAISE EXCEPTION 'approved manufacturing authority is unavailable';
  END IF;
  IF authority_payload #>> '{systemPack,approvalId}' IS DISTINCT FROM authority_approval_id::TEXT THEN
    RAISE EXCEPTION 'manufacturing authority approval identity is inconsistent';
  END IF;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_fabricator_manufacturing_authority(UUID, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_fabricator_manufacturing_authority(UUID, BIGINT) TO authenticated;

COMMIT;
