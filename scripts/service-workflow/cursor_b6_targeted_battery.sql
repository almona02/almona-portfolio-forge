-- Cursor targeted B6 supporting suite (disposable only; never staging/prod).
-- NOT equivalent to Spark's independent Q6-01–Q6-43 harness
-- (scripts/service-workflow/spark_b6_battery.sql, restored from b6500999).
-- Covers a short integrity/correction smoke set only.

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

CREATE OR REPLACE FUNCTION spk6_denied(p_sql text)
RETURNS boolean LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  EXECUTE p_sql; RETURN false;
EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE IN ('42501','22023','P0002','23514','23505','check_violation')
     OR SQLERRM ILIKE '%Workflow prerequisites%'
     OR SQLERRM ILIKE '%insufficient%'
     OR SQLERRM ILIKE '%distinct%'
     OR SQLERRM ILIKE '%unavailable%'
     OR SQLERRM ILIKE '%injected closure%'
  THEN RETURN true; END IF;
  RAISE;
END; $$;

CREATE OR REPLACE FUNCTION spk6_contact_ok(p_actor uuid)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_array(
    jsonb_build_object('attempted_at', (now()-interval '3 days')::text,
      'channel','issue_notification','outcome','delivered','by_actor_id', p_actor::text),
    jsonb_build_object('attempted_at', (now()-interval '2 days')::text,
      'channel','phone','outcome','no_answer','by_actor_id', p_actor::text),
    jsonb_build_object('attempted_at', (now()-interval '1 days')::text,
      'channel','email','outcome','no_reply','by_actor_id', p_actor::text)
  );
$$;

CREATE OR REPLACE FUNCTION spk6_issue(p_tag text, p_owner uuid DEFAULT NULL,
  OUT o_ticket uuid, OUT o_job uuid, OUT o_visit uuid, OUT o_rev uuid)
LANGUAGE plpgsql AS $$
DECLARE
  v_s timestamptz := now() + interval '1 hour';
  v_e timestamptz := now() + interval '3 hours';
  v_owner uuid := COALESCE(p_owner, spk6_uid('cust1'));
  v_path text;
  v_rev public.service_report_revisions;
BEGIN
  PERFORM set_config('app.b1_uid', spk6_uid('support')::text, false);
  INSERT INTO public.service_tickets (
    ticket_number, user_id, title, description, type, priority, status,
    assigned_to, assigned_by, assigned_at
  ) VALUES (
    'SPK6-' || p_tag || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6),
    v_owner, 'spk6', 'spk6', 'general', 'medium', 'assigned',
    spk6_uid('tech1'), spk6_uid('support'), now()
  ) RETURNING id INTO o_ticket;
  SELECT (public.create_service_job(o_ticket, 'SPK6 ' || p_tag, true, 'spk6')).id INTO o_job;
  PERFORM public.assign_service_job(o_job, spk6_uid('tech1'), 'spk6', NULL);
  SELECT (public.schedule_service_job_visit(o_job, v_s, v_e, 'spk6', NULL)).id INTO o_visit;
  PERFORM set_config('app.b1_uid', spk6_uid('tech1')::text, false);
  PERFORM public.record_visit_safety_check(
    o_visit, 'passed', 'spk6', NULL, public.b3_minimum_safety_attestation());
  PERFORM public.start_service_job_visit(
    o_visit, NULL, public.b3_minimum_safety_attestation(), 'spk6');
  PERFORM public.complete_service_job_visit(o_visit);
  v_path := o_ticket::text || '/b4/' || p_tag || '.jpg';
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('ticket-attachments', 'ticket-attachments', false) ON CONFLICT (id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='ticket-attachments' AND name=v_path) THEN
    INSERT INTO storage.objects (bucket_id, name) VALUES ('ticket-attachments', v_path);
  END IF;
  v_rev := public.submit_service_report_revision(
    o_visit, 'f-'||p_tag, 'w-'||p_tag, '[]'::jsonb, true, 'verified_fixed', NULL,
    'decl', ARRAY[v_path], NULL, gen_random_uuid(), NULL);
  PERFORM set_config('app.b1_uid', spk6_uid('support')::text, false);
  PERFORM public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);
  o_rev := v_rev.id;
END; $$;

-- Q6-11: duplicate follow-ups denied
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  a boolean; v_dup jsonb;
BEGIN
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_issue('11');
  v_dup := jsonb_build_array(
    jsonb_build_object('attempted_at', (now()-interval '3 days')::text,
      'channel','issue_notification','outcome','delivered','by_actor_id', spk6_uid('support')::text),
    jsonb_build_object('attempted_at', (now()-interval '1 days')::text,
      'channel','phone','outcome','no_answer','by_actor_id', spk6_uid('support')::text),
    jsonb_build_object('attempted_at', (now()-interval '1 days')::text,
      'channel','phone','outcome','left_voicemail','by_actor_id', spk6_uid('support')::text)
  );
  PERFORM set_config('app.b1_uid', spk6_uid('support')::text, false);
  a := spk6_denied(format(
    $q$SELECT public.record_service_acknowledgment_unavailable(%L::uuid,%L::jsonb,'dup',NULL)$q$,
    v_rev, v_dup));
  PERFORM spk6_note('Q6-11', a, 'dup_denied=' || a::text);
END $$;

-- Q6-13: unavailable cannot overwrite accepted
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  a boolean; n int;
BEGIN
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_issue('13');
  PERFORM set_config('app.b1_uid', spk6_uid('cust1')::text, false);
  PERFORM public.record_service_acknowledgment(v_rev, 'accepted', NULL, NULL);
  PERFORM set_config('app.b1_uid', spk6_uid('support')::text, false);
  a := spk6_denied(format(
    $q$SELECT public.record_service_acknowledgment_unavailable(%L::uuid,%L::jsonb,'x',NULL)$q$,
    v_rev, spk6_contact_ok(spk6_uid('support'))));
  SELECT count(*) INTO n FROM public.service_acknowledgments WHERE issued_revision_id = v_rev;
  PERFORM spk6_note('Q6-13', a AND n = 1, 'denied=' || a::text || ' rows=' || n);
END $$;

-- Q6-17: refuse→dispose→re-refuse requires new disposition
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  pending int; a boolean;
BEGIN
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_issue('17');
  PERFORM set_config('app.b1_uid', spk6_uid('cust1')::text, false);
  PERFORM public.record_service_acknowledgment(v_rev, 'refused', 'r1', NULL);
  UPDATE public.service_tickets SET resolution_summary = 'done' WHERE id = v_t;
  PERFORM set_config('app.b1_uid', spk6_uid('support')::text, false);
  PERFORM public.record_acknowledgment_disposition(v_rev, 'accept_refusal_and_proceed', 'ok', NULL);
  PERFORM set_config('app.b1_uid', spk6_uid('cust1')::text, false);
  PERFORM public.record_service_acknowledgment(v_rev, 'refused', 'r2', NULL);
  SELECT count(*) INTO pending FROM public.evaluate_ticket_workflow_prerequisites(v_t)
  WHERE code = 'acknowledgment_refusal_disposition_pending';
  PERFORM set_config('app.b1_uid', spk6_uid('support')::text, false);
  a := spk6_denied(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'resolved','x','done',NULL)$q$, v_t));
  PERFORM spk6_note('Q6-17', pending = 1 AND a, 'pending=' || pending || ' denied=' || a::text);
END $$;

-- Structured entity_id + two-head targeting (no first-head fallback)
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_rev_a uuid; v_rev_b uuid;
  v_j2 uuid; v_v2 uuid; v_path text; v_rev2 public.service_report_revisions;
  eid_out uuid; eid_ref uuid;
BEGIN
  SELECT * INTO v_t, v_j, v_v, v_rev_a FROM spk6_issue('2h');
  PERFORM set_config('app.b1_uid', spk6_uid('cust1')::text, false);
  PERFORM public.record_service_acknowledgment(v_rev_a, 'accepted', NULL, NULL);
  PERFORM set_config('app.b1_uid', spk6_uid('support')::text, false);
  SELECT (public.create_service_job(v_t, 'SPK6 2hb', true, 'spk6')).id INTO v_j2;
  PERFORM public.assign_service_job(v_j2, spk6_uid('tech1'), 'spk6', NULL);
  SELECT (public.schedule_service_job_visit(
    v_j2, now()+interval '5 hours', now()+interval '7 hours', 'spk6', NULL)).id INTO v_v2;
  PERFORM set_config('app.b1_uid', spk6_uid('tech1')::text, false);
  PERFORM public.record_visit_safety_check(
    v_v2, 'passed', 'spk6', NULL, public.b3_minimum_safety_attestation());
  PERFORM public.start_service_job_visit(v_v2, NULL, public.b3_minimum_safety_attestation(), 'spk6');
  PERFORM public.complete_service_job_visit(v_v2);
  v_path := v_t::text || '/b4/2hb.jpg';
  INSERT INTO storage.objects (bucket_id, name) VALUES ('ticket-attachments', v_path)
  ON CONFLICT DO NOTHING;
  v_rev2 := public.submit_service_report_revision(
    v_v2, 'f2', 'w2', '[]'::jsonb, true, 'verified_fixed', NULL,
    'decl', ARRAY[v_path], NULL, gen_random_uuid(), NULL);
  PERFORM set_config('app.b1_uid', spk6_uid('support')::text, false);
  PERFORM public.review_service_report_revision(v_rev2.id, 'approved_issued', NULL, NULL);
  v_rev_b := v_rev2.id;
  UPDATE public.service_tickets SET resolution_summary = 'x' WHERE id = v_t;
  SELECT entity_id INTO eid_out FROM public.evaluate_ticket_workflow_prerequisites(v_t)
  WHERE code = 'acknowledgment_outstanding' LIMIT 1;
  PERFORM set_config('app.b1_uid', spk6_uid('cust1')::text, false);
  PERFORM public.record_service_acknowledgment(v_rev_b, 'refused', 'no', NULL);
  SELECT entity_id INTO eid_ref FROM public.evaluate_ticket_workflow_prerequisites(v_t)
  WHERE code = 'acknowledgment_refusal_disposition_pending' LIMIT 1;
  PERFORM spk6_note('Q6-entity_id_two_head',
    eid_out IS NOT DISTINCT FROM v_rev_b AND eid_ref IS NOT DISTINCT FROM v_rev_b
      AND eid_out IS DISTINCT FROM v_rev_a,
    'out=' || coalesce(eid_out::text,'null') || ' ref=' || coalesce(eid_ref::text,'null')
      || ' a=' || v_rev_a::text || ' b=' || v_rev_b::text);
END $$;

-- event_seq tie-break
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  a1 public.service_acknowledgments; a2 public.service_acknowledgments;
  eff public.service_acknowledgments; v_ts timestamptz := clock_timestamp();
BEGIN
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_issue('tie');
  PERFORM set_config('app.b1_uid', spk6_uid('cust1')::text, false);
  a1 := public.record_service_acknowledgment(v_rev, 'accepted', NULL, NULL);
  a2 := public.record_service_acknowledgment(v_rev, 'refused', 'r', NULL);
  UPDATE public.service_acknowledgments SET responded_at = v_ts WHERE id IN (a1.id, a2.id);
  eff := public.effective_acknowledgment(v_rev);
  PERFORM spk6_note('Q6-event_seq_tie',
    eff.id = a2.id AND a2.event_seq > a1.event_seq,
    'eff=' || eff.response || ' seq=' || a1.event_seq || '/' || a2.event_seq);
END $$;

-- re-close preserves closed_at
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  v1 public.service_tickets; v2 public.service_tickets; n int;
BEGIN
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_issue('reclose');
  PERFORM set_config('app.b1_uid', spk6_uid('cust1')::text, false);
  PERFORM public.record_service_acknowledgment(v_rev, 'accepted', NULL, NULL);
  PERFORM set_config('app.b1_uid', spk6_uid('support')::text, false);
  PERFORM public.govern_ticket_transition(v_t, 'resolved', 'd', 'done', NULL);
  v1 := public.govern_ticket_transition(v_t, 'closed', 'c', 'done', NULL);
  v2 := public.govern_ticket_transition(v_t, 'closed', 'c2', 'done', NULL);
  SELECT count(*) INTO n FROM public.service_workflow_audit
  WHERE ticket_id = v_t AND action = 'workflow_resolve_close' AND to_state = 'closed';
  PERFORM spk6_note('Q6-reclose_closed_at',
    v1.closed_at IS NOT DISTINCT FROM v2.closed_at AND n = 1,
    'same=' || (v1.closed_at IS NOT DISTINCT FROM v2.closed_at)::text || ' n=' || n);
END $$;

-- closure-path audit bomb
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_rev uuid;
  a boolean; st text; n int;
BEGIN
  SELECT * INTO v_t, v_j, v_v, v_rev FROM spk6_issue('bomb');
  PERFORM set_config('app.b1_uid', spk6_uid('cust1')::text, false);
  PERFORM public.record_service_acknowledgment(v_rev, 'accepted', NULL, NULL);
  PERFORM set_config('app.b1_uid', spk6_uid('support')::text, false);
  PERFORM public.govern_ticket_transition(v_t, 'resolved', 'd', 'done', NULL);
  CREATE OR REPLACE FUNCTION public.spk6_bomb_closure_audit()
  RETURNS trigger LANGUAGE plpgsql AS $t$
  BEGIN
    IF NEW.action = 'workflow_resolve_close' AND NEW.to_state = 'closed' THEN
      RAISE EXCEPTION 'injected closure audit failure' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END; $t$;
  DROP TRIGGER IF EXISTS trg_spk6_bomb_closure ON public.service_workflow_audit;
  CREATE TRIGGER trg_spk6_bomb_closure
    BEFORE INSERT ON public.service_workflow_audit
    FOR EACH ROW EXECUTE FUNCTION public.spk6_bomb_closure_audit();
  a := spk6_denied(format(
    $q$SELECT public.govern_ticket_transition(%L::uuid,'closed','c','done',NULL)$q$, v_t));
  SELECT status INTO st FROM public.service_tickets WHERE id = v_t;
  SELECT count(*) INTO n FROM public.service_workflow_audit
  WHERE ticket_id = v_t AND action = 'workflow_resolve_close' AND to_state = 'closed';
  DROP TRIGGER IF EXISTS trg_spk6_bomb_closure ON public.service_workflow_audit;
  DROP FUNCTION IF EXISTS public.spk6_bomb_closure_audit();
  PERFORM spk6_note('Q6-closure_audit_bomb',
    a AND st = 'resolved' AND n = 0,
    'denied=' || a::text || ' st=' || st || ' n=' || n);
END $$;
