-- Spark independent B3 visit-execution battery (disposable only; never staging/prod).
-- Freeze under test: 9882a256 (B3 migration blob extracted at that SHA by runner).
-- Standalone: defines its own spk_* helpers; needs base + Slice0 + TKT s2 + B1 + B2 + SEC + B3.
CREATE TABLE IF NOT EXISTS public.spk_eval(check_id text PRIMARY KEY, status text NOT NULL, detail text);
TRUNCATE public.spk_eval;
CREATE OR REPLACE FUNCTION spk_note(p_id text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.spk_eval VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, left(p_detail, 400))
  ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
$$;
CREATE OR REPLACE FUNCTION spk_uid(n text) RETURNS uuid
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
CREATE OR REPLACE FUNCTION spk_as(n text) RETURNS void
LANGUAGE sql AS $$ SELECT set_config('app.b1_uid', spk_uid(n)::text, false); $$;
CREATE OR REPLACE FUNCTION spk_mkticket(p_owner text, p_num text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.service_tickets (ticket_number, user_id, title, description, type, priority, status)
  VALUES (p_num, spk_uid(p_owner), 't ' || p_num, 'spark b3 fixture', 'general', 'medium', 'open')
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
CREATE OR REPLACE FUNCTION spk_mkjob(p_ticket uuid, p_title text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_j uuid;
BEGIN
  PERFORM spk_as('support');
  SELECT id INTO v_j FROM public.create_service_job(p_ticket, p_title);
  RETURN v_j;
END $$;
CREATE OR REPLACE FUNCTION spk_waudit_n(p_ticket uuid) RETURNS int
LANGUAGE sql STABLE AS $$
  SELECT count(*)::int FROM public.service_workflow_audit WHERE ticket_id = p_ticket;
$$;
CREATE OR REPLACE FUNCTION spk_hist_n(p_visit uuid) RETURNS int
LANGUAGE sql STABLE AS $$
  SELECT count(*)::int FROM public.service_job_visit_schedule_history WHERE visit_id = p_visit;
$$;

CREATE OR REPLACE FUNCTION spk_att() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT public.b3_minimum_safety_attestation(); $$;
CREATE OR REPLACE FUNCTION spk_prep_ticket(p_ticket uuid) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE v_s text;
BEGIN
  PERFORM spk_as('support');
  SELECT status INTO v_s FROM public.service_tickets WHERE id = p_ticket;
  IF v_s = 'open' THEN
    PERFORM public.govern_ticket_transition(p_ticket, 'assigned', 'spk-prep', NULL);
  END IF;
END $$;

-- SPK-B01 schedule happy path (support): scheduled + attending=assignee + hist + audit.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_h int; v_a0 int; v_a1 int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B01');
  v_j := spk_mkjob(v_t, 'b01 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b01', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_a0 := spk_waudit_n(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b01', NULL);
  v_h := spk_hist_n(v_v.id); v_a1 := spk_waudit_n(v_t);
  PERFORM spk_note('SPK-B01', v_v.state = 'scheduled' AND v_v.visit_sequence = 1
    AND v_v.attending_technician_id = spk_uid('tech1') AND v_h = 1 AND v_a1 = v_a0 + 1,
    'st=' || v_v.state || ' seq=' || v_v.visit_sequence || ' hist=' || v_h || ' audit_d=' || (v_a1 - v_a0));
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B01', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B02 schedule invalid window (end <= start) denied 22023, no visit row.
DO $$
DECLARE v_t uuid; v_j uuid; v_ok boolean := false; v_n int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B02'); v_j := spk_mkjob(v_t, 'b02 job');
  PERFORM spk_as('support');
  BEGIN PERFORM public.schedule_service_job_visit(v_j, now() + interval '2h', now() + interval '1h', 'b02', NULL);
  EXCEPTION WHEN SQLSTATE '22023' THEN v_ok := true; END;
  SELECT count(*)::int INTO v_n FROM public.service_job_visits WHERE job_id = v_j;
  PERFORM spk_note('SPK-B02', v_ok AND v_n = 0, 'denied=' || v_ok || ' visits=' || v_n);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B02', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B03 schedule null window denied 22023.
DO $$
DECLARE v_t uuid; v_j uuid; v_ok boolean := false;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B03'); v_j := spk_mkjob(v_t, 'b03 job');
  PERFORM spk_as('support');
  BEGIN PERFORM public.schedule_service_job_visit(v_j, NULL, now() + interval '1h', 'b03', NULL);
  EXCEPTION WHEN SQLSTATE '22023' THEN v_ok := true; END;
  PERFORM spk_note('SPK-B03', v_ok, 'denied=' || v_ok);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B03', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B04/B05 schedule by tech/customer denied 42501, no rows.
DO $$
DECLARE v_t uuid; v_j uuid; v_ok boolean := true; v_n int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B04'); v_j := spk_mkjob(v_t, 'b04 job');
  PERFORM spk_as('tech1');
  BEGIN PERFORM public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'x', NULL); v_ok := false;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  PERFORM spk_as('cust1');
  BEGIN PERFORM public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'x', NULL); v_ok := false;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  SELECT count(*)::int INTO v_n FROM public.service_job_visits WHERE job_id = v_j;
  PERFORM spk_note('SPK-B04', v_ok AND v_n = 0, 'both_denied=' || v_ok || ' visits=' || v_n);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B04', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B06 reschedule happy: window updated, hist=2, audit+1.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_h int; v_a0 int; v_a1 int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B06'); v_j := spk_mkjob(v_t, 'b06 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b06', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b06', NULL);
  v_a0 := spk_waudit_n(v_t);
  v_v := public.reschedule_service_job_visit(v_v.id, now() + interval '3h', now() + interval '4h', 'b06-rs', NULL);
  v_h := spk_hist_n(v_v.id); v_a1 := spk_waudit_n(v_t);
  PERFORM spk_note('SPK-B06', v_h = 2 AND v_a1 = v_a0 + 1, 'hist=' || v_h || ' audit_d=' || (v_a1 - v_a0));
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B06', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B07 reschedule same window idempotent: no new history, no new audit.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_h int; v_a0 int; v_a1 int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B07'); v_j := spk_mkjob(v_t, 'b07 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b07', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b07', NULL);
  v_a0 := spk_waudit_n(v_t);
  v_v := public.reschedule_service_job_visit(v_v.id, v_v.scheduled_start, v_v.scheduled_end, 'idem', NULL);
  v_h := spk_hist_n(v_v.id); v_a1 := spk_waudit_n(v_t);
  PERFORM spk_note('SPK-B07', v_h = 1 AND v_a1 = v_a0, 'hist=' || v_h || ' audit_d=' || (v_a1 - v_a0));
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B07', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B08 reschedule of in_progress / terminal visit denied, window + history unchanged.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_ok boolean := true; v_h int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B08'); v_j := spk_mkjob(v_t, 'b08 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b08', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b08', NULL);
  PERFORM spk_as('tech1');
  v_v := public.start_service_job_visit(v_v.id, NULL, spk_att(), 'spk');
  PERFORM spk_as('support');
  BEGIN PERFORM public.reschedule_service_job_visit(v_v.id, now() + interval '5h', now() + interval '6h', 'x', NULL); v_ok := false;
  EXCEPTION WHEN check_violation THEN NULL; END;
  v_h := spk_hist_n(v_v.id);
  PERFORM spk_as('tech1');
  PERFORM public.complete_service_job_visit(v_v.id, NULL);
  PERFORM spk_as('support');
  BEGIN PERFORM public.reschedule_service_job_visit(v_v.id, now() + interval '5h', now() + interval '6h', 'x', NULL); v_ok := false;
  EXCEPTION WHEN check_violation THEN NULL; END;
  PERFORM spk_note('SPK-B08', v_ok AND v_h = 1, 'both_denied=' || v_ok || ' hist=' || v_h);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B08', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B10 start happy (assignee): in_progress + actual_start + attending + job in_progress.
-- D-B3-01: ticket assigned->in_progress atomically; audits = start_visit + first_visit_ticket (delta 2).
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_js text; v_ts text; v_a0 int; v_a1 int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B10'); v_j := spk_mkjob(v_t, 'b10 job');
  PERFORM spk_as('support');
  PERFORM public.govern_ticket_transition(v_t, 'assigned', 'b10', NULL);
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b10', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b10', NULL);
  v_a0 := spk_waudit_n(v_t);
  PERFORM spk_as('tech1');
  v_v := public.start_service_job_visit(v_v.id, NULL, spk_att(), 'spk');
  SELECT state INTO v_js FROM public.service_jobs WHERE id = v_j;
  SELECT status INTO v_ts FROM public.service_tickets WHERE id = v_t;
  v_a1 := spk_waudit_n(v_t);
  PERFORM spk_note('SPK-B10', v_v.state = 'in_progress' AND v_v.actual_start IS NOT NULL
    AND v_v.attending_technician_id = spk_uid('tech1') AND v_js = 'in_progress'
    AND v_ts = 'in_progress' AND v_a1 = v_a0 + 2,
    'visit=' || v_v.state || ' job=' || v_js || ' TICKET=' || v_ts || ' audit_d=' || (v_a1 - v_a0));
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B10', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B11 start by unrelated tech denied 42501, visit + audit unchanged.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_ok boolean := false; v_st text; v_a0 int; v_a1 int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B11'); v_j := spk_mkjob(v_t, 'b11 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b11', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b11', NULL);
  v_a0 := spk_waudit_n(v_t);
  PERFORM spk_as('tech2');
  BEGIN PERFORM public.start_service_job_visit(v_v.id, NULL, spk_att(), 'spk');
  EXCEPTION WHEN SQLSTATE '42501' THEN v_ok := true; END;
  SELECT state INTO v_st FROM public.service_job_visits WHERE id = v_v.id;
  v_a1 := spk_waudit_n(v_t);
  PERFORM spk_note('SPK-B11', v_ok AND v_st = 'scheduled' AND v_a1 = v_a0,
    'denied=' || v_ok || ' st=' || v_st || ' audit_d=' || (v_a1 - v_a0));
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B11', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B12 start by customer denied 42501.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_ok boolean := false;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B12'); v_j := spk_mkjob(v_t, 'b12 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b12', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b12', NULL);
  PERFORM spk_as('cust1');
  BEGIN PERFORM public.start_service_job_visit(v_v.id, NULL, spk_att(), 'spk');
  EXCEPTION WHEN SQLSTATE '42501' THEN v_ok := true; END;
  PERFORM spk_note('SPK-B12', v_ok, 'denied=' || v_ok);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B12', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B13 start on unassigned job denied (auth-first 42501: no assignee matches tech).
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_ok boolean := false; v_st text; v_a0 int; v_a1 int; v_n int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B13'); v_j := spk_mkjob(v_t, 'b13 job');
  PERFORM spk_as('support');
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b13', NULL);
  v_a0 := spk_waudit_n(v_t);
  PERFORM spk_as('tech1');
  BEGIN PERFORM public.start_service_job_visit(v_v.id, NULL, spk_att(), 'spk');
  EXCEPTION WHEN SQLSTATE '42501' THEN v_ok := true; END;
  SELECT state INTO v_st FROM public.service_job_visits WHERE id = v_v.id;
  SELECT count(*)::int INTO v_n FROM public.service_job_visit_safety_checks WHERE visit_id = v_v.id;
  v_a1 := spk_waudit_n(v_t);
  PERFORM spk_note('SPK-B13', v_ok AND v_st = 'scheduled' AND v_a1 = v_a0 AND v_n = 0,
    'denied42501=' || v_ok || ' audit_d=' || (v_a1 - v_a0) || ' safety_rows=' || v_n);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B13', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B14 second active start (sequential) denied; exactly one active visit.
DO $$
DECLARE v_t uuid; v_j uuid; v1 public.service_job_visits; v2 public.service_job_visits; v_ok boolean := false; v_n int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B14'); v_j := spk_mkjob(v_t, 'b14 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b14', NULL);
  PERFORM spk_prep_ticket(v_t);
  v1 := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b14a', NULL);
  v2 := public.schedule_service_job_visit(v_j, now() + interval '3h', now() + interval '4h', 'b14b', NULL);
  PERFORM spk_as('tech1');
  v1 := public.start_service_job_visit(v1.id, NULL, spk_att(), 'spk');
  BEGIN PERFORM public.start_service_job_visit(v2.id, NULL, spk_att(), 'spk');
  EXCEPTION WHEN check_violation THEN v_ok := true; END;
  SELECT count(*)::int INTO v_n FROM public.service_job_visits WHERE job_id = v_j AND state = 'in_progress';
  PERFORM spk_note('SPK-B14', v_ok AND v_n = 1, 'denied=' || v_ok || ' active=' || v_n);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B14', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B15 repeat start (same actor) idempotent: same row, no new audit.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_a0 int; v_a1 int; v_s1 timestamptz; v_s2 timestamptz;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B15'); v_j := spk_mkjob(v_t, 'b15 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b15', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b15', NULL);
  PERFORM spk_as('tech1');
  v_v := public.start_service_job_visit(v_v.id, NULL, spk_att(), 'spk'); v_s1 := v_v.actual_start;
  v_a0 := spk_waudit_n(v_t);
  v_v := public.start_service_job_visit(v_v.id, NULL, spk_att(), 'spk'); v_s2 := v_v.actual_start;
  v_a1 := spk_waudit_n(v_t);
  PERFORM spk_note('SPK-B15', v_v.state = 'in_progress' AND v_s1 = v_s2 AND v_a1 = v_a0,
    'st=' || v_v.state || ' audit_d=' || (v_a1 - v_a0));
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B15', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B16 complete happy: completed + actual_end, job NOT completed, ticket unresolved, audit+1.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_js text; v_ts text; v_a0 int; v_a1 int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B16'); v_j := spk_mkjob(v_t, 'b16 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b16', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b16', NULL);
  PERFORM spk_as('tech1');
  v_v := public.start_service_job_visit(v_v.id, NULL, spk_att(), 'spk');
  v_a0 := spk_waudit_n(v_t);
  v_v := public.complete_service_job_visit(v_v.id, NULL);
  SELECT state INTO v_js FROM public.service_jobs WHERE id = v_j;
  SELECT status INTO v_ts FROM public.service_tickets WHERE id = v_t;
  v_a1 := spk_waudit_n(v_t);
  PERFORM spk_note('SPK-B16', v_v.state = 'completed' AND v_v.actual_end IS NOT NULL
    AND v_js IS DISTINCT FROM 'completed' AND v_ts NOT IN ('resolved', 'closed') AND v_a1 = v_a0 + 1,
    'visit=' || v_v.state || ' job=' || v_js || ' ticket=' || v_ts || ' audit_d=' || (v_a1 - v_a0));
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B16', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B17 complete from scheduled denied check_violation (must start first).
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_ok boolean := false; v_st text;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B17'); v_j := spk_mkjob(v_t, 'b17 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b17', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b17', NULL);
  PERFORM spk_as('tech1');
  BEGIN PERFORM public.complete_service_job_visit(v_v.id, NULL);
  EXCEPTION WHEN check_violation THEN v_ok := true; END;
  SELECT state INTO v_st FROM public.service_job_visits WHERE id = v_v.id;
  PERFORM spk_note('SPK-B17', v_ok AND v_st = 'scheduled', 'denied=' || v_ok || ' st=' || v_st);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B17', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B18 repeat complete idempotent: no new audit.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_a0 int; v_a1 int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B18'); v_j := spk_mkjob(v_t, 'b18 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b18', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b18', NULL);
  PERFORM spk_as('tech1');
  v_v := public.start_service_job_visit(v_v.id, NULL, spk_att(), 'spk');
  v_v := public.complete_service_job_visit(v_v.id, NULL);
  v_a0 := spk_waudit_n(v_t);
  v_v := public.complete_service_job_visit(v_v.id, NULL);
  v_a1 := spk_waudit_n(v_t);
  PERFORM spk_note('SPK-B18', v_v.state = 'completed' AND v_a1 = v_a0, 'audit_d=' || (v_a1 - v_a0));
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B18', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B19 abort happy + return path: aborted with reason; history preserved; new visit schedulable+startable.
DO $$
DECLARE v_t uuid; v_j uuid; v1 public.service_job_visits; v2 public.service_job_visits;
  v_att uuid; v_h int; v_ok boolean := true;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B19'); v_j := spk_mkjob(v_t, 'b19 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b19', NULL);
  PERFORM spk_prep_ticket(v_t);
  v1 := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b19', NULL);
  PERFORM spk_as('tech1');
  v1 := public.start_service_job_visit(v1.id, NULL, spk_att(), 'spk');
  v1 := public.abort_service_job_visit(v1.id, 'unsafe machine', NULL);
  SELECT attending_technician_id INTO v_att FROM public.service_job_visits WHERE id = v1.id;
  v_h := spk_hist_n(v1.id);
  PERFORM spk_as('support');
  v2 := public.schedule_service_job_visit(v_j, now() + interval '5h', now() + interval '6h', 'b19-return', NULL);
  PERFORM spk_as('tech1');
  BEGIN v2 := public.start_service_job_visit(v2.id, NULL, spk_att(), 'spk');
  EXCEPTION WHEN OTHERS THEN v_ok := false; END;
  PERFORM spk_note('SPK-B19', v1.state = 'aborted' AND v1.outcome_reason = 'unsafe machine'
    AND v_att = spk_uid('tech1') AND v_h = 1 AND v2.visit_sequence = 2 AND v2.state = 'in_progress' AND v_ok,
    'v1=' || v1.state || ' seq2=' || v2.visit_sequence || '/' || v2.state || ' hist1=' || v_h);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B19', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B20 abort without reason (null + blank) denied 22023, visit unchanged.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_ok boolean := true; v_st text;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B20'); v_j := spk_mkjob(v_t, 'b20 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b20', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b20', NULL);
  PERFORM spk_as('tech1');
  v_v := public.start_service_job_visit(v_v.id, NULL, spk_att(), 'spk');
  BEGIN PERFORM public.abort_service_job_visit(v_v.id, NULL, NULL); v_ok := false;
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
  BEGIN PERFORM public.abort_service_job_visit(v_v.id, '   ', NULL); v_ok := false;
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
  SELECT state INTO v_st FROM public.service_job_visits WHERE id = v_v.id;
  PERFORM spk_note('SPK-B20', v_ok AND v_st = 'in_progress', 'both_denied=' || v_ok || ' st=' || v_st);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B20', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B21 no-access happy + new visit afterwards.
DO $$
DECLARE v_t uuid; v_j uuid; v1 public.service_job_visits; v2 public.service_job_visits; v_ok boolean := true;
  v_a0 int; v_a1 int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B21'); v_j := spk_mkjob(v_t, 'b21 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b21', NULL);
  PERFORM spk_prep_ticket(v_t);
  v1 := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b21', NULL);
  PERFORM spk_as('tech1');
  v1 := public.record_visit_no_access(v1.id, 'customer absent', NULL);
  -- Authorized idempotent retry without reason returns row, no new audit (F-B3-01).
  v_a0 := spk_waudit_n(v_t);
  BEGIN v1 := public.record_visit_no_access(v1.id, NULL, NULL);
  EXCEPTION WHEN OTHERS THEN v_ok := false; END;
  v_a1 := spk_waudit_n(v_t);
  v_ok := v_ok AND v_a1 = v_a0 AND v1.state = 'no_access';
  PERFORM spk_as('support');
  v2 := public.schedule_service_job_visit(v_j, now() + interval '5h', now() + interval '6h', 'b21-return', NULL);
  -- Missing reason on NON-terminal visit still denied 22023.
  BEGIN PERFORM public.record_visit_no_access(v2.id, NULL, NULL); v_ok := false;
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  PERFORM spk_as('tech1');
  BEGIN v2 := public.start_service_job_visit(v2.id, NULL, spk_att(), 'spk');
  EXCEPTION WHEN OTHERS THEN v_ok := false; END;
  PERFORM spk_note('SPK-B21', v1.state = 'no_access' AND v1.outcome_reason = 'customer absent'
    AND v2.visit_sequence = 2 AND v2.state = 'in_progress' AND v_ok,
    'v1=' || v1.state || ' seq2=' || v2.visit_sequence || '/' || v2.state);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B21', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B22 reassign during in_progress visit denied; assignee + visit + audit unchanged.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_ok boolean := false;
  v_ass uuid; v_st text; v_a0 int; v_a1 int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B22'); v_j := spk_mkjob(v_t, 'b22 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b22', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b22', NULL);
  PERFORM spk_as('tech1');
  v_v := public.start_service_job_visit(v_v.id, NULL, spk_att(), 'spk');
  v_a0 := spk_waudit_n(v_t);
  PERFORM spk_as('support');
  BEGIN PERFORM public.assign_service_job(v_j, spk_uid('tech2'), 'b22-x', NULL);
  EXCEPTION WHEN check_violation THEN v_ok := true; END;
  SELECT assigned_technician_id INTO v_ass FROM public.service_jobs WHERE id = v_j;
  SELECT state INTO v_st FROM public.service_job_visits WHERE id = v_v.id;
  v_a1 := spk_waudit_n(v_t);
  PERFORM spk_note('SPK-B22', v_ok AND v_ass = spk_uid('tech1') AND v_st = 'in_progress' AND v_a1 = v_a0,
    'denied=' || v_ok || ' audit_d=' || (v_a1 - v_a0));
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B22', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B23 reassign with scheduled visit: attending repointed + audit; former starts denied; new starts ok.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_att uuid; v_n int;
  v_old_denied boolean := false; v_new_ok boolean := true;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B23'); v_j := spk_mkjob(v_t, 'b23 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b23', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b23', NULL);
  PERFORM public.assign_service_job(v_j, spk_uid('tech2'), 'b23-re', NULL);
  PERFORM spk_prep_ticket(v_t);
  SELECT attending_technician_id INTO v_att FROM public.service_job_visits WHERE id = v_v.id;
  SELECT count(*)::int INTO v_n FROM public.service_workflow_audit
    WHERE ticket_id = v_t AND action = 'attendance_repointed';
  PERFORM spk_as('tech1');
  BEGIN PERFORM public.start_service_job_visit(v_v.id, NULL, spk_att(), 'spk');
  EXCEPTION WHEN SQLSTATE '42501' THEN v_old_denied := true; END;
  PERFORM spk_as('tech2');
  BEGIN v_v := public.start_service_job_visit(v_v.id, NULL, spk_att(), 'spk');
  EXCEPTION WHEN OTHERS THEN v_new_ok := false; END;
  PERFORM spk_note('SPK-B23', v_att = spk_uid('tech2') AND v_n = 1 AND v_old_denied AND v_new_ok
    AND v_v.state = 'in_progress', 'att_repointed=' || (v_att = spk_uid('tech2')) || ' repoint_audit=' || v_n);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B23', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B24 decline during in_progress denied.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_ok boolean := false; v_ass uuid;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B24'); v_j := spk_mkjob(v_t, 'b24 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b24', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b24', NULL);
  PERFORM spk_as('tech1');
  v_v := public.start_service_job_visit(v_v.id, NULL, spk_att(), 'spk');
  BEGIN PERFORM public.decline_service_job(v_j, 'b24-x', NULL);
  EXCEPTION WHEN check_violation THEN v_ok := true; END;
  SELECT assigned_technician_id INTO v_ass FROM public.service_jobs WHERE id = v_j;
  PERFORM spk_note('SPK-B24', v_ok AND v_ass = spk_uid('tech1'), 'denied=' || v_ok);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B24', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B25 decline with scheduled visit: attending NULL, job unassigned, start denied.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_att uuid; v_js text; v_ok boolean := false;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B25'); v_j := spk_mkjob(v_t, 'b25 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b25', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b25', NULL);
  PERFORM spk_as('tech1');
  PERFORM public.decline_service_job(v_j, 'b25-out', NULL);
  SELECT attending_technician_id INTO v_att FROM public.service_job_visits WHERE id = v_v.id;
  SELECT state INTO v_js FROM public.service_jobs WHERE id = v_j;
  BEGIN PERFORM public.start_service_job_visit(v_v.id, NULL, spk_att(), 'spk');
  EXCEPTION WHEN check_violation OR SQLSTATE '42501' THEN v_ok := true; END;
  PERFORM spk_note('SPK-B25', v_att IS NULL AND v_js = 'unassigned' AND v_ok,
    'att_null=' || (v_att IS NULL) || ' job=' || v_js || ' start_denied=' || v_ok);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B25', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B26 terminal attendance frozen across reassign; scheduled repointed.
DO $$
DECLARE v_t uuid; v_j uuid; v1 public.service_job_visits; v2 public.service_job_visits; v_a1 uuid; v_a2 uuid;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B26'); v_j := spk_mkjob(v_t, 'b26 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b26', NULL);
  PERFORM spk_prep_ticket(v_t);
  v1 := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b26a', NULL);
  v2 := public.schedule_service_job_visit(v_j, now() + interval '5h', now() + interval '6h', 'b26b', NULL);
  PERFORM spk_as('tech1');
  v1 := public.start_service_job_visit(v1.id, NULL, spk_att(), 'spk');
  v1 := public.abort_service_job_visit(v1.id, 'b26', NULL);
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech2'), 'b26-re', NULL);
  PERFORM spk_prep_ticket(v_t);
  SELECT attending_technician_id INTO v_a1 FROM public.service_job_visits WHERE id = v1.id;
  SELECT attending_technician_id INTO v_a2 FROM public.service_job_visits WHERE id = v2.id;
  PERFORM spk_note('SPK-B26', v_a1 = spk_uid('tech1') AND v_a2 = spk_uid('tech2'),
    'aborted_att_tech1=' || (v_a1 = spk_uid('tech1')) || ' sched_att_tech2=' || (v_a2 = spk_uid('tech2')));
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B26', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B27 direct client DML on visits + schedule history denied (42501), rows unchanged.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_ok boolean := true; v_n0 int; v_n1 int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B27'); v_j := spk_mkjob(v_t, 'b27 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b27', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b27', NULL);
  SELECT count(*)::int INTO v_n0 FROM public.service_job_visits WHERE job_id = v_j;
  PERFORM spk_as('tech1');
  SET ROLE authenticated;
  BEGIN INSERT INTO public.service_job_visits (job_id, visit_sequence, state) VALUES (v_j, 99, 'scheduled'); v_ok := false;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  BEGIN UPDATE public.service_job_visits SET state = 'completed' WHERE id = v_v.id; v_ok := false;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  BEGIN DELETE FROM public.service_job_visits WHERE id = v_v.id; v_ok := false;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  BEGIN INSERT INTO public.service_job_visit_schedule_history (visit_id, scheduled_start, scheduled_end)
    VALUES (v_v.id, now(), now() + interval '1h'); v_ok := false;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  BEGIN UPDATE public.service_job_visit_schedule_history SET rationale = 'x' WHERE visit_id = v_v.id; v_ok := false;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  BEGIN DELETE FROM public.service_job_visit_schedule_history WHERE visit_id = v_v.id; v_ok := false;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  RESET ROLE;
  SELECT count(*)::int INTO v_n1 FROM public.service_job_visits WHERE job_id = v_j;
  PERFORM spk_note('SPK-B27', v_ok AND v_n0 = v_n1 AND v_n0 = 1, 'all_denied=' || v_ok || ' rows=' || v_n1);
EXCEPTION WHEN OTHERS THEN BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM spk_note('SPK-B27', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B28 F-B3-01 matrix: denied callers get no payload on terminal idempotent
-- returns (complete/aborted/no_access), no writes, no audit delta. Callers:
-- owner(cust1)/unrelated customer/unrelated tech/sales/anon/forged.
-- Authorized attending-tech retry still returns the row with no new audit.
DO $$
DECLARE v_t uuid; v_j uuid; v_c uuid; v_a uuid; v_n uuid; v_bad int := 0;
  v_a0 int; v_a1 int; v_q text; v_fq text; c text;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B28'); v_j := spk_mkjob(v_t, 'b28 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b28', NULL);
  PERFORM spk_prep_ticket(v_t);
  SELECT id INTO v_c FROM public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b28c', NULL);
  SELECT id INTO v_a FROM public.schedule_service_job_visit(v_j, now() + interval '3h', now() + interval '4h', 'b28a', NULL);
  SELECT id INTO v_n FROM public.schedule_service_job_visit(v_j, now() + interval '5h', now() + interval '6h', 'b28n', NULL);
  PERFORM spk_as('tech1');
  PERFORM public.start_service_job_visit(v_c, NULL, spk_att(), 'spk');
  PERFORM public.complete_service_job_visit(v_c, NULL);
  PERFORM public.abort_service_job_visit(v_a, 'b28', NULL);
  PERFORM public.record_visit_no_access(v_n, 'b28', NULL);
  v_a0 := spk_waudit_n(v_t);
  FOR c IN SELECT unnest(ARRAY['cust1', 'cust2', 'tech2', 'sales']) LOOP
    PERFORM spk_as(c);
    FOR v_q IN SELECT unnest(ARRAY[
      format('SELECT public.complete_service_job_visit(%L, NULL)', v_c),
      format('SELECT public.abort_service_job_visit(%L, ''x'', NULL)', v_a),
      format('SELECT public.record_visit_no_access(%L, ''x'', NULL)', v_n)]) LOOP
      BEGIN EXECUTE v_q; v_bad := v_bad + 1;
      EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_bad := v_bad + 100; END;
    END LOOP;
  END LOOP;
  -- forged actor (tech1 GUC + admin uuid): impersonation denied on all three.
  PERFORM spk_as('tech1');
  FOR v_fq IN SELECT unnest(ARRAY[
    format('SELECT public.complete_service_job_visit(%L, %L)', v_c, spk_uid('admin')),
    format('SELECT public.abort_service_job_visit(%L, ''x'', %L)', v_a, spk_uid('admin')),
    format('SELECT public.record_visit_no_access(%L, ''x'', %L)', v_n, spk_uid('admin'))]) LOOP
    BEGIN EXECUTE v_fq; v_bad := v_bad + 1;
    EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_bad := v_bad + 100; END;
  END LOOP;
  -- anonymous: grant-level denial, no payload.
  PERFORM set_config('app.b1_uid', '', false);
  SET ROLE anon;
  FOR v_q IN SELECT unnest(ARRAY[
    format('SELECT public.complete_service_job_visit(%L, NULL)', v_c),
    format('SELECT public.abort_service_job_visit(%L, ''x'', NULL)', v_a),
    format('SELECT public.record_visit_no_access(%L, ''x'', NULL)', v_n)]) LOOP
    BEGIN EXECUTE v_q; v_bad := v_bad + 1;
    EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_bad := v_bad + 100; END;
  END LOOP;
  RESET ROLE;
  -- authorized attending-tech retries: rows returned, zero audit delta.
  PERFORM spk_as('tech1');
  BEGIN
    PERFORM public.complete_service_job_visit(v_c, NULL);
    PERFORM public.abort_service_job_visit(v_a, NULL, NULL);
    PERFORM public.record_visit_no_access(v_n, NULL, NULL);
  EXCEPTION WHEN OTHERS THEN v_bad := v_bad + 1000; END;
  v_a1 := spk_waudit_n(v_t);
  PERFORM spk_note('SPK-B28', v_bad = 0 AND v_a1 = v_a0,
    'bad=' || v_bad || ' audit_d=' || (v_a1 - v_a0));
EXCEPTION WHEN OTHERS THEN BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM spk_note('SPK-B28', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-B29 customer start on in_progress visit: must be denied (any code), recorded for error-code review.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_denied boolean := false; v_code text := '';
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-B29'); v_j := spk_mkjob(v_t, 'b29 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'b29', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'b29', NULL);
  PERFORM spk_as('tech1');
  v_v := public.start_service_job_visit(v_v.id, NULL, spk_att(), 'spk');
  PERFORM spk_as('cust1');
  BEGIN PERFORM public.start_service_job_visit(v_v.id, NULL, spk_att(), 'spk');
  EXCEPTION WHEN OTHERS THEN v_denied := true; v_code := SQLSTATE; END;
  PERFORM spk_note('SPK-B29', v_denied, 'denied=' || v_denied || ' code=' || v_code);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-B29', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-X00 anonymous EXECUTE revoked on all visit RPCs incl. safety (SET ROLE anon, no GUC).
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_ok boolean := true; r record;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-X00'); v_j := spk_mkjob(v_t, 'x00 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'x00', NULL);
  PERFORM spk_prep_ticket(v_t);
  SELECT id INTO v_v FROM public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'x00', NULL);
  PERFORM set_config('app.b1_uid', '', false);
  SET ROLE anon;
  FOR r IN SELECT 'schedule_service_job_visit' f, format('SELECT public.schedule_service_job_visit(%L, now(), now()+interval ''1h'')', v_j) q
    UNION ALL SELECT 'reschedule_service_job_visit', format('SELECT public.reschedule_service_job_visit(%L, now(), now()+interval ''1h'')', v_v)
    UNION ALL SELECT 'start_service_job_visit', format('SELECT public.start_service_job_visit(%L)', v_v)
    UNION ALL SELECT 'complete_service_job_visit', format('SELECT public.complete_service_job_visit(%L)', v_v)
    UNION ALL SELECT 'abort_service_job_visit', format('SELECT public.abort_service_job_visit(%L, ''x'')', v_v)
    UNION ALL SELECT 'record_visit_no_access', format('SELECT public.record_visit_no_access(%L, ''x'')', v_v)
    UNION ALL SELECT 'record_visit_safety_check', format('SELECT public.record_visit_safety_check(%L, ''failed'', ''x'')', v_v)
    UNION ALL SELECT 'b3_minimum_safety_attestation', 'SELECT public.b3_minimum_safety_attestation()'
  LOOP
    BEGIN EXECUTE r.q; v_ok := false;
    EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  END LOOP;
  RESET ROLE;
  PERFORM spk_note('SPK-X00', v_ok, 'all8_anon_denied=' || v_ok);
EXCEPTION WHEN OTHERS THEN BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM spk_note('SPK-X00', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-X01..X06 forged p_actor_id (tech1 GUC + admin uuid) denied 42501 on each RPC.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_admin uuid := spk_uid('admin'); v_bad int := 0;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-X01'); v_j := spk_mkjob(v_t, 'x01 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'x01', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'x01', NULL);
  PERFORM spk_as('tech1');
  BEGIN PERFORM public.schedule_service_job_visit(v_j, now(), now() + interval '1h', 'x', v_admin); v_bad := v_bad + 1;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_bad := v_bad + 100; END;
  BEGIN PERFORM public.reschedule_service_job_visit(v_v.id, now(), now() + interval '1h', 'x', v_admin); v_bad := v_bad + 1;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_bad := v_bad + 100; END;
  BEGIN PERFORM public.start_service_job_visit(v_v.id, v_admin, spk_att(), 'spk'); v_bad := v_bad + 1;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_bad := v_bad + 100; END;
  BEGIN PERFORM public.complete_service_job_visit(v_v.id, v_admin); v_bad := v_bad + 1;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_bad := v_bad + 100; END;
  BEGIN PERFORM public.abort_service_job_visit(v_v.id, 'x', v_admin); v_bad := v_bad + 1;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_bad := v_bad + 100; END;
  BEGIN PERFORM public.record_visit_no_access(v_v.id, 'x', v_admin); v_bad := v_bad + 1;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_bad := v_bad + 100; END;
  PERFORM spk_note('SPK-X01', v_bad = 0, 'forged_accepted_or_wrongcode=' || v_bad);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-X01', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-X02 no-GUC authenticated call (superuser, cleared GUC) denied 42501 Authentication required.
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_ok boolean := false; v_msg text := '';
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-X02'); v_j := spk_mkjob(v_t, 'x02 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'x02', NULL);
  PERFORM spk_prep_ticket(v_t);
  SELECT id INTO v_v FROM public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'x02', NULL);
  PERFORM set_config('app.b1_uid', '', false);
  BEGIN PERFORM public.start_service_job_visit(v_v, NULL, spk_att(), 'spk');
  EXCEPTION WHEN SQLSTATE '42501' THEN v_ok := true; v_msg := SQLERRM; END;
  PERFORM spk_note('SPK-X02', v_ok, 'denied=' || v_ok || ' msg=' || left(v_msg, 60));
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-X02', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-X03 service_role + valid p_actor_id delegation works; missing actor denied.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_ok boolean := true;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-X03'); v_j := spk_mkjob(v_t, 'x03 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'x03', NULL);
  PERFORM spk_prep_ticket(v_t);
  RESET ROLE; PERFORM set_config('app.b1_uid', '', false);
  SET ROLE service_role;
  BEGIN v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'x03-sr', spk_uid('support'));
  EXCEPTION WHEN OTHERS THEN v_ok := false; END;
  BEGIN PERFORM public.schedule_service_job_visit(v_j, now(), now() + interval '1h', 'x', NULL); v_ok := false;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  RESET ROLE;
  PERFORM spk_note('SPK-X03', v_ok AND v_v.state = 'scheduled', 'deleg_ok=' || v_ok || ' st=' || v_v.state);
EXCEPTION WHEN OTHERS THEN BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM spk_note('SPK-X03', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-G01 premature-closure prevention: all visits completed -> job still not completed, ticket open.
DO $$
DECLARE v_t uuid; v_j uuid; v1 public.service_job_visits; v2 public.service_job_visits; v_js text; v_ts text;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-G01'); v_j := spk_mkjob(v_t, 'g01 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'g01', NULL);
  PERFORM spk_prep_ticket(v_t);
  v1 := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'g01a', NULL);
  v2 := public.schedule_service_job_visit(v_j, now() + interval '5h', now() + interval '6h', 'g01b', NULL);
  PERFORM spk_as('tech1');
  v1 := public.start_service_job_visit(v1.id, NULL, spk_att(), 'spk');
  v1 := public.complete_service_job_visit(v1.id, NULL);
  v2 := public.start_service_job_visit(v2.id, NULL, spk_att(), 'spk');
  v2 := public.complete_service_job_visit(v2.id, NULL);
  SELECT state INTO v_js FROM public.service_jobs WHERE id = v_j;
  SELECT status INTO v_ts FROM public.service_tickets WHERE id = v_t;
  PERFORM spk_note('SPK-G01', v1.state = 'completed' AND v2.state = 'completed'
    AND v_js IS DISTINCT FROM 'completed' AND v_ts NOT IN ('resolved', 'closed'),
    'visits=' || v1.state || '/' || v2.state || ' job=' || v_js || ' ticket=' || v_ts);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-G01', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-F01 B1 facade create_service_job_visit still schedules with history + audit.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_h int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-F01'); v_j := spk_mkjob(v_t, 'f01 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'f01', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.create_service_job_visit(v_j, 'f01', NULL);
  v_h := spk_hist_n(v_v.id);
  PERFORM spk_note('SPK-F01', v_v.state = 'scheduled' AND v_h = 1 AND v_v.scheduled_start IS NOT NULL,
    'st=' || v_v.state || ' hist=' || v_h);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-F01', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-F02 facade without safety evidence denied 22023 (no implicit attestation);
-- with prior explicit passed check the facade walk works; illegal jump still denied.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_ok boolean := true;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-F02'); v_j := spk_mkjob(v_t, 'f02 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'f02', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.create_service_job_visit(v_j, 'f02', NULL);
  PERFORM spk_as('tech1');
  BEGIN v_v := public.govern_visit_transition(v_v.id, 'in_progress', NULL, NULL); v_ok := false;
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  PERFORM public.record_visit_safety_check(v_v.id, 'passed', 'f02-ack', NULL, spk_att());
  BEGIN v_v := public.govern_visit_transition(v_v.id, 'in_progress', NULL, NULL);
  EXCEPTION WHEN OTHERS THEN v_ok := false; END;
  BEGIN v_v := public.govern_visit_transition(v_v.id, 'aborted', 'f02-x', NULL);
  EXCEPTION WHEN OTHERS THEN v_ok := false; END;
  BEGIN v_v := public.govern_visit_transition(v_v.id, 'scheduled', NULL, NULL); v_ok := false;
  EXCEPTION WHEN check_violation THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  PERFORM spk_note('SPK-F02', v_ok AND v_v.state = 'aborted', 'path_ok=' || v_ok || ' final=' || v_v.state);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-F02', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-D01 first authorized start advances ticket/job/visit atomically with audits;
-- parent clocks untouched.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_ts text; v_js text;
  v_n1 int; v_n2 int; v_g int; v_asg timestamptz; v_asg2 timestamptz;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-D01'); v_j := spk_mkjob(v_t, 'd01 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'd01', NULL);
  PERFORM spk_prep_ticket(v_t);
  UPDATE public.service_tickets SET assigned_at = now() - interval '1h' WHERE id = v_t;
  SELECT assigned_at INTO v_asg FROM public.service_tickets WHERE id = v_t;
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'd01', NULL);
  PERFORM spk_as('tech1');
  v_v := public.start_service_job_visit(v_v.id, NULL, spk_att(), 'spk');
  SELECT status, assigned_at INTO v_ts, v_asg2 FROM public.service_tickets WHERE id = v_t;
  SELECT state INTO v_js FROM public.service_jobs WHERE id = v_j;
  SELECT count(*)::int INTO v_n1 FROM public.service_workflow_audit
    WHERE ticket_id = v_t AND action = 'start_visit';
  SELECT count(*)::int INTO v_n2 FROM public.service_workflow_audit
    WHERE ticket_id = v_t AND action = 'first_visit_ticket_in_progress';
  SELECT count(*)::int INTO v_g FROM public.ticket_governance_audit
    WHERE ticket_id = v_t AND action = 'status_transition' AND to_status = 'in_progress';
  PERFORM spk_note('SPK-D01', v_v.state = 'in_progress' AND v_js = 'in_progress'
    AND v_ts = 'in_progress' AND v_n1 = 1 AND v_n2 = 1 AND v_g >= 1 AND v_asg2 IS NOT DISTINCT FROM v_asg,
    'ticket=' || v_ts || ' start_a=' || v_n1 || ' first_a=' || v_n2 || ' gov_a=' || v_g
    || ' clock_same=' || (v_asg2 IS NOT DISTINCT FROM v_asg));
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-D01', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-D02 later starts never re-transition ticket nor reset clocks; single first-visit audit.
DO $$
DECLARE v_t uuid; v_j uuid; v1 public.service_job_visits; v2 public.service_job_visits;
  v_n int; v_asg timestamptz; v_asg2 timestamptz; v_ts text;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-D02'); v_j := spk_mkjob(v_t, 'd02 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'd02', NULL);
  PERFORM spk_prep_ticket(v_t);
  v1 := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'd02a', NULL);
  v2 := public.schedule_service_job_visit(v_j, now() + interval '5h', now() + interval '6h', 'd02b', NULL);
  PERFORM spk_as('tech1');
  v1 := public.start_service_job_visit(v1.id, NULL, spk_att(), 'spk');
  v1 := public.complete_service_job_visit(v1.id, NULL);
  UPDATE public.service_tickets SET assigned_at = now() - interval '1h' WHERE id = v_t;
  SELECT assigned_at INTO v_asg FROM public.service_tickets WHERE id = v_t;
  v2 := public.start_service_job_visit(v2.id, NULL, spk_att(), 'spk');
  SELECT count(*)::int INTO v_n FROM public.service_workflow_audit
    WHERE ticket_id = v_t AND action = 'first_visit_ticket_in_progress';
  SELECT status, assigned_at INTO v_ts, v_asg2 FROM public.service_tickets WHERE id = v_t;
  PERFORM spk_note('SPK-D02', v2.state = 'in_progress' AND v_ts = 'in_progress'
    AND v_n = 1 AND v_asg2 IS NOT DISTINCT FROM v_asg,
    'first_audits=' || v_n || ' clock_same=' || (v_asg2 IS NOT DISTINCT FROM v_asg));
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-D02', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-D03 incompatible parent states: open/resolved/cancelled tickets deny first start.
DO $$
DECLARE v_o uuid; v_r uuid; v_x uuid; v_jo uuid; v_jr uuid; v_jx uuid;
  v_vo uuid; v_vr uuid; v_vx uuid; v_ok boolean := true;
BEGIN
  v_o := spk_mkticket('cust1', 'SPK-D03O'); v_jo := spk_mkjob(v_o, 'd03o');
  v_r := spk_mkticket('cust1', 'SPK-D03R'); v_jr := spk_mkjob(v_r, 'd03r');
  v_x := spk_mkticket('cust1', 'SPK-D03X'); v_jx := spk_mkjob(v_x, 'd03x');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_jo, spk_uid('tech1'), 'd03o', NULL);
  PERFORM public.assign_service_job(v_jr, spk_uid('tech1'), 'd03r', NULL);
  PERFORM public.assign_service_job(v_jx, spk_uid('tech1'), 'd03x', NULL);
  -- Fixture-only direct parent states (owner bypass); the start-preflight denial is the assertion.
  UPDATE public.service_tickets SET status = 'resolved', updated_at = now() WHERE id = v_r;
  UPDATE public.service_tickets SET status = 'cancelled', updated_at = now() WHERE id = v_x;
  SELECT id INTO v_vo FROM public.schedule_service_job_visit(v_jo, now() + interval '1h', now() + interval '2h', 'd03o', NULL);
  SELECT id INTO v_vr FROM public.schedule_service_job_visit(v_jr, now() + interval '1h', now() + interval '2h', 'd03r', NULL);
  SELECT id INTO v_vx FROM public.schedule_service_job_visit(v_jx, now() + interval '1h', now() + interval '2h', 'd03x', NULL);
  PERFORM spk_as('tech1');
  BEGIN PERFORM public.start_service_job_visit(v_vo, NULL, spk_att(), 'spk'); v_ok := false;
  EXCEPTION WHEN check_violation THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  BEGIN PERFORM public.start_service_job_visit(v_vr, NULL, spk_att(), 'spk'); v_ok := false;
  EXCEPTION WHEN check_violation THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  BEGIN PERFORM public.start_service_job_visit(v_vx, NULL, spk_att(), 'spk'); v_ok := false;
  EXCEPTION WHEN check_violation THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  PERFORM spk_note('SPK-D03', v_ok, 'open+resolved+cancelled_all_denied=' || v_ok);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-D03', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-D04 return-visit flow after resolve: X1-governed ticket back to in_progress permits start.
DO $$
DECLARE v_t uuid; v_j uuid; v1 public.service_job_visits; v2 public.service_job_visits; v_ok boolean := true;
  v_ts text;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-D04'); v_j := spk_mkjob(v_t, 'd04 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'd04', NULL);
  PERFORM spk_prep_ticket(v_t);
  v1 := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'd04a', NULL);
  PERFORM spk_as('tech1');
  v1 := public.start_service_job_visit(v1.id, NULL, spk_att(), 'spk');
  v1 := public.complete_service_job_visit(v1.id, NULL);
  PERFORM spk_as('support');
  -- Fixture-only direct resolve (owner bypass); add-back below stays governed.
  UPDATE public.service_tickets SET status = 'resolved', updated_at = now() WHERE id = v_t;
  v2 := public.schedule_service_job_visit(v_j, now() + interval '5h', now() + interval '6h', 'd04b', NULL);
  PERFORM spk_as('tech1');
  BEGIN PERFORM public.start_service_job_visit(v2.id, NULL, spk_att(), 'spk'); v_ok := false;
  EXCEPTION WHEN check_violation THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  PERFORM spk_as('support');
  PERFORM public.create_service_job(v_t, 'd04-addback');
  SELECT status INTO v_ts FROM public.service_tickets WHERE id = v_t;
  PERFORM spk_as('tech1');
  BEGIN v2 := public.start_service_job_visit(v2.id, NULL, spk_att(), 'spk');
  EXCEPTION WHEN OTHERS THEN v_ok := false; END;
  PERFORM spk_note('SPK-D04', v_ok AND v2.state = 'in_progress' AND v_ts = 'in_progress',
    'resolved_denied_then_addback_ok=' || v_ok || ' ticket=' || v_ts);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-D04', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-S01 safety gate: missing/wrong attestation denied 22023; no visit mutation, no audit.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_ok boolean := true; v_st text; v_a0 int; v_a1 int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-S01'); v_j := spk_mkjob(v_t, 's01 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 's01', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 's01', NULL);
  v_a0 := spk_waudit_n(v_t);
  PERFORM spk_as('tech1');
  BEGIN PERFORM public.start_service_job_visit(v_v.id, NULL, NULL, 'spk'); v_ok := false;
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  BEGIN PERFORM public.start_service_job_visit(v_v.id, NULL, 'I confirm safety', 'spk'); v_ok := false;
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  SELECT state INTO v_st FROM public.service_job_visits WHERE id = v_v.id;
  v_a1 := spk_waudit_n(v_t);
  PERFORM spk_note('SPK-S01', v_ok AND v_st = 'scheduled' AND v_a1 = v_a0,
    'both_denied=' || v_ok || ' st=' || v_st || ' audit_d=' || (v_a1 - v_a0));
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-S01', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-S02 failed standalone check blocks no-evidence start; new passed check re-arms.
-- Split across DO blocks (= separate transactions, like real RPC calls).
CREATE TEMP TABLE IF NOT EXISTS spk_s02_stage(t uuid, j uuid, v uuid);
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-S02'); v_j := spk_mkjob(v_t, 's02 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 's02', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 's02', NULL);
  DELETE FROM spk_s02_stage;
  INSERT INTO spk_s02_stage VALUES (v_t, v_j, v_v.id);
  PERFORM spk_as('tech1');
  PERFORM public.record_visit_safety_check(v_v.id, 'failed', 'guard missing', NULL, NULL);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-S02', false, 'setup: ' || SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;
DO $$
DECLARE v_v uuid; v_ok boolean := true;
BEGIN
  SELECT s.v INTO v_v FROM spk_s02_stage s LIMIT 1;
  PERFORM spk_as('tech1');
  BEGIN PERFORM public.start_service_job_visit(v_v, NULL, NULL, 'spk'); v_ok := false;
  EXCEPTION WHEN check_violation THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  PERFORM pg_sleep(0.05);
  BEGIN PERFORM public.record_visit_safety_check(v_v, 'passed', 'guard refitted', NULL, spk_att());
  EXCEPTION WHEN OTHERS THEN v_ok := false; END;
  IF NOT v_ok THEN PERFORM spk_note('SPK-S02', false, 'deny-or-rearm failed'); END IF;
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-S02', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;
DO $$
DECLARE v_v uuid; v_t uuid; v_ok boolean := true; v_n int; v_res text; v_st text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.spk_eval WHERE check_id = 'SPK-S02' AND status = 'FAIL') THEN RETURN; END IF;
  SELECT s.v, s.t INTO v_v, v_t FROM spk_s02_stage s LIMIT 1;
  PERFORM spk_as('tech1');
  BEGIN PERFORM public.start_service_job_visit(v_v, NULL, spk_att(), 'spk');
  EXCEPTION WHEN OTHERS THEN v_ok := false; END;
  SELECT state INTO v_st FROM public.service_job_visits WHERE id = v_v;
  SELECT count(*)::int INTO v_n FROM public.service_job_visit_safety_checks WHERE visit_id = v_v;
  SELECT v_ok AND bool_and(attested_by = spk_uid('tech1')) AND count(*)::int = 3 INTO v_ok
    FROM public.service_job_visit_safety_checks WHERE visit_id = v_v;
  SELECT result INTO v_res FROM public.service_job_visit_safety_checks
    WHERE visit_id = v_v ORDER BY attested_at DESC LIMIT 1;
  PERFORM spk_note('SPK-S02', v_ok AND v_st = 'in_progress' AND v_res = 'passed',
    'blocked_then_started=' || v_ok || ' rows=' || v_n || ' latest=' || v_res);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-S02', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-S03 safety RPC auth: unrelated tech/customer/sales denied; passed needs exact text.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_ok boolean := true; v_n0 int; v_n1 int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-S03'); v_j := spk_mkjob(v_t, 's03 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 's03', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 's03', NULL);
  SELECT count(*)::int INTO v_n0 FROM public.service_job_visit_safety_checks WHERE visit_id = v_v.id;
  PERFORM spk_as('tech2');
  BEGIN PERFORM public.record_visit_safety_check(v_v.id, 'failed', 'x', NULL, NULL); v_ok := false;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  PERFORM spk_as('cust1');
  BEGIN PERFORM public.record_visit_safety_check(v_v.id, 'failed', 'x', NULL, NULL); v_ok := false;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  PERFORM spk_as('sales');
  BEGIN PERFORM public.record_visit_safety_check(v_v.id, 'failed', 'x', NULL, NULL); v_ok := false;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  PERFORM spk_as('tech1');
  BEGIN PERFORM public.record_visit_safety_check(v_v.id, 'passed', 'x', NULL, 'wrong text'); v_ok := false;
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  BEGIN PERFORM public.record_visit_safety_check(v_v.id, 'maybe', 'x', NULL, NULL); v_ok := false;
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  SELECT count(*)::int INTO v_n1 FROM public.service_job_visit_safety_checks WHERE visit_id = v_v.id;
  PERFORM spk_note('SPK-S03', v_ok AND v_n0 = 0 AND v_n1 = 0, 'all_denied=' || v_ok || ' rows=' || v_n1);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-S03', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-S04 abort/no-access need no safety success and record none.
DO $$
DECLARE v_t uuid; v_j uuid; v1 public.service_job_visits; v2 public.service_job_visits; v_n int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-S04'); v_j := spk_mkjob(v_t, 's04 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 's04', NULL);
  PERFORM spk_prep_ticket(v_t);
  v1 := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 's04a', NULL);
  v2 := public.schedule_service_job_visit(v_j, now() + interval '5h', now() + interval '6h', 's04b', NULL);
  PERFORM spk_as('tech1');
  v1 := public.abort_service_job_visit(v1.id, 'unsafe to proceed', NULL);
  v2 := public.record_visit_no_access(v2.id, 'site locked', NULL);
  SELECT count(*)::int INTO v_n FROM public.service_job_visit_safety_checks
    WHERE visit_id IN (v1.id, v2.id) AND result = 'passed';
  PERFORM spk_note('SPK-S04', v1.state = 'aborted' AND v2.state = 'no_access' AND v_n = 0,
    'states=' || v1.state || '/' || v2.state || ' passed_rows=' || v_n);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-S04', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-X04 forged actor + service-role delegation on record_visit_safety_check.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_ok boolean := true;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-X04'); v_j := spk_mkjob(v_t, 'x04 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'x04', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'x04', NULL);
  PERFORM spk_as('tech1');
  BEGIN PERFORM public.record_visit_safety_check(v_v.id, 'failed', 'x', spk_uid('admin'), NULL); v_ok := false;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  RESET ROLE; PERFORM set_config('app.b1_uid', '', false);
  SET ROLE service_role;
  BEGIN PERFORM public.record_visit_safety_check(v_v.id, 'failed', 'sr', spk_uid('support'), NULL);
  EXCEPTION WHEN OTHERS THEN v_ok := false; END;
  RESET ROLE;
  PERFORM spk_note('SPK-X04', v_ok, 'forged_denied_deleg_ok=' || v_ok);
EXCEPTION WHEN OTHERS THEN BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM spk_note('SPK-X04', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-S05 F-B3-02 policy: support cannot record a passed acknowledgment for the
-- attending technician (42501 at record time); tech NULL-start then has no
-- evidence (22023); tech's own explicit confirmation succeeds.
DO $$
DECLARE v_t uuid; v_j uuid; v1 public.service_job_visits; v_ok boolean := true; v_n int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-S05'); v_j := spk_mkjob(v_t, 's05 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 's05', NULL);
  PERFORM spk_prep_ticket(v_t);
  v1 := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 's05a', NULL);
  BEGIN PERFORM public.record_visit_safety_check(v1.id, 'passed', 's05-ack', NULL, spk_att()); v_ok := false;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  SELECT count(*)::int INTO v_n FROM public.service_job_visit_safety_checks WHERE visit_id = v1.id;
  PERFORM spk_as('tech1');
  BEGIN PERFORM public.start_service_job_visit(v1.id, NULL, NULL, 'spk'); v_ok := false;
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  BEGIN v1 := public.start_service_job_visit(v1.id, NULL, spk_att(), 'spk');
  EXCEPTION WHEN OTHERS THEN v_ok := false; END;
  PERFORM spk_note('SPK-S05', v_ok AND v1.state = 'in_progress' AND v_n = 0,
    'support_substitute_denied=' || v_ok || ' rows=' || v_n);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-S05', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-S10 support on-behalf start needs the TECH's personal ack; support's own
-- explicit attestation at start is rejected as substitution (42501, no row).
DO $$
DECLARE v_t uuid; v_j uuid; v1 public.service_job_visits; v_ok boolean := true; v_n int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-S10'); v_j := spk_mkjob(v_t, 's10 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 's10', NULL);
  PERFORM spk_prep_ticket(v_t);
  v1 := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 's10a', NULL);
  BEGIN PERFORM public.start_service_job_visit(v1.id, NULL, spk_att(), 'spk'); v_ok := false;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  SELECT count(*)::int INTO v_n FROM public.service_job_visit_safety_checks WHERE visit_id = v1.id;
  PERFORM spk_as('tech1');
  PERFORM public.record_visit_safety_check(v1.id, 'passed', 's10-ack', NULL, spk_att());
  PERFORM spk_as('support');
  BEGIN v1 := public.start_service_job_visit(v1.id, NULL, NULL, 'spk');
  EXCEPTION WHEN OTHERS THEN v_ok := false; END;
  PERFORM spk_note('SPK-S10', v_ok AND v1.state = 'in_progress'
    AND v1.attending_technician_id = spk_uid('tech1') AND v_n = 0,
    'onbehalf_needs_tech_ack=' || v_ok);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-S10', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-S09 same tech/visit/assignment: valid prior acknowledgment authorizes NULL start.
-- No new safety row on the prior-pass path; audit records the safety source.
DO $$
DECLARE v_t uuid; v_j uuid; v1 public.service_job_visits; v_ok boolean := true;
  v_n0 int; v_n1 int; v_src text;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-S09'); v_j := spk_mkjob(v_t, 's09 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 's09', NULL);
  PERFORM spk_prep_ticket(v_t);
  v1 := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 's09a', NULL);
  PERFORM spk_as('tech1');
  PERFORM public.record_visit_safety_check(v1.id, 'passed', 's09-ack', NULL, spk_att());
  SELECT count(*)::int INTO v_n0 FROM public.service_job_visit_safety_checks WHERE visit_id = v1.id;
  BEGIN v1 := public.start_service_job_visit(v1.id, NULL, NULL, 'spk');
  EXCEPTION WHEN OTHERS THEN v_ok := false; END;
  SELECT count(*)::int INTO v_n1 FROM public.service_job_visit_safety_checks WHERE visit_id = v1.id;
  SELECT details->>'safety_source' INTO v_src FROM public.service_workflow_audit
    WHERE ticket_id = v_t AND action = 'start_visit' ORDER BY created_at DESC LIMIT 1;
  PERFORM spk_note('SPK-S09', v_ok AND v1.state = 'in_progress' AND v_n0 = 1 AND v_n1 = 1
    AND v_src = 'prior_explicit_passed',
    'same_author_ok=' || v_ok || ' rows=' || v_n0 || '->' || v_n1 || ' src=' || v_src);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-S09', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-S11 round trip tech1->tech2->tech1: original acknowledgment stays invalid
-- (generation binding, not just author match); fresh acknowledgment re-arms.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_ok boolean := true;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-S11'); v_j := spk_mkjob(v_t, 's11 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 's11', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 's11', NULL);
  PERFORM spk_as('tech1');
  PERFORM public.record_visit_safety_check(v_v.id, 'passed', 's11-ack1', NULL, spk_att());
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech2'), 's11-away', NULL);
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 's11-back', NULL);
  PERFORM spk_as('tech1');
  BEGIN PERFORM public.start_service_job_visit(v_v.id, NULL, NULL, 'spk'); v_ok := false;
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  PERFORM public.record_visit_safety_check(v_v.id, 'passed', 's11-ack2', NULL, spk_att());
  BEGIN v_v := public.start_service_job_visit(v_v.id, NULL, NULL, 'spk');
  EXCEPTION WHEN OTHERS THEN v_ok := false; END;
  PERFORM spk_note('SPK-S11', v_ok AND v_v.state = 'in_progress',
    'roundtrip_invalidates_reack_ok=' || v_ok);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-S11', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-S06 ordinal tie-break: equal attested_at cannot hide a failed check.
-- Direct owner INSERTs pin identical timestamps; higher ordinal wins deterministically.
DO $$
DECLARE v_t uuid; v_j uuid; v1 uuid; v2 uuid; v_ok boolean := true; v_ts timestamptz;
  v_o1 bigint; v_o2 bigint; v_gen bigint;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-S06'); v_j := spk_mkjob(v_t, 's06 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 's06', NULL);
  PERFORM spk_prep_ticket(v_t);
  SELECT id INTO v1 FROM public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 's06a', NULL);
  SELECT id INTO v2 FROM public.schedule_service_job_visit(v_j, now() + interval '5h', now() + interval '6h', 's06b', NULL);
  SELECT assignment_generation INTO v_gen FROM public.service_jobs WHERE id = v_j;
  v_ts := date_trunc('second', now());
  -- Visit 1: passed then failed at the SAME timestamp -> latest must be failed.
  INSERT INTO public.service_job_visit_safety_checks (visit_id, result, attested_by, attestation, attested_at, assignment_generation, for_technician_id)
    VALUES (v1, 'passed', spk_uid('tech1'), spk_att(), v_ts, v_gen, spk_uid('tech1')) RETURNING ordinal INTO v_o1;
  INSERT INTO public.service_job_visit_safety_checks (visit_id, result, attested_by, attestation, attested_at, assignment_generation, for_technician_id)
    VALUES (v1, 'failed', spk_uid('tech1'), 'tie-fail', v_ts, v_gen, spk_uid('tech1')) RETURNING ordinal INTO v_o2;
  v_ok := v_ok AND v_o2 > v_o1;
  PERFORM spk_as('tech1');
  BEGIN PERFORM public.start_service_job_visit(v1, NULL, NULL, 'spk'); v_ok := false;
  EXCEPTION WHEN check_violation THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  -- Visit 2: failed then passed at the SAME timestamp -> latest must be passed.
  INSERT INTO public.service_job_visit_safety_checks (visit_id, result, attested_by, attestation, attested_at, assignment_generation, for_technician_id)
    VALUES (v2, 'failed', spk_uid('tech1'), 'tie-fail', v_ts, v_gen, spk_uid('tech1'));
  INSERT INTO public.service_job_visit_safety_checks (visit_id, result, attested_by, attestation, attested_at, assignment_generation, for_technician_id)
    VALUES (v2, 'passed', spk_uid('tech1'), spk_att(), v_ts, v_gen, spk_uid('tech1'));
  BEGIN PERFORM public.start_service_job_visit(v2, NULL, NULL, 'spk');
  EXCEPTION WHEN OTHERS THEN v_ok := false; END;
  PERFORM spk_note('SPK-S06', v_ok AND (SELECT state FROM public.service_job_visits WHERE id = v2) = 'in_progress'
    AND (SELECT state FROM public.service_job_visits WHERE id = v1) = 'scheduled',
    'tie_orders=' || v_ok || ' ord=' || v_o1 || '<' || v_o2);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-S06', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-X05 adversarial anon re-grant: EXECUTE re-granted to anon, in-function auth
-- must still deny every B3 RPC. Grants restored afterwards and re-verified.
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_bad int := 0; r record; v_leak boolean := false;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-X05'); v_j := spk_mkjob(v_t, 'x05 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'x05', NULL);
  PERFORM spk_prep_ticket(v_t);
  SELECT id INTO v_v FROM public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'x05', NULL);
  FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('schedule_service_job_visit', 'reschedule_service_job_visit',
      'start_service_job_visit', 'complete_service_job_visit', 'abort_service_job_visit',
      'record_visit_no_access', 'record_visit_safety_check', 'b3_minimum_safety_attestation',
      'create_service_job_visit', 'govern_visit_transition') LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', r.oid::regprocedure);
  END LOOP;
  -- Hosted-faithful anon: no uid + JWT claims role=anon (PostgREST always sets these).
  PERFORM set_config('app.b1_uid', '', false);
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', false);
  SET ROLE anon;
  FOR r IN SELECT format('SELECT public.schedule_service_job_visit(%L, now(), now()+interval ''1h'')', v_j) q
    UNION ALL SELECT format('SELECT public.reschedule_service_job_visit(%L, now(), now()+interval ''1h'')', v_v)
    UNION ALL SELECT format('SELECT public.start_service_job_visit(%L, NULL, NULL, NULL)', v_v)
    UNION ALL SELECT format('SELECT public.complete_service_job_visit(%L)', v_v)
    UNION ALL SELECT format('SELECT public.abort_service_job_visit(%L, ''x'')', v_v)
    UNION ALL SELECT format('SELECT public.record_visit_no_access(%L, ''x'')', v_v)
    UNION ALL SELECT format('SELECT public.record_visit_safety_check(%L, ''failed'', ''x'')', v_v)
    UNION ALL SELECT format('SELECT public.create_service_job_visit(%L)', v_j)
    UNION ALL SELECT format('SELECT public.govern_visit_transition(%L, ''aborted'', ''x'')', v_v)
  LOOP
    BEGIN EXECUTE r.q; v_bad := v_bad + 1;
    EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_bad := v_bad + 100; END;
  END LOOP;
  -- forged actor under anon EXECUTE: still denied, never trusted.
  BEGIN EXECUTE format('SELECT public.start_service_job_visit(%L, %L, NULL, NULL)', v_v, spk_uid('admin'));
    v_bad := v_bad + 1;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_bad := v_bad + 100; END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('schedule_service_job_visit', 'reschedule_service_job_visit',
      'start_service_job_visit', 'complete_service_job_visit', 'abort_service_job_visit',
      'record_visit_no_access', 'record_visit_safety_check', 'b3_minimum_safety_attestation',
      'create_service_job_visit', 'govern_visit_transition') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.oid::regprocedure);
  END LOOP;
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('schedule_service_job_visit', 'reschedule_service_job_visit',
      'start_service_job_visit', 'complete_service_job_visit', 'abort_service_job_visit',
      'record_visit_no_access', 'record_visit_safety_check', 'b3_minimum_safety_attestation',
      'create_service_job_visit', 'govern_visit_transition')
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  ) INTO v_leak;
  PERFORM spk_note('SPK-X05', v_bad = 0 AND NOT v_leak, 'bad=' || v_bad || ' grant_restored=' || (NOT v_leak));
EXCEPTION WHEN OTHERS THEN BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM spk_note('SPK-X05', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-S07 prior pass invalidated by relevant reassignment: tech1 acks, job
-- reassigned to tech2; tech2 must NOT start on tech1's acknowledgment.
-- Tech2's own fresh acknowledgment re-arms.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits; v_ok boolean := true; v_n int;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-S07'); v_j := spk_mkjob(v_t, 's07 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 's07', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 's07', NULL);
  PERFORM spk_as('tech1');
  PERFORM public.record_visit_safety_check(v_v.id, 'passed', 's07-ack', NULL, spk_att());
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech2'), 's07-re', NULL);
  PERFORM spk_as('tech2');
  BEGIN PERFORM public.start_service_job_visit(v_v.id, NULL, NULL, 'spk'); v_ok := false;
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  PERFORM spk_as('tech1');
  BEGIN PERFORM public.start_service_job_visit(v_v.id, NULL, NULL, 'spk'); v_ok := false;
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  PERFORM spk_as('tech2');
  PERFORM public.record_visit_safety_check(v_v.id, 'passed', 's07-ack2', NULL, spk_att());
  BEGIN v_v := public.start_service_job_visit(v_v.id, NULL, NULL, 'spk');
  EXCEPTION WHEN OTHERS THEN v_ok := false; END;
  SELECT count(*)::int INTO v_n FROM public.service_job_visit_safety_checks WHERE visit_id = v_v.id;
  PERFORM spk_note('SPK-S07', v_ok AND v_v.state = 'in_progress' AND v_n = 2,
    'reassign_invalidates_reack_ok=' || v_ok || ' history_rows=' || v_n);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-S07', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- SPK-S08 safety scope is per-visit: passed on visit A does not authorize visit B.
DO $$
DECLARE v_t uuid; v_j uuid; v1 public.service_job_visits; v2 public.service_job_visits; v_ok boolean := true;
BEGIN
  v_t := spk_mkticket('cust1', 'SPK-S08'); v_j := spk_mkjob(v_t, 's08 job');
  PERFORM spk_as('support');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 's08', NULL);
  PERFORM spk_prep_ticket(v_t);
  v1 := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 's08a', NULL);
  v2 := public.schedule_service_job_visit(v_j, now() + interval '5h', now() + interval '6h', 's08b', NULL);
  PERFORM spk_as('tech1');
  PERFORM public.record_visit_safety_check(v1.id, 'passed', 's08-ack', NULL, spk_att());
  BEGIN PERFORM public.start_service_job_visit(v2.id, NULL, NULL, 'spk'); v_ok := false;
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; WHEN OTHERS THEN v_ok := false; END;
  BEGIN v2 := public.start_service_job_visit(v2.id, NULL, spk_att(), 'spk');
  EXCEPTION WHEN OTHERS THEN v_ok := false; END;
  PERFORM spk_note('SPK-S08', v_ok AND v2.state = 'in_progress', 'scope_per_visit=' || v_ok);
EXCEPTION WHEN OTHERS THEN PERFORM spk_note('SPK-S08', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

SELECT check_id, status, detail FROM public.spk_eval ORDER BY check_id;
