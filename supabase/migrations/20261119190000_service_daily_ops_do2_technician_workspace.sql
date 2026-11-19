-- DO-2 Technician daily operations workspace (caller-scoped read helpers + focus resolver).
-- Proposal tip: 82f74069. Local implementation only — no remote apply in this change set.
-- Count unit and filter population are the same SELECT; chip integer = items cardinality.
-- Assignment vs attendance: assigned jobs/upcoming use assigned_technician_id;
-- needs-attention in_progress/report paths use attending_technician_id.
-- Read-only: no inserts/updates from these helpers.

CREATE OR REPLACE FUNCTION public.get_technician_daily_ops_workspace(
  p_as_of date DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_as_of date := COALESCE(p_as_of, admin_private.cairo_today());
  v_window_end date;
  v_assigned jsonb;
  v_upcoming jsonb;
  v_needs jsonb;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('technician', 'admin', 'support') THEN
    RAISE EXCEPTION 'Not permitted to read technician daily operations workspace'
      USING ERRCODE = '42501', DETAIL = 'technician_daily_ops_authz_denied';
  END IF;

  v_window_end := v_as_of + 7;

  SELECT COALESCE(
    jsonb_agg(row_to_json(q)::jsonb ORDER BY q.updated_at DESC, q.job_sequence ASC, q.job_id ASC),
    '[]'::jsonb
  )
  INTO v_assigned
  FROM (
    SELECT
      j.id AS job_id,
      j.ticket_id,
      j.job_sequence,
      j.title AS job_title,
      j.state AS job_state,
      j.assigned_technician_id,
      j.updated_at,
      t.ticket_number,
      t.title AS ticket_title,
      t.status AS ticket_status,
      ('/support/tickets/' || j.ticket_id::text || '?job=' || j.id::text) AS href
    FROM public.service_jobs j
    JOIN public.service_tickets t ON t.id = j.ticket_id
    WHERE j.assigned_technician_id = v_actor.uid
      AND j.state NOT IN ('completed', 'cancelled', 'waived')
      AND t.status NOT IN ('closed', 'cancelled')
  ) q;

  SELECT COALESCE(
    jsonb_agg(row_to_json(q)::jsonb ORDER BY q.scheduled_start ASC, q.visit_sequence ASC, q.visit_id ASC),
    '[]'::jsonb
  )
  INTO v_upcoming
  FROM (
    SELECT
      v.id AS visit_id,
      v.job_id,
      j.ticket_id,
      v.visit_sequence,
      v.state AS visit_state,
      v.scheduled_start,
      v.scheduled_end,
      j.title AS job_title,
      j.job_sequence,
      t.ticket_number,
      t.title AS ticket_title,
      t.status AS ticket_status,
      (
        '/support/tickets/' || j.ticket_id::text
        || '?job=' || v.job_id::text
        || '&visit=' || v.id::text
        || '&panel=visit'
      ) AS href
    FROM public.service_job_visits v
    JOIN public.service_jobs j ON j.id = v.job_id
    JOIN public.service_tickets t ON t.id = j.ticket_id
    WHERE v.state = 'scheduled'
      AND v.scheduled_start IS NOT NULL
      AND j.assigned_technician_id = v_actor.uid
      AND t.status NOT IN ('closed', 'cancelled')
      AND (timezone('Africa/Cairo', v.scheduled_start))::date >= v_as_of
      AND (timezone('Africa/Cairo', v.scheduled_start))::date <= v_window_end
  ) q;

  SELECT COALESCE(
    jsonb_agg(
      row_to_json(q)::jsonb
      ORDER BY q.reason_rank ASC, q.scheduled_start ASC NULLS LAST, q.visit_sequence ASC, q.visit_id ASC
    ),
    '[]'::jsonb
  )
  INTO v_needs
  FROM (
    SELECT DISTINCT ON (x.visit_id)
      x.visit_id,
      x.job_id,
      x.ticket_id,
      x.visit_sequence,
      x.visit_state,
      x.scheduled_start,
      x.scheduled_end,
      x.job_title,
      x.job_sequence,
      x.ticket_number,
      x.ticket_title,
      x.ticket_status,
      x.reason_code,
      x.panel,
      x.reason_rank,
      (
        '/support/tickets/' || x.ticket_id::text
        || '?job=' || x.job_id::text
        || '&visit=' || x.visit_id::text
        || '&panel=' || x.panel
      ) AS href
    FROM (
      -- report_revision
      SELECT
        v.id AS visit_id,
        v.job_id,
        j.ticket_id,
        v.visit_sequence,
        v.state AS visit_state,
        v.scheduled_start,
        v.scheduled_end,
        j.title AS job_title,
        j.job_sequence,
        t.ticket_number,
        t.title AS ticket_title,
        t.status AS ticket_status,
        'report_revision'::text AS reason_code,
        'report'::text AS panel,
        1 AS reason_rank
      FROM public.service_job_visits v
      JOIN public.service_jobs j ON j.id = v.job_id
      JOIN public.service_tickets t ON t.id = j.ticket_id
      JOIN public.service_reports r ON r.visit_id = v.id
      JOIN LATERAL (
        SELECT rev.id AS revision_id
        FROM public.service_report_revisions rev
        WHERE rev.report_id = r.id
        ORDER BY rev.revision_number DESC
        LIMIT 1
      ) latest_rev ON true
      JOIN public.service_report_reviews rv
        ON rv.revision_id = latest_rev.revision_id
       AND rv.decision = 'returned'
      WHERE v.state = 'completed'
        AND v.attending_technician_id = v_actor.uid
        AND j.state = 'in_progress'
        AND t.status NOT IN ('closed', 'cancelled')

      UNION ALL

      -- report_submit (no revisions yet)
      SELECT
        v.id,
        v.job_id,
        j.ticket_id,
        v.visit_sequence,
        v.state,
        v.scheduled_start,
        v.scheduled_end,
        j.title,
        j.job_sequence,
        t.ticket_number,
        t.title,
        t.status,
        'report_submit'::text,
        'report'::text,
        2
      FROM public.service_job_visits v
      JOIN public.service_jobs j ON j.id = v.job_id
      JOIN public.service_tickets t ON t.id = j.ticket_id
      WHERE v.state = 'completed'
        AND v.attending_technician_id = v_actor.uid
        AND j.state = 'in_progress'
        AND t.status NOT IN ('closed', 'cancelled')
        AND NOT EXISTS (
          SELECT 1
          FROM public.service_reports r
          JOIN public.service_report_revisions rev ON rev.report_id = r.id
          WHERE r.visit_id = v.id
        )

      UNION ALL

      -- in_progress / checklist
      SELECT
        v.id,
        v.job_id,
        j.ticket_id,
        v.visit_sequence,
        v.state,
        v.scheduled_start,
        v.scheduled_end,
        j.title,
        j.job_sequence,
        t.ticket_number,
        t.title,
        t.status,
        'in_progress_or_checklist'::text,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM public.service_job_routine_pins p
            WHERE p.job_id = j.id AND p.status = 'active'
          ) THEN 'checklist'
          ELSE 'visit'
        END,
        3
      FROM public.service_job_visits v
      JOIN public.service_jobs j ON j.id = v.job_id
      JOIN public.service_tickets t ON t.id = j.ticket_id
      WHERE v.state = 'in_progress'
        AND v.attending_technician_id = v_actor.uid
        AND j.state NOT IN ('completed', 'cancelled', 'waived')
        AND t.status NOT IN ('closed', 'cancelled')

      UNION ALL

      -- overdue scheduled (wall-clock scheduled_end < now())
      SELECT
        v.id,
        v.job_id,
        j.ticket_id,
        v.visit_sequence,
        v.state,
        v.scheduled_start,
        v.scheduled_end,
        j.title,
        j.job_sequence,
        t.ticket_number,
        t.title,
        t.status,
        'overdue_scheduled'::text,
        'visit'::text,
        4
      FROM public.service_job_visits v
      JOIN public.service_jobs j ON j.id = v.job_id
      JOIN public.service_tickets t ON t.id = j.ticket_id
      WHERE v.state = 'scheduled'
        AND v.scheduled_end IS NOT NULL
        AND v.scheduled_end < now()
        AND j.assigned_technician_id = v_actor.uid
        AND j.state NOT IN ('completed', 'cancelled', 'waived')
        AND t.status NOT IN ('closed', 'cancelled')
    ) x
    ORDER BY x.visit_id, x.reason_rank ASC
  ) q;

  RETURN jsonb_build_object(
    'as_of', v_as_of,
    'window_end', v_window_end,
    'timezone', 'Africa/Cairo',
    'assigned_jobs', jsonb_build_object(
      'count', jsonb_array_length(v_assigned),
      'items', v_assigned
    ),
    'upcoming_visits', jsonb_build_object(
      'count', jsonb_array_length(v_upcoming),
      'items', v_upcoming
    ),
    'needs_attention', jsonb_build_object(
      'count', jsonb_array_length(v_needs),
      'items', v_needs
    )
  );
END;
$$;

COMMENT ON FUNCTION public.get_technician_daily_ops_workspace(date, uuid) IS
  'DO-2 technician caller-scoped read-only daily ops queues. Count equals items length. 42501 technician_daily_ops_authz_denied for customers/other roles.';

REVOKE ALL ON FUNCTION public.get_technician_daily_ops_workspace(date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_technician_daily_ops_workspace(date, uuid)
  TO authenticated, service_role;

-- Focus resolver: authorized match or safe unfocused fallback (no existence/authz leak).
CREATE OR REPLACE FUNCTION public.resolve_technician_ticket_focus(
  p_ticket_id uuid,
  p_job_id uuid DEFAULT NULL,
  p_visit_id uuid DEFAULT NULL,
  p_panel text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_uid uuid := admin_private.caller_uid();
  v_panel text := NULLIF(btrim(COALESCE(p_panel, '')), '');
  v_job public.service_jobs%ROWTYPE;
  v_visit public.service_job_visits%ROWTYPE;
BEGIN
  IF v_uid IS NULL OR p_ticket_id IS NULL THEN
    RETURN jsonb_build_object('focused', false);
  END IF;

  IF NOT admin_private.can_read_ticket_workflow(p_ticket_id) THEN
    RETURN jsonb_build_object('focused', false);
  END IF;

  IF v_panel IS NOT NULL AND v_panel NOT IN ('visit', 'checklist', 'report') THEN
    RETURN jsonb_build_object('focused', false);
  END IF;

  IF p_visit_id IS NOT NULL THEN
    SELECT * INTO v_visit FROM public.service_job_visits WHERE id = p_visit_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('focused', false);
    END IF;
    SELECT * INTO v_job FROM public.service_jobs WHERE id = v_visit.job_id;
    IF NOT FOUND OR v_job.ticket_id IS DISTINCT FROM p_ticket_id THEN
      RETURN jsonb_build_object('focused', false);
    END IF;
    IF p_job_id IS NOT NULL AND p_job_id IS DISTINCT FROM v_job.id THEN
      RETURN jsonb_build_object('focused', false);
    END IF;
    RETURN jsonb_build_object(
      'focused', true,
      'job_id', v_job.id,
      'visit_id', v_visit.id,
      'panel', COALESCE(v_panel, 'visit')
    );
  END IF;

  IF p_job_id IS NOT NULL THEN
    SELECT * INTO v_job FROM public.service_jobs WHERE id = p_job_id;
    IF NOT FOUND OR v_job.ticket_id IS DISTINCT FROM p_ticket_id THEN
      RETURN jsonb_build_object('focused', false);
    END IF;
    RETURN jsonb_build_object(
      'focused', true,
      'job_id', v_job.id,
      'visit_id', NULL,
      'panel', COALESCE(v_panel, 'visit')
    );
  END IF;

  RETURN jsonb_build_object('focused', false);
END;
$$;

COMMENT ON FUNCTION public.resolve_technician_ticket_focus(uuid, uuid, uuid, text) IS
  'DO-2 focus resolver via authorized workflow reads only. Unauthorized/invalid targets return focused=false with no disclosure.';

REVOKE ALL ON FUNCTION public.resolve_technician_ticket_focus(uuid, uuid, uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_technician_ticket_focus(uuid, uuid, uuid, text)
  TO authenticated, service_role;
