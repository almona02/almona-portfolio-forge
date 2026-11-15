-- Spark B3 repair phase (disposable only; runtime frozen at 9882a256).
-- Runs AFTER disposable_b1_battery.sql in the same DB; reuses its b1_* helpers.
-- Repairs J1/J2/V1 fixtures via valid governed assignment before visit start,
-- preserving original assertions; executes V5 rescheduling assertions.
-- Original SKIP/DEFER labels are reported, then overwritten via b1_note upsert
-- with SPK-repair provenance; mirrored into spk_eval.
SELECT 'ORIG ' || check_id || '=' || status || ':' || left(detail, 120)
FROM public.b1_eval WHERE check_id IN ('J1', 'J2', 'V1', 'V5') ORDER BY 1;

-- SPK-J1: original J1 assertions; repaired fixture assigns tech1 before the chain.
DO $$
DECLARE v_j uuid; v_rev uuid; v_cr uuid; v_bare boolean := false; v_has_cr boolean; v_ok boolean; v_t uuid;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('SPK-J1', true);
  SELECT ticket_id INTO v_t FROM public.service_jobs WHERE id = v_j;
  PERFORM spk_prep_ticket(v_t);
  IF b1_state('service_jobs', v_j) <> 'unassigned' THEN
    PERFORM b1_note('J1', false, 'SPK-repair: initial state not unassigned');
    PERFORM spk_note('SPK-J1', false, 'initial state not unassigned'); RETURN;
  END IF;
  PERFORM public.govern_job_transition(v_j, 'planned', 'j1', NULL);
  PERFORM public.govern_job_transition(v_j, 'in_progress', 'j1', NULL);
  PERFORM public.govern_job_transition(v_j, 'awaiting_review', 'j1', NULL);
  BEGIN PERFORM public.govern_job_transition(v_j, 'completed', 'j1', NULL);
  EXCEPTION WHEN check_violation THEN
    v_bare := (SQLERRM ILIKE '%approved%issued%report%');
  END;
  IF NOT v_bare THEN
    PERFORM b1_note('J1', false, 'SPK-repair: bare completion not denied with report reason');
    PERFORM spk_note('SPK-J1', false, 'bare completion not denied with report reason'); RETURN;
  END IF;
  -- REPAIR: valid governed assignment before visit start (B3 start gate).
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'spk-j1-repair', NULL);
  BEGIN
    v_rev := b1_approved_chain(v_j);
  EXCEPTION WHEN OTHERS THEN
    PERFORM b1_note('J1', false, 'SPK-repair chain failed: ' || left(SQLERRM, 200));
    PERFORM spk_note('SPK-J1', false, 'chain: ' || SQLSTATE || ' ' || left(SQLERRM, 200)); RETURN;
  END;
  PERFORM public.govern_job_transition(v_j, 'completed', 'j1', NULL);
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'service_jobs'
      AND column_name = 'completing_revision_id') INTO v_has_cr;
  IF v_has_cr THEN
    EXECUTE 'SELECT completing_revision_id FROM public.service_jobs WHERE id = $1'
      INTO v_cr USING v_j;
  END IF;
  v_ok := b1_state('service_jobs', v_j) = 'completed' AND (NOT v_has_cr OR v_cr = v_rev);
  PERFORM b1_note('J1', v_ok, 'SPK-repair: walk + gated completion (was SKIP)');
  PERFORM spk_note('SPK-J1', v_ok, 'orig=SKIP repaired via governed assign; walk + gated completion');
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('J1', false, 'SPK-repair: ' || SQLSTATE || ' ' || left(SQLERRM, 200));
  PERFORM spk_note('SPK-J1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- SPK-J2: original J2 assertions; repaired fixture assigns tech1 before the chain.
DO $$
DECLARE v_j uuid; v_bad boolean := false; v_term boolean := false; v_ok boolean; v_t uuid;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('SPK-J2', true);
  SELECT ticket_id INTO v_t FROM public.service_jobs WHERE id = v_j;
  PERFORM spk_prep_ticket(v_t);
  BEGIN PERFORM public.govern_job_transition(v_j, 'completed', 'j2', NULL);
  EXCEPTION WHEN check_violation THEN v_bad := true; END;
  PERFORM public.govern_job_transition(v_j, 'planned', 'j2', NULL);
  PERFORM public.govern_job_transition(v_j, 'in_progress', 'j2', NULL);
  PERFORM public.govern_job_transition(v_j, 'awaiting_review', 'j2', NULL);
  -- REPAIR: valid governed assignment before visit start (B3 start gate).
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'spk-j2-repair', NULL);
  BEGIN
    PERFORM b1_approved_chain(v_j);
  EXCEPTION WHEN OTHERS THEN
    PERFORM b1_note('J2', false, 'SPK-repair chain failed: ' || left(SQLERRM, 200));
    PERFORM spk_note('SPK-J2', false, 'chain: ' || SQLSTATE || ' ' || left(SQLERRM, 200)); RETURN;
  END;
  PERFORM public.govern_job_transition(v_j, 'completed', 'j2', NULL);
  BEGIN PERFORM public.govern_job_transition(v_j, 'in_progress', 'j2', NULL);
  EXCEPTION WHEN check_violation THEN v_term := true; END;
  v_ok := v_bad AND v_term AND b1_state('service_jobs', v_j) = 'completed';
  PERFORM b1_note('J2', v_ok, 'SPK-repair: illegal+terminal denied (was SKIP)');
  PERFORM spk_note('SPK-J2', v_ok, 'orig=SKIP repaired via governed assign; illegal+terminal denied');
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('J2', false, 'SPK-repair: ' || SQLSTATE || ' ' || left(SQLERRM, 200));
  PERFORM spk_note('SPK-J2', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- SPK-V1: original V1 walk with valid B2 assignee (was DEFER 'start needs B2 assignee').
DO $$
DECLARE v_j uuid; v_v uuid; v_ok boolean; v_t uuid;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('SPK-V1', true);
  SELECT ticket_id INTO v_t FROM public.service_jobs WHERE id = v_j;
  PERFORM spk_prep_ticket(v_t);
  PERFORM public.govern_job_transition(v_j, 'planned', 'v1', NULL);
  -- REPAIR: valid B2 governed assignment before visit start.
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'spk-v1-repair', NULL);
  SELECT (public.create_service_job_visit(v_j, 'v1', NULL)).id INTO v_v;
  PERFORM b1_ack_visit_safety(v_v, 'spk-v1');
  PERFORM public.govern_visit_transition(v_v, 'in_progress', 'v1', NULL);
  PERFORM public.govern_visit_transition(v_v, 'completed', 'v1', NULL);
  v_ok := b1_state('service_job_visits', v_v) = 'completed';
  PERFORM b1_note('V1', v_ok, 'SPK-repair: visit walk ok with B2 assignee (was DEFER)');
  PERFORM spk_note('SPK-V1', v_ok, 'orig=DEFER executed with governed assign; walk scheduled->in_progress->completed');
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('V1', false, 'SPK-repair: ' || SQLSTATE || ' ' || left(SQLERRM, 200));
  PERFORM spk_note('SPK-V1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- SPK-V5: execute V5 rescheduling assertions (was bare DEFER).
-- Title assertion: reschedule appends a change record. Executed here through the
-- B3 RPC + schedule-history table; equivalent coverage also in SPK-B06/SPK-B07
-- and Cursor B3-01/B3-03.
DO $$
DECLARE v_t uuid; v_j uuid; v_v public.service_job_visits;
  v_h0 int; v_h1 int; v_h2 int; v_a0 int; v_a1 int; v_term_denied boolean := false; v_ok boolean;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := spk_mkticket('cust1', 'SPK-V5'); v_j := spk_mkjob(v_t, 'v5 job');
  PERFORM public.assign_service_job(v_j, spk_uid('tech1'), 'spk-v5', NULL);
  PERFORM spk_prep_ticket(v_t);
  v_v := public.schedule_service_job_visit(v_j, now() + interval '1h', now() + interval '2h', 'v5', NULL);
  v_h0 := spk_hist_n(v_v.id); v_a0 := spk_waudit_n(v_t);
  v_v := public.reschedule_service_job_visit(v_v.id, now() + interval '3h', now() + interval '4h', 'v5-rs', NULL);
  v_h1 := spk_hist_n(v_v.id); v_a1 := spk_waudit_n(v_t);
  v_v := public.reschedule_service_job_visit(v_v.id, v_v.scheduled_start, v_v.scheduled_end, 'v5-idem', NULL);
  v_h2 := spk_hist_n(v_v.id);
  PERFORM spk_as('tech1');
  v_v := public.start_service_job_visit(v_v.id, NULL, spk_att(), 'spk');
  v_v := public.complete_service_job_visit(v_v.id, NULL);
  PERFORM spk_as('support');
  BEGIN PERFORM public.reschedule_service_job_visit(v_v.id, now(), now() + interval '1h', 'x', NULL);
  EXCEPTION WHEN check_violation THEN v_term_denied := true; END;
  v_ok := v_h0 = 1 AND v_h1 = 2 AND v_a1 = v_a0 + 1 AND v_h2 = 2 AND v_term_denied;
  PERFORM b1_note('V5', v_ok, 'SPK-executed: change records 1->2, idem stable, terminal denied (was DEFER)');
  PERFORM spk_note('SPK-V5', v_ok, 'orig=DEFER executed: hist ' || v_h0 || '->' || v_h1 || ' idem=' || v_h2
    || ' audit_d=' || (v_a1 - v_a0) || ' term_denied=' || v_term_denied
    || ' | equiv: SPK-B06/B07, B3-01/B3-03');
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('V5', false, 'SPK-executed: ' || SQLSTATE || ' ' || left(SQLERRM, 200));
  PERFORM spk_note('SPK-V5', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

SELECT check_id, status, detail FROM public.b1_eval WHERE check_id IN ('J1','J2','V1','V5') ORDER BY 1;
SELECT check_id, status, detail FROM public.spk_eval WHERE check_id IN ('SPK-J1','SPK-J2','SPK-V1','SPK-V5') ORDER BY 1;