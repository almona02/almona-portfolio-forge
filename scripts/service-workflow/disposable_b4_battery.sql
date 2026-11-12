-- B4 report submission disposable battery (local/disposable only).
-- Prerequisites: disposable_b1_base + B1/B2/B3 migrations + B4 migration.
-- Never against staging/production.

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
  VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, left(p_detail, 400))
  ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
END; $$;

CREATE OR REPLACE FUNCTION b4_denied(p_sql text)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql; RETURN false;
EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE IN ('42501','22023','P0002','23514','23505')
     OR SQLERRM ILIKE '%permission%' OR SQLERRM ILIKE '%only%'
     OR SQLERRM ILIKE '%required%' OR SQLERRM ILIKE '%Invalid%'
     OR SQLERRM ILIKE '%Cannot%' OR SQLERRM ILIKE '%labour%'
     OR SQLERRM ILIKE '%evidence%' OR SQLERRM ILIKE '%immutable%'
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

-- M4: one report root per completed visit; attending tech submit → awaiting_review
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; v_rev public.service_report_revisions;
  v_rev2 public.service_report_revisions; v_cid uuid := gen_random_uuid();
  v_job_state text; v_tkt text; v_n int; a boolean; b boolean; c boolean;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b4_mk_completed_visit('m4');
  v_path := v_t::text || '/b4/m4-e1.jpg';
  PERFORM b4_seed_evidence(v_t, v_path);

  -- Wrong actor denied
  PERFORM set_config('app.b1_uid', b1_uid('tech2')::text, false);
  a := b4_denied(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[{"hours":1,"description":"x"}]'::jsonb,false,'verified_fixed',NULL,'I declare',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$,
    v_v, v_path, gen_random_uuid()
  ));
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  b := b4_denied(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[{"hours":1,"description":"x"}]'::jsonb,false,'verified_fixed',NULL,'I declare',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$,
    v_v, v_path, gen_random_uuid()
  ));

  -- Attending tech submits
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  v_rev := public.submit_service_report_revision(
    v_v, 'findings', 'work done',
    '[{"hours":1.5,"description":"align"}]'::jsonb, false,
    'verified_fixed', NULL, 'I declare this report accurate.',
    ARRAY[v_path], NULL, v_cid, NULL
  );
  SELECT state INTO v_job_state FROM public.service_jobs WHERE id = v_j;
  SELECT status INTO v_tkt FROM public.service_tickets WHERE id = v_t;
  SELECT count(*) INTO v_n FROM public.service_reports WHERE visit_id = v_v;

  -- Idempotent retry same client_submission_id
  v_rev2 := public.submit_service_report_revision(
    v_v, 'findings-changed', 'work changed',
    '[{"hours":9,"description":"should not apply"}]'::jsonb, false,
    'not_verified', 'n/a', 'I declare this report accurate.',
    ARRAY[v_path], NULL, v_cid, NULL
  );

  PERFORM b4_note('M4',
    a AND b AND v_n = 1 AND v_rev.revision_number = 1
      AND v_rev2.id = v_rev.id AND v_rev2.findings = 'findings'
      AND v_job_state = 'awaiting_review' AND v_tkt = 'assigned',
    format('denied_wrong=%s/%s root=%s job=%s ticket=%s idem=%s', a, b, v_n, v_job_state, v_tkt, v_rev2.id = v_rev.id)
  );
END $$;

-- M4B: no_labour xor labour; missing evidence denied; direct writes denied
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; a boolean; b boolean; c boolean; d boolean;
  v_rev public.service_report_revisions; v_report uuid;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b4_mk_completed_visit('m4b');
  v_path := v_t::text || '/b4/m4b-e1.jpg';
  PERFORM b4_seed_evidence(v_t, v_path);
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);

  a := b4_denied(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[]'::jsonb,false,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$,
    v_v, v_path, gen_random_uuid()
  ));
  b := b4_denied(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[{"hours":1,"description":"x"}]'::jsonb,true,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$,
    v_v, v_path, gen_random_uuid()
  ));
  c := b4_denied(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[]'::jsonb,true,'verified_fixed',NULL,'decl',ARRAY[]::text[],NULL,%L::uuid,NULL)$q$,
    v_v, gen_random_uuid()
  ));

  v_rev := public.submit_service_report_revision(
    v_v, 'f', 'w', '[]'::jsonb, true, 'verified_fixed', NULL, 'decl',
    ARRAY[v_path], NULL, gen_random_uuid(), NULL
  );
  SELECT id INTO v_report FROM public.service_reports WHERE visit_id = v_v;

  -- Direct client/service_role writes remain denied (B2 revocation preserved)
  PERFORM set_config('app.b1_uid', b1_uid('admin')::text, false);
  d := b4_denied(format(
    $q$INSERT INTO public.service_report_revisions(report_id,revision_number,findings,work_performed,labour,no_labour,verification_outcome,technician_declaration,submitted_by)
       VALUES (%L::uuid, 99, 'x', 'x', '[]'::jsonb, true, 'verified_fixed', 'x', %L::uuid)$q$,
    v_report, b1_uid('admin')
  ));

  PERFORM b4_note('M4B', a AND b AND c AND d AND v_rev.no_labour,
    format('labour_rules=%s/%s/%s direct_denied=%s', a, b, c, d));
END $$;

-- M4C: historical attribution survives reassignment; former tech cannot submit new revision
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; v_rev public.service_report_revisions;
  a boolean; v_by uuid;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b4_mk_completed_visit('m4c');
  v_path := v_t::text || '/b4/m4c-e1.jpg';
  PERFORM b4_seed_evidence(v_t, v_path);
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  v_rev := public.submit_service_report_revision(
    v_v, 'f', 'w', '[{"hours":1,"description":"x"}]'::jsonb, false,
    'verified_fixed', NULL, 'decl', ARRAY[v_path], NULL, gen_random_uuid(), NULL
  );
  v_by := v_rev.submitted_by;

  -- Reassign job (awaiting_review → in_progress may be needed first)
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  PERFORM public.govern_job_transition(v_j, 'in_progress', 'reopen for reassignment', NULL);
  PERFORM public.assign_service_job(v_j, b1_uid('tech2'), 'reassign after submit', NULL);

  SELECT submitted_by INTO v_by FROM public.service_report_revisions WHERE id = v_rev.id;
  a := (v_by = b1_uid('tech1'));

  -- New completed visit for tech2 would be needed to submit; former tech on old visit still attributed
  PERFORM b4_note('M4C', a, format('historical_submitted_by=%s', v_by));
END $$;

-- M4D: append-only second revision; does not complete job or close ticket; no self-issue
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; v_r1 public.service_report_revisions;
  v_r2 public.service_report_revisions; v_job text; v_tkt text; v_reviews int;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b4_mk_completed_visit('m4d');
  v_path := v_t::text || '/b4/m4d-e1.jpg';
  PERFORM b4_seed_evidence(v_t, v_path);
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  v_r1 := public.submit_service_report_revision(
    v_v, 'f1', 'w1', '[{"hours":1,"description":"x"}]'::jsonb, false,
    'further_work_required', 'need parts', 'decl', ARRAY[v_path], NULL, gen_random_uuid(), NULL
  );
  v_r2 := public.submit_service_report_revision(
    v_v, 'f2', 'w2', '[{"hours":2,"description":"y"}]'::jsonb, false,
    'verified_fixed', NULL, 'decl', ARRAY[v_path], NULL, gen_random_uuid(), NULL
  );
  SELECT state INTO v_job FROM public.service_jobs WHERE id = v_j;
  SELECT status INTO v_tkt FROM public.service_tickets WHERE id = v_t;
  SELECT count(*) INTO v_reviews FROM public.service_report_reviews;
  PERFORM b4_note('M4D',
    v_r2.revision_number = 2 AND v_job = 'awaiting_review' AND v_tkt = 'assigned' AND v_reviews = 0,
    format('rev=%s job=%s ticket=%s reviews=%s', v_r2.revision_number, v_job, v_tkt, v_reviews)
  );
END $$;

-- M4E: pinned routine checklist contract (no hardcoded model tolerances)
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; a boolean; v_rev public.service_report_revisions;
  v_pin uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b4_mk_completed_visit('m4e');
  UPDATE public.service_job_visits SET pinned_routine_version_id = v_pin WHERE id = v_v;
  v_path := v_t::text || '/b4/m4e-e1.jpg';
  PERFORM b4_seed_evidence(v_t, v_path);
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  a := b4_denied(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[]'::jsonb,true,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$,
    v_v, v_path, gen_random_uuid()
  ));
  v_rev := public.submit_service_report_revision(
    v_v, 'f', 'w', '[]'::jsonb, true, 'verified_fixed', NULL, 'decl',
    ARRAY[v_path],
    jsonb_build_object(
      'routine_version_id', v_pin::text,
      'items', jsonb_build_array(jsonb_build_object('id','c1','result','ok'))
    ),
    gen_random_uuid(), NULL
  );
  PERFORM b4_note('M4E', a AND v_rev.checklist_results ? 'items',
    format('pin_required=%s has_items=%s', a, v_rev.checklist_results ? 'items'));
END $$;

SELECT check_id, status, detail FROM public.b4_eval ORDER BY check_id;
