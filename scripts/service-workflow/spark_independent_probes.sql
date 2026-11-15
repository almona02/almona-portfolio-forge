-- Spark independent probes for corrective 20261112150000 (post-fix only).
-- Author: independent QA/security review (Spark). No secrets in this file.
-- Prerequisites (disposable cluster): base + Slice 0 + TKT section 2 + frozen
-- B1/B2 + main-battery helper preamble + corrective migration applied; roles
-- anon / b1_auth (member of authenticated) / authenticated / service_role exist;
-- auth.uid() shim reads GUC app.b1_uid; b1_uid()/b1_mkticket() helpers present.
-- For body-strength proof of I-01-08, first grant anon EXECUTE on all 8 workflow
-- RPCs (adversarial re-grant): without it these checks still PASS via grant denial.
--   GRANT EXECUTE ON FUNCTION public.assign_service_job(uuid,uuid,text,uuid) TO anon;
--   ... (decline, ensure_default, govern_job_transition, waive,
--   create_service_job_visit, govern_visit_transition, create_service_job 5-arg)
-- Run: psql -v ON_ERROR_STOP=1 -f this file. Uses random ticket tags; rerunnable.
-- Companion: spark_forge_probes.sql (run after; forgery family I-16C/D/E).
CREATE TABLE IF NOT EXISTS public.ind_eval(check_id text PRIMARY KEY, status text NOT NULL, detail text);
TRUNCATE public.ind_eval;
CREATE OR REPLACE FUNCTION ind_note(p_id text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.ind_eval(check_id, status, detail)
  VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, left(p_detail, 300))
  ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
END; $$;
CREATE OR REPLACE FUNCTION ind_denied(p_sql text)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN EXECUTE p_sql; RETURN false;
EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE = '42501' OR SQLERRM ILIKE '%permission denied%' OR SQLERRM ILIKE '%Authentication required%'
     OR SQLERRM ILIKE '%impersonation%' OR SQLERRM ILIKE '%Service-role actor%' OR SQLERRM ILIKE '%Unknown actor%'
     OR SQLERRM ILIKE '%immutable%' OR SQLERRM ILIKE '%Protected%' THEN RETURN true; END IF;
  RAISE; END; $$;

CREATE OR REPLACE FUNCTION ind_ticket(p_tag text)
RETURNS text LANGUAGE sql AS $$
  SELECT p_tag || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
$$;

-- Fixtures (owner): ticket + job + assigned job + visit
DO $$
DECLARE v_t uuid; v_j uuid; v_j2 uuid; v_v uuid;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', ind_ticket('IND-FIX'));
  SELECT (public.ensure_default_service_job(v_t, b1_uid('tech1'), 'Job 1', 'ind', NULL)).id INTO v_j;
  SELECT (public.create_service_job(v_t, 'Job 2', true, 'ind')).id INTO v_j2;
  SELECT (public.create_service_job_visit(v_j, 'ind', NULL)).id INTO v_v;
  PERFORM set_config('app.ind_t', v_t::text, false);
  PERFORM set_config('app.ind_j', v_j::text, false);
  PERFORM set_config('app.ind_j2', v_j2::text, false);
  PERFORM set_config('app.ind_v', v_v::text, false);
END $$;

-- I-01..I-08: anon + staff actor on EACH rpc (adversarial grant in place)
DO $$
DECLARE d boolean; ok boolean := true; det text := '';
BEGIN
  SET ROLE anon;
  PERFORM set_config('request.jwt.claim.role', 'anon', true);
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  PERFORM set_config('app.b1_uid', '', true);
  d := ind_denied(format($q$SELECT public.assign_service_job(%L::uuid, %L::uuid, 'x', %L::uuid)$q$, current_setting('app.ind_j2'), b1_uid('tech1'), b1_uid('support'))); ok := ok AND d; det := det || 'assign=' || d || ' ';
  d := ind_denied(format($q$SELECT public.decline_service_job(%L::uuid, 'x', %L::uuid)$q$, current_setting('app.ind_j'), b1_uid('tech1'))); ok := ok AND d; det := det || 'decline=' || d || ' ';
  d := ind_denied(format($q$SELECT public.ensure_default_service_job(%L::uuid, NULL, 'J', 'x', %L::uuid)$q$, current_setting('app.ind_t'), b1_uid('support'))); ok := ok AND d; det := det || 'ensure=' || d || ' ';
  d := ind_denied(format($q$SELECT public.govern_job_transition(%L::uuid, 'planned', 'x', %L::uuid)$q$, current_setting('app.ind_j2'), b1_uid('support'))); ok := ok AND d; det := det || 'jtrans=' || d || ' ';
  d := ind_denied(format($q$SELECT public.waive_service_job(%L::uuid, 'x', %L::uuid)$q$, current_setting('app.ind_j2'), b1_uid('support'))); ok := ok AND d; det := det || 'waive=' || d || ' ';
  d := ind_denied(format($q$SELECT public.create_service_job_visit(%L::uuid, 'x', %L::uuid)$q$, current_setting('app.ind_j2'), b1_uid('support'))); ok := ok AND d; det := det || 'mkvisit=' || d || ' ';
  d := ind_denied(format($q$SELECT public.govern_visit_transition(%L::uuid, 'in_progress', 'x', %L::uuid)$q$, current_setting('app.ind_v'), b1_uid('support'))); ok := ok AND d; det := det || 'vtrans=' || d || ' ';
  d := ind_denied(format($q$SELECT public.create_service_job(%L::uuid, 'x', true, 'x', %L::uuid)$q$, current_setting('app.ind_t'), b1_uid('support'))); ok := ok AND d; det := det || 'mkjob=' || d;
  RESET ROLE;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  PERFORM ind_note('I-01-08', ok, det);
EXCEPTION WHEN OTHERS THEN BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM ind_note('I-01-08', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- Strip adversarial grant (replicate migration section 8), then audit effective privs
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('create_service_job','ensure_default_service_job','assign_service_job','decline_service_job','govern_job_transition','waive_service_job','create_service_job_visit','govern_visit_transition','evaluate_ticket_workflow_prerequisites','govern_ticket_transition')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon', r.nspname, r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role', r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- I-09: cross-staff mismatch (admin caller + support actor) denied
DO $$
DECLARE d boolean;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('admin')::text, false);
  SET ROLE b1_auth;
  d := ind_denied(format($q$SELECT public.assign_service_job(%L::uuid, %L::uuid, 'x', %L::uuid)$q$, current_setting('app.ind_j2'), b1_uid('tech2'), b1_uid('support')));
  RESET ROLE;
  PERFORM ind_note('I-09', d, 'admin-caller+support-actor denied=' || d);
EXCEPTION WHEN OTHERS THEN BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM ind_note('I-09', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- I-10: tech resolves self, declines own job (legit) as b1_auth
DO $$
DECLARE v_state text; v_hist int;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  SET ROLE b1_auth;
  PERFORM public.decline_service_job(current_setting('app.ind_j')::uuid, 'overloaded', NULL);
  RESET ROLE;
  SELECT state INTO v_state FROM public.service_jobs WHERE id = current_setting('app.ind_j')::uuid;
  SELECT count(*) INTO v_hist FROM public.service_job_assignment_history WHERE job_id = current_setting('app.ind_j')::uuid AND action = 'decline';
  PERFORM ind_note('I-10', v_state = 'unassigned' AND v_hist = 1, 'state=' || v_state || ' hist=' || v_hist);
EXCEPTION WHEN OTHERS THEN BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM ind_note('I-10', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- I-11: service_role + unknown actor denied
DO $$
DECLARE d boolean;
BEGIN
  SET ROLE service_role;
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  PERFORM set_config('app.b1_uid', '', true);
  d := ind_denied(format($q$SELECT public.assign_service_job(%L::uuid, %L::uuid, 'x', %L::uuid)$q$, current_setting('app.ind_j2'), b1_uid('tech1'), '99999999-9999-9999-9999-999999999999'));
  RESET ROLE;
  PERFORM ind_note('I-11', d, 'unknown-actor denied=' || d);
EXCEPTION WHEN OTHERS THEN BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM ind_note('I-11', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- I-12: service_role + NULL actor on create denied with Service-role-actor message
DO $$
DECLARE msg text := '';
BEGIN
  SET ROLE service_role;
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  PERFORM set_config('app.b1_uid', '', true);
  BEGIN
    PERFORM public.create_service_job(current_setting('app.ind_t')::uuid, 'svc-null', true, 'x', NULL);
  EXCEPTION WHEN OTHERS THEN msg := SQLERRM; END;
  RESET ROLE;
  PERFORM ind_note('I-12', msg ILIKE '%Service-role actor required%', left(msg, 120));
EXCEPTION WHEN OTHERS THEN BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM ind_note('I-12', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- I-13: legit flow as b1_auth support: ensure2nd-ticket + assign + visit + transitions + waive
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_aud int; ok boolean := true; det text := '';
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SET ROLE b1_auth;
  BEGIN
    v_t := b1_mkticket('cust1', ind_ticket('IND-LEGIT'));
    SELECT (public.ensure_default_service_job(v_t, b1_uid('tech2'), 'Job 1', 'legit', NULL)).id INTO v_j;
    SELECT (public.create_service_job_visit(v_j, 'legit', NULL)).id INTO v_v;
    PERFORM public.govern_visit_transition(v_v, 'in_progress', 'legit', NULL);
    PERFORM public.govern_visit_transition(v_v, 'completed', 'legit', NULL);
    PERFORM public.govern_job_transition(v_j, 'in_progress', 'legit', NULL);
    PERFORM public.waive_service_job(current_setting('app.ind_j2')::uuid, 'not needed', NULL);
  EXCEPTION WHEN OTHERS THEN ok := false; det := SQLSTATE || ' ' || left(SQLERRM, 150); END;
  RESET ROLE;
  SELECT count(*) INTO v_aud FROM public.service_workflow_audit WHERE ticket_id = v_t;
  PERFORM ind_note('I-13', ok AND v_aud >= 4, 'ok=' || ok || ' aud=' || v_aud || ' ' || det);
EXCEPTION WHEN OTHERS THEN BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM ind_note('I-13', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- I-14: UPDATE/DELETE direct on jobs/visits/history/audit denied for b1_auth + service_role
DO $$
DECLARE ok boolean := true; det text := ''; d boolean;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SET ROLE b1_auth;
  d := ind_denied(format($q$UPDATE public.service_jobs SET title='hacked' WHERE id=%L::uuid$q$, current_setting('app.ind_j2'))); ok := ok AND d; det := det || 'authUpJob=' || d || ' ';
  d := ind_denied(format($q$DELETE FROM public.service_jobs WHERE id=%L::uuid$q$, current_setting('app.ind_j2'))); ok := ok AND d; det := det || 'authDelJob=' || d || ' ';
  d := ind_denied(format($q$UPDATE public.service_job_visits SET state='completed' WHERE id=%L::uuid$q$, current_setting('app.ind_v'))); ok := ok AND d; det := det || 'authUpVis=' || d || ' ';
  d := ind_denied(format($q$DELETE FROM public.service_workflow_audit WHERE ticket_id=%L::uuid$q$, current_setting('app.ind_t'))); ok := ok AND d; det := det || 'authDelAud=' || d || ' ';
  RESET ROLE;
  SET ROLE service_role;
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  d := ind_denied(format($q$UPDATE public.service_jobs SET title='hacked' WHERE id=%L::uuid$q$, current_setting('app.ind_j2'))); ok := ok AND d; det := det || 'svcUpJob=' || d || ' ';
  d := ind_denied(format($q$DELETE FROM public.service_job_visits WHERE id=%L::uuid$q$, current_setting('app.ind_v'))); ok := ok AND d; det := det || 'svcDelVis=' || d || ' ';
  d := ind_denied(format($q$INSERT INTO public.service_workflow_audit(ticket_id, entity_type, entity_id, actor_id, actor_role, action) VALUES (%L::uuid,'t',%L::uuid,%L::uuid,'support','forge')$q$, current_setting('app.ind_t'), current_setting('app.ind_j2'), b1_uid('support'))); ok := ok AND d; det := det || 'svcInsAud=' || d;
  RESET ROLE;
  PERFORM ind_note('I-14', ok, det);
EXCEPTION WHEN OTHERS THEN BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM ind_note('I-14', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- I-15: effective grants audit (post-strip)
DO $$
DECLARE n_anon int; n_auth int; n_svc int;
BEGIN
  SELECT count(*) INTO n_anon FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('create_service_job','ensure_default_service_job','assign_service_job','decline_service_job','govern_job_transition','waive_service_job','create_service_job_visit','govern_visit_transition','evaluate_ticket_workflow_prerequisites','govern_ticket_transition')
    AND has_function_privilege('anon', p.oid, 'EXECUTE');
  SELECT count(*) INTO n_auth FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('create_service_job','ensure_default_service_job','assign_service_job','decline_service_job','govern_job_transition','waive_service_job','create_service_job_visit','govern_visit_transition','evaluate_ticket_workflow_prerequisites','govern_ticket_transition')
    AND has_function_privilege('authenticated', p.oid, 'EXECUTE');
  SELECT count(*) INTO n_svc FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('create_service_job','ensure_default_service_job','assign_service_job','decline_service_job','govern_job_transition','waive_service_job','create_service_job_visit','govern_visit_transition','evaluate_ticket_workflow_prerequisites','govern_ticket_transition')
    AND has_function_privilege('service_role', p.oid, 'EXECUTE');
  PERFORM ind_note('I-15', n_anon = 0 AND n_auth = 11 AND n_svc = 11, 'anon=' || n_anon || ' auth=' || n_auth || ' svc=' || n_svc || ' (11 overloads: 10 names + govern_ticket_transition x2)');
END $$;

-- I-16 retired: use I-16C/I-16D/I-16E in spark_forge_probes.sql (correct columns,
-- full table family, completion-gate assertion). No I-16 row is recorded here.

-- I-17: Slice 0 regression — direct status/priority denied; tech-legit + svc-actor transitions work
DO $$
DECLARE d1 boolean; d2 boolean; ok boolean := true; det text := ''; v_t uuid; v_aud0 int; v_aud1 int;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', ind_ticket('IND-SLICE0'));
  PERFORM public.govern_ticket_transition(v_t, 'assigned', 'ind', NULL, b1_uid('support'));
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  SET ROLE b1_auth;
  d1 := ind_denied(format($q$UPDATE public.service_tickets SET status='resolved' WHERE id=%L::uuid$q$, v_t));
  d2 := ind_denied(format($q$UPDATE public.service_tickets SET priority='urgent' WHERE id=%L::uuid$q$, v_t));
  RESET ROLE;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT count(*) INTO v_aud0 FROM public.ticket_governance_audit WHERE ticket_id = v_t;
  PERFORM public.govern_ticket_assign(v_t, b1_uid('tech1'), 'ind', b1_uid('support'));
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  SET ROLE b1_auth;
  BEGIN
    PERFORM public.govern_ticket_transition(v_t, 'in_progress', 'ind', NULL, NULL);
  EXCEPTION WHEN OTHERS THEN ok := false; det := 'tech-legit: ' || SQLSTATE || ' ' || left(SQLERRM, 120); END;
  RESET ROLE;
  SET ROLE service_role;
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  PERFORM set_config('app.b1_uid', '', true);
  BEGIN
    PERFORM public.govern_ticket_transition(v_t, 'awaiting_parts', 'ind', NULL, b1_uid('support'));
  EXCEPTION WHEN OTHERS THEN ok := false; det := det || ' svc-actor: ' || SQLSTATE || ' ' || left(SQLERRM, 120); END;
  RESET ROLE;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT count(*) INTO v_aud1 FROM public.ticket_governance_audit WHERE ticket_id = v_t;
  PERFORM ind_note('I-17', d1 AND d2 AND ok AND v_aud1 > v_aud0, 'deny=' || d1 || '/' || d2 || ' legit=' || ok || ' audΔ=' || (v_aud1 - v_aud0) || ' ' || det);
EXCEPTION WHEN OTHERS THEN BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM ind_note('I-17', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- I-18: audit atomicity — failed assign leaves no partial history/audit
DO $$
DECLARE h0 int; a0 int; h1 int; a1 int;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT count(*) INTO h0 FROM public.service_job_assignment_history WHERE job_id = current_setting('app.ind_j2')::uuid;
  SELECT count(*) INTO a0 FROM public.service_workflow_audit WHERE entity_id = current_setting('app.ind_j2')::uuid;
  BEGIN
    PERFORM public.assign_service_job(current_setting('app.ind_j2')::uuid, '99999999-9999-9999-9999-999999999999', 'bad-tech', NULL);
  EXCEPTION WHEN OTHERS THEN NULL; END;
  SELECT count(*) INTO h1 FROM public.service_job_assignment_history WHERE job_id = current_setting('app.ind_j2')::uuid;
  SELECT count(*) INTO a1 FROM public.service_workflow_audit WHERE entity_id = current_setting('app.ind_j2')::uuid;
  PERFORM ind_note('I-18', h0 = h1 AND a0 = a1, 'hist=' || h0 || '->' || h1 || ' aud=' || a0 || '->' || a1);
END $$;

-- I-19: 4-arg overload gone; 4-arg-style call routes to 5-arg
DO $$
DECLARE n4 int; v_j uuid; ok boolean := false;
BEGIN
  SELECT count(*) INTO n4 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'create_service_job' AND pg_get_function_identity_arguments(p.oid) = 'uuid, text, boolean, text';
  PERFORM set_config('app.b1_uid', b1_uid('admin')::text, false);
  BEGIN
    SELECT (public.create_service_job(current_setting('app.ind_t')::uuid, 'compat4', true, 'compat')).id INTO v_j;
    ok := (v_j IS NOT NULL);
  EXCEPTION WHEN OTHERS THEN ok := false; END;
  PERFORM ind_note('I-19', n4 = 0 AND ok, 'old4arg=' || n4 || ' compat-call=' || ok);
END $$;

-- I-20: first-time activation SET by authenticated blocked; DEFINER set works (already in SEC6; re-assert)
DO $$
DECLARE v_t uuid; d boolean; a boolean;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', ind_ticket('IND-ACTSET'));
  SET ROLE b1_auth;
  d := ind_denied(format($q$UPDATE public.service_tickets SET workflow_activated_at = now(), workflow_activated_by = %L::uuid WHERE id = %L::uuid$q$, b1_uid('support'), v_t));
  RESET ROLE;
  PERFORM public.ensure_default_service_job(v_t, NULL, 'Job 1', 'actset', NULL);
  SELECT (workflow_activated_at IS NOT NULL) INTO a FROM public.service_tickets WHERE id = v_t;
  PERFORM ind_note('I-20', d AND a, 'client-set-denied=' || d || ' definer-set=' || a);
EXCEPTION WHEN OTHERS THEN BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM ind_note('I-20', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

SELECT check_id, status, detail FROM public.ind_eval ORDER BY check_id;
