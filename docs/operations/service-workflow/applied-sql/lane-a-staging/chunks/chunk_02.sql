CREATE OR REPLACE FUNCTION public.create_service_routine_draft(
  p_code text,
  p_name_en text,
  p_name_ar text DEFAULT '',
  p_description text DEFAULT '',
  p_payload jsonb DEFAULT '{"sections":[]}'::jsonb,
  p_families text[] DEFAULT ARRAY[]::text[],
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_routine public.service_routines%ROWTYPE;
  v_version public.service_routine_versions%ROWTYPE;
  v_digest text;
  v_family text;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role IS DISTINCT FROM 'admin' THEN
    PERFORM admin_private.workflow_audit(
      NULL, 'service_routine', NULL, v_actor.uid, v_actor.role,
      'routine_authz_denied', NULL, NULL, 'create_service_routine_draft',
      jsonb_build_object('code', p_code));
    RAISE EXCEPTION 'Admin required' USING ERRCODE = '42501';
  END IF;

  IF nullif(btrim(p_code), '') IS NULL OR nullif(btrim(p_name_en), '') IS NULL THEN
    RAISE EXCEPTION 'code and name_en required' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.service_routines WHERE code = btrim(p_code)) THEN
    PERFORM admin_private.workflow_audit(
      NULL, 'service_routine', NULL, v_actor.uid, v_actor.role,
      'routine_validation_denied', NULL, NULL, 'code already exists (including retired)',
      jsonb_build_object('code', btrim(p_code)));
    RAISE EXCEPTION 'Routine code already exists (including retired)' USING ERRCODE = '23505';
  END IF;

  v_digest := admin_private.routine_payload_digest(COALESCE(p_payload, '{"sections":[]}'::jsonb));

  INSERT INTO public.service_routines (code, name_en, name_ar, description, owner_id, status)
  VALUES (btrim(p_code), btrim(p_name_en), COALESCE(p_name_ar, ''), COALESCE(p_description, ''), v_actor.uid, 'draft')
  RETURNING * INTO v_routine;

  INSERT INTO public.service_routine_versions (
    routine_id, version_ordinal, status, payload, draft_revision, author_id
  ) VALUES (
    v_routine.id, NULL, 'draft', COALESCE(p_payload, '{"sections":[]}'::jsonb), v_digest, v_actor.uid
  ) RETURNING * INTO v_version;

  IF p_families IS NOT NULL THEN
    FOREACH v_family IN ARRAY p_families LOOP
      IF nullif(btrim(v_family), '') IS NULL THEN CONTINUE; END IF;
      INSERT INTO public.service_routine_applicability (routine_id, kind, value)
      VALUES (v_routine.id, 'family', btrim(v_family))
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  PERFORM admin_private.workflow_audit(
    NULL, 'service_routine', v_routine.id, v_actor.uid, v_actor.role,
    'routine_draft_created', NULL, 'draft', NULL,
    jsonb_build_object('routine_id', v_routine.id, 'version_id', v_version.id, 'draft_revision', v_digest, 'code', v_routine.code)
  );

  RETURN jsonb_build_object(
    'routine_id', v_routine.id,
    'version_id', v_version.id,
    'draft_revision', v_digest,
    'status', v_version.status,
    'code', v_routine.code
  );
END;
$$;

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
    RAISE EXCEPTION 'Stale draft revision' USING ERRCODE = '40001';
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

CREATE OR REPLACE FUNCTION public.submit_service_routine_for_review(
  p_version_id uuid,
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
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role IS DISTINCT FROM 'admin' THEN
    PERFORM admin_private.workflow_audit(
      NULL, 'service_routine_version', p_version_id, v_actor.uid, v_actor.role,
      'routine_authz_denied', NULL, NULL, 'submit_service_routine_for_review',
      jsonb_build_object('version_id', p_version_id));
    RAISE EXCEPTION 'Admin required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_version FROM public.service_routine_versions WHERE id = p_version_id FOR UPDATE;
  IF NOT FOUND OR v_version.status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'Draft version required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.service_routine_versions SET status = 'in_review' WHERE id = p_version_id
  RETURNING * INTO v_version;
  UPDATE public.service_routines SET status = 'in_review', updated_at = now() WHERE id = v_version.routine_id;

  PERFORM admin_private.workflow_audit(
    NULL, 'service_routine_version', p_version_id, v_actor.uid, v_actor.role,
    'routine_review_submitted', 'draft', 'in_review', NULL,
    jsonb_build_object('routine_id', v_version.routine_id, 'version_id', p_version_id, 'draft_revision', v_version.draft_revision)
  );

  RETURN jsonb_build_object('version_id', p_version_id, 'status', 'in_review', 'draft_revision', v_version.draft_revision);
END;
$$;

