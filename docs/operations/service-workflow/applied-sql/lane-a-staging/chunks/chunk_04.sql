CREATE OR REPLACE FUNCTION public.set_service_routine_applicability(
  p_routine_id uuid,
  p_kind text,
  p_value text,
  p_value_family text DEFAULT NULL,
  p_override_reason text DEFAULT NULL,
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
  v_families text[];
  v_needs_override boolean := false;
  v_row public.service_routine_applicability%ROWTYPE;
  v_action text := 'routine_applicability_set';
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role IS DISTINCT FROM 'admin' THEN
    PERFORM admin_private.workflow_audit(
      NULL, 'service_routine_applicability', p_routine_id, v_actor.uid, v_actor.role,
      'routine_authz_denied', NULL, NULL, 'set_service_routine_applicability',
      jsonb_build_object('routine_id', p_routine_id));
    RAISE EXCEPTION 'Admin required' USING ERRCODE = '42501';
  END IF;

  IF p_kind NOT IN ('family', 'manufacturer', 'catalog_model') THEN
    RAISE EXCEPTION 'Invalid applicability kind' USING ERRCODE = '22023';
  END IF;
  IF nullif(btrim(p_value), '') IS NULL THEN
    RAISE EXCEPTION 'value required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_routine FROM public.service_routines WHERE id = p_routine_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Routine not found' USING ERRCODE = 'P0002';
  END IF;

  -- Explicit manufacturer deny-list cannot be bypassed by override.
  IF p_kind = 'manufacturer' AND btrim(p_value) = ANY (v_routine.manufacturer_deny_list) THEN
    PERFORM admin_private.workflow_audit(
      NULL, 'service_routine', p_routine_id, v_actor.uid, v_actor.role,
      'routine_validation_denied', NULL, NULL, 'manufacturer on deny_list',
      jsonb_build_object('routine_id', p_routine_id, 'value', btrim(p_value)));
    RAISE EXCEPTION 'Manufacturer explicitly restricted' USING ERRCODE = '22023';
  END IF;
  IF p_kind = 'manufacturer'
     AND COALESCE(array_length(v_routine.manufacturer_allow_list, 1), 0) > 0
     AND NOT (btrim(p_value) = ANY (v_routine.manufacturer_allow_list)) THEN
    PERFORM admin_private.workflow_audit(
      NULL, 'service_routine', p_routine_id, v_actor.uid, v_actor.role,
      'routine_validation_denied', NULL, NULL, 'manufacturer not on allow_list',
      jsonb_build_object('routine_id', p_routine_id, 'value', btrim(p_value)));
    RAISE EXCEPTION 'Manufacturer not on allow_list' USING ERRCODE = '22023';
  END IF;

  v_families := admin_private.routine_family_set(p_routine_id);

  IF p_kind = 'family' THEN
    NULL; -- family links define the set
  ELSIF p_kind IN ('manufacturer', 'catalog_model') THEN
    IF nullif(btrim(COALESCE(p_value_family, '')), '') IS NULL THEN
      RAISE EXCEPTION 'value_family required for % links', p_kind USING ERRCODE = '22023';
    END IF;
    IF COALESCE(array_length(v_families, 1), 0) > 0
       AND NOT (btrim(p_value_family) = ANY (v_families)) THEN
      -- Family mismatch for model/manufacturer metadata: hard deny (not overrideable)
      PERFORM admin_private.workflow_audit(
        NULL, 'service_routine', p_routine_id, v_actor.uid, v_actor.role,
        'routine_validation_denied', NULL, NULL, 'family mismatch hard deny',
        jsonb_build_object('routine_id', p_routine_id, 'kind', p_kind, 'value_family', p_value_family));
      RAISE EXCEPTION 'Family not in routine family set' USING ERRCODE = '22023';
    END IF;
    -- Model/manufacturer soft mismatch vs declared manufacturer lists already handled;
    -- optional override path for future catalog family soft conflicts kept for contract:
    IF p_override_reason IS NOT NULL AND length(btrim(p_override_reason)) > 0 THEN
      v_needs_override := true;
      v_action := 'routine_applicability_override';
    END IF;
  END IF;

  INSERT INTO public.service_routine_applicability (
    routine_id, kind, value, value_family, override_reason, overridden_by, overridden_at
  ) VALUES (
    p_routine_id, p_kind, btrim(p_value), nullif(btrim(COALESCE(p_value_family, '')), ''),
    CASE WHEN v_needs_override THEN btrim(p_override_reason) ELSE NULL END,
    CASE WHEN v_needs_override THEN v_actor.uid ELSE NULL END,
    CASE WHEN v_needs_override THEN now() ELSE NULL END
  )
  ON CONFLICT (routine_id, kind, value) DO UPDATE
    SET value_family = EXCLUDED.value_family,
        override_reason = EXCLUDED.override_reason,
        overridden_by = EXCLUDED.overridden_by,
        overridden_at = EXCLUDED.overridden_at
  RETURNING * INTO v_row;

  PERFORM admin_private.workflow_audit(
    NULL, 'service_routine_applicability', v_row.id, v_actor.uid, v_actor.role,
    v_action, NULL, NULL, NULL,
    jsonb_build_object(
      'routine_id', p_routine_id,
      'applicability_id', v_row.id,
      'kind', p_kind,
      'value', btrim(p_value),
      'override', v_needs_override
    )
  );

  RETURN jsonb_build_object(
    'applicability_id', v_row.id,
    'routine_id', p_routine_id,
    'kind', p_kind,
    'value', btrim(p_value),
    'override', v_needs_override
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_service_routine_preview(
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
  v_routine public.service_routines%ROWTYPE;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  SELECT * INTO v_version FROM public.service_routine_versions WHERE id = p_version_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO v_routine FROM public.service_routines WHERE id = v_version.routine_id;

  IF v_version.status IN ('draft', 'in_review') THEN
    IF v_actor.role NOT IN ('admin', 'support') THEN
      RAISE EXCEPTION 'Draft preview denied' USING ERRCODE = '42501';
    END IF;
  ELSIF v_version.status IN ('published', 'retired') THEN
    IF v_actor.role NOT IN ('admin', 'support', 'technician') THEN
      RAISE EXCEPTION 'Preview denied' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'Preview denied' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'routine_id', v_routine.id,
    'code', v_routine.code,
    'name_en', v_routine.name_en,
    'version_id', v_version.id,
    'version_ordinal', v_version.version_ordinal,
    'status', v_version.status,
    'draft_revision', v_version.draft_revision,
    'preview', admin_private.routine_preview_payload(v_version.payload),
    'read_only', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_next_service_routine_draft(
  p_routine_id uuid,
  p_payload jsonb DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_src public.service_routine_versions%ROWTYPE;
  v_version public.service_routine_versions%ROWTYPE;
  v_digest text;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin required' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.service_routine_versions
    WHERE routine_id = p_routine_id AND status IN ('draft', 'in_review')
  ) THEN
    RAISE EXCEPTION 'In-flight draft already exists' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_src
  FROM public.service_routine_versions
  WHERE routine_id = p_routine_id AND status IN ('published', 'retired')
  ORDER BY version_ordinal DESC NULLS LAST, created_at DESC
  LIMIT 1;

  v_digest := admin_private.routine_payload_digest(COALESCE(p_payload, COALESCE(v_src.payload, '{"sections":[]}'::jsonb)));

  INSERT INTO public.service_routine_versions (
    routine_id, version_ordinal, status, payload, draft_revision, author_id
  ) VALUES (
    p_routine_id, NULL, 'draft',
    COALESCE(p_payload, COALESCE(v_src.payload, '{"sections":[]}'::jsonb)),
    v_digest, v_actor.uid
  ) RETURNING * INTO v_version;

  UPDATE public.service_routines SET status = 'draft', updated_at = now() WHERE id = p_routine_id;

  PERFORM admin_private.workflow_audit(
    NULL, 'service_routine_version', v_version.id, v_actor.uid, v_actor.role,
    'routine_draft_created', NULL, 'draft', NULL,
    jsonb_build_object('routine_id', p_routine_id, 'version_id', v_version.id, 'draft_revision', v_digest, 'next', true)
  );

  RETURN jsonb_build_object('version_id', v_version.id, 'draft_revision', v_digest, 'status', 'draft');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_service_routine_manufacturer_restrictions(
  p_routine_id uuid,
  p_allow_list text[] DEFAULT NULL,
  p_deny_list text[] DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.service_routines
  SET manufacturer_allow_list = COALESCE(p_allow_list, manufacturer_allow_list),
      manufacturer_deny_list = COALESCE(p_deny_list, manufacturer_deny_list),
      updated_at = now()
  WHERE id = p_routine_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Routine not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN jsonb_build_object('routine_id', p_routine_id, 'ok', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants / RLS (RPC-only writes)
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.service_routines FROM PUBLIC, anon, authenticated;
