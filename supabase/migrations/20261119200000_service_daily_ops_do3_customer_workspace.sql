-- DO-3 Customer daily operations workspace (caller-scoped read helpers + issued focus).
-- Proposal tip: fd0387c8 / stamp 830ddf15 (B-DO3-1). Local implementation only — no remote apply.
-- Visible issued heads = admin_private.revision_is_customer_visible (one head per report).
-- Both report chips share that population; awaiting-ack = heads with null effective_acknowledgment.
-- Read-only: no inserts/updates; schedule uses existing list_machine_coverage_schedule (paused rows remain).

CREATE OR REPLACE FUNCTION public.get_customer_daily_ops_workspace(
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
  v_tickets jsonb;
  v_issued jsonb;
  v_awaiting jsonb;
  v_upcoming jsonb;
  v_sched jsonb;
  v_items jsonb := '[]'::jsonb;
  v_item jsonb;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('customer', 'admin', 'support') THEN
    RAISE EXCEPTION 'Not permitted to read customer daily operations workspace'
      USING ERRCODE = '42501', DETAIL = 'customer_daily_ops_authz_denied';
  END IF;

  -- §5.1 Active tickets (caller-owned; open = not closed/cancelled)
  SELECT COALESCE(
    jsonb_agg(row_to_json(q)::jsonb ORDER BY q.updated_at DESC, q.ticket_id ASC),
    '[]'::jsonb
  )
  INTO v_tickets
  FROM (
    SELECT
      t.id AS ticket_id,
      t.ticket_number,
      t.title,
      t.status,
      t.updated_at,
      ('/support/tickets/' || t.id::text) AS href
    FROM public.service_tickets t
    WHERE t.user_id = v_actor.uid
      AND t.status NOT IN ('closed', 'cancelled')
  ) q;

  -- §5.0 / §5.2 Visible issued heads (revision_is_customer_visible; one per report)
  SELECT COALESCE(
    jsonb_agg(
      row_to_json(q)::jsonb
      ORDER BY q.submitted_at DESC, q.revision_number DESC, q.revision_id ASC
    ),
    '[]'::jsonb
  )
  INTO v_issued
  FROM (
    SELECT
      r.id AS revision_id,
      r.report_id,
      r.revision_number,
      r.submitted_at,
      rep.visit_id,
      j.id AS job_id,
      j.ticket_id,
      j.job_sequence,
      j.title AS job_title,
      v.visit_sequence,
      t.ticket_number,
      t.title AS ticket_title,
      t.status AS ticket_status,
      (
        '/support/tickets/' || j.ticket_id::text
        || '?visit=' || rep.visit_id::text
        || '&panel=issued'
        || '&revision=' || r.id::text
      ) AS href
    FROM public.service_report_revisions r
    JOIN public.service_reports rep ON rep.id = r.report_id
    JOIN public.service_job_visits v ON v.id = rep.visit_id
    JOIN public.service_jobs j ON j.id = v.job_id
    JOIN public.service_tickets t ON t.id = j.ticket_id
    WHERE t.user_id = v_actor.uid
      AND admin_private.revision_is_customer_visible(r.id)
  ) q;

  -- §5.3 Awaiting acknowledgment = §5.0 where effective_acknowledgment IS NULL
  SELECT COALESCE(
    jsonb_agg(
      row_to_json(q)::jsonb
      ORDER BY q.submitted_at ASC, q.revision_id ASC
    ),
    '[]'::jsonb
  )
  INTO v_awaiting
  FROM (
    SELECT
      r.id AS revision_id,
      r.report_id,
      r.revision_number,
      r.submitted_at,
      rep.visit_id,
      j.id AS job_id,
      j.ticket_id,
      j.job_sequence,
      j.title AS job_title,
      v.visit_sequence,
      t.ticket_number,
      t.title AS ticket_title,
      t.status AS ticket_status,
      (
        '/support/tickets/' || j.ticket_id::text
        || '?visit=' || rep.visit_id::text
        || '&panel=issued'
        || '&revision=' || r.id::text
      ) AS href
    FROM public.service_report_revisions r
    JOIN public.service_reports rep ON rep.id = r.report_id
    JOIN public.service_job_visits v ON v.id = rep.visit_id
    JOIN public.service_jobs j ON j.id = v.job_id
    JOIN public.service_tickets t ON t.id = j.ticket_id
    WHERE t.user_id = v_actor.uid
      AND admin_private.revision_is_customer_visible(r.id)
      -- effective_acknowledgment RETURNS a composite (not SETOF): empty → NULL row;
      -- test .id IS NULL rather than NOT EXISTS on the FROM form.
      AND (public.effective_acknowledgment(r.id)).id IS NULL
  ) q;

  -- §5.4 Upcoming service: reuse list_machine_coverage_schedule; keep paused; filter upcoming|due
  v_sched := public.list_machine_coverage_schedule(
    v_as_of, NULL, NULL, v_actor.uid, NULL, NULL, NULL
  );
  v_items := COALESCE(v_sched->'items', '[]'::jsonb);
  v_upcoming := '[]'::jsonb;
  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(v_items) AS t(value)
    WHERE t.value->>'bucket' IN ('upcoming', 'due')
    ORDER BY (t.value->>'planned_due_date') ASC NULLS LAST,
             (t.value->>'coverage_id') ASC,
             ((t.value->>'sequence')::int) ASC
  LOOP
    v_upcoming := v_upcoming || jsonb_build_array(
      v_item || jsonb_build_object(
        'href',
        CASE
          WHEN NULLIF(v_item->>'ticket_id', '') IS NOT NULL THEN
            '/support/tickets/' || (v_item->>'ticket_id')
          ELSE
            NULL
        END
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'as_of', v_as_of,
    'timezone', 'Africa/Cairo',
    'active_tickets', jsonb_build_object(
      'count', jsonb_array_length(v_tickets),
      'items', v_tickets
    ),
    'issued_reports', jsonb_build_object(
      'count', jsonb_array_length(v_issued),
      'items', v_issued
    ),
    'awaiting_acknowledgment', jsonb_build_object(
      'count', jsonb_array_length(v_awaiting),
      'items', v_awaiting
    ),
    'upcoming_service', jsonb_build_object(
      'count', jsonb_array_length(v_upcoming),
      'items', v_upcoming
    )
  );
END;
$$;

COMMENT ON FUNCTION public.get_customer_daily_ops_workspace(date, uuid) IS
  'DO-3 customer caller-scoped read-only daily ops queues. Report chips share revision_is_customer_visible heads. 42501 customer_daily_ops_authz_denied for technicians/other roles.';

REVOKE ALL ON FUNCTION public.get_customer_daily_ops_workspace(date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_customer_daily_ops_workspace(date, uuid)
  TO authenticated, service_role;

-- Focus resolver for panel=issued (owner + visible head only; safe unfocused fallback).
CREATE OR REPLACE FUNCTION public.resolve_customer_ticket_focus(
  p_ticket_id uuid,
  p_visit_id uuid DEFAULT NULL,
  p_revision_id uuid DEFAULT NULL,
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
  v_ticket public.service_tickets%ROWTYPE;
  v_visit public.service_job_visits%ROWTYPE;
  v_job public.service_jobs%ROWTYPE;
  v_report public.service_reports%ROWTYPE;
  v_rev public.service_report_revisions%ROWTYPE;
BEGIN
  IF v_uid IS NULL OR p_ticket_id IS NULL THEN
    RETURN jsonb_build_object('focused', false);
  END IF;

  SELECT * INTO v_ticket FROM public.service_tickets WHERE id = p_ticket_id;
  IF NOT FOUND OR v_ticket.user_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('focused', false);
  END IF;

  IF v_panel IS DISTINCT FROM 'issued' THEN
    RETURN jsonb_build_object('focused', false);
  END IF;

  IF p_revision_id IS NOT NULL THEN
    IF NOT admin_private.revision_is_customer_visible(p_revision_id) THEN
      RETURN jsonb_build_object('focused', false);
    END IF;
    SELECT * INTO v_rev FROM public.service_report_revisions WHERE id = p_revision_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('focused', false);
    END IF;
    SELECT * INTO v_report FROM public.service_reports WHERE id = v_rev.report_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('focused', false);
    END IF;
    SELECT * INTO v_visit FROM public.service_job_visits WHERE id = v_report.visit_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('focused', false);
    END IF;
    SELECT * INTO v_job FROM public.service_jobs WHERE id = v_visit.job_id;
    IF NOT FOUND OR v_job.ticket_id IS DISTINCT FROM p_ticket_id THEN
      RETURN jsonb_build_object('focused', false);
    END IF;
    IF p_visit_id IS NOT NULL AND p_visit_id IS DISTINCT FROM v_visit.id THEN
      RETURN jsonb_build_object('focused', false);
    END IF;
    RETURN jsonb_build_object(
      'focused', true,
      'visit_id', v_visit.id,
      'revision_id', v_rev.id,
      'revision_number', v_rev.revision_number,
      'panel', 'issued'
    );
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
    RETURN jsonb_build_object(
      'focused', true,
      'visit_id', v_visit.id,
      'revision_id', NULL,
      'revision_number', NULL,
      'panel', 'issued'
    );
  END IF;

  -- panel=issued alone: focus issued card without a specific revision
  RETURN jsonb_build_object(
    'focused', true,
    'visit_id', NULL,
    'revision_id', NULL,
    'revision_number', NULL,
    'panel', 'issued'
  );
END;
$$;

COMMENT ON FUNCTION public.resolve_customer_ticket_focus(uuid, uuid, uuid, text) IS
  'DO-3 customer issued-panel focus. Unauthorized/superseded/cross-ticket targets return focused=false with no disclosure.';

REVOKE ALL ON FUNCTION public.resolve_customer_ticket_focus(uuid, uuid, uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_customer_ticket_focus(uuid, uuid, uuid, text)
  TO authenticated, service_role;
