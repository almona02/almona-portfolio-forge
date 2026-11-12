-- B4 report submission disposable battery (local/disposable only).
-- Prerequisites: disposable_b1_base + B1/B2/B3 migrations + B4 migration.
-- Never against staging/production.
-- Matrix aligned to bounded B4 contract (no squad-manager; B5/B6 DEFER).

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

CREATE TABLE IF NOT EXISTS public.b4_eval(check_id text PRIMARY KEY, status text NOT NULL, detail text);
TRUNCATE public.b4_eval;

CREATE OR REPLACE FUNCTION b4_note(p_id text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.b4_eval(check_id, status, detail)
  VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, left(p_detail, 500))
  ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
END; $$;

CREATE OR REPLACE FUNCTION b4_defer(p_id text, p_detail text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.b4_eval(check_id, status, detail)
  VALUES (p_id, 'DEFER', left(p_detail, 500))
  ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
END; $$;

CREATE OR REPLACE FUNCTION b4_denied(p_sql text)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql; RETURN false;
EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE IN ('42501','22023','P0002','23514','23505','check_violation')
     OR SQLERRM ILIKE '%permission%' OR SQLERRM ILIKE '%only%'
     OR SQLERRM ILIKE '%required%' OR SQLERRM ILIKE '%Invalid%'
     OR SQLERRM ILIKE '%Cannot%' OR SQLERRM ILIKE '%labour%'
     OR SQLERRM ILIKE '%evidence%' OR SQLERRM ILIKE '%immutable%'
     OR SQLERRM ILIKE '%Authentication%' OR SQLERRM ILIKE '%impersonation%'
     OR SQLERRM ILIKE '%historical attending%' OR SQLERRM ILIKE '%attending technician%'
  THEN RETURN true; END IF;
  RAISE;
END; $$;

CREATE OR REPLACE FUNCTION b4_mk_completed_visit(p_tag text, OUT o_ticket uuid, OUT o_job uuid, OUT o_visit uuid)
LANGUAGE plpgsql AS $$
DECLARE
  v_s timestamptz := now() + interval '1 hour';
  v_e timestamptz := now() + interval '3 hours';
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  INSERT INTO public.service_tickets (ticket_number, user_id, title, description, type, priority, status, assigned_to, assigned_by, assigned_at)
  VALUES (
    'B4-' || p_tag || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6),
    b1_uid('cust1'), 'b4', 'b4', 'general', 'medium', 'assigned',
    b1_uid('tech1'), b1_uid('support'), now()
  ) RETURNING id INTO o_ticket;
  SELECT (public.create_service_job(o_ticket, 'B4 ' || p_tag, true, 'b4')).id INTO o_job;
  PERFORM public.assign_service_job(o_job, b1_uid('tech1'), 'b4', NULL);
  SELECT (public.schedule_service_job_visit(o_job, v_s, v_e, 'b4', NULL)).id INTO o_visit;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM public.record_visit_safety_check(
    o_visit, 'passed', 'b4', NULL, public.b3_minimum_safety_attestation()
  );
  PERFORM public.start_service_job_visit(
    o_visit, NULL, public.b3_minimum_safety_attestation(), 'b4'
  );
  PERFORM public.complete_service_job_visit(o_visit);
END; $$;

CREATE OR REPLACE FUNCTION b4_seed_evidence(p_ticket uuid, p_path text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('ticket-attachments', 'ticket-attachments', false)
  ON CONFLICT (id) DO NOTHING;
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'ticket-attachments' AND name = p_path
  ) THEN
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('ticket-attachments', p_path);
  END IF;
END; $$;

-- ---------------------------------------------------------------------------
-- R4-01: attending-tech auth, anon/forged, service_role delegation
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text;
  a boolean; b boolean; c boolean; d boolean; e boolean;
  v_rev public.service_report_revisions;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b4_mk_completed_visit('r401');
  v_path := v_t::text || '/b4/r401.jpg';
  PERFORM b4_seed_evidence(v_t, v_path);

  PERFORM set_config('app.b1_uid', '', false);
  a := b4_denied(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[{"hours":1,"description":"x"}]'::jsonb,false,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$,
    v_v, v_path, gen_random_uuid()));

  -- forged actor id while authenticated as tech2
  PERFORM set_config('app.b1_uid', b1_uid('tech2')::text, false);
  b := b4_denied(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[{"hours":1,"description":"x"}]'::jsonb,false,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,%L::uuid)$q$,
    v_v, v_path, gen_random_uuid(), b1_uid('tech1')));

  -- support cannot substitute
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  c := b4_denied(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[{"hours":1,"description":"x"}]'::jsonb,false,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$,
    v_v, v_path, gen_random_uuid()));

  -- service_role delegation: clear uid, SET ROLE, pass attending actor
  PERFORM set_config('app.b1_uid', '', true);
  BEGIN
    EXECUTE 'SET ROLE service_role';
    PERFORM set_config('request.jwt.claim.role', 'service_role', true);
    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
    v_rev := public.submit_service_report_revision(
      v_v, 'f', 'w', '[{"hours":1,"description":"x"}]'::jsonb, false,
      'verified_fixed', NULL, 'decl', ARRAY[v_path], NULL, gen_random_uuid(), b1_uid('tech1'));
    d := (v_rev.submitted_by = b1_uid('tech1'));
    EXECUTE 'RESET ROLE';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    d := false;
    PERFORM b4_note('R4-01', false, 'service_role delegation error: ' || SQLERRM);
    RETURN;
  END;

  -- service_role without actor denied
  PERFORM set_config('app.b1_uid', '', true);
  BEGIN
    EXECUTE 'SET ROLE service_role';
    PERFORM set_config('request.jwt.claim.role', 'service_role', true);
    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
    e := b4_denied(format(
      $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[{"hours":1,"description":"x"}]'::jsonb,false,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$,
      v_v, v_path, gen_random_uuid()));
    EXECUTE 'RESET ROLE';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    e := false;
  END;

  PERFORM b4_note('R4-01', a AND b AND c AND d AND e,
    format('anon=%s forged=%s support=%s svc_ok=%s svc_no_actor=%s', a, b, c, d, e));
END $$;

-- ---------------------------------------------------------------------------
-- R4-02: cross-ticket/visit + private attachment isolation
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t1 uuid; v_j1 uuid; v_v1 uuid; v_t2 uuid; v_j2 uuid; v_v2 uuid;
  p1 text; p2 text; a boolean; b boolean; v_rev public.service_report_revisions;
BEGIN
  SELECT * INTO v_t1, v_j1, v_v1 FROM b4_mk_completed_visit('r402a');
  SELECT * INTO v_t2, v_j2, v_v2 FROM b4_mk_completed_visit('r402b');
  p1 := v_t1::text || '/b4/a.jpg';
  p2 := v_t2::text || '/b4/b.jpg';
  PERFORM b4_seed_evidence(v_t1, p1);
  PERFORM b4_seed_evidence(v_t2, p2);

  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  -- foreign ticket evidence on visit1 denied
  a := b4_denied(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[]'::jsonb,true,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$,
    v_v1, p2, gen_random_uuid()));
  -- happy path with matching ticket evidence
  v_rev := public.submit_service_report_revision(
    v_v1, 'f', 'w', '[]'::jsonb, true, 'verified_fixed', NULL, 'decl',
    ARRAY[p1], NULL, gen_random_uuid(), NULL);
  -- tech2 cannot submit on visit1
  PERFORM set_config('app.b1_uid', b1_uid('tech2')::text, false);
  b := b4_denied(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[]'::jsonb,true,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$,
    v_v1, p1, gen_random_uuid()));
  PERFORM b4_note('R4-02', a AND b AND v_rev.id IS NOT NULL,
    format('cross_evidence=%s cross_visit=%s', a, b));
END $$;

-- ---------------------------------------------------------------------------
-- R4-03: required fields (findings, labour/no-labour, verification, declaration)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text;
  a boolean; b boolean; c boolean; d boolean; e boolean; f boolean;
  v_rev public.service_report_revisions;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b4_mk_completed_visit('r403');
  v_path := v_t::text || '/b4/r403.jpg';
  PERFORM b4_seed_evidence(v_t, v_path);
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);

  a := b4_denied(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'','w','[]'::jsonb,true,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$,
    v_v, v_path, gen_random_uuid()));
  b := b4_denied(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','','[]'::jsonb,true,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$,
    v_v, v_path, gen_random_uuid()));
  c := b4_denied(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[]'::jsonb,false,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$,
    v_v, v_path, gen_random_uuid()));
  d := b4_denied(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[{"hours":1,"description":"x"}]'::jsonb,true,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$,
    v_v, v_path, gen_random_uuid()));
  e := b4_denied(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[]'::jsonb,true,'further_work_required',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$,
    v_v, v_path, gen_random_uuid()));
  f := b4_denied(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[]'::jsonb,true,'verified_fixed',NULL,'',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$,
    v_v, v_path, gen_random_uuid()));

  v_rev := public.submit_service_report_revision(
    v_v, 'findings ok', 'work ok',
    '[{"hours":2,"description":"align"}]'::jsonb, false,
    'not_reproduced', 'intermittent', 'I declare.',
    ARRAY[v_path], NULL, gen_random_uuid(), NULL);

  PERFORM b4_note('R4-03', a AND b AND c AND d AND e AND f AND v_rev.id IS NOT NULL,
    format('denies=%s/%s/%s/%s/%s/%s ok=%s', a, b, c, d, e, f, v_rev.verification_outcome));
END $$;

-- ---------------------------------------------------------------------------
-- R4-04: idempotent submit, conflicting retry, concurrent revision numbers
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; v_cid uuid := gen_random_uuid();
  v_r1 public.service_report_revisions; v_r2 public.service_report_revisions;
  v_r3 public.service_report_revisions; v_r4 public.service_report_revisions;
  v_n int;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b4_mk_completed_visit('r404');
  v_path := v_t::text || '/b4/r404.jpg';
  PERFORM b4_seed_evidence(v_t, v_path);
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);

  v_r1 := public.submit_service_report_revision(
    v_v, 'f1', 'w1', '[]'::jsonb, true, 'verified_fixed', NULL, 'decl',
    ARRAY[v_path], NULL, v_cid, NULL);
  -- conflicting payload, same client id → same revision (idempotent; first wins)
  v_r2 := public.submit_service_report_revision(
    v_v, 'CHANGED', 'CHANGED', '[{"hours":9,"description":"nope"}]'::jsonb, false,
    'not_verified', 'x', 'decl', ARRAY[v_path], NULL, v_cid, NULL);

  v_r3 := public.submit_service_report_revision(
    v_v, 'f2', 'w2', '[]'::jsonb, true, 'verified_fixed', NULL, 'decl',
    ARRAY[v_path], NULL, gen_random_uuid(), NULL);
  v_r4 := public.submit_service_report_revision(
    v_v, 'f3', 'w3', '[]'::jsonb, true, 'verified_fixed', NULL, 'decl',
    ARRAY[v_path], NULL, gen_random_uuid(), NULL);

  SELECT count(*) INTO v_n FROM public.service_report_revisions r
  JOIN public.service_reports rep ON rep.id = r.report_id WHERE rep.visit_id = v_v;

  PERFORM b4_note('R4-04',
    v_r1.id = v_r2.id AND v_r2.findings = 'f1'
      AND v_r3.revision_number = 2 AND v_r4.revision_number = 3 AND v_n = 3,
    format('idem=%s findings=%s revs=%s n=%s', v_r1.id = v_r2.id, v_r2.findings, v_r4.revision_number, v_n));
END $$;

-- ---------------------------------------------------------------------------
-- R4-05: historical attending authorship after reassignment (corrected)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text;
  v_att uuid; v_assignee uuid;
  a boolean; b boolean;
  v_rev public.service_report_revisions;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b4_mk_completed_visit('r405');
  v_path := v_t::text || '/b4/r405.jpg';
  PERFORM b4_seed_evidence(v_t, v_path);
  SELECT attending_technician_id INTO v_att FROM public.service_job_visits WHERE id = v_v;

  -- Reassign job to tech2 while visit remains completed with tech1 attending
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  PERFORM public.govern_job_transition(v_j, 'in_progress', 'reopen', NULL);
  PERFORM public.assign_service_job(v_j, b1_uid('tech2'), 'reassign', NULL);
  SELECT assigned_technician_id INTO v_assignee FROM public.service_jobs WHERE id = v_j;
  -- attending on completed visit must remain tech1
  IF (SELECT attending_technician_id FROM public.service_job_visits WHERE id = v_v) IS DISTINCT FROM v_att THEN
    PERFORM b4_note('R4-05', false, 'completed visit attending was rewritten on reassignment');
    RETURN;
  END IF;

  -- new assignee cannot impersonate / submit for historical visit
  PERFORM set_config('app.b1_uid', b1_uid('tech2')::text, false);
  a := b4_denied(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[]'::jsonb,true,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$,
    v_v, v_path, gen_random_uuid()));

  -- historical attending tech1 may still submit their visit report
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  BEGIN
    v_rev := public.submit_service_report_revision(
      v_v, 'f', 'w', '[]'::jsonb, true, 'verified_fixed', NULL, 'decl',
      ARRAY[v_path], NULL, gen_random_uuid(), NULL);
    b := (v_rev.submitted_by = b1_uid('tech1'));
  EXCEPTION WHEN OTHERS THEN
    b := false;
    PERFORM b4_note('R4-05', false, 'historical attendee blocked: ' || SQLERRM);
    RETURN;
  END;

  PERFORM b4_note('R4-05', a AND b AND v_assignee = b1_uid('tech2') AND v_att = b1_uid('tech1'),
    format('new_denied=%s hist_ok=%s assignee=%s attending=%s', a, b, v_assignee, v_att));
END $$;

-- ---------------------------------------------------------------------------
-- R4-06: submitted immutability + direct-write restrictions preserved
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; v_rev public.service_report_revisions;
  a boolean; b boolean; c boolean; d boolean;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b4_mk_completed_visit('r406');
  v_path := v_t::text || '/b4/r406.jpg';
  PERFORM b4_seed_evidence(v_t, v_path);
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  v_rev := public.submit_service_report_revision(
    v_v, 'f', 'w', '[]'::jsonb, true, 'verified_fixed', NULL, 'decl',
    ARRAY[v_path], NULL, gen_random_uuid(), NULL);

  -- Exercise client-role immutability (table owner / superuser bypasses the trigger).
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, true);
  BEGIN
    EXECUTE 'SET ROLE authenticated';
    a := b4_denied(format($q$UPDATE public.service_report_revisions SET findings='hack' WHERE id=%L::uuid$q$, v_rev.id));
    b := b4_denied(format($q$DELETE FROM public.service_report_revisions WHERE id=%L::uuid$q$, v_rev.id));
    EXECUTE 'RESET ROLE';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    a := false; b := false;
  END;

  PERFORM set_config('app.b1_uid', '', true);
  BEGIN
    EXECUTE 'SET ROLE service_role';
    PERFORM set_config('request.jwt.claim.role', 'service_role', true);
    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
    c := b4_denied(format(
      $q$INSERT INTO public.service_report_revisions(report_id,revision_number,findings,work_performed,labour,no_labour,verification_outcome,technician_declaration,submitted_by)
         VALUES (%L::uuid, 99, 'x', 'x', '[]'::jsonb, true, 'verified_fixed', 'x', %L::uuid)$q$,
      v_rev.report_id, b1_uid('tech1')));
    d := b4_denied(format(
      $q$INSERT INTO public.service_report_reviews(revision_id,reviewer_id,decision) VALUES (%L::uuid,%L::uuid,'approved_issued')$q$,
      v_rev.id, b1_uid('admin')));
    EXECUTE 'RESET ROLE';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    c := false; d := false;
  END;

  PERFORM b4_note('R4-06', a AND b AND c AND d,
    format('upd=%s del=%s svc_ins_rev=%s svc_ins_review=%s', a, b, c, d));
END $$;

-- ---------------------------------------------------------------------------
-- R4-07: atomic report/job-state/audit rollback
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text;
  v_job_before text; v_job_after text; v_revs int; v_aud int; a boolean;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b4_mk_completed_visit('r407');
  SELECT state INTO v_job_before FROM public.service_jobs WHERE id = v_j;
  -- missing evidence → fail; job must remain in_progress, no revision, no submit audit
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  a := b4_denied(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[]'::jsonb,true,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$,
    v_v, v_t::text || '/b4/missing.jpg', gen_random_uuid()));
  SELECT state INTO v_job_after FROM public.service_jobs WHERE id = v_j;
  SELECT count(*) INTO v_revs FROM public.service_report_revisions r
    JOIN public.service_reports rep ON rep.id = r.report_id WHERE rep.visit_id = v_v;
  SELECT count(*) INTO v_aud FROM public.service_workflow_audit
    WHERE entity_type = 'service_report_revision' AND action = 'submit_report_revision'
      AND details->>'visit_id' = v_v::text;
  PERFORM b4_note('R4-07',
    a AND v_job_before = 'in_progress' AND v_job_after = 'in_progress' AND v_revs = 0 AND v_aud = 0,
    format('denied=%s job=%s→%s revs=%s aud=%s', a, v_job_before, v_job_after, v_revs, v_aud));
END $$;

-- ---------------------------------------------------------------------------
-- R4-08 / F-B4-03: customer cannot retrieve unissued revisions via RLS or getter RPC
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; v_rev public.service_report_revisions;
  a boolean; b boolean; c boolean; v_n int; v_bundle jsonb;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b4_mk_completed_visit('r408');
  v_path := v_t::text || '/b4/r408.jpg';
  PERFORM b4_seed_evidence(v_t, v_path);
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  v_rev := public.submit_service_report_revision(
    v_v, 'f', 'w', '[]'::jsonb, true, 'verified_fixed', NULL, 'decl',
    ARRAY[v_path], NULL, gen_random_uuid(), NULL);

  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, true);
  BEGIN
    EXECUTE 'SET ROLE authenticated';
    SELECT count(*) INTO v_n FROM public.service_report_revisions WHERE id = v_rev.id;
    a := (v_n = 0); -- RLS hides unissued revision from customer
    v_bundle := public.get_service_report_for_visit(v_v);
    b := (COALESCE(jsonb_array_length(v_bundle->'revisions'), 0) = 0);
    -- evidence path must not appear in customer getter payload
    c := (v_bundle::text NOT LIKE '%' || v_path || '%');
    EXECUTE 'RESET ROLE';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    a := false; b := false; c := false;
    PERFORM b4_note('R4-08', false, 'customer getter error: ' || SQLERRM);
    RETURN;
  END;

  PERFORM b4_note('R4-08', a AND b AND c,
    format('cust_select_hidden=%s getter_empty=%s evidence_omitted=%s', a, b, c));
END $$;

-- ---------------------------------------------------------------------------
-- F-B4-04: authorization precedes visit-state disclosure
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text;
  v_sqlstate text; v_msg text; a boolean := false; b boolean := false;
BEGIN
  -- Create a scheduled (not completed) visit owned by tech1
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  INSERT INTO public.service_tickets (ticket_number, user_id, title, description, type, priority, status, assigned_to, assigned_by, assigned_at)
  VALUES (
    'B4-f404-' || substr(replace(gen_random_uuid()::text,'-',''),1,6),
    b1_uid('cust1'), 'b4', 'b4', 'general', 'medium', 'assigned',
    b1_uid('tech1'), b1_uid('support'), now()
  ) RETURNING id INTO v_t;
  SELECT (public.create_service_job(v_t, 'F404', true, 'b4')).id INTO v_j;
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'b4', NULL);
  SELECT (public.schedule_service_job_visit(
    v_j, now()+interval '1 hour', now()+interval '2 hours', 'b4', NULL
  )).id INTO v_v;
  v_path := v_t::text || '/b4/f404.jpg';
  PERFORM b4_seed_evidence(v_t, v_path);

  -- Unrelated tech2 on non-completed visit must get 42501 auth, not state disclosure
  PERFORM set_config('app.b1_uid', b1_uid('tech2')::text, false);
  BEGIN
    PERFORM public.submit_service_report_revision(
      v_v, 'f', 'w', '[]'::jsonb, true, 'verified_fixed', NULL, 'decl',
      ARRAY[v_path], NULL, gen_random_uuid(), NULL);
  EXCEPTION WHEN OTHERS THEN
    v_sqlstate := SQLSTATE; v_msg := SQLERRM;
    a := (SQLSTATE = '42501' AND SQLERRM ILIKE '%historical attending%');
    b := (SQLERRM ILIKE '%completed visits%' OR SQLERRM ILIKE '%Reports may only%');
  END;

  PERFORM b4_note('F-B4-04', a AND NOT b,
    format('auth_first=%s state_leaked=%s sqlstate=%s msg=%s', a, b, v_sqlstate, left(v_msg, 120)));
END $$;

-- ---------------------------------------------------------------------------
-- R4-09: no self-issue, premature job completion, or ticket closure
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; v_rev public.service_report_revisions;
  v_job text; v_tkt text; v_reviews int; a boolean; b boolean;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b4_mk_completed_visit('r409');
  v_path := v_t::text || '/b4/r409.jpg';
  PERFORM b4_seed_evidence(v_t, v_path);
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  v_rev := public.submit_service_report_revision(
    v_v, 'f', 'w', '[]'::jsonb, true, 'verified_fixed', NULL, 'decl',
    ARRAY[v_path], NULL, gen_random_uuid(), NULL);
  SELECT state INTO v_job FROM public.service_jobs WHERE id = v_j;
  SELECT status INTO v_tkt FROM public.service_tickets WHERE id = v_t;
  SELECT count(*) INTO v_reviews FROM public.service_report_reviews WHERE revision_id = v_rev.id;

  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  a := b4_denied(format($q$SELECT public.govern_job_transition(%L::uuid,'completed','early',NULL)$q$, v_j));
  b := b4_denied(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'closed','close early',NULL,NULL)$q$, v_t));

  -- Ticket may already be in_progress from first visit start (B3); must not be closed/resolved.
  PERFORM b4_note('R4-09',
    v_job = 'awaiting_review'
      AND v_tkt NOT IN ('resolved', 'closed', 'cancelled')
      AND v_reviews = 0 AND a AND b,
    format('job=%s ticket=%s reviews=%s complete_denied=%s close_denied=%s', v_job, v_tkt, v_reviews, a, b));
END $$;

-- ---------------------------------------------------------------------------
-- R4-10: submission path presence (UI covered separately); server status truth
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; v_bundle jsonb; v_n int;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b4_mk_completed_visit('r410');
  v_path := v_t::text || '/b4/r410.jpg';
  PERFORM b4_seed_evidence(v_t, v_path);
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM public.submit_service_report_revision(
    v_v, 'f', 'w', '[]'::jsonb, true, 'verified_fixed', NULL, 'decl',
    ARRAY[v_path], NULL, gen_random_uuid(), NULL);
  v_bundle := public.get_service_report_for_visit(v_v);
  v_n := jsonb_array_length(v_bundle->'revisions');
  PERFORM b4_note('R4-10',
    (v_bundle->'report') IS NOT NULL AND v_n = 1
      AND to_regprocedure('public.submit_service_report_revision(uuid,text,text,jsonb,boolean,text,text,text,text[],jsonb,uuid,uuid)') IS NOT NULL,
    format('revisions=%s rpc_present=true', v_n));
END $$;

-- ---------------------------------------------------------------------------
-- B5/B6 DEFER (explicit; do not require success in B4)
-- ---------------------------------------------------------------------------
SELECT b4_defer('R5-DEFER', 'Manager return/issue, correction approval, review concurrency → B5');
SELECT b4_defer('R6-DEFER', 'Acknowledgment and successful closure → B6');
SELECT b4_defer('R4-DRAFT-DEFER', 'Persisted draft CRUD not mandatory; local recoverable draft + truthful submitted status');

SELECT check_id, status, detail FROM public.b4_eval ORDER BY check_id;
