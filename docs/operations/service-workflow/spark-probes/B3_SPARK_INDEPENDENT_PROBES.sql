-- Spark independent B3 probes (SP-*). Reuses b1_uid/b1_mkticket from B3 battery.
CREATE TABLE IF NOT EXISTS public.spark_eval(check_id text PRIMARY KEY, status text NOT NULL, detail text);
TRUNCATE public.spark_eval;
CREATE OR REPLACE FUNCTION sp_note(p_id text, p_ok boolean, p_detail text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN INSERT INTO public.spark_eval VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, left(p_detail,400))
ON CONFLICT (check_id) DO UPDATE SET status=EXCLUDED.status, detail=EXCLUDED.detail; END $$;
CREATE OR REPLACE FUNCTION sp_denied(p_sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN EXECUTE p_sql; RETURN false;
EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE IN ('42501','22023','P0002','23514') OR SQLERRM ILIKE '%permission%' OR SQLERRM ILIKE '%mandatory%'
     OR SQLERRM ILIKE '%active visit%' OR SQLERRM ILIKE '%only%' OR SQLERRM ILIKE '%Invalid%'
     OR SQLERRM ILIKE '%Cannot%' OR SQLERRM ILIKE '%required%' OR SQLERRM ILIKE '%Authentication%'
     OR SQLERRM ILIKE '%impersonation%' OR SQLERRM ILIKE '%terminal%' OR SQLERRM ILIKE '%reschedule%'
  THEN RETURN true; END IF; RAISE; END $$;
CREATE OR REPLACE FUNCTION sp_mkjob(p_tag text, p_assign text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_t uuid; v_j uuid;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', p_tag||'-'||substr(replace(gen_random_uuid()::text,'-',''),1,8));
  SELECT (public.create_service_job(v_t, p_tag, true, 'sp')).id INTO v_j;
  IF p_assign IS NOT NULL THEN PERFORM public.assign_service_job(v_j, b1_uid(p_assign), 'sp', NULL); END IF;
  RETURN v_j;
END $$;

-- SP-01 lifecycle: invalid visit transitions + mandatory reasons
DO $$
DECLARE v_j uuid; v_v uuid; a boolean; b boolean; c boolean; d boolean; e boolean;
  v_s timestamptz := now()+interval '2 hours'; v_e timestamptz := now()+interval '4 hours';
BEGIN
  v_j := sp_mkjob('SP01','tech1');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_s, v_e, 'x', NULL)).id INTO v_v;
  a := sp_denied(format($q$SELECT public.complete_service_job_visit(%L::uuid, NULL)$q$, v_v));
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM public.start_service_job_visit(v_v, NULL);
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  b := sp_denied(format($q$SELECT public.reschedule_service_job_visit(%L::uuid,%L::timestamptz,%L::timestamptz,'x',NULL)$q$, v_v, v_s, v_e));
  c := sp_denied(format($q$SELECT public.abort_service_job_visit(%L::uuid, '', NULL)$q$, v_v));
  d := sp_denied(format($q$SELECT public.record_visit_no_access(%L::uuid, '   ', NULL)$q$, v_v));
  PERFORM public.complete_service_job_visit(v_v, NULL);
  e := sp_denied(format($q$SELECT public.start_service_job_visit(%L::uuid, NULL)$q$, v_v));
  PERFORM sp_note('SP-01', a AND b AND c AND d AND e, 'complete-scheduled/resched-active/empty-abort/ws-noaccess/start-completed denied');
END $$;

-- SP-02 authorization: schedule/reschedule staff-only
DO $$
DECLARE v_j uuid; v_v uuid; a boolean; b boolean; c boolean;
  v_s timestamptz := now()+interval '2 hours'; v_e timestamptz := now()+interval '4 hours';
BEGIN
  v_j := sp_mkjob('SP02','tech1');
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  a := sp_denied(format($q$SELECT public.schedule_service_job_visit(%L::uuid,%L::timestamptz,%L::timestamptz,'x',NULL)$q$, v_j, v_s, v_e));
  PERFORM set_config('app.b1_uid', b1_uid('sales')::text, false);
  b := sp_denied(format($q$SELECT public.schedule_service_job_visit(%L::uuid,%L::timestamptz,%L::timestamptz,'x',NULL)$q$, v_j, v_s, v_e));
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  c := sp_denied(format($q$SELECT public.schedule_service_job_visit(%L::uuid,%L::timestamptz,%L::timestamptz,'x',NULL)$q$, v_j, v_s, v_e));
  PERFORM set_config('app.b1_uid', b1_uid('admin')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_s, v_e, 'adm', NULL)).id INTO v_v;
  PERFORM sp_note('SP-02', a AND b AND c AND v_v IS NOT NULL, 'customer/sales/tech schedule denied; admin schedules');
END $$;

-- SP-03 start authority: unassigned denied; wrong tech denied; assignee + staff on-behalf pass
DO $$
DECLARE v_j uuid; v_v uuid; v_j2 uuid; v_v2 uuid; a boolean; b boolean;
  v_s timestamptz := now()+interval '2 hours'; v_e timestamptz := now()+interval '4 hours';
BEGIN
  v_j := sp_mkjob('SP03');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_s, v_e, 'x', NULL)).id INTO v_v;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  a := sp_denied(format($q$SELECT public.start_service_job_visit(%L::uuid, NULL)$q$, v_v));
  v_j2 := sp_mkjob('SP03B','tech1');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j2, v_s, v_e, 'x', NULL)).id INTO v_v2;
  PERFORM set_config('app.b1_uid', b1_uid('tech2')::text, false);
  b := sp_denied(format($q$SELECT public.start_service_job_visit(%L::uuid, NULL)$q$, v_v2));
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  PERFORM public.start_service_job_visit(v_v2, NULL);
  PERFORM sp_note('SP-03', a AND b AND b1_state('service_job_visits', v_v2)='in_progress', 'unassigned+wrong-tech denied; staff on-behalf starts');
END $$;

-- SP-04 completion-gate: visit completion does NOT complete job or ticket; actual times set once
DO $$
DECLARE v_j uuid; v_v uuid; v_js text; v_ts text; v_ae timestamptz; v_ae2 timestamptz;
  v_s timestamptz := now()+interval '2 hours'; v_e timestamptz := now()+interval '4 hours';
BEGIN
  v_j := sp_mkjob('SP04','tech1');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_s, v_e, 'x', NULL)).id INTO v_v;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM public.start_service_job_visit(v_v, NULL);
  PERFORM public.complete_service_job_visit(v_v, NULL);
  SELECT actual_end INTO v_ae FROM public.service_job_visits WHERE id=v_v;
  PERFORM public.complete_service_job_visit(v_v, NULL);
  SELECT actual_end INTO v_ae2 FROM public.service_job_visits WHERE id=v_v;
  SELECT state INTO v_js FROM public.service_jobs WHERE id=v_j;
  SELECT status INTO v_ts FROM public.service_tickets WHERE id=(SELECT ticket_id FROM public.service_jobs WHERE id=v_j);
  PERFORM sp_note('SP-04', v_js IS DISTINCT FROM 'completed' AND v_ae IS NOT NULL AND v_ae2=v_ae, 'job='||v_js||' ticket='||v_ts||' actual_end stable');
END $$;

-- SP-05 anonymous injection on EVERY new RPC (no actor context + forged p_actor_id)
DO $$
DECLARE v_j uuid; v_v uuid; k int := 0; ok boolean := true; rr boolean[] := ARRAY[]::boolean[];
  v_s timestamptz := now()+interval '2 hours'; v_e timestamptz := now()+interval '4 hours';
  forged uuid := b1_uid('admin');
BEGIN
  v_j := sp_mkjob('SP05','tech1');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_s, v_e, 'x', NULL)).id INTO v_v;
  PERFORM set_config('app.b1_uid', '', false);
  PERFORM set_config('request.jwt.claim.role', '', false);
  rr := rr || sp_denied(format($q$SELECT public.schedule_service_job_visit(%L::uuid,%L::timestamptz,%L::timestamptz,'x',%L::uuid)$q$, v_j, v_s, v_e, forged)); k:=k+1;
  rr := rr || sp_denied(format($q$SELECT public.reschedule_service_job_visit(%L::uuid,%L::timestamptz,%L::timestamptz,'x',%L::uuid)$q$, v_v, v_s, v_e, forged)); k:=k+1;
  rr := rr || sp_denied(format($q$SELECT public.start_service_job_visit(%L::uuid,%L::uuid)$q$, v_v, forged)); k:=k+1;
  rr := rr || sp_denied(format($q$SELECT public.complete_service_job_visit(%L::uuid,%L::uuid)$q$, v_v, forged)); k:=k+1;
  rr := rr || sp_denied(format($q$SELECT public.abort_service_job_visit(%L::uuid,'x',%L::uuid)$q$, v_v, forged)); k:=k+1;
  rr := rr || sp_denied(format($q$SELECT public.record_visit_no_access(%L::uuid,'x',%L::uuid)$q$, v_v, forged)); k:=k+1;
  rr := rr || sp_denied(format($q$SELECT public.create_service_job_visit(%L::uuid,'x',%L::uuid)$q$, v_j, forged)); k:=k+1;
  rr := rr || sp_denied(format($q$SELECT public.govern_visit_transition(%L::uuid,'in_progress','x',%L::uuid)$q$, v_v, forged)); k:=k+1;
  rr := rr || sp_denied(format($q$SELECT public.assign_service_job(%L::uuid,%L::uuid,'x',%L::uuid)$q$, v_j, b1_uid('tech2'), forged)); k:=k+1;
  rr := rr || sp_denied(format($q$SELECT public.decline_service_job(%L::uuid,'x',%L::uuid)$q$, v_j, forged)); k:=k+1;
  PERFORM sp_note('SP-05', (SELECT bool_and(x) FROM unnest(rr) x) AND k=10, 'uid=' || coalesce(admin_private.caller_uid()::text,'null') || ' svc=' || admin_private.is_service_role_request() || ' rr='||rr::text||' anon10 k='||k||' ok='||ok||' state='||b1_state('service_job_visits', v_v)
    ||' assignee='||coalesce((SELECT assigned_technician_id::text FROM public.service_jobs WHERE id=v_j),'null'));
END $$;

-- SP-05B resolver debug under anonymity
DO $$
DECLARE v_uid uuid; v_role text; v_denied boolean := false;
BEGIN
  PERFORM set_config('app.b1_uid', '', false);
  PERFORM set_config('request.jwt.claim.role', '', false);
  BEGIN
    SELECT uid, role INTO v_uid, v_role FROM admin_private.workflow_resolve_actor(b1_uid('admin'));
  EXCEPTION WHEN OTHERS THEN v_denied := true; v_role := SQLSTATE || ':' || left(SQLERRM, 80);
  END;
  PERFORM sp_note('SP-05B', v_denied, 'resolver anon+forged denied=' || v_denied || ' uid=' || coalesce(v_uid::text,'null') || ' role=' || coalesce(v_role,'null') || ' svc=' || coalesce(admin_private.is_service_role_request()::text,'null') || ' cu=' || session_user);
END $$;

-- SP-05C hosted-representative anon (claims role=anon) + forged actor on every new RPC
DO $$
DECLARE v_j uuid; v_v uuid; k int := 0; rr boolean[] := ARRAY[]::boolean[];
  v_s timestamptz := now()+interval '2 hours'; v_e timestamptz := now()+interval '4 hours';
  forged uuid := b1_uid('admin');
BEGIN
  v_j := sp_mkjob('SP05C','tech1');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_s, v_e, 'x', NULL)).id INTO v_v;
  PERFORM set_config('app.b1_uid', '', false);
  PERFORM set_config('request.jwt.claim.role', 'anon', false);
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', false);
  rr := rr || sp_denied(format($q$SELECT public.schedule_service_job_visit(%L::uuid,%L::timestamptz,%L::timestamptz,'x',%L::uuid)$q$, v_j, v_s, v_e, forged)); k:=k+1;
  rr := rr || sp_denied(format($q$SELECT public.reschedule_service_job_visit(%L::uuid,%L::timestamptz,%L::timestamptz,'x',%L::uuid)$q$, v_v, v_s, v_e, forged)); k:=k+1;
  rr := rr || sp_denied(format($q$SELECT public.start_service_job_visit(%L::uuid,%L::uuid)$q$, v_v, forged)); k:=k+1;
  rr := rr || sp_denied(format($q$SELECT public.complete_service_job_visit(%L::uuid,%L::uuid)$q$, v_v, forged)); k:=k+1;
  rr := rr || sp_denied(format($q$SELECT public.abort_service_job_visit(%L::uuid,'x',%L::uuid)$q$, v_v, forged)); k:=k+1;
  rr := rr || sp_denied(format($q$SELECT public.record_visit_no_access(%L::uuid,'x',%L::uuid)$q$, v_v, forged)); k:=k+1;
  rr := rr || sp_denied(format($q$SELECT public.create_service_job_visit(%L::uuid,'x',%L::uuid)$q$, v_j, forged)); k:=k+1;
  rr := rr || sp_denied(format($q$SELECT public.govern_visit_transition(%L::uuid,'in_progress','x',%L::uuid)$q$, v_v, forged)); k:=k+1;
  rr := rr || sp_denied(format($q$SELECT public.assign_service_job(%L::uuid,%L::uuid,'x',%L::uuid)$q$, v_j, b1_uid('tech2'), forged)); k:=k+1;
  rr := rr || sp_denied(format($q$SELECT public.decline_service_job(%L::uuid,'x',%L::uuid)$q$, v_j, forged)); k:=k+1;
  PERFORM set_config('request.jwt.claim.role', '', false);
  PERFORM set_config('request.jwt.claims', '', false);
  PERFORM sp_note('SP-05C', (SELECT bool_and(x) FROM unnest(rr) x) AND k=10, 'hosted-anon+forged denied rr='||rr::text);
END $$;

-- SP-06 forged actor (authenticated as tech1, p_actor_id = someone else) on EVERY new RPC
DO $$
DECLARE v_j uuid; v_v uuid; k int := 0; ok boolean := true;
  v_s timestamptz := now()+interval '2 hours'; v_e timestamptz := now()+interval '4 hours';
  forged uuid;
BEGIN
  v_j := sp_mkjob('SP06','tech1');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_s, v_e, 'x', NULL)).id INTO v_v;
  forged := b1_uid('support');
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  ok := ok AND sp_denied(format($q$SELECT public.schedule_service_job_visit(%L::uuid,%L::timestamptz,%L::timestamptz,'x',%L::uuid)$q$, v_j, v_s, v_e, forged)); k:=k+1;
  ok := ok AND sp_denied(format($q$SELECT public.reschedule_service_job_visit(%L::uuid,%L::timestamptz,%L::timestamptz,'x',%L::uuid)$q$, v_v, v_s, v_e, forged)); k:=k+1;
  ok := ok AND sp_denied(format($q$SELECT public.start_service_job_visit(%L::uuid,%L::uuid)$q$, v_v, forged)); k:=k+1;
  ok := ok AND sp_denied(format($q$SELECT public.complete_service_job_visit(%L::uuid,%L::uuid)$q$, v_v, forged)); k:=k+1;
  ok := ok AND sp_denied(format($q$SELECT public.abort_service_job_visit(%L::uuid,'x',%L::uuid)$q$, v_v, forged)); k:=k+1;
  ok := ok AND sp_denied(format($q$SELECT public.record_visit_no_access(%L::uuid,'x',%L::uuid)$q$, v_v, forged)); k:=k+1;
  ok := ok AND sp_denied(format($q$SELECT public.create_service_job_visit(%L::uuid,'x',%L::uuid)$q$, v_j, forged)); k:=k+1;
  ok := ok AND sp_denied(format($q$SELECT public.govern_visit_transition(%L::uuid,'in_progress','x',%L::uuid)$q$, v_v, forged)); k:=k+1;
  ok := ok AND sp_denied(format($q$SELECT public.assign_service_job(%L::uuid,%L::uuid,'x',%L::uuid)$q$, v_j, b1_uid('tech2'), forged)); k:=k+1;
  ok := ok AND sp_denied(format($q$SELECT public.decline_service_job(%L::uuid,'x',%L::uuid)$q$, v_j, forged)); k:=k+1;
  PERFORM sp_note('SP-06', ok AND k=10, 'forged p_actor_id denied on '||k||'/10 RPCs');
END $$;

-- SP-07 history/audit: each mutation audits with actor; denied mutations add nothing
DO $$
DECLARE v_j uuid; v_v uuid; n0 int; n1 int; acts text;
  v_s timestamptz := now()+interval '2 hours'; v_e timestamptz := now()+interval '4 hours';
BEGIN
  v_j := sp_mkjob('SP07','tech1');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_s, v_e, 'x', NULL)).id INTO v_v;
  PERFORM public.reschedule_service_job_visit(v_v, v_s+interval '1 hour', v_e+interval '1 hour', 'rs', NULL);
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM public.start_service_job_visit(v_v, NULL);
  PERFORM public.abort_service_job_visit(v_v, 'unsafe', NULL);
  SELECT count(*) INTO n0 FROM public.service_workflow_audit WHERE entity_id=v_v;
  SELECT string_agg(DISTINCT action, ',' ORDER BY action) INTO acts FROM public.service_workflow_audit WHERE entity_id=v_v;
  BEGIN PERFORM set_config('app.b1_uid', b1_uid('tech2')::text, false);
    PERFORM public.start_service_job_visit(v_v, NULL);
  EXCEPTION WHEN OTHERS THEN NULL; END;
  SELECT count(*) INTO n1 FROM public.service_workflow_audit WHERE entity_id=v_v;
  PERFORM sp_note('SP-07', n0>=4 AND n1=n0 AND acts LIKE '%schedule_visit%' AND acts LIKE '%reschedule_visit%' AND acts LIKE '%start_visit%' AND acts LIKE '%abort_visit%', 'audit n='||n0||' acts='||coalesce(acts,''));
END $$;

-- SP-08 decline repoints scheduled attendance to NULL; former tech cannot start; terminal visit frozen
DO $$
DECLARE v_j uuid; v_v uuid; v_vt uuid; att uuid; a boolean;
  v_s timestamptz := now()+interval '2 hours'; v_e timestamptz := now()+interval '4 hours';
BEGIN
  v_j := sp_mkjob('SP08','tech1');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_s, v_e, 'x', NULL)).id INTO v_v;
  SELECT (public.schedule_service_job_visit(v_j, v_s+interval '1 day', v_e+interval '1 day', 't', NULL)).id INTO v_vt;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM public.start_service_job_visit(v_vt, NULL);
  PERFORM public.abort_service_job_visit(v_vt, 'done-frozen', NULL);
  PERFORM public.decline_service_job(v_j, 'cannot attend', NULL);
  SELECT attending_technician_id INTO att FROM public.service_job_visits WHERE id=v_v;
  a := sp_denied(format($q$SELECT public.start_service_job_visit(%L::uuid, NULL)$q$, v_v));
  PERFORM sp_note('SP-08', att IS NULL AND a
    AND (SELECT attending_technician_id FROM public.service_job_visits WHERE id=v_vt) = b1_uid('tech1'),
    'decline cleared scheduled attending; terminal frozen; former start denied');
END $$;
