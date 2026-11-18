-- Cursor evidence: coverage/recurrence disposable battery CR-01..CR-16.
-- Not Spark / not browser / not staging.
CREATE TEMP TABLE cr_results (
  check_id text PRIMARY KEY,
  status text NOT NULL,
  detail text NOT NULL DEFAULT ''
);

CREATE OR REPLACE FUNCTION pg_temp.cr_note(p_id text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO cr_results(check_id, status, detail)
  VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, COALESCE(p_detail, ''))
  ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.cr_as(p_uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('app.b1_uid', p_uid::text, true);
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.cr_failinfo(
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

-- Extra customer for isolation
INSERT INTO auth.users (id) VALUES ('dddddddd-dddd-dddd-dddd-ddddddddddd2')
ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role) VALUES ('dddddddd-dddd-dddd-dddd-ddddddddddd2', 'customer')
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  admin1 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  support1 uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
  tech1 uuid := 'cccccccc-cccc-cccc-cccc-ccccccccccc1';
  cust1 uuid := 'dddddddd-dddd-dddd-dddd-ddddddddddd1';
  cust2 uuid := 'dddddddd-dddd-dddd-dddd-ddddddddddd2';
  v_payload jsonb;
  v_created jsonb;
  v_routine uuid;
  v_v1 uuid;
  v_v2 uuid;
  v_draft uuid;
  v_mach uuid;
  v_mach_bad uuid;
  v_mach2 uuid;
  v_cov uuid;
  v_cov2 uuid;
  v_cov_end uuid;
  v_gen jsonb;
  v_sched jsonb;
  v_adopt jsonb;
  v_cad jsonb;
  v_get jsonb;
  v_fail boolean;
  v_state text;
  v_detail text;
  v_msg text;
  v_count int;
  v_count2 int;
  v_occ_due date;
  v_occ_ver uuid;
  v_job uuid;
  v_ticket uuid;
  v_pin jsonb;
  v_seq int;
  v_d1 date;
  v_d2 date;
  v_d3 date;
  v_items jsonb;
  v_as_of date := DATE '2026-03-15';
  v_audit_before bigint;
  v_audit_after bigint;
  v_gen_due date;
  v_gen_pin uuid;
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

  INSERT INTO public.machines (id, name, model, brand, catalog_model_id, catalog_link_status, owner_id)
  VALUES (gen_random_uuid(), 'Saw A', 'saw', 'Acme', 'CM-SAW-1', 'linked', cust1)
  RETURNING id INTO v_mach;

  INSERT INTO public.machines (id, name, model, brand, catalog_model_id, catalog_link_status, owner_id)
  VALUES (gen_random_uuid(), 'Press B', 'press', 'Other', 'CM-PRESS-1', 'linked', cust1)
  RETURNING id INTO v_mach_bad;

  INSERT INTO public.machines (id, name, model, brand, catalog_model_id, catalog_link_status, owner_id)
  VALUES (gen_random_uuid(), 'Saw Cust2', 'saw', 'Acme', 'CM-SAW-1', 'linked', cust2)
  RETURNING id INTO v_mach2;

  PERFORM pg_temp.cr_as(admin1);
  v_created := public.create_service_routine_draft(
    'CR-COV-1', 'Coverage Routine', '', '', v_payload, ARRAY['saw'], NULL
  );
  v_routine := (v_created->>'routine_id')::uuid;
  v_draft := (v_created->>'version_id')::uuid;
  PERFORM public.set_service_routine_applicability(v_routine, 'family', 'saw', NULL, NULL, NULL);
  PERFORM public.set_service_routine_applicability(
    v_routine, 'catalog_model', 'CM-SAW-1', 'saw', NULL, NULL
  );
  PERFORM public.submit_service_routine_for_review(v_draft, NULL);
  PERFORM pg_temp.cr_as(support1);
  PERFORM public.record_service_routine_review(v_draft, 'ok', NULL);
  PERFORM pg_temp.cr_as(admin1);
  PERFORM public.publish_service_routine_version(v_draft, NULL);
  SELECT id INTO v_v1 FROM public.service_routine_versions
  WHERE routine_id = v_routine AND status = 'published' ORDER BY version_ordinal LIMIT 1;

  -- ---- CR-01 create coverage ----
  v_created := public.create_machine_coverage(
    v_mach, v_v1,
    DATE '2026-01-01', DATE '2026-01-31',
    1, 'months', NULL, NULL
  );
  v_cov := (v_created->>'coverage_id')::uuid;
  PERFORM pg_temp.cr_note('CR-01',
    (v_created->>'status') = 'active'
    AND (v_created->>'routine_version_id')::uuid = v_v1
    AND (v_created->>'first_planned_due_date')::date = DATE '2026-01-31'
    AND (v_created->>'schedule_anchor_day')::int = 31,
    coalesce(v_created::text, 'null')
  );

  -- ---- CR-02 family inapplicable + tech/customer manage deny ----
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.cr_failinfo(format(
    $q$SELECT public.create_machine_coverage(%L::uuid, %L::uuid, DATE '2026-01-01', DATE '2026-01-31', 1, 'months', NULL, NULL)$q$,
    v_mach_bad, v_v1
  ));
  PERFORM pg_temp.cr_note('CR-02a',
    v_fail AND v_detail = 'coverage_applicability_denied',
    coalesce(v_detail, v_msg)
  );

  PERFORM pg_temp.cr_as(tech1);
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.cr_failinfo(format(
    $q$SELECT public.create_machine_coverage(%L::uuid, %L::uuid, DATE '2026-01-01', DATE '2026-01-31', 1, 'months', NULL, NULL)$q$,
    v_mach, v_v1
  ));
  PERFORM pg_temp.cr_note('CR-02b-tech',
    v_fail AND v_detail = 'coverage_authz_denied',
    coalesce(v_detail, v_msg)
  );

  PERFORM pg_temp.cr_as(cust1);
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.cr_failinfo(format(
    $q$SELECT public.pause_machine_coverage(%L::uuid, NULL)$q$, v_cov
  ));
  PERFORM pg_temp.cr_note('CR-02c-cust',
    v_fail AND v_detail = 'coverage_authz_denied',
    coalesce(v_detail, v_msg)
  );

  -- ---- CR-03 atomic first generation ----
  PERFORM pg_temp.cr_as(admin1);
  SELECT count(*) INTO v_audit_before FROM public.service_workflow_audit
  WHERE action = 'coverage_occurrence_generated';
  v_gen := public.generate_machine_coverage_occurrences(v_as_of, v_cov, NULL);
  SELECT count(*) INTO v_audit_after FROM public.service_workflow_audit
  WHERE action = 'coverage_occurrence_generated';
  SELECT o.planned_due_date, o.job_id, o.ticket_id, o.routine_version_id
    INTO v_occ_due, v_job, v_ticket, v_occ_ver
  FROM public.service_maintenance_occurrences o
  WHERE o.coverage_id = v_cov AND o.sequence = 1;
  v_pin := public.get_service_job_routine_pin(v_job, NULL);
  PERFORM pg_temp.cr_note('CR-03',
    (v_gen->>'created')::int >= 1
    AND v_occ_due = DATE '2026-01-31'
    AND v_occ_ver = v_v1
    AND (v_pin->'active'->>'routine_version_id')::uuid = v_v1
    AND v_audit_after = v_audit_before + (v_gen->>'created')::int,
    coalesce(v_gen::text, 'null')
  );

  -- ---- CR-04 double run + uniqueness ----
  v_gen := public.generate_machine_coverage_occurrences(v_as_of, v_cov, NULL);
  SELECT count(*) INTO v_count FROM public.service_maintenance_occurrences WHERE coverage_id = v_cov;
  SELECT count(*) INTO v_count2 FROM public.service_jobs j
  JOIN public.service_maintenance_occurrences o ON o.job_id = j.id
  WHERE o.coverage_id = v_cov;
  PERFORM pg_temp.cr_note('CR-04',
    (v_gen->>'created')::int = 0
    AND v_count = v_count2
    AND v_count >= 1,
    format('created=%s occ=%s jobs=%s', v_gen->>'created', v_count, v_count2)
  );

  -- ---- CR-05 schedule buckets Cairo as_of ----
  v_sched := public.list_machine_coverage_schedule(v_as_of, v_mach, v_cov, NULL);
  v_items := v_sched->'items';
  PERFORM pg_temp.cr_note('CR-05',
    (v_sched->>'as_of')::date = v_as_of
    AND jsonb_array_length(v_items) > 0
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_items) e
      WHERE (e->>'sequence')::int = 1 AND e->>'bucket' = 'overdue'
    )
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_items) e
      WHERE (e->>'planned_due_date')::date > v_as_of AND e->>'bucket' = 'upcoming'
    ),
    coalesce(v_sched::text, 'null')
  );

  -- ---- CR-06 pause / resume backfill ----
  PERFORM public.pause_machine_coverage(v_cov, NULL);
  SELECT count(*) INTO v_count FROM public.service_maintenance_occurrences WHERE coverage_id = v_cov;
  v_gen := public.generate_machine_coverage_occurrences(v_as_of, v_cov, NULL);
  SELECT count(*) INTO v_count2 FROM public.service_maintenance_occurrences WHERE coverage_id = v_cov;
  PERFORM pg_temp.cr_note('CR-06a',
    (v_gen->>'created')::int = 0 AND v_count = v_count2,
    format('paused created=%s', v_gen->>'created')
  );
  PERFORM public.resume_machine_coverage(v_cov, NULL);
  -- Narrow window: create a fresh coverage paused through overdue then resume
  v_created := public.create_machine_coverage(
    v_mach, v_v1,
    DATE '2026-02-01', DATE '2026-02-28',
    1, 'months', DATE '2026-04-30', NULL
  );
  v_cov2 := (v_created->>'coverage_id')::uuid;
  PERFORM public.pause_machine_coverage(v_cov2, NULL);
  v_gen := public.generate_machine_coverage_occurrences(DATE '2026-03-15', v_cov2, NULL);
  SELECT count(*) INTO v_count FROM public.service_maintenance_occurrences WHERE coverage_id = v_cov2;
  PERFORM public.resume_machine_coverage(v_cov2, NULL);
  v_gen := public.generate_machine_coverage_occurrences(DATE '2026-03-15', v_cov2, NULL);
  SELECT count(*) INTO v_count2 FROM public.service_maintenance_occurrences WHERE coverage_id = v_cov2;
  SELECT sequence INTO v_seq FROM public.service_maintenance_occurrences
  WHERE coverage_id = v_cov2 ORDER BY sequence LIMIT 1;
  PERFORM pg_temp.cr_note('CR-06b',
    v_count = 0 AND v_count2 >= 1 AND v_seq = 1 AND (v_gen->>'created')::int >= 1,
    format('before=%s after=%s created=%s', v_count, v_count2, v_gen->>'created')
  );

  -- ---- CR-07 end terminal ----
  v_created := public.create_machine_coverage(
    v_mach, v_v1,
    DATE '2026-01-01', DATE '2026-01-15',
    30, 'days', DATE '2026-02-01', NULL
  );
  v_cov_end := (v_created->>'coverage_id')::uuid;
  v_gen := public.generate_machine_coverage_occurrences(DATE '2026-01-20', v_cov_end, NULL);
  SELECT count(*) INTO v_count FROM public.service_maintenance_occurrences WHERE coverage_id = v_cov_end;
  PERFORM public.end_machine_coverage(v_cov_end, NULL);
  v_gen := public.generate_machine_coverage_occurrences(DATE '2026-01-20', v_cov_end, NULL);
  SELECT count(*) INTO v_count2 FROM public.service_maintenance_occurrences WHERE coverage_id = v_cov_end;
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.cr_failinfo(format(
    $q$SELECT public.resume_machine_coverage(%L::uuid, NULL)$q$, v_cov_end
  ));
  PERFORM pg_temp.cr_note('CR-07',
    v_count >= 1 AND v_count = v_count2 AND (v_gen->>'created')::int = 0
    AND v_fail AND v_detail = 'coverage_terminal',
    coalesce(v_detail, v_msg)
  );

  -- ---- CR-08 inclusive end + horizon ----
  v_created := public.create_machine_coverage(
    v_mach, v_v1,
    DATE '2026-01-01', DATE '2026-01-10',
    10, 'days', DATE '2026-01-20', NULL
  );
  v_cov2 := (v_created->>'coverage_id')::uuid;
  v_gen := public.generate_machine_coverage_occurrences(DATE '2026-01-15', v_cov2, NULL);
  -- dues: 10, 20 (end inclusive); 30 beyond end excluded. Past-due 10 generates as overdue.
  SELECT count(*) INTO v_count FROM public.service_maintenance_occurrences WHERE coverage_id = v_cov2;
  SELECT count(*) INTO v_count2 FROM public.service_maintenance_occurrences
  WHERE coverage_id = v_cov2 AND planned_due_date = DATE '2026-01-20';
  PERFORM pg_temp.cr_note('CR-08',
    v_count = 2 AND v_count2 = 1,
    format('occ=%s end_due=%s gen=%s', v_count, v_count2, v_gen->>'created')
  );

  -- ---- CR-09 monthly clamp leap + non-leap ----
  v_d1 := admin_private.add_coverage_cadence(DATE '2024-01-31', 0, 1, 'months', 31);
  v_d2 := admin_private.add_coverage_cadence(DATE '2024-01-31', 1, 1, 'months', 31);
  v_d3 := admin_private.add_coverage_cadence(DATE '2024-01-31', 2, 1, 'months', 31);
  PERFORM pg_temp.cr_note('CR-09a-leap',
    v_d1 = DATE '2024-01-31' AND v_d2 = DATE '2024-02-29' AND v_d3 = DATE '2024-03-31',
    format('%s %s %s', v_d1, v_d2, v_d3)
  );
  v_d1 := admin_private.add_coverage_cadence(DATE '2025-01-31', 0, 1, 'months', 31);
  v_d2 := admin_private.add_coverage_cadence(DATE '2025-01-31', 1, 1, 'months', 31);
  v_d3 := admin_private.add_coverage_cadence(DATE '2025-01-31', 2, 1, 'months', 31);
  PERFORM pg_temp.cr_note('CR-09b-nonleap',
    v_d1 = DATE '2025-01-31' AND v_d2 = DATE '2025-02-28' AND v_d3 = DATE '2025-03-31',
    format('%s %s %s', v_d1, v_d2, v_d3)
  );

  -- ---- CR-10 adopt N+1 without cadence change ----
  PERFORM pg_temp.cr_as(admin1);
  v_created := public.create_next_service_routine_draft(v_routine, v_payload, NULL);
  v_draft := (v_created->>'version_id')::uuid;
  PERFORM public.submit_service_routine_for_review(v_draft, NULL);
  PERFORM pg_temp.cr_as(support1);
  PERFORM public.record_service_routine_review(v_draft, 'ok', NULL);
  PERFORM pg_temp.cr_as(admin1);
  PERFORM public.publish_service_routine_version(v_draft, NULL);
  SELECT id INTO v_v2 FROM public.service_routine_versions
  WHERE routine_id = v_routine AND status = 'published' AND id <> v_v1
  ORDER BY version_ordinal DESC LIMIT 1;

  -- Use v_cov (already has generated seq1 at V1). Adopt V2.
  SELECT o.routine_version_id, o.planned_due_date INTO v_occ_ver, v_occ_due
  FROM public.service_maintenance_occurrences o
  WHERE o.coverage_id = v_cov AND o.sequence = 1;
  v_get := public.get_machine_coverage(v_cov, NULL);
  v_adopt := public.adopt_machine_coverage_routine_version(v_cov, v_v2, NULL);
  -- Limit first generate to seq1 via inclusive end_date, then reopen window after adopt.
  v_created := public.create_machine_coverage(
    v_mach, v_v1,
    DATE '2026-06-01', DATE '2026-06-01',
    30, 'days', DATE '2026-06-01', NULL
  );
  v_cov2 := (v_created->>'coverage_id')::uuid;
  v_gen := public.generate_machine_coverage_occurrences(DATE '2026-06-01', v_cov2, NULL);
  SELECT o.job_id, o.routine_version_id INTO v_job, v_gen_pin
  FROM public.service_maintenance_occurrences o WHERE o.coverage_id = v_cov2 AND o.sequence = 1;
  v_adopt := public.adopt_machine_coverage_routine_version(v_cov2, v_v2, NULL);
  UPDATE public.service_machine_coverages
  SET end_date = DATE '2026-08-01', updated_at = now()
  WHERE id = v_cov2;
  v_gen := public.generate_machine_coverage_occurrences(DATE '2026-07-15', v_cov2, NULL);
  SELECT o.routine_version_id, o.planned_due_date INTO v_occ_ver, v_gen_due
  FROM public.service_maintenance_occurrences o WHERE o.coverage_id = v_cov2 AND o.sequence = 2;
  -- cadence unchanged by adopt; seq1 kept V1; seq2 uses V2; due still 2026-07-01
  PERFORM pg_temp.cr_note('CR-10',
    v_gen_pin = v_v1
    AND v_occ_ver = v_v2
    AND v_gen_due = DATE '2026-07-01'
    AND (SELECT cadence_interval FROM public.service_machine_coverages WHERE id = v_cov2) = 30
    AND (SELECT cadence_unit FROM public.service_machine_coverages WHERE id = v_cov2) = 'days'
    AND (SELECT routine_version_id FROM public.service_machine_coverages WHERE id = v_cov2) = v_v2
    AND (v_adopt->>'routine_version_id')::uuid = v_v2,
    format('seq1=%s seq2=%s due2=%s', v_gen_pin, v_occ_ver, v_gen_due)
  );

  -- ---- CR-11 cadence change without adopt ----
  -- Wide interval so only seq1 fits first 90d window; then tighten cadence for seq2.
  v_created := public.create_machine_coverage(
    v_mach, v_v1,
    DATE '2026-09-01', DATE '2026-09-01',
    180, 'days', NULL, NULL
  );
  v_cov2 := (v_created->>'coverage_id')::uuid;
  v_gen := public.generate_machine_coverage_occurrences(DATE '2026-09-01', v_cov2, NULL);
  SELECT o.planned_due_date, o.routine_version_id, o.job_id
    INTO v_occ_due, v_occ_ver, v_job
  FROM public.service_maintenance_occurrences o WHERE o.coverage_id = v_cov2 AND o.sequence = 1;
  v_cad := public.change_machine_coverage_cadence(v_cov2, 14, 'days', NULL, NULL);
  v_gen := public.generate_machine_coverage_occurrences(DATE '2026-09-20', v_cov2, NULL);
  SELECT o.planned_due_date, o.routine_version_id INTO v_gen_due, v_gen_pin
  FROM public.service_maintenance_occurrences o WHERE o.coverage_id = v_cov2 AND o.sequence = 2;
  -- generated seq1 unchanged; seq2 uses new 14-day cadence from first due → 2026-09-15
  PERFORM pg_temp.cr_note('CR-11',
    v_occ_due = DATE '2026-09-01'
    AND v_occ_ver = v_v1
    AND v_gen_due = DATE '2026-09-15'
    AND v_gen_pin = v_v1
    AND (v_cad->>'cadence_interval')::int = 14
    AND (v_cad->>'routine_version_id')::uuid = v_v1
    AND (SELECT count(*) FROM public.service_maintenance_occurrences WHERE coverage_id = v_cov2 AND sequence = 1) = 1,
    format('due1=%s due2=%s ver=%s created=%s', v_occ_due, v_gen_due, v_gen_pin, v_gen->>'created')
  );

  -- ---- CR-12 failure rollback ----
  v_created := public.create_machine_coverage(
    v_mach, v_v1,
    DATE '2026-10-01', DATE '2026-10-01',
    30, 'days', DATE '2026-10-01', NULL
  );
  v_cov2 := (v_created->>'coverage_id')::uuid;
  PERFORM set_config('app.coverage_force_fail', 'before_pin', true);
  v_gen := public.generate_machine_coverage_occurrences(DATE '2026-10-01', v_cov2, NULL);
  PERFORM set_config('app.coverage_force_fail', '', true);
  SELECT count(*) INTO v_count FROM public.service_maintenance_occurrences WHERE coverage_id = v_cov2;
  SELECT count(*) INTO v_count2 FROM public.service_tickets t
  WHERE t.title LIKE '%' || v_cov2::text || '%';
  -- retry succeeds once
  v_gen := public.generate_machine_coverage_occurrences(DATE '2026-10-01', v_cov2, NULL);
  SELECT count(*) INTO v_seq FROM public.service_maintenance_occurrences WHERE coverage_id = v_cov2;
  PERFORM pg_temp.cr_note('CR-12',
    v_count = 0 AND v_count2 = 0 AND v_seq = 1 AND (v_gen->>'created')::int = 1,
    format('after_fail_occ=%s orphan_tickets=%s retry=%s', v_count, v_count2, v_gen->>'created')
  );

  -- ---- CR-13 governed path (create_job + pin audits present; no direct pin table write) ----
  SELECT count(*) INTO v_count FROM public.service_workflow_audit
  WHERE action = 'create_job'
    AND entity_id IN (SELECT job_id FROM public.service_maintenance_occurrences WHERE coverage_id = v_cov2);
  SELECT count(*) INTO v_count2 FROM public.service_workflow_audit
  WHERE action = 'routine_job_pinned'
    AND (details->>'reason') = 'coverage_occurrence_generated'
    AND entity_id IN (
      SELECT p.id FROM public.service_job_routine_pins p
      JOIN public.service_maintenance_occurrences o ON o.job_id = p.job_id
      WHERE o.coverage_id = v_cov2
    );
  PERFORM pg_temp.cr_note('CR-13',
    v_count >= 1 AND v_count2 >= 1,
    format('create_job=%s pin=%s', v_count, v_count2)
  );

  -- ---- CR-14 customer isolation ----
  PERFORM pg_temp.cr_as(cust2);
  v_sched := public.list_machine_coverage_schedule(v_as_of, NULL, NULL, NULL);
  PERFORM pg_temp.cr_note('CR-14a',
    NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_sched->'items') e
      WHERE (e->>'machine_id')::uuid = v_mach
    ),
    coalesce(left(v_sched::text, 400), 'null')
  );
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.cr_failinfo(format(
    $q$SELECT public.get_machine_coverage(%L::uuid, NULL)$q$, v_cov
  ));
  PERFORM pg_temp.cr_note('CR-14b',
    v_fail AND v_detail = 'coverage_authz_denied',
    coalesce(v_detail, v_msg)
  );
  -- own machine ok for customer2 after creating coverage as admin
  PERFORM pg_temp.cr_as(admin1);
  v_created := public.create_machine_coverage(
    v_mach2, v_v1,
    DATE '2026-01-01', DATE '2026-01-31',
    1, 'months', NULL, NULL
  );
  v_cov2 := (v_created->>'coverage_id')::uuid;
  PERFORM pg_temp.cr_as(cust2);
  v_get := public.get_machine_coverage(v_cov2, NULL);
  PERFORM pg_temp.cr_note('CR-14c',
    (v_get->>'coverage_id')::uuid = v_cov2,
    coalesce(v_get::text, 'null')
  );

  -- ---- CR-15 publish N+1 without adopt; retire after generation ----
  PERFORM pg_temp.cr_as(admin1);
  v_created := public.create_machine_coverage(
    v_mach, v_v1,
    DATE '2026-11-01', DATE '2026-11-01',
    30, 'days', DATE '2026-11-01', NULL
  );
  v_cov2 := (v_created->>'coverage_id')::uuid;
  v_gen := public.generate_machine_coverage_occurrences(DATE '2026-11-01', v_cov2, NULL);
  SELECT o.job_id, o.routine_version_id INTO v_job, v_occ_ver
  FROM public.service_maintenance_occurrences o WHERE o.coverage_id = v_cov2 AND o.sequence = 1;
  -- publish another version without adopt — coverage unchanged
  v_created := public.create_next_service_routine_draft(v_routine, v_payload, NULL);
  v_draft := (v_created->>'version_id')::uuid;
  PERFORM public.submit_service_routine_for_review(v_draft, NULL);
  PERFORM pg_temp.cr_as(support1);
  PERFORM public.record_service_routine_review(v_draft, 'ok', NULL);
  PERFORM pg_temp.cr_as(admin1);
  PERFORM public.publish_service_routine_version(v_draft, NULL);
  v_get := public.get_machine_coverage(v_cov2, NULL);
  v_pin := public.get_service_job_routine_pin(v_job, NULL);
  PERFORM public.retire_service_routine_version(v_v1, NULL);
  -- existing pin still readable
  v_pin := public.get_service_job_routine_pin(v_job, NULL);
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.cr_failinfo(format(
    $q$SELECT public.create_machine_coverage(%L::uuid, %L::uuid, DATE '2026-12-01', DATE '2026-12-01', 30, 'days', NULL, NULL)$q$,
    v_mach, v_v1
  ));
  PERFORM pg_temp.cr_note('CR-15',
    (v_get->>'routine_version_id')::uuid = v_v1
    AND (v_pin->'active'->>'routine_version_id')::uuid = v_v1
    AND v_fail AND v_detail = 'coverage_version_retired',
    format('cov=%s pin=%s detail=%s', v_get->>'routine_version_id', v_pin->'active'->>'routine_version_id', v_detail)
  );

  -- ---- CR-16 assign generated job; pin present (Lane B); checklist path not invented ----
  -- Use a non-retired version coverage
  SELECT id INTO v_v2 FROM public.service_routine_versions
  WHERE routine_id = v_routine AND status = 'published' ORDER BY version_ordinal DESC LIMIT 1;
  v_created := public.create_machine_coverage(
    v_mach, v_v2,
    DATE '2026-12-01', DATE '2026-12-01',
    30, 'days', DATE '2026-12-01', NULL
  );
  v_cov2 := (v_created->>'coverage_id')::uuid;
  v_gen := public.generate_machine_coverage_occurrences(DATE '2026-12-01', v_cov2, NULL);
  SELECT o.job_id, o.ticket_id INTO v_job, v_ticket
  FROM public.service_maintenance_occurrences o WHERE o.coverage_id = v_cov2 AND o.sequence = 1;
  PERFORM public.assign_service_job(v_job, tech1, 'CR-16 assign');
  v_pin := public.get_service_job_routine_pin(v_job, NULL);
  SELECT state, assigned_technician_id INTO v_msg, v_detail
  FROM public.service_jobs WHERE id = v_job;
  -- v_msg reused poorly — re-read
  PERFORM pg_temp.cr_note('CR-16',
    (SELECT state FROM public.service_jobs WHERE id = v_job) = 'assigned'
    AND (SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_job) = tech1
    AND (v_pin->'active'->>'status') = 'active'
    AND (v_pin->'active'->>'routine_version_id')::uuid = v_v2,
    coalesce(v_pin::text, 'null')
  );

END;
$$;

SELECT check_id || ' | ' || status || ' | ' || detail AS result
FROM cr_results
ORDER BY check_id;
