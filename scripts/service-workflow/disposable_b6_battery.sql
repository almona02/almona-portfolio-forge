-- B6 acknowledgment/closure disposable battery (local/disposable only).
-- Prerequisites: disposable_b1_base + B1–B5 + B6 migration.
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

CREATE TABLE IF NOT EXISTS public.b6_eval(check_id text PRIMARY KEY, status text NOT NULL, detail text);
TRUNCATE public.b6_eval;

CREATE OR REPLACE FUNCTION b6_note(p_id text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.b6_eval(check_id, status, detail)
  VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, left(p_detail, 500))
  ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
END; $$;

CREATE OR REPLACE FUNCTION b6_denied(p_sql text)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql; RETURN false;
EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE IN ('42501','22023','P0002','23514','23505','check_violation')
     OR SQLERRM ILIKE '%permission%' OR SQLERRM ILIKE '%only%'
     OR SQLERRM ILIKE '%required%' OR SQLERRM ILIKE '%Invalid%'
     OR SQLERRM ILIKE '%Cannot%' OR SQLERRM ILIKE '%insufficient%'
     OR SQLERRM ILIKE '%Workflow prerequisites%'
     OR SQLERRM ILIKE '%Refusal%' OR SQLERRM ILIKE '%unavailable%'
  THEN RETURN true; END IF;
  RAISE;
END; $$;

CREATE OR REPLACE FUNCTION b6_mk_completed_visit(
  p_tag text, p_owner uuid DEFAULT NULL,
  OUT o_ticket uuid, OUT o_job uuid, OUT o_visit uuid
)
LANGUAGE plpgsql AS $$
DECLARE
  v_s timestamptz := now() + interval '1 hour';
  v_e timestamptz := now() + interval '3 hours';
  v_owner uuid := COALESCE(p_owner, b1_uid('cust1'));
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  INSERT INTO public.service_tickets (
    ticket_number, user_id, title, description, type, priority, status,
    assigned_to, assigned_by, assigned_at
  ) VALUES (
    'B6-' || p_tag || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6),
    v_owner, 'b6', 'b6', 'general', 'medium', 'assigned',
    b1_uid('tech1'), b1_uid('support'), now()
  ) RETURNING id INTO o_ticket;
  SELECT (public.create_service_job(o_ticket, 'B6 ' || p_tag, true, 'b6')).id INTO o_job;
  PERFORM public.assign_service_job(o_job, b1_uid('tech1'), 'b6', NULL);
  SELECT (public.schedule_service_job_visit(o_job, v_s, v_e, 'b6', NULL)).id INTO o_visit;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM public.record_visit_safety_check(
    o_visit, 'passed', 'b6', NULL, public.b3_minimum_safety_attestation()
  );
  PERFORM public.start_service_job_visit(
    o_visit, NULL, public.b3_minimum_safety_attestation(), 'b6'
  );
  PERFORM public.complete_service_job_visit(o_visit);
END; $$;

CREATE OR REPLACE FUNCTION b6_seed_evidence(p_ticket uuid, p_path text)
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

CREATE OR REPLACE FUNCTION b6_issue(
  p_tag text, p_owner uuid DEFAULT NULL,
  OUT o_ticket uuid, OUT o_job uuid, OUT o_visit uuid, OUT o_rev uuid
)
LANGUAGE plpgsql AS $$
DECLARE
  v_path text;
  v_rev public.service_report_revisions;
BEGIN
  SELECT * INTO o_ticket, o_job, o_visit FROM b6_mk_completed_visit(p_tag, p_owner);
  v_path := o_ticket::text || '/b4/' || p_tag || '.jpg';
  PERFORM b6_seed_evidence(o_ticket, v_path);
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  v_rev := public.submit_service_report_revision(
    o_visit, 'findings-' || p_tag, 'work-' || p_tag, '[]'::jsonb, true,
    'verified_fixed', NULL, 'I declare', ARRAY[v_path], NULL, gen_random_uuid(), NULL
  );
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  PERFORM public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);
  o_rev := v_rev.id;
END; $$;

CREATE OR REPLACE FUNCTION b6_contact_ok(p_actor uuid)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_array(
    jsonb_build_object(
      'attempted_at', (now() - interval '3 days')::text,
      'channel', 'issue_notification',
      'outcome', 'delivered',
      'by_actor_id', p_actor::text
    ),
    jsonb_build_object(
      'attempted_at', (now() - interval '2 days')::text,
      'channel', 'phone',
      'outcome', 'no_answer',
      'by_actor_id', p_actor::text
    ),
    jsonb_build_object(
      'attempted_at', (now() - interval '1 days')::text,
      'channel', 'email',
      'outcome', 'no_reply',
      'by_actor_id', p_actor::text
    )
  );
$$;

-- B6-01: owner accept; refuse without comment denied; refuse with comment ok
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  v_ack public.service_acknowledgments;
  a boolean;
BEGIN
  SELECT * INTO v_t, v_j, v_v, v_rev FROM b6_issue('01');
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  a := b6_denied(format(
    $q$SELECT public.record_service_acknowledgment(%L::uuid,'refused',NULL,NULL)$q$, v_rev));
  v_ack := public.record_service_acknowledgment(v_rev, 'accepted', NULL, NULL);
  PERFORM b6_note('B6-01_accept_and_refuse_comment',
    a AND v_ack.response = 'accepted',
    'refuse_denied=' || a::text || ' response=' || v_ack.response);
END $$;

-- B6-02: append-only + idempotent repeat; later response preserves history
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  a1 public.service_acknowledgments;
  a2 public.service_acknowledgments;
  a3 public.service_acknowledgments;
  n int;
BEGIN
  SELECT * INTO v_t, v_j, v_v, v_rev FROM b6_issue('02');
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  a1 := public.record_service_acknowledgment(v_rev, 'accepted', NULL, NULL);
  a2 := public.record_service_acknowledgment(v_rev, 'accepted', NULL, NULL);
  a3 := public.record_service_acknowledgment(v_rev, 'refused', 'still broken', NULL);
  SELECT count(*) INTO n FROM public.service_acknowledgments WHERE issued_revision_id = v_rev;
  PERFORM b6_note('B6-02_append_idempotent',
    a1.id = a2.id AND a3.id IS DISTINCT FROM a1.id AND n = 2 AND a3.response = 'refused',
    'idempotent=' || (a1.id = a2.id)::text || ' n=' || n || ' eff=' || a3.response);
END $$;

-- B6-03: new issued revision does not inherit prior acceptance
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_rev1 uuid;
  v_path text; v_rev2 public.service_report_revisions;
  v_ack1 public.service_acknowledgments;
  v_eff2 public.service_acknowledgments;
BEGIN
  SELECT * INTO v_t, v_j, v_v, v_rev1 FROM b6_issue('03');
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  v_ack1 := public.record_service_acknowledgment(v_rev1, 'accepted', NULL, NULL);
  -- Force a second visit/report issued head on same ticket job via new visit
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  -- Job already completed; create optional follow-up job with its own issued report
  SELECT (public.create_service_job(v_t, 'B6 03b', false, 'b6')).id INTO v_j;
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'b6', NULL);
  SELECT (public.schedule_service_job_visit(
    v_j, now()+interval '4 hours', now()+interval '6 hours', 'b6', NULL)).id INTO v_v;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM public.record_visit_safety_check(
    v_v, 'passed', 'b6', NULL, public.b3_minimum_safety_attestation());
  PERFORM public.start_service_job_visit(v_v, NULL, public.b3_minimum_safety_attestation(), 'b6');
  PERFORM public.complete_service_job_visit(v_v);
  v_path := v_t::text || '/b4/03b.jpg';
  PERFORM b6_seed_evidence(v_t, v_path);
  v_rev2 := public.submit_service_report_revision(
    v_v, 'f2', 'w2', '[]'::jsonb, true, 'verified_fixed', NULL,
    'decl', ARRAY[v_path], NULL, gen_random_uuid(), NULL);
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  PERFORM public.review_service_report_revision(v_rev2.id, 'approved_issued', NULL, NULL);
  v_eff2 := public.effective_acknowledgment(v_rev2.id);
  PERFORM b6_note('B6-03_no_inherit_acceptance',
    v_ack1.response = 'accepted' AND v_eff2.id IS NULL,
    'r1_accepted=true r2_eff_null=' || (v_eff2.id IS NULL)::text);
END $$;

-- B6-04: unavailable requires attributable evidence; no calendar hardcode in SQL
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  a boolean; v_ack public.service_acknowledgments;
BEGIN
  SELECT * INTO v_t, v_j, v_v, v_rev FROM b6_issue('04');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  a := b6_denied(format(
    $q$SELECT public.record_service_acknowledgment_unavailable(%L::uuid,'[]'::jsonb,'x',NULL)$q$,
    v_rev));
  a := a AND b6_denied(format(
    $q$SELECT public.record_service_acknowledgment_unavailable(
      %L::uuid,
      jsonb_build_array(jsonb_build_object(
        'attempted_at', now()::text, 'channel', 'phone', 'outcome', 'no_answer',
        'by_actor_id', %L)),
      'thin', NULL)$q$,
    v_rev, b1_uid('support')));
  v_ack := public.record_service_acknowledgment_unavailable(
    v_rev, b6_contact_ok(b1_uid('support')), 'customer unreachable', NULL);
  PERFORM b6_note('B6-04_unavailable_evidence',
    a AND v_ack.response = 'unavailable',
    'thin_denied=' || a::text || ' response=' || v_ack.response);
END $$;

-- B6-05: refusal blocks close until disposition; never converts to accepted
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  v_ack public.service_acknowledgments;
  v_disp public.service_acknowledgment_dispositions;
  a boolean; n_codes int;
BEGIN
  SELECT * INTO v_t, v_j, v_v, v_rev FROM b6_issue('05');
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  v_ack := public.record_service_acknowledgment(v_rev, 'refused', 'not ok', NULL);
  UPDATE public.service_tickets SET resolution_summary = 'done' WHERE id = v_t;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT count(*) INTO n_codes FROM public.evaluate_ticket_workflow_prerequisites(v_t)
  WHERE code = 'acknowledgment_refusal_disposition_pending';
  a := b6_denied(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'resolved','x','done',NULL)$q$, v_t));
  v_disp := public.record_acknowledgment_disposition(
    v_rev, 'accept_refusal_and_proceed', 'manager accepts refusal', NULL);
  SELECT count(*) INTO n_codes FROM public.evaluate_ticket_workflow_prerequisites(v_t)
  WHERE code LIKE 'acknowledgment_refusal%';
  PERFORM b6_note('B6-05_refusal_disposition',
    a AND v_ack.response = 'refused' AND v_disp.disposition = 'accept_refusal_and_proceed'
      AND n_codes = 0 AND v_ack.response IS DISTINCT FROM 'accepted',
    'close_denied_before=' || a::text || ' pending_after=' || n_codes);
END $$;

-- B6-06: named failures for open visit + missing ack; optional job does not block
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  v_j2 uuid; v_v2 uuid;
  has_ack boolean; has_visit boolean; has_opt boolean;
BEGIN
  SELECT * INTO v_t, v_j, v_v, v_rev FROM b6_issue('06');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT (public.create_service_job(v_t, 'optional inspect', false, 'b6')).id INTO v_j2;
  PERFORM public.assign_service_job(v_j2, b1_uid('tech1'), 'b6', NULL);
  SELECT (public.schedule_service_job_visit(
    v_j2, now()+interval '8 hours', now()+interval '10 hours', 'b6', NULL)).id INTO v_v2;
  UPDATE public.service_tickets SET resolution_summary = 'partial' WHERE id = v_t;
  SELECT EXISTS(
    SELECT 1 FROM public.evaluate_ticket_workflow_prerequisites(v_t)
    WHERE code = 'acknowledgment_outstanding') INTO has_ack;
  SELECT EXISTS(
    SELECT 1 FROM public.evaluate_ticket_workflow_prerequisites(v_t)
    WHERE code = 'scheduled_visit_open') INTO has_visit;
  SELECT EXISTS(
    SELECT 1 FROM public.evaluate_ticket_workflow_prerequisites(v_t)
    WHERE code = 'required_job_unsatisfied' AND detail ILIKE '%optional%') INTO has_opt;
  PERFORM b6_note('B6-06_named_failures_optional',
    has_ack AND has_visit AND NOT has_opt,
    'ack=' || has_ack::text || ' visit=' || has_visit::text || ' opt_block=' || has_opt::text);
END $$;

-- B6-07: sales-role owner may acknowledge via RPC (ownership, not role label)
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  v_ack public.service_acknowledgments;
  v_role text;
BEGIN
  UPDATE public.profiles SET role = 'sales_rep' WHERE id = b1_uid('sales');
  SELECT role INTO v_role FROM public.profiles WHERE id = b1_uid('sales');
  SELECT * INTO v_t, v_j, v_v, v_rev FROM b6_issue('07', b1_uid('sales'));
  PERFORM set_config('app.b1_uid', b1_uid('sales')::text, false);
  v_ack := public.record_service_acknowledgment(v_rev, 'accepted', NULL, NULL);
  PERFORM b6_note('B6-07_sales_role_owner_rpc',
    v_role = 'sales_rep' AND v_ack.response = 'accepted' AND v_ack.responded_by = b1_uid('sales'),
    'role=' || v_role || ' response=' || v_ack.response);
END $$;

-- B6-08: legacy jobless close still allowed; activated cannot bypass
DO $$
DECLARE
  v_legacy uuid; v_act uuid; v_j uuid; v_v uuid; v_rev uuid;
  a_legacy boolean; a_act boolean;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  INSERT INTO public.service_tickets (
    ticket_number, user_id, title, description, type, priority, status, resolution_summary
  ) VALUES (
    'B6-LEG-' || substr(replace(gen_random_uuid()::text,'-',''),1,6),
    b1_uid('cust1'), 'legacy', 'legacy', 'general', 'medium', 'resolved', 'legacy done'
  ) RETURNING id INTO v_legacy;
  -- workflow_activated_at remains null
  BEGIN
    PERFORM public.govern_ticket_transition(v_legacy, 'closed', 'legacy close', 'legacy done', NULL);
    a_legacy := true;
  EXCEPTION WHEN OTHERS THEN
    a_legacy := false;
  END;

  SELECT * INTO v_act, v_j, v_v, v_rev FROM b6_issue('08');
  UPDATE public.service_tickets SET status = 'resolved', resolution_summary = 'x' WHERE id = v_act;
  a_act := b6_denied(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'closed','x','x',NULL)$q$, v_act));
  PERFORM b6_note('B6-08_legacy_vs_activated',
    a_legacy AND a_act,
    'legacy_ok=' || a_legacy::text || ' activated_blocked=' || a_act::text);
END $$;

-- B6-09: happy path accept → resolve → close
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  v_ticket public.service_tickets;
BEGIN
  SELECT * INTO v_t, v_j, v_v, v_rev FROM b6_issue('09');
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  PERFORM public.record_service_acknowledgment(v_rev, 'accepted', NULL, NULL);
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_ticket := public.govern_ticket_transition(v_t, 'resolved', 'done', 'All work complete', NULL);
  v_ticket := public.govern_ticket_transition(v_t, 'closed', 'close', 'All work complete', NULL);
  PERFORM b6_note('B6-09_happy_close',
    v_ticket.status = 'closed',
    'status=' || v_ticket.status);
END $$;

-- B6-10 / F-B6-05: duplicate follow-up (same attempted_at+channel) denied
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  a boolean;
  v_dup jsonb;
BEGIN
  SELECT * INTO v_t, v_j, v_v, v_rev FROM b6_issue('10');
  v_dup := jsonb_build_array(
    jsonb_build_object(
      'attempted_at', (now() - interval '3 days')::text,
      'channel', 'issue_notification', 'outcome', 'delivered',
      'by_actor_id', b1_uid('support')::text
    ),
    jsonb_build_object(
      'attempted_at', (now() - interval '1 days')::text,
      'channel', 'phone', 'outcome', 'no_answer',
      'by_actor_id', b1_uid('support')::text
    ),
    jsonb_build_object(
      'attempted_at', (now() - interval '1 days')::text,
      'channel', 'phone', 'outcome', 'left_voicemail',
      'by_actor_id', b1_uid('support')::text
    )
  );
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  a := b6_denied(format(
    $q$SELECT public.record_service_acknowledgment_unavailable(%L::uuid,%L::jsonb,'dup',NULL)$q$,
    v_rev, v_dup));
  PERFORM b6_note('B6-10_distinct_followups', a, 'dup_denied=' || a::text);
END $$;

-- B6-11 / F-B6-03: unavailable cannot overwrite accepted
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  a boolean; n int;
BEGIN
  SELECT * INTO v_t, v_j, v_v, v_rev FROM b6_issue('11');
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  PERFORM public.record_service_acknowledgment(v_rev, 'accepted', NULL, NULL);
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  a := b6_denied(format(
    $q$SELECT public.record_service_acknowledgment_unavailable(%L::uuid,%L::jsonb,'overwrite',NULL)$q$,
    v_rev, b6_contact_ok(b1_uid('support'))));
  SELECT count(*) INTO n FROM public.service_acknowledgments WHERE issued_revision_id = v_rev;
  PERFORM b6_note('B6-11_unavailable_no_overwrite_accepted',
    a AND n = 1, 'denied=' || a::text || ' rows=' || n);
END $$;

-- B6-12 / F-B6-04: refuse→dispose→re-refuse requires new disposition binding
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  v_disp public.service_acknowledgment_dispositions;
  pending_before int; pending_after int; a boolean;
BEGIN
  SELECT * INTO v_t, v_j, v_v, v_rev FROM b6_issue('12');
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  PERFORM public.record_service_acknowledgment(v_rev, 'refused', 'first refuse', NULL);
  UPDATE public.service_tickets SET resolution_summary = 'done' WHERE id = v_t;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_disp := public.record_acknowledgment_disposition(
    v_rev, 'accept_refusal_and_proceed', 'ok', NULL);
  SELECT count(*) INTO pending_before FROM public.evaluate_ticket_workflow_prerequisites(v_t)
  WHERE code = 'acknowledgment_refusal_disposition_pending';
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  PERFORM public.record_service_acknowledgment(v_rev, 'refused', 'second refuse', NULL);
  SELECT count(*) INTO pending_after FROM public.evaluate_ticket_workflow_prerequisites(v_t)
  WHERE code = 'acknowledgment_refusal_disposition_pending';
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  a := b6_denied(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'resolved','x','done',NULL)$q$, v_t));
  PERFORM b6_note('B6-12_disposition_binds_current_refusal',
    pending_before = 0 AND pending_after = 1 AND a
      AND v_disp.acknowledgment_id IS NOT NULL,
    'before=' || pending_before || ' after=' || pending_after || ' close_denied=' || a::text);
END $$;
