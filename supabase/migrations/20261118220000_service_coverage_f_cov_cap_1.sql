-- F-COV-CAP-1 correction against e2a2f525.
-- Remove silent seq>500 truncation from generate + schedule list.
-- Bounded processing only via explicit p_batch_limit → status incomplete + continuation.
-- Does not redefine the accepted Cairo backfill window (start_date .. as_of+90d ∩ end_date).
-- Local only: no staging apply, production, merge, or FR-1.

BEGIN;
SET LOCAL lock_timeout = '5s';

DROP FUNCTION IF EXISTS public.generate_machine_coverage_occurrences(date, uuid, uuid);
DROP FUNCTION IF EXISTS public.list_machine_coverage_schedule(date, uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.generate_machine_coverage_occurrences(
  p_as_of date DEFAULT NULL,
  p_coverage_id uuid DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_batch_limit integer DEFAULT NULL,
  p_continue_coverage_id uuid DEFAULT NULL,
  p_continue_sequence integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_as_of date := COALESCE(p_as_of, admin_private.cairo_today());
  v_cov public.service_machine_coverages%ROWTYPE;
  v_horizon date;
  v_window_end date;
  v_seq integer;
  v_due date;
  v_created int := 0;
  v_skipped int := 0;
  v_failed int := 0;
  v_work int := 0;
  v_results jsonb := '[]'::jsonb;
  v_one jsonb;
  v_detail text;
  v_msg text;
  v_status text := 'complete';
  v_cont_cov uuid := NULL;
  v_cont_seq integer := NULL;
  v_skipping boolean := false;
  v_start_seq integer;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Not permitted to generate coverage occurrences'
      USING ERRCODE = '42501', DETAIL = 'coverage_authz_denied';
  END IF;

  IF p_batch_limit IS NOT NULL AND p_batch_limit <= 0 THEN
    RAISE EXCEPTION 'batch_limit must be NULL or > 0'
      USING ERRCODE = '22023', DETAIL = 'coverage_batch_limit_invalid';
  END IF;

  IF (p_continue_coverage_id IS NULL) <> (p_continue_sequence IS NULL) THEN
    RAISE EXCEPTION 'continuation requires both coverage_id and sequence'
      USING ERRCODE = '22023', DETAIL = 'coverage_continuation_invalid';
  END IF;

  IF p_continue_sequence IS NOT NULL AND p_continue_sequence < 1 THEN
    RAISE EXCEPTION 'continuation sequence must be >= 1'
      USING ERRCODE = '22023', DETAIL = 'coverage_continuation_invalid';
  END IF;

  v_horizon := (v_as_of + 90)::date;
  v_skipping := p_continue_coverage_id IS NOT NULL;

  FOR v_cov IN
    SELECT c.*
    FROM public.service_machine_coverages c
    WHERE c.status = 'active'
      AND (p_coverage_id IS NULL OR c.id = p_coverage_id)
    ORDER BY c.created_at, c.id
    FOR UPDATE OF c
  LOOP
    IF v_skipping THEN
      IF v_cov.id IS DISTINCT FROM p_continue_coverage_id THEN
        CONTINUE;
      END IF;
      v_skipping := false;
      v_start_seq := p_continue_sequence;
    ELSE
      v_start_seq := 1;
    END IF;

    v_window_end := v_horizon;
    IF v_cov.end_date IS NOT NULL AND v_cov.end_date < v_window_end THEN
      v_window_end := v_cov.end_date;
    END IF;

    IF v_window_end < v_cov.start_date THEN
      CONTINUE;
    END IF;

    v_seq := v_start_seq;
    LOOP
      v_due := admin_private.planned_due_for_sequence(
        v_cov.first_planned_due_date,
        v_cov.cadence_interval,
        v_cov.cadence_unit,
        v_cov.schedule_anchor_day,
        v_seq
      );

      EXIT WHEN v_due > v_window_end;
      IF v_due < v_cov.start_date THEN
        v_seq := v_seq + 1;
        CONTINUE;
      END IF;

      -- Eligible candidate (in accepted window). Bound only with explicit incomplete.
      IF p_batch_limit IS NOT NULL AND v_work >= p_batch_limit THEN
        v_status := 'incomplete';
        v_cont_cov := v_cov.id;
        v_cont_seq := v_seq;
        EXIT;
      END IF;

      BEGIN
        v_one := admin_private.generate_one_coverage_occurrence(
          v_cov, v_seq, v_due, v_actor.uid, v_actor.role
        );
        IF COALESCE((v_one->>'created')::boolean, false) THEN
          v_created := v_created + 1;
        ELSE
          v_skipped := v_skipped + 1;
        END IF;
        v_results := v_results || jsonb_build_array(v_one);
      EXCEPTION
        WHEN unique_violation THEN
          v_skipped := v_skipped + 1;
        WHEN OTHERS THEN
          GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL, v_msg = MESSAGE_TEXT;
          v_failed := v_failed + 1;
          v_results := v_results || jsonb_build_array(jsonb_build_object(
            'coverage_id', v_cov.id,
            'sequence', v_seq,
            'planned_due_date', v_due,
            'created', false,
            'error', v_msg,
            'detail', v_detail
          ));
      END;

      v_work := v_work + 1;
      v_seq := v_seq + 1;
    END LOOP;

    EXIT WHEN v_status = 'incomplete';
  END LOOP;

  RETURN jsonb_build_object(
    'as_of', v_as_of,
    'horizon_end', v_horizon,
    'created', v_created,
    'skipped', v_skipped,
    'failed', v_failed,
    'processed', v_work,
    'status', v_status,
    'continuation', CASE
      WHEN v_status = 'incomplete' THEN jsonb_build_object(
        'coverage_id', v_cont_cov,
        'next_sequence', v_cont_seq
      )
      ELSE NULL
    END,
    'results', v_results
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_machine_coverage_schedule(
  p_as_of date DEFAULT NULL,
  p_machine_id uuid DEFAULT NULL,
  p_coverage_id uuid DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_batch_limit integer DEFAULT NULL,
  p_continue_coverage_id uuid DEFAULT NULL,
  p_continue_sequence integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_as_of date := COALESCE(p_as_of, admin_private.cairo_today());
  v_horizon date;
  v_rows jsonb := '[]'::jsonb;
  v_cov public.service_machine_coverages%ROWTYPE;
  v_window_end date;
  v_seq integer;
  v_due date;
  v_bucket text;
  v_occ public.service_maintenance_occurrences%ROWTYPE;
  v_generated boolean;
  v_work int := 0;
  v_status text := 'complete';
  v_cont_cov uuid := NULL;
  v_cont_seq integer := NULL;
  v_skipping boolean := false;
  v_start_seq integer;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support', 'customer') THEN
    RAISE EXCEPTION 'Not permitted to list coverage schedule'
      USING ERRCODE = '42501', DETAIL = 'coverage_authz_denied';
  END IF;

  IF p_batch_limit IS NOT NULL AND p_batch_limit <= 0 THEN
    RAISE EXCEPTION 'batch_limit must be NULL or > 0'
      USING ERRCODE = '22023', DETAIL = 'coverage_batch_limit_invalid';
  END IF;

  IF (p_continue_coverage_id IS NULL) <> (p_continue_sequence IS NULL) THEN
    RAISE EXCEPTION 'continuation requires both coverage_id and sequence'
      USING ERRCODE = '22023', DETAIL = 'coverage_continuation_invalid';
  END IF;

  IF p_continue_sequence IS NOT NULL AND p_continue_sequence < 1 THEN
    RAISE EXCEPTION 'continuation sequence must be >= 1'
      USING ERRCODE = '22023', DETAIL = 'coverage_continuation_invalid';
  END IF;

  v_horizon := (v_as_of + 90)::date;
  v_skipping := p_continue_coverage_id IS NOT NULL;

  FOR v_cov IN
    SELECT c.*
    FROM public.service_machine_coverages c
    JOIN public.machines m ON m.id = c.machine_id
    WHERE (p_coverage_id IS NULL OR c.id = p_coverage_id)
      AND (p_machine_id IS NULL OR c.machine_id = p_machine_id)
      AND (
        v_actor.role IN ('admin', 'support')
        OR (v_actor.role = 'customer' AND m.owner_id = v_actor.uid)
      )
    ORDER BY c.created_at, c.id
  LOOP
    IF v_skipping THEN
      IF v_cov.id IS DISTINCT FROM p_continue_coverage_id THEN
        CONTINUE;
      END IF;
      v_skipping := false;
      v_start_seq := p_continue_sequence;
    ELSE
      v_start_seq := 1;
    END IF;

    v_window_end := v_horizon;
    IF v_cov.end_date IS NOT NULL AND v_cov.end_date < v_window_end THEN
      v_window_end := v_cov.end_date;
    END IF;

    v_seq := v_start_seq;
    LOOP
      v_due := admin_private.planned_due_for_sequence(
        v_cov.first_planned_due_date,
        v_cov.cadence_interval,
        v_cov.cadence_unit,
        v_cov.schedule_anchor_day,
        v_seq
      );
      EXIT WHEN v_due > v_window_end;
      IF v_due < v_cov.start_date THEN
        v_seq := v_seq + 1;
        CONTINUE;
      END IF;

      IF p_batch_limit IS NOT NULL AND v_work >= p_batch_limit THEN
        v_status := 'incomplete';
        v_cont_cov := v_cov.id;
        v_cont_seq := v_seq;
        EXIT;
      END IF;

      v_generated := false;
      SELECT * INTO v_occ FROM public.service_maintenance_occurrences
      WHERE coverage_id = v_cov.id AND sequence = v_seq;
      IF FOUND THEN
        v_generated := true;
        v_due := v_occ.planned_due_date;
      END IF;

      IF v_due < v_as_of THEN
        v_bucket := 'overdue';
      ELSIF v_due = v_as_of THEN
        v_bucket := 'due';
      ELSE
        v_bucket := 'upcoming';
      END IF;

      v_rows := v_rows || jsonb_build_array(jsonb_build_object(
        'coverage_id', v_cov.id,
        'machine_id', v_cov.machine_id,
        'sequence', v_seq,
        'planned_due_date', v_due,
        'bucket', v_bucket,
        'coverage_status', v_cov.status,
        'generated', v_generated,
        'ticket_id', CASE WHEN v_generated THEN v_occ.ticket_id ELSE NULL END,
        'job_id', CASE WHEN v_generated THEN v_occ.job_id ELSE NULL END,
        'routine_version_id', CASE
          WHEN v_generated THEN v_occ.routine_version_id
          ELSE v_cov.routine_version_id
        END
      ));

      v_work := v_work + 1;
      v_seq := v_seq + 1;
    END LOOP;

    EXIT WHEN v_status = 'incomplete';
  END LOOP;

  RETURN jsonb_build_object(
    'as_of', v_as_of,
    'horizon_end', v_horizon,
    'item_count', v_work,
    'status', v_status,
    'continuation', CASE
      WHEN v_status = 'incomplete' THEN jsonb_build_object(
        'coverage_id', v_cont_cov,
        'next_sequence', v_cont_seq
      )
      ELSE NULL
    END,
    'items', v_rows
  );
END;
$$;

REVOKE ALL ON FUNCTION public.generate_machine_coverage_occurrences(date, uuid, uuid, integer, uuid, integer)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_machine_coverage_schedule(date, uuid, uuid, uuid, integer, uuid, integer)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.generate_machine_coverage_occurrences(date, uuid, uuid, integer, uuid, integer)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_machine_coverage_schedule(date, uuid, uuid, uuid, integer, uuid, integer)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.generate_machine_coverage_occurrences(date, uuid, uuid, integer, uuid, integer) IS
  'F-COV-CAP-1: idempotent Cairo-window generator; optional batch_limit yields incomplete+continuation; no silent truncation.';
COMMENT ON FUNCTION public.list_machine_coverage_schedule(date, uuid, uuid, uuid, integer, uuid, integer) IS
  'F-COV-CAP-1: full eligible schedule unless batch_limit set; incomplete+continuation; no silent truncation.';

COMMIT;
