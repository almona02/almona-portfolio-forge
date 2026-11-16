-- STG-01: stale draft conflict must not use SQLSTATE 40001 (PostgREST serialization retry).
-- Function-only correction. Does not replay 20261116180000_service_routines_lane_a_authoring.
-- Preserves FOR UPDATE locking, revision comparison, admin authz, and success path.

CREATE OR REPLACE FUNCTION public.update_service_routine_draft(
  p_version_id uuid,
  p_expected_draft_revision text,
  p_payload jsonb,
  p_name_en text DEFAULT NULL,
  p_name_ar text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_version public.service_routine_versions%ROWTYPE;
  v_new_digest text;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role IS DISTINCT FROM 'admin' THEN
    PERFORM admin_private.workflow_audit(
      NULL, 'service_routine_version', p_version_id, v_actor.uid, v_actor.role,
      'routine_authz_denied', NULL, NULL, 'update_service_routine_draft',
      jsonb_build_object('version_id', p_version_id));
    RAISE EXCEPTION 'Admin required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_version FROM public.service_routine_versions WHERE id = p_version_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_version.status NOT IN ('draft', 'in_review') THEN
    RAISE EXCEPTION 'Only draft/in_review versions are editable' USING ERRCODE = '22023';
  END IF;
  IF v_version.draft_revision IS DISTINCT FROM p_expected_draft_revision THEN
    PERFORM admin_private.workflow_audit(
      NULL, 'service_routine_version', p_version_id, v_actor.uid, v_actor.role,
      'routine_draft_edit_conflict', NULL, NULL, 'stale draft_revision',
      jsonb_build_object(
        'version_id', p_version_id,
        'expected', p_expected_draft_revision,
        'current', v_version.draft_revision
      ));
    -- PT409 → HTTP 409 via PostgREST; DETAIL is the stable client identifier.
    -- Do not use 40001 here (application conflict, not serialization_failure).
    RAISE SQLSTATE 'PT409'
      USING MESSAGE = 'Stale draft revision',
            DETAIL = 'routine_draft_stale_revision',
            HINT = 'Reload draft_revision then retry save';
  END IF;

  v_new_digest := admin_private.routine_payload_digest(COALESCE(p_payload, v_version.payload));

  -- Content change returns in_review → draft (contract: Admin may return to draft; invalidates approval eligibility).
  UPDATE public.service_routine_versions
  SET payload = COALESCE(p_payload, payload),
      draft_revision = v_new_digest,
      content_updated_at = now(),
      status = 'draft'
  WHERE id = p_version_id
  RETURNING * INTO v_version;

  UPDATE public.service_routines
  SET name_en = COALESCE(nullif(btrim(p_name_en), ''), name_en),
      name_ar = COALESCE(p_name_ar, name_ar),
      description = COALESCE(p_description, description),
      status = 'draft',
      updated_at = now()
  WHERE id = v_version.routine_id;

  PERFORM admin_private.routine_invalidate_reviews(
    p_version_id, v_actor.uid, v_actor.role, 'content changed; draft_revision advanced'
  );

  PERFORM admin_private.workflow_audit(
    NULL, 'service_routine_version', p_version_id, v_actor.uid, v_actor.role,
    'routine_draft_updated', NULL, 'draft', NULL,
    jsonb_build_object('routine_id', v_version.routine_id, 'version_id', p_version_id, 'draft_revision', v_new_digest)
  );

  RETURN jsonb_build_object(
    'version_id', v_version.id,
    'draft_revision', v_new_digest,
    'status', v_version.status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_service_routine_draft(uuid, text, jsonb, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_service_routine_draft(uuid, text, jsonb, text, text, text, uuid) TO authenticated, service_role;
