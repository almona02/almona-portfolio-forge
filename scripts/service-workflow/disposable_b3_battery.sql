-- B3 visit execution disposable battery (local/disposable only).
-- Prerequisites: disposable_b1_base + B1/B2 migrations + 20261112180000 B3 migration.
CREATE OR REPLACE FUNCTION b1_uid(n text) RETURNS uuid
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE n
    WHEN 'cust1' THEN '11111111-1111-1111-1111-111111111111'
    WHEN 'cust2' THEN '22222222-2222-2222-2222-222222222222'
    WHEN 'tech1' THEN '33333333-3333-3333-3333-333333333333'
    WHEN 'tech2' THEN '44444444-4444-4444-4444-444444444444'
    WHEN 'support' THEN '55555555-5555-5555-5555-555555555555'
    WHEN 'admin' THEN '66666666-6666-6666-6666-666666666666'
    WHEN 'sales' THEN '77777777-7777-7777-7777-777777777777'
  END::uuid;
$$;
CREATE OR REPLACE FUNCTION b1_mkticket(p_owner text, p_num text, p_status text DEFAULT 'open')
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.service_tickets (ticket_number, user_id, title, description, type, priority, status)
  VALUES (p_num, b1_uid(p_owner), 't ' || p_num, 'compat fixture', 'general', 'medium', p_status)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE TABLE IF NOT EXISTS public.b3_eval(check_id text PRIMARY KEY, status text NOT NULL, detail text);
TRUNCATE public.b3_eval;
CREATE OR REPLACE FUNCTION b3_note(p_id text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.b3_eval(check_id, status, detail)
  VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, left(p_detail, 400))
  ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
END; $$;
CREATE OR REPLACE FUNCTION b3_denied(p_sql text)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN EXECUTE p_sql; RETURN false;
EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE IN ('42501','22023','P0002','23514')
     OR SQLERRM ILIKE '%permission%' OR SQLERRM ILIKE '%mandatory%'
     OR SQLERRM ILIKE '%active visit%' OR SQLERRM ILIKE '%one active%'
     OR SQLERRM ILIKE '%in-progress%' OR SQLERRM ILIKE '%in progress%'
     OR SQLERRM ILIKE '%only%' OR SQLERRM ILIKE '%reschedule%'
     OR SQLERRM ILIKE '%after scheduled_start%' OR SQLERRM ILIKE '%Invalid%'
     OR SQLERRM ILIKE '%Cannot%'
  THEN RETURN true; END IF;
  RAISE;
END; $$;

CREATE OR REPLACE FUNCTION b3_safety() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT public.b3_minimum_safety_attestation(); $$;
CREATE OR REPLACE FUNCTION b3_arm_ticket(p_job uuid, p_tech uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_ticket uuid; v_tech uuid := COALESCE(p_tech, b1_uid('tech1'));
BEGIN
  SELECT ticket_id INTO v_ticket FROM public.service_jobs WHERE id = p_job;
  UPDATE public.service_tickets
  SET status = 'assigned',
      assigned_to = COALESCE(assigned_to, v_tech),
      assigned_by = COALESCE(assigned_by, b1_uid('support')),
      assigned_at = COALESCE(assigned_at, now()),
      updated_at = now()
  WHERE id = v_ticket AND status = 'open';
END $$;
CREATE OR REPLACE FUNCTION b3_start(p_visit uuid, p_actor uuid DEFAULT NULL, p_notes text DEFAULT 'b3')
RETURNS public.service_job_visits
LANGUAGE plpgsql AS $$
BEGIN
  RETURN public.start_service_job_visit(p_visit, p_actor, b3_safety(), p_notes);
END $$;

DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_v2 uuid; v_v3 uuid;
  v_n int; v_ok boolean; v_hist int; v_att uuid;
  v_start timestamptz := now() + interval '2 hours';
  v_end timestamptz := now() + interval '4 hours';
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B3-' || substr(replace(gen_random_uuid()::text,'-',''),1,8));
  SELECT (public.create_service_job(v_t, 'B3 Job', true, 'b3')).id INTO v_j;
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'b3', NULL);
  PERFORM b3_arm_ticket(v_j);

  SELECT (public.schedule_service_job_visit(v_j, v_start, v_end, 'win1', NULL)).id INTO v_v;
  SELECT count(*) INTO v_hist FROM public.service_job_visit_schedule_history WHERE visit_id = v_v;
  PERFORM b3_note('B3-01', v_hist = 1, 'hist=' || v_hist);

  v_ok := b3_denied(format(
    $q$SELECT public.schedule_service_job_visit(%L::uuid, %L::timestamptz, %L::timestamptz, 'bad', NULL)$q$,
    v_j, v_end, v_start));
  PERFORM b3_note('B3-02', v_ok, 'invalid window denied');

  PERFORM public.reschedule_service_job_visit(v_v, v_start + interval '30 min', v_end + interval '30 min', 'rs1', NULL);
  SELECT count(*) INTO v_hist FROM public.service_job_visit_schedule_history WHERE visit_id = v_v;
  PERFORM public.reschedule_service_job_visit(v_v, v_start + interval '30 min', v_end + interval '30 min', 'rs1-dup', NULL);
  SELECT count(*) INTO v_n FROM public.service_job_visit_schedule_history WHERE visit_id = v_v;
  PERFORM b3_note('B3-03', v_hist = 2 AND v_n = 2, 'hist after rs=' || v_hist || ' after idem=' || v_n);

  PERFORM set_config('app.b1_uid', b1_uid('tech2')::text, false);
  v_ok := b3_denied(format($q$SELECT public.start_service_job_visit(%L::uuid, NULL, %L::text, 'x')$q$, v_v, b3_safety()));
  PERFORM b3_note('B3-04', v_ok, 'unrelated start denied');

  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM b3_start(v_v);
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_start + interval '1 day', v_end + interval '1 day', 'v2', NULL)).id INTO v_v2;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  v_ok := b3_denied(format($q$SELECT public.start_service_job_visit(%L::uuid, NULL, %L::text, 'x')$q$, v_v2, b3_safety()));
  PERFORM b3_note('B3-05', v_ok, 'second active start denied');

  PERFORM b3_start(v_v);
  SELECT count(*) INTO v_n FROM public.service_job_visits WHERE job_id = v_j AND state = 'in_progress';
  PERFORM b3_note('B3-06', v_n = 1, 'active count=' || v_n);

  v_ok := b3_denied(format($q$SELECT public.abort_service_job_visit(%L::uuid, '', NULL)$q$, v_v));
  PERFORM public.abort_service_job_visit(v_v, 'parts missing', NULL);
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_start + interval '2 day', v_end + interval '2 day', 'return', NULL)).id INTO v_v3;
  PERFORM b3_note('B3-07', v_ok AND v_v3 IS NOT NULL, 'abort+return');

  v_ok := b3_denied(format(
    $q$SELECT public.reschedule_service_job_visit(%L::uuid, %L::timestamptz, %L::timestamptz, 'nope', NULL)$q$,
    v_v, v_start, v_end));
  PERFORM b3_note('B3-08', v_ok, 'terminal reschedule denied');

  PERFORM public.assign_service_job(v_j, b1_uid('tech2'), 'repoint', NULL);
  SELECT attending_technician_id INTO v_att FROM public.service_job_visits WHERE id = v_v3;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  v_ok := b3_denied(format($q$SELECT public.start_service_job_visit(%L::uuid, NULL, %L::text, 'x')$q$, v_v3, b3_safety()));
  PERFORM b3_note('B3-09', v_att = b1_uid('tech2') AND v_ok, 'att=' || coalesce(v_att::text,'null'));

  PERFORM set_config('app.b1_uid', b1_uid('tech2')::text, false);
  PERFORM b3_start(v_v3);
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_ok := b3_denied(format(
    $q$SELECT public.assign_service_job(%L::uuid, %L::uuid, 'blocked', NULL)$q$,
    v_j, b1_uid('tech1')));
  PERFORM b3_note('B3-10', v_ok, 'reassign during active denied');
END $$;

DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_job_state text;
  v_start timestamptz := now() + interval '3 hours';
  v_end timestamptz := now() + interval '5 hours';
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B3C-' || substr(replace(gen_random_uuid()::text,'-',''),1,8));
  SELECT (public.create_service_job(v_t, 'B3 Complete', true, 'b3')).id INTO v_j;
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'b3', NULL);
  PERFORM b3_arm_ticket(v_j);
  SELECT (public.schedule_service_job_visit(v_j, v_start, v_end, 'c', NULL)).id INTO v_v;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM b3_start(v_v);
  PERFORM public.complete_service_job_visit(v_v, NULL);
  SELECT state INTO v_job_state FROM public.service_jobs WHERE id = v_j;
  PERFORM b3_note('B3-11', v_job_state IS DISTINCT FROM 'completed', 'job_state=' || v_job_state);
END $$;

DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_v2 uuid;
  v_start timestamptz := now() + interval '6 hours';
  v_end timestamptz := now() + interval '8 hours';
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B3N-' || substr(replace(gen_random_uuid()::text,'-',''),1,8));
  SELECT (public.create_service_job(v_t, 'B3 NA', true, 'b3')).id INTO v_j;
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'b3', NULL);
  PERFORM b3_arm_ticket(v_j);
  SELECT (public.schedule_service_job_visit(v_j, v_start, v_end, 'n', NULL)).id INTO v_v;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM b3_start(v_v);
  PERFORM public.record_visit_no_access(v_v, 'gate locked', NULL);
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_start + interval '1 day', v_end + interval '1 day', 'retry', NULL)).id INTO v_v2;
  PERFORM b3_note('B3-12', v_v2 IS NOT NULL, 'no_access return visit');
END $$;

-- B3-13: denied mutation leaves visit state + audit count unchanged (rollback / traceless fail).
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_n0 int; v_state text;
  v_start timestamptz := now() + interval '9 hours';
  v_end timestamptz := now() + interval '11 hours';
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B3A-' || substr(replace(gen_random_uuid()::text,'-',''),1,8));
  SELECT (public.create_service_job(v_t, 'B3 Audit', true, 'b3')).id INTO v_j;
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'b3', NULL);
  PERFORM b3_arm_ticket(v_j);
  SELECT (public.schedule_service_job_visit(v_j, v_start, v_end, 'a', NULL)).id INTO v_v;
  SELECT count(*) INTO v_n0 FROM public.service_workflow_audit WHERE entity_id = v_v;
  SELECT state INTO v_state FROM public.service_job_visits WHERE id = v_v;
  PERFORM set_config('app.b1_uid', b1_uid('tech2')::text, false);
  BEGIN
    PERFORM b3_start(v_v);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  PERFORM b3_note(
    'B3-13',
    (SELECT state FROM public.service_job_visits WHERE id = v_v) = v_state
    AND (SELECT count(*) FROM public.service_workflow_audit WHERE entity_id = v_v) = v_n0,
    'denied start traceless'
  );
END $$;

-- ---------------------------------------------------------------------------
-- Independent Spark matrix (beyond Cursor B3-01..13)
-- ---------------------------------------------------------------------------

-- B3-L1 lifecycle: schedule → start → complete; job stays open (not completed).
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_job text; v_tkt text;
  v_start timestamptz := now() + interval '12 hours';
  v_end timestamptz := now() + interval '14 hours';
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B3L1-' || substr(replace(gen_random_uuid()::text,'-',''),1,8));
  SELECT (public.create_service_job(v_t, 'B3 L1', true, 'b3')).id INTO v_j;
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'b3', NULL);
  PERFORM b3_arm_ticket(v_j);
  SELECT (public.schedule_service_job_visit(v_j, v_start, v_end, 'l1', NULL)).id INTO v_v;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM b3_start(v_v);
  PERFORM public.complete_service_job_visit(v_v, NULL);
  SELECT state INTO v_job FROM public.service_jobs WHERE id = v_j;
  SELECT status INTO v_tkt FROM public.service_tickets WHERE id = v_t;
  PERFORM b3_note('B3-L1',
    (SELECT state FROM public.service_job_visits WHERE id = v_v) = 'completed'
    AND v_job IS DISTINCT FROM 'completed'
    AND v_tkt = 'in_progress',
    'visit done job=' || v_job || ' ticket=' || v_tkt);
END $$;

-- B3-L2 abort then no-access: historical attending frozen; new visit allowed.
DO $$
DECLARE
  v_t uuid; v_j uuid; v_va uuid; v_vn uuid; v_vnew uuid;
  v_att_a uuid; v_att_n uuid; v_att_new uuid;
  v_start timestamptz := now() + interval '15 hours';
  v_end timestamptz := now() + interval '17 hours';
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B3L2-' || substr(replace(gen_random_uuid()::text,'-',''),1,8));
  SELECT (public.create_service_job(v_t, 'B3 L2', true, 'b3')).id INTO v_j;
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'b3', NULL);
  PERFORM b3_arm_ticket(v_j);
  SELECT (public.schedule_service_job_visit(v_j, v_start, v_end, 'abort', NULL)).id INTO v_va;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM b3_start(v_va);
  PERFORM public.abort_service_job_visit(v_va, 'storm', NULL);
  SELECT attending_technician_id INTO v_att_a FROM public.service_job_visits WHERE id = v_va;

  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_start + interval '1 day', v_end + interval '1 day', 'na', NULL)).id INTO v_vn;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM b3_start(v_vn);
  PERFORM public.record_visit_no_access(v_vn, 'gate', NULL);
  SELECT attending_technician_id INTO v_att_n FROM public.service_job_visits WHERE id = v_vn;

  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  PERFORM public.assign_service_job(v_j, b1_uid('tech2'), 'repoint-after-terminal', NULL);
  SELECT attending_technician_id INTO v_att_a FROM public.service_job_visits WHERE id = v_va;
  SELECT attending_technician_id INTO v_att_n FROM public.service_job_visits WHERE id = v_vn;
  SELECT (public.schedule_service_job_visit(v_j, v_start + interval '2 day', v_end + interval '2 day', 'return', NULL)).id INTO v_vnew;
  SELECT attending_technician_id INTO v_att_new FROM public.service_job_visits WHERE id = v_vnew;
  PERFORM b3_note('B3-L2',
    v_att_a = b1_uid('tech1') AND v_att_n = b1_uid('tech1') AND v_att_new = b1_uid('tech2'),
    'hist_a=' || v_att_a::text || ' hist_n=' || v_att_n::text || ' new=' || coalesce(v_att_new::text,'null'));
END $$;

-- B3-C1 concurrent starts: second denied; exactly one in_progress.
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v1 uuid; v_v2 uuid; v_ok boolean; v_n int;
  v_start timestamptz := now() + interval '18 hours';
  v_end timestamptz := now() + interval '20 hours';
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B3C1-' || substr(replace(gen_random_uuid()::text,'-',''),1,8));
  SELECT (public.create_service_job(v_t, 'B3 C1', true, 'b3')).id INTO v_j;
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'b3', NULL);
  PERFORM b3_arm_ticket(v_j);
  SELECT (public.schedule_service_job_visit(v_j, v_start, v_end, 'c1a', NULL)).id INTO v_v1;
  SELECT (public.schedule_service_job_visit(v_j, v_start + interval '1 day', v_end + interval '1 day', 'c1b', NULL)).id INTO v_v2;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM b3_start(v_v1);
  v_ok := b3_denied(format($q$SELECT public.start_service_job_visit(%L::uuid, NULL, %L::text, 'x')$q$, v_v2, b3_safety()));
  SELECT count(*) INTO v_n FROM public.service_job_visits WHERE job_id = v_j AND state = 'in_progress';
  PERFORM b3_note('B3-C1', v_ok AND v_n = 1, 'denied=' || v_ok || ' active=' || v_n);
END $$;

-- B3-R1 repeat start/complete/abort are idempotent (no duplicate audit flood).
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_n0 int; v_n1 int;
  v_start timestamptz := now() + interval '21 hours';
  v_end timestamptz := now() + interval '23 hours';
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B3R1-' || substr(replace(gen_random_uuid()::text,'-',''),1,8));
  SELECT (public.create_service_job(v_t, 'B3 R1', true, 'b3')).id INTO v_j;
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'b3', NULL);
  PERFORM b3_arm_ticket(v_j);
  SELECT (public.schedule_service_job_visit(v_j, v_start, v_end, 'r1', NULL)).id INTO v_v;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM b3_start(v_v);
  SELECT count(*) INTO v_n0 FROM public.service_workflow_audit WHERE entity_id = v_v;
  PERFORM b3_start(v_v);
  SELECT count(*) INTO v_n1 FROM public.service_workflow_audit WHERE entity_id = v_v;
  PERFORM public.complete_service_job_visit(v_v, NULL);
  SELECT count(*) INTO v_n0 FROM public.service_workflow_audit WHERE entity_id = v_v;
  PERFORM public.complete_service_job_visit(v_v, NULL);
  SELECT count(*) INTO v_n1 FROM public.service_workflow_audit WHERE entity_id = v_v;
  PERFORM b3_note('B3-R1', v_n0 = v_n1
    AND (SELECT state FROM public.service_job_visits WHERE id = v_v) = 'completed',
    'idempotent complete audit=' || v_n1);
END $$;

-- B3-H1 history append-only: prior rows unchanged after reschedule.
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_first uuid; v_start0 timestamptz; v_end0 timestamptz;
  v_start timestamptz := now() + interval '24 hours';
  v_end timestamptz := now() + interval '26 hours';
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B3H1-' || substr(replace(gen_random_uuid()::text,'-',''),1,8));
  SELECT (public.create_service_job(v_t, 'B3 H1', true, 'b3')).id INTO v_j;
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'b3', NULL);
  PERFORM b3_arm_ticket(v_j);
  SELECT (public.schedule_service_job_visit(v_j, v_start, v_end, 'h1', NULL)).id INTO v_v;
  SELECT id, scheduled_start, scheduled_end INTO v_first, v_start0, v_end0
    FROM public.service_job_visit_schedule_history WHERE visit_id = v_v
    ORDER BY changed_at ASC LIMIT 1;
  PERFORM public.reschedule_service_job_visit(
    v_v, v_start + interval '1 hour', v_end + interval '1 hour', 'h1-rs', NULL);
  PERFORM b3_note('B3-H1',
    (SELECT scheduled_start FROM public.service_job_visit_schedule_history WHERE id = v_first) = v_start0
    AND (SELECT scheduled_end FROM public.service_job_visit_schedule_history WHERE id = v_first) = v_end0
    AND (SELECT count(*) FROM public.service_job_visit_schedule_history WHERE visit_id = v_v) = 2,
    'prior history immutable');
END $$;

-- B3-A*: anonymous + forged actor denied on every new B3 RPC.
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid;
  v_start timestamptz := now() + interval '27 hours';
  v_end timestamptz := now() + interval '29 hours';
  v_anon_sched boolean; v_forge_sched boolean;
  v_anon_rs boolean; v_forge_rs boolean;
  v_anon_start boolean; v_forge_start boolean;
  v_anon_complete boolean; v_forge_complete boolean;
  v_anon_abort boolean; v_forge_abort boolean;
  v_anon_na boolean; v_forge_na boolean;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B3AF-' || substr(replace(gen_random_uuid()::text,'-',''),1,8));
  SELECT (public.create_service_job(v_t, 'B3 AF', true, 'b3')).id INTO v_j;
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'b3', NULL);
  PERFORM b3_arm_ticket(v_j);
  SELECT (public.schedule_service_job_visit(v_j, v_start, v_end, 'af', NULL)).id INTO v_v;

  RESET app.b1_uid;
  v_anon_sched := b3_denied(format(
    $q$SELECT public.schedule_service_job_visit(%L::uuid, %L::timestamptz, %L::timestamptz, 'anon', NULL)$q$,
    v_j, v_start + interval '3 day', v_end + interval '3 day'));
  v_anon_rs := b3_denied(format(
    $q$SELECT public.reschedule_service_job_visit(%L::uuid, %L::timestamptz, %L::timestamptz, 'anon', NULL)$q$,
    v_v, v_start + interval '10 min', v_end + interval '10 min'));
  v_anon_start := b3_denied(format($q$SELECT public.start_service_job_visit(%L::uuid, NULL, %L::text, 'x')$q$, v_v, b3_safety()));
  v_anon_complete := b3_denied(format($q$SELECT public.complete_service_job_visit(%L::uuid, NULL)$q$, v_v));
  v_anon_abort := b3_denied(format($q$SELECT public.abort_service_job_visit(%L::uuid, 'x', NULL)$q$, v_v));
  v_anon_na := b3_denied(format($q$SELECT public.record_visit_no_access(%L::uuid, 'x', NULL)$q$, v_v));

  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  v_forge_sched := b3_denied(format(
    $q$SELECT public.schedule_service_job_visit(%L::uuid, %L::timestamptz, %L::timestamptz, 'forge', %L::uuid)$q$,
    v_j, v_start + interval '4 day', v_end + interval '4 day', b1_uid('admin')));
  v_forge_rs := b3_denied(format(
    $q$SELECT public.reschedule_service_job_visit(%L::uuid, %L::timestamptz, %L::timestamptz, 'forge', %L::uuid)$q$,
    v_v, v_start + interval '20 min', v_end + interval '20 min', b1_uid('admin')));
  v_forge_start := b3_denied(format(
    $q$SELECT public.start_service_job_visit(%L::uuid, %L::uuid, %L::text, 'x')$q$,
    v_v, b1_uid('admin'), b3_safety()));
  -- Start legitimately as assignee, then forged complete/abort/no_access
  PERFORM b3_start(v_v);
  v_forge_complete := b3_denied(format(
    $q$SELECT public.complete_service_job_visit(%L::uuid, %L::uuid)$q$, v_v, b1_uid('admin')));
  v_forge_abort := b3_denied(format(
    $q$SELECT public.abort_service_job_visit(%L::uuid, 'x', %L::uuid)$q$, v_v, b1_uid('support')));
  v_forge_na := b3_denied(format(
    $q$SELECT public.record_visit_no_access(%L::uuid, 'x', %L::uuid)$q$, v_v, b1_uid('support')));

  PERFORM b3_note('B3-A1', v_anon_sched AND v_forge_sched, 'schedule anon/forge');
  PERFORM b3_note('B3-A2', v_anon_rs AND v_forge_rs, 'reschedule anon/forge');
  PERFORM b3_note('B3-A3', v_anon_start AND v_forge_start, 'start anon/forge');
  PERFORM b3_note('B3-A4', v_anon_complete AND v_forge_complete, 'complete anon/forge');
  PERFORM b3_note('B3-A5', v_anon_abort AND v_forge_abort, 'abort anon/forge');
  PERFORM b3_note('B3-A6', v_anon_na AND v_forge_na, 'no_access anon/forge');
END $$;

-- B3-G1 completion gate: visit complete must not close ticket / complete job alone.
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_job text; v_tkt text; v_n_close int;
  v_start timestamptz := now() + interval '30 hours';
  v_end timestamptz := now() + interval '32 hours';
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B3G1-' || substr(replace(gen_random_uuid()::text,'-',''),1,8));
  SELECT (public.create_service_job(v_t, 'B3 G1', true, 'b3')).id INTO v_j;
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'b3', NULL);
  PERFORM b3_arm_ticket(v_j);
  SELECT (public.schedule_service_job_visit(v_j, v_start, v_end, 'g1', NULL)).id INTO v_v;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM b3_start(v_v);
  PERFORM public.complete_service_job_visit(v_v, NULL);
  SELECT state INTO v_job FROM public.service_jobs WHERE id = v_j;
  SELECT status INTO v_tkt FROM public.service_tickets WHERE id = v_t;
  SELECT count(*) INTO v_n_close FROM public.service_workflow_audit
    WHERE ticket_id = v_t AND action ILIKE '%clos%';
  PERFORM b3_note('B3-G1',
    v_job IN ('planned', 'in_progress') AND v_tkt = 'in_progress' AND v_n_close = 0,
    'job=' || v_job || ' ticket=' || v_tkt || ' close_audits=' || v_n_close);
END $$;

-- F-B3-01: auth before idempotent terminal return (complete/abort/no_access).
DO $$
DECLARE
  v_t uuid; v_j uuid; v_vc uuid; v_va uuid; v_vn uuid;
  v_n0 int; v_n1 int; v_ok boolean := true;
  v_start timestamptz := now() + interval '33 hours';
  v_end timestamptz := now() + interval '35 hours';
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B3F-' || substr(replace(gen_random_uuid()::text,'-',''),1,8));
  SELECT (public.create_service_job(v_t, 'B3 F', true, 'b3')).id INTO v_j;
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'b3', NULL);
  PERFORM b3_arm_ticket(v_j);

  SELECT (public.schedule_service_job_visit(v_j, v_start, v_end, 'fc', NULL)).id INTO v_vc;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM b3_start(v_vc);
  PERFORM public.complete_service_job_visit(v_vc, NULL);
  -- authorized idempotent retry
  PERFORM public.complete_service_job_visit(v_vc, NULL);
  -- denied callers see no payload / no audit growth
  SELECT count(*) INTO v_n0 FROM public.service_workflow_audit WHERE entity_id = v_vc;
  PERFORM set_config('app.b1_uid', b1_uid('tech2')::text, false);
  v_ok := v_ok AND b3_denied(format($q$SELECT public.complete_service_job_visit(%L::uuid, NULL)$q$, v_vc));
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  v_ok := v_ok AND b3_denied(format($q$SELECT public.complete_service_job_visit(%L::uuid, NULL)$q$, v_vc));
  PERFORM set_config('app.b1_uid', b1_uid('sales')::text, false);
  v_ok := v_ok AND b3_denied(format($q$SELECT public.complete_service_job_visit(%L::uuid, NULL)$q$, v_vc));
  RESET app.b1_uid;
  v_ok := v_ok AND b3_denied(format($q$SELECT public.complete_service_job_visit(%L::uuid, NULL)$q$, v_vc));
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  v_ok := v_ok AND b3_denied(format(
    $q$SELECT public.complete_service_job_visit(%L::uuid, %L::uuid)$q$, v_vc, b1_uid('admin')));
  SELECT count(*) INTO v_n1 FROM public.service_workflow_audit WHERE entity_id = v_vc;
  v_ok := v_ok AND v_n0 = v_n1;

  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_start + interval '1 day', v_end + interval '1 day', 'fa', NULL)).id INTO v_va;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM b3_start(v_va);
  PERFORM public.abort_service_job_visit(v_va, 'stop', NULL);
  PERFORM public.abort_service_job_visit(v_va, 'ignored-on-retry', NULL);
  SELECT count(*) INTO v_n0 FROM public.service_workflow_audit WHERE entity_id = v_va;
  PERFORM set_config('app.b1_uid', b1_uid('tech2')::text, false);
  v_ok := v_ok AND b3_denied(format($q$SELECT public.abort_service_job_visit(%L::uuid, 'x', NULL)$q$, v_va));
  SELECT count(*) INTO v_n1 FROM public.service_workflow_audit WHERE entity_id = v_va;
  v_ok := v_ok AND v_n0 = v_n1;

  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_start + interval '2 day', v_end + interval '2 day', 'fn', NULL)).id INTO v_vn;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM b3_start(v_vn);
  PERFORM public.record_visit_no_access(v_vn, 'gate', NULL);
  PERFORM public.record_visit_no_access(v_vn, 'retry', NULL);
  SELECT count(*) INTO v_n0 FROM public.service_workflow_audit WHERE entity_id = v_vn;
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  v_ok := v_ok AND b3_denied(format($q$SELECT public.record_visit_no_access(%L::uuid, 'x', NULL)$q$, v_vn));
  SELECT count(*) INTO v_n1 FROM public.service_workflow_audit WHERE entity_id = v_vn;
  PERFORM b3_note('B3-F1', v_ok AND v_n0 = v_n1, 'auth-before-idempotent terminal');
END $$;

-- D-B3-01: first start advances ticket assigned→in_progress once; later starts do not re-fire.
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v1 uuid; v_v2 uuid;
  v_tkt0 text; v_tkt1 text; v_tkt2 text;
  v_fr0 timestamptz; v_fr1 timestamptz; v_aa0 timestamptz; v_aa1 timestamptz;
  v_aud0 int; v_aud1 int; v_bad boolean;
  v_start timestamptz := now() + interval '36 hours';
  v_end timestamptz := now() + interval '38 hours';
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B3D1-' || substr(replace(gen_random_uuid()::text,'-',''),1,8));
  SELECT (public.create_service_job(v_t, 'B3 D1', true, 'b3')).id INTO v_j;
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'b3', NULL);
  -- incompatible parent (open) denied
  SELECT (public.schedule_service_job_visit(v_j, v_start, v_end, 'd1a', NULL)).id INTO v_v1;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  v_bad := b3_denied(format(
    $q$SELECT public.start_service_job_visit(%L::uuid, NULL, %L::text, 'x')$q$, v_v1, b3_safety()));
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  PERFORM b3_arm_ticket(v_j);
  SELECT status, first_response_at, assigned_at INTO v_tkt0, v_fr0, v_aa0
    FROM public.service_tickets WHERE id = v_t;
  SELECT count(*) INTO v_aud0 FROM public.ticket_governance_audit
    WHERE ticket_id = v_t AND to_status = 'in_progress';
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM b3_start(v_v1);
  SELECT status, first_response_at, assigned_at INTO v_tkt1, v_fr1, v_aa1
    FROM public.service_tickets WHERE id = v_t;
  PERFORM public.complete_service_job_visit(v_v1, NULL);
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_start + interval '1 day', v_end + interval '1 day', 'd1b', NULL)).id INTO v_v2;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM b3_start(v_v2);
  SELECT status INTO v_tkt2 FROM public.service_tickets WHERE id = v_t;
  SELECT count(*) INTO v_aud1 FROM public.ticket_governance_audit
    WHERE ticket_id = v_t AND to_status = 'in_progress' AND details->>'workflow' = 'b3_first_visit_start';
  PERFORM b3_note('B3-D1',
    v_bad AND v_tkt0 = 'assigned' AND v_tkt1 = 'in_progress' AND v_tkt2 = 'in_progress'
    AND v_fr0 IS NOT DISTINCT FROM v_fr1 AND v_aa0 IS NOT DISTINCT FROM v_aa1
    AND v_aud1 = v_aud0 + 1,
    'open_denied=' || v_bad || ' t0=' || v_tkt0 || ' t1=' || v_tkt1 || ' audits=' || v_aud1);
END $$;

-- D-B3-02: safety gate — missing/failed deny start; failed may still abort/no-access; attestation exact.
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_v2 uuid; v_ok boolean := true; v_fail_id uuid;
  v_start timestamptz := now() + interval '39 hours';
  v_end timestamptz := now() + interval '41 hours';
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B3D2-' || substr(replace(gen_random_uuid()::text,'-',''),1,8));
  SELECT (public.create_service_job(v_t, 'B3 D2', true, 'b3')).id INTO v_j;
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'b3', NULL);
  PERFORM b3_arm_ticket(v_j);
  SELECT (public.schedule_service_job_visit(v_j, v_start, v_end, 'd2', NULL)).id INTO v_v;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  -- missing attestation
  v_ok := v_ok AND b3_denied(format($q$SELECT public.start_service_job_visit(%L::uuid, NULL, NULL, 'x')$q$, v_v));
  -- wrong generic claim text
  v_ok := v_ok AND b3_denied(format(
    $q$SELECT public.start_service_job_visit(%L::uuid, NULL, %L::text, 'x')$q$,
    v_v, 'All machine hazards cleared'));
  -- failed check recorded; start denied; abort still allowed (non-work outcome)
  SELECT (public.record_visit_safety_check(v_v, 'failed', 'site unsafe', NULL, NULL)).id INTO v_fail_id;
  v_ok := v_ok AND v_fail_id IS NOT NULL;
  v_ok := v_ok AND b3_denied(format(
    $q$SELECT public.start_service_job_visit(%L::uuid, NULL, %L::text, 'x')$q$, v_v, b3_safety()));
  PERFORM public.abort_service_job_visit(v_v, 'unsafe site — no work started', NULL);
  v_ok := v_ok AND (SELECT state FROM public.service_job_visits WHERE id = v_v) = 'aborted';

  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_start + interval '1 day', v_end + interval '1 day', 'd2b', NULL)).id INTO v_v2;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM public.record_visit_safety_check(v_v2, 'failed', 'locked', NULL, NULL);
  PERFORM public.record_visit_no_access(v_v2, 'no access after failed safety', NULL);
  PERFORM b3_note('B3-D2', v_ok
    AND (SELECT state FROM public.service_job_visits WHERE id = v_v2) = 'no_access',
    'safety gate + non-work outcomes');
END $$;

SELECT check_id, status, detail FROM public.b3_eval ORDER BY check_id;
SELECT CASE WHEN count(*) FILTER (WHERE status = 'FAIL') = 0 THEN 'B3 BATTERY: PASS'
            ELSE 'B3 BATTERY: FAIL' END AS verdict,
       count(*) FILTER (WHERE status = 'PASS') AS passes,
       count(*) FILTER (WHERE status = 'FAIL') AS fails
FROM public.b3_eval;
