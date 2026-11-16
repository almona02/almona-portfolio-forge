CREATE OR REPLACE FUNCTION public.record_service_routine_review(
  p_version_id uuid,
  p_rationale text DEFAULT '',
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
  v_review public.service_routine_reviews%ROWTYPE;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    PERFORM admin_private.workflow_audit(
      NULL, 'service_routine_version', p_version_id, v_actor.uid, v_actor.role,
      'routine_authz_denied', NULL, NULL, 'record_service_routine_review',
      jsonb_build_object('version_id', p_version_id));
    RAISE EXCEPTION 'Support or admin required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_version FROM public.service_routine_versions WHERE id = p_version_id FOR UPDATE;
  IF NOT FOUND OR v_version.status IS DISTINCT FROM 'in_review' THEN
    RAISE EXCEPTION 'Version must be in_review' USING ERRCODE = '22023';
  END IF;
  IF v_actor.uid = v_version.author_id THEN
    PERFORM admin_private.workflow_audit(
      NULL, 'service_routine_version', p_version_id, v_actor.uid, v_actor.role,
      'routine_authz_denied', NULL, NULL, 'author cannot review own draft',
      jsonb_build_object('version_id', p_version_id, 'author_id', v_version.author_id));
    RAISE EXCEPTION 'Author cannot review own draft' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.service_routine_reviews (
    version_id, draft_revision, reviewer_id, reviewer_role, rationale, eligible_for_publish
  ) VALUES (
    p_version_id, v_version.draft_revision, v_actor.uid, v_actor.role, COALESCE(p_rationale, ''), true
  ) RETURNING * INTO v_review;

  PERFORM admin_private.workflow_audit(
    NULL, 'service_routine_version', p_version_id, v_actor.uid, v_actor.role,
    'routine_review_recorded', NULL, NULL, NULL,
    jsonb_build_object(
      'routine_id', v_version.routine_id,
      'version_id', p_version_id,
      'review_id', v_review.id,
      'draft_revision', v_version.draft_revision
    )
  );

  RETURN jsonb_build_object(
    'review_id', v_review.id,
    'version_id', p_version_id,
    'draft_revision', v_review.draft_revision,
    'eligible_for_publish', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_service_routine_version(
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
  v_errors text[];
  v_families text[];
  v_ordinal int;
  v_review_id uuid;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role IS DISTINCT FROM 'admin' THEN
    PERFORM admin_private.workflow_audit(
      NULL, 'service_routine_version', p_version_id, v_actor.uid, v_actor.role,
      'routine_authz_denied', NULL, NULL, 'publish_service_routine_version',
      jsonb_build_object('version_id', p_version_id));
    RAISE EXCEPTION 'Admin required' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_version_id::text, 0));

  SELECT * INTO v_version FROM public.service_routine_versions WHERE id = p_version_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotent repeat-publish
  IF v_version.status = 'published' THEN
    RETURN jsonb_build_object(
      'version_id', p_version_id,
      'status', 'published',
      'version_ordinal', v_version.version_ordinal,
      'idempotent', true
    );
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_version.routine_id::text, 1));

  v_errors := admin_private.routine_validate_payload(v_version.payload);
  v_families := admin_private.routine_family_set(v_version.routine_id);
  IF COALESCE(array_length(v_families, 1), 0) < 1 THEN
    v_errors := array_append(v_errors, 'at least one family applicability required');
  END IF;

  IF COALESCE(array_length(v_errors, 1), 0) > 0 THEN
    -- F-03: itemised 22023; deny rolls back this txn (no publish mutation/audit).
    PERFORM admin_private.workflow_audit(
      NULL, 'service_routine_version', p_version_id, v_actor.uid, v_actor.role,
      'routine_validation_denied', NULL, NULL, array_to_string(v_errors, '; '),
      jsonb_build_object('version_id', p_version_id, 'errors', to_jsonb(v_errors)));
    RAISE EXCEPTION 'Publish validation failed: %', array_to_string(v_errors, '; ')
      USING ERRCODE = '22023',
            DETAIL = array_to_string(v_errors, E'\n');
  END IF;

  SELECT id INTO v_review_id
  FROM public.service_routine_reviews
  WHERE version_id = p_version_id
    AND eligible_for_publish = true
    AND draft_revision = v_version.draft_revision
    AND reviewer_id IS DISTINCT FROM v_version.author_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_review_id IS NULL THEN
    PERFORM admin_private.workflow_audit(
      NULL, 'service_routine_version', p_version_id, v_actor.uid, v_actor.role,
      'routine_validation_denied', NULL, NULL, 'no eligible review for current draft_revision',
      jsonb_build_object('version_id', p_version_id, 'draft_revision', v_version.draft_revision));
    RAISE EXCEPTION 'Eligible review for exact draft_revision required' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(MAX(version_ordinal), 0) + 1 INTO v_ordinal
  FROM public.service_routine_versions
  WHERE routine_id = v_version.routine_id AND version_ordinal IS NOT NULL;

  UPDATE public.service_routine_versions
  SET status = 'published',
      version_ordinal = v_ordinal,
      published_at = now()
  WHERE id = p_version_id
  RETURNING * INTO v_version;

  UPDATE public.service_routines
  SET status = 'published', updated_at = now()
  WHERE id = v_version.routine_id;

  PERFORM admin_private.workflow_audit(
    NULL, 'service_routine_version', p_version_id, v_actor.uid, v_actor.role,
    'routine_published', 'in_review', 'published', NULL,
    jsonb_build_object(
      'routine_id', v_version.routine_id,
      'version_id', p_version_id,
      'version_ordinal', v_ordinal,
      'draft_revision', v_version.draft_revision,
      'review_id', v_review_id
    )
  );

  RETURN jsonb_build_object(
    'version_id', p_version_id,
    'status', 'published',
    'version_ordinal', v_ordinal,
    'idempotent', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.retire_service_routine_version(
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
      'routine_authz_denied', NULL, NULL, 'retire_service_routine_version',
      jsonb_build_object('version_id', p_version_id));
    RAISE EXCEPTION 'Admin required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_version FROM public.service_routine_versions WHERE id = p_version_id FOR UPDATE;
  IF NOT FOUND OR v_version.status IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION 'Published version required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.service_routine_versions
  SET status = 'retired', retired_at = now()
  WHERE id = p_version_id
  RETURNING * INTO v_version;

  -- If no other published versions remain, mark routine retired (code still reserved).
  IF NOT EXISTS (
    SELECT 1 FROM public.service_routine_versions
    WHERE routine_id = v_version.routine_id AND status = 'published'
  ) THEN
    UPDATE public.service_routines SET status = 'retired', updated_at = now()
    WHERE id = v_version.routine_id;
  END IF;

  PERFORM admin_private.workflow_audit(
    NULL, 'service_routine_version', p_version_id, v_actor.uid, v_actor.role,
    'routine_retired', 'published', 'retired', NULL,
    jsonb_build_object('routine_id', v_version.routine_id, 'version_id', p_version_id)
  );

  RETURN jsonb_build_object('version_id', p_version_id, 'status', 'retired');
END;
$$;

