-- Spark independent B4 battery (disposable only; never staging/prod).
-- Freeze: e83e7c2c614c45a279ddbc788c865da0588ca462
-- Chain: disposable_b1_base + boundary + tkt-sec2 + B1/B2/SEC/RLSx3/B3x5 + B4.
-- Role discipline: RPC calls as b1_auth (authenticated stand-in) unless noted.
-- Anon: SET ROLE anon + empty app.b1_uid. Service-role: SET ROLE service_role.

CREATE TABLE IF NOT EXISTS public.spk4_eval(check_id text PRIMARY KEY, status text NOT NULL, detail text);
TRUNCATE public.spk4_eval;

CREATE OR REPLACE FUNCTION spk4_note(p_id text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO public.spk4_eval(check_id, status, detail)
  VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, left(p_detail, 500))
  ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
END; $$;

CREATE OR REPLACE FUNCTION spk4_uid(n text) RETURNS uuid
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
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

-- Invoker-rights probe: preserves caller role/grants. Never SECURITY DEFINER.
CREATE OR REPLACE FUNCTION spk4_try(p_sql text, OUT o_ok boolean, OUT o_state text, OUT o_msg text)
RETURNS record LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
  EXECUTE p_sql; o_ok := true; o_state := '00000'; o_msg := '';
EXCEPTION WHEN OTHERS THEN o_ok := false; o_state := SQLSTATE; o_msg := left(SQLERRM, 300);
END; $$;

CREATE OR REPLACE FUNCTION spk4_as_client(p_uid uuid)
RETURNS void LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
  EXECUTE 'SET ROLE b1_auth';
  PERFORM set_config('app.b1_uid', COALESCE(p_uid::text, ''), false);
END; $$;

CREATE OR REPLACE FUNCTION spk4_as_role(p_role text, p_uid uuid)
RETURNS void LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
  EXECUTE format('SET ROLE %I', p_role);
  PERFORM set_config('app.b1_uid', COALESCE(p_uid::text, ''), false);
END; $$;

CREATE OR REPLACE FUNCTION spk4_reset()
RETURNS void LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
  EXECUTE 'RESET ROLE';
  PERFORM set_config('app.b1_uid', '', false);
END; $$;

CREATE OR REPLACE FUNCTION spk4_mk_completed_visit(p_tag text, p_tech text DEFAULT 'tech1', p_owner text DEFAULT 'cust1',
  OUT o_ticket uuid, OUT o_job uuid, OUT o_visit uuid)
RETURNS record LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
DECLARE
  v_s timestamptz := now() + interval '1 hour';
  v_e timestamptz := now() + interval '3 hours';
  v_att text;
BEGIN
  PERFORM set_config('app.b1_uid', spk4_uid('support')::text, false);
  INSERT INTO public.service_tickets (ticket_number, user_id, title, description, type, priority, status, assigned_to, assigned_by, assigned_at)
  VALUES ('SPK4-' || p_tag || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6),
    spk4_uid(p_owner), 'spk4', 'spk4', 'general', 'medium', 'assigned',
    spk4_uid(p_tech), spk4_uid('support'), now())
  RETURNING id INTO o_ticket;
  SELECT (public.create_service_job(o_ticket, 'SPK4 ' || p_tag, true, 'spk4')).id INTO o_job;
  PERFORM public.assign_service_job(o_job, spk4_uid(p_tech), 'spk4', NULL);
  SELECT (public.schedule_service_job_visit(o_job, v_s, v_e, 'spk4', NULL)).id INTO o_visit;
  v_att := public.b3_minimum_safety_attestation();
  PERFORM set_config('app.b1_uid', spk4_uid(p_tech)::text, false);
  PERFORM public.record_visit_safety_check(o_visit, 'passed', 'spk4', NULL, v_att);
  PERFORM public.start_service_job_visit(o_visit, NULL, v_att, 'spk4');
  PERFORM public.complete_service_job_visit(o_visit);
  PERFORM set_config('app.b1_uid', '', false);
END; $$;

CREATE OR REPLACE FUNCTION spk4_seed_evidence(p_path text)
RETURNS void LANGUAGE plpgsql
SET search_path = pg_catalog, public, storage AS $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('ticket-attachments', 'ticket-attachments', false)
  ON CONFLICT (id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'ticket-attachments' AND name = p_path) THEN
    INSERT INTO storage.objects (bucket_id, name) VALUES ('ticket-attachments', p_path);
  END IF;
END; $$;

-- Standard valid submit; caller sets role/GUC first. Returns revision id or raises.
CREATE OR REPLACE FUNCTION spk4_submit_valid(p_visit uuid, p_ev text, p_cid uuid, p_actor uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
DECLARE v_rev public.service_report_revisions;
BEGIN
  v_rev := public.submit_service_report_revision(
    p_visit, 'findings spk4', 'work spk4',
    '[{"hours":1.5,"description":"align"}]'::jsonb, false,
    'verified_fixed', NULL, 'I declare spk4.',
    ARRAY[p_ev], NULL, p_cid, p_actor);
  RETURN v_rev.id;
END; $$;

-- Evidence-denial probe (top-level: procedures cannot nest in DO).
CREATE OR REPLACE FUNCTION spk4_ev_denied(p_visit uuid, p_ev text[], OUT o_denied boolean, OUT o_state text)
RETURNS record LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
DECLARE r record;
BEGIN
  PERFORM spk4_as_client(spk4_uid('tech1'));
  SELECT * INTO r FROM spk4_try(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[{"hours":1,"description":"x"}]'::jsonb,false,'verified_fixed',NULL,'decl',%L::text[],NULL,%L::uuid,NULL)$q$,
    p_visit, p_ev, gen_random_uuid()));
  PERFORM spk4_reset();
  o_denied := NOT r.o_ok; o_state := r.o_state;
END; $$;

-- DEFINER wrapper: schema admin_private has no client USAGE by design, so the
-- readability matrix runs as owner with per-actor GUC (auth.uid() reads the
-- GUC, unaffected by DEFINER; helper does not consult current_user).
CREATE OR REPLACE FUNCTION spk4_can_read(p_path text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private, storage AS $$
  SELECT admin_private.can_read_ticket_attachment(p_path);
$$;

-- Q4-00 fixture sanity + first-start baseline (documents Cursor M4 'assigned' discrepancy)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_tkt text; v_job text; v_vs text; v_att uuid;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q00');
  SELECT status INTO v_tkt FROM public.service_tickets WHERE id = v_t;
  SELECT state INTO v_job FROM public.service_jobs WHERE id = v_j;
  SELECT state, attending_technician_id INTO v_vs, v_att FROM public.service_job_visits WHERE id = v_v;
  PERFORM spk4_note('Q4-00',
    v_tkt = 'in_progress' AND v_job = 'in_progress' AND v_vs = 'completed' AND v_att = spk4_uid('tech1'),
    format('ticket=%s job=%s visit=%s attending=%s', v_tkt, v_job, v_vs, v_att = spk4_uid('tech1')));
END $$;

-- Q4-01 attending-tech submit: rev1 + job awaiting_review + ticket unchanged + 2 audits
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; v_rev uuid; v_cid uuid := gen_random_uuid();
  v_job text; v_tkt text; v_n int; v_a int; r record;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q01');
  v_path := v_t::text || '/b4/q01.jpg';
  PERFORM spk4_seed_evidence(v_path);
  PERFORM spk4_as_client(spk4_uid('tech1'));
  SELECT * INTO r FROM spk4_try(format(
    $q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_v, v_path, v_cid));
  PERFORM spk4_reset();
  SELECT id INTO v_rev FROM public.service_report_revisions
  WHERE report_id = (SELECT id FROM public.service_reports WHERE visit_id = v_v) AND revision_number = 1;
  SELECT state INTO v_job FROM public.service_jobs WHERE id = v_j;
  SELECT status INTO v_tkt FROM public.service_tickets WHERE id = v_t;
  SELECT count(*) INTO v_n FROM public.service_reports WHERE visit_id = v_v;
  SELECT count(*) INTO v_a FROM public.service_workflow_audit
  WHERE ticket_id = v_t AND action IN ('job_transition', 'submit_report_revision');
  PERFORM spk4_note('Q4-01',
    r.o_ok AND v_rev IS NOT NULL AND v_n = 1 AND v_job = 'awaiting_review'
      AND v_tkt = 'in_progress' AND v_a = 2,
    format('ok=%s rev=%s roots=%s job=%s ticket=%s audits=%s msg=%s', r.o_ok, v_rev IS NOT NULL, v_n, v_job, v_tkt, v_a, r.o_msg));
END $$;

-- Q4-02 unrelated technician denied; no rows, no audit delta
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; r record; v_n0 int; v_a0 int; v_n1 int; v_a1 int;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q02');
  v_path := v_t::text || '/b4/q02.jpg';
  PERFORM spk4_seed_evidence(v_path);
  SELECT count(*) INTO v_n0 FROM public.service_report_revisions;
  SELECT count(*) INTO v_a0 FROM public.service_workflow_audit WHERE ticket_id = v_t;
  PERFORM spk4_as_client(spk4_uid('tech2'));
  SELECT * INTO r FROM spk4_try(format(
    $q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_v, v_path, gen_random_uuid()));
  PERFORM spk4_reset();
  SELECT count(*) INTO v_n1 FROM public.service_report_revisions;
  SELECT count(*) INTO v_a1 FROM public.service_workflow_audit WHERE ticket_id = v_t;
  PERFORM spk4_note('Q4-02',
    (NOT r.o_ok) AND r.o_state = '42501' AND v_n1 = v_n0 AND v_a1 = v_a0,
    format('denied=%s state=%s rows_same=%s audits_same=%s msg=%s', NOT r.o_ok, r.o_state, v_n1 = v_n0, v_a1 = v_a0, r.o_msg));
END $$;

-- Q4-03 staff cannot substitute: support/admin/sales/customer denied
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_path text; r record; ok_all boolean := true; det text := '';
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q03');
  v_path := v_t::text || '/b4/q03.jpg';
  PERFORM spk4_seed_evidence(v_path);
  PERFORM spk4_as_client(spk4_uid('support'));
  SELECT * INTO r FROM spk4_try(format($q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_v, v_path, gen_random_uuid()));
  ok_all := ok_all AND (NOT r.o_ok) AND r.o_state = '42501'; det := det || 'support:' || r.o_state || ' ';
  PERFORM spk4_reset();
  PERFORM spk4_as_client(spk4_uid('admin'));
  SELECT * INTO r FROM spk4_try(format($q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_v, v_path, gen_random_uuid()));
  ok_all := ok_all AND (NOT r.o_ok) AND r.o_state = '42501'; det := det || 'admin:' || r.o_state || ' ';
  PERFORM spk4_reset();
  PERFORM spk4_as_client(spk4_uid('sales'));
  SELECT * INTO r FROM spk4_try(format($q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_v, v_path, gen_random_uuid()));
  ok_all := ok_all AND (NOT r.o_ok) AND r.o_state = '42501'; det := det || 'sales:' || r.o_state || ' ';
  PERFORM spk4_reset();
  PERFORM spk4_as_client(spk4_uid('cust1'));
  SELECT * INTO r FROM spk4_try(format($q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_v, v_path, gen_random_uuid()));
  ok_all := ok_all AND (NOT r.o_ok) AND r.o_state = '42501'; det := det || 'cust1:' || r.o_state || ' ';
  PERFORM spk4_reset();
  PERFORM spk4_note('Q4-03', ok_all, det);
END $$;

-- Q4-04 anonymous denied on submit + getter; no data leak
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_path text; r1 record; r2 record;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q04');
  v_path := v_t::text || '/b4/q04.jpg';
  PERFORM spk4_seed_evidence(v_path);
  PERFORM spk4_as_role('anon', NULL);
  SELECT * INTO r1 FROM spk4_try(format(
    $q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_v, v_path, gen_random_uuid()));
  SELECT * INTO r2 FROM spk4_try(format(
    $q$SELECT public.get_service_report_for_visit(%L::uuid)$q$, v_v));
  PERFORM spk4_reset();
  PERFORM spk4_note('Q4-04',
    (NOT r1.o_ok) AND (NOT r2.o_ok) AND r1.o_state = '42501',
    format('submit=%s/%s getter=%s/%s', r1.o_ok, r1.o_state, r2.o_ok, r2.o_state));
END $$;

-- Q4-05 forged actor: tech2 session + p_actor_id=tech1 denied; no rows
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_path text; r record; v_n0 int; v_n1 int;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q05');
  v_path := v_t::text || '/b4/q05.jpg';
  PERFORM spk4_seed_evidence(v_path);
  SELECT count(*) INTO v_n0 FROM public.service_report_revisions;
  PERFORM spk4_as_client(spk4_uid('tech2'));
  SELECT * INTO r FROM spk4_try(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[{"hours":1,"description":"x"}]'::jsonb,false,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,%L::uuid)$q$,
    v_v, v_path, gen_random_uuid(), spk4_uid('tech1')));
  PERFORM spk4_reset();
  SELECT count(*) INTO v_n1 FROM public.service_report_revisions;
  PERFORM spk4_note('Q4-05',
    (NOT r.o_ok) AND v_n1 = v_n0,
    format('denied=%s state=%s rows_same=%s msg=%s', NOT r.o_ok, r.o_state, v_n1 = v_n0, r.o_msg));
END $$;

-- Q4-06 service-role delegation: valid p_actor_id should succeed per B1-B3 pattern
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_path text; r1 record; r2 record; v_by uuid;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q06');
  v_path := v_t::text || '/b4/q06.jpg';
  PERFORM spk4_seed_evidence(v_path);
  PERFORM spk4_as_role('service_role', NULL);
  SELECT * INTO r1 FROM spk4_try(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[{"hours":1,"description":"x"}]'::jsonb,false,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,%L::uuid)$q$,
    v_v, v_path, gen_random_uuid(), spk4_uid('tech1')));
  SELECT * INTO r2 FROM spk4_try(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[{"hours":1,"description":"x"}]'::jsonb,false,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$,
    v_v, v_path, gen_random_uuid()));
  PERFORM spk4_reset();
  SELECT submitted_by INTO v_by FROM public.service_report_revisions
  WHERE report_id = (SELECT id FROM public.service_reports WHERE visit_id = v_v)
  ORDER BY revision_number DESC LIMIT 1;
  PERFORM spk4_note('Q4-06',
    r1.o_ok AND (NOT r2.o_ok) AND v_by = spk4_uid('tech1'),
    format('delegated_ok=%s unattributed_denied=%s by=%s msg=%s', r1.o_ok, NOT r2.o_ok, v_by = spk4_uid('tech1'), r1.o_msg));
END $$;

-- Q4-07 corrected R4-05: reassign before submit; original attending tech submits, new assignee denied
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; r1 record; r2 record;
  v_by uuid; v_att uuid; v_ass uuid;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q07');
  v_path := v_t::text || '/b4/q07.jpg';
  PERFORM spk4_seed_evidence(v_path);
  PERFORM spk4_as_client(spk4_uid('support'));
  SELECT * INTO r1 FROM spk4_try(format(
    $q$SELECT public.assign_service_job(%L::uuid, %L::uuid, 'spk4 reassign', NULL)$q$, v_j, spk4_uid('tech2')));
  PERFORM spk4_reset();
  SELECT attending_technician_id INTO v_att FROM public.service_job_visits WHERE id = v_v;
  SELECT assigned_technician_id INTO v_ass FROM public.service_jobs WHERE id = v_j;
  PERFORM spk4_as_client(spk4_uid('tech1'));
  SELECT * INTO r2 FROM spk4_try(format(
    $q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_v, v_path, gen_random_uuid()));
  PERFORM spk4_reset();
  SELECT submitted_by INTO v_by FROM public.service_report_revisions
  WHERE report_id = (SELECT id FROM public.service_reports WHERE visit_id = v_v) LIMIT 1;
  PERFORM spk4_as_client(spk4_uid('tech2'));
  SELECT * INTO r1 FROM spk4_try(format(
    $q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_v, v_path, gen_random_uuid()));
  PERFORM spk4_reset();
  PERFORM spk4_note('Q4-07',
    v_att = spk4_uid('tech1') AND v_ass = spk4_uid('tech2')
      AND r2.o_ok AND v_by = spk4_uid('tech1') AND (NOT r1.o_ok),
    format('att_stays=%s ass_moves=%s orig_ok=%s by=%s new_denied=%s/%s',
      v_att = spk4_uid('tech1'), v_ass = spk4_uid('tech2'), r2.o_ok, v_by = spk4_uid('tech1'), NOT r1.o_ok, r1.o_state));
END $$;

-- Q4-07c full offboard (ticket+job reassigned):own-folder evidence still submits (historical
-- attendance authorizes the submit); ticket-folder evidence is denied per attachment model
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_tpath text; v_opath text; r1 record; r2 record; v_by uuid;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q07c');
  v_tpath := v_t::text || '/b4/q07c.jpg';
  v_opath := spk4_uid('tech1')::text || '/q07c.jpg';
  PERFORM spk4_seed_evidence(v_tpath);
  PERFORM spk4_seed_evidence(v_opath);
  PERFORM spk4_as_client(spk4_uid('support'));
  PERFORM public.assign_service_job(v_j, spk4_uid('tech2'), 'spk4', NULL);
  PERFORM spk4_reset();
  UPDATE public.service_tickets SET assigned_to = spk4_uid('tech2') WHERE id = v_t;
  PERFORM spk4_as_client(spk4_uid('tech1'));
  SELECT * INTO r1 FROM spk4_try(format(
    $q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_v, v_tpath, gen_random_uuid()));
  SELECT * INTO r2 FROM spk4_try(format(
    $q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_v, v_opath, gen_random_uuid()));
  PERFORM spk4_reset();
  SELECT submitted_by INTO v_by FROM public.service_report_revisions
  WHERE report_id = (SELECT id FROM public.service_reports WHERE visit_id = v_v) LIMIT 1;
  PERFORM spk4_note('Q4-07c',
    (NOT r1.o_ok) AND r1.o_state = '42501' AND r2.o_ok AND v_by = spk4_uid('tech1'),
    format('ticketfolder_denied=%s/%s ownfolder_ok=%s by=%s', NOT r1.o_ok, r1.o_state, r2.o_ok, v_by = spk4_uid('tech1')));
END $$;

-- Q4-08 true cross-ticket: tech1 submits on K2 visit attended by tech2 -> denied
DO $$
DECLARE
  v_t1 uuid; v_j1 uuid; v_v1 uuid; v_t2 uuid; v_j2 uuid; v_v2 uuid;
  v_path text; r record; v_n0 int; v_n1 int;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t1, v_j1, v_v1 FROM spk4_mk_completed_visit('q08a', 'tech1', 'cust1');
  SELECT * INTO v_t2, v_j2, v_v2 FROM spk4_mk_completed_visit('q08b', 'tech2', 'cust2');
  v_path := v_t2::text || '/b4/q08.jpg';
  PERFORM spk4_seed_evidence(v_path);
  SELECT count(*) INTO v_n0 FROM public.service_report_revisions;
  PERFORM spk4_as_client(spk4_uid('tech1'));
  SELECT * INTO r FROM spk4_try(format(
    $q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_v2, v_path, gen_random_uuid()));
  PERFORM spk4_reset();
  SELECT count(*) INTO v_n1 FROM public.service_report_revisions;
  PERFORM spk4_note('Q4-08',
    (NOT r.o_ok) AND r.o_state = '42501' AND v_n1 = v_n0,
    format('denied=%s state=%s rows_same=%s msg=%s', NOT r.o_ok, r.o_state, v_n1 = v_n0, r.o_msg));
END $$;

-- Q4-09 evidence negatives: cross-ticket, foreign folder, missing object, empty, traversal, absolute
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_t2 uuid; v_j2 uuid; v_v2 uuid;
  v_okp text; v_xp text; v_own text; r record; ok_all boolean := true; det text := '';
  v_n0 int; v_n1 int;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q09a', 'tech1', 'cust1');
  SELECT * INTO v_t2, v_j2, v_v2 FROM spk4_mk_completed_visit('q09b', 'tech2', 'cust2');
  v_okp := v_t::text || '/b4/q09.jpg';
  v_xp := v_t2::text || '/b4/q09x.jpg';
  v_own := spk4_uid('tech1')::text || '/q09own.jpg';
  PERFORM spk4_seed_evidence(v_okp);
  PERFORM spk4_seed_evidence(v_xp);
  PERFORM spk4_seed_evidence(v_own);
  SELECT count(*) INTO v_n0 FROM public.service_report_revisions;
  SELECT * INTO r FROM spk4_ev_denied(v_v, ARRAY[v_xp]);
  ok_all := ok_all AND r.o_denied; det := det || 'crossticket:' || r.o_state || ' ';
  SELECT * INTO r FROM spk4_ev_denied(v_v, ARRAY[spk4_uid('tech2')::text || '/evil.jpg']);
  ok_all := ok_all AND r.o_denied; det := det || 'foreignfolder:' || r.o_state || ' ';
  SELECT * INTO r FROM spk4_ev_denied(v_v, ARRAY[v_t::text || '/b4/missing.jpg']);
  ok_all := ok_all AND r.o_denied; det := det || 'missingobj:' || r.o_state || ' ';
  SELECT * INTO r FROM spk4_ev_denied(v_v, ARRAY[]::text[]);
  ok_all := ok_all AND r.o_denied; det := det || 'empty:' || r.o_state || ' ';
  SELECT * INTO r FROM spk4_ev_denied(v_v, ARRAY[v_t::text || '/../escape.jpg']);
  ok_all := ok_all AND r.o_denied; det := det || 'traversal:' || r.o_state || ' ';
  SELECT * INTO r FROM spk4_ev_denied(v_v, ARRAY['/' || v_t::text || '/abs.jpg']);
  ok_all := ok_all AND r.o_denied; det := det || 'absolute:' || r.o_state || ' ';
  SELECT * INTO r FROM spk4_ev_denied(v_v, ARRAY[v_okp, v_xp]);
  ok_all := ok_all AND r.o_denied; det := det || 'mixed:' || r.o_state || ' ';
  SELECT count(*) INTO v_n1 FROM public.service_report_revisions;
  PERFORM spk4_note('Q4-09', ok_all AND v_n1 = v_n0, det || format('rows_same=%s', v_n1 = v_n0));
END $$;

-- Q4-10 submitter-folder evidence positive
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_path text; r record; v_n int;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q10');
  v_path := spk4_uid('tech1')::text || '/q10.jpg';
  PERFORM spk4_seed_evidence(v_path);
  PERFORM spk4_as_client(spk4_uid('tech1'));
  SELECT * INTO r FROM spk4_try(format(
    $q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_v, v_path, gen_random_uuid()));
  PERFORM spk4_reset();
  SELECT count(*) INTO v_n FROM public.service_report_revisions
  WHERE report_id = (SELECT id FROM public.service_reports WHERE visit_id = v_v);
  PERFORM spk4_note('Q4-10', r.o_ok AND v_n = 1, format('ok=%s rows=%s msg=%s', r.o_ok, v_n, r.o_msg));
END $$;

-- Q4-10b post-reassign submit with submitter-folder evidence (workaround path)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_path text; r record; v_by uuid;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q10b');
  v_path := spk4_uid('tech1')::text || '/q10b.jpg';
  PERFORM spk4_seed_evidence(v_path);
  PERFORM spk4_as_client(spk4_uid('support'));
  PERFORM public.assign_service_job(v_j, spk4_uid('tech2'), 'spk4', NULL);
  PERFORM spk4_reset();
  PERFORM spk4_as_client(spk4_uid('tech1'));
  SELECT * INTO r FROM spk4_try(format(
    $q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_v, v_path, gen_random_uuid()));
  PERFORM spk4_reset();
  SELECT submitted_by INTO v_by FROM public.service_report_revisions
  WHERE report_id = (SELECT id FROM public.service_reports WHERE visit_id = v_v) LIMIT 1;
  PERFORM spk4_note('Q4-10b', r.o_ok AND v_by = spk4_uid('tech1'),
    format('ok=%s by=%s msg=%s', r.o_ok, v_by = spk4_uid('tech1'), r.o_msg));
END $$;

-- Q4-11 required-field negatives (each denied, no revision)
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; r record; ok_all boolean := true; det text := '';
  v_n0 int; v_n1 int;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q11');
  v_path := v_t::text || '/b4/q11.jpg';
  PERFORM spk4_seed_evidence(v_path);
  SELECT count(*) INTO v_n0 FROM public.service_report_revisions;
  PERFORM spk4_as_client(spk4_uid('tech1'));
  -- blank findings
  SELECT * INTO r FROM spk4_try(format($q$SELECT public.submit_service_report_revision(%L::uuid,'  ','w','[{"hours":1,"description":"x"}]'::jsonb,false,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$, v_v, v_path, gen_random_uuid()));
  ok_all := ok_all AND NOT r.o_ok; det := det || 'findings:' || r.o_state || ' ';
  -- blank work
  SELECT * INTO r FROM spk4_try(format($q$SELECT public.submit_service_report_revision(%L::uuid,'f','', '[{"hours":1,"description":"x"}]'::jsonb,false,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$, v_v, v_path, gen_random_uuid()));
  ok_all := ok_all AND NOT r.o_ok; det := det || 'work:' || r.o_state || ' ';
  -- blank declaration
  SELECT * INTO r FROM spk4_try(format($q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[{"hours":1,"description":"x"}]'::jsonb,false,'verified_fixed',NULL,' ',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$, v_v, v_path, gen_random_uuid()));
  ok_all := ok_all AND NOT r.o_ok; det := det || 'decl:' || r.o_state || ' ';
  -- bad outcome
  SELECT * INTO r FROM spk4_try(format($q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[{"hours":1,"description":"x"}]'::jsonb,false,'bogus',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$, v_v, v_path, gen_random_uuid()));
  ok_all := ok_all AND NOT r.o_ok; det := det || 'outcome:' || r.o_state || ' ';
  -- missing reason for non-fixed
  SELECT * INTO r FROM spk4_try(format($q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[{"hours":1,"description":"x"}]'::jsonb,false,'not_verified',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$, v_v, v_path, gen_random_uuid()));
  ok_all := ok_all AND NOT r.o_ok; det := det || 'reason:' || r.o_state || ' ';
  -- empty labour without no_labour
  SELECT * INTO r FROM spk4_try(format($q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[]'::jsonb,false,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$, v_v, v_path, gen_random_uuid()));
  ok_all := ok_all AND NOT r.o_ok; det := det || 'labempty:' || r.o_state || ' ';
  -- labour with no_labour
  SELECT * INTO r FROM spk4_try(format($q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[{"hours":1,"description":"x"}]'::jsonb,true,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$, v_v, v_path, gen_random_uuid()));
  ok_all := ok_all AND NOT r.o_ok; det := det || 'labxor:' || r.o_state || ' ';
  -- zero hours
  SELECT * INTO r FROM spk4_try(format($q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[{"hours":0,"description":"x"}]'::jsonb,false,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$, v_v, v_path, gen_random_uuid()));
  ok_all := ok_all AND NOT r.o_ok; det := det || 'hours0:' || r.o_state || ' ';
  -- blank description
  SELECT * INTO r FROM spk4_try(format($q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[{"hours":1,"description":"  "}]'::jsonb,false,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$, v_v, v_path, gen_random_uuid()));
  ok_all := ok_all AND NOT r.o_ok; det := det || 'desc:' || r.o_state || ' ';
  -- non-numeric hours
  SELECT * INTO r FROM spk4_try(format($q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[{"hours":"many","description":"x"}]'::jsonb,false,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$, v_v, v_path, gen_random_uuid()));
  ok_all := ok_all AND NOT r.o_ok; det := det || 'hoursNaN:' || r.o_state || ' ';
  PERFORM spk4_reset();
  SELECT count(*) INTO v_n1 FROM public.service_report_revisions;
  PERFORM spk4_note('Q4-11', ok_all AND v_n1 = v_n0, det || format('rows_same=%s', v_n1 = v_n0));
END $$;

-- Q4-12 positives: no_labour + not_verified with reason
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_path text; r1 record; r2 record; v_nl boolean; v_vo text;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q12');
  v_path := v_t::text || '/b4/q12.jpg';
  PERFORM spk4_seed_evidence(v_path);
  PERFORM spk4_as_client(spk4_uid('tech1'));
  SELECT * INTO r1 FROM spk4_try(format($q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[]'::jsonb,true,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$, v_v, v_path, gen_random_uuid()));
  SELECT * INTO r2 FROM spk4_try(format($q$SELECT public.submit_service_report_revision(%L::uuid,'f2','w2','[{"hours":2,"description":"y"}]'::jsonb,false,'not_verified','could not reproduce on site','decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$, v_v, v_path, gen_random_uuid()));
  PERFORM spk4_reset();
  SELECT no_labour INTO v_nl FROM public.service_report_revisions
  WHERE report_id = (SELECT id FROM public.service_reports WHERE visit_id = v_v) AND revision_number = 1;
  SELECT verification_outcome INTO v_vo FROM public.service_report_revisions
  WHERE report_id = (SELECT id FROM public.service_reports WHERE visit_id = v_v) AND revision_number = 2;
  PERFORM spk4_note('Q4-12',
    r1.o_ok AND r2.o_ok AND v_nl IS TRUE AND v_vo = 'not_verified',
    format('nolab=%s nonfixed=%s states=%s/%s', r1.o_ok, r2.o_ok, r1.o_state, r2.o_state));
END $$;

-- Q4-13 pinned-routine checklist contract
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; r record; ok_all boolean := true; det text := '';
  v_pin uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_chk jsonb;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q13');
  UPDATE public.service_job_visits SET pinned_routine_version_id = v_pin WHERE id = v_v;
  v_path := v_t::text || '/b4/q13.jpg';
  PERFORM spk4_seed_evidence(v_path);
  PERFORM spk4_as_client(spk4_uid('tech1'));
  -- pinned + NULL checklist denied
  SELECT * INTO r FROM spk4_try(format($q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[]'::jsonb,true,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$, v_v, v_path, gen_random_uuid()));
  ok_all := ok_all AND NOT r.o_ok; det := det || 'pin_null:' || r.o_state || ' ';
  -- pinned + mismatched version denied
  SELECT * INTO r FROM spk4_try(format($q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[]'::jsonb,true,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],%L::jsonb,%L::uuid,NULL)$q$, v_v, v_path, '{"routine_version_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","items":[]}', gen_random_uuid()));
  ok_all := ok_all AND NOT r.o_ok; det := det || 'pin_mismatch:' || r.o_state || ' ';
  -- pinned + items not array denied
  SELECT * INTO r FROM spk4_try(format($q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[]'::jsonb,true,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],%L::jsonb,%L::uuid,NULL)$q$, v_v, v_path, '{"routine_version_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","items":{}}', gen_random_uuid()));
  ok_all := ok_all AND NOT r.o_ok; det := det || 'pin_items:' || r.o_state || ' ';
  -- pinned + valid succeeds
  SELECT * INTO r FROM spk4_try(format($q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[]'::jsonb,true,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],%L::jsonb,%L::uuid,NULL)$q$, v_v, v_path, '{"routine_version_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","items":[{"id":"c1","result":"ok"}]}', gen_random_uuid()));
  ok_all := ok_all AND r.o_ok; det := det || 'pin_ok:' || r.o_state || ' ';
  PERFORM spk4_reset();
  SELECT checklist_results INTO v_chk FROM public.service_job_visits WHERE id = v_v;
  ok_all := ok_all AND v_chk IS NOT NULL AND (v_chk ? 'items');
  -- unpinned + checklist denied (fresh fixture)
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q13b');
  v_path := v_t::text || '/b4/q13b.jpg';
  PERFORM spk4_seed_evidence(v_path);
  PERFORM spk4_as_client(spk4_uid('tech1'));
  SELECT * INTO r FROM spk4_try(format($q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[]'::jsonb,true,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],%L::jsonb,%L::uuid,NULL)$q$, v_v, v_path, '{"routine_version_id":"x","items":[]}', gen_random_uuid()));
  ok_all := ok_all AND NOT r.o_ok; det := det || 'unpin_chk:' || r.o_state;
  PERFORM spk4_reset();
  PERFORM spk4_note('Q4-13', ok_all, det);
END $$;

-- Q4-14 idempotent retry: same key + same payload -> same revision, audit unchanged
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; v_cid uuid := gen_random_uuid();
  v_r1 uuid; v_r2 uuid; v_a0 int; v_a1 int; v_n int; r record;
  v_act0 text; v_act1 text;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q14');
  v_path := v_t::text || '/b4/q14.jpg';
  PERFORM spk4_seed_evidence(v_path);
  PERFORM spk4_as_client(spk4_uid('tech1'));
  SELECT * INTO r FROM spk4_try(format($q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_v, v_path, v_cid));
  PERFORM spk4_reset();
  SELECT id INTO v_r1 FROM public.service_report_revisions
  WHERE report_id = (SELECT id FROM public.service_reports WHERE visit_id = v_v);
  SELECT count(*), string_agg(action, ',' ORDER BY created_at, id) INTO v_a0, v_act0
  FROM public.service_workflow_audit WHERE ticket_id = v_t;
  PERFORM spk4_as_client(spk4_uid('tech1'));
  SELECT * INTO r FROM spk4_try(format($q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_v, v_path, v_cid));
  PERFORM spk4_reset();
  SELECT count(*) INTO v_n FROM public.service_report_revisions
  WHERE report_id = (SELECT id FROM public.service_reports WHERE visit_id = v_v);
  SELECT count(*), string_agg(action, ',' ORDER BY created_at, id) INTO v_a1, v_act1
  FROM public.service_workflow_audit WHERE ticket_id = v_t;
  SELECT id INTO v_r2 FROM public.service_report_revisions
  WHERE report_id = (SELECT id FROM public.service_reports WHERE visit_id = v_v) AND client_submission_id = v_cid;
  PERFORM spk4_note('Q4-14',
    r.o_ok AND v_n = 1 AND v_r1 = v_r2 AND v_a1 = v_a0,
    format('retry_ok=%s single=%s same=%s a0=%s a1=%s acts1=%s', r.o_ok, v_n = 1, v_r1 = v_r2, v_a0, v_a1, v_act1));
END $$;

-- Q4-15 conflicting retry: same key + different payload -> first wins silently, single row
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; v_cid uuid := gen_random_uuid();
  v_f text; v_n int; r record;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q15');
  v_path := v_t::text || '/b4/q15.jpg';
  PERFORM spk4_seed_evidence(v_path);
  PERFORM spk4_as_client(spk4_uid('tech1'));
  PERFORM spk4_submit_valid(v_v, v_path, v_cid);
  SELECT * INTO r FROM spk4_try(format($q$SELECT public.submit_service_report_revision(%L::uuid,'CHANGED','CHANGED','[{"hours":9,"description":"changed"}]'::jsonb,false,'not_verified','x','decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$, v_v, v_path, v_cid));
  PERFORM spk4_reset();
  SELECT findings, count(*) OVER () INTO v_f, v_n FROM public.service_report_revisions
  WHERE report_id = (SELECT id FROM public.service_reports WHERE visit_id = v_v) LIMIT 1;
  PERFORM spk4_note('Q4-15',
    r.o_ok AND v_n = 1 AND v_f = 'findings spk4',
    format('retry_ok=%s single=%s first_wins=%s', r.o_ok, v_n = 1, v_f = 'findings spk4'));
END $$;

-- Q4-16 same key on different visit -> independent revision (key scoped per report)
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_vb uuid; v_s timestamptz; v_e timestamptz;
  v_path text; v_cid uuid := gen_random_uuid(); v_n int; r1 record; r2 record; v_att text;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q16');
  v_path := v_t::text || '/b4/q16.jpg';
  PERFORM spk4_seed_evidence(v_path);
  -- second completed visit on same job
  v_s := now() + interval '5 hours'; v_e := now() + interval '7 hours';
  PERFORM set_config('app.b1_uid', spk4_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_s, v_e, 'spk4', NULL)).id INTO v_vb;
  v_att := public.b3_minimum_safety_attestation();
  PERFORM set_config('app.b1_uid', spk4_uid('tech1')::text, false);
  PERFORM public.record_visit_safety_check(v_vb, 'passed', 'spk4', NULL, v_att);
  PERFORM public.start_service_job_visit(v_vb, NULL, v_att, 'spk4');
  PERFORM public.complete_service_job_visit(v_vb);
  PERFORM set_config('app.b1_uid', '', false);
  PERFORM spk4_as_client(spk4_uid('tech1'));
  SELECT * INTO r1 FROM spk4_try(format($q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_v, v_path, v_cid));
  SELECT * INTO r2 FROM spk4_try(format($q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_vb, v_path, v_cid));
  PERFORM spk4_reset();
  SELECT count(*) INTO v_n FROM public.service_report_revisions WHERE client_submission_id = v_cid;
  PERFORM spk4_note('Q4-16', r1.o_ok AND r2.o_ok AND v_n = 2,
    format('both_ok=%s/%s rows=%s', r1.o_ok, r2.o_ok, v_n));
END $$;

-- Q4-19 direct writes denied for client/anon/service_role; state unchanged; privilege matrix
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; v_rep uuid; v_rev uuid;
  r record; ok_all boolean := true; det text := ''; v_f0 text; v_f1 text;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q19');
  v_path := v_t::text || '/b4/q19.jpg';
  PERFORM spk4_seed_evidence(v_path);
  PERFORM spk4_as_client(spk4_uid('tech1'));
  PERFORM spk4_submit_valid(v_v, v_path, gen_random_uuid());
  PERFORM spk4_reset();
  SELECT id INTO v_rep FROM public.service_reports WHERE visit_id = v_v;
  SELECT id, findings INTO v_rev, v_f0 FROM public.service_report_revisions WHERE report_id = v_rep;
  -- own-row UPDATE as attending tech client
  PERFORM spk4_as_client(spk4_uid('tech1'));
  SELECT * INTO r FROM spk4_try(format($q$UPDATE public.service_report_revisions SET findings='HACK' WHERE id=%L::uuid$q$, v_rev));
  ok_all := ok_all AND NOT r.o_ok; det := det || 'tech_upd:' || r.o_state || ' ';
  SELECT * INTO r FROM spk4_try(format($q$DELETE FROM public.service_report_revisions WHERE id=%L::uuid$q$, v_rev));
  ok_all := ok_all AND NOT r.o_ok; det := det || 'tech_del:' || r.o_state || ' ';
  SELECT * INTO r FROM spk4_try(format($q$INSERT INTO public.service_report_revisions(report_id,revision_number,findings,work_performed,labour,no_labour,verification_outcome,technician_declaration,submitted_by) VALUES (%L::uuid,99,'x','x','[]'::jsonb,true,'verified_fixed','x',%L::uuid)$q$, v_rep, spk4_uid('tech1')));
  ok_all := ok_all AND NOT r.o_ok; det := det || 'tech_ins:' || r.o_state || ' ';
  PERFORM spk4_reset();
  -- anon
  PERFORM spk4_as_role('anon', NULL);
  SELECT * INTO r FROM spk4_try(format($q$UPDATE public.service_report_revisions SET findings='HACK' WHERE id=%L::uuid$q$, v_rev));
  ok_all := ok_all AND NOT r.o_ok; det := det || 'anon_upd:' || r.o_state || ' ';
  PERFORM spk4_reset();
  -- service_role direct write (revoke is grant-level; RLS bypass does not help)
  PERFORM spk4_as_role('service_role', NULL);
  SELECT * INTO r FROM spk4_try(format($q$UPDATE public.service_report_revisions SET findings='HACK' WHERE id=%L::uuid$q$, v_rev));
  ok_all := ok_all AND NOT r.o_ok; det := det || 'svc_upd:' || r.o_state || ' ';
  SELECT * INTO r FROM spk4_try(format($q$DELETE FROM public.service_reports WHERE id=%L::uuid$q$, v_rep));
  ok_all := ok_all AND NOT r.o_ok; det := det || 'svc_del:' || r.o_state || ' ';
  PERFORM spk4_reset();
  SELECT findings INTO v_f1 FROM public.service_report_revisions WHERE id = v_rev;
  -- privilege matrix (grant-level truth)
  ok_all := ok_all
    AND NOT has_table_privilege('authenticated', 'public.service_report_revisions', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.service_report_revisions', 'UPDATE')
    AND NOT has_table_privilege('authenticated', 'public.service_report_revisions', 'DELETE')
    AND NOT has_table_privilege('anon', 'public.service_report_revisions', 'INSERT')
    AND NOT has_table_privilege('service_role', 'public.service_report_revisions', 'UPDATE')
    AND NOT has_table_privilege('service_role', 'public.service_reports', 'DELETE')
    AND has_table_privilege('authenticated', 'public.service_report_revisions', 'SELECT');
  PERFORM spk4_note('Q4-19', ok_all AND v_f0 = v_f1,
    det || format('unchanged=%s privs_ok', v_f0 = v_f1));
END $$;

-- Q4-20 append-only second revision; r1 byte-identical
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; v_r1 uuid; v_r2 uuid;
  v_f1a text; v_f1b text; v_n1 int; v_n2 int; v_job text; r1 record; r2 record;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q20');
  v_path := v_t::text || '/b4/q20.jpg';
  PERFORM spk4_seed_evidence(v_path);
  PERFORM spk4_as_client(spk4_uid('tech1'));
  SELECT * INTO r1 FROM spk4_try(format($q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_v, v_path, gen_random_uuid()));
  SELECT id, findings INTO v_r1, v_f1a FROM public.service_report_revisions
  WHERE report_id = (SELECT id FROM public.service_reports WHERE visit_id = v_v) AND revision_number = 1;
  SELECT * INTO r2 FROM spk4_try(format($q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_v, v_path, gen_random_uuid()));
  PERFORM spk4_reset();
  SELECT id, findings, revision_number INTO v_r2, v_f1b, v_n1 FROM public.service_report_revisions WHERE id = v_r1;
  SELECT revision_number INTO v_n2 FROM public.service_report_revisions
  WHERE report_id = (SELECT id FROM public.service_reports WHERE visit_id = v_v) AND revision_number = 2;
  SELECT state INTO v_job FROM public.service_jobs WHERE id = v_j;
  PERFORM spk4_note('Q4-20',
    r1.o_ok AND r2.o_ok AND v_r1 IS NOT NULL AND v_n1 = 1 AND v_n2 = 2
      AND v_f1a = v_f1b AND v_job = 'awaiting_review',
    format('ok=%s/%s r1_same=%s nums=%s/%s job=%s', r1.o_ok, r2.o_ok, v_f1a = v_f1b, v_n1, v_n2, v_job));
END $$;

-- Q4-21 audit-write failure rolls back report + job transition (no partial success)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_path text; r record; v_reps int; v_revs int; v_job text;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q21');
  v_path := v_t::text || '/b4/q21.jpg';
  PERFORM spk4_seed_evidence(v_path);
  CREATE OR REPLACE FUNCTION spk4_audit_bomb() RETURNS trigger LANGUAGE plpgsql AS $t$
  BEGIN RAISE EXCEPTION 'spk4 injected audit failure' USING ERRCODE = 'P0001'; END; $t$;
  CREATE TRIGGER spk4_audit_bomb_trg BEFORE INSERT ON public.service_workflow_audit
  FOR EACH ROW EXECUTE FUNCTION spk4_audit_bomb();
  PERFORM spk4_as_client(spk4_uid('tech1'));
  SELECT * INTO r FROM spk4_try(format($q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_v, v_path, gen_random_uuid()));
  PERFORM spk4_reset();
  DROP TRIGGER spk4_audit_bomb_trg ON public.service_workflow_audit;
  DROP FUNCTION spk4_audit_bomb();
  SELECT count(*) INTO v_reps FROM public.service_reports WHERE visit_id = v_v;
  SELECT count(*) INTO v_revs FROM public.service_report_revisions
  WHERE report_id IN (SELECT id FROM public.service_reports WHERE visit_id = v_v);
  SELECT state INTO v_job FROM public.service_jobs WHERE id = v_j;
  PERFORM spk4_note('Q4-21',
    (NOT r.o_ok) AND v_reps = 0 AND v_revs = 0 AND v_job = 'in_progress',
    format('failed=%s roots=%s revs=%s job=%s msg=%s', NOT r.o_ok, v_reps, v_revs, v_job, left(r.o_msg, 80)));
END $$;

-- Q4-22 customer denied unissued content; getter must match RLS (predict RPC leak)
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; r record;
  v_direct int; v_nrevs int; v_ev_leak boolean := false;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q22');
  v_path := v_t::text || '/b4/q22.jpg';
  PERFORM spk4_seed_evidence(v_path);
  PERFORM spk4_as_client(spk4_uid('tech1'));
  PERFORM spk4_submit_valid(v_v, v_path, gen_random_uuid());
  PERFORM spk4_reset();
  -- direct SELECT as owner: RLS must hide unissued revisions
  PERFORM spk4_as_client(spk4_uid('cust1'));
  SELECT count(*) INTO v_direct FROM public.service_report_revisions
  WHERE report_id = (SELECT id FROM public.service_reports WHERE visit_id = v_v);
  -- getter as owner
  SELECT * INTO r FROM spk4_try(format($q$SELECT public.get_service_report_for_visit(%L::uuid)$q$, v_v));
  IF r.o_ok THEN
    SELECT jsonb_array_length(COALESCE((public.get_service_report_for_visit(v_v)->'revisions'), '[]'::jsonb)) INTO v_nrevs;
    v_ev_leak := v_nrevs > 0;
  ELSE
    v_nrevs := -1;
  END IF;
  PERFORM spk4_reset();
  PERFORM spk4_note('Q4-22',
    v_direct = 0 AND (NOT r.o_ok OR NOT v_ev_leak),
    format('direct_rows=%s getter_ok=%s getter_revs=%s state=%s', v_direct, r.o_ok, v_nrevs, r.o_state));
END $$;

-- Q4-23 no review/issue path in B4; submits create no reviews; no issue RPC
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_path text; v_rv int; v_issue int; v_tkt0 text; v_tkt1 text;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q23');
  v_path := v_t::text || '/b4/q23.jpg';
  PERFORM spk4_seed_evidence(v_path);
  SELECT status INTO v_tkt0 FROM public.service_tickets WHERE id = v_t;
  PERFORM spk4_as_client(spk4_uid('tech1'));
  PERFORM spk4_submit_valid(v_v, v_path, gen_random_uuid());
  PERFORM spk4_submit_valid(v_v, v_path, gen_random_uuid());
  PERFORM spk4_reset();
  SELECT count(*) INTO v_rv FROM public.service_report_reviews;
  SELECT count(*) INTO v_issue FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('issue_service_report_revision', 'review_service_report_revision',
      'approve_service_report_revision', 'return_service_report_revision');
  SELECT status INTO v_tkt1 FROM public.service_tickets WHERE id = v_t;
  PERFORM spk4_note('Q4-23',
    v_rv = 0 AND v_issue = 0 AND v_tkt0 = v_tkt1,
    format('reviews=%s issue_rpcs=%s ticket_stable=%s(%s)', v_rv, v_issue, v_tkt0 = v_tkt1, v_tkt1));
END $$;

-- Q4-24 premature completion/closure denied (no issued revision exists in B4)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_path text; r1 record; r2 record; v_job text; v_tkt text;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q24');
  v_path := v_t::text || '/b4/q24.jpg';
  PERFORM spk4_seed_evidence(v_path);
  PERFORM spk4_as_client(spk4_uid('tech1'));
  PERFORM spk4_submit_valid(v_v, v_path, gen_random_uuid());
  PERFORM spk4_reset();
  PERFORM spk4_as_client(spk4_uid('support'));
  SELECT * INTO r1 FROM spk4_try(format($q$SELECT public.govern_job_transition(%L::uuid,'completed','spk4',NULL)$q$, v_j));
  SELECT * INTO r2 FROM spk4_try(format($q$SELECT public.govern_ticket_transition(%L::uuid,'closed','spk4',NULL)$q$, v_t));
  PERFORM spk4_reset();
  SELECT state INTO v_job FROM public.service_jobs WHERE id = v_j;
  SELECT status INTO v_tkt FROM public.service_tickets WHERE id = v_t;
  PERFORM spk4_note('Q4-24',
    (NOT r1.o_ok) AND (NOT r2.o_ok) AND v_job = 'awaiting_review' AND v_tkt = 'in_progress',
    format('jobcomplete=%s/%s ticketclose=%s/%s job=%s ticket=%s', NOT r1.o_ok, r1.o_state, NOT r2.o_ok, r2.o_state, v_job, v_tkt));
END $$;

-- Q4-26 B1-B3 targeted regressions: start authz, safety ack, decline smoke
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_s timestamptz; v_e timestamptz; v_vs uuid;
  v_att text; r1 record; r2 record; r3 record; r4 record; v_st text;
BEGIN
  PERFORM spk4_reset();
  PERFORM set_config('app.b1_uid', spk4_uid('support')::text, false);
  INSERT INTO public.service_tickets (ticket_number, user_id, title, description, type, priority, status, assigned_to, assigned_by, assigned_at)
  VALUES ('SPK4-q26-' || substr(replace(gen_random_uuid()::text,'-',''),1,6),
    spk4_uid('cust1'), 'spk4', 'spk4', 'general', 'medium', 'assigned', spk4_uid('tech1'), spk4_uid('support'), now())
  RETURNING id INTO v_t;
  SELECT (public.create_service_job(v_t, 'SPK4 q26', true, 'spk4')).id INTO v_j;
  PERFORM public.assign_service_job(v_j, spk4_uid('tech1'), 'spk4', NULL);
  v_s := now() + interval '1 hour'; v_e := now() + interval '3 hours';
  SELECT (public.schedule_service_job_visit(v_j, v_s, v_e, 'spk4', NULL)).id INTO v_vs;
  v_att := public.b3_minimum_safety_attestation();
  PERFORM set_config('app.b1_uid', '', false);
  -- unrelated tech start denied
  PERFORM spk4_as_client(spk4_uid('tech2'));
  SELECT * INTO r1 FROM spk4_try(format($q$SELECT public.start_service_job_visit(%L::uuid, NULL, %L, 'spk4')$q$, v_vs, v_att));
  -- start without attestation denied
  PERFORM spk4_as_client(spk4_uid('tech1'));
  SELECT * INTO r2 FROM spk4_try(format($q$SELECT public.start_service_job_visit(%L::uuid, NULL, NULL, 'spk4')$q$, v_vs));
  PERFORM spk4_reset();
  -- decline smoke on a second job (no active visit)
  PERFORM set_config('app.b1_uid', spk4_uid('support')::text, false);
  SELECT (public.create_service_job(v_t, 'SPK4 q26b', true, 'spk4')).id INTO v_j;
  PERFORM public.assign_service_job(v_j, spk4_uid('tech1'), 'spk4', NULL);
  PERFORM set_config('app.b1_uid', '', false);
  PERFORM spk4_as_client(spk4_uid('tech1'));
  SELECT * INTO r3 FROM spk4_try(format($q$SELECT public.decline_service_job(%L::uuid, 'spk4 decline', NULL)$q$, v_j));
  PERFORM spk4_reset();
  SELECT state INTO v_st FROM public.service_jobs WHERE id = v_j;
  -- decline with in-progress visit denied (start first on original job)
  PERFORM spk4_as_client(spk4_uid('tech1'));
  PERFORM public.record_visit_safety_check(v_vs, 'passed', 'spk4', NULL, v_att);
  PERFORM public.start_service_job_visit(v_vs, NULL, v_att, 'spk4');
  SELECT * INTO r4 FROM spk4_try(format(
    $q$SELECT public.decline_service_job((SELECT job_id FROM public.service_job_visits WHERE id = %L::uuid), 'spk4', NULL)$q$, v_vs));
  PERFORM spk4_reset();
  PERFORM spk4_note('Q4-26',
    (NOT r1.o_ok) AND (NOT r2.o_ok) AND r2.o_state = '22023' AND r3.o_ok AND v_st = 'unassigned' AND (NOT r4.o_ok),
    format('start_x=%s/%s noack=%s/%s decline=%s/%s active_decline=%s/%s',
      NOT r1.o_ok, r1.o_state, NOT r2.o_ok, r2.o_state, r3.o_ok, v_st, NOT r4.o_ok, r4.o_state));
END $$;

-- Q4-27 state-oracle probe: unrelated caller error must not reveal visit completion state
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_vs uuid; v_s timestamptz; v_e timestamptz;
  v_path text; r_sched record; r_done record;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q27');
  v_path := v_t::text || '/b4/q27.jpg';
  PERFORM spk4_seed_evidence(v_path);
  v_s := now() + interval '9 hours'; v_e := now() + interval '11 hours';
  PERFORM set_config('app.b1_uid', spk4_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_s, v_e, 'spk4', NULL)).id INTO v_vs;
  PERFORM set_config('app.b1_uid', '', false);
  PERFORM spk4_as_client(spk4_uid('tech2'));
  SELECT * INTO r_sched FROM spk4_try(format($q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_vs, v_path, gen_random_uuid()));
  SELECT * INTO r_done FROM spk4_try(format($q$SELECT spk4_submit_valid(%L::uuid, %L, %L::uuid)$q$, v_v, v_path, gen_random_uuid()));
  PERFORM spk4_reset();
  PERFORM spk4_note('Q4-27',
    (NOT r_sched.o_ok) AND (NOT r_done.o_ok) AND r_sched.o_msg = r_done.o_msg,
    format('sched=%s/%s done=%s/%s same_msg=%s',
      r_sched.o_state, left(r_sched.o_msg, 60), r_done.o_state, left(r_done.o_msg, 60), r_sched.o_msg = r_done.o_msg));
END $$;

-- Q4-28 grant + search_path audit for B4 RPCs and helpers
DO $$
DECLARE ok_all boolean := true; det text := '';
  v_sp text;
BEGIN
  ok_all := ok_all AND has_function_privilege('authenticated',
    'public.submit_service_report_revision(uuid,text,text,jsonb,boolean,text,text,text,text[],jsonb,uuid,uuid)', 'EXECUTE');
  ok_all := ok_all AND NOT has_function_privilege('anon',
    'public.submit_service_report_revision(uuid,text,text,jsonb,boolean,text,text,text,text[],jsonb,uuid,uuid)', 'EXECUTE');
  ok_all := ok_all AND has_function_privilege('authenticated',
    'public.get_service_report_for_visit(uuid)', 'EXECUTE');
  ok_all := ok_all AND NOT has_function_privilege('anon',
    'public.get_service_report_for_visit(uuid)', 'EXECUTE');
  det := det || format('grants=%s ', ok_all);
  FOR v_sp IN
    SELECT p.proname || ':' || COALESCE((SELECT setting FROM unnest(p.proconfig) AS setting WHERE setting LIKE 'search_path=%'), 'NONE')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE (n.nspname, p.proname) IN (
      ('public', 'submit_service_report_revision'),
      ('public', 'get_service_report_for_visit'),
      ('admin_private', 'validate_report_labour'),
      ('admin_private', 'validate_report_evidence_paths'),
      ('admin_private', 'validate_checklist_for_pin'),
      ('admin_private', 'is_ticket_job_technician'),
      ('admin_private', 'actor_can_read_ticket_attachment'),
      ('admin_private', 'can_read_ticket_attachment'))
  LOOP
    ok_all := ok_all AND (v_sp LIKE '%search_path=pg_catalog%');
    det := det || v_sp || ' | ';
  END LOOP;
  PERFORM spk4_note('Q4-28', ok_all, det);
END $$;

-- Q4-30 evidence policy definition + readability matrix (RLS enforcement is hosted-side)
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; v_own text; v_int text;
  v_pol text; v_rls boolean; ok_all boolean := true; det text := ''; b boolean;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q30');
  v_path := v_t::text || '/b4/q30.jpg';
  v_own := spk4_uid('tech1')::text || '/q30.jpg';
  v_int := v_t::text || '/b4/q30-internal.jpg';
  PERFORM spk4_seed_evidence(v_path);
  PERFORM spk4_seed_evidence(v_own);
  PERFORM spk4_seed_evidence(v_int);
  INSERT INTO public.ticket_messages (ticket_id, author_id, message, attachments, is_internal_note, message_type)
  VALUES (v_t, spk4_uid('support'), 'public note',
    jsonb_build_array(jsonb_build_object('storage_path', v_path)), false, 'message');
  INSERT INTO public.ticket_messages (ticket_id, author_id, message, attachments, is_internal_note, message_type)
  VALUES (v_t, spk4_uid('support'), 'staff note',
    jsonb_build_array(jsonb_build_object('storage_path', v_int)), true, 'internal_note');
  SELECT with_check INTO v_pol FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'ticket_attachments_insert';
  SELECT relrowsecurity INTO v_rls FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'storage' AND c.relname = 'objects';
  ok_all := ok_all AND v_pol LIKE '%is_ticket_job_technician%'
    AND v_pol LIKE '%st.user_id%' AND v_pol LIKE '%assigned_to%'
    AND v_pol LIKE '%admin%' AND v_pol LIKE '%support%';
  det := det || format('policy_branches=%s rls=%s ', ok_all, v_rls);
  -- readability matrix (owner + per-actor GUC via DEFINER wrapper)
  PERFORM set_config('app.b1_uid', spk4_uid('support')::text, false);
  SELECT spk4_can_read(v_path) INTO b;
  ok_all := ok_all AND b IS TRUE; det := det || format('support=%s ', b);
  PERFORM set_config('app.b1_uid', spk4_uid('tech1')::text, false);
  SELECT spk4_can_read(v_path) INTO b;
  ok_all := ok_all AND b IS TRUE; det := det || format('jobtech=%s ', b);
  SELECT spk4_can_read(v_int) INTO b;
  ok_all := ok_all AND b IS TRUE; det := det || format('jobtech_internal=%s ', b);
  PERFORM set_config('app.b1_uid', spk4_uid('tech2')::text, false);
  SELECT spk4_can_read(v_path) INTO b;
  ok_all := ok_all AND b IS FALSE; det := det || format('unrelated=%s ', b);
  PERFORM set_config('app.b1_uid', spk4_uid('cust1')::text, false);
  SELECT spk4_can_read(v_path) INTO b;
  ok_all := ok_all AND b IS TRUE; det := det || format('cust_own=%s ', b);
  SELECT spk4_can_read(v_int) INTO b;
  ok_all := ok_all AND b IS FALSE; det := det || format('cust_internal=%s ', b);
  PERFORM set_config('app.b1_uid', '', false);
  SELECT spk4_can_read(v_path) INTO b;
  ok_all := ok_all AND b IS FALSE; det := det || format('anon=%s', b);
  PERFORM spk4_reset();
  PERFORM spk4_note('Q4-30', ok_all, det);
END $$;

-- Q4-32 table-level labour contract (F-B4-05): the B4 contract rule 6 XOR must
-- hold for every row, not only RPC writes. Owner-path probe of the CHECK itself.
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_rep uuid; r1 record; r2 record; v_leftover int;
BEGIN
  PERFORM spk4_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk4_mk_completed_visit('q32');
  INSERT INTO public.service_reports (visit_id) VALUES (v_v) RETURNING id INTO v_rep;
  -- contract-violating shape: no_labour=false + labour=[] must be rejected
  SELECT * INTO r1 FROM spk4_try(format(
    $q$INSERT INTO public.service_report_revisions(report_id,revision_number,findings,work_performed,labour,no_labour,verification_outcome,technician_declaration,submitted_by) VALUES (%L::uuid,1,'x','x','[]'::jsonb,false,'verified_fixed','x',%L::uuid)$q$,
    v_rep, spk4_uid('tech1')));
  -- control: contradictory shape no_labour=true + non-empty must be rejected
  SELECT * INTO r2 FROM spk4_try(format(
    $q$INSERT INTO public.service_report_revisions(report_id,revision_number,findings,work_performed,labour,no_labour,verification_outcome,technician_declaration,submitted_by) VALUES (%L::uuid,2,'x','x','[{"hours":1,"description":"x"}]'::jsonb,true,'verified_fixed','x',%L::uuid)$q$,
    v_rep, spk4_uid('tech1')));
  SELECT count(*) INTO v_leftover FROM public.service_report_revisions WHERE report_id = v_rep;
  DELETE FROM public.service_report_revisions WHERE report_id = v_rep;
  DELETE FROM public.service_reports WHERE id = v_rep;
  PERFORM spk4_note('Q4-32',
    (NOT r1.o_ok) AND (NOT r2.o_ok),
    format('xor_false_empty_denied=%s/%s control_denied=%s/%s leftover=%s',
      NOT r1.o_ok, r1.o_state, NOT r2.o_ok, r2.o_state, v_leftover));
END $$;

SELECT check_id, status, detail FROM public.spk4_eval ORDER BY check_id;
