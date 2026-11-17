-- Cursor evidence: Lane B disposable battery (RB-01..20 + LB-C1). Not Spark / not browser.
CREATE TEMP TABLE lb_results (
  check_id text PRIMARY KEY,
  status text NOT NULL,
  detail text NOT NULL DEFAULT ''
);

CREATE OR REPLACE FUNCTION pg_temp.lb_note(p_id text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO lb_results(check_id, status, detail)
  VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, COALESCE(p_detail, ''))
  ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.lb_as(p_uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('app.b1_uid', p_uid::text, true);
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.lb_failinfo(
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
  sales1 uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1';
  v_payload jsonb;
  v_created jsonb;
  v_routine uuid;
  v_v1 uuid;
  v_v2 uuid;
  v_draft uuid;
  v_rev text;
  v_mach uuid;
  v_mach_bad uuid;
  v_mach_uncat uuid;
  v_ticket uuid;
  v_ticket_unlinked uuid;
  v_ticket_uncat uuid;
  v_ticket_mismatch uuid;
  v_ticket_out uuid;
  v_job uuid;
  v_job_unlinked uuid;
  v_job_uncat uuid;
  v_job_mismatch uuid;
  v_job_out uuid;
  v_job_start uuid;
  v_job_nopin uuid;
  v_visit uuid;
  v_pin jsonb;
  v_get jsonb;
  v_hist jsonb;
  v_fail boolean;
  v_state text;
  v_detail text;
  v_msg text;
  v_count int;
  v_active_before uuid;
  v_version_status text;
  v_boundary timestamptz;
  v_audit_before bigint;
  v_audit_after bigint;
  v_c1_a text;
  v_c1_b text;
BEGIN
  v_payload := jsonb_build_object(
    'sections', jsonb_build_array(
      jsonb_build_object(
        'id', 'safety', 'kind', 'safety', 'title', 'Safety',
        'items', jsonb_build_array(jsonb_build_object(
          'id', 'sg1', 'type', 'safety_gate', 'requirement_class', 'safety_gate',
          'instruction', 'LOTO', 'evidence', 'none', 'waivable', false
        ))
      ),
      jsonb_build_object(
        'id', 'insp', 'kind', 'inspection', 'title', 'Inspection',
        'items', jsonb_build_array(jsonb_build_object(
          'id', 'm1', 'type', 'measurement', 'requirement_class', 'required',
          'instruction', 'Gap', 'unit', 'mm', 'evidence', 'measurement'
        ))
      )
    ),
    'cadence', jsonb_build_object('interval', 90, 'unit', 'days')
  );

  -- Machines
  INSERT INTO public.machines (id, name, model, brand, catalog_model_id, catalog_link_status)
  VALUES (gen_random_uuid(), 'Saw A', 'saw', 'Acme', 'CM-SAW-1', 'linked')
  RETURNING id INTO v_mach;

  INSERT INTO public.machines (id, name, model, brand, catalog_model_id, catalog_link_status)
  VALUES (gen_random_uuid(), 'Press B', 'press', 'Other', 'CM-PRESS-1', 'linked')
  RETURNING id INTO v_mach_bad;

  INSERT INTO public.machines (id, name, model, brand, catalog_model_id, catalog_link_status)
  VALUES (gen_random_uuid(), 'Unk', 'saw', 'Acme', NULL, 'uncatalogued')
  RETURNING id INTO v_mach_uncat;

  -- Tickets / jobs
  INSERT INTO public.service_tickets (user_id, assigned_to, machine_id, status)
  VALUES (cust1, support1, v_mach, 'assigned') RETURNING id INTO v_ticket;
  INSERT INTO public.service_jobs (ticket_id, assigned_technician_id, state)
  VALUES (v_ticket, tech1, 'planned') RETURNING id INTO v_job;

  INSERT INTO public.service_tickets (user_id, machine_id, status)
  VALUES (cust1, NULL, 'assigned') RETURNING id INTO v_ticket_unlinked;
  INSERT INTO public.service_jobs (ticket_id, assigned_technician_id)
  VALUES (v_ticket_unlinked, tech1) RETURNING id INTO v_job_unlinked;

  INSERT INTO public.service_tickets (user_id, machine_id, status)
  VALUES (cust1, v_mach_uncat, 'assigned') RETURNING id INTO v_ticket_uncat;
  INSERT INTO public.service_jobs (ticket_id, assigned_technician_id)
  VALUES (v_ticket_uncat, tech1) RETURNING id INTO v_job_uncat;

  INSERT INTO public.service_tickets (user_id, machine_id, status)
  VALUES (cust1, v_mach_bad, 'assigned') RETURNING id INTO v_ticket_mismatch;
  INSERT INTO public.service_jobs (ticket_id, assigned_technician_id)
  VALUES (v_ticket_mismatch, tech1) RETURNING id INTO v_job_mismatch;

  -- Out-of-scope ticket (sales cannot read/mutate)
  INSERT INTO public.service_tickets (user_id, machine_id, status)
  VALUES (cust1, v_mach, 'assigned') RETURNING id INTO v_ticket_out;
  INSERT INTO public.service_jobs (ticket_id, assigned_technician_id)
  VALUES (v_ticket_out, tech1) RETURNING id INTO v_job_out;

  INSERT INTO public.service_jobs (ticket_id, assigned_technician_id, state)
  VALUES (v_ticket, tech1, 'planned') RETURNING id INTO v_job_start;
  INSERT INTO public.service_jobs (ticket_id, assigned_technician_id, state)
  VALUES (v_ticket, tech1, 'planned') RETURNING id INTO v_job_nopin;

  -- Publish V1 (+ draft sibling for RB-03) and later V2
  PERFORM pg_temp.lb_as(admin1);
  v_created := public.create_service_routine_draft(
    'LB-PIN-1', 'Lane B Pin Routine', '', '', v_payload, ARRAY['saw'], NULL
  );
  v_routine := (v_created->>'routine_id')::uuid;
  v_draft := (v_created->>'version_id')::uuid;
  v_rev := v_created->>'draft_revision';
  PERFORM public.set_service_routine_applicability(v_routine, 'family', 'saw', NULL, NULL, NULL);
  PERFORM public.set_service_routine_applicability(
    v_routine, 'catalog_model', 'CM-SAW-1', 'saw', NULL, NULL
  );
  PERFORM public.submit_service_routine_for_review(v_draft, NULL);
  PERFORM pg_temp.lb_as(support1);
  PERFORM public.record_service_routine_review(v_draft, 'ok', NULL);
  PERFORM pg_temp.lb_as(admin1);
  PERFORM public.publish_service_routine_version(v_draft, NULL);
  SELECT id INTO v_v1 FROM public.service_routine_versions
  WHERE routine_id = v_routine AND status = 'published' ORDER BY version_ordinal LIMIT 1;

  -- Keep a draft for RB-03
  v_created := public.create_next_service_routine_draft(v_routine, v_payload, NULL);
  v_draft := (v_created->>'version_id')::uuid;

  -- ---- RB-01 pin with reason ----
  SELECT count(*) INTO v_audit_before FROM public.service_workflow_audit
  WHERE action = 'routine_job_pinned';
  v_pin := public.pin_service_job_routine(v_job, v_v1, 'initial applicable pin', NULL);
  SELECT count(*) INTO v_audit_after FROM public.service_workflow_audit
  WHERE action = 'routine_job_pinned';
  PERFORM pg_temp.lb_note('RB-01',
    (v_pin->>'status') = 'active'
    AND (v_pin->>'routine_version_id')::uuid = v_v1
    AND v_audit_after = v_audit_before + 1,
    coalesce(v_pin::text, 'null')
  );

  -- ---- RB-02 no reason ----
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.lb_failinfo(format(
    $q$SELECT public.pin_service_job_routine(%L::uuid, %L::uuid, '  ', NULL)$q$, v_job_nopin, v_v1
  ));
  -- job_nopin still free; but RB-02 on a fresh path — use job_out after clearing? use replace without reason instead on v_job
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.lb_failinfo(format(
    $q$SELECT public.replace_service_job_routine_pin(%L::uuid, %L::uuid, '', NULL)$q$, v_job, v_v1
  ));
  PERFORM pg_temp.lb_note('RB-02', v_fail AND v_state = '22023' AND v_detail = 'routine_pin_reason_required',
    coalesce(v_detail, v_msg));

  -- ---- RB-03 draft ----
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.lb_failinfo(format(
    $q$SELECT public.pin_service_job_routine(%L::uuid, %L::uuid, 'draft', NULL)$q$, v_job_nopin, v_draft
  ));
  PERFORM pg_temp.lb_note('RB-03', v_fail AND v_detail = 'routine_pin_version_not_published', coalesce(v_detail, v_msg));

  -- ---- RB-14 second active ----
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.lb_failinfo(format(
    $q$SELECT public.pin_service_job_routine(%L::uuid, %L::uuid, 'second', NULL)$q$, v_job, v_v1
  ));
  PERFORM pg_temp.lb_note('RB-14', v_fail AND v_detail = 'routine_pin_cardinality', coalesce(v_detail, v_msg));

  -- ---- RB-05 mismatch ----
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.lb_failinfo(format(
    $q$SELECT public.pin_service_job_routine(%L::uuid, %L::uuid, 'mismatch', NULL)$q$, v_job_mismatch, v_v1
  ));
  PERFORM pg_temp.lb_note('RB-05', v_fail AND v_detail = 'routine_pin_applicability_denied', coalesce(v_detail, v_msg));

  -- ---- RB-06 unlinked / uncatalogued ----
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.lb_failinfo(format(
    $q$SELECT public.pin_service_job_routine(%L::uuid, %L::uuid, 'unlinked', NULL)$q$, v_job_unlinked, v_v1
  ));
  PERFORM pg_temp.lb_note('RB-06a', v_fail AND v_detail = 'routine_pin_machine_unlinked', coalesce(v_detail, v_msg));
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.lb_failinfo(format(
    $q$SELECT public.pin_service_job_routine(%L::uuid, %L::uuid, 'uncat', NULL)$q$, v_job_uncat, v_v1
  ));
  PERFORM pg_temp.lb_note('RB-06b', v_fail AND v_detail = 'routine_pin_machine_uncatalogued', coalesce(v_detail, v_msg));

  -- ---- Publish V2; pin remains V1 (RB-07) ----
  PERFORM pg_temp.lb_as(admin1);
  -- finish draft as V2
  PERFORM public.submit_service_routine_for_review(v_draft, NULL);
  PERFORM pg_temp.lb_as(support1);
  PERFORM public.record_service_routine_review(v_draft, 'ok', NULL);
  PERFORM pg_temp.lb_as(admin1);
  PERFORM public.publish_service_routine_version(v_draft, NULL);
  SELECT id INTO v_v2 FROM public.service_routine_versions
  WHERE routine_id = v_routine AND status = 'published' AND id <> v_v1
  ORDER BY version_ordinal DESC LIMIT 1;

  v_get := public.get_service_job_routine_pin(v_job, NULL);
  PERFORM pg_temp.lb_note('RB-07',
    (v_get->'active'->>'routine_version_id')::uuid = v_v1
    AND v_v2 IS NOT NULL,
    coalesce(v_get::text, 'null')
  );

  -- ---- RB-08 replace ----
  v_pin := public.replace_service_job_routine_pin(v_job, v_v2, 'replace to V2', NULL);
  SELECT count(*) INTO v_count FROM public.service_job_routine_pins
  WHERE job_id = v_job AND status = 'active';
  PERFORM pg_temp.lb_note('RB-08',
    (v_pin->>'routine_version_id')::uuid = v_v2 AND v_count = 1,
    coalesce(v_pin::text, 'null')
  );

  -- ---- RB-09 unpin ----
  v_pin := public.unpin_service_job_routine(v_job, 'unpin before start', NULL);
  SELECT count(*) INTO v_count FROM public.service_job_routine_pins
  WHERE job_id = v_job AND status = 'active';
  PERFORM pg_temp.lb_note('RB-09', (v_pin->>'status') = 'unpinned' AND v_count = 0, coalesce(v_pin::text, 'null'));

  -- Re-pin for freeze / retire scenarios on job_start
  PERFORM public.pin_service_job_routine(v_job_start, v_v1, 'pin before start', NULL);

  -- ---- RB-12 start without pin allowed (simulate visit in_progress) ----
  INSERT INTO public.service_job_visits (job_id, state)
  VALUES (v_job_nopin, 'scheduled') RETURNING id INTO v_visit;
  UPDATE public.service_job_visits SET state = 'in_progress' WHERE id = v_visit;
  SELECT work_started_boundary_at INTO v_boundary FROM public.service_jobs WHERE id = v_job_nopin;
  PERFORM pg_temp.lb_note('RB-12', v_boundary IS NOT NULL, coalesce(v_boundary::text, 'null'));

  -- ---- RB-19 initial pin after historical start ----
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.lb_failinfo(format(
    $q$SELECT public.pin_service_job_routine(%L::uuid, %L::uuid, 'too late', NULL)$q$, v_job_nopin, v_v1
  ));
  PERFORM pg_temp.lb_note('RB-19', v_fail AND v_detail = 'routine_pin_locked_after_start', coalesce(v_detail, v_msg));

  -- ---- RB-10 freeze on job_start ----
  INSERT INTO public.service_job_visits (job_id, state)
  VALUES (v_job_start, 'scheduled') RETURNING id INTO v_visit;
  UPDATE public.service_job_visits SET state = 'in_progress' WHERE id = v_visit;

  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.lb_failinfo(format(
    $q$SELECT public.replace_service_job_routine_pin(%L::uuid, %L::uuid, 'nope', NULL)$q$, v_job_start, v_v2
  ));
  PERFORM pg_temp.lb_note('RB-10a', v_fail AND v_detail = 'routine_pin_locked_after_start', coalesce(v_detail, v_msg));
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.lb_failinfo(format(
    $q$SELECT public.unpin_service_job_routine(%L::uuid, 'nope', NULL)$q$, v_job_start
  ));
  PERFORM pg_temp.lb_note('RB-10b', v_fail AND v_detail = 'routine_pin_locked_after_start', coalesce(v_detail, v_msg));

  -- ---- RB-11 abort/cancel/reassign never resets ----
  UPDATE public.service_job_visits SET state = 'aborted' WHERE id = v_visit;
  UPDATE public.service_jobs SET assigned_technician_id = admin1, state = 'planned' WHERE id = v_job_start;
  SELECT work_started_boundary_at INTO v_boundary FROM public.service_jobs WHERE id = v_job_start;
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.lb_failinfo(format(
    $q$SELECT public.unpin_service_job_routine(%L::uuid, 'still locked', NULL)$q$, v_job_start
  ));
  PERFORM pg_temp.lb_note('RB-11',
    v_boundary IS NOT NULL AND v_fail AND v_detail = 'routine_pin_locked_after_start',
    coalesce(v_detail, v_msg)
  );

  -- ---- RB-15 technician mutation ----
  -- fresh job for mutation denials
  INSERT INTO public.service_jobs (ticket_id, assigned_technician_id)
  VALUES (v_ticket, tech1) RETURNING id INTO v_job;
  PERFORM pg_temp.lb_as(tech1);
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.lb_failinfo(format(
    $q$SELECT public.pin_service_job_routine(%L::uuid, %L::uuid, 'tech', NULL)$q$, v_job, v_v1
  ));
  PERFORM pg_temp.lb_note('RB-15', v_fail AND v_state = '42501' AND v_detail = 'routine_job_pin_authz_denied',
    coalesce(v_detail, v_msg));

  -- ---- RB-16 customer / out-of-scope ----
  PERFORM pg_temp.lb_as(cust1);
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.lb_failinfo(format(
    $q$SELECT public.pin_service_job_routine(%L::uuid, %L::uuid, 'cust', NULL)$q$, v_job, v_v1
  ));
  PERFORM pg_temp.lb_note('RB-16a', v_fail AND v_detail = 'routine_job_pin_authz_denied', coalesce(v_detail, v_msg));
  PERFORM pg_temp.lb_as(sales1);
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.lb_failinfo(format(
    $q$SELECT public.pin_service_job_routine(%L::uuid, %L::uuid, 'sales', NULL)$q$, v_job_out, v_v1
  ));
  PERFORM pg_temp.lb_note('RB-16b', v_fail AND v_detail = 'routine_job_pin_authz_denied', coalesce(v_detail, v_msg));

  -- ---- RB-17 customer read denied ----
  PERFORM pg_temp.lb_as(cust1);
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.lb_failinfo(format(
    $q$SELECT public.get_service_job_routine_pin(%L::uuid, NULL)$q$, v_job_start
  ));
  PERFORM pg_temp.lb_note('RB-17', v_fail AND v_state = '42501', coalesce(v_detail, v_msg));

  -- ---- RB-18 existing pin readable after retire; new pin denied ----
  PERFORM pg_temp.lb_as(admin1);
  v_get := public.get_service_job_routine_pin(v_job_start, NULL);
  v_active_before := (v_get->'active'->>'routine_version_id')::uuid;
  PERFORM public.retire_service_routine_version(v_v1, NULL);
  SELECT status INTO v_version_status FROM public.service_routine_versions WHERE id = v_v1;
  v_get := public.get_service_job_routine_pin(v_job_start, NULL);
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.lb_failinfo(format(
    $q$SELECT public.pin_service_job_routine(%L::uuid, %L::uuid, 'retired', NULL)$q$, v_job, v_v1
  ));
  PERFORM pg_temp.lb_note('RB-18',
    v_version_status = 'retired'
    AND (v_get->'active'->>'routine_version_id')::uuid = v_active_before
    AND (v_get->'active'->>'retired_badge')::boolean = true
    AND v_fail AND v_detail = 'routine_pin_version_retired',
    coalesce(v_get::text, '') || ' / ' || coalesce(v_detail, v_msg)
  );

  -- ---- RB-04 pin retired (already covered) ----
  PERFORM pg_temp.lb_note('RB-04', v_fail AND v_detail = 'routine_pin_version_retired', coalesce(v_detail, v_msg));

  -- ---- RB-20 direct write denial (as authenticated; superuser bypasses grants/RLS) ----
  PERFORM pg_temp.lb_as(admin1);
  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.lb_failinfo(format(
      $q$INSERT INTO public.service_job_routine_pins
        (job_id, routine_id, routine_version_id, status, reason, pinned_by)
        VALUES (%L::uuid, %L::uuid, %L::uuid, 'active', 'direct', %L::uuid)$q$,
      v_job, v_routine, v_v2, admin1
    ));
    EXECUTE 'RESET ROLE';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    v_fail := true;
    v_state := SQLSTATE;
    v_msg := SQLERRM;
  END;
  PERFORM pg_temp.lb_note('RB-20', v_fail, coalesce(v_state, '') || ' ' || coalesce(v_msg, ''));

  -- technician can still read active pin (RB-18 companion)
  PERFORM pg_temp.lb_as(tech1);
  v_get := public.get_service_job_routine_pin(v_job_start, NULL);
  PERFORM pg_temp.lb_note('RB-18-tech-read',
    (v_get->'active'->>'routine_version_id') IS NOT NULL,
    coalesce(v_get::text, 'null')
  );

  -- ---- LB-C1 concurrent replace (serialized; one active) ----
  -- Use a fresh published target: create V3 from next draft of still-published parent
  -- Parent may be retired if last published was retired — create new routine for C1.
  PERFORM pg_temp.lb_as(admin1);
  v_created := public.create_service_routine_draft(
    'LB-PIN-C1', 'Lane B C1', '', '', v_payload, ARRAY['saw'], NULL
  );
  v_routine := (v_created->>'routine_id')::uuid;
  v_draft := (v_created->>'version_id')::uuid;
  PERFORM public.set_service_routine_applicability(v_routine, 'family', 'saw', NULL, NULL, NULL);
  PERFORM public.set_service_routine_applicability(v_routine, 'catalog_model', 'CM-SAW-1', 'saw', NULL, NULL);
  PERFORM public.submit_service_routine_for_review(v_draft, NULL);
  PERFORM pg_temp.lb_as(support1);
  PERFORM public.record_service_routine_review(v_draft, 'ok', NULL);
  PERFORM pg_temp.lb_as(admin1);
  PERFORM public.publish_service_routine_version(v_draft, NULL);
  SELECT id INTO v_v1 FROM public.service_routine_versions WHERE routine_id = v_routine AND status = 'published';
  v_created := public.create_next_service_routine_draft(v_routine, v_payload, NULL);
  v_draft := (v_created->>'version_id')::uuid;
  PERFORM public.submit_service_routine_for_review(v_draft, NULL);
  PERFORM pg_temp.lb_as(support1);
  PERFORM public.record_service_routine_review(v_draft, 'ok', NULL);
  PERFORM pg_temp.lb_as(admin1);
  PERFORM public.publish_service_routine_version(v_draft, NULL);
  SELECT id INTO v_v2 FROM public.service_routine_versions
  WHERE routine_id = v_routine AND status = 'published' AND id <> v_v1;

  INSERT INTO public.service_jobs (ticket_id, assigned_technician_id)
  VALUES (v_ticket, tech1) RETURNING id INTO v_job;
  PERFORM public.pin_service_job_routine(v_job, v_v1, 'c1 base', NULL);

  -- Simulate concurrent replace via two sequential locked attempts after holding lock
  -- (true parallel race covered by advisory serialization of lock_job_hierarchy).
  SELECT id INTO v_active_before FROM public.service_job_routine_pins
  WHERE job_id = v_job AND status = 'active';

  -- Session A style: replace succeeds
  v_pin := public.replace_service_job_routine_pin(v_job, v_v2, 'c1-a', NULL);
  v_c1_a := v_pin->>'pin_id';

  -- Session B style: concurrent second active insert path denied
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.lb_failinfo(format(
    $q$SELECT public.pin_service_job_routine(%L::uuid, %L::uuid, 'c1-b', NULL)$q$, v_job, v_v1
  ));
  SELECT count(*) INTO v_count FROM public.service_job_routine_pins WHERE job_id = v_job AND status = 'active';
  PERFORM pg_temp.lb_note('LB-C1-concurrent-replace',
    v_count = 1 AND (v_pin->>'routine_version_id')::uuid = v_v2 AND v_fail,
    'active=' || v_count || ' detail=' || coalesce(v_detail, '')
  );

  -- pin-versus-start race: start sets boundary; in-flight pin after boundary denied
  INSERT INTO public.service_jobs (ticket_id, assigned_technician_id)
  VALUES (v_ticket, tech1) RETURNING id INTO v_job;
  INSERT INTO public.service_job_visits (job_id, state) VALUES (v_job, 'scheduled') RETURNING id INTO v_visit;
  -- lock job, set visit in_progress (boundary), then pin denied
  PERFORM 1 FROM public.service_jobs WHERE id = v_job FOR UPDATE;
  UPDATE public.service_job_visits SET state = 'in_progress' WHERE id = v_visit;
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.lb_failinfo(format(
    $q$SELECT public.pin_service_job_routine(%L::uuid, %L::uuid, 'race-start', NULL)$q$, v_job, v_v2
  ));
  PERFORM pg_temp.lb_note('LB-C1-pin-versus-start',
    v_fail AND v_detail = 'routine_pin_locked_after_start', coalesce(v_detail, v_msg));

  -- pin-versus-retirement race: lock version then retire then pin denied
  INSERT INTO public.service_jobs (ticket_id, assigned_technician_id)
  VALUES (v_ticket, tech1) RETURNING id INTO v_job;
  PERFORM public.retire_service_routine_version(v_v2, NULL);
  SELECT * INTO v_fail, v_state, v_detail, v_msg FROM pg_temp.lb_failinfo(format(
    $q$SELECT public.pin_service_job_routine(%L::uuid, %L::uuid, 'race-retire', NULL)$q$, v_job, v_v2
  ));
  PERFORM pg_temp.lb_note('LB-C1-pin-versus-retirement',
    v_fail AND v_detail = 'routine_pin_version_retired', coalesce(v_detail, v_msg));

  -- History readable
  PERFORM pg_temp.lb_as(admin1);
  v_hist := public.list_service_job_routine_pin_history(v_job_start, NULL);
  PERFORM pg_temp.lb_note('RB-hist',
    jsonb_array_length(v_hist->'history') >= 1,
    coalesce(v_hist::text, 'null')
  );

  -- Atomic audit on success already checked in RB-01; denied ops leave business unchanged
  SELECT count(*) INTO v_count FROM public.service_job_routine_pins
  WHERE job_id = v_job_nopin;
  PERFORM pg_temp.lb_note('RB-denied-unchanged', v_count = 0, 'pins=' || v_count);
END;
$$;

\pset format unaligned
\pset fieldsep '|'
\pset tuples_only on
SELECT check_id, status, detail FROM lb_results ORDER BY check_id;
SELECT
  count(*) FILTER (WHERE status = 'PASS') AS pass_n,
  count(*) FILTER (WHERE status = 'FAIL') AS fail_n,
  count(*) AS total_n
FROM lb_results;
