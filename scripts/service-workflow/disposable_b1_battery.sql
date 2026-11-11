-- B1 disposable battery: compat (C, must PASS now) + B1 contract (SKIP until implemented).
-- Run via run_disposable_b1.py after base + real Slice 0 migration + TKT trigger.
CREATE TEMP TABLE b1_eval(check_id text PRIMARY KEY, status text NOT NULL, detail text);
CREATE OR REPLACE FUNCTION b1_note(p_id text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO b1_eval VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, left(p_detail, 300))
  ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
$$;
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
CREATE OR REPLACE FUNCTION b1_mkticket(p_owner text, p_num text, p_status text DEFAULT 'open')
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.service_tickets (ticket_number, user_id, title, description, type, priority, status)
  VALUES (p_num, b1_uid(p_owner), 't ' || p_num, 'compat fixture', 'general', 'medium', p_status)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
CREATE OR REPLACE FUNCTION b1_has_table(n text) RETURNS boolean
LANGUAGE sql STABLE AS $$ SELECT to_regclass('public.' || n) IS NOT NULL; $$;
CREATE OR REPLACE FUNCTION b1_has_func(n text) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace
                 WHERE s.nspname = 'public' AND p.proname = n);
$$;
CREATE OR REPLACE FUNCTION b1_audit_n(p_ticket uuid) RETURNS int
LANGUAGE sql STABLE AS $$
  SELECT count(*)::int FROM public.ticket_governance_audit WHERE ticket_id = p_ticket;
$$;

-- C1 legacy full walk via governed 4-arg RPC.
DO $$
DECLARE v_t uuid; v_s text; v_n int;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-C1');
  PERFORM public.govern_ticket_transition(v_t, 'assigned', 'c1', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'in_progress', 'c1', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'awaiting_customer', 'c1', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'in_progress', 'c1', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'resolved', 'c1', 'fixed by test');
  PERFORM public.govern_ticket_transition(v_t, 'closed', 'c1', NULL);
  SELECT status INTO v_s FROM public.service_tickets WHERE id = v_t;
  v_n := b1_audit_n(v_t);
  PERFORM b1_note('C1', v_s = 'closed' AND v_n = 6, 'state=' || v_s || ' audit=' || v_n);
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('C1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- C2 illegal jump rejected; state + audit unchanged.
DO $$
DECLARE v_t uuid; v_s text; v_n0 int; v_n1 int;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-C2');
  v_n0 := b1_audit_n(v_t);
  BEGIN
    PERFORM public.govern_ticket_transition(v_t, 'resolved', 'c2', NULL);
    PERFORM b1_note('C2', false, 'open->resolved accepted');
    RETURN;
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  SELECT status INTO v_s FROM public.service_tickets WHERE id = v_t;
  v_n1 := b1_audit_n(v_t);
  PERFORM b1_note('C2', v_s = 'open' AND v_n0 = v_n1, 'state=' || v_s);
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('C2', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- C3 terminal states immutable.
DO $$
DECLARE v_c uuid; v_x uuid; v_ok boolean := true;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('admin')::text, false);
  v_c := b1_mkticket('cust1', 'B1-C3C', 'closed');
  v_x := b1_mkticket('cust1', 'B1-C3X', 'cancelled');
  BEGIN PERFORM public.govern_ticket_transition(v_c, 'open', 'c3', NULL); v_ok := false;
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN PERFORM public.govern_ticket_transition(v_x, 'in_progress', 'c3', NULL); v_ok := false;
  EXCEPTION WHEN check_violation THEN NULL; END;
  PERFORM b1_note('C3', v_ok, 'terminal holds');
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('C3', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- C4 technician: own OK, foreign denied.
DO $$
DECLARE v_own uuid; v_for uuid; v_s text; v_denied boolean := false;
BEGIN
  v_own := b1_mkticket('cust1', 'B1-C4O', 'assigned');
  UPDATE public.service_tickets SET assigned_to = b1_uid('tech1') WHERE id = v_own;
  v_for := b1_mkticket('cust1', 'B1-C4F', 'assigned');
  UPDATE public.service_tickets SET assigned_to = b1_uid('tech2') WHERE id = v_for;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM public.govern_ticket_transition(v_own, 'in_progress', 'c4', NULL);
  SELECT status INTO v_s FROM public.service_tickets WHERE id = v_own;
  BEGIN PERFORM public.govern_ticket_transition(v_for, 'in_progress', 'c4', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_denied := true; END;
  PERFORM b1_note('C4', v_s = 'in_progress' AND v_denied, 'own=' || v_s);
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('C4', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- C5 customer + sales denied any transition.
DO $$
DECLARE v_t uuid; v_c boolean := false; v_s boolean := false;
BEGIN
  v_t := b1_mkticket('cust1', 'B1-C5');
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  BEGIN PERFORM public.govern_ticket_transition(v_t, 'assigned', 'c5', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_c := true; END;
  PERFORM set_config('app.b1_uid', b1_uid('sales')::text, false);
  BEGIN PERFORM public.govern_ticket_transition(v_t, 'assigned', 'c5', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_s := true; END;
  PERFORM b1_note('C5', v_c AND v_s, 'cust+sales denied');
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('C5', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- C6 audit row shape: actor/role/before/after present; failures add none.
DO $$
DECLARE v_t uuid; v_n0 int; v_n1 int; v_row text;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-C6');
  v_n0 := b1_audit_n(v_t);
  PERFORM public.govern_ticket_transition(v_t, 'assigned', 'need tech', NULL);
  v_n1 := b1_audit_n(v_t);
  SELECT (a.actor_id::text = b1_uid('support')::text
          AND a.action = 'status_transition'
          AND a.from_status = 'open' AND a.to_status = 'assigned'
          AND a.details::text LIKE '%need tech%'
          AND a.details::text LIKE '%support%'
          AND a.created_at IS NOT NULL)::text
    INTO v_row FROM public.ticket_governance_audit a
   WHERE a.ticket_id = v_t ORDER BY a.created_at DESC LIMIT 1;
  BEGIN PERFORM public.govern_ticket_transition(v_t, 'closed', 'c6', NULL);
  EXCEPTION WHEN check_violation THEN NULL; END;
  PERFORM b1_note('C6', v_n1 = v_n0 + 1 AND v_row = 'true'
    AND b1_audit_n(v_t) = v_n1, 'shape+atomic');
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('C6', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- C7 FSM parity with client TICKET_STATUS_TRANSITIONS (+documented reflexive-true).
DO $$
DECLARE
  states text[] := ARRAY['open','assigned','in_progress','awaiting_parts','awaiting_customer','resolved','closed','cancelled'];
  edges text[] := ARRAY['open>assigned','open>cancelled',
    'assigned>in_progress','assigned>awaiting_parts','assigned>cancelled',
    'in_progress>awaiting_parts','in_progress>awaiting_customer','in_progress>resolved',
    'awaiting_parts>in_progress','awaiting_parts>cancelled',
    'awaiting_customer>in_progress','awaiting_customer>resolved',
    'resolved>closed','resolved>in_progress'];
  f text; t text; want boolean; got boolean; bad int := 0;
BEGIN
  FOREACH f IN ARRAY states LOOP
    FOREACH t IN ARRAY states LOOP
      want := (f = t) OR ((f || '>' || t) = ANY (edges));
      got := public.is_valid_ticket_status_transition(f, t);
      IF got IS DISTINCT FROM want THEN bad := bad + 1; END IF;
    END LOOP;
  END LOOP;
  PERFORM b1_note('C7', bad = 0, 'mismatches=' || bad || ' (reflexive-true documented)');
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('C7', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- C8 bulk partial failure preserved.
DO $$
DECLARE v_ok uuid; v_bad uuid; v_res text; s_ok text; s_bad text;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_ok := b1_mkticket('cust1', 'B1-C8A');
  v_bad := b1_mkticket('cust1', 'B1-C8B', 'closed');
  SELECT public.govern_ticket_bulk_transition(ARRAY[v_ok, v_bad], 'assigned', 'c8', NULL)::text INTO v_res;
  SELECT status INTO s_ok FROM public.service_tickets WHERE id = v_ok;
  SELECT status INTO s_bad FROM public.service_tickets WHERE id = v_bad;
  PERFORM b1_note('C8', s_ok = 'assigned' AND s_bad = 'closed'
    AND v_res LIKE '%' || v_ok::text || '%' AND v_res LIKE '%' || v_bad::text || '%',
    left(v_res, 200));
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('C8', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- C9 direct mutation + audit writes denied for non-owner callers.
DO $$
DECLARE v_t uuid; v_upd boolean := false; v_ins boolean := false; v_mut boolean := false;
BEGIN
  v_t := b1_mkticket('cust1', 'B1-C9');
  SET ROLE b1_auth;
  BEGIN UPDATE public.service_tickets SET status = 'closed' WHERE id = v_t;
  EXCEPTION WHEN SQLSTATE '42501' THEN v_upd := true; END;
  BEGIN INSERT INTO public.ticket_governance_audit (ticket_id, action) VALUES (v_t, 'x');
  EXCEPTION WHEN SQLSTATE '42501' THEN v_ins := true; END;
  BEGIN UPDATE public.ticket_governance_audit SET action = 'y' WHERE ticket_id = v_t;
  EXCEPTION WHEN OTHERS THEN v_mut := (SQLSTATE IN ('42501', '42502')); END;
  RESET ROLE;
  PERFORM b1_note('C9', v_upd AND v_ins AND v_mut, 'trigger+revoke hold');
EXCEPTION WHEN OTHERS THEN
  BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM b1_note('C9', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- C10 UI-shaped insert (no ticket_number) auto-allocates TKT-YYYY-######.
DO $$
DECLARE v_id uuid; v_num text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'service_tickets_assign_ticket_number_bi') THEN
    INSERT INTO b1_eval VALUES ('C10', 'SKIP', 'TKT trigger section not applied');
    RETURN;
  END IF;
  INSERT INTO public.service_tickets (user_id, title, description, type, priority, status)
  VALUES (b1_uid('cust1'), 'ui insert', 'no number sent', 'general', 'medium', 'open')
  RETURNING id, ticket_number INTO v_id, v_num;
  PERFORM b1_note('C10', v_num LIKE 'TKT-%', v_num);
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('C10', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- ---- B1 helpers: state reader robust to state/status naming ----
CREATE OR REPLACE FUNCTION b1_state(p_table text, p_id uuid) RETURNS text
LANGUAGE plpgsql STABLE AS $$
DECLARE v_col text; v_out text;
BEGIN
  SELECT column_name INTO v_col FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = p_table
     AND column_name IN ('state', 'status') ORDER BY column_name LIMIT 1;
  IF v_col IS NULL THEN RAISE EXCEPTION 'no state column on %', p_table; END IF;
  EXECUTE format('SELECT %I::text FROM public.%I WHERE id = $1', v_col, p_table)
    INTO v_out USING p_id;
  RETURN v_out;
END $$;
CREATE OR REPLACE FUNCTION b1_mkticket_job(p_title text, p_required boolean DEFAULT true)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_t uuid; v_j uuid;
BEGIN
  v_t := b1_mkticket('cust1', 'B1-' || p_title);
  SELECT (public.create_service_job(v_t, p_title, p_required, 'battery')).id INTO v_j;
  RETURN v_j;
END $$;

-- J1 legal job walk to awaiting_review; completed denied without approved report.
DO $$
DECLARE v_j uuid; v_ok boolean := true; v_denied boolean := false;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('create_service_job')
      AND b1_has_func('govern_job_transition')) THEN
    INSERT INTO b1_eval VALUES ('J1', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('J1', true);
  IF b1_state('service_jobs', v_j) <> 'unassigned' THEN v_ok := false; END IF;
  PERFORM public.govern_job_transition(v_j, 'planned', 'j1', NULL);
  PERFORM public.govern_job_transition(v_j, 'in_progress', 'j1', NULL);
  PERFORM public.govern_job_transition(v_j, 'awaiting_review', 'j1', NULL);
  BEGIN PERFORM public.govern_job_transition(v_j, 'completed', 'j1', NULL);
  EXCEPTION WHEN check_violation THEN v_denied := true; END;
  v_ok := v_ok AND b1_state('service_jobs', v_j) = 'awaiting_review' AND v_denied;
  PERFORM b1_note('J1', v_ok, 'walk to awaiting_review; complete gated');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('J1', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('J1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- J2 illegal job jumps denied; completed terminal after privileged approved-report fixture.
DO $$
DECLARE v_j uuid; v_v uuid; v_bad boolean := false; v_term boolean := false;
  v_rep uuid; v_rev uuid;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('create_service_job')
      AND b1_has_func('govern_job_transition')) THEN
    INSERT INTO b1_eval VALUES ('J2', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('J2', true);
  BEGIN PERFORM public.govern_job_transition(v_j, 'completed', 'j2', NULL);
  EXCEPTION WHEN check_violation THEN v_bad := true; END;
  PERFORM public.govern_job_transition(v_j, 'planned', 'j2', NULL);
  PERFORM public.govern_job_transition(v_j, 'in_progress', 'j2', NULL);
  SELECT (public.create_service_job_visit(v_j, 'j2', NULL)).id INTO v_v;
  PERFORM public.govern_visit_transition(v_v, 'in_progress', 'j2', NULL);
  PERFORM public.govern_visit_transition(v_v, 'completed', 'j2', NULL);
  PERFORM public.govern_job_transition(v_j, 'awaiting_review', 'j2', NULL);
  INSERT INTO public.service_reports (visit_id) VALUES (v_v) RETURNING id INTO v_rep;
  INSERT INTO public.service_report_revisions (
    report_id, revision_number, findings, labour, verification_outcome, submitted_by
  ) VALUES (v_rep, 1, 'fixed', '[]'::jsonb, 'verified_fixed', b1_uid('tech1'))
  RETURNING id INTO v_rev;
  INSERT INTO public.service_report_reviews (revision_id, reviewer_id, decision, comments)
  VALUES (v_rev, b1_uid('support'), 'approved_issued', 'ok');
  PERFORM public.govern_job_transition(v_j, 'completed', 'j2', NULL);
  BEGIN PERFORM public.govern_job_transition(v_j, 'in_progress', 'j2', NULL);
  EXCEPTION WHEN check_violation THEN v_term := true; END;
  PERFORM b1_note('J2', v_bad AND v_term
    AND b1_state('service_jobs', v_j) = 'completed', 'illegal+terminal denied');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('J2', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('J2', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- J3 cancel: reason mandatory; cancelled terminal except waive-conversion.
DO $$
DECLARE v_j uuid; v_noreason boolean := false; v_ok boolean; v_frozen boolean := false;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('create_service_job')
      AND b1_has_func('govern_job_transition')) THEN
    INSERT INTO b1_eval VALUES ('J3', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('J3', true);
  PERFORM public.govern_job_transition(v_j, 'planned', 'j3', NULL);
  BEGIN PERFORM public.govern_job_transition(v_j, 'cancelled', NULL, NULL);
  EXCEPTION WHEN OTHERS THEN v_noreason := true; END;
  PERFORM public.govern_job_transition(v_j, 'cancelled', 'not needed', NULL);
  v_ok := b1_state('service_jobs', v_j) = 'cancelled';
  BEGIN PERFORM public.govern_job_transition(v_j, 'in_progress', 'j3', NULL);
  EXCEPTION WHEN check_violation THEN v_frozen := true; END;
  PERFORM b1_note('J3', v_noreason AND v_ok AND v_frozen, 'cancel guards hold');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('J3', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('J3', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- J4 waive: manager + reason only.
DO $$
DECLARE v_j uuid; v_tech boolean := false; v_noreason boolean := false; v_ok boolean;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('create_service_job')
      AND b1_has_func('waive_service_job')) THEN
    INSERT INTO b1_eval VALUES ('J4', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('J4', true);
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  BEGIN PERFORM public.waive_service_job(v_j, 'tech try', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_tech := true; END;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  BEGIN PERFORM public.waive_service_job(v_j, NULL, NULL);
  EXCEPTION WHEN OTHERS THEN v_noreason := true; END;
  PERFORM public.waive_service_job(v_j, 'covered by visit', NULL);
  v_ok := b1_state('service_jobs', v_j) = 'waived';
  PERFORM b1_note('J4', v_tech AND v_noreason AND v_ok, 'waive guards hold');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('J4', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('J4', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- J5 cancelled -> waived conversion (interpretation-flagged); waived terminal.
DO $$
DECLARE v_j uuid; v_conv boolean; v_term boolean := false;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('create_service_job')
      AND b1_has_func('waive_service_job') AND b1_has_func('govern_job_transition')) THEN
    INSERT INTO b1_eval VALUES ('J5', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('J5', true);
  PERFORM public.govern_job_transition(v_j, 'planned', 'j5', NULL);
  PERFORM public.govern_job_transition(v_j, 'cancelled', 'oops', NULL);
  PERFORM public.waive_service_job(v_j, 'actually covered', NULL);
  v_conv := b1_state('service_jobs', v_j) = 'waived';
  BEGIN PERFORM public.govern_job_transition(v_j, 'planned', 'j5', NULL);
  EXCEPTION WHEN check_violation THEN v_term := true; END;
  PERFORM b1_note('J5', v_conv AND v_term, 'conversion ok, waived terminal');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('J5', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('J5', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- J6 job creation gates: customer/tech/sales denied, support allowed.
DO $$
DECLARE v_t uuid; v_c boolean := false; v_t2 boolean := false; v_s boolean := false; v_j uuid;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('create_service_job')) THEN
    INSERT INTO b1_eval VALUES ('J6', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  v_t := b1_mkticket('cust1', 'B1-J6');
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  BEGIN PERFORM public.create_service_job(v_t, 'x', true, 'j6'); EXCEPTION WHEN SQLSTATE '42501' THEN v_c := true; END;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  BEGIN PERFORM public.create_service_job(v_t, 'x', true, 'j6'); EXCEPTION WHEN SQLSTATE '42501' THEN v_t2 := true; END;
  PERFORM set_config('app.b1_uid', b1_uid('sales')::text, false);
  BEGIN PERFORM public.create_service_job(v_t, 'x', true, 'j6'); EXCEPTION WHEN SQLSTATE '42501' THEN v_s := true; END;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT (public.create_service_job(v_t, 'ok', true, 'j6')).id INTO v_j;
  PERFORM b1_note('J6', v_c AND v_t2 AND v_s AND v_j IS NOT NULL, 'create gates hold');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('J6', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('J6', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- J7 denied job transitions add no audit and change no state.
DO $$
DECLARE v_j uuid; v_n0 int; v_n1 int; v_s0 text; v_s1 text;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_table('service_workflow_audit')
      AND b1_has_func('create_service_job') AND b1_has_func('govern_job_transition')) THEN
    INSERT INTO b1_eval VALUES ('J7', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('J7', true);
  SELECT count(*) INTO v_n0 FROM public.service_workflow_audit;
  v_s0 := b1_state('service_jobs', v_j);
  BEGIN PERFORM public.govern_job_transition(v_j, 'completed', 'j7', NULL);
  EXCEPTION WHEN check_violation THEN NULL; END;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  BEGIN PERFORM public.govern_job_transition(v_j, 'planned', 'j7', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  SELECT count(*) INTO v_n1 FROM public.service_workflow_audit;
  v_s1 := b1_state('service_jobs', v_j);
  PERFORM b1_note('J7', v_n0 = v_n1 AND v_s0 = v_s1, 'denials leave no trace');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('J7', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('J7', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- V1 legal visit walk (arms fully at B2 if start requires assignee).
DO $$
DECLARE v_j uuid; v_v uuid; v_ok boolean := true;
BEGIN
  IF NOT (b1_has_table('service_job_visits') AND b1_has_func('create_service_job_visit')
      AND b1_has_func('govern_visit_transition')) THEN
    INSERT INTO b1_eval VALUES ('V1', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('V1', true);
  PERFORM public.govern_job_transition(v_j, 'planned', 'v1', NULL);
  SELECT (public.create_service_job_visit(v_j, 'v1', NULL)).id INTO v_v;
  BEGIN
    PERFORM public.govern_visit_transition(v_v, 'in_progress', 'v1', NULL);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ILIKE '%assign%' THEN
      INSERT INTO b1_eval VALUES ('V1', 'SKIP', 'start needs B2 assignee'); RETURN;
    END IF;
    RAISE;
  END;
  PERFORM public.govern_visit_transition(v_v, 'completed', 'v1', NULL);
  v_ok := b1_state('service_job_visits', v_v) = 'completed';
  PERFORM b1_note('V1', v_ok, 'visit walk ok');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('V1', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('V1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- V2 scheduled -> completed denied.
DO $$
DECLARE v_j uuid; v_v uuid; v_denied boolean := false;
BEGIN
  IF NOT (b1_has_table('service_job_visits') AND b1_has_func('create_service_job_visit')
      AND b1_has_func('govern_visit_transition')) THEN
    INSERT INTO b1_eval VALUES ('V2', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('V2', true);
  SELECT (public.create_service_job_visit(v_j, 'v2', NULL)).id INTO v_v;
  BEGIN PERFORM public.govern_visit_transition(v_v, 'completed', 'v2', NULL);
  EXCEPTION WHEN check_violation THEN v_denied := true; END;
  PERFORM b1_note('V2', v_denied, 'jump denied');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('V2', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('V2', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- V3 abort / no_access: reason mandatory; terminal after.
DO $$
DECLARE v_j uuid; v_a uuid; v_n uuid; v_nr boolean := false; v_ok boolean;
BEGIN
  IF NOT (b1_has_table('service_job_visits') AND b1_has_func('create_service_job_visit')
      AND b1_has_func('govern_visit_transition')) THEN
    INSERT INTO b1_eval VALUES ('V3', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('V3', true);
  SELECT (public.create_service_job_visit(v_j, 'v3', NULL)).id INTO v_a;
  BEGIN PERFORM public.govern_visit_transition(v_a, 'aborted', NULL, NULL);
  EXCEPTION WHEN OTHERS THEN v_nr := true; END;
  PERFORM public.govern_visit_transition(v_a, 'aborted', 'unsafe site', NULL);
  SELECT (public.create_service_job_visit(v_j, 'v3', NULL)).id INTO v_n;
  PERFORM public.govern_visit_transition(v_n, 'no_access', 'gate locked', NULL);
  v_ok := b1_state('service_job_visits', v_a) = 'aborted'
      AND b1_state('service_job_visits', v_n) = 'no_access';
  PERFORM b1_note('V3', v_nr AND v_ok, 'terminal outcomes guarded');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('V3', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('V3', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- V4 terminal visits immutable; new visit creatable after terminal.
DO $$
DECLARE v_j uuid; v_v uuid; v_new uuid; v_frozen boolean := false;
BEGIN
  IF NOT (b1_has_table('service_job_visits') AND b1_has_func('create_service_job_visit')
      AND b1_has_func('govern_visit_transition')) THEN
    INSERT INTO b1_eval VALUES ('V4', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('V4', true);
  SELECT (public.create_service_job_visit(v_j, 'v4', NULL)).id INTO v_v;
  PERFORM public.govern_visit_transition(v_v, 'aborted', 'storm', NULL);
  BEGIN PERFORM public.govern_visit_transition(v_v, 'scheduled', 'v4', NULL);
  EXCEPTION WHEN check_violation THEN v_frozen := true; END;
  SELECT (public.create_service_job_visit(v_j, 'v4', NULL)).id INTO v_new;
  PERFORM b1_note('V4', v_frozen AND v_new IS NOT NULL AND v_new <> v_v,
    'terminal frozen, new visit ok');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('V4', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('V4', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- V5 reschedule appends a change record (B3 behavior; prepared).
DO $$
BEGIN
  IF NOT b1_has_func('reschedule_service_visit') THEN
    INSERT INTO b1_eval VALUES ('V5', 'SKIP', 'needs B3 reschedule RPC'); RETURN;
  END IF;
  PERFORM b1_note('V5', false, 'reschedule RPC present but unwired in battery');
END $$;

-- R1 B1 data contract: all entities exist with parent FKs (column-name agnostic).
DO $$
DECLARE
  need text[] := ARRAY['service_jobs','service_job_visits','service_reports','service_report_revisions','service_report_reviews','service_acknowledgments','service_workflow_audit'];
  t text; missing text := '';
  fk_ok boolean;
BEGIN
  FOREACH t IN ARRAY need LOOP
    IF NOT b1_has_table(t) THEN missing := missing || t || ' '; END IF;
  END LOOP;
  IF missing <> '' THEN
    INSERT INTO b1_eval VALUES ('R1', 'SKIP', 'pending B1: missing ' || missing); RETURN;
  END IF;
  SELECT
    EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class ch ON ch.oid = c.conrelid
            JOIN pg_class pa ON pa.oid = c.confrelid
            WHERE c.contype = 'f' AND ch.relname = 'service_jobs' AND pa.relname = 'service_tickets')
    AND EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class ch ON ch.oid = c.conrelid
            JOIN pg_class pa ON pa.oid = c.confrelid
            WHERE c.contype = 'f' AND ch.relname = 'service_job_visits' AND pa.relname = 'service_jobs')
    AND EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class ch ON ch.oid = c.conrelid
            JOIN pg_class pa ON pa.oid = c.confrelid
            WHERE c.contype = 'f' AND ch.relname = 'service_report_revisions'
              AND pa.relname IN ('service_reports', 'service_job_visits'))
    AND EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class ch ON ch.oid = c.conrelid
            JOIN pg_class pa ON pa.oid = c.confrelid
            WHERE c.contype = 'f' AND ch.relname = 'service_report_reviews'
              AND pa.relname = 'service_report_revisions')
    INTO fk_ok;
  PERFORM b1_note('R1', fk_ok, 'entities + parent FKs');
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('R1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- R2 submitted revision immutable (privileged fixture insert; client UPDATE/DELETE denied).
DO $$
DECLARE v_j uuid; v_v uuid; v_rep uuid; v_rev uuid; v_upd boolean := false; v_del boolean := false;
BEGIN
  IF NOT (b1_has_table('service_report_revisions') AND b1_has_func('create_service_job')) THEN
    INSERT INTO b1_eval VALUES ('R2', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('R2', true);
  PERFORM public.govern_job_transition(v_j, 'planned', 'r2', NULL);
  SELECT (public.create_service_job_visit(v_j, 'r2', NULL)).id INTO v_v;
  INSERT INTO public.service_reports (visit_id) VALUES (v_v) RETURNING id INTO v_rep;
  INSERT INTO public.service_report_revisions (
    report_id, revision_number, findings, labour, verification_outcome, submitted_by
  ) VALUES (v_rep, 1, 'obs', '[]'::jsonb, 'verified_fixed', b1_uid('tech1'))
  RETURNING id INTO v_rev;
  SET ROLE b1_auth;
  BEGIN UPDATE public.service_report_revisions SET findings = 'tamper' WHERE id = v_rev;
  EXCEPTION WHEN SQLSTATE '42501' THEN v_upd := true; END;
  BEGIN DELETE FROM public.service_report_revisions WHERE id = v_rev;
  EXCEPTION WHEN SQLSTATE '42501' THEN v_del := true; END;
  RESET ROLE;
  PERFORM b1_note('R2', v_upd AND v_del
    AND (SELECT findings FROM public.service_report_revisions WHERE id = v_rev) = 'obs',
    'UPDATE/DELETE denied');
EXCEPTION WHEN OTHERS THEN
  BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM b1_note('R2', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- R3 one review decides a revision; author + non-manager review denied (B5; prepared).
DO $$
BEGIN
  IF NOT b1_has_func('review_service_report') THEN
    INSERT INTO b1_eval VALUES ('R3', 'SKIP', 'needs B5 review RPC'); RETURN;
  END IF;
  PERFORM b1_note('R3', false, 'review RPC present but unwired in battery');
END $$;

-- R4 further_work_required blocks job completion (B5; prepared).
DO $$
BEGIN
  IF NOT (b1_has_func('submit_service_report') AND b1_has_func('review_service_report')) THEN
    INSERT INTO b1_eval VALUES ('R4', 'SKIP', 'needs B4/B5 report RPCs'); RETURN;
  END IF;
  PERFORM b1_note('R4', false, 'report RPCs present but unwired in battery');
END $$;

-- M1 three mixed jobs, independent progress.
DO $$
DECLARE v_t uuid; v_1 uuid; v_2 uuid; v_3 uuid; s_2 text;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('create_service_job')
      AND b1_has_func('govern_job_transition')) THEN
    INSERT INTO b1_eval VALUES ('M1', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-M1');
  SELECT (public.create_service_job(v_t, 'diag', true, 'm1')).id INTO v_1;
  SELECT (public.create_service_job(v_t, 'repair', true, 'm1')).id INTO v_2;
  SELECT (public.create_service_job(v_t, 'advisory', false, 'm1')).id INTO v_3;
  PERFORM public.govern_job_transition(v_1, 'planned', 'm1', NULL);
  PERFORM public.govern_job_transition(v_1, 'in_progress', 'm1', NULL);
  s_2 := b1_state('service_jobs', v_2);
  PERFORM b1_note('M1', v_1 <> v_2 AND v_2 <> v_3 AND s_2 = 'unassigned',
    'mixed jobs independent');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('M1', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('M1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- M2 no uniqueness enforces one job per ticket.
DO $$
DECLARE v_t uuid; v_a uuid; v_b uuid; v_uq boolean;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('create_service_job')) THEN
    INSERT INTO b1_eval VALUES ('M2', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  -- Fail only if a UNIQUE/PK exists on ticket_id alone (multi-job must remain allowed).
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'service_jobs' AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) ~* 'UNIQUE \(ticket_id\)'
  ) INTO v_uq;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-M2');
  SELECT (public.create_service_job(v_t, 'a', true, 'm2')).id INTO v_a;
  SELECT (public.create_service_job(v_t, 'b', true, 'm2')).id INTO v_b;
  PERFORM b1_note('M2', NOT v_uq AND v_a <> v_b, 'multi-job allowed');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('M2', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('M2', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- M3 no_access then new visit; both in history.
DO $$
DECLARE v_j uuid; v_1 uuid; v_2 uuid; v_n int;
BEGIN
  IF NOT (b1_has_table('service_job_visits') AND b1_has_func('create_service_job_visit')
      AND b1_has_func('govern_visit_transition')) THEN
    INSERT INTO b1_eval VALUES ('M3', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('M3', true);
  SELECT (public.create_service_job_visit(v_j, 'm3', NULL)).id INTO v_1;
  PERFORM public.govern_visit_transition(v_1, 'no_access', 'gate locked', NULL);
  SELECT (public.create_service_job_visit(v_j, 'm3', NULL)).id INTO v_2;
  SELECT count(*) INTO v_n FROM public.service_job_visits
   WHERE id IN (v_1, v_2);
  PERFORM b1_note('M3', v_n = 2 AND b1_state('service_job_visits', v_1) = 'no_access',
    'retry visit coexists');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('M3', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('M3', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- M4 one report per completed visit (arms at B4; prepared).
DO $$
BEGIN
  IF NOT b1_has_func('submit_service_report') THEN
    INSERT INTO b1_eval VALUES ('M4', 'SKIP', 'needs B4 submit RPC'); RETURN;
  END IF;
  PERFORM b1_note('M4', false, 'submit RPC present but unwired in battery');
END $$;

-- M5 completion governed by latest approved report (arms at B5; prepared).
DO $$
BEGIN
  IF NOT (b1_has_func('submit_service_report') AND b1_has_func('review_service_report')) THEN
    INSERT INTO b1_eval VALUES ('M5', 'SKIP', 'needs B4/B5 report RPCs'); RETURN;
  END IF;
  PERFORM b1_note('M5', false, 'report RPCs present but unwired in battery');
END $$;

-- X1 required job added to resolved ticket returns it to in_progress (governed).
DO $$
DECLARE v_t uuid; v_j uuid; v_s text; v_audit int;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('create_service_job')) THEN
    INSERT INTO b1_eval VALUES ('X1', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-X1');
  PERFORM public.govern_ticket_transition(v_t, 'assigned', 'x1', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'in_progress', 'x1', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'resolved', 'x1', 'done');
  SELECT (public.create_service_job(v_t, 'extra', true, 'x1')).id INTO v_j;
  SELECT status INTO v_s FROM public.service_tickets WHERE id = v_t;
  v_audit := b1_audit_n(v_t);
  PERFORM b1_note('X1', v_s = 'in_progress' AND v_audit >= 4, 'state=' || v_s);
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('X1', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('X1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- X2 jobless ticket resolves/closes exactly as today.
DO $$
DECLARE v_t uuid; v_s text;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-X2');
  PERFORM public.govern_ticket_transition(v_t, 'assigned', 'x2', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'in_progress', 'x2', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'resolved', 'x2', 'done');
  PERFORM public.govern_ticket_transition(v_t, 'closed', 'x2', NULL);
  SELECT status INTO v_s FROM public.service_tickets WHERE id = v_t;
  PERFORM b1_note('X2', v_s = 'closed', 'jobless parity');
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('X2', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- X3 mixed required/optional/waived closure gate with named failures (B6; prepared shape).
DO $$
DECLARE v_t uuid; v_j uuid; v_err text := '';
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('create_service_job')) THEN
    INSERT INTO b1_eval VALUES ('X3', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-X3');
  PERFORM public.govern_ticket_transition(v_t, 'assigned', 'x3', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'in_progress', 'x3', NULL);
  SELECT (public.create_service_job(v_t, 'req', true, 'x3')).id INTO v_j;
  BEGIN
    PERFORM public.govern_ticket_transition(v_t, 'resolved', 'x3', 'try');
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  PERFORM b1_note('X3', v_err <> '' AND v_err NOT ILIKE '%cannot close%',
    'gate names the blocker: ' || left(v_err, 160));
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('X3', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('X3', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- A1 B1 audit: exactly one row per success, actor/role/before/after recorded.
DO $$
DECLARE v_j uuid; v_n0 int; v_n1 int; v_row text;
BEGIN
  IF NOT (b1_has_table('service_workflow_audit') AND b1_has_table('service_jobs')
      AND b1_has_func('create_service_job') AND b1_has_func('govern_job_transition')) THEN
    INSERT INTO b1_eval VALUES ('A1', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('A1', true);
  SELECT count(*) INTO v_n0 FROM public.service_workflow_audit;
  PERFORM public.govern_job_transition(v_j, 'planned', 'staff it', NULL);
  SELECT count(*) INTO v_n1 FROM public.service_workflow_audit;
  SELECT EXISTS (
    SELECT 1 FROM public.service_workflow_audit r
     WHERE r::text LIKE '%' || b1_uid('support')::text || '%'
       AND r::text LIKE '%unassigned%' AND r::text LIKE '%planned%'
       AND r::text LIKE '%support%' AND r::text LIKE '%staff it%'
  )::text INTO v_row;
  PERFORM b1_note('A1', v_n1 = v_n0 + 1 AND v_row = 'true', 'atomic row+fields');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('A1', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('A1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- A2 B1 audit: failures add nothing.
DO $$
DECLARE v_j uuid; v_n0 int; v_n1 int;
BEGIN
  IF NOT (b1_has_table('service_workflow_audit') AND b1_has_table('service_jobs')
      AND b1_has_func('create_service_job') AND b1_has_func('govern_job_transition')) THEN
    INSERT INTO b1_eval VALUES ('A2', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('A2', true);
  SELECT count(*) INTO v_n0 FROM public.service_workflow_audit;
  BEGIN PERFORM public.govern_job_transition(v_j, 'completed', 'a2', NULL);
  EXCEPTION WHEN check_violation THEN NULL; END;
  SELECT count(*) INTO v_n1 FROM public.service_workflow_audit;
  PERFORM b1_note('A2', v_n0 = v_n1, 'no trace on failure');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('A2', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('A2', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- A3 B1 audit direct writes denied for non-owner callers.
DO $$
DECLARE v_ins boolean := false; v_mut boolean := false;
BEGIN
  IF NOT b1_has_table('service_workflow_audit') THEN
    INSERT INTO b1_eval VALUES ('A3', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  SET ROLE b1_auth;
  BEGIN INSERT INTO public.service_workflow_audit DEFAULT VALUES;
  EXCEPTION WHEN SQLSTATE '42501' THEN v_ins := true; END;
  BEGIN UPDATE public.service_workflow_audit SET id = id WHERE false;
  EXCEPTION WHEN OTHERS THEN v_mut := (SQLSTATE IN ('42501', '42502')); END;
  RESET ROLE;
  PERFORM b1_note('A3', v_ins AND v_mut, 'audit append-only');
EXCEPTION WHEN OTHERS THEN
  BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM b1_note('A3', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- A4 B1 audit table carries actor + timestamp columns.
DO $$
DECLARE v_actor boolean; v_ts boolean;
BEGIN
  IF NOT b1_has_table('service_workflow_audit') THEN
    INSERT INTO b1_eval VALUES ('A4', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'service_workflow_audit'
      AND column_name IN ('actor_id', 'actor', 'actor_uid')) INTO v_actor;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'service_workflow_audit'
      AND data_type IN ('timestamp with time zone', 'timestamp without time zone')) INTO v_ts;
  PERFORM b1_note('A4', v_actor AND v_ts, 'actor+time present');
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('A4', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- V6 visit cannot start on unassigned job.
DO $$
DECLARE v_j uuid; v_v uuid; v_denied boolean := false;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_table('service_job_visits')
      AND b1_has_func('create_service_job_visit') AND b1_has_func('govern_visit_transition')) THEN
    INSERT INTO b1_eval VALUES ('V6', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('V6', true);
  SELECT (public.create_service_job_visit(v_j, 'v6', NULL)).id INTO v_v;
  BEGIN PERFORM public.govern_visit_transition(v_v, 'in_progress', 'v6', NULL);
  EXCEPTION WHEN OTHERS THEN v_denied := (SQLSTATE <> '42883'); END;
  PERFORM b1_note('V6', v_denied AND b1_state('service_jobs', v_j) = 'unassigned',
    'unassigned start denied');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('V6', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('V6', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;


-- X4 workflow activation survives job cancel (no silent bypass restore).
DO $$
DECLARE v_t uuid; v_j uuid; v_act timestamptz; v_err text := '';
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('create_service_job')) THEN
    INSERT INTO b1_eval VALUES ('X4', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-X4');
  PERFORM public.govern_ticket_transition(v_t, 'assigned', 'x4', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'in_progress', 'x4', NULL);
  SELECT (public.create_service_job(v_t, 'only', true, 'x4')).id INTO v_j;
  PERFORM public.govern_job_transition(v_j, 'planned', 'x4', NULL);
  PERFORM public.govern_job_transition(v_j, 'cancelled', 'abandon', NULL);
  SELECT workflow_activated_at INTO v_act FROM public.service_tickets WHERE id = v_t;
  BEGIN PERFORM public.govern_ticket_transition(v_t, 'resolved', 'x4', 'try');
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  PERFORM b1_note('X4', v_act IS NOT NULL AND v_err ILIKE '%required_job_unsatisfied%',
    left(coalesce(v_err,'none'), 160));
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('X4', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- X5 free resolved→in_progress via govern_ticket_transition denied (only job create).
DO $$
DECLARE v_t uuid; v_denied boolean := false; v_s text;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-X5');
  PERFORM public.govern_ticket_transition(v_t, 'assigned', 'x5', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'in_progress', 'x5', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'resolved', 'x5', 'done');
  BEGIN PERFORM public.govern_ticket_transition(v_t, 'in_progress', 'x5', NULL);
  EXCEPTION WHEN check_violation THEN v_denied := true; END;
  SELECT status INTO v_s FROM public.service_tickets WHERE id = v_t;
  PERFORM b1_note('X5', v_denied AND v_s = 'resolved', 'free edge denied');
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('X5', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- I1 submit/review/ack RPCs must be absent (no executable placeholder success).
DO $$
BEGIN
  PERFORM b1_note('I1',
    NOT b1_has_func('submit_service_report')
    AND NOT b1_has_func('review_service_report')
    AND NOT b1_has_func('record_acknowledgment'),
    'B4/B5/B6 RPCs absent');
END $$;

SELECT check_id, status, detail FROM b1_eval ORDER BY check_id;
SELECT COUNT(*) FILTER (WHERE status='PASS') AS pass, COUNT(*) FILTER (WHERE status='FAIL') AS fail, COUNT(*) FILTER (WHERE status='SKIP') AS skip FROM b1_eval;
