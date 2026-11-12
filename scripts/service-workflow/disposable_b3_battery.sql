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
  v_ok := b3_denied(format($q$SELECT public.start_service_job_visit(%L::uuid, NULL)$q$, v_v));
  PERFORM b3_note('B3-04', v_ok, 'unrelated start denied');

  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM public.start_service_job_visit(v_v, NULL);
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_start + interval '1 day', v_end + interval '1 day', 'v2', NULL)).id INTO v_v2;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  v_ok := b3_denied(format($q$SELECT public.start_service_job_visit(%L::uuid, NULL)$q$, v_v2));
  PERFORM b3_note('B3-05', v_ok, 'second active start denied');

  PERFORM public.start_service_job_visit(v_v, NULL);
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
  v_ok := b3_denied(format($q$SELECT public.start_service_job_visit(%L::uuid, NULL)$q$, v_v3));
  PERFORM b3_note('B3-09', v_att = b1_uid('tech2') AND v_ok, 'att=' || coalesce(v_att::text,'null'));

  PERFORM set_config('app.b1_uid', b1_uid('tech2')::text, false);
  PERFORM public.start_service_job_visit(v_v3, NULL);
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
  SELECT (public.schedule_service_job_visit(v_j, v_start, v_end, 'c', NULL)).id INTO v_v;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM public.start_service_job_visit(v_v, NULL);
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
  SELECT (public.schedule_service_job_visit(v_j, v_start, v_end, 'n', NULL)).id INTO v_v;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM public.start_service_job_visit(v_v, NULL);
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
  SELECT (public.schedule_service_job_visit(v_j, v_start, v_end, 'a', NULL)).id INTO v_v;
  SELECT count(*) INTO v_n0 FROM public.service_workflow_audit WHERE entity_id = v_v;
  SELECT state INTO v_state FROM public.service_job_visits WHERE id = v_v;
  PERFORM set_config('app.b1_uid', b1_uid('tech2')::text, false);
  BEGIN
    PERFORM public.start_service_job_visit(v_v, NULL);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  PERFORM b3_note(
    'B3-13',
    (SELECT state FROM public.service_job_visits WHERE id = v_v) = v_state
    AND (SELECT count(*) FROM public.service_workflow_audit WHERE entity_id = v_v) = v_n0,
    'denied start traceless'
  );
END $$;

SELECT check_id, status, detail FROM public.b3_eval ORDER BY check_id;
SELECT CASE WHEN count(*) FILTER (WHERE status = 'FAIL') = 0 THEN 'B3 BATTERY: PASS'
            ELSE 'B3 BATTERY: FAIL' END AS verdict,
       count(*) FILTER (WHERE status = 'PASS') AS passes,
       count(*) FILTER (WHERE status = 'FAIL') AS fails
FROM public.b3_eval;
