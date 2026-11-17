-- Lane C: technician checklist execution (visit-bound answers, history, CAS, B4 integrate).
-- Separately reviewable from ticket-header RLS migration.
-- Local-only authorization. No staging/merge/production/FR-1.
-- Frozen DETAIL codes: routine_checklist_authz_denied | routine_checklist_validation_denied
--   | routine_checklist_version_skew | routine_checklist_stale_revision (PT409).
-- LC-07: failed measurement blocks submit only when effective safety_gate; non-safety
--   required may be answered failed and submitted (no blanket failure-to-submit).

BEGIN;
SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- 1) Schema: revision token + append-only answer history
-- ---------------------------------------------------------------------------
ALTER TABLE public.service_job_visits
  ADD COLUMN IF NOT EXISTS checklist_revision bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.service_job_visits.checklist_revision IS
  'Lane C monotonic optimistic token for checklist answer CAS.';

CREATE TABLE IF NOT EXISTS public.service_visit_checklist_answer_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.service_job_visits(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.service_tickets(id),
  job_id uuid NOT NULL REFERENCES public.service_jobs(id),
  item_key text NOT NULL,
  item_id text,
  attempt integer NOT NULL CHECK (attempt >= 1),
  outcome text NOT NULL CHECK (outcome IN ('passed', 'failed', 'not_applicable')),
  value numeric,
  unit text,
  evidence_paths text[] NOT NULL DEFAULT '{}',
  note text,
  actor_id uuid NOT NULL,
  actor_role text NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now(),
  checklist_revision_after bigint NOT NULL,
  routine_version_id uuid NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS service_visit_checklist_answer_history_visit_idx
  ON public.service_visit_checklist_answer_history (visit_id, item_key, attempt DESC);

CREATE INDEX IF NOT EXISTS service_visit_checklist_answer_history_ticket_idx
  ON public.service_visit_checklist_answer_history (ticket_id, answered_at DESC);

COMMENT ON TABLE public.service_visit_checklist_answer_history IS
  'Lane C append-only checklist answer / correction history (visit-bound).';

ALTER TABLE public.service_visit_checklist_answer_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS svc_visit_checklist_hist_select ON public.service_visit_checklist_answer_history;
CREATE POLICY svc_visit_checklist_hist_select ON public.service_visit_checklist_answer_history
FOR SELECT TO authenticated
USING (admin_private.can_read_ticket_workflow(ticket_id));

DROP POLICY IF EXISTS svc_visit_checklist_hist_no_ins ON public.service_visit_checklist_answer_history;
CREATE POLICY svc_visit_checklist_hist_no_ins ON public.service_visit_checklist_answer_history
FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS svc_visit_checklist_hist_no_upd ON public.service_visit_checklist_answer_history;
CREATE POLICY svc_visit_checklist_hist_no_upd ON public.service_visit_checklist_answer_history
FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS svc_visit_checklist_hist_no_del ON public.service_visit_checklist_answer_history;
CREATE POLICY svc_visit_checklist_hist_no_del ON public.service_visit_checklist_answer_history
FOR DELETE TO authenticated USING (false);

REVOKE ALL ON TABLE public.service_visit_checklist_answer_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.service_visit_checklist_answer_history TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) Helpers: evidence alias precedence, item keys, class, limits
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.checklist_evidence_required(p_item jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
DECLARE
  v_text text;
BEGIN
  -- Deterministic evidence-field alias precedence (contract §3.5):
  -- 1) evidence_required boolean
  -- 2) evidence boolean
  -- 3) evidence text (closed synonym sets; other non-empty → required fail-closed)
  -- 4) else none
  IF p_item ? 'evidence_required'
     AND jsonb_typeof(p_item -> 'evidence_required') = 'boolean' THEN
    RETURN (p_item ->> 'evidence_required')::boolean;
  END IF;

  IF p_item ? 'evidence' AND jsonb_typeof(p_item -> 'evidence') = 'boolean' THEN
    RETURN (p_item ->> 'evidence')::boolean;
  END IF;

  IF p_item ? 'evidence' AND jsonb_typeof(p_item -> 'evidence') = 'string' THEN
    v_text := lower(btrim(COALESCE(p_item ->> 'evidence', '')));
    IF v_text IN ('required', 'photo', 'photo_required', 'required_photo') THEN
      RETURN true;
    END IF;
    IF v_text IN ('none', 'optional', 'not_required', 'n/a', 'na', '') THEN
      RETURN false;
    END IF;
    -- Any other non-empty text → required (fail-closed)
    IF v_text <> '' THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.checklist_effective_requirement_class(p_item jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT CASE
    WHEN COALESCE(p_item ->> 'type', '') = 'safety_gate' THEN 'safety_gate'
    WHEN COALESCE(p_item ->> 'requirement_class', '') = 'safety_gate' THEN 'safety_gate'
    WHEN COALESCE(p_item ->> 'requirement_class', '') IN ('required', 'optional')
      THEN p_item ->> 'requirement_class'
    ELSE 'required'
  END;
$$;

CREATE OR REPLACE FUNCTION admin_private.checklist_allow_not_applicable(p_item jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT CASE
    WHEN admin_private.checklist_effective_requirement_class(p_item) = 'safety_gate' THEN false
    WHEN p_item ? 'allow_not_applicable'
      AND jsonb_typeof(p_item -> 'allow_not_applicable') = 'boolean'
      THEN (p_item ->> 'allow_not_applicable')::boolean
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION admin_private.checklist_item_key(
  p_section jsonb,
  p_item jsonb,
  p_zero_based_index integer
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT CASE
    WHEN nullif(btrim(COALESCE(p_item ->> 'id', '')), '') IS NOT NULL
      THEN btrim(p_item ->> 'id')
    ELSE COALESCE(nullif(btrim(COALESCE(p_section ->> 'id', '')), ''), '_')
      || '/' || p_zero_based_index::text
  END;
$$;

CREATE OR REPLACE FUNCTION admin_private.checklist_limit_bounds(p_item jsonb)
RETURNS TABLE(min_v numeric, max_v numeric, min_incl boolean, max_incl boolean)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
DECLARE
  v_limit jsonb;
  v_min numeric;
  v_max numeric;
BEGIN
  -- Prefer contract shape limit.{min,max}; do not invent when absent.
  -- Lane A publish uses limit_value as a single bound in some drafts — ignored for
  -- min/max unless structured limit object present (no invented tolerances).
  v_limit := p_item -> 'limit';
  IF v_limit IS NULL OR jsonb_typeof(v_limit) IS DISTINCT FROM 'object' THEN
    min_v := NULL; max_v := NULL; min_incl := true; max_incl := true;
    RETURN NEXT;
    RETURN;
  END IF;

  BEGIN
    v_min := NULLIF(v_limit ->> 'min', '')::numeric;
  EXCEPTION WHEN OTHERS THEN
    v_min := NULL;
  END;
  BEGIN
    v_max := NULLIF(v_limit ->> 'max', '')::numeric;
  EXCEPTION WHEN OTHERS THEN
    v_max := NULL;
  END;

  min_v := v_min;
  max_v := v_max;
  min_incl := COALESCE((v_limit ->> 'min_inclusive')::boolean, true);
  max_incl := COALESCE((v_limit ->> 'max_inclusive')::boolean, true);
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.checklist_measurement_out_of_limit(
  p_item jsonb,
  p_value numeric
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
DECLARE
  v_b record;
BEGIN
  IF p_value IS NULL THEN
    RETURN false;
  END IF;
  SELECT * INTO v_b FROM admin_private.checklist_limit_bounds(p_item);
  IF v_b.min_v IS NOT NULL THEN
    IF v_b.min_incl AND p_value < v_b.min_v THEN RETURN true; END IF;
    IF NOT v_b.min_incl AND p_value <= v_b.min_v THEN RETURN true; END IF;
  END IF;
  IF v_b.max_v IS NOT NULL THEN
    IF v_b.max_incl AND p_value > v_b.max_v THEN RETURN true; END IF;
    IF NOT v_b.max_incl AND p_value >= v_b.max_v THEN RETURN true; END IF;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.checklist_flatten_published_items(p_payload jsonb)
RETURNS TABLE(
  item_key text,
  item_id text,
  section_id text,
  section_kind text,
  item jsonb,
  ord integer
)
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT
    admin_private.checklist_item_key(s.section, i.item, (i.ord - 1)::integer) AS item_key,
    nullif(btrim(COALESCE(i.item ->> 'id', '')), '') AS item_id,
    COALESCE(s.section ->> 'id', '') AS section_id,
    COALESCE(s.section ->> 'kind', '') AS section_kind,
    i.item,
    (ROW_NUMBER() OVER (
      ORDER BY CASE WHEN s.section ->> 'kind' = 'safety' THEN 0 ELSE 1 END, s.ord, i.ord
    ))::integer AS ord
  FROM jsonb_array_elements(COALESCE(p_payload -> 'sections', '[]'::jsonb))
    WITH ORDINALITY AS s(section, ord)
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.section -> 'items', '[]'::jsonb))
    WITH ORDINALITY AS i(item, ord);
$$;

CREATE OR REPLACE FUNCTION admin_private.deny_checklist(
  p_errcode text,
  p_detail text,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF p_errcode = 'PT409' THEN
    RAISE SQLSTATE 'PT409'
      USING MESSAGE = p_message,
            DETAIL = p_detail;
  ELSE
    RAISE EXCEPTION '%', p_message
      USING ERRCODE = p_errcode,
            DETAIL = p_detail;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.job_active_routine_version_id(p_job_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT p.routine_version_id
  FROM public.service_job_routine_pins p
  WHERE p.job_id = p_job_id
    AND p.status = 'active'
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 3) Build working checklist_results envelope from history
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.checklist_current_envelope(p_visit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_visit public.service_job_visits%ROWTYPE;
  v_version_id uuid;
  v_items jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO v_visit FROM public.service_job_visits WHERE id = p_visit_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_version_id := COALESCE(
    v_visit.pinned_routine_version_id,
    admin_private.job_active_routine_version_id(v_visit.job_id)
  );
  IF v_version_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'item_key', h.item_key,
      'item_id', h.item_id,
      'result', jsonb_build_object(
        'outcome', h.outcome,
        'value', h.value,
        'unit', h.unit,
        'evidence_paths', to_jsonb(COALESCE(h.evidence_paths, '{}'::text[])),
        'note', h.note,
        'answered_at', h.answered_at,
        'attempt', h.attempt
      )
    )
    ORDER BY h.item_key
  ), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT DISTINCT ON (item_key) *
    FROM public.service_visit_checklist_answer_history
    WHERE visit_id = p_visit_id
    ORDER BY item_key, attempt DESC, answered_at DESC
  ) h;

  RETURN jsonb_build_object(
    'routine_version_id', v_version_id::text,
    'items', v_items
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) Submit completeness against published payload (LC-07 aware)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.validate_checklist_completeness(
  p_payload jsonb,
  p_checklist jsonb
)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_pub record;
  v_type text;
  v_class text;
  v_answer jsonb;
  v_outcome text;
  v_results jsonb;
  v_item jsonb;
  v_key text;
  v_evidence_paths jsonb;
BEGIN
  IF p_checklist IS NULL OR jsonb_typeof(p_checklist) IS DISTINCT FROM 'object' THEN
    PERFORM admin_private.deny_checklist(
      '22023', 'routine_checklist_validation_denied',
      'Pinned routine requires checklist_results JSON object'
    );
  END IF;
  IF jsonb_typeof(p_checklist -> 'items') IS DISTINCT FROM 'array' THEN
    PERFORM admin_private.deny_checklist(
      '22023', 'routine_checklist_validation_denied',
      'checklist_results.items array required'
    );
  END IF;

  -- Index answers by item_key (preferred) or item_id
  v_results := '{}'::jsonb;
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_checklist -> 'items', '[]'::jsonb))
  LOOP
    v_key := COALESCE(
      nullif(btrim(COALESCE(v_item ->> 'item_key', '')), ''),
      nullif(btrim(COALESCE(v_item ->> 'item_id', '')), ''),
      nullif(btrim(COALESCE(v_item ->> 'id', '')), '')
    );
    IF v_key IS NOT NULL THEN
      v_results := v_results || jsonb_build_object(v_key, COALESCE(v_item -> 'result', v_item));
    END IF;
  END LOOP;

  FOR v_pub IN
    SELECT * FROM admin_private.checklist_flatten_published_items(p_payload)
  LOOP
    v_type := COALESCE(v_pub.item ->> 'type', '');
    IF v_type NOT IN (
      'safety_gate', 'inspection', 'measurement', 'photo_evidence', 'task', 'note'
    ) THEN
      PERFORM admin_private.deny_checklist(
        '22023', 'routine_checklist_validation_denied',
        format('Unknown checklist item type: %s', v_type)
      );
    END IF;

    v_class := admin_private.checklist_effective_requirement_class(v_pub.item);
    v_answer := COALESCE(v_results -> v_pub.item_key, 'null'::jsonb);
    IF v_answer IS NULL OR v_answer = 'null'::jsonb THEN
      IF v_class IN ('safety_gate', 'required') THEN
        PERFORM admin_private.deny_checklist(
          '22023', 'routine_checklist_validation_denied',
          format('Required checklist item unanswered: %s', v_pub.item_key)
        );
      END IF;
      CONTINUE;
    END IF;

    v_outcome := v_answer ->> 'outcome';
    IF v_outcome IS NULL OR v_outcome NOT IN ('passed', 'failed', 'not_applicable') THEN
      PERFORM admin_private.deny_checklist(
        '22023', 'routine_checklist_validation_denied',
        format('Invalid outcome for item %s', v_pub.item_key)
      );
    END IF;

    IF v_outcome = 'not_applicable'
       AND NOT admin_private.checklist_allow_not_applicable(v_pub.item) THEN
      PERFORM admin_private.deny_checklist(
        '22023', 'routine_checklist_validation_denied',
        format('not_applicable not allowed for item %s', v_pub.item_key)
      );
    END IF;

    -- Safety gate: must be passed at submit (failed/missing block). Non-safety
    -- required may submit with failed (LC-07 — no blanket failure-to-submit).
    IF v_class = 'safety_gate' AND v_outcome IS DISTINCT FROM 'passed' THEN
      PERFORM admin_private.deny_checklist(
        '22023', 'routine_checklist_validation_denied',
        format('safety_gate must be passed: %s', v_pub.item_key)
      );
    END IF;

    IF v_type = 'measurement' AND v_outcome IN ('passed', 'failed') THEN
      IF nullif(btrim(COALESCE(v_pub.item ->> 'unit', '')), '') IS NULL THEN
        PERFORM admin_private.deny_checklist(
          '22023', 'routine_checklist_validation_denied',
          format('measurement item missing published unit: %s', v_pub.item_key)
        );
      END IF;
      IF v_answer ->> 'value' IS NULL OR nullif(btrim(COALESCE(v_answer ->> 'unit', '')), '') IS NULL THEN
        PERFORM admin_private.deny_checklist(
          '22023', 'routine_checklist_validation_denied',
          format('measurement requires value and unit: %s', v_pub.item_key)
        );
      END IF;
      IF (v_answer ->> 'unit') IS DISTINCT FROM (v_pub.item ->> 'unit') THEN
        PERFORM admin_private.deny_checklist(
          '22023', 'routine_checklist_validation_denied',
          format('measurement unit must match published unit: %s', v_pub.item_key)
        );
      END IF;
    END IF;

    IF admin_private.checklist_evidence_required(v_pub.item)
       AND v_outcome IN ('passed', 'failed') THEN
      v_evidence_paths := COALESCE(v_answer -> 'evidence_paths', '[]'::jsonb);
      IF jsonb_typeof(v_evidence_paths) IS DISTINCT FROM 'array'
         OR jsonb_array_length(v_evidence_paths) < 1 THEN
        PERFORM admin_private.deny_checklist(
          '22023', 'routine_checklist_validation_denied',
          format('evidence required for item %s', v_pub.item_key)
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) Replace B4 validate_checklist_for_pin — job pin authority + completeness
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.validate_checklist_for_pin(
  p_visit public.service_job_visits,
  p_checklist jsonb
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_job_pin uuid;
  v_authority uuid;
  v_version public.service_routine_versions%ROWTYPE;
BEGIN
  v_job_pin := admin_private.job_active_routine_version_id(p_visit.job_id);

  -- No job pin → checklist_results must be NULL (B4 unchanged).
  IF v_job_pin IS NULL AND p_visit.pinned_routine_version_id IS NULL THEN
    IF p_checklist IS NOT NULL THEN
      PERFORM admin_private.deny_checklist(
        '22023', 'routine_checklist_validation_denied',
        'checklist_results only allowed when a routine version is pinned'
      );
    END IF;
    RETURN;
  END IF;

  -- Authority: job active pin; visit snapshot must match when set.
  v_authority := COALESCE(v_job_pin, p_visit.pinned_routine_version_id);
  IF p_visit.pinned_routine_version_id IS NOT NULL
     AND v_job_pin IS NOT NULL
     AND p_visit.pinned_routine_version_id IS DISTINCT FROM v_job_pin THEN
    PERFORM admin_private.deny_checklist(
      '22023', 'routine_checklist_version_skew',
      'Visit pin snapshot diverges from job active pin'
    );
  END IF;

  IF p_checklist IS NULL OR jsonb_typeof(p_checklist) IS DISTINCT FROM 'object' THEN
    PERFORM admin_private.deny_checklist(
      '22023', 'routine_checklist_validation_denied',
      'Pinned routine requires checklist_results JSON object'
    );
  END IF;
  IF NOT (p_checklist ? 'routine_version_id') THEN
    PERFORM admin_private.deny_checklist(
      '22023', 'routine_checklist_validation_denied',
      'checklist_results.routine_version_id required'
    );
  END IF;
  IF (p_checklist->>'routine_version_id') IS DISTINCT FROM v_authority::text THEN
    PERFORM admin_private.deny_checklist(
      '22023', 'routine_checklist_version_skew',
      'checklist_results.routine_version_id must match job active pin'
    );
  END IF;
  IF NOT (p_checklist ? 'items') OR jsonb_typeof(p_checklist->'items') IS DISTINCT FROM 'array' THEN
    PERFORM admin_private.deny_checklist(
      '22023', 'routine_checklist_validation_denied',
      'checklist_results.items array required'
    );
  END IF;

  SELECT * INTO v_version
  FROM public.service_routine_versions
  WHERE id = v_authority;
  IF NOT FOUND THEN
    PERFORM admin_private.deny_checklist(
      '22023', 'routine_checklist_validation_denied',
      'Pinned routine version not found'
    );
  END IF;

  PERFORM admin_private.validate_checklist_completeness(v_version.payload, p_checklist);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) Read workspace RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_visit_checklist_workspace(
  p_visit_id uuid,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_hier record;
  v_ticket public.service_tickets%ROWTYPE;
  v_job public.service_jobs%ROWTYPE;
  v_visit public.service_job_visits%ROWTYPE;
  v_pin_version uuid;
  v_version public.service_routine_versions%ROWTYPE;
  v_routine public.service_routines%ROWTYPE;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  SELECT * INTO v_hier FROM admin_private.lock_visit_hierarchy(p_visit_id);
  v_ticket := v_hier.ticket;
  v_job := v_hier.job;
  v_visit := v_hier.visit;

  IF NOT admin_private.can_read_ticket_workflow(v_ticket.id) THEN
    PERFORM admin_private.workflow_audit(
      v_ticket.id, 'service_job_visit', v_visit.id, v_actor.uid, v_actor.role,
      'routine_checklist_authz_denied', NULL, NULL, 'get_visit_checklist_workspace',
      jsonb_build_object('visit_id', p_visit_id));
    PERFORM admin_private.deny_checklist(
      '42501', 'routine_checklist_authz_denied', 'Checklist read denied'
    );
  END IF;

  -- Customer / anon: no internal checklist content
  IF v_actor.role IS DISTINCT FROM 'admin'
     AND v_actor.role IS DISTINCT FROM 'support'
     AND v_actor.role IS DISTINCT FROM 'technician' THEN
    PERFORM admin_private.deny_checklist(
      '42501', 'routine_checklist_authz_denied', 'Checklist read denied'
    );
  END IF;

  v_pin_version := admin_private.job_active_routine_version_id(v_job.id);
  IF v_pin_version IS NULL THEN
    RETURN jsonb_build_object(
      'visit_id', v_visit.id,
      'job_id', v_job.id,
      'ticket_id', v_ticket.id,
      'has_active_pin', false,
      'checklist_revision', v_visit.checklist_revision,
      'pinned_routine_version_id', v_visit.pinned_routine_version_id,
      'payload', NULL,
      'current', NULL
    );
  END IF;

  SELECT * INTO v_version FROM public.service_routine_versions WHERE id = v_pin_version;
  SELECT * INTO v_routine FROM public.service_routines WHERE id = v_version.routine_id;

  RETURN jsonb_build_object(
    'visit_id', v_visit.id,
    'job_id', v_job.id,
    'ticket_id', v_ticket.id,
    'has_active_pin', true,
    'checklist_revision', v_visit.checklist_revision,
    'pinned_routine_version_id', v_visit.pinned_routine_version_id,
    'routine_version_id', v_version.id,
    'routine_id', v_routine.id,
    'routine_code', v_routine.code,
    'routine_name_en', v_routine.name_en,
    'version_ordinal', v_version.version_ordinal,
    'version_status', v_version.status,
    'payload', admin_private.routine_preview_payload(v_version.payload),
    'current', admin_private.checklist_current_envelope(v_visit.id),
    'can_write', (
      v_actor.role = 'technician'
      AND v_visit.attending_technician_id IS NOT NULL
      AND v_actor.uid = v_visit.attending_technician_id
      AND v_visit.state = 'in_progress'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_visit_checklist_workspace(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_visit_checklist_workspace(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) Record / correct answer with atomic CAS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_visit_checklist_answer(
  p_visit_id uuid,
  p_item_key text,
  p_outcome text,
  p_expected_checklist_revision bigint,
  p_value numeric DEFAULT NULL,
  p_unit text DEFAULT NULL,
  p_evidence_paths text[] DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_hier record;
  v_ticket public.service_tickets%ROWTYPE;
  v_job public.service_jobs%ROWTYPE;
  v_visit public.service_job_visits%ROWTYPE;
  v_pin_version uuid;
  v_version public.service_routine_versions%ROWTYPE;
  v_pub record;
  v_found boolean := false;
  v_type text;
  v_class text;
  v_outcome text;
  v_attempt int;
  v_action text;
  v_cas int;
  v_envelope jsonb;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  SELECT * INTO v_hier FROM admin_private.lock_visit_hierarchy(p_visit_id);
  v_ticket := v_hier.ticket;
  v_job := v_hier.job;
  v_visit := v_hier.visit;

  -- Authz BEFORE state discrimination where practical: attending technician only.
  IF v_actor.role IS DISTINCT FROM 'technician'
     OR v_visit.attending_technician_id IS NULL
     OR v_actor.uid IS DISTINCT FROM v_visit.attending_technician_id THEN
    PERFORM admin_private.workflow_audit(
      v_ticket.id, 'service_job_visit', v_visit.id, v_actor.uid, v_actor.role,
      'routine_checklist_authz_denied', NULL, NULL, 'record_visit_checklist_answer',
      jsonb_build_object('visit_id', p_visit_id, 'item_key', p_item_key));
    PERFORM admin_private.deny_checklist(
      '42501', 'routine_checklist_authz_denied', 'Only attending technician may record checklist answers'
    );
  END IF;

  IF v_visit.state IS DISTINCT FROM 'in_progress' THEN
    PERFORM admin_private.deny_checklist(
      '22023', 'routine_checklist_validation_denied',
      'Checklist answers only while visit is in_progress'
    );
  END IF;

  v_pin_version := admin_private.job_active_routine_version_id(v_job.id);
  IF v_pin_version IS NULL THEN
    PERFORM admin_private.deny_checklist(
      '22023', 'routine_checklist_validation_denied',
      'No active job routine pin for checklist capture'
    );
  END IF;

  -- Once-only visit pin snapshot from job active pin (first successful record).
  IF v_visit.pinned_routine_version_id IS NULL THEN
    UPDATE public.service_job_visits
    SET pinned_routine_version_id = v_pin_version,
        updated_at = now()
    WHERE id = v_visit.id
      AND pinned_routine_version_id IS NULL
    RETURNING * INTO v_visit;
  ELSIF v_visit.pinned_routine_version_id IS DISTINCT FROM v_pin_version THEN
    PERFORM admin_private.deny_checklist(
      '22023', 'routine_checklist_version_skew',
      'Visit pin snapshot diverges from job active pin'
    );
  END IF;

  SELECT * INTO v_version FROM public.service_routine_versions WHERE id = v_pin_version;
  IF NOT FOUND THEN
    PERFORM admin_private.deny_checklist(
      '22023', 'routine_checklist_validation_denied', 'Pinned version missing'
    );
  END IF;

  FOR v_pub IN
    SELECT * FROM admin_private.checklist_flatten_published_items(v_version.payload)
  LOOP
    IF v_pub.item_key = p_item_key THEN
      v_found := true;
      EXIT;
    END IF;
  END LOOP;
  IF NOT v_found THEN
    PERFORM admin_private.deny_checklist(
      '22023', 'routine_checklist_validation_denied',
      format('Unknown checklist item_key: %s', p_item_key)
    );
  END IF;

  v_type := COALESCE(v_pub.item ->> 'type', '');
  IF v_type NOT IN (
    'safety_gate', 'inspection', 'measurement', 'photo_evidence', 'task', 'note'
  ) THEN
    PERFORM admin_private.deny_checklist(
      '22023', 'routine_checklist_validation_denied',
      format('Unknown checklist item type: %s', v_type)
    );
  END IF;

  v_class := admin_private.checklist_effective_requirement_class(v_pub.item);
  v_outcome := p_outcome;
  IF v_outcome IS NULL OR v_outcome NOT IN ('passed', 'failed', 'not_applicable') THEN
    PERFORM admin_private.deny_checklist(
      '22023', 'routine_checklist_validation_denied', 'Invalid outcome'
    );
  END IF;

  IF v_outcome = 'not_applicable'
     AND NOT admin_private.checklist_allow_not_applicable(v_pub.item) THEN
    PERFORM admin_private.deny_checklist(
      '22023', 'routine_checklist_validation_denied',
      'not_applicable not allowed for this item'
    );
  END IF;

  IF v_type = 'measurement' AND v_outcome IN ('passed', 'failed') THEN
    IF nullif(btrim(COALESCE(v_pub.item ->> 'unit', '')), '') IS NULL THEN
      PERFORM admin_private.deny_checklist(
        '22023', 'routine_checklist_validation_denied',
        'measurement item missing published unit'
      );
    END IF;
    IF p_value IS NULL OR nullif(btrim(COALESCE(p_unit, '')), '') IS NULL THEN
      PERFORM admin_private.deny_checklist(
        '22023', 'routine_checklist_validation_denied',
        'measurement requires value and unit'
      );
    END IF;
    IF btrim(p_unit) IS DISTINCT FROM btrim(v_pub.item ->> 'unit') THEN
      PERFORM admin_private.deny_checklist(
        '22023', 'routine_checklist_validation_denied',
        'measurement unit must match published unit'
      );
    END IF;
    -- Auto-fail when out of published limit (do not invent limits when absent).
    IF admin_private.checklist_measurement_out_of_limit(v_pub.item, p_value) THEN
      v_outcome := 'failed';
    END IF;
  END IF;

  IF admin_private.checklist_evidence_required(v_pub.item)
     AND v_outcome IN ('passed', 'failed')
     AND COALESCE(array_length(p_evidence_paths, 1), 0) < 1 THEN
    PERFORM admin_private.deny_checklist(
      '22023', 'routine_checklist_validation_denied',
      'evidence required for this item'
    );
  END IF;

  SELECT COALESCE(MAX(attempt), 0) + 1 INTO v_attempt
  FROM public.service_visit_checklist_answer_history
  WHERE visit_id = v_visit.id AND item_key = p_item_key;

  v_action := CASE WHEN v_attempt = 1 THEN 'routine_checklist_item_recorded'
                   ELSE 'routine_checklist_item_corrected' END;

  -- Atomic CAS: bump revision only when expected matches.
  UPDATE public.service_job_visits
  SET checklist_revision = checklist_revision + 1,
      updated_at = now()
  WHERE id = v_visit.id
    AND checklist_revision = p_expected_checklist_revision
  RETURNING * INTO v_visit;

  GET DIAGNOSTICS v_cas = ROW_COUNT;
  IF v_cas = 0 THEN
    PERFORM admin_private.deny_checklist(
      'PT409', 'routine_checklist_stale_revision',
      'Stale checklist revision'
    );
  END IF;

  INSERT INTO public.service_visit_checklist_answer_history (
    visit_id, ticket_id, job_id, item_key, item_id, attempt,
    outcome, value, unit, evidence_paths, note,
    actor_id, actor_role, answered_at, checklist_revision_after,
    routine_version_id, details
  ) VALUES (
    v_visit.id, v_ticket.id, v_job.id, p_item_key, v_pub.item_id, v_attempt,
    v_outcome, p_value, nullif(btrim(COALESCE(p_unit, '')), ''),
    COALESCE(p_evidence_paths, '{}'::text[]), nullif(btrim(COALESCE(p_note, '')), ''),
    v_actor.uid, v_actor.role, now(), v_visit.checklist_revision,
    v_pin_version,
    jsonb_build_object(
      'requirement_class', v_class,
      'type', v_type,
      'evidence_required', admin_private.checklist_evidence_required(v_pub.item)
    )
  );

  v_envelope := admin_private.checklist_current_envelope(v_visit.id);
  UPDATE public.service_job_visits
  SET checklist_results = v_envelope,
      updated_at = now()
  WHERE id = v_visit.id;

  PERFORM admin_private.workflow_audit(
    v_ticket.id, 'service_job_visit', v_visit.id, v_actor.uid, v_actor.role,
    v_action, NULL, v_outcome, p_item_key,
    jsonb_build_object(
      'item_key', p_item_key,
      'attempt', v_attempt,
      'checklist_revision', v_visit.checklist_revision,
      'routine_version_id', v_pin_version
    )
  );

  RETURN jsonb_build_object(
    'visit_id', v_visit.id,
    'item_key', p_item_key,
    'attempt', v_attempt,
    'outcome', v_outcome,
    'checklist_revision', v_visit.checklist_revision,
    'pinned_routine_version_id', v_visit.pinned_routine_version_id,
    'current', v_envelope
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_visit_checklist_answer(
  uuid, text, text, bigint, numeric, text, text[], text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_visit_checklist_answer(
  uuid, text, text, bigint, numeric, text, text[], text, uuid
) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8) Wrap submit to audit checklist validation success
--    (validate_checklist_for_pin already replaced above; soft-wrap via
--     CREATE OR REPLACE of submit is too large — instead add a thin helper
--     called from an override of the validation path already used by submit.)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.validate_checklist_for_pin_audited(
  p_visit public.service_job_visits,
  p_checklist jsonb,
  p_actor_id uuid,
  p_actor_role text,
  p_ticket_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
BEGIN
  PERFORM admin_private.validate_checklist_for_pin(p_visit, p_checklist);
  IF admin_private.job_active_routine_version_id(p_visit.job_id) IS NOT NULL
     OR p_visit.pinned_routine_version_id IS NOT NULL THEN
    PERFORM admin_private.workflow_audit(
      p_ticket_id, 'service_job_visit', p_visit.id, p_actor_id, p_actor_role,
      'routine_checklist_submit_validated', NULL, NULL, 'submit_service_report_revision',
      jsonb_build_object(
        'routine_version_id', COALESCE(
          p_checklist->>'routine_version_id',
          p_visit.pinned_routine_version_id::text
        )
      )
    );
  END IF;
END;
$$;

-- Patch submit_service_report_revision to use audited validator.
-- Full body mirrored from B4 with single call-site change + Lane C audit.
CREATE OR REPLACE FUNCTION public.submit_service_report_revision(
  p_visit_id uuid,
  p_findings text,
  p_work_performed text,
  p_labour jsonb,
  p_no_labour boolean,
  p_verification_outcome text,
  p_verification_reason text DEFAULT NULL,
  p_technician_declaration text DEFAULT NULL,
  p_evidence_paths text[] DEFAULT NULL,
  p_checklist_results jsonb DEFAULT NULL,
  p_client_submission_id uuid DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.service_report_revisions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_hier record;
  v_ticket public.service_tickets;
  v_job public.service_jobs;
  v_visit public.service_job_visits;
  v_report public.service_reports;
  v_existing public.service_report_revisions;
  v_rev public.service_report_revisions;
  v_next int;
  v_from_job text;
  v_working jsonb;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);

  SELECT * INTO v_hier FROM admin_private.lock_visit_hierarchy(p_visit_id);
  v_ticket := v_hier.ticket;
  v_job := v_hier.job;
  v_visit := v_hier.visit;

  IF v_actor.role IS DISTINCT FROM 'technician'
     OR v_visit.attending_technician_id IS NULL
     OR v_actor.uid IS DISTINCT FROM v_visit.attending_technician_id THEN
    RAISE EXCEPTION 'Only the historical attending technician for this visit may submit a report'
      USING ERRCODE = '42501';
  END IF;

  IF v_visit.state IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'Reports may only be submitted for completed visits'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_findings IS NULL OR btrim(p_findings) = '' THEN
    RAISE EXCEPTION 'Findings are required' USING ERRCODE = '22023';
  END IF;
  IF p_work_performed IS NULL OR btrim(p_work_performed) = '' THEN
    RAISE EXCEPTION 'Work performed is required' USING ERRCODE = '22023';
  END IF;
  IF p_technician_declaration IS NULL OR btrim(p_technician_declaration) = '' THEN
    RAISE EXCEPTION 'Technician declaration is required' USING ERRCODE = '22023';
  END IF;
  IF p_verification_outcome IS NULL OR p_verification_outcome NOT IN (
    'verified_fixed', 'not_reproduced', 'further_work_required', 'not_verified'
  ) THEN
    RAISE EXCEPTION 'Invalid verification_outcome' USING ERRCODE = '22023';
  END IF;
  IF p_verification_outcome IN ('not_reproduced', 'further_work_required', 'not_verified')
     AND (p_verification_reason IS NULL OR btrim(p_verification_reason) = '') THEN
    RAISE EXCEPTION 'verification_reason required for outcome %', p_verification_outcome
      USING ERRCODE = '22023';
  END IF;

  PERFORM admin_private.validate_report_labour(COALESCE(p_labour, '[]'::jsonb), COALESCE(p_no_labour, false));
  PERFORM admin_private.validate_report_evidence_paths(
    v_ticket.id, p_evidence_paths, v_actor.uid, v_actor.role
  );

  -- Prefer explicit submit envelope; else working visit projection from Lane C.
  v_working := COALESCE(p_checklist_results, v_visit.checklist_results);
  PERFORM admin_private.validate_checklist_for_pin_audited(
    v_visit, v_working, v_actor.uid, v_actor.role, v_ticket.id
  );

  INSERT INTO public.service_reports (visit_id)
  VALUES (v_visit.id)
  ON CONFLICT (visit_id) DO NOTHING;

  SELECT * INTO v_report
  FROM public.service_reports
  WHERE visit_id = v_visit.id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report root missing' USING ERRCODE = 'P0002';
  END IF;

  IF p_client_submission_id IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.service_report_revisions
    WHERE report_id = v_report.id
      AND client_submission_id = p_client_submission_id;
    IF FOUND THEN
      RETURN v_existing;
    END IF;
  END IF;

  SELECT COALESCE(MAX(revision_number), 0) + 1 INTO v_next
  FROM public.service_report_revisions
  WHERE report_id = v_report.id;

  INSERT INTO public.service_report_revisions (
    report_id,
    revision_number,
    findings,
    work_performed,
    labour,
    no_labour,
    verification_outcome,
    verification_reason,
    technician_declaration,
    evidence_paths,
    checklist_results,
    client_submission_id,
    submitted_by
  ) VALUES (
    v_report.id,
    v_next,
    btrim(p_findings),
    btrim(p_work_performed),
    COALESCE(p_labour, '[]'::jsonb),
    COALESCE(p_no_labour, false),
    p_verification_outcome,
    nullif(btrim(COALESCE(p_verification_reason, '')), ''),
    btrim(p_technician_declaration),
    p_evidence_paths,
    v_working,
    p_client_submission_id,
    v_actor.uid
  )
  RETURNING * INTO v_rev;

  IF v_visit.pinned_routine_version_id IS NOT NULL
     OR admin_private.job_active_routine_version_id(v_job.id) IS NOT NULL THEN
    UPDATE public.service_job_visits
    SET checklist_results = v_working,
        updated_at = now()
    WHERE id = v_visit.id;
  END IF;

  -- Job may move to awaiting_review; never complete / issue / close ticket here (B4).
  IF v_job.state = 'in_progress' THEN
    v_from_job := v_job.state;
    UPDATE public.service_jobs
    SET state = 'awaiting_review',
        updated_at = now()
    WHERE id = v_job.id
    RETURNING * INTO v_job;

    PERFORM admin_private.workflow_audit(
      v_ticket.id, 'service_job', v_job.id, v_actor.uid, v_actor.role,
      'job_transition', v_from_job, 'awaiting_review', 'report submitted',
      jsonb_build_object(
        'report_id', v_report.id,
        'revision_id', v_rev.id,
        'revision_number', v_rev.revision_number,
        'visit_id', v_visit.id
      )
    );
  ELSIF v_job.state = 'awaiting_review' THEN
    NULL;
  ELSIF v_job.state IN ('completed', 'cancelled', 'waived') THEN
    RAISE EXCEPTION 'Cannot submit report against terminal job state %', v_job.state
      USING ERRCODE = 'check_violation';
  ELSE
    RAISE EXCEPTION 'Job state % cannot accept report submission', v_job.state
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM admin_private.workflow_audit(
    v_ticket.id, 'service_report_revision', v_rev.id, v_actor.uid, v_actor.role,
    'submit_report_revision', NULL, NULL, NULL,
    jsonb_build_object(
      'report_id', v_report.id,
      'visit_id', v_visit.id,
      'revision_number', v_rev.revision_number,
      'client_submission_id', p_client_submission_id,
      'verification_outcome', p_verification_outcome,
      'no_labour', COALESCE(p_no_labour, false)
    )
  );

  RETURN v_rev;
EXCEPTION
  WHEN unique_violation THEN
    IF p_client_submission_id IS NOT NULL THEN
      SELECT * INTO v_existing
      FROM public.service_report_revisions
      WHERE report_id = (
        SELECT id FROM public.service_reports WHERE visit_id = p_visit_id
      )
        AND client_submission_id = p_client_submission_id;
      IF FOUND THEN
        RETURN v_existing;
      END IF;
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_service_report_revision(
  uuid, text, text, jsonb, boolean, text, text, text, text[], jsonb, uuid, uuid
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_service_report_revision(
  uuid, text, text, jsonb, boolean, text, text, text, text[], jsonb, uuid, uuid
) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.submit_service_report_revision(
  uuid, text, text, jsonb, boolean, text, text, text, text[], jsonb, uuid, uuid
) FROM anon;

COMMIT;
