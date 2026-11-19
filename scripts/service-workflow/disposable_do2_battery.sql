-- DO-2 technician daily ops disposable battery (proposal 82f74069 acceptance IDs).
-- Staging-equivalent ticket RLS + getter paths. Not Spark / not remote apply.
CREATE TEMP TABLE do2_results (
  check_id text PRIMARY KEY,
  status text NOT NULL,
  detail text NOT NULL DEFAULT ''
);

CREATE OR REPLACE FUNCTION pg_temp.do2_note(p_id text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO do2_results(check_id, status, detail)
  VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, COALESCE(p_detail, ''))
  ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.do2_as(p_uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('app.b1_uid', p_uid::text, true);
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.do2_failinfo(
  p_sql text, OUT denied boolean, OUT err_state text, OUT err_detail text, OUT msg text
) RETURNS record LANGUAGE plpgsql AS $$
BEGIN
  denied := false; err_state := NULL; err_detail := NULL; msg := NULL;
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    denied := true;
    err_state := SQLSTATE;
    msg := SQLERRM;
    GET STACKED DIAGNOSTICS err_detail = PG_EXCEPTION_DETAIL;
  END;
END;
$$;

DO $$
DECLARE
  admin1 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  support1 uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
  tech1 uuid := 'cccccccc-cccc-cccc-cccc-ccccccccccc1';
  tech2 uuid := 'cccccccc-cccc-cccc-cccc-ccccccccccc2';
  cust1 uuid := 'dddddddd-dddd-dddd-dddd-ddddddddddd1';
  v_as_of date := DATE '2026-03-15';
  v_ws jsonb;
  v_focus jsonb;
  v_hdr jsonb;
  v_report jsonb;
  v_fail boolean;
  v_state text;
  v_detail text;
  v_msg text;
  v_t uuid;
  v_t2 uuid;
  v_j uuid;
  v_j2 uuid;
  v_j_cancel uuid;
  v_j_done uuid;
  v_v_past uuid;
  v_v_in uuid;
  v_v_out uuid;
  v_v_null uuid;
  v_v_overdue uuid;
  v_v_ip uuid;
  v_v_rep uuid;
  v_v_ret uuid;
  v_rep uuid;
  v_rev uuid;
  v_audit_before bigint;
  v_audit_after bigint;
  v_ticket_sel int;
BEGIN
  -- ---- DO2-01 empty ----
  PERFORM pg_temp.do2_as(tech1);
  v_ws := public.get_technician_daily_ops_workspace(v_as_of, NULL);
  PERFORM pg_temp.do2_note('DO2-01',
    (v_ws->'assigned_jobs'->>'count')::int = 0
    AND (v_ws->'upcoming_visits'->>'count')::int = 0
    AND (v_ws->'needs_attention'->>'count')::int = 0
    AND jsonb_array_length(v_ws->'assigned_jobs'->'items') = 0,
    'empty workspace');

  -- Fixtures (admin inserts; SECURITY DEFINER workspace still caller-scoped)
  PERFORM pg_temp.do2_as(admin1);
  INSERT INTO public.service_tickets (id, user_id, assigned_to, status, title, ticket_number)
  VALUES (gen_random_uuid(), cust1, support1, 'in_progress', 'DO2 open', 'DO2-T-1')
  RETURNING id INTO v_t;
  INSERT INTO public.service_tickets (id, user_id, assigned_to, status, title, ticket_number)
  VALUES (gen_random_uuid(), cust1, support1, 'cancelled', 'DO2 cancel', 'DO2-T-C')
  RETURNING id INTO v_t2;

  INSERT INTO public.service_jobs (ticket_id, job_sequence, title, state, assigned_technician_id)
  VALUES (v_t, 1, 'Assigned A', 'planned', tech1) RETURNING id INTO v_j;
  INSERT INTO public.service_jobs (ticket_id, job_sequence, title, state, assigned_technician_id)
  VALUES (v_t, 2, 'Assigned B', 'in_progress', tech1) RETURNING id INTO v_j2;
  INSERT INTO public.service_jobs (ticket_id, job_sequence, title, state, assigned_technician_id)
  VALUES (v_t2, 1, 'Cancel job', 'planned', tech1) RETURNING id INTO v_j_cancel;
  INSERT INTO public.service_jobs (ticket_id, job_sequence, title, state, assigned_technician_id)
  VALUES (v_t, 3, 'Completed job', 'completed', tech1) RETURNING id INTO v_j_done;

  -- Upcoming window visits: as_of-1, as_of+3, as_of+8, NULL start
  INSERT INTO public.service_job_visits (
    job_id, visit_sequence, state, scheduled_start, scheduled_end, attending_technician_id
  ) VALUES (
    v_j, 1, 'scheduled',
    timestamptz '2026-03-14 10:00:00+02', timestamptz '2026-03-14 12:00:00+02', tech1
  ) RETURNING id INTO v_v_past;
  INSERT INTO public.service_job_visits (
    job_id, visit_sequence, state, scheduled_start, scheduled_end, attending_technician_id
  ) VALUES (
    v_j, 2, 'scheduled',
    timestamptz '2026-03-18 10:00:00+02', timestamptz '2026-03-18 12:00:00+02', tech1
  ) RETURNING id INTO v_v_in;
  INSERT INTO public.service_job_visits (
    job_id, visit_sequence, state, scheduled_start, scheduled_end, attending_technician_id
  ) VALUES (
    v_j, 3, 'scheduled',
    timestamptz '2026-03-24 10:00:00+02', timestamptz '2026-03-24 12:00:00+02', tech1
  ) RETURNING id INTO v_v_out;
  INSERT INTO public.service_job_visits (
    job_id, visit_sequence, state, scheduled_start, scheduled_end, attending_technician_id
  ) VALUES (
    v_j2, 1, 'scheduled', NULL, NULL, tech1
  ) RETURNING id INTO v_v_null;

  -- Overdue scheduled (wall-clock end in the past)
  INSERT INTO public.service_job_visits (
    job_id, visit_sequence, state, scheduled_start, scheduled_end, attending_technician_id
  ) VALUES (
    v_j2, 2, 'scheduled',
    now() - interval '2 days', now() - interval '1 day', tech1
  ) RETURNING id INTO v_v_overdue;

  -- In-progress attending (panel=visit without pin; checklist when pin present covered by focus UI)
  INSERT INTO public.service_job_visits (
    job_id, visit_sequence, state, scheduled_start, scheduled_end, attending_technician_id
  ) VALUES (
    v_j2, 3, 'in_progress', now() - interval '1 hour', now() + interval '1 hour', tech1
  ) RETURNING id INTO v_v_ip;

  -- Report submit path (completed attendance, job still in_progress, no revisions)
  INSERT INTO public.service_job_visits (
    job_id, visit_sequence, state, scheduled_start, scheduled_end, attending_technician_id
  ) VALUES (
    v_j2, 4, 'completed', now() - interval '5 hours', now() - interval '4 hours', tech1
  ) RETURNING id INTO v_v_rep;

  -- Separate ticket/job for DO2-06 reassignment chain
  -- (reuse v_v_rep pattern on a dedicated job after checks below)

  PERFORM pg_temp.do2_as(tech1);
  v_ws := public.get_technician_daily_ops_workspace(v_as_of, NULL);

  -- DO2-02 assigned jobs = 2 (not cancel, not completed)
  PERFORM pg_temp.do2_note('DO2-02',
    (v_ws->'assigned_jobs'->>'count')::int = 2
    AND jsonb_array_length(v_ws->'assigned_jobs'->'items') = 2,
    coalesce(v_ws->'assigned_jobs'->>'count', 'null'));

  -- DO2-03 upcoming only as_of+3
  PERFORM pg_temp.do2_note('DO2-03',
    (v_ws->'upcoming_visits'->>'count')::int = 1
    AND (v_ws->'upcoming_visits'->'items'->0->>'visit_id') = v_v_in::text,
    coalesce(v_ws->'upcoming_visits'->>'count', 'null'));

  -- DO2-04 default as_of / window fields present when null as_of
  v_ws := public.get_technician_daily_ops_workspace(NULL, NULL);
  PERFORM pg_temp.do2_note('DO2-04',
    (v_ws->>'timezone') = 'Africa/Cairo'
    AND (v_ws->>'as_of') IS NOT NULL
    AND (v_ws->>'window_end') IS NOT NULL
    AND (v_ws->>'window_end')::date = (v_ws->>'as_of')::date + 7,
    coalesce(v_ws->>'as_of', 'null'));

  -- Needs attention includes overdue + in_progress + report_submit (distinct visits)
  v_ws := public.get_technician_daily_ops_workspace(v_as_of, NULL);
  PERFORM pg_temp.do2_note('DO2-07-db',
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'needs_attention'->'items') i
      WHERE i->>'visit_id' = v_v_ip::text
        AND i->>'reason_code' = 'in_progress_or_checklist'
        AND i->>'panel' = 'visit'
    ),
    'in_progress → visit panel without pin');
  PERFORM pg_temp.do2_note('DO2-08-db',
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'needs_attention'->'items') i
      WHERE i->>'visit_id' = v_v_rep::text
        AND i->>'reason_code' = 'report_submit'
        AND i->>'panel' = 'report'
    ),
    'report_submit');

  -- Returned revision → report_revision
  PERFORM pg_temp.do2_as(admin1);
  INSERT INTO public.service_job_visits (
    job_id, visit_sequence, state, scheduled_start, scheduled_end, attending_technician_id
  ) VALUES (
    v_j2, 5, 'completed', now() - interval '8 hours', now() - interval '7 hours', tech1
  ) RETURNING id INTO v_v_ret;
  INSERT INTO public.service_reports (visit_id) VALUES (v_v_ret) RETURNING id INTO v_rep;
  INSERT INTO public.service_report_revisions (
    report_id, revision_number, findings, work_performed, labour, no_labour,
    verification_outcome, technician_declaration, submitted_by
  ) VALUES (
    v_rep, 1, 'f', 'w', '[]'::jsonb, true, 'further_work_required', 'decl', tech1
  ) RETURNING id INTO v_rev;
  INSERT INTO public.service_report_reviews (revision_id, reviewer_id, decision, comments)
  VALUES (v_rev, support1, 'returned', 'fix me');

  PERFORM pg_temp.do2_as(tech1);
  v_ws := public.get_technician_daily_ops_workspace(v_as_of, NULL);
  PERFORM pg_temp.do2_note('DO2-09-db',
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'needs_attention'->'items') i
      WHERE i->>'visit_id' = v_v_ret::text
        AND i->>'reason_code' = 'report_revision'
        AND i->>'panel' = 'report'
    ),
    'report_revision');

  -- DO2-05 reassignment moves upcoming to tech2
  PERFORM pg_temp.do2_as(admin1);
  UPDATE public.service_jobs SET assigned_technician_id = tech2 WHERE id = v_j;
  PERFORM pg_temp.do2_as(tech1);
  v_ws := public.get_technician_daily_ops_workspace(v_as_of, NULL);
  PERFORM pg_temp.do2_note('DO2-05-a',
    NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'upcoming_visits'->'items') i
      WHERE i->>'visit_id' = v_v_in::text
    )
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'assigned_jobs'->'items') i
      WHERE i->>'job_id' = v_j::text
    ),
    'tech1 dropped assigned/upcoming');
  PERFORM pg_temp.do2_as(tech2);
  v_ws := public.get_technician_daily_ops_workspace(v_as_of, NULL);
  PERFORM pg_temp.do2_note('DO2-05-b',
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'upcoming_visits'->'items') i
      WHERE i->>'visit_id' = v_v_in::text
    ),
    'tech2 gained upcoming');

  -- DO2-06 historical attendee chain under staging-eq RLS
  -- Reassign v_j2 away from tech1 while tech1 remains attending on completed report visit
  PERFORM pg_temp.do2_as(admin1);
  UPDATE public.service_jobs SET assigned_technician_id = tech2, state = 'in_progress' WHERE id = v_j2;

  PERFORM pg_temp.do2_as(tech1);
  v_ws := public.get_technician_daily_ops_workspace(v_as_of, NULL);
  PERFORM pg_temp.do2_note('DO2-06-queue',
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'needs_attention'->'items') i
      WHERE i->>'visit_id' = v_v_rep::text AND i->>'reason_code' = 'report_submit'
    ),
    'tech1 still needs report_submit');

  PERFORM pg_temp.do2_as(tech2);
  v_ws := public.get_technician_daily_ops_workspace(v_as_of, NULL);
  PERFORM pg_temp.do2_note('DO2-06-b-excluded',
    NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'needs_attention'->'items') i
      WHERE i->>'visit_id' = v_v_rep::text
    ),
    'tech2 no report_submit for unattended visit');

  PERFORM pg_temp.do2_as(tech1);
  -- Superusers bypass RLS even with FORCE; evaluate as authenticated role.
  EXECUTE 'SET ROLE authenticated';
  SELECT count(*) INTO v_ticket_sel FROM public.service_tickets WHERE id = v_t;
  EXECUTE 'RESET ROLE';
  PERFORM pg_temp.do2_note('DO2-06-no-ticket-select', v_ticket_sel = 0, 'direct ticket SELECT denied');

  v_hdr := public.get_technician_ticket_header(v_t);
  PERFORM pg_temp.do2_note('DO2-06-header',
    v_hdr IS NOT NULL AND (v_hdr->>'id') = v_t::text,
    'narrow header via getter');

  v_focus := public.resolve_technician_ticket_focus(v_t, v_j2, v_v_rep, 'report');
  PERFORM pg_temp.do2_note('DO2-06-focus',
    (v_focus->>'focused')::boolean IS TRUE
    AND (v_focus->>'visit_id') = v_v_rep::text
    AND (v_focus->>'panel') = 'report',
    coalesce(v_focus::text, 'null'));

  v_report := public.get_service_report_for_visit(v_v_rep);
  PERFORM pg_temp.do2_note('DO2-06-report-getter',
    v_report IS NOT NULL,
    'get_service_report_for_visit ok for historical attending');

  PERFORM pg_temp.do2_as(tech2);
  v_hdr := public.get_technician_ticket_header(v_t);
  -- tech2 is now assignee on v_j2 so header may succeed; focus on tech1's visit still ok via workflow.
  -- Ensure tech2 cannot get report_submit queue entry (already checked). Deny foreign focus leak:
  -- use a random visit id → focused false
  v_focus := public.resolve_technician_ticket_focus(v_t, v_j2, gen_random_uuid(), 'report');
  PERFORM pg_temp.do2_note('DO2-06-b-focus-safe',
    (v_focus->>'focused')::boolean IS NOT TRUE
    AND v_focus ? 'focused'
    AND NOT (v_focus ? 'visit_id' AND (v_focus->>'focused')::boolean),
    coalesce(v_focus::text, 'null'));

  -- DO2-10 customer 403
  PERFORM pg_temp.do2_as(cust1);
  SELECT * INTO v_fail, v_state, v_detail, v_msg
  FROM pg_temp.do2_failinfo(
    format($q$SELECT public.get_technician_daily_ops_workspace(%L::date, NULL)$q$, v_as_of)
  );
  PERFORM pg_temp.do2_note('DO2-10',
    v_fail AND v_state = '42501' AND v_detail = 'technician_daily_ops_authz_denied',
    coalesce(v_detail, v_msg));

  -- DO2-12 read-only: viewing workspace creates no audit rows
  PERFORM pg_temp.do2_as(tech1);
  SELECT count(*) INTO v_audit_before FROM public.service_workflow_audit;
  PERFORM public.get_technician_daily_ops_workspace(v_as_of, NULL);
  PERFORM public.resolve_technician_ticket_focus(v_t, v_j2, v_v_rep, 'report');
  SELECT count(*) INTO v_audit_after FROM public.service_workflow_audit;
  PERFORM pg_temp.do2_note('DO2-12', v_audit_before = v_audit_after, format('%s→%s', v_audit_before, v_audit_after));

  -- DO2-13 focus safe fallbacks
  PERFORM pg_temp.do2_as(tech1);
  v_focus := public.resolve_technician_ticket_focus(v_t, gen_random_uuid(), NULL, 'visit');
  PERFORM pg_temp.do2_note('DO2-13-invalid-job', (v_focus->>'focused')::boolean IS NOT TRUE, v_focus::text);

  v_focus := public.resolve_technician_ticket_focus(v_t, v_j2, v_v_rep, 'nope');
  PERFORM pg_temp.do2_note('DO2-13-bad-panel', (v_focus->>'focused')::boolean IS NOT TRUE, v_focus::text);

  -- Cross-ticket: visit belongs to v_t but ask on fake ticket
  v_focus := public.resolve_technician_ticket_focus(gen_random_uuid(), v_j2, v_v_rep, 'report');
  PERFORM pg_temp.do2_note('DO2-13-cross-ticket', (v_focus->>'focused')::boolean IS NOT TRUE, v_focus::text);

  -- Unauthorized other tech without workflow access to a private ticket
  PERFORM pg_temp.do2_as(admin1);
  INSERT INTO public.service_tickets (user_id, assigned_to, status, title, ticket_number)
  VALUES (cust1, support1, 'in_progress', 'other', 'DO2-T-X') RETURNING id INTO v_t2;
  -- leave no jobs for tech1
  PERFORM pg_temp.do2_as(tech1);
  v_focus := public.resolve_technician_ticket_focus(v_t2, NULL, NULL, 'visit');
  PERFORM pg_temp.do2_note('DO2-13-unauthorized', (v_focus->>'focused')::boolean IS NOT TRUE, v_focus::text);

  -- NULL window exclusion: null-start never in upcoming
  PERFORM pg_temp.do2_as(admin1);
  UPDATE public.service_jobs SET assigned_technician_id = tech1 WHERE id = v_j2;
  PERFORM pg_temp.do2_as(tech1);
  v_ws := public.get_technician_daily_ops_workspace(v_as_of, NULL);
  PERFORM pg_temp.do2_note('DO2-NULL-window',
    NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'upcoming_visits'->'items') i
      WHERE i->>'visit_id' = v_v_null::text
    ),
    'null scheduled_start excluded');

  -- Overdue uses wall-clock (still present for assignee)
  PERFORM pg_temp.do2_note('DO2-overdue-wallclock',
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'needs_attention'->'items') i
      WHERE i->>'visit_id' = v_v_overdue::text AND i->>'reason_code' = 'overdue_scheduled'
    ),
    'overdue_scheduled');
END $$;

SELECT check_id || '|' || status || '|' || detail FROM do2_results ORDER BY check_id;
