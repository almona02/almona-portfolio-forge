-- DO-3 customer daily ops disposable battery (proposal fd0387c8 / B-DO3-1).
-- Staging-equivalent ticket RLS + visible-head helper. Not Spark / not remote apply.
CREATE TEMP TABLE do3_results (
  check_id text PRIMARY KEY,
  status text NOT NULL,
  detail text NOT NULL DEFAULT ''
);

CREATE OR REPLACE FUNCTION pg_temp.do3_note(p_id text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO do3_results(check_id, status, detail)
  VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, COALESCE(p_detail, ''))
  ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.do3_as(p_uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('app.b1_uid', p_uid::text, true);
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.do3_failinfo(
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
  cust1 uuid := 'dddddddd-dddd-dddd-dddd-ddddddddddd1';
  cust2 uuid := 'dddddddd-dddd-dddd-dddd-ddddddddddd2';
  v_as_of date := DATE '2026-03-15';
  v_ws jsonb;
  v_focus jsonb;
  v_fail boolean;
  v_state text;
  v_detail text;
  v_msg text;
  v_t uuid;
  v_t2 uuid;
  v_t_closed uuid;
  v_t_foreign uuid;
  v_j uuid;
  v_j2 uuid;
  v_v1 uuid;
  v_v2 uuid;
  v_rep1 uuid;
  v_rep2 uuid;
  v_rev1 uuid;
  v_rev2 uuid;
  v_rev1b uuid;
  v_rev_draft uuid;
  v_rev_super uuid;
  v_rev_closed uuid;
  v_audit_before bigint;
  v_audit_after bigint;
  v_payload jsonb;
  v_created jsonb;
  v_routine uuid;
  v_draft uuid;
  v_ver uuid;
  v_mach uuid;
  v_mach2 uuid;
  v_cov uuid;
  v_cov_paused uuid;
  v_up_count int;
  v_due_count int;
  v_over_count int;
  v_paused_count int;
BEGIN
  INSERT INTO auth.users (id) VALUES (cust2) ON CONFLICT DO NOTHING;
  INSERT INTO public.profiles (id, role) VALUES (cust2, 'customer') ON CONFLICT DO NOTHING;

  -- DO3-01 empty
  PERFORM pg_temp.do3_as(cust1);
  v_ws := public.get_customer_daily_ops_workspace(v_as_of, NULL);
  PERFORM pg_temp.do3_note('DO3-01',
    (v_ws->'active_tickets'->>'count')::int = 0
    AND (v_ws->'issued_reports'->>'count')::int = 0
    AND (v_ws->'awaiting_acknowledgment'->>'count')::int = 0
    AND (v_ws->'upcoming_service'->>'count')::int = 0
    AND jsonb_array_length(v_ws->'active_tickets'->'items') = 0,
    'empty workspace');

  PERFORM pg_temp.do3_as(admin1);
  INSERT INTO public.service_tickets (id, user_id, assigned_to, status, title, ticket_number, updated_at)
  VALUES
    (gen_random_uuid(), cust1, support1, 'in_progress', 'DO3 open A', 'DO3-T-A', now() - interval '1 hour')
  RETURNING id INTO v_t;
  INSERT INTO public.service_tickets (id, user_id, assigned_to, status, title, ticket_number, updated_at)
  VALUES
    (gen_random_uuid(), cust1, support1, 'awaiting_customer', 'DO3 open B', 'DO3-T-B', now())
  RETURNING id INTO v_t2;
  INSERT INTO public.service_tickets (id, user_id, assigned_to, status, title, ticket_number)
  VALUES
    (gen_random_uuid(), cust1, support1, 'closed', 'DO3 closed', 'DO3-T-C')
  RETURNING id INTO v_t_closed;
  INSERT INTO public.service_tickets (id, user_id, assigned_to, status, title, ticket_number)
  VALUES
    (gen_random_uuid(), cust2, support1, 'in_progress', 'DO3 foreign', 'DO3-T-F')
  RETURNING id INTO v_t_foreign;

  PERFORM pg_temp.do3_as(cust1);
  v_ws := public.get_customer_daily_ops_workspace(v_as_of, NULL);
  PERFORM pg_temp.do3_note('DO3-02',
    (v_ws->'active_tickets'->>'count')::int = 2
    AND jsonb_array_length(v_ws->'active_tickets'->'items') = 2
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'active_tickets'->'items') i
      WHERE i->>'ticket_id' = v_t::text AND i->>'status' = 'in_progress'
    )
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'active_tickets'->'items') i
      WHERE i->>'ticket_id' = v_t2::text AND i->>'status' = 'awaiting_customer'
    )
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'active_tickets'->'items') i
      WHERE i->>'ticket_id' = v_t_closed::text
    ),
    coalesce(v_ws->'active_tickets'->>'count', 'null'));

  -- Issued head fixtures on v_t: two visits → two reports
  PERFORM pg_temp.do3_as(admin1);
  INSERT INTO public.service_jobs (ticket_id, job_sequence, title, state, assigned_technician_id)
  VALUES (v_t, 1, 'Job multi', 'completed', tech1) RETURNING id INTO v_j;
  INSERT INTO public.service_job_visits (
    job_id, visit_sequence, state, scheduled_start, scheduled_end, attending_technician_id
  ) VALUES (
    v_j, 1, 'completed', now() - interval '2 days', now() - interval '2 days' + interval '1 hour', tech1
  ) RETURNING id INTO v_v1;
  INSERT INTO public.service_job_visits (
    job_id, visit_sequence, state, scheduled_start, scheduled_end, attending_technician_id
  ) VALUES (
    v_j, 2, 'completed', now() - interval '1 day', now() - interval '1 day' + interval '1 hour', tech1
  ) RETURNING id INTO v_v2;

  INSERT INTO public.service_reports (visit_id) VALUES (v_v1) RETURNING id INTO v_rep1;
  INSERT INTO public.service_reports (visit_id) VALUES (v_v2) RETURNING id INTO v_rep2;

  INSERT INTO public.service_report_revisions (
    report_id, revision_number, findings, work_performed, labour, no_labour,
    verification_outcome, technician_declaration, submitted_by, submitted_at
  ) VALUES (
    v_rep1, 1, 'f1', 'w1', '[]'::jsonb, true, 'verified_fixed', 'decl', tech1, now() - interval '2 days'
  ) RETURNING id INTO v_rev1;
  INSERT INTO public.service_report_reviews (revision_id, reviewer_id, decision)
  VALUES (v_rev1, support1, 'approved_issued');

  INSERT INTO public.service_report_revisions (
    report_id, revision_number, findings, work_performed, labour, no_labour,
    verification_outcome, technician_declaration, submitted_by, submitted_at
  ) VALUES (
    v_rep2, 1, 'f2', 'w2', '[]'::jsonb, true, 'verified_fixed', 'decl', tech1, now() - interval '1 day'
  ) RETURNING id INTO v_rev1b;
  INSERT INTO public.service_report_reviews (revision_id, reviewer_id, decision)
  VALUES (v_rev1b, support1, 'approved_issued');

  PERFORM pg_temp.do3_as(cust1);
  v_ws := public.get_customer_daily_ops_workspace(v_as_of, NULL);
  PERFORM pg_temp.do3_note('DO3-15',
    (v_ws->'issued_reports'->>'count')::int = 2
    AND jsonb_array_length(v_ws->'issued_reports'->'items') = 2
    AND (v_ws->'awaiting_acknowledgment'->>'count')::int = 2
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'issued_reports'->'items') i
      WHERE i->>'revision_id' = v_rev1::text AND i->>'visit_id' = v_v1::text
    )
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'issued_reports'->'items') i
      WHERE i->>'revision_id' = v_rev1b::text AND i->>'visit_id' = v_v2::text
    ),
    format(
      'issued=%s await=%s items=%s vis=%s/%s visible1=%s visible1b=%s',
      v_ws->'issued_reports'->>'count',
      v_ws->'awaiting_acknowledgment'->>'count',
      v_ws->'issued_reports'->'items',
      v_v1, v_v2,
      admin_private.revision_is_customer_visible(v_rev1),
      admin_private.revision_is_customer_visible(v_rev1b)
    ));

  -- DO3-03 pending/returned correction does not displace head
  PERFORM pg_temp.do3_as(admin1);
  INSERT INTO public.service_report_revisions (
    report_id, revision_number, findings, work_performed, labour, no_labour,
    verification_outcome, technician_declaration, submitted_by, submitted_at
  ) VALUES (
    v_rep1, 2, 'draft', 'w', '[]'::jsonb, true, 'verified_fixed', 'decl', tech1, now()
  ) RETURNING id INTO v_rev_draft;
  INSERT INTO public.service_report_reviews (revision_id, reviewer_id, decision, comments)
  VALUES (v_rev_draft, support1, 'returned', 'fix');

  PERFORM pg_temp.do3_as(cust1);
  v_ws := public.get_customer_daily_ops_workspace(v_as_of, NULL);
  PERFORM pg_temp.do3_note('DO3-03',
    (v_ws->'issued_reports'->>'count')::int = 2
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'issued_reports'->'items') i
      WHERE i->>'revision_id' = v_rev1::text
    )
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'issued_reports'->'items') i
      WHERE i->>'revision_id' = v_rev_draft::text
    )
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'awaiting_acknowledgment'->'items') i
      WHERE i->>'revision_id' = v_rev1::text
    ),
    'pending/returned does not displace head');

  -- DO3-04 / DO3-16 supersession: issue rev 2 on report 1
  PERFORM pg_temp.do3_as(admin1);
  DELETE FROM public.service_report_reviews WHERE revision_id = v_rev_draft;
  DELETE FROM public.service_report_revisions WHERE id = v_rev_draft;
  INSERT INTO public.service_report_revisions (
    report_id, revision_number, findings, work_performed, labour, no_labour,
    verification_outcome, technician_declaration, submitted_by, submitted_at
  ) VALUES (
    v_rep1, 2, 'f1b', 'w1b', '[]'::jsonb, true, 'verified_fixed', 'decl', tech1, now()
  ) RETURNING id INTO v_rev2;
  INSERT INTO public.service_report_reviews (revision_id, reviewer_id, decision)
  VALUES (v_rev2, support1, 'approved_issued');

  PERFORM pg_temp.do3_as(cust1);
  v_ws := public.get_customer_daily_ops_workspace(v_as_of, NULL);
  v_rev_super := v_rev1;
  PERFORM pg_temp.do3_note('DO3-04',
    (v_ws->'issued_reports'->>'count')::int = 2
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'issued_reports'->'items') i
      WHERE i->>'revision_id' = v_rev2::text
    )
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'issued_reports'->'items') i
      WHERE i->>'revision_id' = v_rev_super::text
    )
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'awaiting_acknowledgment'->'items') i
      WHERE i->>'revision_id' = v_rev2::text
    )
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'awaiting_acknowledgment'->'items') i
      WHERE i->>'revision_id' = v_rev_super::text
    )
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'issued_reports'->'items') i
      WHERE i->>'revision_id' = v_rev2::text
        AND i->>'href' LIKE ('%/support/tickets/' || v_t::text || '%')
        AND i->>'href' LIKE '%panel=issued%'
        AND i->>'href' LIKE ('%revision=' || v_rev2::text || '%')
    ),
    'supersession leaves rev1; destinations use rev2');

  PERFORM pg_temp.do3_note('DO3-16',
    (v_ws->'issued_reports'->>'count')::int = 2
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'issued_reports'->'items') i
      WHERE i->>'revision_id' = v_rev2::text AND i->>'report_id' = v_rep1::text
    )
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'issued_reports'->'items') i
      WHERE i->>'revision_id' = v_rev1b::text AND i->>'report_id' = v_rep2::text
    ),
    'multi-visit after one supersession');

  -- DO3-05 awaiting null effective ack
  PERFORM pg_temp.do3_note('DO3-05',
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'awaiting_acknowledgment'->'items') i
      WHERE i->>'revision_id' = v_rev2::text
        AND i->>'href' LIKE '%panel=issued%'
        AND i->>'href' LIKE ('%revision=' || v_rev2::text || '%')
    ),
    'awaiting link');

  -- DO3-06 accept
  PERFORM pg_temp.do3_as(admin1);
  INSERT INTO public.service_acknowledgments (
    issued_revision_id, response, comment, responded_by, event_seq
  ) VALUES (v_rev2, 'accepted', NULL, cust1, 1);

  PERFORM pg_temp.do3_as(cust1);
  v_ws := public.get_customer_daily_ops_workspace(v_as_of, NULL);
  PERFORM pg_temp.do3_note('DO3-06',
    NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'awaiting_acknowledgment'->'items') i
      WHERE i->>'revision_id' = v_rev2::text
    )
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'issued_reports'->'items') i
      WHERE i->>'revision_id' = v_rev2::text
    ),
    'accepted leaves awaiting; stays issued');

  -- DO3-07 refuse on other head
  PERFORM pg_temp.do3_as(admin1);
  INSERT INTO public.service_acknowledgments (
    issued_revision_id, response, comment, responded_by, event_seq
  ) VALUES (v_rev1b, 'refused', 'not fixed', cust1, 1);
  PERFORM pg_temp.do3_as(cust1);
  v_ws := public.get_customer_daily_ops_workspace(v_as_of, NULL);
  PERFORM pg_temp.do3_note('DO3-07',
    NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'awaiting_acknowledgment'->'items') i
      WHERE i->>'revision_id' = v_rev1b::text
    )
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'issued_reports'->'items') i
      WHERE i->>'revision_id' = v_rev1b::text
    ),
    'refused leaves awaiting');

  -- DO3-08 unavailable on a fresh head (re-open awaiting via new issued on closed ticket path)
  -- Use closed ticket with issued head + unavailable
  PERFORM pg_temp.do3_as(admin1);
  INSERT INTO public.service_jobs (ticket_id, job_sequence, title, state, assigned_technician_id)
  VALUES (v_t_closed, 1, 'Closed job', 'completed', tech1) RETURNING id INTO v_j2;
  INSERT INTO public.service_job_visits (
    job_id, visit_sequence, state, scheduled_start, scheduled_end, attending_technician_id
  ) VALUES (
    v_j2, 1, 'completed', now() - interval '5 days', now() - interval '5 days' + interval '1 hour', tech1
  ) RETURNING id INTO v_v1;
  INSERT INTO public.service_reports (visit_id) VALUES (v_v1) RETURNING id INTO v_rep1;
  INSERT INTO public.service_report_revisions (
    report_id, revision_number, findings, work_performed, labour, no_labour,
    verification_outcome, technician_declaration, submitted_by
  ) VALUES (
    v_rep1, 1, 'fc', 'wc', '[]'::jsonb, true, 'verified_fixed', 'decl', tech1
  ) RETURNING id INTO v_rev_closed;
  INSERT INTO public.service_report_reviews (revision_id, reviewer_id, decision)
  VALUES (v_rev_closed, support1, 'approved_issued');
  INSERT INTO public.service_acknowledgments (
    issued_revision_id, response, comment, responded_by, event_seq
  ) VALUES (v_rev_closed, 'unavailable', 'no answer', support1, 1);

  PERFORM pg_temp.do3_as(cust1);
  v_ws := public.get_customer_daily_ops_workspace(v_as_of, NULL);
  PERFORM pg_temp.do3_note('DO3-08',
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'issued_reports'->'items') i
      WHERE i->>'revision_id' = v_rev_closed::text
    )
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'awaiting_acknowledgment'->'items') i
      WHERE i->>'revision_id' = v_rev_closed::text
    ),
    'unavailable settles awaiting');

  PERFORM pg_temp.do3_note('DO3-14',
    NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'active_tickets'->'items') i
      WHERE i->>'ticket_id' = v_t_closed::text
    )
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'issued_reports'->'items') i
      WHERE i->>'revision_id' = v_rev_closed::text
        AND i->>'ticket_id' = v_t_closed::text
    ),
    'closed ticket still has issued head');

  -- Focus resolver
  PERFORM pg_temp.do3_as(cust1);
  v_focus := public.resolve_customer_ticket_focus(v_t, NULL, v_rev2, 'issued');
  PERFORM pg_temp.do3_note('DO3-focus-ok',
    (v_focus->>'focused')::boolean = true
    AND (v_focus->>'revision_id') = v_rev2::text
    AND (v_focus->>'panel') = 'issued',
    coalesce(v_focus::text, 'null'));

  -- superseded revision focus → safe fallback
  v_focus := public.resolve_customer_ticket_focus(v_t, NULL, v_rev_super, 'issued');
  PERFORM pg_temp.do3_note('DO3-focus-superseded',
    (v_focus->>'focused')::boolean IS DISTINCT FROM true
    AND NOT admin_private.revision_is_customer_visible(v_rev_super),
    coalesce(v_focus::text, 'null'));

  -- foreign ticket focus
  v_focus := public.resolve_customer_ticket_focus(v_t_foreign, NULL, NULL, 'issued');
  PERFORM pg_temp.do3_note('DO3-10-focus',
    (v_focus->>'focused')::boolean IS DISTINCT FROM true,
    'foreign ticket unfocused');

  PERFORM pg_temp.do3_as(cust1);
  v_ws := public.get_customer_daily_ops_workspace(v_as_of, NULL);
  PERFORM pg_temp.do3_note('DO3-10-chips',
    NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'active_tickets'->'items') i
      WHERE i->>'ticket_id' = v_t_foreign::text
    ),
    'foreign ticket omitted');

  -- DO3-11 technician denied
  PERFORM pg_temp.do3_as(tech1);
  SELECT * INTO v_fail, v_state, v_detail, v_msg
  FROM pg_temp.do3_failinfo(
    'SELECT public.get_customer_daily_ops_workspace(DATE ''2026-03-15'', NULL)'
  );
  PERFORM pg_temp.do3_note('DO3-11',
    v_fail AND v_state = '42501' AND v_detail = 'customer_daily_ops_authz_denied',
    coalesce(v_state || ':' || coalesce(v_detail, '') || ':' || coalesce(v_msg, ''), 'no-fail'));

  -- Schedule upcoming/due/overdue + paused
  v_payload := jsonb_build_object(
    'sections', jsonb_build_array(
      jsonb_build_object(
        'id', 'safety', 'kind', 'safety', 'title', 'Safety',
        'items', jsonb_build_array(jsonb_build_object(
          'id', 'sg1', 'type', 'safety_gate', 'requirement_class', 'safety_gate',
          'instruction', 'LOTO', 'evidence', 'none', 'waivable', false
        ))
      )
    ),
    'cadence', jsonb_build_object('interval', 1, 'unit', 'months')
  );
  PERFORM pg_temp.do3_as(admin1);
  INSERT INTO public.machines (id, name, model, brand, catalog_model_id, catalog_link_status, owner_id)
  VALUES (gen_random_uuid(), 'DO3 Saw', 'saw', 'Acme', 'CM-SAW-DO3', 'linked', cust1)
  RETURNING id INTO v_mach;
  INSERT INTO public.machines (id, name, model, brand, catalog_model_id, catalog_link_status, owner_id)
  VALUES (gen_random_uuid(), 'DO3 Saw2', 'saw', 'Acme', 'CM-SAW-DO3B', 'linked', cust1)
  RETURNING id INTO v_mach2;

  v_created := public.create_service_routine_draft(
    'DO3-COV-1', 'DO3 Coverage Routine', '', '', v_payload, ARRAY['saw'], NULL
  );
  v_routine := (v_created->>'routine_id')::uuid;
  v_draft := (v_created->>'version_id')::uuid;
  PERFORM public.set_service_routine_applicability(v_routine, 'family', 'saw', NULL, NULL, NULL);
  PERFORM public.set_service_routine_applicability(
    v_routine, 'catalog_model', 'CM-SAW-DO3', 'saw', NULL, NULL
  );
  PERFORM public.set_service_routine_applicability(
    v_routine, 'catalog_model', 'CM-SAW-DO3B', 'saw', NULL, NULL
  );
  PERFORM public.submit_service_routine_for_review(v_draft, NULL);
  PERFORM pg_temp.do3_as(support1);
  PERFORM public.record_service_routine_review(v_draft, 'ok', NULL);
  PERFORM pg_temp.do3_as(admin1);
  PERFORM public.publish_service_routine_version(v_draft, NULL);
  SELECT id INTO v_ver FROM public.service_routine_versions
  WHERE routine_id = v_routine AND status = 'published' ORDER BY version_ordinal LIMIT 1;

  -- Active coverage: first_planned 2026-02-15 → overdue; Mar 15 due; Apr 15 upcoming
  v_created := public.create_machine_coverage(
    v_mach, v_ver,
    DATE '2026-01-01', DATE '2026-02-15',
    1, 'months', NULL, NULL
  );
  v_cov := (v_created->>'coverage_id')::uuid;

  v_created := public.create_machine_coverage(
    v_mach2, v_ver,
    DATE '2026-01-01', DATE '2026-03-20',
    1, 'months', NULL, NULL
  );
  v_cov_paused := (v_created->>'coverage_id')::uuid;
  PERFORM public.pause_machine_coverage(v_cov_paused, NULL);

  PERFORM pg_temp.do3_as(cust1);
  v_ws := public.get_customer_daily_ops_workspace(v_as_of, NULL);
  SELECT
    count(*) FILTER (WHERE i->>'bucket' = 'upcoming'),
    count(*) FILTER (WHERE i->>'bucket' = 'due'),
    count(*) FILTER (WHERE i->>'bucket' = 'overdue'),
    count(*) FILTER (WHERE i->>'coverage_status' = 'paused')
  INTO v_up_count, v_due_count, v_over_count, v_paused_count
  FROM jsonb_array_elements(v_ws->'upcoming_service'->'items') i;

  PERFORM pg_temp.do3_note('DO3-09',
    (v_ws->'upcoming_service'->>'count')::int =
      jsonb_array_length(v_ws->'upcoming_service'->'items')
    AND (v_ws->'upcoming_service'->>'count')::int = v_up_count + v_due_count
    AND v_over_count = 0
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'upcoming_service'->'items') i
      WHERE i->>'bucket' = 'overdue'
    ),
    format('count=%s up=%s due=%s over_in_chip=%s',
      v_ws->'upcoming_service'->>'count', v_up_count, v_due_count, v_over_count));

  PERFORM pg_temp.do3_note('DO3-09b',
    v_paused_count > 0
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(
        public.list_machine_coverage_schedule(v_as_of, NULL, NULL, cust1, NULL, NULL, NULL)->'items'
      ) i
      WHERE i->>'coverage_id' = v_cov_paused::text
        AND i->>'coverage_status' = 'paused'
        AND i->>'bucket' IN ('upcoming', 'due')
    ),
    format('paused_in_chip=%s', v_paused_count));

  -- If paused rows classify as upcoming/due they must be in the chip
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(
      public.list_machine_coverage_schedule(v_as_of, NULL, NULL, cust1, NULL, NULL, NULL)->'items'
    ) i
    WHERE i->>'coverage_id' = v_cov_paused::text
      AND i->>'bucket' IN ('upcoming', 'due')
  ) THEN
    PERFORM pg_temp.do3_note('DO3-09b-assert',
      EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_ws->'upcoming_service'->'items') i
        WHERE i->>'coverage_id' = v_cov_paused::text
          AND i->>'coverage_status' = 'paused'
      ),
      'paused upcoming/due must remain in chip');
  ELSE
    PERFORM pg_temp.do3_note('DO3-09b-assert', true, 'paused rows not in upcoming/due window — N/A pass');
  END IF;

  -- DO3-12 / DO3-13: navigation is read-only (no audit growth from workspace view)
  SELECT count(*) INTO v_audit_before FROM public.service_workflow_audit;
  PERFORM pg_temp.do3_as(cust1);
  v_ws := public.get_customer_daily_ops_workspace(v_as_of, NULL);
  v_focus := public.resolve_customer_ticket_focus(v_t, NULL, v_rev2, 'issued');
  SELECT count(*) INTO v_audit_after FROM public.service_workflow_audit;
  PERFORM pg_temp.do3_note('DO3-13',
    v_audit_after = v_audit_before
    AND (v_ws->>'as_of') IS NOT NULL
    AND (v_focus->>'focused')::boolean = true,
    format('audit %s→%s', v_audit_before, v_audit_after));

  -- Count-to-destination agreement for issued/awaiting
  PERFORM pg_temp.do3_note('DO3-count-dest',
    (v_ws->'issued_reports'->>'count')::int = jsonb_array_length(v_ws->'issued_reports'->'items')
    AND (v_ws->'awaiting_acknowledgment'->>'count')::int =
      jsonb_array_length(v_ws->'awaiting_acknowledgment'->'items')
    AND (v_ws->'active_tickets'->>'count')::int = jsonb_array_length(v_ws->'active_tickets'->'items')
    AND (v_ws->'upcoming_service'->>'count')::int = jsonb_array_length(v_ws->'upcoming_service'->'items'),
    'count equals items length');
END;
$$;

SELECT check_id || ' | ' || status || ' | ' || detail AS result
FROM do3_results
ORDER BY check_id;
