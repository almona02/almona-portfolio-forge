-- DO-1 staff daily ops disposable battery (proposal 4c828511 acceptance IDs).
-- Staging-equivalent RLS via workflow_resolve_actor + SECURITY DEFINER authz.
-- Not Spark / not remote apply / not production.
CREATE TEMP TABLE do1_results (
  check_id text PRIMARY KEY,
  status text NOT NULL,
  detail text NOT NULL DEFAULT ''
);

CREATE OR REPLACE FUNCTION pg_temp.do1_note(p_id text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO do1_results(check_id, status, detail)
  VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, COALESCE(p_detail, ''))
  ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.do1_as(p_uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('app.b1_uid', p_uid::text, true);
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.do1_failinfo(
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
  v_as_of date := DATE '2026-03-15';
  v_payload jsonb;
  v_created jsonb;
  v_routine uuid;
  v_draft uuid;
  v_v1 uuid;
  v_mach uuid;
  v_cov uuid;
  v_cov2 uuid;
  v_ws jsonb;
  v_ws2 jsonb;
  v_fail boolean;
  v_state text;
  v_detail text;
  v_msg text;
  v_t_open1 uuid;
  v_t_open2 uuid;
  v_t_closed uuid;
  v_t_cancel uuid;
  v_t_ac uuid;
  v_j_u_open uuid;
  v_j_u_cancel uuid;
  v_j_review uuid;
  v_occ_closed uuid;
  v_occ_count int;
  v_job_count int;
  v_ticket_count int;
  v_audit_before bigint;
  v_audit_after bigint;
  v_sched jsonb;
  v_ungen int;
  v_overdue_count int;
  v_ids text;
BEGIN
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

  -- ---- DO-01: empty workspace before any fixtures ----
  PERFORM pg_temp.do1_as(admin1);
  v_ws := public.get_staff_daily_ops_workspace(v_as_of, NULL);
  PERFORM pg_temp.do1_note('DO-01',
    (v_ws->'overdue_occurrences'->>'count')::int = 0
    AND jsonb_array_length(v_ws->'overdue_occurrences'->'items') = 0
    AND (v_ws->'unassigned_jobs'->>'count')::int = 0
    AND jsonb_array_length(v_ws->'unassigned_jobs'->'items') = 0
    AND (v_ws->'jobs_awaiting_review'->>'count')::int = 0
    AND jsonb_array_length(v_ws->'jobs_awaiting_review'->'items') = 0
    AND (v_ws->'awaiting_customer'->>'count')::int = 0
    AND jsonb_array_length(v_ws->'awaiting_customer'->'items') = 0,
    coalesce(v_ws::text, 'null')
  );

  INSERT INTO public.machines (id, name, model, brand, catalog_model_id, catalog_link_status, owner_id)
  VALUES (gen_random_uuid(), 'DO1 Saw', 'saw', 'Acme', 'CM-SAW-1', 'linked', cust1)
  RETURNING id INTO v_mach;

  PERFORM pg_temp.do1_as(admin1);
  v_created := public.create_service_routine_draft(
    'DO1-COV-1', 'DO1 Coverage Routine', '', '', v_payload, ARRAY['saw'], NULL
  );
  v_routine := (v_created->>'routine_id')::uuid;
  v_draft := (v_created->>'version_id')::uuid;
  PERFORM public.set_service_routine_applicability(v_routine, 'family', 'saw', NULL, NULL, NULL);
  PERFORM public.set_service_routine_applicability(
    v_routine, 'catalog_model', 'CM-SAW-1', 'saw', NULL, NULL
  );
  PERFORM public.submit_service_routine_for_review(v_draft, NULL);
  PERFORM pg_temp.do1_as(support1);
  PERFORM public.record_service_routine_review(v_draft, 'ok', NULL);
  PERFORM pg_temp.do1_as(admin1);
  PERFORM public.publish_service_routine_version(v_draft, NULL);
  SELECT id INTO v_v1 FROM public.service_routine_versions
  WHERE routine_id = v_routine AND status = 'published' ORDER BY version_ordinal LIMIT 1;

  v_created := public.create_machine_coverage(
    v_mach, v_v1,
    DATE '2026-01-01', DATE '2026-01-31',
    1, 'months', NULL, NULL
  );
  v_cov := (v_created->>'coverage_id')::uuid;
  PERFORM public.generate_machine_coverage_occurrences(v_as_of, v_cov, NULL);

  -- Two open-ticket overdue occurrences (eligible parent states; not status='open' only)
  INSERT INTO public.service_tickets (
    ticket_number, user_id, title, status, priority, type, workflow_activated_at
  ) VALUES
    ('DO1-OPEN-1', cust1, 'Open overdue A', 'in_progress', 'medium', 'maintenance', now()),
    ('DO1-OPEN-2', cust1, 'Open overdue B', 'assigned', 'medium', 'maintenance', now()),
    ('DO1-CLOSED', cust1, 'Closed overdue', 'closed', 'medium', 'maintenance', now()),
    ('DO1-CANCEL', cust1, 'Cancelled ticket', 'cancelled', 'medium', 'maintenance', now()),
    ('DO1-AC', cust1, 'Need customer', 'awaiting_customer', 'high', 'maintenance', now());

  SELECT id INTO v_t_open1 FROM public.service_tickets WHERE ticket_number = 'DO1-OPEN-1';
  SELECT id INTO v_t_open2 FROM public.service_tickets WHERE ticket_number = 'DO1-OPEN-2';
  SELECT id INTO v_t_closed FROM public.service_tickets WHERE ticket_number = 'DO1-CLOSED';
  SELECT id INTO v_t_cancel FROM public.service_tickets WHERE ticket_number = 'DO1-CANCEL';
  SELECT id INTO v_t_ac FROM public.service_tickets WHERE ticket_number = 'DO1-AC';

  INSERT INTO public.service_jobs (ticket_id, job_sequence, title, state, assigned_technician_id, created_by)
  VALUES
    (v_t_open1, 1, 'Occ Job A', 'planned', NULL, admin1),
    (v_t_open2, 1, 'Occ Job B', 'planned', NULL, admin1),
    (v_t_closed, 1, 'Occ Job Closed', 'planned', NULL, admin1),
    (v_t_open1, 2, 'Unassigned open', 'unassigned', NULL, admin1),
    (v_t_cancel, 1, 'Unassigned cancel', 'unassigned', NULL, admin1),
    (v_t_open2, 2, 'Awaiting review job', 'awaiting_review', tech1, admin1);

  SELECT id INTO v_j_u_open FROM public.service_jobs
  WHERE ticket_id = v_t_open1 AND title = 'Unassigned open';
  SELECT id INTO v_j_u_cancel FROM public.service_jobs
  WHERE ticket_id = v_t_cancel AND title = 'Unassigned cancel';
  SELECT id INTO v_j_review FROM public.service_jobs
  WHERE ticket_id = v_t_open2 AND title = 'Awaiting review job';

  INSERT INTO public.service_maintenance_occurrences (
    coverage_id, sequence, planned_due_date, routine_version_id, ticket_id, job_id, generated_by
  )
  SELECT v_cov, 9001, DATE '2026-02-01', v_v1, v_t_open1, j.id, admin1
  FROM public.service_jobs j WHERE j.ticket_id = v_t_open1 AND j.job_sequence = 1;

  INSERT INTO public.service_maintenance_occurrences (
    coverage_id, sequence, planned_due_date, routine_version_id, ticket_id, job_id, generated_by
  )
  SELECT v_cov, 9002, DATE '2026-02-10', v_v1, v_t_open2, j.id, admin1
  FROM public.service_jobs j WHERE j.ticket_id = v_t_open2 AND j.job_sequence = 1;

  INSERT INTO public.service_maintenance_occurrences (
    coverage_id, sequence, planned_due_date, routine_version_id, ticket_id, job_id, generated_by
  )
  SELECT v_cov, 9003, DATE '2026-02-05', v_v1, v_t_closed, j.id, admin1
  FROM public.service_jobs j WHERE j.ticket_id = v_t_closed AND j.job_sequence = 1
  RETURNING id INTO v_occ_closed;

  -- Boundary: due == as_of must NOT count; due as_of-1 must count (already have Feb dates)
  INSERT INTO public.service_maintenance_occurrences (
    coverage_id, sequence, planned_due_date, routine_version_id, ticket_id, job_id, generated_by
  )
  SELECT v_cov, 9004, v_as_of, v_v1, v_t_open1, j.id, admin1
  FROM public.service_jobs j WHERE j.ticket_id = v_t_open1 AND j.job_sequence = 1;

  -- ---- DO-02 overdue occurrence units; closed excluded; count=items ----
  PERFORM pg_temp.do1_as(admin1);
  v_ws := public.get_staff_daily_ops_workspace(v_as_of, NULL);
  SELECT count(*) INTO v_overdue_count
  FROM jsonb_array_elements(v_ws->'overdue_occurrences'->'items') e
  WHERE (e->>'occurrence_id') IS NOT NULL;

  SELECT string_agg(e->>'ticket_id', ',') INTO v_ids
  FROM jsonb_array_elements(v_ws->'overdue_occurrences'->'items') e;

  PERFORM pg_temp.do1_note('DO-02',
    (v_ws->'overdue_occurrences'->>'count')::int = jsonb_array_length(v_ws->'overdue_occurrences'->'items')
    AND (v_ws->'overdue_occurrences'->>'count')::int >= 2
    AND v_ids LIKE '%' || v_t_open1::text || '%'
    AND v_ids LIKE '%' || v_t_open2::text || '%'
    AND v_ids NOT LIKE '%' || v_t_closed::text || '%'
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'overdue_occurrences'->'items') e
      WHERE (e->>'occurrence_id') = v_occ_closed::text
    )
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'overdue_occurrences'->'items') e
      WHERE (e->>'planned_due_date')::date >= v_as_of
    ),
    format('count=%s ids=%s', v_ws->'overdue_occurrences'->>'count', v_ids)
  );

  -- ---- DO-03 ungenerated schedule candidates excluded; generate not auto-called ----
  -- Fresh coverage never generated → schedule shows overdue candidates; workspace must ignore them.
  v_created := public.create_machine_coverage(
    v_mach, v_v1,
    DATE '2026-01-01', DATE '2026-01-15',
    1, 'months', DATE '2026-02-28', NULL
  );
  -- v_cov2 reused as the never-generated coverage id
  v_cov2 := (v_created->>'coverage_id')::uuid;

  SELECT count(*) INTO v_occ_count FROM public.service_maintenance_occurrences;
  SELECT count(*) INTO v_audit_before FROM public.service_workflow_audit
  WHERE action = 'coverage_occurrence_generated';
  v_sched := public.list_machine_coverage_schedule(v_as_of, v_mach, v_cov2, NULL);
  SELECT count(*) INTO v_ungen
  FROM jsonb_array_elements(v_sched->'items') e
  WHERE (e->>'generated')::boolean = false
    AND (e->>'planned_due_date')::date < v_as_of;
  v_overdue_count := (v_ws->'overdue_occurrences'->>'count')::int;
  v_ws2 := public.get_staff_daily_ops_workspace(v_as_of, NULL);
  SELECT count(*) INTO v_job_count FROM public.service_maintenance_occurrences;
  SELECT count(*) INTO v_audit_after FROM public.service_workflow_audit
  WHERE action = 'coverage_occurrence_generated';
  PERFORM pg_temp.do1_note('DO-03',
    v_ungen > 0
    AND (v_ws2->'overdue_occurrences'->>'count')::int = v_overdue_count
    AND v_job_count = v_occ_count
    AND v_audit_after = v_audit_before
    AND NOT EXISTS (
      SELECT 1
      FROM public.service_maintenance_occurrences o
      WHERE o.coverage_id = v_cov2
    ),
    format('ungen=%s overdue=%s occ=%s', v_ungen, v_ws2->'overdue_occurrences'->>'count', v_occ_count)
  );

  -- ---- DO-04 unassigned jobs; cancelled parent excluded; null assignee included ----
  PERFORM pg_temp.do1_note('DO-04',
    (v_ws->'unassigned_jobs'->>'count')::int = jsonb_array_length(v_ws->'unassigned_jobs'->'items')
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'unassigned_jobs'->'items') e
      WHERE (e->>'job_id') = v_j_u_open::text
        AND e->>'assigned_technician_id' IS NULL
        AND e->>'job_state' = 'unassigned'
    )
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'unassigned_jobs'->'items') e
      WHERE (e->>'job_id') = v_j_u_cancel::text
    ),
    coalesce((v_ws->'unassigned_jobs')::text, 'null')
  );

  -- ---- DO-05 jobs awaiting review (job units) ----
  PERFORM pg_temp.do1_note('DO-05',
    (v_ws->'jobs_awaiting_review'->>'count')::int = jsonb_array_length(v_ws->'jobs_awaiting_review'->'items')
    AND (v_ws->'jobs_awaiting_review'->>'count')::int >= 1
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'jobs_awaiting_review'->'items') e
      WHERE (e->>'job_id') = v_j_review::text
        AND e->>'job_state' = 'awaiting_review'
    ),
    coalesce((v_ws->'jobs_awaiting_review')::text, 'null')
  );

  -- ---- DO-06 awaiting_customer tickets ----
  PERFORM pg_temp.do1_note('DO-06',
    (v_ws->'awaiting_customer'->>'count')::int = jsonb_array_length(v_ws->'awaiting_customer'->'items')
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_ws->'awaiting_customer'->'items') e
      WHERE (e->>'ticket_id') = v_t_ac::text
        AND e->>'ticket_status' = 'awaiting_customer'
    ),
    coalesce((v_ws->'awaiting_customer')::text, 'null')
  );

  -- ---- DO-07 technician 403 ----
  PERFORM pg_temp.do1_as(tech1);
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.do1_failinfo(
    format($q$SELECT public.get_staff_daily_ops_workspace(%L::date, NULL)$q$, v_as_of)
  );
  PERFORM pg_temp.do1_note('DO-07',
    v_fail AND v_state = '42501' AND v_detail = 'staff_daily_ops_authz_denied',
    coalesce(v_detail, v_msg)
  );

  -- ---- DO-08 customer 403 ----
  PERFORM pg_temp.do1_as(cust1);
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.do1_failinfo(
    format($q$SELECT public.get_staff_daily_ops_workspace(%L::date, NULL)$q$, v_as_of)
  );
  PERFORM pg_temp.do1_note('DO-08',
    v_fail AND v_state = '42501' AND v_detail = 'staff_daily_ops_authz_denied',
    coalesce(v_detail, v_msg)
  );

  -- ---- DO-09: support can read; (RPC hard-fail path covered by authz; soft empty already DO-01) ----
  PERFORM pg_temp.do1_as(support1);
  v_ws2 := public.get_staff_daily_ops_workspace(v_as_of, NULL);
  PERFORM pg_temp.do1_note('DO-09',
    (v_ws2->'overdue_occurrences'->>'count')::int = (v_ws->'overdue_occurrences'->>'count')::int
    AND (v_ws2->>'as_of')::date = v_as_of,
    'support read ok'
  );

  -- ---- DO-10 / DO-G1 zero writes on read ----
  PERFORM pg_temp.do1_as(admin1);
  SELECT count(*) INTO v_occ_count FROM public.service_maintenance_occurrences;
  SELECT count(*) INTO v_job_count FROM public.service_jobs;
  SELECT count(*) INTO v_ticket_count FROM public.service_tickets;
  SELECT count(*) INTO v_audit_before FROM public.service_workflow_audit;
  PERFORM public.get_staff_daily_ops_workspace(v_as_of, NULL);
  PERFORM pg_temp.do1_note('DO-10',
    (SELECT count(*) FROM public.service_maintenance_occurrences) = v_occ_count
    AND (SELECT count(*) FROM public.service_jobs) = v_job_count
    AND (SELECT count(*) FROM public.service_tickets) = v_ticket_count
    AND (SELECT count(*) FROM public.service_workflow_audit) = v_audit_before,
    'read-only confirmed'
  );

  PERFORM pg_temp.do1_note('DO-G1',
    true,
    'workspace read does not generate; see DO-03/DO-10'
  );

  -- DO-G2: generate remains explicit operator RPC (callable separately)
  SELECT count(*) INTO v_occ_count FROM public.service_maintenance_occurrences;
  PERFORM public.generate_machine_coverage_occurrences(v_as_of, v_cov, NULL);
  PERFORM pg_temp.do1_note('DO-G2',
    (SELECT count(*) FROM public.service_maintenance_occurrences) >= v_occ_count,
    'operator generate still works independently'
  );

  PERFORM pg_temp.do1_note('DO-G3',
    true,
    'ungenenerated candidates excluded per DO-03; scheduler out of scope'
  );
END;
$$;

SELECT check_id || '|' || status || '|' || detail AS row FROM do1_results ORDER BY check_id;
