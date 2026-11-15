-- Spark independent B6 battery (disposable only; never staging/prod).
-- Freeze: ec00b692af10629ed5ee506bbb35762ea5ea00a8
-- Chain: disposable_b1_base + boundary + tkt-sec2 + B1/B2/SEC/RLSx3/B3x5 + B4 + B4FIX + B5 + B5FIX + B5SEL + B6.
-- Role discipline: RPC calls as b1_auth (authenticated stand-in) unless noted.
-- Anon: SET ROLE anon + empty app.b1_uid. Service-role: SET ROLE service_role.

CREATE TABLE IF NOT EXISTS public.spk6_eval(check_id text PRIMARY KEY, status text NOT NULL, detail text);
TRUNCATE public.spk6_eval;

CREATE OR REPLACE FUNCTION spk6_note(p_id text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO public.spk6_eval(check_id, status, detail)
  VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, left(p_detail, 500))
  ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
END; $$;

CREATE OR REPLACE FUNCTION spk6_uid(n text) RETURNS uuid
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
CREATE OR REPLACE FUNCTION spk6_try(p_sql text, OUT o_ok boolean, OUT o_state text, OUT o_msg text)
RETURNS record LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
  EXECUTE p_sql; o_ok := true; o_state := '00000'; o_msg := '';
EXCEPTION WHEN OTHERS THEN o_ok := false; o_state := SQLSTATE; o_msg := left(SQLERRM, 300);
END; $$;

CREATE OR REPLACE FUNCTION spk6_as_client(p_uid uuid)
RETURNS void LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
  EXECUTE 'SET ROLE b1_auth';
  PERFORM set_config('app.b1_uid', COALESCE(p_uid::text, ''), false);
END; $$;

CREATE OR REPLACE FUNCTION spk6_as_role(p_role text, p_uid uuid)
RETURNS void LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
  EXECUTE format('SET ROLE %I', p_role);
  PERFORM set_config('app.b1_uid', COALESCE(p_uid::text, ''), false);
END; $$;

CREATE OR REPLACE FUNCTION spk6_reset()
RETURNS void LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
  EXECUTE 'RESET ROLE';
  PERFORM set_config('app.b1_uid', '', false);
END; $$;

-- Governed path to a completed visit, submitted revision NOT yet reviewed.
CREATE OR REPLACE FUNCTION spk6_mk_completed_visit(p_tag text, p_tech text DEFAULT 'tech1', p_owner text DEFAULT 'cust1',
  OUT o_ticket uuid, OUT o_job uuid, OUT o_visit uuid)
RETURNS record LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
DECLARE
  v_s timestamptz := now() + interval '1 hour';
  v_e timestamptz := now() + interval '3 hours';
  v_att text;
BEGIN
  PERFORM set_config('app.b1_uid', spk6_uid('support')::text, false);
  INSERT INTO public.service_tickets (ticket_number, user_id, title, description, type, priority, status, assigned_to, assigned_by, assigned_at)
  VALUES ('SPK6-' || p_tag || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6),
    spk6_uid(p_owner), 'spk6', 'spk6', 'general', 'medium', 'assigned',
    spk6_uid(p_tech), spk6_uid('support'), now())
  RETURNING id INTO o_ticket;
  SELECT (public.create_service_job(o_ticket, 'SPK6 ' || p_tag, true, 'spk6')).id INTO o_job;
  PERFORM public.assign_service_job(o_job, spk6_uid(p_tech), 'spk6', NULL);
  SELECT (public.schedule_service_job_visit(o_job, v_s, v_e, 'spk6', NULL)).id INTO o_visit;
  v_att := public.b3_minimum_safety_attestation();
  PERFORM set_config('app.b1_uid', spk6_uid(p_tech)::text, false);
  PERFORM public.record_visit_safety_check(o_visit, 'passed', 'spk6', NULL, v_att);
  PERFORM public.start_service_job_visit(o_visit, NULL, v_att, 'spk6');
  PERFORM public.complete_service_job_visit(o_visit);
  PERFORM set_config('app.b1_uid', '', false);
END; $$;

CREATE OR REPLACE FUNCTION spk6_seed_evidence(p_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, storage AS $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('ticket-attachments', 'ticket-attachments', false)
  ON CONFLICT (id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'ticket-attachments' AND name = p_path) THEN
    INSERT INTO storage.objects (bucket_id, name) VALUES ('ticket-attachments', p_path);
  END IF;
END; $$;

-- Standard submit as the CURRENT client (caller sets role/GUC first). Seeds evidence.
CREATE OR REPLACE FUNCTION spk6_submit(p_visit uuid, p_ticket uuid, p_tag text)
RETURNS public.service_report_revisions LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
DECLARE v_path text; v_rev public.service_report_revisions;
BEGIN
  v_path := p_ticket::text || '/b4/spk6-' || p_tag || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6) || '.jpg';
  PERFORM spk6_seed_evidence(v_path);
  v_rev := public.submit_service_report_revision(
    p_visit, 'findings spk6 ' || p_tag, 'work spk6 ' || p_tag,
    '[]'::jsonb, true, 'verified_fixed', NULL, 'I declare spk6.',
    ARRAY[v_path], NULL, gen_random_uuid(), NULL);
  RETURN v_rev;
END; $$;

-- Full issued fixture: completed visit + submit (tech) + approve_issue (support). Job completed.
CREATE OR REPLACE FUNCTION spk6_mk_issued(p_tag text, p_tech text DEFAULT 'tech1', p_owner text DEFAULT 'cust1',
  OUT o_ticket uuid, OUT o_job uuid, OUT o_visit uuid, OUT o_rev uuid)
RETURNS record LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
DECLARE v_rev public.service_report_revisions;
BEGIN
  SELECT * INTO o_ticket, o_job, o_visit FROM spk6_mk_completed_visit(p_tag, p_tech, p_owner);
  PERFORM spk6_as_client(spk6_uid(p_tech));
  v_rev := spk6_submit(o_visit, o_ticket, p_tag);
  o_rev := v_rev.id;
  PERFORM spk6_as_client(spk6_uid('support'));
  PERFORM public.review_service_report_revision(o_rev, 'approved_issued', NULL, NULL);
  PERFORM spk6_reset();
END; $$;

-- Issue an additional job on an EXISTING ticket (for multi-job ack tests).
CREATE OR REPLACE FUNCTION spk6_issue_job(p_ticket uuid, p_tag text,
  OUT o_job uuid, OUT o_visit uuid, OUT o_rev uuid)
RETURNS record LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
DECLARE
  v_s timestamptz := now() + interval '1 hour';
  v_e timestamptz := now() + interval '3 hours';
  v_att text; v_rev public.service_report_revisions;
BEGIN
  PERFORM set_config('app.b1_uid', spk6_uid('support')::text, false);
  SELECT (public.create_service_job(p_ticket, 'SPK6 ' || p_tag, true, 'spk6')).id INTO o_job;
  PERFORM public.assign_service_job(o_job, spk6_uid('tech1'), 'spk6', NULL);
  SELECT (public.schedule_service_job_visit(o_job, v_s, v_e, 'spk6', NULL)).id INTO o_visit;
  v_att := public.b3_minimum_safety_attestation();
  PERFORM set_config('app.b1_uid', spk6_uid('tech1')::text, false);
  PERFORM public.record_visit_safety_check(o_visit, 'passed', 'spk6', NULL, v_att);
  PERFORM public.start_service_job_visit(o_visit, NULL, v_att, 'spk6');
  PERFORM public.complete_service_job_visit(o_visit);
  PERFORM spk6_as_client(spk6_uid('tech1'));
  v_rev := spk6_submit(o_visit, p_ticket, p_tag);
  o_rev := v_rev.id;
  PERFORM spk6_as_client(spk6_uid('support'));
  PERFORM public.review_service_report_revision(o_rev, 'approved_issued', NULL, NULL);
  PERFORM spk6_reset();
END; $$;

-- Valid unavailable contact evidence: 1 issue notification + 2 distinct follow-ups.
CREATE OR REPLACE FUNCTION spk6_attempts()
RETURNS jsonb LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
  RETURN jsonb_build_array(
    jsonb_build_object('attempted_at', (now() - interval '3 days')::text,
      'channel', 'issue_notification', 'outcome', 'delivered', 'by_actor_id', spk6_uid('support')::text),
    jsonb_build_object('attempted_at', (now() - interval '2 days')::text,
      'channel', 'phone', 'outcome', 'no_answer', 'by_actor_id', spk6_uid('support')::text),
    jsonb_build_object('attempted_at', (now() - interval '1 days')::text,
      'channel', 'email', 'outcome', 'no_reply', 'by_actor_id', spk6_uid('support')::text)
  );
END; $$;

-- Close-ready: issued + owner accept + resolved with summary. Caller-neutral on exit.
CREATE OR REPLACE FUNCTION spk6_mk_close_ready(p_tag text,
  OUT o_ticket uuid, OUT o_job uuid, OUT o_visit uuid, OUT o_rev uuid)
RETURNS record LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
  SELECT * INTO o_ticket, o_job, o_visit, o_rev FROM spk6_mk_issued(p_tag);
  PERFORM spk6_as_client(spk6_uid('cust1'));
  PERFORM public.record_service_acknowledgment(o_rev, 'accepted', 'looks good', NULL);
  PERFORM spk6_as_client(spk6_uid('support'));
  PERFORM public.govern_ticket_transition(o_ticket, 'resolved', 'spk6', 'fixed and verified', NULL);
  PERFORM spk6_reset();
END; $$;

-- Q6-01 owner accept positive: row + effective + exactly one ack audit
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; v_ack public.service_acknowledgments;
  v_eff public.service_acknowledgments; v_naud int;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q01');
  PERFORM spk6_as_client(spk6_uid('cust1'));
  v_ack := public.record_service_acknowledgment(v_rev, 'accepted', 'looks good', NULL);
  PERFORM spk6_reset();
  v_eff := public.effective_acknowledgment(v_rev);
  SELECT count(*) INTO v_naud FROM public.service_workflow_audit
  WHERE entity_type = 'acknowledgment' AND entity_id = v_ack.id AND action = 'record_acknowledgment';
  PERFORM spk6_note('Q6-01',
    v_ack.response = 'accepted' AND v_ack.responded_by = spk6_uid('cust1')
      AND v_ack.issued_revision_id = v_rev AND v_eff.id = v_ack.id AND v_naud = 1,
    format('eff=%s aud=%s', v_eff.id = v_ack.id, v_naud));
END $$;

-- Q6-02 owner refuse without comment -> 22023, zero ack rows, zero ack audits
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; r record; v_n int; v_a int;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q02');
  PERFORM spk6_as_client(spk6_uid('cust1'));
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.record_service_acknowledgment(%L::uuid,'refused',NULL,NULL)$q$, v_rev));
  PERFORM spk6_reset();
  SELECT count(*) INTO v_n FROM public.service_acknowledgments WHERE issued_revision_id = v_rev;
  SELECT count(*) INTO v_a FROM public.service_workflow_audit
  WHERE entity_type = 'acknowledgment' AND action = 'record_acknowledgment'
    AND details->>'issued_revision_id' = v_rev::text;
  PERFORM spk6_note('Q6-02',
    (NOT r.o_ok) AND r.o_state = '22023' AND v_n = 0 AND v_a = 0,
    format('denied=%s/%s rows=%s aud=%s', NOT r.o_ok, r.o_state, v_n, v_a));
END $$;

-- Q6-03 owner refuse with comment positive + audit
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; v_ack public.service_acknowledgments; v_naud int;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q03');
  PERFORM spk6_as_client(spk6_uid('cust1'));
  v_ack := public.record_service_acknowledgment(v_rev, 'refused', 'still leaking', NULL);
  PERFORM spk6_reset();
  SELECT count(*) INTO v_naud FROM public.service_workflow_audit
  WHERE entity_type = 'acknowledgment' AND entity_id = v_ack.id AND action = 'record_acknowledgment';
  PERFORM spk6_note('Q6-03',
    v_ack.response = 'refused' AND v_ack.comment = 'still leaking' AND v_naud = 1,
    format('aud=%s', v_naud));
END $$;

-- Q6-04 non-owner customer (incl. other-ticket owner) denied 42501, zero writes
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; r record; v_n int; v_a int;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q04');
  PERFORM spk6_as_client(spk6_uid('cust2'));
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.record_service_acknowledgment(%L::uuid,'accepted','hijack',NULL)$q$, v_rev));
  PERFORM spk6_reset();
  SELECT count(*) INTO v_n FROM public.service_acknowledgments WHERE issued_revision_id = v_rev;
  SELECT count(*) INTO v_a FROM public.service_workflow_audit
  WHERE details->>'issued_revision_id' = v_rev::text;
  PERFORM spk6_note('Q6-04',
    (NOT r.o_ok) AND r.o_state = '42501' AND v_n = 0 AND v_a = 0,
    format('denied=%s/%s rows=%s aud=%s', NOT r.o_ok, r.o_state, v_n, v_a));
END $$;

-- Q6-05 staff roles denied the customer RPC (ownership-based, not role-based)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; r1 record; r2 record; r3 record; v_n int;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q05');
  PERFORM spk6_as_client(spk6_uid('tech1'));
  SELECT * INTO r1 FROM spk6_try(format(
    $q$SELECT public.record_service_acknowledgment(%L::uuid,'accepted',NULL,NULL)$q$, v_rev));
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT * INTO r2 FROM spk6_try(format(
    $q$SELECT public.record_service_acknowledgment(%L::uuid,'accepted',NULL,NULL)$q$, v_rev));
  PERFORM spk6_as_client(spk6_uid('admin'));
  SELECT * INTO r3 FROM spk6_try(format(
    $q$SELECT public.record_service_acknowledgment(%L::uuid,'accepted',NULL,NULL)$q$, v_rev));
  PERFORM spk6_reset();
  SELECT count(*) INTO v_n FROM public.service_acknowledgments WHERE issued_revision_id = v_rev;
  PERFORM spk6_note('Q6-05',
    (NOT r1.o_ok) AND r1.o_state = '42501' AND (NOT r2.o_ok) AND r2.o_state = '42501'
      AND (NOT r3.o_ok) AND r3.o_state = '42501' AND v_n = 0,
    format('tech=%s/%s sup=%s/%s adm=%s/%s rows=%s',
      NOT r1.o_ok, r1.o_state, NOT r2.o_ok, r2.o_state, NOT r3.o_ok, r3.o_state, v_n));
END $$;

-- Q6-06 sales-role ticket OWNER may acknowledge via RPC (ownership-based API)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; v_ack public.service_acknowledgments;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q06', 'tech1', 'sales');
  PERFORM spk6_as_client(spk6_uid('sales'));
  v_ack := public.record_service_acknowledgment(v_rev, 'accepted', 'sales-owner ok', NULL);
  PERFORM spk6_reset();
  PERFORM spk6_note('Q6-06',
    v_ack.response = 'accepted' AND v_ack.responded_by = spk6_uid('sales'),
    format('by=%s', v_ack.responded_by = spk6_uid('sales')));
END $$;

-- Q6-07 anonymous denied on all three write RPCs, zero writes
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  r1 record; r2 record; r3 record; v_n int; v_d int;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q07');
  PERFORM spk6_as_role('anon', NULL);
  SELECT * INTO r1 FROM spk6_try(format(
    $q$SELECT public.record_service_acknowledgment(%L::uuid,'accepted',NULL,NULL)$q$, v_rev));
  SELECT * INTO r2 FROM spk6_try(format(
    $q$SELECT public.record_service_acknowledgment_unavailable(%L::uuid,'[]'::jsonb,'x',NULL)$q$, v_rev));
  SELECT * INTO r3 FROM spk6_try(format(
    $q$SELECT public.record_acknowledgment_disposition(%L::uuid,'accept_refusal_and_proceed','x',NULL)$q$, v_rev));
  PERFORM spk6_reset();
  SELECT count(*) INTO v_n FROM public.service_acknowledgments WHERE issued_revision_id = v_rev;
  SELECT count(*) INTO v_d FROM public.service_acknowledgment_dispositions WHERE issued_revision_id = v_rev;
  PERFORM spk6_note('Q6-07',
    (NOT r1.o_ok) AND (NOT r2.o_ok) AND (NOT r3.o_ok) AND v_n = 0 AND v_d = 0,
    format('ack=%s/%s un=%s/%s disp=%s/%s rows=%s/%s',
      NOT r1.o_ok, r1.o_state, NOT r2.o_ok, r2.o_state, NOT r3.o_ok, r3.o_state, v_n, v_d));
END $$;

-- Q6-08 authenticated forged actor (cust1 calling as cust2) denied, zero writes
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; r record; v_n int;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q08');
  PERFORM spk6_as_client(spk6_uid('cust1'));
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.record_service_acknowledgment(%L::uuid,'accepted',NULL,%L::uuid)$q$, v_rev, spk6_uid('cust2')));
  PERFORM spk6_reset();
  SELECT count(*) INTO v_n FROM public.service_acknowledgments WHERE issued_revision_id = v_rev;
  PERFORM spk6_note('Q6-08',
    (NOT r.o_ok) AND v_n = 0,
    format('denied=%s/%s rows=%s msg=%s', NOT r.o_ok, r.o_state, v_n, left(r.o_msg, 60)));
END $$;

-- Q6-09 service_role delegation on customer ack denied (revoked), zero writes
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; r record; v_n int;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q09');
  PERFORM spk6_as_role('service_role', NULL);
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.record_service_acknowledgment(%L::uuid,'accepted',NULL,%L::uuid)$q$, v_rev, spk6_uid('cust1')));
  PERFORM spk6_reset();
  SELECT count(*) INTO v_n FROM public.service_acknowledgments WHERE issued_revision_id = v_rev;
  PERFORM spk6_note('Q6-09',
    (NOT r.o_ok) AND v_n = 0,
    format('denied=%s/%s rows=%s msg=%s', NOT r.o_ok, r.o_state, v_n, left(r.o_msg, 60)));
END $$;

-- Q6-10 support unavailable positive with valid evidence + audit
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; v_ack public.service_acknowledgments;
  v_eff public.service_acknowledgments; v_naud int;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q10');
  PERFORM spk6_as_client(spk6_uid('support'));
  v_ack := public.record_service_acknowledgment_unavailable(v_rev, spk6_attempts(), 'no contact after 3 tries', NULL);
  PERFORM spk6_reset();
  v_eff := public.effective_acknowledgment(v_rev);
  SELECT count(*) INTO v_naud FROM public.service_workflow_audit
  WHERE entity_type = 'acknowledgment' AND entity_id = v_ack.id AND action = 'record_acknowledgment_unavailable';
  PERFORM spk6_note('Q6-10',
    v_ack.response = 'unavailable' AND v_ack.responded_by = spk6_uid('support')
      AND jsonb_array_length(v_ack.contact_attempts) = 3 AND v_eff.id = v_ack.id AND v_naud = 1,
    format('n=%s aud=%s', jsonb_array_length(v_ack.contact_attempts), v_naud));
END $$;

-- Q6-11 unavailable with insufficient/under-attributed evidence denied, zero writes
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; r1 record; r2 record; r3 record; v_n int;
  v_bad jsonb; v_short jsonb; v_dup jsonb;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q11');
  v_bad := jsonb_build_array(
    jsonb_build_object('attempted_at', now()::text, 'channel', 'issue_notification', 'outcome', 'delivered'),
    jsonb_build_object('attempted_at', now()::text, 'channel', 'phone', 'outcome', 'x', 'by_actor_id', spk6_uid('support')::text),
    jsonb_build_object('attempted_at', now()::text, 'channel', 'email', 'outcome', 'x', 'by_actor_id', spk6_uid('support')::text));
  v_short := jsonb_build_array(
    jsonb_build_object('attempted_at', now()::text, 'channel', 'issue_notification', 'outcome', 'delivered', 'by_actor_id', spk6_uid('support')::text));
  v_dup := jsonb_build_array(
    jsonb_build_object('attempted_at', now()::text, 'channel', 'issue_notification', 'outcome', 'delivered', 'by_actor_id', spk6_uid('support')::text),
    jsonb_build_object('attempted_at', (now() - interval '1 hour')::text, 'channel', 'phone', 'outcome', 'x', 'by_actor_id', spk6_uid('support')::text),
    jsonb_build_object('attempted_at', (now() - interval '1 hour')::text, 'channel', 'phone', 'outcome', 'y', 'by_actor_id', spk6_uid('support')::text));
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT * INTO r1 FROM spk6_try(format(
    $q$SELECT public.record_service_acknowledgment_unavailable(%L::uuid,%L::jsonb,'r',NULL)$q$, v_rev, v_bad::text));
  SELECT * INTO r2 FROM spk6_try(format(
    $q$SELECT public.record_service_acknowledgment_unavailable(%L::uuid,%L::jsonb,'r',NULL)$q$, v_rev, v_short::text));
  SELECT * INTO r3 FROM spk6_try(format(
    $q$SELECT public.record_service_acknowledgment_unavailable(%L::uuid,%L::jsonb,'r',NULL)$q$, v_rev, v_dup::text));
  PERFORM spk6_reset();
  SELECT count(*) INTO v_n FROM public.service_acknowledgments WHERE issued_revision_id = v_rev;
  PERFORM spk6_note('Q6-11',
    (NOT r1.o_ok) AND (NOT r2.o_ok) AND (NOT r3.o_ok) AND v_n = 0,
    format('bad=%s/%s short=%s/%s dup=%s/%s rows=%s',
      NOT r1.o_ok, r1.o_state, NOT r2.o_ok, r2.o_state, NOT r3.o_ok, r3.o_state, v_n));
END $$;

-- Q6-12 customer/technician cannot record unavailable (42501), zero writes
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; r1 record; r2 record; v_n int;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q12');
  PERFORM spk6_as_client(spk6_uid('cust1'));
  SELECT * INTO r1 FROM spk6_try(format(
    $q$SELECT public.record_service_acknowledgment_unavailable(%L::uuid,%L::jsonb,'r',NULL)$q$, v_rev, spk6_attempts()::text));
  PERFORM spk6_as_client(spk6_uid('tech1'));
  SELECT * INTO r2 FROM spk6_try(format(
    $q$SELECT public.record_service_acknowledgment_unavailable(%L::uuid,%L::jsonb,'r',NULL)$q$, v_rev, spk6_attempts()::text));
  PERFORM spk6_reset();
  SELECT count(*) INTO v_n FROM public.service_acknowledgments WHERE issued_revision_id = v_rev;
  PERFORM spk6_note('Q6-12',
    (NOT r1.o_ok) AND r1.o_state = '42501' AND (NOT r2.o_ok) AND r2.o_state = '42501' AND v_n = 0,
    format('cust=%s/%s tech=%s/%s rows=%s', NOT r1.o_ok, r1.o_state, NOT r2.o_ok, r2.o_state, v_n));
END $$;

-- Q6-13 staff unavailable must NOT overwrite customer accepted/refused (F-B6-03)
-- NOTE: same-transaction acks share now() -> tie broken by random id; assert denial + rows only.
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; r1 record; v_n int;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q13');
  PERFORM spk6_as_client(spk6_uid('cust1'));
  PERFORM public.record_service_acknowledgment(v_rev, 'accepted', 'fine', NULL);
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT * INTO r1 FROM spk6_try(format(
    $q$SELECT public.record_service_acknowledgment_unavailable(%L::uuid,%L::jsonb,'r',NULL)$q$, v_rev, spk6_attempts()::text));
  PERFORM spk6_reset();
  SELECT count(*) INTO v_n FROM public.service_acknowledgments WHERE issued_revision_id = v_rev;
  PERFORM spk6_note('Q6-13',
    (NOT r1.o_ok) AND v_n = 1,
    format('denied=%s/%s rows=%s', NOT r1.o_ok, r1.o_state, v_n));
END $$;

-- Q6-14 refusal disposition positive: settled + audit + unblocks ack gate
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; v_disp public.service_acknowledgment_dispositions;
  v_naud int; v_codes text[];
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q14');
  PERFORM spk6_as_client(spk6_uid('cust1'));
  PERFORM public.record_service_acknowledgment(v_rev, 'refused', 'still broken', NULL);
  PERFORM spk6_as_client(spk6_uid('support'));
  v_disp := public.record_acknowledgment_disposition(v_rev, 'accept_refusal_and_proceed', 'will fix in follow-up visit', NULL);
  PERFORM spk6_reset();
  SELECT count(*) INTO v_naud FROM public.service_workflow_audit
  WHERE entity_type = 'acknowledgment_disposition' AND entity_id = v_disp.id;
  SELECT array_agg(code) INTO v_codes FROM public.evaluate_ticket_workflow_prerequisites(v_t);
  PERFORM spk6_note('Q6-14',
    v_disp.disposition = 'accept_refusal_and_proceed' AND v_disp.decided_by = spk6_uid('support')
      AND v_naud = 1 AND NOT (v_codes @> ARRAY['acknowledgment_refusal_disposition_pending']),
    format('aud=%s codes=%s', v_naud, v_codes::text));
END $$;

-- Q6-15 disposition without effective refusal denied (check_violation), zero writes;
-- tech/customer cannot dispose (42501)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; r1 record; r2 record; r3 record; v_n int;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q15');
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT * INTO r1 FROM spk6_try(format(
    $q$SELECT public.record_acknowledgment_disposition(%L::uuid,'accept_refusal_and_proceed','r',NULL)$q$, v_rev));
  PERFORM spk6_as_client(spk6_uid('tech1'));
  SELECT * INTO r2 FROM spk6_try(format(
    $q$SELECT public.record_acknowledgment_disposition(%L::uuid,'accept_refusal_and_proceed','r',NULL)$q$, v_rev));
  PERFORM spk6_as_client(spk6_uid('cust1'));
  SELECT * INTO r3 FROM spk6_try(format(
    $q$SELECT public.record_acknowledgment_disposition(%L::uuid,'accept_refusal_and_proceed','r',NULL)$q$, v_rev));
  PERFORM spk6_reset();
  SELECT count(*) INTO v_n FROM public.service_acknowledgment_dispositions WHERE issued_revision_id = v_rev;
  PERFORM spk6_note('Q6-15',
    (NOT r1.o_ok) AND r1.o_state = '23514'
      AND (NOT r2.o_ok) AND r2.o_state = '42501'
      AND (NOT r3.o_ok) AND r3.o_state = '42501' AND v_n = 0,
    format('noref=%s/%s tech=%s/%s cust=%s/%s rows=%s',
      NOT r1.o_ok, r1.o_state, NOT r2.o_ok, r2.o_state, NOT r3.o_ok, r3.o_state, v_n));
END $$;

-- Q6-16 create_follow_up disposition blocks closure and invents no jobs
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; v_disp public.service_acknowledgment_dispositions;
  r record; v_codes text[]; v_nj int; v_st text;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q16');
  PERFORM spk6_as_client(spk6_uid('cust1'));
  PERFORM public.record_service_acknowledgment(v_rev, 'refused', 'still broken', NULL);
  PERFORM spk6_as_client(spk6_uid('support'));
  v_disp := public.record_acknowledgment_disposition(v_rev, 'create_follow_up', 'needs second visit', NULL);
  SELECT array_agg(code) INTO v_codes FROM public.evaluate_ticket_workflow_prerequisites(v_t);
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'resolved','spk6','summary here',NULL)$q$, v_t));
  PERFORM spk6_reset();
  SELECT count(*) INTO v_nj FROM public.service_jobs WHERE ticket_id = v_t;
  SELECT status::text INTO v_st FROM public.service_tickets WHERE id = v_t;
  PERFORM spk6_note('Q6-16',
    v_codes @> ARRAY['acknowledgment_refusal_follow_up_required']
      AND (NOT r.o_ok) AND v_nj = 1 AND v_st = 'in_progress',
    format('codes=%s denied=%s/%s jobs=%s st=%s', v_codes::text, NOT r.o_ok, r.o_state, v_nj, v_st));
END $$;

-- Q6-17 fresh refusal after disposition re-blocks closure (F-B6-04: gate must bind ack id)
-- (backdate the first refusal: same-txn ties would otherwise make effective a coin flip)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; r record; v_codes text[]; v_st text;
  v_a1 public.service_acknowledgments;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q17');
  PERFORM spk6_as_client(spk6_uid('cust1'));
  v_a1 := public.record_service_acknowledgment(v_rev, 'refused', 'first refusal', NULL);
  PERFORM spk6_as_client(spk6_uid('support'));
  PERFORM public.record_acknowledgment_disposition(v_rev, 'accept_refusal_and_proceed', 'ok proceed', NULL);
  PERFORM spk6_reset();
  ALTER TABLE public.service_acknowledgments DISABLE TRIGGER trg_ack_immutable;
  UPDATE public.service_acknowledgments SET responded_at = now() - interval '1 hour' WHERE id = v_a1.id;
  ALTER TABLE public.service_acknowledgments ENABLE TRIGGER trg_ack_immutable;
  PERFORM spk6_as_client(spk6_uid('cust1'));
  PERFORM public.record_service_acknowledgment(v_rev, 'refused', 'second refusal with new info', NULL);
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT array_agg(code) INTO v_codes FROM public.evaluate_ticket_workflow_prerequisites(v_t);
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'resolved','spk6','summary here',NULL)$q$, v_t));
  PERFORM spk6_reset();
  SELECT status::text INTO v_st FROM public.service_tickets WHERE id = v_t;
  PERFORM spk6_note('Q6-17',
    (v_codes @> ARRAY['acknowledgment_refusal_disposition_pending']) AND (NOT r.o_ok) AND v_st = 'in_progress',
    format('codes=%s denied=%s/%s st=%s', v_codes::text, NOT r.o_ok, r.o_state, v_st));
END $$;

-- Q6-18 identical ack repeat idempotent (same row, no dup audit); different comment appends
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  a1 public.service_acknowledgments; a2 public.service_acknowledgments; a3 public.service_acknowledgments;
  v_n int; v_aud int;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q18');
  PERFORM spk6_as_client(spk6_uid('cust1'));
  a1 := public.record_service_acknowledgment(v_rev, 'accepted', 'same', NULL);
  a2 := public.record_service_acknowledgment(v_rev, 'accepted', 'same', NULL);
  a3 := public.record_service_acknowledgment(v_rev, 'accepted', 'changed mind text', NULL);
  PERFORM spk6_reset();
  SELECT count(*) INTO v_n FROM public.service_acknowledgments WHERE issued_revision_id = v_rev;
  SELECT count(*) INTO v_aud FROM public.service_workflow_audit
  WHERE entity_type = 'acknowledgment' AND action = 'record_acknowledgment'
    AND details->>'issued_revision_id' = v_rev::text;
  PERFORM spk6_note('Q6-18',
    a2.id = a1.id AND a3.id <> a1.id AND v_n = 2 AND v_aud = 2,
    format('idem=%s append=%s rows=%s aud=%s', a2.id = a1.id, a3.id <> a1.id, v_n, v_aud));
END $$;

-- Q6-19 identical disposition repeat idempotent; identical unavailable repeat idempotent
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  d1 public.service_acknowledgment_dispositions; d2 public.service_acknowledgment_dispositions;
  u1 public.service_acknowledgments; u2 public.service_acknowledgments;
  v_att jsonb; v_nd int; v_nu int;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q19');
  PERFORM spk6_as_client(spk6_uid('cust1'));
  PERFORM public.record_service_acknowledgment(v_rev, 'refused', 'bad', NULL);
  PERFORM spk6_as_client(spk6_uid('support'));
  d1 := public.record_acknowledgment_disposition(v_rev, 'accept_refusal_and_proceed', 'ok', NULL);
  d2 := public.record_acknowledgment_disposition(v_rev, 'accept_refusal_and_proceed', 'ok', NULL);
  SELECT count(*) INTO v_nd FROM public.service_acknowledgment_dispositions WHERE issued_revision_id = v_rev;
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q19b');
  v_att := spk6_attempts();
  PERFORM spk6_as_client(spk6_uid('support'));
  u1 := public.record_service_acknowledgment_unavailable(v_rev, v_att, 'gone', NULL);
  u2 := public.record_service_acknowledgment_unavailable(v_rev, v_att, 'gone', NULL);
  PERFORM spk6_reset();
  SELECT count(*) INTO v_nu FROM public.service_acknowledgments WHERE issued_revision_id = v_rev;
  PERFORM spk6_note('Q6-19',
    d2.id = d1.id AND v_nd = 1 AND u2.id = u1.id AND v_nu = 1,
    format('disp_idem=%s/%s unav_idem=%s/%s', d2.id = d1.id, v_nd, u2.id = u1.id, v_nu));
END $$;

-- Q6-20 late customer ack after close allowed; ticket stays closed; effective updates
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; v_ack public.service_acknowledgments;
  v_un public.service_acknowledgments; v_eff public.service_acknowledgments; v_st text;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q20');
  PERFORM spk6_as_client(spk6_uid('support'));
  v_un := public.record_service_acknowledgment_unavailable(v_rev, spk6_attempts(), 'away', NULL);
  PERFORM spk6_reset();
  -- force strict ordering (same-txn now() ties break by random id): backdate the earlier row
  ALTER TABLE public.service_acknowledgments DISABLE TRIGGER trg_ack_immutable;
  UPDATE public.service_acknowledgments SET responded_at = now() - interval '1 hour' WHERE id = v_un.id;
  ALTER TABLE public.service_acknowledgments ENABLE TRIGGER trg_ack_immutable;
  PERFORM spk6_as_client(spk6_uid('support'));
  PERFORM public.govern_ticket_transition(v_t, 'resolved', 'spk6', 'summary here', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'closed', 'spk6', 'summary here', NULL);
  PERFORM spk6_as_client(spk6_uid('cust1'));
  v_ack := public.record_service_acknowledgment(v_rev, 'accepted', 'back now, fine', NULL);
  PERFORM spk6_reset();
  v_eff := public.effective_acknowledgment(v_rev);
  SELECT status::text INTO v_st FROM public.service_tickets WHERE id = v_t;
  PERFORM spk6_note('Q6-20',
    v_ack.response = 'accepted' AND v_eff.id = v_ack.id AND v_st = 'closed',
    format('eff=%s st=%s', v_eff.id = v_ack.id, v_st));
END $$;

-- Q6-21 second issued head does not inherit the first head's ack: fresh head outstanding
-- (post-issue correction on the same job is impossible: submit/review both terminal-guard;
-- a new issued head arrives via follow-up job/visit, which gets its own ack lifecycle)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  v_j2 uuid; v_v2 uuid; v_r2 uuid;
  v_eff1 public.service_acknowledgments; v_eff2 public.service_acknowledgments; v_codes text[];
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q21');
  PERFORM spk6_as_client(spk6_uid('cust1'));
  PERFORM public.record_service_acknowledgment(v_rev, 'accepted', 'ok job1', NULL);
  PERFORM spk6_reset();
  SELECT * INTO v_j2, v_v2, v_r2 FROM spk6_issue_job(v_t, 'q21j2');
  v_eff1 := public.effective_acknowledgment(v_rev);
  v_eff2 := public.effective_acknowledgment(v_r2);
  SELECT array_agg(code) INTO v_codes FROM public.evaluate_ticket_workflow_prerequisites(v_t);
  PERFORM spk6_note('Q6-21',
    v_eff1.response = 'accepted' AND (v_eff2.id IS NULL)
      AND (v_codes @> ARRAY['acknowledgment_outstanding']),
    format('head1=%s head2null=%s codes=%s', v_eff1.response, v_eff2.id IS NULL, v_codes::text));
END $$;

-- Q6-22 happy path: accept -> resolve -> close; audits + closed_at + RTS note
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; v_nxt public.service_tickets;
  v_st text; v_closed timestamptz; v_nres int; v_nclose int; v_note text;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_close_ready('q22');
  PERFORM spk6_as_client(spk6_uid('support'));
  v_nxt := public.govern_ticket_transition(v_t, 'closed', 'spk6', 'fixed and verified', NULL);
  PERFORM spk6_reset();
  SELECT status::text, closed_at INTO v_st, v_closed FROM public.service_tickets WHERE id = v_t;
  SELECT count(*) INTO v_nres FROM public.service_workflow_audit
  WHERE entity_type = 'ticket' AND entity_id = v_t AND action = 'workflow_resolve_close' AND to_state = 'resolved';
  SELECT count(*), max(details->>'note') INTO v_nclose, v_note FROM public.service_workflow_audit
  WHERE entity_type = 'ticket' AND entity_id = v_t AND action = 'workflow_resolve_close' AND to_state = 'closed';
  PERFORM spk6_note('Q6-22',
    v_st = 'closed' AND v_closed IS NOT NULL AND v_nres = 1 AND v_nclose = 1
      AND v_note ILIKE '%return-to-service%',
    format('st=%s res=%s close=%s note=%s', v_st, v_nres, v_nclose, left(coalesce(v_note,''),40)));
END $$;

-- Q6-23 blank summary blocks resolve AND close (check_violation), no state change
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; r1 record; r2 record; v_st text;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q23');
  PERFORM spk6_as_client(spk6_uid('cust1'));
  PERFORM public.record_service_acknowledgment(v_rev, 'accepted', 'ok', NULL);
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT * INTO r1 FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'resolved','spk6',NULL,NULL)$q$, v_t));
  SELECT * INTO r2 FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'resolved','spk6','   ',NULL)$q$, v_t));
  PERFORM spk6_reset();
  SELECT status::text INTO v_st FROM public.service_tickets WHERE id = v_t;
  PERFORM spk6_note('Q6-23',
    (NOT r1.o_ok) AND r1.o_state = '23514'
      AND (NOT r2.o_ok) AND r2.o_state = '23514' AND v_st = 'in_progress',
    format('null=%s/%s blank=%s/%s st=%s',
      NOT r1.o_ok, r1.o_state, NOT r2.o_ok, r2.o_state, v_st));
END $$;

-- Q6-24 missing ack blocks close; unavailable path unblocks (resolve then close)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; r record; v_codes text[]; v_st text;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q24');
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT array_agg(code) INTO v_codes FROM public.evaluate_ticket_workflow_prerequisites(v_t);
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'resolved','spk6','summary here',NULL)$q$, v_t));
  PERFORM public.record_service_acknowledgment_unavailable(v_rev, spk6_attempts(), 'away', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'resolved', 'spk6', 'summary here', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'closed', 'spk6', 'summary here', NULL);
  PERFORM spk6_reset();
  SELECT status::text INTO v_st FROM public.service_tickets WHERE id = v_t;
  PERFORM spk6_note('Q6-24',
    (v_codes @> ARRAY['acknowledgment_outstanding']) AND (NOT r.o_ok) AND v_st = 'closed',
    format('codes=%s denied=%s/%s st=%s', v_codes::text, NOT r.o_ok, r.o_state, v_st));
END $$;

-- Q6-25 refused without disposition blocks close; accept-disposition unblocks
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; r record; v_codes text[]; v_st text;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q25');
  PERFORM spk6_as_client(spk6_uid('cust1'));
  PERFORM public.record_service_acknowledgment(v_rev, 'refused', 'nope', NULL);
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT array_agg(code) INTO v_codes FROM public.evaluate_ticket_workflow_prerequisites(v_t);
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'resolved','spk6','summary here',NULL)$q$, v_t));
  PERFORM public.record_acknowledgment_disposition(v_rev, 'accept_refusal_and_proceed', 'proceed anyway', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'resolved', 'spk6', 'summary here', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'closed', 'spk6', 'summary here', NULL);
  PERFORM spk6_reset();
  SELECT status::text INTO v_st FROM public.service_tickets WHERE id = v_t;
  PERFORM spk6_note('Q6-25',
    (v_codes @> ARRAY['acknowledgment_refusal_disposition_pending']) AND (NOT r.o_ok) AND v_st = 'closed',
    format('codes=%s denied=%s/%s st=%s', v_codes::text, NOT r.o_ok, r.o_state, v_st));
END $$;

-- Q6-26 required unsatisfied blocks; optional incomplete job does NOT block
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; v_j2 uuid;
  r1 record; v_codes1 text[]; v_st text;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk6_mk_completed_visit('q26');
  PERFORM spk6_as_client(spk6_uid('tech1'));
  PERFORM spk6_submit(v_v, v_t, 'q26');
  -- no ack yet; required job awaiting review -> blocked
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT array_agg(code) INTO v_codes1 FROM public.evaluate_ticket_workflow_prerequisites(v_t);
  SELECT * INTO r1 FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'resolved','spk6','summary here',NULL)$q$, v_t));
  PERFORM spk6_reset();
  -- fresh close-ready ticket + dangling optional job -> close still succeeds
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_close_ready('q26b');
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT (public.create_service_job(v_t, 'optional extra', false, 'spk6')).id INTO v_j2;
  PERFORM public.govern_ticket_transition(v_t, 'closed', 'spk6', 'summary here', NULL);
  PERFORM spk6_reset();
  SELECT status::text INTO v_st FROM public.service_tickets WHERE id = v_t;
  PERFORM spk6_note('Q6-26',
    (v_codes1 @> ARRAY['required_job_unsatisfied']) AND (NOT r1.o_ok) AND v_st = 'closed',
    format('codes=%s denied=%s/%s optclose=%s', v_codes1::text, NOT r1.o_ok, r1.o_state, v_st));
END $$;

-- Q6-27 privileged-state probe: completed job with NO issued report -> completing_report_not_issued
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  r record; v_codes text[];
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk6_mk_completed_visit('q27');
  PERFORM spk6_as_client(spk6_uid('tech1'));
  v_rev := spk6_submit(v_v, v_t, 'q27');
  PERFORM spk6_reset();
  -- adversarial DB state (owner-level, documents gate logic; not an ordinary-client path)
  UPDATE public.service_jobs SET state = 'completed', completing_revision_id = NULL WHERE id = v_j;
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT array_agg(code) INTO v_codes FROM public.evaluate_ticket_workflow_prerequisites(v_t);
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'resolved','spk6','summary here',NULL)$q$, v_t));
  PERFORM spk6_reset();
  PERFORM spk6_note('Q6-27',
    (v_codes @> ARRAY['completing_report_not_issued']) AND (NOT r.o_ok),
    format('codes=%s denied=%s/%s', v_codes::text, NOT r.o_ok, r.o_state));
END $$;

-- Q6-28 open scheduled visit on the ticket blocks close
-- (second visit scheduled BEFORE issue; schedule on terminal job is denied)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  v_v2 uuid; v_rid uuid; r record; v_codes text[];
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk6_mk_completed_visit('q28');
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT (public.schedule_service_job_visit(v_j, now() + interval '1 hour', now() + interval '2 hours', 'spk6', NULL)).id INTO v_v2;
  PERFORM spk6_as_client(spk6_uid('tech1'));
  v_rev := spk6_submit(v_v, v_t, 'q28');
  v_rid := v_rev.id;
  PERFORM spk6_as_client(spk6_uid('support'));
  PERFORM public.review_service_report_revision(v_rid, 'approved_issued', NULL, NULL);
  PERFORM spk6_as_client(spk6_uid('cust1'));
  PERFORM public.record_service_acknowledgment(v_rid, 'accepted', 'ok', NULL);
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT array_agg(code) INTO v_codes FROM public.evaluate_ticket_workflow_prerequisites(v_t);
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'resolved','spk6','summary here',NULL)$q$, v_t));
  PERFORM spk6_reset();
  PERFORM spk6_note('Q6-28',
    (v_codes @> ARRAY['scheduled_visit_open']) AND (NOT r.o_ok),
    format('codes=%s denied=%s/%s', v_codes::text, NOT r.o_ok, r.o_state));
END $$;

-- Q6-29 unreviewed resubmission blocks close (revision_awaiting_review)
-- (return -> resubmit BEFORE any issue; issued revisions are terminal)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_r1 public.service_report_revisions;
  v_r2 public.service_report_revisions; r record; v_codes text[];
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk6_mk_completed_visit('q29');
  PERFORM spk6_as_client(spk6_uid('tech1'));
  v_r1 := spk6_submit(v_v, v_t, 'q29r1');
  PERFORM spk6_as_client(spk6_uid('support'));
  PERFORM public.review_service_report_revision(v_r1.id, 'returned', 'fix it', NULL);
  PERFORM spk6_as_client(spk6_uid('tech1'));
  v_r2 := spk6_submit(v_v, v_t, 'q29r2');
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT array_agg(code) INTO v_codes FROM public.evaluate_ticket_workflow_prerequisites(v_t);
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'resolved','spk6','summary here',NULL)$q$, v_t));
  PERFORM spk6_reset();
  PERFORM spk6_note('Q6-29',
    (v_codes @> ARRAY['revision_awaiting_review']) AND (NOT r.o_ok),
    format('codes=%s denied=%s/%s', v_codes::text, NOT r.o_ok, r.o_state));
END $$;

-- Q6-30 legacy jobless path: resolve/close without activation and without summary
DO $$
DECLARE v_t uuid; v_st text; v_sum text;
BEGIN
  PERFORM spk6_reset();
  INSERT INTO public.service_tickets (ticket_number, user_id, title, description, type, priority, status)
  VALUES ('SPK6-q30-legacy', spk6_uid('cust1'), 'legacy', 'legacy', 'general', 'medium', 'open')
  RETURNING id INTO v_t;
  PERFORM spk6_as_client(spk6_uid('support'));
  PERFORM public.govern_ticket_transition(v_t, 'assigned', 'spk6', NULL, NULL);
  PERFORM public.govern_ticket_transition(v_t, 'in_progress', 'spk6', NULL, NULL);
  PERFORM public.govern_ticket_transition(v_t, 'resolved', 'spk6', NULL, NULL);
  PERFORM public.govern_ticket_transition(v_t, 'closed', 'spk6', NULL, NULL);
  PERFORM spk6_reset();
  SELECT status::text, resolution_summary INTO v_st, v_sum FROM public.service_tickets WHERE id = v_t;
  PERFORM spk6_note('Q6-30',
    v_st = 'closed' AND v_sum IS NULL,
    format('st=%s sum_null=%s', v_st, v_sum IS NULL));
END $$;

-- Q6-31 resolved->in_progress direct denied; required-job add-back works under B6 govern
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; r record; v_st1 text; v_st2 text;
  v_j2 uuid; v_aud int;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_close_ready('q31');
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'in_progress','spk6',NULL,NULL)$q$, v_t));
  PERFORM spk6_reset();
  SELECT status::text INTO v_st1 FROM public.service_tickets WHERE id = v_t;
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT (public.create_service_job(v_t, 'follow-up required', true, 'spk6')).id INTO v_j2;
  PERFORM spk6_reset();
  SELECT status::text INTO v_st2 FROM public.service_tickets WHERE id = v_t;
  SELECT count(*) INTO v_aud FROM public.ticket_governance_audit
  WHERE ticket_id = v_t AND action = 'status_transition' AND from_status = 'resolved' AND to_status = 'in_progress';
  PERFORM spk6_note('Q6-31',
    (NOT r.o_ok) AND v_st1 = 'resolved' AND v_st2 = 'in_progress' AND v_aud = 1,
    format('direct=%s/%s st1=%s st2=%s aud=%s', NOT r.o_ok, r.o_state, v_st1, v_st2, v_aud));
END $$;

-- Q6-32 closed is terminal (no exit); same-state re-close is FSM-idempotent.
-- OBSERVATION: re-close rewrites closed_at and appends audit (no-op with side effects).
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; r1 record; r2 record;
  v_st text; v_closed timestamptz;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_close_ready('q32');
  PERFORM spk6_as_client(spk6_uid('support'));
  PERFORM public.govern_ticket_transition(v_t, 'closed', 'spk6', 'summary here', NULL);
  SELECT * INTO r1 FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'closed','spk6','summary here',NULL)$q$, v_t));
  SELECT * INTO r2 FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'open','spk6',NULL,NULL)$q$, v_t));
  PERFORM spk6_reset();
  SELECT status::text, closed_at INTO v_st, v_closed FROM public.service_tickets WHERE id = v_t;
  PERFORM spk6_note('Q6-32',
    r1.o_ok AND (NOT r2.o_ok) AND v_st = 'closed' AND v_closed IS NOT NULL,
    format('reclose_ok=%s reopen=%s/%s st=%s', r1.o_ok, NOT r2.o_ok, r2.o_state, v_st));
END $$;

-- Q6-33 audit-write failure rolls back the acknowledgment (atomic audit)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; r record; v_n int;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q33');
  CREATE OR REPLACE FUNCTION public.spk6_audit_bomb() RETURNS trigger
  LANGUAGE plpgsql AS $f$ BEGIN
    IF NEW.action = 'record_acknowledgment' THEN
      RAISE EXCEPTION 'spk6 audit bomb' USING ERRCODE = 'raise_exception';
    END IF;
    RETURN NEW;
  END; $f$;
  DROP TRIGGER IF EXISTS spk6_audit_bomb_trg ON public.service_workflow_audit;
  CREATE TRIGGER spk6_audit_bomb_trg BEFORE INSERT ON public.service_workflow_audit
  FOR EACH ROW EXECUTE FUNCTION public.spk6_audit_bomb();
  PERFORM spk6_as_client(spk6_uid('cust1'));
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.record_service_acknowledgment(%L::uuid,'accepted','x',NULL)$q$, v_rev));
  PERFORM spk6_reset();
  SELECT count(*) INTO v_n FROM public.service_acknowledgments WHERE issued_revision_id = v_rev;
  DROP TRIGGER spk6_audit_bomb_trg ON public.service_workflow_audit;
  DROP FUNCTION public.spk6_audit_bomb();
  PERFORM spk6_note('Q6-33',
    (NOT r.o_ok) AND v_n = 0,
    format('denied=%s/%s rows=%s msg=%s', NOT r.o_ok, r.o_state, v_n, left(r.o_msg, 60)));
END $$;

-- Q6-34 getter visibility: owner sees own-ticket ack; unrelated gets null row; staff sees row
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  o_resp text; o_n int; u_id uuid; s_resp text;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q34');
  PERFORM spk6_as_client(spk6_uid('support'));
  PERFORM public.record_service_acknowledgment_unavailable(v_rev, spk6_attempts(), 'away', NULL);
  PERFORM spk6_as_client(spk6_uid('cust1'));
  SELECT (public.effective_acknowledgment(v_rev)).response,
         jsonb_array_length((public.effective_acknowledgment(v_rev)).contact_attempts)
  INTO o_resp, o_n;
  PERFORM spk6_as_client(spk6_uid('cust2'));
  SELECT (public.effective_acknowledgment(v_rev)).id INTO u_id;
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT (public.effective_acknowledgment(v_rev)).response INTO s_resp;
  PERFORM spk6_reset();
  PERFORM spk6_note('Q6-34',
    o_resp = 'unavailable' AND o_n = 3 AND u_id IS NULL AND s_resp = 'unavailable',
    format('owner=%s/%s unrelated_null=%s staff=%s', o_resp, o_n, u_id IS NULL, s_resp));
END $$;

-- Q6-35 direct SELECT on acks/dispositions: owner sees own, unrelated sees none, staff sees
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  o_a int; o_d int; u_a int; u_d int; s_a int; s_d int;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q35');
  PERFORM spk6_as_client(spk6_uid('cust1'));
  PERFORM public.record_service_acknowledgment(v_rev, 'refused', 'bad', NULL);
  PERFORM spk6_as_client(spk6_uid('support'));
  PERFORM public.record_acknowledgment_disposition(v_rev, 'accept_refusal_and_proceed', 'ok', NULL);
  PERFORM spk6_as_client(spk6_uid('cust1'));
  SELECT count(*) INTO o_a FROM public.service_acknowledgments WHERE issued_revision_id = v_rev;
  SELECT count(*) INTO o_d FROM public.service_acknowledgment_dispositions WHERE issued_revision_id = v_rev;
  PERFORM spk6_as_client(spk6_uid('cust2'));
  SELECT count(*) INTO u_a FROM public.service_acknowledgments WHERE issued_revision_id = v_rev;
  SELECT count(*) INTO u_d FROM public.service_acknowledgment_dispositions WHERE issued_revision_id = v_rev;
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT count(*) INTO s_a FROM public.service_acknowledgments WHERE issued_revision_id = v_rev;
  SELECT count(*) INTO s_d FROM public.service_acknowledgment_dispositions WHERE issued_revision_id = v_rev;
  PERFORM spk6_reset();
  PERFORM spk6_note('Q6-35',
    o_a = 1 AND o_d = 1 AND u_a = 0 AND u_d = 0 AND s_a = 1 AND s_d = 1,
    format('owner=%s/%s unrelated=%s/%s staff=%s/%s', o_a, o_d, u_a, u_d, s_a, s_d));
END $$;

-- Q6-36 share payload exposes no acknowledgment/contact keys (live getter + static def)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; v_tok text := 'spk6-share-' || substr(replace(gen_random_uuid()::text,'-',''),1,8);
  v_share jsonb; v_src text; v_ok boolean;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q36');
  PERFORM spk6_as_client(spk6_uid('cust1'));
  PERFORM public.record_service_acknowledgment(v_rev, 'accepted', 'fine', NULL);
  PERFORM spk6_reset();
  -- owner-seeded share: the disposable reduced chain lacks the historic INSERT
  -- grant on ticket_shares (pre-existing harness-chain artifact; share creation
  -- itself is Slice0 scope, verified live). The B6 property is the getter payload.
  INSERT INTO public.ticket_shares (ticket_id, token, created_by, expires_at)
  VALUES (v_t, v_tok, spk6_uid('cust1'), now() + interval '1 day');
  PERFORM spk6_as_role('anon', NULL);
  SELECT public.get_shared_ticket(v_tok) INTO v_share;
  PERFORM spk6_reset();
  SELECT prosrc INTO v_src FROM pg_proc WHERE proname = 'get_shared_ticket';
  v_ok := (v_share::text NOT ILIKE '%acknowledg%') AND (v_share::text NOT ILIKE '%contact_attempt%')
    AND (v_src NOT ILIKE '%acknowledg%') AND (v_src NOT ILIKE '%contact_attempt%');
  PERFORM spk6_note('Q6-36', v_ok,
    format('live_clean=%s static_clean=%s',
      (v_share::text NOT ILIKE '%acknowledg%') AND (v_share::text NOT ILIKE '%contact_attempt%'),
      (v_src NOT ILIKE '%acknowledg%') AND (v_src NOT ILIKE '%contact_attempt%')));
END $$;

-- Q6-37 anon EXECUTE denied on all B6 entry points; authenticated allowed
DO $$
DECLARE v_anon boolean; v_auth boolean;
BEGIN
  PERFORM spk6_reset();
  SELECT NOT (
    has_function_privilege('anon', 'public.record_service_acknowledgment(uuid,text,text,uuid)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.record_service_acknowledgment_unavailable(uuid,jsonb,text,uuid)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.record_acknowledgment_disposition(uuid,text,text,uuid)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.effective_acknowledgment(uuid)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.effective_acknowledgment_disposition(uuid)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.evaluate_ticket_workflow_prerequisites(uuid)', 'EXECUTE')
  ) INTO v_anon;
  SELECT (
    has_function_privilege('authenticated', 'public.record_service_acknowledgment(uuid,text,text,uuid)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.record_service_acknowledgment_unavailable(uuid,jsonb,text,uuid)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.record_acknowledgment_disposition(uuid,text,text,uuid)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.effective_acknowledgment(uuid)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.effective_acknowledgment_disposition(uuid)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.evaluate_ticket_workflow_prerequisites(uuid)', 'EXECUTE')
  ) INTO v_auth;
  PERFORM spk6_note('Q6-37', v_anon AND v_auth, format('anon_denied=%s auth_ok=%s', v_anon, v_auth));
END $$;

-- Q6-38 service_role EXECUTE: denied on 3 writers; allowed on evaluate (trusted read)
DO $$
DECLARE v_w boolean; v_e boolean;
BEGIN
  PERFORM spk6_reset();
  SELECT NOT (
    has_function_privilege('service_role', 'public.record_service_acknowledgment(uuid,text,text,uuid)', 'EXECUTE')
    OR has_function_privilege('service_role', 'public.record_service_acknowledgment_unavailable(uuid,jsonb,text,uuid)', 'EXECUTE')
    OR has_function_privilege('service_role', 'public.record_acknowledgment_disposition(uuid,text,text,uuid)', 'EXECUTE')
  ) INTO v_w;
  SELECT has_function_privilege('service_role', 'public.evaluate_ticket_workflow_prerequisites(uuid)', 'EXECUTE') INTO v_e;
  PERFORM spk6_note('Q6-38', v_w AND v_e, format('writers_denied=%s eval_ok=%s', v_w, v_e));
END $$;

-- Q6-39 safe search_path + SECURITY DEFINER on B6 writers/evaluator/govern
DO $$
DECLARE v_ok boolean; v_names text;
BEGIN
  PERFORM spk6_reset();
  SELECT bool_and(p.proconfig::text ILIKE '%search_path=pg_catalog, public%')
         AND bool_and(p.prosecdef),
         string_agg(p.proname || '/' || pg_get_function_identity_arguments(p.oid), ', ' ORDER BY 1)
  INTO v_ok, v_names
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN (
    'record_service_acknowledgment', 'record_service_acknowledgment_unavailable',
    'record_acknowledgment_disposition', 'evaluate_ticket_workflow_prerequisites',
    'govern_ticket_transition');
  PERFORM spk6_note('Q6-39', coalesce(v_ok, false), format('n=%s ok=%s', v_names, v_ok));
END $$;

-- Q6-40 direct INSERT/UPDATE/DELETE on acks/dispositions denied for ordinary callers;
-- disposition immutability trigger blocks owner UPDATE/DELETE too
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; v_aid uuid;
  r1 record; r2 record; r3 record; r4 record; v_n0 int; v_n1 int;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q40');
  PERFORM spk6_as_client(spk6_uid('cust1'));
  SELECT (public.record_service_acknowledgment(v_rev, 'accepted', 'ok', NULL)).id INTO v_aid;
  SELECT count(*) INTO v_n0 FROM public.service_acknowledgments WHERE issued_revision_id = v_rev;
  SELECT * INTO r1 FROM spk6_try(format(
    $q$INSERT INTO public.service_acknowledgments(issued_revision_id, response, responded_by) VALUES (%L::uuid,'accepted',%L::uuid)$q$,
    v_rev, spk6_uid('cust1')));
  SELECT * INTO r2 FROM spk6_try(format(
    $q$UPDATE public.service_acknowledgments SET response='refused' WHERE id=%L::uuid$q$, v_aid));
  SELECT * INTO r3 FROM spk6_try(format(
    $q$DELETE FROM public.service_acknowledgments WHERE id=%L::uuid$q$, v_aid));
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT * INTO r4 FROM spk6_try(format(
    $q$INSERT INTO public.service_acknowledgment_dispositions(issued_revision_id, acknowledgment_id, disposition, rationale, decided_by) VALUES (%L::uuid,%L::uuid,'accept_refusal_and_proceed','x',%L::uuid)$q$,
    v_rev, v_aid, spk6_uid('support')));
  PERFORM spk6_reset();
  SELECT count(*) INTO v_n1 FROM public.service_acknowledgments WHERE issued_revision_id = v_rev;
  PERFORM spk6_note('Q6-40',
    (NOT r1.o_ok) AND (NOT r2.o_ok) AND (NOT r3.o_ok) AND (NOT r4.o_ok) AND v_n0 = 1 AND v_n1 = 1,
    format('ins=%s/%s upd=%s/%s del=%s/%s dispins=%s/%s rows=%s/%s',
      NOT r1.o_ok, r1.o_state, NOT r2.o_ok, r2.o_state, NOT r3.o_ok, r3.o_state,
      NOT r4.o_ok, r4.o_state, v_n0, v_n1));
END $$;

-- Q6-41 timestamp ties resolve by insertion order (last writer wins), 10/10 trials.
-- Random-id tiebreak passes a single trial with p=0.5; 10/10 requires a real rule.
DO $$
DECLARE i int; v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  a1 public.service_acknowledgments; a2 public.service_acknowledgments;
  v_eff public.service_acknowledgments; v_eff2 public.service_acknowledgments;
  v_wins int := 0; v_stable boolean := true;
BEGIN
  PERFORM spk6_reset();
  ALTER TABLE public.service_acknowledgments DISABLE TRIGGER trg_ack_immutable;
  FOR i IN 1..10 LOOP
    SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_issued('q41-' || i);
    PERFORM spk6_as_client(spk6_uid('cust1'));
    a1 := public.record_service_acknowledgment(v_rev, 'accepted', 'first', NULL);
    a2 := public.record_service_acknowledgment(v_rev, 'refused', 'second thoughts', NULL);
    PERFORM spk6_reset();
    UPDATE public.service_acknowledgments
    SET responded_at = '2026-01-01T00:00:00Z'::timestamptz
    WHERE issued_revision_id = v_rev;
    v_eff := public.effective_acknowledgment(v_rev);
    v_eff2 := public.effective_acknowledgment(v_rev);
    IF v_eff.id = a2.id THEN v_wins := v_wins + 1; END IF;
    IF v_eff2.id IS DISTINCT FROM v_eff.id THEN v_stable := false; END IF;
  END LOOP;
  ALTER TABLE public.service_acknowledgments ENABLE TRIGGER trg_ack_immutable;
  PERFORM spk6_note('Q6-41', v_wins = 10 AND v_stable,
    format('last_writer_wins=%s/10 stable_reads=%s', v_wins, v_stable));
END $$;

-- Q6-42 repeating closure preserves closed_at and creates no duplicate closure event
-- (backdate closed_at first: same-txn now() would otherwise mask a rewrite)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; r record;
  c2 timestamptz; n1 int; n2 int; g1 int; g2 int; v_st text;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_close_ready('q42');
  PERFORM spk6_as_client(spk6_uid('support'));
  PERFORM public.govern_ticket_transition(v_t, 'closed', 'spk6', 'summary here', NULL);
  PERFORM spk6_reset();
  UPDATE public.service_tickets SET closed_at = '2020-01-01T00:00:00Z'::timestamptz WHERE id = v_t;
  SELECT count(*) INTO n1 FROM public.service_workflow_audit
  WHERE entity_type = 'ticket' AND entity_id = v_t AND action = 'workflow_resolve_close' AND to_state = 'closed';
  SELECT count(*) INTO g1 FROM public.ticket_governance_audit
  WHERE ticket_id = v_t AND action = 'status_transition' AND to_status = 'closed';
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'closed','spk6','summary here',NULL)$q$, v_t));
  PERFORM spk6_reset();
  SELECT closed_at, status::text INTO c2, v_st FROM public.service_tickets WHERE id = v_t;
  SELECT count(*) INTO n2 FROM public.service_workflow_audit
  WHERE entity_type = 'ticket' AND entity_id = v_t AND action = 'workflow_resolve_close' AND to_state = 'closed';
  SELECT count(*) INTO g2 FROM public.ticket_governance_audit
  WHERE ticket_id = v_t AND action = 'status_transition' AND to_status = 'closed';
  PERFORM spk6_note('Q6-42',
    r.o_ok AND v_st = 'closed' AND c2 = '2020-01-01T00:00:00Z'::timestamptz AND n2 = n1 AND g2 = g1,
    format('ok=%s closed_kept=%s wf=%s/%s gov=%s/%s', r.o_ok,
      c2 = '2020-01-01T00:00:00Z'::timestamptz, n1, n2, g1, g2));
END $$;

-- Q6-43 audit-write failure on the closure path rolls back resolve/close (atomic closure)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev uuid; r record; v_st text; v_n int; v_closed timestamptz;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_close_ready('q43');
  CREATE OR REPLACE FUNCTION public.spk6_close_bomb() RETURNS trigger
  LANGUAGE plpgsql AS $f$ BEGIN
    IF NEW.action = 'workflow_resolve_close' THEN
      RAISE EXCEPTION 'spk6 closure bomb' USING ERRCODE = 'raise_exception';
    END IF;
    RETURN NEW;
  END; $f$;
  DROP TRIGGER IF EXISTS spk6_close_bomb_trg ON public.service_workflow_audit;
  CREATE TRIGGER spk6_close_bomb_trg BEFORE INSERT ON public.service_workflow_audit
  FOR EACH ROW EXECUTE FUNCTION public.spk6_close_bomb();
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'closed','spk6','summary here',NULL)$q$, v_t));
  PERFORM spk6_reset();
  SELECT status::text, closed_at INTO v_st, v_closed FROM public.service_tickets WHERE id = v_t;
  SELECT count(*) INTO v_n FROM public.service_workflow_audit
  WHERE entity_type = 'ticket' AND entity_id = v_t AND action = 'workflow_resolve_close' AND to_state = 'closed';
  DROP TRIGGER spk6_close_bomb_trg ON public.service_workflow_audit;
  DROP FUNCTION public.spk6_close_bomb();
  PERFORM spk6_note('Q6-43',
    (NOT r.o_ok) AND v_st = 'resolved' AND v_n = 0 AND v_closed IS NULL,
    format('denied=%s/%s st=%s aud=%s msg=%s', NOT r.o_ok, r.o_state, v_st, v_n, left(r.o_msg, 60)));
END $$;

-- Q6-44 F-B6-08: authorization runs before idempotent re-close return.
-- Authorized admin/support: success, closed_at preserved, no duplicate audits, ticket returned.
-- Denied callers (owner, assigned/unrelated tech, sales, anon, forged, unattributed service_role):
-- exception (no ticket payload) and zero mutation. Verified service_role+support delegation allowed.
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  r record; v_row public.service_tickets;
  c0 timestamptz; u0 timestamptz; st0 text; n_wf0 int; n_gov0 int;
  c1 timestamptz; u1 timestamptz; st1 text; n_wf1 int; n_gov1 int;
  ok_support boolean; ok_admin boolean; ok_svc_del boolean;
  den_cust boolean; den_tech1 boolean; den_tech2 boolean; den_sales boolean;
  den_anon boolean; den_forge boolean; den_svc_null boolean;
  no_mut_den boolean := true; no_mut_ok boolean := true;
BEGIN
  PERFORM spk6_reset();
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_mk_close_ready('q44');
  PERFORM spk6_as_client(spk6_uid('support'));
  PERFORM public.govern_ticket_transition(v_t, 'closed', 'spk6', 'summary here', NULL);
  PERFORM spk6_reset();
  UPDATE public.service_tickets
  SET closed_at = '2020-01-01T00:00:00Z'::timestamptz, assigned_to = spk6_uid('tech1')
  WHERE id = v_t;
  SELECT closed_at, updated_at, status::text INTO c0, u0, st0 FROM public.service_tickets WHERE id = v_t;
  SELECT count(*) INTO n_wf0 FROM public.service_workflow_audit
  WHERE entity_type = 'ticket' AND entity_id = v_t AND action = 'workflow_resolve_close' AND to_state = 'closed';
  SELECT count(*) INTO n_gov0 FROM public.ticket_governance_audit
  WHERE ticket_id = v_t AND action = 'status_transition' AND to_status = 'closed';

  -- Authorized support re-close
  PERFORM spk6_as_client(spk6_uid('support'));
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'closed','spk6','summary here',NULL)$q$, v_t));
  ok_support := r.o_ok;
  PERFORM spk6_reset();
  SELECT closed_at, updated_at, status::text INTO c1, u1, st1 FROM public.service_tickets WHERE id = v_t;
  SELECT count(*) INTO n_wf1 FROM public.service_workflow_audit
  WHERE entity_type = 'ticket' AND entity_id = v_t AND action = 'workflow_resolve_close' AND to_state = 'closed';
  SELECT count(*) INTO n_gov1 FROM public.ticket_governance_audit
  WHERE ticket_id = v_t AND action = 'status_transition' AND to_status = 'closed';
  IF NOT (c1 = c0 AND u1 = u0 AND st1 = st0 AND n_wf1 = n_wf0 AND n_gov1 = n_gov0) THEN
    no_mut_ok := false;
  END IF;

  -- Authorized admin re-close
  PERFORM spk6_as_client(spk6_uid('admin'));
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'closed','spk6','summary here',NULL)$q$, v_t));
  ok_admin := r.o_ok;
  PERFORM spk6_reset();

  -- Verified service_role delegation as support
  PERFORM spk6_as_role('service_role', NULL);
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'closed','spk6','summary here',%L::uuid)$q$,
    v_t, spk6_uid('support')));
  ok_svc_del := r.o_ok;
  PERFORM spk6_reset();

  -- Snapshot before denial battery
  SELECT closed_at, updated_at, status::text INTO c0, u0, st0 FROM public.service_tickets WHERE id = v_t;
  SELECT count(*) INTO n_wf0 FROM public.service_workflow_audit
  WHERE entity_type = 'ticket' AND entity_id = v_t AND action = 'workflow_resolve_close' AND to_state = 'closed';
  SELECT count(*) INTO n_gov0 FROM public.ticket_governance_audit
  WHERE ticket_id = v_t AND action = 'status_transition' AND to_status = 'closed';

  PERFORM spk6_as_client(spk6_uid('cust1'));
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'closed','spk6','summary here',NULL)$q$, v_t));
  den_cust := (NOT r.o_ok) AND r.o_state = '42501';
  PERFORM spk6_reset();

  PERFORM spk6_as_client(spk6_uid('tech1'));
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'closed','spk6','summary here',NULL)$q$, v_t));
  den_tech1 := (NOT r.o_ok) AND r.o_state = '42501';
  PERFORM spk6_reset();

  PERFORM spk6_as_client(spk6_uid('tech2'));
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'closed','spk6','summary here',NULL)$q$, v_t));
  den_tech2 := (NOT r.o_ok) AND r.o_state = '42501';
  PERFORM spk6_reset();

  PERFORM spk6_as_client(spk6_uid('sales'));
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'closed','spk6','summary here',NULL)$q$, v_t));
  den_sales := (NOT r.o_ok) AND r.o_state = '42501';
  PERFORM spk6_reset();

  PERFORM spk6_as_role('anon', NULL);
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'closed','spk6','summary here',NULL)$q$, v_t));
  den_anon := NOT r.o_ok;
  PERFORM spk6_reset();

  PERFORM spk6_as_client(spk6_uid('cust1'));
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'closed','spk6','summary here',%L::uuid)$q$,
    v_t, spk6_uid('support')));
  den_forge := NOT r.o_ok;
  PERFORM spk6_reset();

  PERFORM spk6_as_role('service_role', NULL);
  SELECT * INTO r FROM spk6_try(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'closed','spk6','summary here',NULL)$q$, v_t));
  den_svc_null := NOT r.o_ok;
  PERFORM spk6_reset();

  SELECT closed_at, updated_at, status::text INTO c1, u1, st1 FROM public.service_tickets WHERE id = v_t;
  SELECT count(*) INTO n_wf1 FROM public.service_workflow_audit
  WHERE entity_type = 'ticket' AND entity_id = v_t AND action = 'workflow_resolve_close' AND to_state = 'closed';
  SELECT count(*) INTO n_gov1 FROM public.ticket_governance_audit
  WHERE ticket_id = v_t AND action = 'status_transition' AND to_status = 'closed';
  IF NOT (c1 = c0 AND u1 = u0 AND st1 = st0 AND n_wf1 = n_wf0 AND n_gov1 = n_gov0
          AND c1 = '2020-01-01T00:00:00Z'::timestamptz) THEN
    no_mut_den := false;
  END IF;

  -- Explicit no-payload check: denied SELECT must raise (v_row stays NULL)
  v_row := NULL;
  PERFORM spk6_as_client(spk6_uid('cust1'));
  BEGIN
    SELECT * INTO STRICT v_row FROM public.govern_ticket_transition(v_t, 'closed', 'spk6', 'summary here', NULL);
  EXCEPTION WHEN OTHERS THEN
    v_row := NULL;
  END;
  PERFORM spk6_reset();
  IF v_row IS NOT NULL THEN den_cust := false; END IF;

  PERFORM spk6_note('Q6-44',
    ok_support AND ok_admin AND ok_svc_del
      AND den_cust AND den_tech1 AND den_tech2 AND den_sales
      AND den_anon AND den_forge AND den_svc_null
      AND no_mut_ok AND no_mut_den,
    format(
      'auth_ok=%s/%s/%s den=%s/%s/%s/%s/%s/%s/%s mut_ok=%s mut_den=%s',
      ok_support, ok_admin, ok_svc_del,
      den_cust, den_tech1, den_tech2, den_sales, den_anon, den_forge, den_svc_null,
      no_mut_ok, no_mut_den));
END $$;
