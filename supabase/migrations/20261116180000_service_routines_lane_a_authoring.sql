-- Lane A: service routine authoring (draft → review → publish → retire).
-- Local/disposable only until separately authorized. No assignment/pin/results.
-- Contract tip: 1350b749ffd999ef3206c9733f0bcfb47b483ce2
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE SCHEMA IF NOT EXISTS admin_private;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name_en text NOT NULL,
  name_ar text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  owner_id uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'published', 'retired')),
  manufacturer_allow_list text[] NOT NULL DEFAULT '{}',
  manufacturer_deny_list text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_routines_code_unique UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS public.service_routine_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid NOT NULL REFERENCES public.service_routines(id) ON DELETE CASCADE,
  version_ordinal integer,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'published', 'retired')),
  payload jsonb NOT NULL DEFAULT '{"sections":[]}'::jsonb,
  draft_revision text NOT NULL,
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  content_updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_routine_versions_ordinal_unique UNIQUE (routine_id, version_ordinal)
);

CREATE UNIQUE INDEX IF NOT EXISTS service_routine_versions_one_draft_in_flight
  ON public.service_routine_versions (routine_id)
  WHERE status IN ('draft', 'in_review');

CREATE TABLE IF NOT EXISTS public.service_routine_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.service_routine_versions(id) ON DELETE CASCADE,
  draft_revision text NOT NULL,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id),
  reviewer_role text NOT NULL,
  rationale text NOT NULL DEFAULT '',
  eligible_for_publish boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  invalidated_at timestamptz,
  invalidated_reason text
);

CREATE TABLE IF NOT EXISTS public.service_routine_applicability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid NOT NULL REFERENCES public.service_routines(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('family', 'manufacturer', 'catalog_model')),
  value text NOT NULL,
  value_family text,
  override_reason text,
  overridden_by uuid REFERENCES public.profiles(id),
  overridden_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_routine_applicability_unique UNIQUE (routine_id, kind, value)
);

CREATE INDEX IF NOT EXISTS service_routine_versions_routine_idx
  ON public.service_routine_versions (routine_id, created_at DESC);
CREATE INDEX IF NOT EXISTS service_routine_applicability_routine_idx
  ON public.service_routine_applicability (routine_id);

ALTER TABLE public.service_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_routine_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_routine_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_routine_applicability ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.routine_payload_digest(p_payload jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT md5(COALESCE(p_payload, '{}'::jsonb)::text);
$$;

CREATE OR REPLACE FUNCTION admin_private.routine_validate_payload(p_payload jsonb)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog
AS $$
DECLARE
  v_errors text[] := ARRAY[]::text[];
  v_section jsonb;
  v_item jsonb;
  v_section_kind text;
  v_has_safety_section boolean := false;
  v_safety_gate_count int := 0;
  v_gates_outside int := 0;
  v_interval numeric;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload -> 'sections') IS DISTINCT FROM 'array' THEN
    RETURN ARRAY['payload.sections required']::text[];
  END IF;

  FOR v_section IN SELECT * FROM jsonb_array_elements(p_payload -> 'sections')
  LOOP
    v_section_kind := COALESCE(v_section ->> 'kind', '');
    IF v_section_kind = 'safety' THEN
      v_has_safety_section := true;
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_section -> 'items', '[]'::jsonb))
    LOOP
      IF COALESCE(v_item ->> 'type', '') = 'safety_gate'
         OR COALESCE(v_item ->> 'requirement_class', '') = 'safety_gate' THEN
        IF v_section_kind = 'safety' THEN
          v_safety_gate_count := v_safety_gate_count + 1;
          IF COALESCE((v_item ->> 'waivable')::boolean, false) THEN
            v_errors := array_append(v_errors, 'safety_gate cannot be waivable');
          END IF;
        ELSE
          v_gates_outside := v_gates_outside + 1;
        END IF;
      END IF;

      -- F-04: measurement limits require source refs in every section (including safety).
      IF COALESCE(v_item ->> 'type', '') = 'measurement'
         AND nullif(btrim(COALESCE(v_item ->> 'limit_value', '')), '') IS NOT NULL
         AND nullif(btrim(COALESCE(v_item ->> 'tolerance_source_ref', '')), '') IS NULL THEN
        v_errors := array_append(
          v_errors,
          format(
            'measurement %s limit requires tolerance_source_ref (section %s)',
            COALESCE(v_item ->> 'id', '?'),
            COALESCE(v_section ->> 'id', v_section_kind, '?')
          )
        );
      END IF;
    END LOOP;
  END LOOP;

  IF NOT v_has_safety_section THEN
    v_errors := array_append(v_errors, 'dedicated safety section required');
  END IF;
  IF v_safety_gate_count < 1 THEN
    v_errors := array_append(
      v_errors,
      'at least one non-waivable safety_gate item required in safety section'
    );
  END IF;
  IF v_gates_outside > 0 THEN
    v_errors := array_append(v_errors, 'safety_gate items must live in the safety section');
  END IF;

  IF p_payload ? 'cadence' THEN
    v_interval := NULLIF(p_payload #>> '{cadence,interval}', '')::numeric;
    IF v_interval IS NOT NULL AND v_interval <= 0 THEN
      v_errors := array_append(v_errors, 'cadence.interval must be > 0');
    END IF;
  END IF;

  RETURN v_errors;
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.routine_preview_payload(p_payload jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  -- Technician-style order: safety sections first; no edit affordances.
  SELECT jsonb_build_object(
    'sections',
    COALESCE((
      SELECT jsonb_agg(s.section ORDER BY CASE WHEN s.section ->> 'kind' = 'safety' THEN 0 ELSE 1 END, s.ord)
      FROM jsonb_array_elements(COALESCE(p_payload -> 'sections', '[]'::jsonb)) WITH ORDINALITY AS s(section, ord)
    ), '[]'::jsonb),
    'cadence', p_payload -> 'cadence'
  );
$$;

CREATE OR REPLACE FUNCTION admin_private.routine_invalidate_reviews(
  p_version_id uuid,
  p_actor_id uuid,
  p_actor_role text,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id FROM public.service_routine_reviews
    WHERE version_id = p_version_id AND eligible_for_publish = true
  LOOP
    UPDATE public.service_routine_reviews
    SET eligible_for_publish = false,
        invalidated_at = now(),
        invalidated_reason = p_reason
    WHERE id = r.id;
    PERFORM admin_private.workflow_audit(
      NULL, 'service_routine_version', p_version_id, p_actor_id, p_actor_role,
      'routine_review_invalidated', NULL, NULL, p_reason,
      jsonb_build_object('review_id', r.id, 'version_id', p_version_id)
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.routine_family_set(p_routine_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(array_agg(value ORDER BY value), ARRAY[]::text[])
  FROM public.service_routine_applicability
  WHERE routine_id = p_routine_id AND kind = 'family';
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
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
REVOKE ALL ON TABLE public.service_routine_versions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.service_routine_reviews FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.service_routine_applicability FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.service_routines TO authenticated;
GRANT SELECT ON public.service_routine_versions TO authenticated;
GRANT SELECT ON public.service_routine_reviews TO authenticated;
GRANT SELECT ON public.service_routine_applicability TO authenticated;

DROP POLICY IF EXISTS service_routines_select ON public.service_routines;
CREATE POLICY service_routines_select ON public.service_routines
FOR SELECT TO authenticated
USING (
  admin_private.caller_role() IN ('admin', 'support')
  OR (
    admin_private.caller_role() = 'technician'
    AND status IN ('published', 'retired')
  )
);

DROP POLICY IF EXISTS service_routine_versions_select ON public.service_routine_versions;
CREATE POLICY service_routine_versions_select ON public.service_routine_versions
FOR SELECT TO authenticated
USING (
  admin_private.caller_role() IN ('admin', 'support')
  OR (
    admin_private.caller_role() = 'technician'
    AND status IN ('published', 'retired')
  )
);

DROP POLICY IF EXISTS service_routine_reviews_select ON public.service_routine_reviews;
CREATE POLICY service_routine_reviews_select ON public.service_routine_reviews
FOR SELECT TO authenticated
USING (admin_private.caller_role() IN ('admin', 'support'));

DROP POLICY IF EXISTS service_routine_applicability_select ON public.service_routine_applicability;
CREATE POLICY service_routine_applicability_select ON public.service_routine_applicability
FOR SELECT TO authenticated
USING (admin_private.caller_role() IN ('admin', 'support', 'technician'));

REVOKE ALL ON FUNCTION public.create_service_routine_draft(text, text, text, text, jsonb, text[], uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_service_routine_draft(uuid, text, jsonb, text, text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_service_routine_for_review(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_service_routine_review(uuid, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.publish_service_routine_version(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.retire_service_routine_version(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_service_routine_applicability(uuid, text, text, text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_service_routine_preview(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_next_service_routine_draft(uuid, jsonb, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_service_routine_manufacturer_restrictions(uuid, text[], text[], uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_service_routine_draft(text, text, text, text, jsonb, text[], uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_service_routine_draft(uuid, text, jsonb, text, text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_service_routine_for_review(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_service_routine_review(uuid, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.publish_service_routine_version(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.retire_service_routine_version(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_service_routine_applicability(uuid, text, text, text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_service_routine_preview(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_next_service_routine_draft(uuid, jsonb, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_service_routine_manufacturer_restrictions(uuid, text[], text[], uuid) TO authenticated, service_role;

COMMIT;
