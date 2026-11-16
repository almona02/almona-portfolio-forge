-- Lane A: service routine authoring (draft → review → publish → retire).
-- Local/disposable only until separately authorized. No assignment/pin/results.
-- Contract tip: 1350b749ffd999ef3206c9733f0bcfb47b483ce2

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
