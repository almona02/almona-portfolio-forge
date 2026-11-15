-- Spark independent B5 battery (disposable only; never staging/prod).
-- Freeze: f8fb9358e976050089cd199579a99bc0a098e0c2
-- Chain: disposable_b1_base + boundary + tkt-sec2 + B1/B2/SEC/RLSx3/B3x5 + B4 + B4FIX + B5.
-- Role discipline: RPC calls as b1_auth (authenticated stand-in) unless noted.
-- Anon: SET ROLE anon + empty app.b1_uid. Service-role: SET ROLE service_role.

CREATE TABLE IF NOT EXISTS public.spk5_eval(check_id text PRIMARY KEY, status text NOT NULL, detail text);
TRUNCATE public.spk5_eval;

CREATE OR REPLACE FUNCTION spk5_note(p_id text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO public.spk5_eval(check_id, status, detail)
  VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, left(p_detail, 500))
  ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
END; $$;

CREATE OR REPLACE FUNCTION spk5_uid(n text) RETURNS uuid
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
CREATE OR REPLACE FUNCTION spk5_try(p_sql text, OUT o_ok boolean, OUT o_state text, OUT o_msg text)
RETURNS record LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
  EXECUTE p_sql; o_ok := true; o_state := '00000'; o_msg := '';
EXCEPTION WHEN OTHERS THEN o_ok := false; o_state := SQLSTATE; o_msg := left(SQLERRM, 300);
END; $$;

CREATE OR REPLACE FUNCTION spk5_as_client(p_uid uuid)
RETURNS void LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
  EXECUTE 'SET ROLE b1_auth';
  PERFORM set_config('app.b1_uid', COALESCE(p_uid::text, ''), false);
END; $$;

CREATE OR REPLACE FUNCTION spk5_as_role(p_role text, p_uid uuid)
RETURNS void LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
  EXECUTE format('SET ROLE %I', p_role);
  PERFORM set_config('app.b1_uid', COALESCE(p_uid::text, ''), false);
END; $$;

CREATE OR REPLACE FUNCTION spk5_reset()
RETURNS void LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
  EXECUTE 'RESET ROLE';
  PERFORM set_config('app.b1_uid', '', false);
END; $$;

CREATE OR REPLACE FUNCTION spk5_mk_completed_visit(p_tag text, p_tech text DEFAULT 'tech1', p_owner text DEFAULT 'cust1',
  OUT o_ticket uuid, OUT o_job uuid, OUT o_visit uuid)
RETURNS record LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
DECLARE
  v_s timestamptz := now() + interval '1 hour';
  v_e timestamptz := now() + interval '3 hours';
  v_att text;
BEGIN
  PERFORM set_config('app.b1_uid', spk5_uid('support')::text, false);
  INSERT INTO public.service_tickets (ticket_number, user_id, title, description, type, priority, status, assigned_to, assigned_by, assigned_at)
  VALUES ('SPK5-' || p_tag || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6),
    spk5_uid(p_owner), 'spk5', 'spk5', 'general', 'medium', 'assigned',
    spk5_uid(p_tech), spk5_uid('support'), now())
  RETURNING id INTO o_ticket;
  SELECT (public.create_service_job(o_ticket, 'SPK5 ' || p_tag, true, 'spk5')).id INTO o_job;
  PERFORM public.assign_service_job(o_job, spk5_uid(p_tech), 'spk5', NULL);
  SELECT (public.schedule_service_job_visit(o_job, v_s, v_e, 'spk5', NULL)).id INTO o_visit;
  v_att := public.b3_minimum_safety_attestation();
  PERFORM set_config('app.b1_uid', spk5_uid(p_tech)::text, false);
  PERFORM public.record_visit_safety_check(o_visit, 'passed', 'spk5', NULL, v_att);
  PERFORM public.start_service_job_visit(o_visit, NULL, v_att, 'spk5');
  PERFORM public.complete_service_job_visit(o_visit);
  PERFORM set_config('app.b1_uid', '', false);
END; $$;

-- Job with TWO completed visits (both attended by tech1) for outstanding-visit checks.
CREATE OR REPLACE FUNCTION spk5_mk_two_visits(p_tag text,
  OUT o_ticket uuid, OUT o_job uuid, OUT o_v1 uuid, OUT o_v2 uuid)
RETURNS record LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
DECLARE
  v_s timestamptz := now() + interval '1 hour';
  v_e timestamptz := now() + interval '3 hours';
  v_att text;
BEGIN
  PERFORM set_config('app.b1_uid', spk5_uid('support')::text, false);
  INSERT INTO public.service_tickets (ticket_number, user_id, title, description, type, priority, status, assigned_to, assigned_by, assigned_at)
  VALUES ('SPK5-' || p_tag || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6),
    spk5_uid('cust1'), 'spk5', 'spk5', 'general', 'medium', 'assigned',
    spk5_uid('tech1'), spk5_uid('support'), now())
  RETURNING id INTO o_ticket;
  SELECT (public.create_service_job(o_ticket, 'SPK5 ' || p_tag, true, 'spk5')).id INTO o_job;
  PERFORM public.assign_service_job(o_job, spk5_uid('tech1'), 'spk5', NULL);
  SELECT (public.schedule_service_job_visit(o_job, v_s, v_e, 'spk5', NULL)).id INTO o_v1;
  SELECT (public.schedule_service_job_visit(o_job, v_s, v_e, 'spk5b', NULL)).id INTO o_v2;
  v_att := public.b3_minimum_safety_attestation();
  PERFORM set_config('app.b1_uid', spk5_uid('tech1')::text, false);
  PERFORM public.record_visit_safety_check(o_v1, 'passed', 'spk5', NULL, v_att);
  PERFORM public.start_service_job_visit(o_v1, NULL, v_att, 'spk5');
  PERFORM public.complete_service_job_visit(o_v1);
  PERFORM public.record_visit_safety_check(o_v2, 'passed', 'spk5', NULL, v_att);
  PERFORM public.start_service_job_visit(o_v2, NULL, v_att, 'spk5');
  PERFORM public.complete_service_job_visit(o_v2);
  PERFORM set_config('app.b1_uid', '', false);
END; $$;

CREATE OR REPLACE FUNCTION spk5_seed_evidence(p_path text)
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

-- Standard submit as tech1; caller sets role/GUC first. Seeds evidence. Returns revision.
CREATE OR REPLACE FUNCTION spk5_submit(p_visit uuid, p_ticket uuid, p_tag text,
  p_outcome text DEFAULT 'verified_fixed', p_reason text DEFAULT NULL)
RETURNS public.service_report_revisions LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
DECLARE v_path text; v_rev public.service_report_revisions;
BEGIN
  v_path := p_ticket::text || '/b4/spk5-' || p_tag || '.jpg';
  PERFORM spk5_seed_evidence(v_path);
  v_rev := public.submit_service_report_revision(
    p_visit, 'findings spk5 ' || p_tag, 'work spk5 ' || p_tag,
    '[]'::jsonb, true, p_outcome, p_reason, 'I declare spk5.',
    ARRAY[v_path], NULL, gen_random_uuid(), NULL);
  RETURN v_rev;
END; $$;

-- Q5-01 support returns exact revision: row binds exact id, job -> in_progress, audits
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  v_rw public.service_report_reviews; v_job text; v_nrev int; v_naud int; v_njob int;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q01');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q01');
  PERFORM spk5_as_client(spk5_uid('support'));
  v_rw := public.review_service_report_revision(v_rev.id, 'returned', 'need sharper photos', NULL);
  PERFORM spk5_reset();
  SELECT state INTO v_job FROM public.service_jobs WHERE id = v_j;
  SELECT count(*) INTO v_nrev FROM public.service_report_reviews WHERE revision_id = v_rev.id;
  SELECT count(*) INTO v_naud FROM public.service_workflow_audit
  WHERE entity_type = 'service_report_review' AND entity_id = v_rw.id AND action = 'return_report';
  SELECT count(*) INTO v_njob FROM public.service_workflow_audit
  WHERE entity_type = 'service_job' AND entity_id = v_j AND action = 'job_transition'
    AND from_state = 'awaiting_review' AND to_state = 'in_progress';
  PERFORM spk5_note('Q5-01',
    v_rw.revision_id = v_rev.id AND v_rw.decision = 'returned'
      AND v_rw.reviewer_id = spk5_uid('support') AND v_job = 'in_progress'
      AND v_nrev = 1 AND v_naud = 1 AND v_njob = 1,
    format('rev=%s job=%s reviews=%s raud=%s jaud=%s', v_rw.decision, v_job, v_nrev, v_naud, v_njob));
END $$;

-- Q5-02 admin approve positive: issued, job completed, completing revision, audits
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  v_rw public.service_report_reviews; v_job public.service_jobs; v_naud int; v_njob int;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q02');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q02');
  PERFORM spk5_as_client(spk5_uid('admin'));
  v_rw := public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);
  PERFORM spk5_reset();
  SELECT * INTO v_job FROM public.service_jobs WHERE id = v_j;
  SELECT count(*) INTO v_naud FROM public.service_workflow_audit
  WHERE entity_type = 'service_report_review' AND entity_id = v_rw.id AND action = 'approve_issue_report';
  SELECT count(*) INTO v_njob FROM public.service_workflow_audit
  WHERE entity_type = 'service_job' AND entity_id = v_j AND action = 'job_transition'
    AND from_state = 'awaiting_review' AND to_state = 'completed';
  PERFORM spk5_note('Q5-02',
    v_rw.decision = 'approved_issued' AND v_rw.reviewer_id = spk5_uid('admin')
      AND v_job.state = 'completed' AND v_job.completing_revision_id = v_rev.id
      AND v_naud = 1 AND v_njob = 1,
    format('job=%s completing=%s raud=%s jaud=%s', v_job.state,
      v_job.completing_revision_id = v_rev.id, v_naud, v_njob));
END $$;

-- Q5-03 author-technician cannot review own revision (both decisions); zero writes
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  r1 record; r2 record; v_n int; v_a0 int; v_a1 int; v_job text;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q03');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q03');
  PERFORM spk5_reset();
  SELECT count(*) INTO v_a0 FROM public.service_workflow_audit WHERE ticket_id = v_t;
  PERFORM spk5_as_client(spk5_uid('tech1'));
  SELECT * INTO r1 FROM spk5_try(format($q$SELECT public.review_service_report_revision(%L::uuid,'approved_issued',NULL,NULL)$q$, v_rev.id));
  SELECT * INTO r2 FROM spk5_try(format($q$SELECT public.review_service_report_revision(%L::uuid,'returned','self',NULL)$q$, v_rev.id));
  PERFORM spk5_reset();
  SELECT count(*) INTO v_n FROM public.service_report_reviews WHERE revision_id = v_rev.id;
  SELECT count(*) INTO v_a1 FROM public.service_workflow_audit WHERE ticket_id = v_t;
  SELECT state INTO v_job FROM public.service_jobs WHERE id = v_j;
  PERFORM spk5_note('Q5-03',
    (NOT r1.o_ok) AND r1.o_state = '42501' AND (NOT r2.o_ok) AND r2.o_state = '42501'
      AND v_n = 0 AND v_a1 = v_a0 AND v_job = 'awaiting_review',
    format('approve=%s/%s return=%s/%s rows=%s audits=%s job=%s',
      NOT r1.o_ok, r1.o_state, NOT r2.o_ok, r2.o_state, v_n, v_a1 - v_a0, v_job));
END $$;

-- Q5-04 author still denied after role elevation to support (submitted_by, not role)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  r record; v_n int; v_role text;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q04');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q04');
  PERFORM spk5_reset();
  UPDATE public.profiles SET role = 'support' WHERE id = spk5_uid('tech1');
  SELECT role INTO v_role FROM public.profiles WHERE id = spk5_uid('tech1');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  SELECT * INTO r FROM spk5_try(format($q$SELECT public.review_service_report_revision(%L::uuid,'approved_issued',NULL,NULL)$q$, v_rev.id));
  PERFORM spk5_reset();
  UPDATE public.profiles SET role = 'technician' WHERE id = spk5_uid('tech1');
  SELECT count(*) INTO v_n FROM public.service_report_reviews WHERE revision_id = v_rev.id;
  PERFORM spk5_note('Q5-04',
    v_role = 'support' AND (NOT r.o_ok) AND r.o_state = '42501' AND v_n = 0,
    format('elevated=%s denied=%s/%s rows=%s', v_role, NOT r.o_ok, r.o_state, v_n));
END $$;

-- Q5-05 customer / sales / anon cannot review
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  r1 record; r2 record; r3 record; v_n int;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q05');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q05');
  PERFORM spk5_as_client(spk5_uid('cust1'));
  SELECT * INTO r1 FROM spk5_try(format($q$SELECT public.review_service_report_revision(%L::uuid,'approved_issued',NULL,NULL)$q$, v_rev.id));
  PERFORM spk5_as_client(spk5_uid('sales'));
  SELECT * INTO r2 FROM spk5_try(format($q$SELECT public.review_service_report_revision(%L::uuid,'returned','x',NULL)$q$, v_rev.id));
  PERFORM spk5_as_role('anon', NULL);
  SELECT * INTO r3 FROM spk5_try(format($q$SELECT public.review_service_report_revision(%L::uuid,'approved_issued',NULL,NULL)$q$, v_rev.id));
  PERFORM spk5_reset();
  SELECT count(*) INTO v_n FROM public.service_report_reviews WHERE revision_id = v_rev.id;
  PERFORM spk5_note('Q5-05',
    (NOT r1.o_ok) AND (NOT r2.o_ok) AND (NOT r3.o_ok) AND v_n = 0,
    format('cust=%s/%s sales=%s/%s anon=%s/%s rows=%s',
      NOT r1.o_ok, r1.o_state, NOT r2.o_ok, r2.o_state, NOT r3.o_ok, r3.o_state, v_n));
END $$;

-- Q5-06 unrelated technician cannot review
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  r record; v_n int;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q06');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q06');
  PERFORM spk5_as_client(spk5_uid('tech2'));
  SELECT * INTO r FROM spk5_try(format($q$SELECT public.review_service_report_revision(%L::uuid,'approved_issued',NULL,NULL)$q$, v_rev.id));
  PERFORM spk5_reset();
  SELECT count(*) INTO v_n FROM public.service_report_reviews WHERE revision_id = v_rev.id;
  PERFORM spk5_note('Q5-06',
    (NOT r.o_ok) AND r.o_state = '42501' AND v_n = 0,
    format('denied=%s/%s rows=%s', NOT r.o_ok, r.o_state, v_n));
END $$;

-- Q5-07 return with NULL / blank comments denied; revision stays undecided
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  r1 record; r2 record; v_n int; v_job text;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q07');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q07');
  PERFORM spk5_as_client(spk5_uid('support'));
  SELECT * INTO r1 FROM spk5_try(format($q$SELECT public.review_service_report_revision(%L::uuid,'returned',NULL,NULL)$q$, v_rev.id));
  SELECT * INTO r2 FROM spk5_try(format($q$SELECT public.review_service_report_revision(%L::uuid,'returned','   ',NULL)$q$, v_rev.id));
  PERFORM spk5_reset();
  SELECT count(*) INTO v_n FROM public.service_report_reviews WHERE revision_id = v_rev.id;
  SELECT state INTO v_job FROM public.service_jobs WHERE id = v_j;
  PERFORM spk5_note('Q5-07',
    (NOT r1.o_ok) AND (NOT r2.o_ok) AND v_n = 0 AND v_job = 'awaiting_review',
    format('null=%s/%s blank=%s/%s rows=%s job=%s',
      NOT r1.o_ok, r1.o_state, NOT r2.o_ok, r2.o_state, v_n, v_job));
END $$;

-- Q5-08 return comment persisted verbatim with reviewer + timestamp
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  v_rw public.service_report_reviews;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q08');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q08');
  PERFORM spk5_as_client(spk5_uid('support'));
  v_rw := public.review_service_report_revision(v_rev.id, 'returned', '  pad me  ', NULL);
  PERFORM spk5_reset();
  SELECT * INTO v_rw FROM public.service_report_reviews WHERE id = v_rw.id;
  PERFORM spk5_note('Q5-08',
    v_rw.comments = 'pad me' AND v_rw.reviewer_id = spk5_uid('support')
      AND v_rw.decided_at IS NOT NULL,
    format('comments=%s reviewer_ok=%s decided_at=%s', v_rw.comments,
      v_rw.reviewer_id = spk5_uid('support'), v_rw.decided_at IS NOT NULL));
END $$;

-- Q5-09 resubmission appends N+1; prior revision byte-identical
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid;
  v_r1 public.service_report_revisions; v_r1b public.service_report_revisions;
  v_r2 public.service_report_revisions; v_n int;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q09');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_r1 := spk5_submit(v_v, v_t, 'q09a');
  PERFORM spk5_as_client(spk5_uid('support'));
  PERFORM public.review_service_report_revision(v_r1.id, 'returned', 'fix it', NULL);
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_r2 := spk5_submit(v_v, v_t, 'q09b');
  PERFORM spk5_reset();
  SELECT * INTO v_r1b FROM public.service_report_revisions WHERE id = v_r1.id;
  SELECT count(*) INTO v_n FROM public.service_report_revisions WHERE report_id = v_r1.report_id;
  PERFORM spk5_note('Q5-09',
    v_r2.revision_number = 2 AND v_n = 2 AND v_r1b IS NOT DISTINCT FROM v_r1
      AND v_r2.submitted_by = spk5_uid('tech1'),
    format('n2=%s rows=%s r1_same=%s', v_r2.revision_number, v_n, v_r1b IS NOT DISTINCT FROM v_r1));
END $$;

-- Q5-10 idempotent repeat (same actor/decision/comments): same id, single row + audit
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  v_a public.service_report_reviews; v_b public.service_report_reviews;
  v_n int; v_naud int;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q10');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q10');
  PERFORM spk5_as_client(spk5_uid('support'));
  v_a := public.review_service_report_revision(v_rev.id, 'returned', 'again', NULL);
  v_b := public.review_service_report_revision(v_rev.id, 'returned', 'again', NULL);
  PERFORM spk5_reset();
  SELECT count(*) INTO v_n FROM public.service_report_reviews WHERE revision_id = v_rev.id;
  SELECT count(*) INTO v_naud FROM public.service_workflow_audit
  WHERE entity_type = 'service_report_review' AND entity_id = v_a.id;
  PERFORM spk5_note('Q5-10',
    v_a.id = v_b.id AND v_n = 1 AND v_naud = 1,
    format('same=%s rows=%s audits=%s', v_a.id = v_b.id, v_n, v_naud));
END $$;

-- Q5-11 conflicting second decision denied (same actor + different manager)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  r1 record; r2 record; v_n int;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q11');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q11');
  PERFORM spk5_as_client(spk5_uid('support'));
  PERFORM public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);
  SELECT * INTO r1 FROM spk5_try(format($q$SELECT public.review_service_report_revision(%L::uuid,'returned','nope',NULL)$q$, v_rev.id));
  PERFORM spk5_as_client(spk5_uid('admin'));
  SELECT * INTO r2 FROM spk5_try(format($q$SELECT public.review_service_report_revision(%L::uuid,'approved_issued',NULL,NULL)$q$, v_rev.id));
  PERFORM spk5_reset();
  SELECT count(*) INTO v_n FROM public.service_report_reviews WHERE revision_id = v_rev.id;
  PERFORM spk5_note('Q5-11',
    (NOT r1.o_ok) AND r1.o_state = '23505' AND (NOT r2.o_ok) AND r2.o_state = '23505' AND v_n = 1,
    format('same_actor=%s/%s diff_mgr=%s/%s rows=%s',
      NOT r1.o_ok, r1.o_state, NOT r2.o_ok, r2.o_state, v_n));
END $$;

-- Q5-12 stale review (approve rev1 while rev2 undecided): branch-aware coherence.
-- Contract requires exact-revision binding, not stale denial. PASS iff EITHER
-- (a) allowed with coherent head/completion/audit, OR (b) clean denial, states unchanged.
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid;
  v_r1 public.service_report_revisions; v_r2 public.service_report_revisions;
  r record; v_job text; v_head int; v_comp int; v_n int; v_bundle jsonb;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q12');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_r1 := spk5_submit(v_v, v_t, 'q12a');
  v_r2 := spk5_submit(v_v, v_t, 'q12b');
  PERFORM spk5_as_client(spk5_uid('support'));
  SELECT * INTO r FROM spk5_try(format($q$SELECT public.review_service_report_revision(%L::uuid,'approved_issued',NULL,NULL)$q$, v_r1.id));
  PERFORM spk5_reset();
  SELECT state INTO v_job FROM public.service_jobs WHERE id = v_j;
  SELECT count(*) INTO v_n FROM public.service_report_reviews WHERE revision_id = v_r1.id;
  SELECT count(*) INTO v_comp FROM public.service_workflow_audit
  WHERE entity_type = 'service_job' AND entity_id = v_j AND action = 'job_transition' AND to_state = 'completed';
  PERFORM spk5_as_client(spk5_uid('cust1'));
  v_bundle := public.get_service_report_for_visit(v_v);
  SELECT count(*) INTO v_head FROM jsonb_array_elements(v_bundle->'revisions');
  PERFORM spk5_reset();
  IF r.o_ok THEN
    PERFORM spk5_note('Q5-12',
      v_n = 1 AND v_head = 1 AND (v_bundle->'revisions'->0->>'id') = v_r1.id::text
        AND v_comp <= 1 AND (v_job = 'completed') = (v_comp = 1),
      format('allowed head=%s job=%s comp_aud=%s', v_head, v_job, v_comp));
  ELSE
    PERFORM spk5_note('Q5-12',
      v_n = 0 AND v_head = 0 AND v_job = 'awaiting_review' AND v_comp = 0,
      format('denied/%s rows=%s head=%s job=%s', r.o_state, v_n, v_head, v_job));
  END IF;
END $$;

-- Q5-13 further_work_required approve issues but does NOT complete the job
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  v_rw public.service_report_reviews; v_job public.service_jobs; v_comp int;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q13');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q13', 'further_work_required', 'need parts');
  PERFORM spk5_as_client(spk5_uid('support'));
  v_rw := public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);
  PERFORM spk5_reset();
  SELECT * INTO v_job FROM public.service_jobs WHERE id = v_j;
  SELECT count(*) INTO v_comp FROM public.service_workflow_audit
  WHERE entity_type = 'service_job' AND entity_id = v_j AND action = 'job_transition' AND to_state = 'completed';
  PERFORM spk5_note('Q5-13',
    v_rw.decision = 'approved_issued' AND v_job.state = 'awaiting_review'
      AND v_job.completing_revision_id IS NULL AND v_comp = 0,
    format('decision=%s job=%s comp_aud=%s', v_rw.decision, v_job.state, v_comp));
END $$;

-- Q5-14 outstanding scheduled visit blocks completion
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_v2 uuid;
  v_s timestamptz := now() + interval '5 hours'; v_e timestamptz := now() + interval '6 hours';
  v_rev public.service_report_revisions; v_rw public.service_report_reviews; v_job text; v_comp int;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q14');
  PERFORM set_config('app.b1_uid', spk5_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_s, v_e, 'spk5', NULL)).id INTO v_v2;
  PERFORM set_config('app.b1_uid', '', false);
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q14');
  PERFORM spk5_as_client(spk5_uid('support'));
  v_rw := public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);
  PERFORM spk5_reset();
  SELECT state INTO v_job FROM public.service_jobs WHERE id = v_j;
  SELECT count(*) INTO v_comp FROM public.service_workflow_audit
  WHERE entity_type = 'service_job' AND entity_id = v_j AND action = 'job_transition' AND to_state = 'completed';
  PERFORM spk5_note('Q5-14',
    v_rw.decision = 'approved_issued' AND v_job = 'awaiting_review' AND v_comp = 0,
    format('job=%s comp_aud=%s', v_job, v_comp));
END $$;

-- Q5-15 completed-but-unreported visit must not be stranded by completion.
-- PASS = completion blocked while visit2 has no submitted revision (F-B5-02).
DO $$
DECLARE v_t uuid; v_j uuid; v_v1 uuid; v_v2 uuid;
  v_r1 public.service_report_revisions; v_rw public.service_report_reviews;
  r record; v_job text;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v1, v_v2 FROM spk5_mk_two_visits('q15');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_r1 := spk5_submit(v_v1, v_t, 'q15');
  PERFORM spk5_as_client(spk5_uid('support'));
  v_rw := public.review_service_report_revision(v_r1.id, 'approved_issued', NULL, NULL);
  PERFORM spk5_reset();
  SELECT state INTO v_job FROM public.service_jobs WHERE id = v_j;
  PERFORM spk5_as_client(spk5_uid('tech1'));
  SELECT * INTO r FROM spk5_try(format(
    $q$SELECT spk5_submit(%L::uuid, %L::uuid, 'q15b')$q$, v_v2, v_t));
  PERFORM spk5_reset();
  PERFORM spk5_note('Q5-15',
    v_job = 'awaiting_review' AND r.o_ok,
    format('job=%s v2_submit_ok=%s/%s (FAIL=stranded unreported visit)',
      v_job, r.o_ok, r.o_state));
END $$;

-- Q5-16 owner getter: unissued -> 0 revisions; issued -> 1 with content
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  v_b1 jsonb; v_b2 jsonb; v_n1 int; v_n2 int;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q16');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q16');
  PERFORM spk5_as_client(spk5_uid('cust1'));
  v_b1 := public.get_service_report_for_visit(v_v);
  SELECT count(*) INTO v_n1 FROM jsonb_array_elements(v_b1->'revisions');
  PERFORM spk5_as_client(spk5_uid('support'));
  PERFORM public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);
  PERFORM spk5_as_client(spk5_uid('cust1'));
  v_b2 := public.get_service_report_for_visit(v_v);
  SELECT count(*) INTO v_n2 FROM jsonb_array_elements(v_b2->'revisions');
  PERFORM spk5_reset();
  PERFORM spk5_note('Q5-16',
    v_n1 = 0 AND v_n2 = 1 AND (v_b2->'revisions'->0->>'id') = v_rev.id::text
      AND (v_b2->'revisions'->0->>'findings') = 'findings spk5 q16',
    format('unissued_n=%s issued_n=%s content_ok=%s', v_n1, v_n2,
      (v_b2->'revisions'->0->>'findings') = 'findings spk5 q16'));
END $$;

-- Q5-17 owner direct SELECT agrees with getter (issued only, same ids)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  v_d0 int; v_d1 int; v_id uuid; v_b jsonb; v_g1 int;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q17');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q17');
  PERFORM spk5_as_client(spk5_uid('cust1'));
  SELECT count(*) INTO v_d0 FROM public.service_report_revisions
  WHERE report_id = (SELECT id FROM public.service_reports WHERE visit_id = v_v);
  PERFORM spk5_as_client(spk5_uid('support'));
  PERFORM public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);
  PERFORM spk5_as_client(spk5_uid('cust1'));
  SELECT count(*), min(id::text) INTO v_d1, v_id FROM public.service_report_revisions
  WHERE report_id = (SELECT id FROM public.service_reports WHERE visit_id = v_v);
  v_b := public.get_service_report_for_visit(v_v);
  SELECT count(*) INTO v_g1 FROM jsonb_array_elements(v_b->'revisions');
  PERFORM spk5_reset();
  PERFORM spk5_note('Q5-17',
    v_d0 = 0 AND v_d1 = 1 AND v_id = v_rev.id AND v_g1 = 1
      AND (v_b->'revisions'->0->>'id') = v_rev.id::text,
    format('direct=%s/%s getter=%s agree=%s', v_d0, v_d1, v_g1,
      v_id = v_rev.id AND (v_b->'revisions'->0->>'id') = v_rev.id::text));
END $$;

-- Q5-18 non-customer-role owner (sales) sees issued via getter + table; unissued hidden
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  v_d0 int; v_d1 int; v_b jsonb; v_g0 int; v_g1 int;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q18', 'tech1', 'sales');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q18');
  PERFORM spk5_as_client(spk5_uid('sales'));
  SELECT count(*) INTO v_d0 FROM public.service_report_revisions WHERE id = v_rev.id;
  v_b := public.get_service_report_for_visit(v_v);
  SELECT count(*) INTO v_g0 FROM jsonb_array_elements(v_b->'revisions');
  PERFORM spk5_as_client(spk5_uid('support'));
  PERFORM public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);
  PERFORM spk5_as_client(spk5_uid('sales'));
  SELECT count(*) INTO v_d1 FROM public.service_report_revisions WHERE id = v_rev.id;
  v_b := public.get_service_report_for_visit(v_v);
  SELECT count(*) INTO v_g1 FROM jsonb_array_elements(v_b->'revisions');
  PERFORM spk5_reset();
  PERFORM spk5_note('Q5-18',
    v_d0 = 0 AND v_g0 = 0 AND v_d1 = 1 AND v_g1 = 1,
    format('unissued(d/g)=%s/%s issued(d/g)=%s/%s', v_d0, v_g0, v_d1, v_g1));
END $$;

-- Q5-19 attending technician sees all revisions (issued + unissued) via getter + table
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid;
  v_r1 public.service_report_revisions; v_r2 public.service_report_revisions;
  v_g int; v_d int; v_b jsonb;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q19');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_r1 := spk5_submit(v_v, v_t, 'q19a', 'further_work_required', 'parts');
  PERFORM spk5_as_client(spk5_uid('support'));
  PERFORM public.review_service_report_revision(v_r1.id, 'approved_issued', NULL, NULL);
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_r2 := spk5_submit(v_v, v_t, 'q19b');
  SELECT count(*) INTO v_d FROM public.service_report_revisions WHERE report_id = v_r1.report_id;
  v_b := public.get_service_report_for_visit(v_v);
  SELECT count(*) INTO v_g FROM jsonb_array_elements(v_b->'revisions');
  PERFORM spk5_reset();
  PERFORM spk5_note('Q5-19',
    v_g = 2 AND v_d = 2,
    format('getter=%s direct=%s', v_g, v_d));
END $$;

-- Q5-20 unrelated tech + other customer: getter 42501, table 0 rows
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  r1 record; r2 record; v_d1 int; v_d2 int;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q20');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q20');
  PERFORM spk5_as_client(spk5_uid('support'));
  PERFORM public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);
  PERFORM spk5_as_client(spk5_uid('tech2'));
  SELECT * INTO r1 FROM spk5_try(format($q$SELECT public.get_service_report_for_visit(%L::uuid)$q$, v_v));
  SELECT count(*) INTO v_d1 FROM public.service_report_revisions WHERE id = v_rev.id;
  PERFORM spk5_as_client(spk5_uid('cust2'));
  SELECT * INTO r2 FROM spk5_try(format($q$SELECT public.get_service_report_for_visit(%L::uuid)$q$, v_v));
  SELECT count(*) INTO v_d2 FROM public.service_report_revisions WHERE id = v_rev.id;
  PERFORM spk5_reset();
  PERFORM spk5_note('Q5-20',
    (NOT r1.o_ok) AND r1.o_state = '42501' AND v_d1 = 0
      AND (NOT r2.o_ok) AND r2.o_state = '42501' AND v_d2 = 0,
    format('tech2=%s/%s/%s cust2=%s/%s/%s',
      NOT r1.o_ok, r1.o_state, v_d1, NOT r2.o_ok, r2.o_state, v_d2));
END $$;

-- Q5-21 anon: getter EXECUTE denied, table 0 rows
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  r record; r2 record;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q21');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q21');
  PERFORM spk5_as_client(spk5_uid('support'));
  PERFORM public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);
  PERFORM spk5_as_role('anon', NULL);
  SELECT * INTO r FROM spk5_try(format($q$SELECT public.get_service_report_for_visit(%L::uuid)$q$, v_v));
  SELECT * INTO r2 FROM spk5_try(format($q$SELECT count(*) FROM public.service_report_revisions WHERE id = %L::uuid$q$, v_rev.id));
  PERFORM spk5_reset();
  PERFORM spk5_note('Q5-21',
    (NOT r.o_ok) AND r.o_state = '42501' AND (NOT r2.o_ok) AND r2.o_state = '42501',
    format('getter=%s/%s direct=%s/%s', NOT r.o_ok, r.o_state, NOT r2.o_ok, r2.o_state));
END $$;

-- Q5-22 FWR-issued rev1 stays owner-visible while correction rev2 awaits review
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid;
  v_r1 public.service_report_revisions; v_r2 public.service_report_revisions;
  v_b jsonb; v_n int; v_d int; v_id uuid;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q22');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_r1 := spk5_submit(v_v, v_t, 'q22a', 'further_work_required', 'parts');
  PERFORM spk5_as_client(spk5_uid('support'));
  PERFORM public.review_service_report_revision(v_r1.id, 'approved_issued', NULL, NULL);
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_r2 := spk5_submit(v_v, v_t, 'q22b');
  PERFORM spk5_as_client(spk5_uid('cust1'));
  v_b := public.get_service_report_for_visit(v_v);
  SELECT count(*) INTO v_n FROM jsonb_array_elements(v_b->'revisions');
  SELECT count(*), min(id::text) INTO v_d, v_id FROM public.service_report_revisions
  WHERE report_id = v_r1.report_id;
  PERFORM spk5_reset();
  PERFORM spk5_note('Q5-22',
    v_n = 1 AND (v_b->'revisions'->0->>'id') = v_r1.id::text AND v_d = 1 AND v_id = v_r1.id,
    format('getter_n=%s direct_n=%s head_is_r1=%s', v_n, v_d,
      (v_b->'revisions'->0->>'id') = v_r1.id::text AND v_id = v_r1.id));
END $$;

-- Q5-23 returned correction keeps rev1 as owner-visible head
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid;
  v_r1 public.service_report_revisions; v_r2 public.service_report_revisions;
  v_b jsonb; v_n int;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q23');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_r1 := spk5_submit(v_v, v_t, 'q23a', 'further_work_required', 'parts');
  PERFORM spk5_as_client(spk5_uid('support'));
  PERFORM public.review_service_report_revision(v_r1.id, 'approved_issued', NULL, NULL);
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_r2 := spk5_submit(v_v, v_t, 'q23b');
  PERFORM spk5_as_client(spk5_uid('support'));
  PERFORM public.review_service_report_revision(v_r2.id, 'returned', 'recheck', NULL);
  PERFORM spk5_as_client(spk5_uid('cust1'));
  v_b := public.get_service_report_for_visit(v_v);
  SELECT count(*) INTO v_n FROM jsonb_array_elements(v_b->'revisions');
  PERFORM spk5_reset();
  PERFORM spk5_note('Q5-23',
    v_n = 1 AND (v_b->'revisions'->0->>'id') = v_r1.id::text,
    format('head_n=%s is_r1=%s', v_n, (v_b->'revisions'->0->>'id') = v_r1.id::text));
END $$;

-- Q5-24 issuing the correction supersedes; prior revisions retained + staff-readable
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid;
  v_r1 public.service_report_revisions; v_r2 public.service_report_revisions;
  v_b jsonb; v_n int; v_staff int; v_r1x public.service_report_revisions;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q24');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_r1 := spk5_submit(v_v, v_t, 'q24a', 'further_work_required', 'parts');
  PERFORM spk5_as_client(spk5_uid('support'));
  PERFORM public.review_service_report_revision(v_r1.id, 'approved_issued', NULL, NULL);
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_r2 := spk5_submit(v_v, v_t, 'q24b');
  PERFORM spk5_as_client(spk5_uid('support'));
  PERFORM public.review_service_report_revision(v_r2.id, 'approved_issued', 'fix verified', NULL);
  PERFORM spk5_as_client(spk5_uid('cust1'));
  v_b := public.get_service_report_for_visit(v_v);
  SELECT count(*) INTO v_n FROM jsonb_array_elements(v_b->'revisions');
  PERFORM spk5_as_client(spk5_uid('support'));
  SELECT count(*) INTO v_staff FROM public.service_report_revisions WHERE report_id = v_r1.report_id;
  PERFORM spk5_reset();
  SELECT * INTO v_r1x FROM public.service_report_revisions WHERE id = v_r1.id;
  PERFORM spk5_note('Q5-24',
    v_n = 1 AND (v_b->'revisions'->0->>'id') = v_r2.id::text
      AND v_staff = 2 AND v_r1x IS NOT DISTINCT FROM v_r1,
    format('head_is_r2=%s staff_rows=%s r1_intact=%s',
      (v_b->'revisions'->0->>'id') = v_r2.id::text, v_staff, v_r1x IS NOT DISTINCT FROM v_r1));
END $$;

-- Storage predicate probe (B4 Q4-30 pattern): live storage schema grants are
-- hosted-side, so evaluate the ticket_attachments_select USING predicate
-- per-actor via GUC + DEFINER wrapper.
CREATE OR REPLACE FUNCTION spk5_can_read(p_path text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT admin_private.can_read_ticket_attachment(p_path);
$$;

-- Q5-25 owner can download ISSUED evidence; staff positive control.
-- Contract item 9 / F-B5-01: issued evidence_paths readable by ticket owner.
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  v_path text; v_owner boolean; v_staff boolean;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q25');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q25');
  v_path := (v_rev.evidence_paths)[1];
  PERFORM spk5_as_client(spk5_uid('support'));
  PERFORM public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);
  PERFORM spk5_reset();
  PERFORM set_config('app.b1_uid', spk5_uid('cust1')::text, false);
  SELECT spk5_can_read(v_path) INTO v_owner;
  PERFORM set_config('app.b1_uid', spk5_uid('support')::text, false);
  SELECT spk5_can_read(v_path) INTO v_staff;
  PERFORM spk5_reset();
  PERFORM spk5_note('Q5-25',
    v_owner IS TRUE AND v_staff IS TRUE,
    format('owner_read=%s staff_read=%s (FAIL=owner denied issued evidence)', v_owner, v_staff));
END $$;

-- Q5-26 owner denied UNISSUED evidence at storage layer
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  v_path text; v_n boolean;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q26');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q26');
  v_path := (v_rev.evidence_paths)[1];
  PERFORM spk5_reset();
  PERFORM set_config('app.b1_uid', spk5_uid('cust1')::text, false);
  SELECT spk5_can_read(v_path) INTO v_n;
  PERFORM spk5_reset();
  PERFORM spk5_note('Q5-26',
    v_n IS FALSE,
    format('owner_unissued_read=%s', v_n));
END $$;

-- Q5-27 cross-ticket evidence isolation (cust1 vs cust2 ticket objects, incl. issued)
DO $$
DECLARE v_t1 uuid; v_j1 uuid; v_v1 uuid; v_t2 uuid; v_j2 uuid; v_v2 uuid;
  v_rev public.service_report_revisions; v_path text; v_n boolean;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t1, v_j1, v_v1 FROM spk5_mk_completed_visit('q27a');
  SELECT * INTO v_t2, v_j2, v_v2 FROM spk5_mk_completed_visit('q27b', 'tech1', 'cust2');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v2, v_t2, 'q27');
  v_path := (v_rev.evidence_paths)[1];
  PERFORM spk5_as_client(spk5_uid('support'));
  PERFORM public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);
  PERFORM spk5_reset();
  PERFORM set_config('app.b1_uid', spk5_uid('cust1')::text, false);
  SELECT spk5_can_read(v_path) INTO v_n;
  PERFORM spk5_reset();
  PERFORM spk5_note('Q5-27',
    v_n IS FALSE,
    format('cust1_reads_cust2_issued=%s', v_n));
END $$;

-- Q5-28 acknowledgment unavailable in B5: direct ack INSERT denied, zero rows
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  r record; v_n int;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q28');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q28');
  PERFORM spk5_as_client(spk5_uid('support'));
  PERFORM public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);
  PERFORM spk5_as_client(spk5_uid('cust1'));
  SELECT * INTO r FROM spk5_try(format(
    $q$INSERT INTO public.service_acknowledgments(issued_revision_id, response, responded_by) VALUES (%L::uuid,'accepted',%L::uuid)$q$,
    v_rev.id, spk5_uid('cust1')));
  PERFORM spk5_reset();
  SELECT count(*) INTO v_n FROM public.service_acknowledgments WHERE issued_revision_id = v_rev.id;
  PERFORM spk5_note('Q5-28',
    (NOT r.o_ok) AND v_n = 0,
    format('denied=%s/%s rows=%s', NOT r.o_ok, r.o_state, v_n));
END $$;

-- Q5-29 ticket closure denied for ALL roles (B6 scope); status unchanged
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  r1 record; r2 record; r3 record; r4 record; v_st text;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q29');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q29');
  PERFORM spk5_as_client(spk5_uid('support'));
  PERFORM public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);
  PERFORM spk5_as_client(spk5_uid('admin'));
  SELECT * INTO r1 FROM spk5_try(format($q$SELECT public.govern_ticket_transition(%L::uuid,'closed','spk5',NULL)$q$, v_t));
  PERFORM spk5_as_client(spk5_uid('support'));
  SELECT * INTO r2 FROM spk5_try(format($q$SELECT public.govern_ticket_transition(%L::uuid,'closed','spk5',NULL)$q$, v_t));
  PERFORM spk5_as_client(spk5_uid('tech1'));
  SELECT * INTO r3 FROM spk5_try(format($q$SELECT public.govern_ticket_transition(%L::uuid,'closed','spk5',NULL)$q$, v_t));
  PERFORM spk5_as_client(spk5_uid('cust1'));
  SELECT * INTO r4 FROM spk5_try(format($q$SELECT public.govern_ticket_transition(%L::uuid,'closed','spk5',NULL)$q$, v_t));
  PERFORM spk5_reset();
  SELECT status INTO v_st FROM public.service_tickets WHERE id = v_t;
  PERFORM spk5_note('Q5-29',
    (NOT r1.o_ok) AND (NOT r2.o_ok) AND (NOT r3.o_ok) AND (NOT r4.o_ok)
      AND v_st NOT IN ('closed', 'resolved'),
    format('admin=%s support=%s tech=%s cust=%s status=%s',
      NOT r1.o_ok, NOT r2.o_ok, NOT r3.o_ok, NOT r4.o_ok, v_st));
END $$;

-- Q5-30 issuing a report does not close/resolve the ticket
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions; v_st text;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q30');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q30');
  PERFORM spk5_as_client(spk5_uid('support'));
  PERFORM public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);
  PERFORM spk5_reset();
  SELECT status INTO v_st FROM public.service_tickets WHERE id = v_t;
  PERFORM spk5_note('Q5-30',
    v_st NOT IN ('closed', 'resolved'),
    format('ticket=%s', v_st));
END $$;

-- Q5-31 anonymous actor injection on review RPC denied (NULL + spoofed actor)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  r1 record; r2 record; v_n int;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q31');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q31');
  PERFORM spk5_as_role('anon', NULL);
  SELECT * INTO r1 FROM spk5_try(format($q$SELECT public.review_service_report_revision(%L::uuid,'approved_issued',NULL,NULL)$q$, v_rev.id));
  SELECT * INTO r2 FROM spk5_try(format(
    $q$SELECT public.review_service_report_revision(%L::uuid,'approved_issued',NULL,%L::uuid)$q$, v_rev.id, spk5_uid('support')));
  PERFORM spk5_reset();
  SELECT count(*) INTO v_n FROM public.service_report_reviews WHERE revision_id = v_rev.id;
  PERFORM spk5_note('Q5-31',
    (NOT r1.o_ok) AND (NOT r2.o_ok) AND v_n = 0,
    format('null=%s/%s spoof=%s/%s rows=%s',
      NOT r1.o_ok, r1.o_state, NOT r2.o_ok, r2.o_state, v_n));
END $$;

-- Q5-32 authenticated forged actor (tech1 calling as support) denied
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  r record; v_n int;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q32');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q32');
  SELECT * INTO r FROM spk5_try(format(
    $q$SELECT public.review_service_report_revision(%L::uuid,'approved_issued',NULL,%L::uuid)$q$, v_rev.id, spk5_uid('support')));
  PERFORM spk5_reset();
  SELECT count(*) INTO v_n FROM public.service_report_reviews WHERE revision_id = v_rev.id;
  PERFORM spk5_note('Q5-32',
    (NOT r.o_ok) AND v_n = 0,
    format('denied=%s/%s rows=%s msg=%s', NOT r.o_ok, r.o_state, v_n, left(r.o_msg, 60)));
END $$;

-- Q5-33 verified service-role delegation succeeds; missing actor -> 22023
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  r_ok record; r_no record; v_n0 int; v_n1 int;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q33');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q33');
  PERFORM spk5_as_role('service_role', NULL);
  SELECT * INTO r_no FROM spk5_try(format($q$SELECT public.review_service_report_revision(%L::uuid,'approved_issued',NULL,NULL)$q$, v_rev.id));
  PERFORM spk5_reset();
  SELECT count(*) INTO v_n0 FROM public.service_report_reviews WHERE revision_id = v_rev.id;
  PERFORM spk5_as_role('service_role', NULL);
  SELECT * INTO r_ok FROM spk5_try(format(
    $q$SELECT public.review_service_report_revision(%L::uuid,'approved_issued',NULL,%L::uuid)$q$, v_rev.id, spk5_uid('support')));
  PERFORM spk5_reset();
  SELECT count(*) INTO v_n1 FROM public.service_report_reviews WHERE revision_id = v_rev.id;
  PERFORM spk5_note('Q5-33',
    (NOT r_no.o_ok) AND r_no.o_state = '42501' AND v_n0 = 0 AND r_ok.o_ok AND v_n1 = 1,
    format('noactor=%s/%s rows0=%s delegated=%s rows1=%s',
      NOT r_no.o_ok, r_no.o_state, v_n0, r_ok.o_ok, v_n1));
END $$;

-- Q5-34 direct INSERT/UPDATE/DELETE on reviews denied for ordinary callers
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  r1 record; r2 record; r3 record; v_rw uuid; v_n0 int; v_n1 int;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q34');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q34');
  PERFORM spk5_as_client(spk5_uid('support'));
  SELECT (public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL)).id INTO v_rw;
  SELECT count(*) INTO v_n0 FROM public.service_report_reviews WHERE revision_id = v_rev.id;
  SELECT * INTO r1 FROM spk5_try(format(
    $q$INSERT INTO public.service_report_reviews(revision_id, reviewer_id, decision) VALUES (%L::uuid,%L::uuid,'returned')$q$,
    v_rev.id, spk5_uid('support')));
  SELECT * INTO r2 FROM spk5_try(format(
    $q$UPDATE public.service_report_reviews SET decision='returned' WHERE id=%L::uuid$q$, v_rw));
  SELECT * INTO r3 FROM spk5_try(format(
    $q$DELETE FROM public.service_report_reviews WHERE id=%L::uuid$q$, v_rw));
  PERFORM spk5_reset();
  SELECT count(*) INTO v_n1 FROM public.service_report_reviews WHERE revision_id = v_rev.id;
  PERFORM spk5_note('Q5-34',
    (NOT r1.o_ok) AND (NOT r2.o_ok) AND (NOT r3.o_ok) AND v_n0 = 1 AND v_n1 = 1,
    format('ins=%s/%s upd=%s/%s del=%s/%s rows=%s/%s',
      NOT r1.o_ok, r1.o_state, NOT r2.o_ok, r2.o_state, NOT r3.o_ok, r3.o_state, v_n0, v_n1));
END $$;

-- Q5-35 unrelated caller cannot distinguish revision states (auth before disclosure)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  r1 record; r2 record;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q35');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q35');
  PERFORM spk5_as_client(spk5_uid('tech2'));
  SELECT * INTO r1 FROM spk5_try(format($q$SELECT public.review_service_report_revision(%L::uuid,'approved_issued',NULL,NULL)$q$, v_rev.id));
  SELECT * INTO r2 FROM spk5_try(format($q$SELECT public.review_service_report_revision(%L::uuid,'approved_issued',NULL,NULL)$q$, gen_random_uuid()));
  PERFORM spk5_reset();
  PERFORM spk5_note('Q5-35',
    (NOT r1.o_ok) AND (NOT r2.o_ok) AND r1.o_state = '42501' AND r2.o_state = '42501',
    format('existing=%s/%s missing=%s/%s', NOT r1.o_ok, r1.o_state, NOT r2.o_ok, r2.o_state));
END $$;

-- Q5-36 audit field coherence on approve + return paths
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid;
  v_r1 public.service_report_revisions; v_r2 public.service_report_revisions;
  v_a int; v_b int; v_c int; v_d int;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q36');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_r1 := spk5_submit(v_v, v_t, 'q36a');
  PERFORM spk5_as_client(spk5_uid('support'));
  PERFORM public.review_service_report_revision(v_r1.id, 'returned', 'fix', NULL);
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_r2 := spk5_submit(v_v, v_t, 'q36b');
  PERFORM spk5_as_client(spk5_uid('support'));
  PERFORM public.review_service_report_revision(v_r2.id, 'approved_issued', NULL, NULL);
  PERFORM spk5_reset();
  SELECT count(*) INTO v_a FROM public.service_workflow_audit
  WHERE entity_type = 'service_report_review' AND action = 'return_report'
    AND actor_id = spk5_uid('support') AND details->>'revision_id' = v_r1.id::text;
  SELECT count(*) INTO v_b FROM public.service_workflow_audit
  WHERE entity_type = 'service_report_review' AND action = 'approve_issue_report'
    AND details->>'revision_id' = v_r2.id::text;
  SELECT count(*) INTO v_c FROM public.service_workflow_audit
  WHERE entity_type = 'service_job' AND entity_id = v_j AND action = 'job_transition'
    AND from_state = 'awaiting_review' AND to_state = 'in_progress';
  SELECT count(*) INTO v_d FROM public.service_workflow_audit
  WHERE entity_type = 'service_job' AND entity_id = v_j AND action = 'job_transition'
    AND to_state = 'completed'
    AND details->>'completing_revision_id' = v_r2.id::text;
  PERFORM spk5_note('Q5-36',
    v_a = 1 AND v_b = 1 AND v_c = 1 AND v_d = 1,
    format('return_aud=%s approve_aud=%s to_inprog=%s to_completed=%s', v_a, v_b, v_c, v_d));
END $$;

-- Q5-37 audit-write failure rolls back review + job effects (no partial success)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  r record; v_n int; v_job text;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q37');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q37');
  PERFORM spk5_reset();
  CREATE OR REPLACE FUNCTION spk5_audit_bomb() RETURNS trigger LANGUAGE plpgsql AS $t$
  BEGIN RAISE EXCEPTION 'spk5 injected audit failure' USING ERRCODE = 'P0001'; END; $t$;
  CREATE TRIGGER spk5_audit_bomb_trg BEFORE INSERT ON public.service_workflow_audit
  FOR EACH ROW EXECUTE FUNCTION spk5_audit_bomb();
  PERFORM spk5_as_client(spk5_uid('support'));
  SELECT * INTO r FROM spk5_try(format($q$SELECT public.review_service_report_revision(%L::uuid,'approved_issued',NULL,NULL)$q$, v_rev.id));
  PERFORM spk5_reset();
  DROP TRIGGER spk5_audit_bomb_trg ON public.service_workflow_audit;
  DROP FUNCTION spk5_audit_bomb();
  SELECT count(*) INTO v_n FROM public.service_report_reviews WHERE revision_id = v_rev.id;
  SELECT state INTO v_job FROM public.service_jobs WHERE id = v_j;
  PERFORM spk5_note('Q5-37',
    (NOT r.o_ok) AND v_n = 0 AND v_job = 'awaiting_review',
    format('failed=%s rows=%s job=%s msg=%s', NOT r.o_ok, v_n, v_job, left(r.o_msg, 60)));
END $$;

-- Q5-38 grant + search_path audit for the B5 review RPC
DO $$
DECLARE v_anon boolean; v_auth boolean; v_svc boolean; v_path text; v_owner text;
BEGIN
  SELECT has_function_privilege('anon', 'public.review_service_report_revision(uuid,text,text,uuid)', 'EXECUTE') INTO v_anon;
  SELECT has_function_privilege('authenticated', 'public.review_service_report_revision(uuid,text,text,uuid)', 'EXECUTE') INTO v_auth;
  SELECT has_function_privilege('service_role', 'public.review_service_report_revision(uuid,text,text,uuid)', 'EXECUTE') INTO v_svc;
  SELECT pg_get_function_identity_arguments('public.review_service_report_revision(uuid,text,text,uuid)'::regprocedure) INTO v_path;
  SELECT n.nspname || '.' || p.proname INTO v_owner
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.oid = 'public.review_service_report_revision(uuid,text,text,uuid)'::regprocedure;
  PERFORM spk5_note('Q5-38',
    v_anon = false AND v_auth = true AND v_svc = true,
    format('anon=%s auth=%s svc=%s fn=%s', v_anon, v_auth, v_svc, v_owner));
END $$;

-- Q5-39 return on a completed job must not dead-end the correction path (F-B5-02).
-- PASS = return denied on terminal job OR resubmit still possible afterward.
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid;
  v_r1 public.service_report_revisions; v_r2 public.service_report_revisions;
  r_ret record; r_sub record;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q39');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_r1 := spk5_submit(v_v, v_t, 'q39a');
  v_r2 := spk5_submit(v_v, v_t, 'q39b');
  PERFORM spk5_as_client(spk5_uid('support'));
  PERFORM public.review_service_report_revision(v_r1.id, 'approved_issued', NULL, NULL);
  SELECT * INTO r_ret FROM spk5_try(format($q$SELECT public.review_service_report_revision(%L::uuid,'returned','recheck',NULL)$q$, v_r2.id));
  PERFORM spk5_as_client(spk5_uid('tech1'));
  SELECT * INTO r_sub FROM spk5_try(format(
    $q$SELECT spk5_submit(%L::uuid, %L::uuid, 'q39c')$q$, v_v, v_t));
  PERFORM spk5_reset();
  PERFORM spk5_note('Q5-39',
    (NOT r_ret.o_ok) OR r_sub.o_ok,
    format('return_ok=%s resubmit_ok=%s/%s (FAIL=dead-end return on completed job)',
      r_ret.o_ok, r_sub.o_ok, r_sub.o_state));
END $$;

-- Q5-40 no direct job-completion path in B5 (completion only via eligible approval)
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
  r record; v_job text;
BEGIN
  PERFORM spk5_reset();
  SELECT * INTO v_t, v_j, v_v FROM spk5_mk_completed_visit('q40');
  PERFORM spk5_as_client(spk5_uid('tech1'));
  v_rev := spk5_submit(v_v, v_t, 'q40');
  PERFORM spk5_as_client(spk5_uid('support'));
  SELECT * INTO r FROM spk5_try(format($q$SELECT public.govern_job_transition(%L::uuid,'completed','spk5',NULL)$q$, v_j));
  PERFORM spk5_reset();
  SELECT state INTO v_job FROM public.service_jobs WHERE id = v_j;
  PERFORM spk5_note('Q5-40',
    (NOT r.o_ok) AND v_job = 'awaiting_review',
    format('denied=%s/%s job=%s', NOT r.o_ok, r.o_state, v_job));
END $$;

SELECT check_id, status, detail FROM public.spk5_eval ORDER BY check_id;
SELECT
  COUNT(*) FILTER (WHERE status = 'PASS') AS pass,
  COUNT(*) FILTER (WHERE status = 'FAIL') AS fail
FROM public.spk5_eval;
