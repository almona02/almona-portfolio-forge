-- B2 disposable battery (assignment). Requires B1 objects + B2 migration.
-- Appended after B1 battery by run_disposable_b1.py when B2 migration present.

-- B2-S1 idempotent Job 1
DO $$
DECLARE v_t uuid; v_a uuid; v_b uuid; n int;
BEGIN
  IF NOT b1_has_func('ensure_default_service_job') THEN
    INSERT INTO b1_eval VALUES ('B2S1', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B2-S1');
  SELECT (public.ensure_default_service_job(v_t, b1_uid('tech1'), 'Job 1', 's1', NULL)).id INTO v_a;
  SELECT (public.ensure_default_service_job(v_t, b1_uid('tech1'), 'Job 1', 's1-again', NULL)).id INTO v_b;
  SELECT count(*) INTO n FROM public.service_jobs WHERE ticket_id = v_t;
  PERFORM b1_note('B2S1', v_a = v_b AND n = 1
    AND (SELECT job_sequence FROM public.service_jobs WHERE id = v_a) = 1,
    'one Job 1');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('B2S1', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('B2S1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- B2-S2 additional jobs independent
DO $$
DECLARE v_t uuid; v_1 uuid; v_2 uuid;
BEGIN
  IF NOT (b1_has_func('ensure_default_service_job') AND b1_has_func('create_service_job')
      AND b1_has_func('assign_service_job')) THEN
    INSERT INTO b1_eval VALUES ('B2S2', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B2-S2');
  SELECT (public.ensure_default_service_job(v_t, b1_uid('tech1'), 'Job 1', 's2', NULL)).id INTO v_1;
  SELECT (public.create_service_job(v_t, 'Job 2', true, 's2')).id INTO v_2;
  PERFORM public.assign_service_job(v_2, b1_uid('tech2'), 's2', NULL);
  PERFORM b1_note('B2S2', v_1 <> v_2
    AND (SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_1) = b1_uid('tech1')
    AND (SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_2) = b1_uid('tech2'),
    'jobs independent');
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('B2S2', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- B2-A1 unauthorized + forged actor denied
DO $$
DECLARE v_t uuid; v_j uuid; v_cust boolean := false; v_forge boolean := false;
BEGIN
  IF NOT b1_has_func('assign_service_job') THEN
    INSERT INTO b1_eval VALUES ('B2A1', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B2-A1');
  SELECT (public.ensure_default_service_job(v_t, NULL, 'Job 1', 'a1', NULL)).id INTO v_j;
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  BEGIN
    PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'nope', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_cust := true;
  END;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  BEGIN
    PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'forge', b1_uid('admin'));
  EXCEPTION WHEN SQLSTATE '42501' THEN v_forge := true;
  END;
  PERFORM b1_note('B2A1', v_cust AND v_forge, 'authz denials');
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('B2A1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- B2-D1 decline own job; ticket assignee preserved; history kept
DO $$
DECLARE v_t uuid; v_j uuid; v_ticket_assignee uuid; n_hist int; v_state text;
BEGIN
  IF NOT b1_has_func('decline_service_job') THEN
    INSERT INTO b1_eval VALUES ('B2D1', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B2-D1');
  PERFORM public.govern_ticket_assign(v_t, b1_uid('tech2'), 'case contact', NULL);
  SELECT assigned_to INTO v_ticket_assignee FROM public.service_tickets WHERE id = v_t;
  SELECT (public.ensure_default_service_job(v_t, b1_uid('tech1'), 'Job 1', 'd1', NULL)).id INTO v_j;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM public.decline_service_job(v_j, 'cannot attend', NULL);
  SELECT state INTO v_state FROM public.service_jobs WHERE id = v_j;
  SELECT count(*) INTO n_hist FROM public.service_job_assignment_history WHERE job_id = v_j AND action = 'decline';
  PERFORM b1_note('B2D1', v_state = 'unassigned' AND n_hist = 1
    AND (SELECT assigned_to FROM public.service_tickets WHERE id = v_t) = v_ticket_assignee
    AND (SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_j) IS NULL,
    'decline scoped; ticket preserved');
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('B2D1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- B2-D2 other tech cannot decline
DO $$
DECLARE v_t uuid; v_j uuid; v_denied boolean := false;
BEGIN
  IF NOT b1_has_func('decline_service_job') THEN
    INSERT INTO b1_eval VALUES ('B2D2', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B2-D2');
  SELECT (public.ensure_default_service_job(v_t, b1_uid('tech1'), 'Job 1', 'd2', NULL)).id INTO v_j;
  PERFORM set_config('app.b1_uid', b1_uid('tech2')::text, false);
  BEGIN
    PERFORM public.decline_service_job(v_j, 'not mine', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_denied := true;
  END;
  PERFORM b1_note('B2D2', v_denied
    AND (SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_j) = b1_uid('tech1'),
    'cross-tech decline denied');
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('B2D2', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- B2-R1 reassignment history + active visit reject
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_denied boolean := false; n_hist int;
BEGIN
  IF NOT b1_has_func('assign_service_job') THEN
    INSERT INTO b1_eval VALUES ('B2R1', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B2-R1');
  SELECT (public.ensure_default_service_job(v_t, b1_uid('tech1'), 'Job 1', 'r1', NULL)).id INTO v_j;
  PERFORM public.assign_service_job(v_j, b1_uid('tech2'), 'reassign', NULL);
  SELECT count(*) INTO n_hist FROM public.service_job_assignment_history
   WHERE job_id = v_j AND action = 'reassign'
     AND from_technician_id = b1_uid('tech1') AND to_technician_id = b1_uid('tech2');
  SELECT (public.create_service_job_visit(v_j, 'r1', NULL)).id INTO v_v;
  PERFORM public.govern_visit_transition(v_v, 'in_progress', 'r1', NULL);
  BEGIN
    PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'during visit', NULL);
  EXCEPTION WHEN check_violation THEN v_denied := true;
  END;
  PERFORM b1_note('B2R1', n_hist = 1 AND v_denied
    AND (SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_j) = b1_uid('tech2'),
    'history + active-visit guard');
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('B2R1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- B2-T1 ticket reassignment does not silently reassign jobs
DO $$
DECLARE v_t uuid; v_j uuid; v_job_tech uuid;
BEGIN
  IF NOT b1_has_func('ensure_default_service_job') THEN
    INSERT INTO b1_eval VALUES ('B2T1', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B2-T1');
  SELECT (public.ensure_default_service_job(v_t, b1_uid('tech1'), 'Job 1', 't1', NULL)).id INTO v_j;
  SELECT assigned_technician_id INTO v_job_tech FROM public.service_jobs WHERE id = v_j;
  PERFORM public.govern_ticket_assign(v_t, b1_uid('tech2'), 'new case contact', NULL);
  PERFORM b1_note('B2T1',
    (SELECT assigned_to FROM public.service_tickets WHERE id = v_t) = b1_uid('tech2')
    AND (SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_j) = v_job_tech
    AND v_job_tech = b1_uid('tech1'),
    'ticket assign leaves job tech');
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('B2T1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- B2-L1 legacy jobless: ticket assign does not create jobs / activate
DO $$
DECLARE v_t uuid; n int; v_at timestamptz;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B2-L1');
  PERFORM public.govern_ticket_assign(v_t, b1_uid('tech1'), 'legacy', NULL);
  SELECT count(*) INTO n FROM public.service_jobs WHERE ticket_id = v_t;
  SELECT workflow_activated_at INTO v_at FROM public.service_tickets WHERE id = v_t;
  PERFORM b1_note('B2L1', n = 0 AND v_at IS NULL, 'no blanket activation');
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('B2L1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- B2-A2 assignment + audit atomic rollback (forced failure after assign attempt via bad tech)
DO $$
DECLARE v_t uuid; v_j uuid; n0 int; n1 int; a0 int; a1 int; v_denied boolean := false;
BEGIN
  IF NOT b1_has_func('assign_service_job') THEN
    INSERT INTO b1_eval VALUES ('B2A2', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B2-A2');
  SELECT (public.ensure_default_service_job(v_t, NULL, 'Job 1', 'a2', NULL)).id INTO v_j;
  SELECT count(*) INTO n0 FROM public.service_job_assignment_history WHERE job_id = v_j;
  a0 := b1_audit_n(v_t);
  BEGIN
    PERFORM public.assign_service_job(v_j, b1_uid('cust1'), 'bad role', NULL);
  EXCEPTION WHEN OTHERS THEN
    v_denied := true;
  END;
  SELECT count(*) INTO n1 FROM public.service_job_assignment_history WHERE job_id = v_j;
  a1 := b1_audit_n(v_t);
  PERFORM b1_note('B2A2', v_denied AND n0 = n1 AND a0 = a1
    AND (SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_j) IS NULL,
    'failed assign leaves no history/audit');
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('B2A2', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;
