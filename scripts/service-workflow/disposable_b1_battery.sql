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

-- C7 FSM parity: B1 matrix (resolved→in_progress added for governed add-back;
-- free govern of that edge is denied separately by X5). Reflexive-true documented.
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

-- D-B3-01 fixture helper: first visit start requires ticket status assigned.
CREATE OR REPLACE FUNCTION b1_arm_ticket_for_visit(p_job uuid, p_tech uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_ticket uuid; v_tech uuid := COALESCE(p_tech, b1_uid('tech1'));
BEGIN
  SELECT ticket_id INTO v_ticket FROM public.service_jobs WHERE id = p_job;
  UPDATE public.service_tickets
  SET status = 'assigned',
      assigned_to = COALESCE(assigned_to, v_tech),
      assigned_by = COALESCE(assigned_by, b1_uid('support')),
      assigned_at = COALESCE(assigned_at, now()),
      updated_at = now()
  WHERE id = v_ticket AND status = 'open';
END $$;

-- State-column name discovery (state preferred, status fallback).
CREATE OR REPLACE FUNCTION b1_statecol(p_table text) RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT column_name FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = p_table
     AND column_name IN ('state', 'status') ORDER BY column_name LIMIT 1;
$$;
-- Single-column parent-FK discovery: returns (column, referenced_table).
CREATE OR REPLACE FUNCTION b1_parent_fk(p_table text, p_parent text,
  OUT p_col text, OUT p_found boolean)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  SELECT a.attname, true INTO p_col, p_found
    FROM pg_constraint c
    JOIN pg_class ch ON ch.oid = c.conrelid
    JOIN pg_class pa ON pa.oid = c.confrelid
    JOIN pg_attribute a ON a.attrelid = ch.oid AND a.attnum = c.conkey[1]
   WHERE c.contype = 'f' AND ch.relname = p_table AND pa.relname = p_parent
     AND array_length(c.conkey, 1) = 1 LIMIT 1;
  IF NOT FOUND THEN p_col := NULL; p_found := false; END IF;
END $$;
-- Generic fixture setup: id-PK tables; single-col FKs from p_parents
-- (keyed by referenced table); other NOT NULL no-default cols get
-- type-plausible values. p_overrides maps column -> raw SQL fragment
-- (test-only; for CHECK-constrained literals). Raises when it cannot
-- (caller SKIP-fallback).
CREATE OR REPLACE FUNCTION b1_fixture(p_table text, p_parents jsonb DEFAULT '{}',
  p_overrides jsonb DEFAULT '{}')
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  r record; cols text[] := '{}'; vals text[] := '{}'; v_sql text; v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = p_table AND column_name = 'id') THEN
    RAISE EXCEPTION 'fixture needs id PK on %', p_table;
  END IF;
  FOR r IN SELECT a.attname AS col, format_type(a.atttypid, a.atttypmod) AS typ,
                  NOT a.attnotnull AS nullable,
                  (pg_get_expr(ad.adbin, ad.adrelid) IS NOT NULL) AS hasdef,
                  (SELECT pa.relname FROM pg_constraint c2 JOIN pg_class pa ON pa.oid = c2.confrelid
                    WHERE c2.contype = 'f' AND c2.conrelid = ('public.' || p_table)::regclass
                      AND c2.conkey = ARRAY[a.attnum]) AS fk_parent
             FROM pg_attribute a LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
            WHERE a.attrelid = ('public.' || p_table)::regclass AND a.attnum > 0 AND NOT a.attisdropped
  LOOP
    IF r.col = 'id' THEN CONTINUE; END IF;
    IF p_overrides ? r.col THEN
      cols := cols || quote_ident(r.col);
      vals := vals || (p_overrides ->> r.col);
      CONTINUE;
    END IF;
    IF r.fk_parent IS NOT NULL THEN
      IF NOT (p_parents ? r.fk_parent) THEN
        RAISE EXCEPTION 'fixture % needs parent %', p_table, r.fk_parent;
      END IF;
      cols := cols || quote_ident(r.col);
      vals := vals || quote_literal(p_parents ->> r.fk_parent);
    ELSIF NOT r.nullable AND NOT r.hasdef THEN
      cols := cols || quote_ident(r.col);
      vals := vals || CASE
        WHEN r.typ LIKE '%char%' OR r.typ = 'text' THEN quote_literal('')
        WHEN r.typ = 'boolean' THEN 'true'
        WHEN r.typ IN ('integer', 'bigint', 'smallint', 'numeric', 'double precision', 'real') THEN '0'
        WHEN r.typ LIKE 'timestamp%' THEN 'now()'
        WHEN r.typ = 'date' THEN 'CURRENT_DATE'
        WHEN r.typ = 'jsonb' OR r.typ = 'json' THEN quote_literal('{}')
        WHEN r.typ = 'uuid' THEN 'gen_random_uuid()'
        ELSE quote_literal('') END;
    END IF;
  END LOOP;
  v_sql := format('INSERT INTO public.%I (%s) VALUES (%s) RETURNING id',
                  p_table, array_to_string(cols, ', '), array_to_string(vals, ', '));
  EXECUTE v_sql INTO v_id;
  RETURN v_id;
END $$;

-- Approved-report chain via RPC visits + fixtures. Job must be non-unassigned
-- (visit start rule). Returns the approved revision id.
CREATE OR REPLACE FUNCTION b1_approved_chain(p_job uuid) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE v_v uuid; v_r uuid; v_rev uuid; v_rw uuid; v_par uuid; v_assignee uuid;
  v_ticket uuid; v_tstatus text;
BEGIN
  v_par := b1_uid('support');
  -- B3: visit start requires a current job assignee. Assign without changing
  -- non-unassigned job state so J1/J2 completion assertions stay intact.
  SELECT assigned_technician_id, ticket_id INTO v_assignee, v_ticket
    FROM public.service_jobs WHERE id = p_job;
  IF v_assignee IS NULL THEN
    PERFORM public.assign_service_job(p_job, b1_uid('tech1'), 'chain-assign', NULL);
  END IF;
  -- D-B3-01: first visit start expects ticket assigned (or already in_progress).
  SELECT status INTO v_tstatus FROM public.service_tickets WHERE id = v_ticket;
  IF v_tstatus = 'open' THEN
    UPDATE public.service_tickets
    SET status = 'assigned',
        assigned_to = COALESCE(assigned_to, b1_uid('tech1')),
        assigned_by = COALESCE(assigned_by, b1_uid('support')),
        assigned_at = COALESCE(assigned_at, now()),
        updated_at = now()
    WHERE id = v_ticket;
  END IF;
  SELECT (public.create_service_job_visit(p_job, 'chain', NULL)).id INTO v_v;
  PERFORM public.govern_visit_transition(v_v, 'in_progress', 'chain', NULL);
  PERFORM public.govern_visit_transition(v_v, 'completed', 'chain', NULL);
  v_r := b1_fixture('service_reports',
    jsonb_build_object('service_job_visits', v_v::text, 'users', v_par::text));
  v_rev := b1_fixture('service_report_revisions',
    jsonb_build_object('service_reports', v_r::text, 'users', v_par::text),
    jsonb_build_object('revision_number', '1', 'verification_outcome', '''verified_fixed'''));
  v_rw := b1_fixture('service_report_reviews',
    jsonb_build_object('service_report_revisions', v_rev::text, 'users', v_par::text),
    jsonb_build_object('decision', '''approved_issued'''));
  RETURN v_rev;
END $$;

-- J1 legal job walk: bare completion denied without approved report (spec 6.3);
-- completes with an approved issued report chain + completing_revision_id set.
DO $$
DECLARE v_j uuid; v_rev uuid; v_cr uuid; v_bare boolean := false; v_has_cr boolean;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('create_service_job')
      AND b1_has_func('govern_job_transition')) THEN
    INSERT INTO b1_eval VALUES ('J1', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('J1', true);
  IF b1_state('service_jobs', v_j) <> 'unassigned' THEN
    PERFORM b1_note('J1', false, 'initial state not unassigned'); RETURN;
  END IF;
  PERFORM public.govern_job_transition(v_j, 'planned', 'j1', NULL);
  PERFORM public.govern_job_transition(v_j, 'in_progress', 'j1', NULL);
  PERFORM public.govern_job_transition(v_j, 'awaiting_review', 'j1', NULL);
  BEGIN PERFORM public.govern_job_transition(v_j, 'completed', 'j1', NULL);
  EXCEPTION WHEN check_violation THEN
    v_bare := (SQLERRM ILIKE '%approved%issued%report%');
  END;
  IF NOT v_bare THEN
    PERFORM b1_note('J1', false, 'bare completion not denied with report reason'); RETURN;
  END IF;
  BEGIN
    v_rev := b1_approved_chain(v_j);
  EXCEPTION WHEN OTHERS THEN
    PERFORM b1_note('J1', false, 'approved_chain: ' || left(SQLERRM, 200));
    RETURN;
  END;
  PERFORM public.govern_job_transition(v_j, 'completed', 'j1', NULL);
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'service_jobs'
      AND column_name = 'completing_revision_id') INTO v_has_cr;
  IF v_has_cr THEN
    EXECUTE 'SELECT completing_revision_id FROM public.service_jobs WHERE id = $1'
      INTO v_cr USING v_j;
  END IF;
  PERFORM b1_note('J1', b1_state('service_jobs', v_j) = 'completed'
    AND (NOT v_has_cr OR v_cr = v_rev), 'walk + gated completion');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('J1', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('J1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- J2 illegal job jumps denied; completed terminal.
DO $$
DECLARE v_j uuid; v_bad boolean := false; v_term boolean := false;
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
  PERFORM public.govern_job_transition(v_j, 'awaiting_review', 'j2', NULL);
  BEGIN
    PERFORM b1_approved_chain(v_j);
  EXCEPTION WHEN OTHERS THEN
    PERFORM b1_note('J2', false, 'approved_chain: ' || left(SQLERRM, 200));
    RETURN;
  END;
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

-- V1 legal visit walk with B2 assignee (required for B3 start authority).
DO $$
DECLARE v_j uuid; v_v uuid; v_ok boolean := true;
BEGIN
  IF NOT (b1_has_table('service_job_visits') AND b1_has_func('create_service_job_visit')
      AND b1_has_func('govern_visit_transition') AND b1_has_func('assign_service_job')) THEN
    INSERT INTO b1_eval VALUES ('V1', 'SKIP', 'pending B1/B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('V1', true);
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'v1', NULL);
  PERFORM b1_arm_ticket_for_visit(v_j);
  SELECT (public.create_service_job_visit(v_j, 'v1', NULL)).id INTO v_v;
  PERFORM public.govern_visit_transition(v_v, 'in_progress', 'v1', NULL);
  PERFORM public.govern_visit_transition(v_v, 'completed', 'v1', NULL);
  v_ok := b1_state('service_job_visits', v_v) = 'completed';
  PERFORM b1_note('V1', v_ok, 'visit walk ok with assignee');
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

-- V5 reschedule appends history (B3 RPCs); same-window idempotent; terminal blocked.
DO $$
DECLARE
  v_j uuid; v_v uuid; v_hist int; v_hist2 int; v_term boolean := false;
  v_start timestamptz := now() + interval '2 hours';
  v_end timestamptz := now() + interval '4 hours';
BEGIN
  IF NOT (b1_has_func('schedule_service_job_visit')
      AND b1_has_func('reschedule_service_job_visit')
      AND b1_has_table('service_job_visit_schedule_history')) THEN
    INSERT INTO b1_eval VALUES ('V5', 'SKIP', 'pending B3 schedule RPCs'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('V5', true);
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'v5', NULL);
  SELECT (public.schedule_service_job_visit(v_j, v_start, v_end, 'v5-win', NULL)).id INTO v_v;
  SELECT count(*) INTO v_hist FROM public.service_job_visit_schedule_history WHERE visit_id = v_v;
  PERFORM public.reschedule_service_job_visit(
    v_v, v_start + interval '30 min', v_end + interval '30 min', 'v5-rs', NULL);
  SELECT count(*) INTO v_hist FROM public.service_job_visit_schedule_history WHERE visit_id = v_v;
  PERFORM public.reschedule_service_job_visit(
    v_v, v_start + interval '30 min', v_end + interval '30 min', 'v5-rs-dup', NULL);
  SELECT count(*) INTO v_hist2 FROM public.service_job_visit_schedule_history WHERE visit_id = v_v;
  PERFORM public.govern_visit_transition(v_v, 'aborted', 'v5-stop', NULL);
  BEGIN
    PERFORM public.reschedule_service_job_visit(v_v, v_start, v_end, 'v5-term', NULL);
  EXCEPTION WHEN OTHERS THEN v_term := true; END;
  PERFORM b1_note('V5', v_hist = 2 AND v_hist2 = 2 AND v_term,
    'hist=' || v_hist || ' idem=' || v_hist2 || ' term_blocked=' || v_term);
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('V5', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('V5', false, SQLSTATE || ' ' || left(SQLERRM, 200));
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

-- R2 submitted revision UPDATE/DELETE denied (fixture setup; required B1).
DO $$
DECLARE v_j uuid; v_v uuid; v_r uuid; v_rev uuid; v_parents jsonb;
  v_upd boolean := false; v_del boolean := false; v_n int;
BEGIN
  IF NOT (b1_has_table('service_report_revisions') AND b1_has_table('service_reports')) THEN
    INSERT INTO b1_eval VALUES ('R2', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  IF NOT (b1_has_func('create_service_job') AND b1_has_func('create_service_job_visit')) THEN
    INSERT INTO b1_eval VALUES ('R2', 'SKIP', 'needs B1 create RPCs'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('R2', true);
  SELECT (public.create_service_job_visit(v_j, 'r2', NULL)).id INTO v_v;
  BEGIN
    v_parents := jsonb_build_object('service_job_visits', v_v::text,
      'users', b1_uid('support')::text);
    v_r := b1_fixture('service_reports', v_parents);
    v_parents := v_parents || jsonb_build_object('service_reports', v_r::text);
    v_rev := b1_fixture('service_report_revisions', v_parents,
      jsonb_build_object('revision_number', '1',
        'verification_outcome', '''not_verified'''));
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO b1_eval VALUES ('R2', 'SKIP', 'needs column map: ' || left(SQLERRM, 160));
    RETURN;
  END;
  SET ROLE b1_auth;
  BEGIN EXECUTE 'UPDATE public.service_report_revisions SET id = id WHERE id = ' || quote_literal(v_rev);
  EXCEPTION WHEN OTHERS THEN v_upd := true; END;
  BEGIN EXECUTE 'DELETE FROM public.service_report_revisions WHERE id = ' || quote_literal(v_rev);
  EXCEPTION WHEN OTHERS THEN v_del := true; END;
  RESET ROLE;
  EXECUTE 'SELECT count(*) FROM public.service_report_revisions WHERE id = ' || quote_literal(v_rev) INTO v_n;
  PERFORM b1_note('R2', v_upd AND v_del AND v_n = 1, 'revision immutable');
EXCEPTION WHEN OTHERS THEN
  BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM b1_note('R2', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- R3 one review decides a revision; author + non-manager review denied (B5; deferred).
DO $$
BEGIN
  INSERT INTO b1_eval VALUES ('R3', 'DEFER', 'B5 behavior; explicitly untested');
END $$;

-- R4 further_work_required blocks job completion (B5; deferred).
DO $$
BEGIN
  INSERT INTO b1_eval VALUES ('R4', 'DEFER', 'B5 behavior; explicitly untested');
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
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'service_jobs' AND c.contype IN ('u', 'p')
      AND array_length(c.conkey, 1) = 1 AND c.conkey[1] = (
        SELECT attnum FROM pg_attribute
        WHERE attrelid = t.oid AND attname = (
          SELECT a2.attname FROM pg_constraint c2
          JOIN pg_class pa ON pa.oid = c2.confrelid
          JOIN pg_attribute a2 ON a2.attrelid = t.oid AND a2.attnum = c2.conkey[1]
          WHERE c2.contype = 'f' AND c2.conrelid = t.oid AND pa.relname = 'service_tickets'
            AND array_length(c2.conkey, 1) = 1 LIMIT 1))
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

-- M4 one report per completed visit (B4; deferred).
DO $$
BEGIN
  INSERT INTO b1_eval VALUES ('M4', 'DEFER', 'B4 behavior; explicitly untested');
END $$;

-- M5 completion governed by latest approved report (B5; deferred).
DO $$
BEGIN
  INSERT INTO b1_eval VALUES ('M5', 'DEFER', 'B5 behavior; explicitly untested');
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

-- X3 unimplemented prerequisites fail closed: resolve with unsatisfied jobs is
-- denied naming the job (never generic, never silently allowed), including
-- after an add-back move.
DO $$
DECLARE v_t uuid; v_j uuid; v_s text; v_a boolean := false; v_b boolean := false;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('create_service_job')) THEN
    INSERT INTO b1_eval VALUES ('X3', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-X3');
  PERFORM public.govern_ticket_transition(v_t, 'assigned', 'x3', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'in_progress', 'x3', NULL);
  SELECT (public.create_service_job(v_t, 'req', true, 'x3')).id INTO v_j;
  BEGIN PERFORM public.govern_ticket_transition(v_t, 'resolved', 'x3', 'try');
  EXCEPTION WHEN OTHERS THEN
    v_a := (SQLERRM ILIKE '%job%') AND (SQLERRM NOT ILIKE '%cannot close%');
  END;
  SELECT status INTO v_s FROM public.service_tickets WHERE id = v_t;
  IF v_s = 'in_progress' THEN
    -- Force the add-back shape: resolve is impossible here, so emulate the
    -- second denial on a resolved-then-add-back ticket instead.
    DECLARE v_t2 uuid; v_j2 uuid; v_s2 text;
    BEGIN
      v_t2 := b1_mkticket('cust1', 'B1-X3B');
      PERFORM public.govern_ticket_transition(v_t2, 'assigned', 'x3', NULL);
      PERFORM public.govern_ticket_transition(v_t2, 'in_progress', 'x3', NULL);
      PERFORM public.govern_ticket_transition(v_t2, 'resolved', 'x3', 'done');
      SELECT (public.create_service_job(v_t2, 'extra', true, 'x3')).id INTO v_j2;
      SELECT status INTO v_s2 FROM public.service_tickets WHERE id = v_t2;
      IF v_s2 = 'in_progress' THEN
        BEGIN PERFORM public.govern_ticket_transition(v_t2, 'resolved', 'x3', 'again');
        EXCEPTION WHEN OTHERS THEN
          v_b := (SQLERRM ILIKE '%job%') AND (SQLERRM NOT ILIKE '%cannot close%');
        END;
      END IF;
    END;
  END IF;
  PERFORM b1_note('X3', v_a AND v_b, 'fail-closed + named, incl. add-back');
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

-- P1 relationship fields immutable; state changes via RPC only (non-owner denied).
DO $$
DECLARE v_t1 uuid; v_t2 uuid; v_j uuid; v_j2 uuid; v_v uuid; v_jcol text; v_jfound boolean;
  v_vcol text; v_vfound boolean; v_scol text; v_d1 boolean := false;
  v_d2 boolean := false; v_d3 boolean := false; v_same1 text; v_same2 text;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_table('service_job_visits')
      AND b1_has_func('create_service_job') AND b1_has_func('create_service_job_visit')) THEN
    INSERT INTO b1_eval VALUES ('P1', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  SELECT * INTO v_jcol, v_jfound FROM b1_parent_fk('service_jobs', 'service_tickets');
  SELECT * INTO v_vcol, v_vfound FROM b1_parent_fk('service_job_visits', 'service_jobs');
  v_scol := b1_statecol('service_jobs');
  IF NOT (v_jfound AND v_vfound) OR v_scol IS NULL THEN
    PERFORM b1_note('P1', false, 'missing parent FK or state column'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t1 := b1_mkticket('cust1', 'B1-P1A');
  v_t2 := b1_mkticket('cust1', 'B1-P1B');
  SELECT (public.create_service_job(v_t1, 'p1', true, 'p1')).id INTO v_j;
  SELECT (public.create_service_job(v_t1, 'p1b', true, 'p1')).id INTO v_j2;
  SELECT (public.create_service_job_visit(v_j, 'p1', NULL)).id INTO v_v;
  SET ROLE b1_auth;
  BEGIN EXECUTE format('UPDATE public.service_jobs SET %I = $1 WHERE id = $2', v_jcol)
    USING v_t2, v_j;
  EXCEPTION WHEN OTHERS THEN v_d1 := true; END;
  BEGIN EXECUTE format('UPDATE public.service_job_visits SET %I = $1 WHERE id = $2', v_vcol)
    USING v_j2, v_v;
  EXCEPTION WHEN OTHERS THEN v_d2 := true; END;
  BEGIN EXECUTE format('UPDATE public.service_jobs SET %I = ''completed'' WHERE id = $1', v_scol)
    USING v_j;
  EXCEPTION WHEN OTHERS THEN v_d3 := true; END;
  RESET ROLE;
  EXECUTE format('SELECT %I::text FROM public.service_jobs WHERE id = $1', v_jcol)
    INTO v_same1 USING v_j;
  EXECUTE format('SELECT %I::text FROM public.service_jobs WHERE id = $1', v_scol)
    INTO v_same2 USING v_j;
  PERFORM b1_note('P1', v_d1 AND v_d2 AND v_d3 AND v_same1 = v_t1::text
    AND v_same2 = 'unassigned', 'parents+state protected');
EXCEPTION WHEN OTHERS THEN
  BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM b1_note('P1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- P2 customer/sales/unauthenticated denied all job/visit transitions.
DO $$
DECLARE v_j uuid; v_v uuid; v_c boolean := false; v_s boolean := false;
  v_u boolean := false; v_cv boolean := false;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_table('service_job_visits')
      AND b1_has_func('create_service_job') AND b1_has_func('create_service_job_visit')
      AND b1_has_func('govern_job_transition') AND b1_has_func('govern_visit_transition')) THEN
    INSERT INTO b1_eval VALUES ('P2', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('P2', true);
  SELECT (public.create_service_job_visit(v_j, 'p2', NULL)).id INTO v_v;
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  BEGIN PERFORM public.govern_job_transition(v_j, 'planned', 'p2', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_c := true; END;
  BEGIN PERFORM public.govern_visit_transition(v_v, 'in_progress', 'p2', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_cv := true; END;
  PERFORM set_config('app.b1_uid', b1_uid('sales')::text, false);
  BEGIN PERFORM public.govern_job_transition(v_j, 'planned', 'p2', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_s := true; END;
  RESET app.b1_uid;
  BEGIN PERFORM public.govern_job_transition(v_j, 'planned', 'p2', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_u := true; END;
  PERFORM b1_note('P2', v_c AND v_cv AND v_s AND v_u, 'no customer/sales/anon agency');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('P2', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('P2', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- F1 forged p_actor_id denied on B1 RPCs.
DO $$
DECLARE v_j uuid; v_g boolean := false; v_w boolean := false;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('create_service_job')
      AND b1_has_func('govern_job_transition') AND b1_has_func('waive_service_job')) THEN
    INSERT INTO b1_eval VALUES ('F1', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('F1', true);
  BEGIN PERFORM public.govern_job_transition(v_j, 'planned', 'f1', b1_uid('admin'));
  EXCEPTION WHEN SQLSTATE '42501' THEN v_g := true; END;
  BEGIN PERFORM public.waive_service_job(v_j, 'f1', b1_uid('admin'));
  EXCEPTION WHEN SQLSTATE '42501' THEN v_w := true; END;
  PERFORM b1_note('F1', v_g AND v_w AND b1_state('service_jobs', v_j) = 'unassigned',
    'impersonation denied');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('F1', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('F1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- CC1 cross-customer parent/child writes denied.
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid; v_own boolean := false; v_oth boolean := false;
  v_tch boolean := false; v_mk boolean := false;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_table('service_job_visits')
      AND b1_has_func('create_service_job') AND b1_has_func('create_service_job_visit')
      AND b1_has_func('govern_job_transition')) THEN
    INSERT INTO b1_eval VALUES ('CC1', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-CC1');
  SELECT (public.create_service_job(v_t, 'cc1', true, 'cc1')).id INTO v_j;
  SELECT (public.create_service_job_visit(v_j, 'cc1', NULL)).id INTO v_v;
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  BEGIN PERFORM public.govern_job_transition(v_j, 'planned', 'cc1', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_own := true; END;
  PERFORM set_config('app.b1_uid', b1_uid('cust2')::text, false);
  BEGIN PERFORM public.govern_job_transition(v_j, 'planned', 'cc1', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_oth := true; END;
  BEGIN PERFORM public.create_service_job(v_t, 'foreign', true, 'cc1');
  EXCEPTION WHEN SQLSTATE '42501' THEN v_mk := true; END;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  BEGIN PERFORM public.govern_job_transition(v_j, 'planned', 'cc1', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_tch := true; END;
  PERFORM b1_note('CC1', v_own AND v_oth AND v_mk AND v_tch, 'customer boundary holds');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('CC1', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('CC1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- X1b atomic add-back: closed-ticket required-job creation fails with no row.
DO $$
DECLARE v_t uuid; v_n0 int; v_n1 int; v_err boolean := false; v_a0 int; v_a1 int;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('create_service_job')) THEN
    INSERT INTO b1_eval VALUES ('X1b', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-X1B');
  PERFORM public.govern_ticket_transition(v_t, 'assigned', 'x1b', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'in_progress', 'x1b', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'resolved', 'x1b', 'done');
  PERFORM public.govern_ticket_transition(v_t, 'closed', 'x1b', NULL);
  SELECT count(*) INTO v_n0 FROM public.service_jobs;
  v_a0 := b1_audit_n(v_t);
  BEGIN PERFORM public.create_service_job(v_t, 'late', true, 'x1b');
  EXCEPTION WHEN OTHERS THEN v_err := true; END;
  SELECT count(*) INTO v_n1 FROM public.service_jobs;
  v_a1 := b1_audit_n(v_t);
  PERFORM b1_note('X1b', v_err AND v_n0 = v_n1 AND v_a0 = v_a1, 'all-or-nothing');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('X1b', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('X1b', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- X4 workflow-ticket bypass denial: direct ticket RPC cannot resolve past jobs;
-- the denied attempt leaves state and audit unchanged.
DO $$
DECLARE v_t uuid; v_j uuid; v_r boolean := false; v_s text; v_a0 int; v_a1 int;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('create_service_job')) THEN
    INSERT INTO b1_eval VALUES ('X4', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-X4');
  PERFORM public.govern_ticket_transition(v_t, 'assigned', 'x4', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'in_progress', 'x4', NULL);
  SELECT (public.create_service_job(v_t, 'req', true, 'x4')).id INTO v_j;
  v_a0 := b1_audit_n(v_t);
  BEGIN PERFORM public.govern_ticket_transition(v_t, 'resolved', 'x4', 'bypass?');
  EXCEPTION WHEN OTHERS THEN v_r := (SQLERRM ILIKE '%job%'); END;
  SELECT status INTO v_s FROM public.service_tickets WHERE id = v_t;
  v_a1 := b1_audit_n(v_t);
  PERFORM b1_note('X4', v_r AND v_s = 'in_progress' AND v_a0 = v_a1,
    'resolve names the job blocker, no trace');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('X4', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('X4', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- A5 B1 audit rows immutable (fixture-produced row).
DO $$
DECLARE v_j uuid; v_upd boolean := false; v_del boolean := false; v_n0 int; v_n1 int;
  v_acol text;
BEGIN
  IF NOT (b1_has_table('service_workflow_audit') AND b1_has_table('service_jobs')
      AND b1_has_func('create_service_job') AND b1_has_func('govern_job_transition')) THEN
    INSERT INTO b1_eval VALUES ('A5', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  SELECT column_name INTO v_acol FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'service_workflow_audit'
     AND column_name IN ('actor_id', 'actor', 'actor_uid') LIMIT 1;
  IF v_acol IS NULL THEN
    PERFORM b1_note('A5', false, 'no actor column on audit'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('A5', true);
  PERFORM public.govern_job_transition(v_j, 'planned', 'a5', NULL);
  SELECT count(*) INTO v_n0 FROM public.service_workflow_audit;
  SET ROLE b1_auth;
  BEGIN EXECUTE format('UPDATE public.service_workflow_audit SET %I = %I WHERE %I = $1',
                       v_acol, v_acol, v_acol) USING b1_uid('support');
  EXCEPTION WHEN OTHERS THEN v_upd := true; END;
  BEGIN EXECUTE format('DELETE FROM public.service_workflow_audit WHERE %I = $1', v_acol)
    USING b1_uid('support');
  EXCEPTION WHEN OTHERS THEN v_del := true; END;
  RESET ROLE;
  SELECT count(*) INTO v_n1 FROM public.service_workflow_audit;
  PERFORM b1_note('A5', v_upd AND v_del AND v_n0 = v_n1 AND v_n0 >= 1, 'audit immutable');
EXCEPTION WHEN OTHERS THEN
  BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM b1_note('A5', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- RV1 reviews append-only where the table exists (fixture setup).
DO $$
DECLARE v_j uuid; v_v uuid; v_r uuid; v_rev uuid; v_rw uuid; v_parents jsonb;
  v_upd boolean := false; v_del boolean := false; v_n int;
BEGIN
  IF NOT b1_has_table('service_report_reviews') THEN
    INSERT INTO b1_eval VALUES ('RV1', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  IF NOT (b1_has_func('create_service_job') AND b1_has_func('create_service_job_visit')
      AND b1_has_table('service_reports') AND b1_has_table('service_report_revisions')) THEN
    INSERT INTO b1_eval VALUES ('RV1', 'SKIP', 'needs B1 create RPCs'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('RV1', true);
  SELECT (public.create_service_job_visit(v_j, 'rv1', NULL)).id INTO v_v;
  BEGIN
    v_parents := jsonb_build_object('service_job_visits', v_v::text,
      'users', b1_uid('support')::text);
    v_r := b1_fixture('service_reports', v_parents);
    v_parents := v_parents || jsonb_build_object('service_reports', v_r::text);
    v_rev := b1_fixture('service_report_revisions', v_parents,
      jsonb_build_object('revision_number', '1',
        'verification_outcome', '''not_verified'''));
    v_parents := v_parents || jsonb_build_object('service_report_revisions', v_rev::text);
    v_rw := b1_fixture('service_report_reviews', v_parents,
      jsonb_build_object('decision', '''returned'''));
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO b1_eval VALUES ('RV1', 'SKIP', 'needs column map: ' || left(SQLERRM, 160));
    RETURN;
  END;
  SET ROLE b1_auth;
  BEGIN EXECUTE 'UPDATE public.service_report_reviews SET id = id WHERE id = ' || quote_literal(v_rw);
  EXCEPTION WHEN OTHERS THEN v_upd := true; END;
  BEGIN EXECUTE 'DELETE FROM public.service_report_reviews WHERE id = ' || quote_literal(v_rw);
  EXCEPTION WHEN OTHERS THEN v_del := true; END;
  RESET ROLE;
  EXECUTE 'SELECT count(*) FROM public.service_report_reviews WHERE id = ' || quote_literal(v_rw) INTO v_n;
  PERFORM b1_note('RV1', v_upd AND v_del AND v_n = 1, 'reviews append-only');
EXCEPTION WHEN OTHERS THEN
  BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM b1_note('RV1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- ACK1 acknowledgments append-only where the table exists (fixture setup).
DO $$
DECLARE v_j uuid; v_v uuid; v_r uuid; v_rev uuid; v_ack uuid; v_parents jsonb;
  v_upd boolean := false; v_del boolean := false; v_n int;
BEGIN
  IF NOT b1_has_table('service_acknowledgments') THEN
    INSERT INTO b1_eval VALUES ('ACK1', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  IF NOT (b1_has_func('create_service_job') AND b1_has_func('create_service_job_visit')
      AND b1_has_table('service_reports') AND b1_has_table('service_report_revisions')) THEN
    INSERT INTO b1_eval VALUES ('ACK1', 'SKIP', 'needs B1 create RPCs'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('A1K', true);
  SELECT (public.create_service_job_visit(v_j, 'ack1', NULL)).id INTO v_v;
  BEGIN
    v_parents := jsonb_build_object('service_job_visits', v_v::text,
      'users', b1_uid('support')::text);
    v_r := b1_fixture('service_reports', v_parents);
    v_parents := v_parents || jsonb_build_object('service_reports', v_r::text);
    v_rev := b1_fixture('service_report_revisions', v_parents,
      jsonb_build_object('revision_number', '1',
        'verification_outcome', '''verified_fixed'''));
    v_parents := v_parents || jsonb_build_object('service_report_revisions', v_rev::text);
    v_ack := b1_fixture('service_acknowledgments', v_parents,
      jsonb_build_object('response', '''accepted'''));
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO b1_eval VALUES ('ACK1', 'SKIP', 'needs column map: ' || left(SQLERRM, 160));
    RETURN;
  END;
  SET ROLE b1_auth;
  BEGIN EXECUTE 'UPDATE public.service_acknowledgments SET id = id WHERE id = ' || quote_literal(v_ack);
  EXCEPTION WHEN OTHERS THEN v_upd := true; END;
  BEGIN EXECUTE 'DELETE FROM public.service_acknowledgments WHERE id = ' || quote_literal(v_ack);
  EXCEPTION WHEN OTHERS THEN v_del := true; END;
  RESET ROLE;
  EXECUTE 'SELECT count(*) FROM public.service_acknowledgments WHERE id = ' || quote_literal(v_ack) INTO v_n;
  PERFORM b1_note('ACK1', v_upd AND v_del AND v_n = 1, 'acks append-only');
EXCEPTION WHEN OTHERS THEN
  BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM b1_note('ACK1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- X5 free resolved→in_progress govern denied (add-back only via job creation).
DO $$
DECLARE v_t uuid; v_denied boolean := false; v_s text; v_a0 int; v_a1 int;
BEGIN
  IF NOT public.is_valid_ticket_status_transition('resolved', 'in_progress') THEN
    INSERT INTO b1_eval VALUES ('X5', 'SKIP', 'needs B1 FSM extension'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-X5');
  PERFORM public.govern_ticket_transition(v_t, 'assigned', 'x5', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'in_progress', 'x5', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'resolved', 'x5', 'done');
  v_a0 := b1_audit_n(v_t);
  BEGIN PERFORM public.govern_ticket_transition(v_t, 'in_progress', 'x5', NULL);
  EXCEPTION WHEN check_violation THEN
    v_denied := (SQLERRM ILIKE '%job creation%');
  END;
  SELECT status INTO v_s FROM public.service_tickets WHERE id = v_t;
  v_a1 := b1_audit_n(v_t);
  PERFORM b1_note('X5', v_denied AND v_s = 'resolved' AND v_a0 = v_a1,
    'free add-back denied');
EXCEPTION WHEN OTHERS THEN
  PERFORM b1_note('X5', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- X6 bulk resolve across jobless + activated tickets: partial, activated denied+named.
DO $$
DECLARE v_ok uuid; v_act uuid; v_j uuid; v_res text; s_ok text; s_act text;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('create_service_job')) THEN
    INSERT INTO b1_eval VALUES ('X6', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_ok := b1_mkticket('cust1', 'B1-X6A');
  PERFORM public.govern_ticket_transition(v_ok, 'assigned', 'x6', NULL);
  PERFORM public.govern_ticket_transition(v_ok, 'in_progress', 'x6', NULL);
  v_act := b1_mkticket('cust1', 'B1-X6B');
  PERFORM public.govern_ticket_transition(v_act, 'assigned', 'x6', NULL);
  PERFORM public.govern_ticket_transition(v_act, 'in_progress', 'x6', NULL);
  SELECT (public.create_service_job(v_act, 'req', true, 'x6')).id INTO v_j;
  SELECT public.govern_ticket_bulk_transition(ARRAY[v_ok, v_act], 'resolved', 'x6', 'bulk')
    ::text INTO v_res;
  SELECT status INTO s_ok FROM public.service_tickets WHERE id = v_ok;
  SELECT status INTO s_act FROM public.service_tickets WHERE id = v_act;
  PERFORM b1_note('X6', s_ok = 'resolved' AND s_act = 'in_progress'
    AND v_res ILIKE '%job%', 'bulk partial honors gate: ' || left(v_res, 140));
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('X6', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('X6', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- W1 activation timestamp cannot be cleared by ordinary client updates.
DO $$
DECLARE v_t uuid; v_j uuid; v_cleared boolean := false; v_still boolean;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('create_service_job')) THEN
    INSERT INTO b1_eval VALUES ('W1', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-W1');
  SELECT (public.create_service_job(v_t, 'req', true, 'w1')).id INTO v_j;
  SET ROLE b1_auth;
  BEGIN
    UPDATE public.service_tickets SET workflow_activated_at = NULL WHERE id = v_t;
  EXCEPTION WHEN OTHERS THEN v_cleared := false;
  END;
  RESET ROLE;
  SELECT (workflow_activated_at IS NOT NULL) INTO v_still
    FROM public.service_tickets WHERE id = v_t;
  PERFORM b1_note('W1', v_still, CASE WHEN v_still THEN 'activation durable'
    ELSE 'FAIL-OPEN: activation cleared by client update' END);
EXCEPTION WHEN OTHERS THEN
  BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM b1_note('W1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- W2 activation actor cannot be rewritten by ordinary client updates.
DO $$
DECLARE v_t uuid; v_j uuid; v_same boolean;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('create_service_job')) THEN
    INSERT INTO b1_eval VALUES ('W2', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-W2');
  SELECT (public.create_service_job(v_t, 'req', true, 'w2')).id INTO v_j;
  SET ROLE b1_auth;
  BEGIN
    UPDATE public.service_tickets SET workflow_activated_by = b1_uid('cust2') WHERE id = v_t;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RESET ROLE;
  SELECT (workflow_activated_by = b1_uid('support')) INTO v_same
    FROM public.service_tickets WHERE id = v_t;
  PERFORM b1_note('W2', v_same, CASE WHEN v_same THEN 'actor durable'
    ELSE 'FAIL-OPEN: activation actor rewritten by client update' END);
EXCEPTION WHEN OTHERS THEN
  BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM b1_note('W2', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- W3 governed RPC paths never clear activation (waive/cancel leave it set).
DO $$
DECLARE v_t uuid; v_j uuid; v_still boolean;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('create_service_job')
      AND b1_has_func('waive_service_job') AND b1_has_func('govern_job_transition')) THEN
    INSERT INTO b1_eval VALUES ('W3', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-W3');
  SELECT (public.create_service_job(v_t, 'req', true, 'w3')).id INTO v_j;
  PERFORM public.waive_service_job(v_j, 'covered', NULL);
  SELECT (workflow_activated_at IS NOT NULL) INTO v_still
    FROM public.service_tickets WHERE id = v_t;
  PERFORM b1_note('W3', v_still, 'RPC paths preserve activation');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('W3', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('W3', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- W4 cleared activation must not bypass the gate (demonstrates W1 impact).
DO $$
DECLARE v_t uuid; v_j uuid; v_bypassed boolean := false;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('create_service_job')) THEN
    INSERT INTO b1_eval VALUES ('W4', 'SKIP', 'pending B1 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-W4');
  PERFORM public.govern_ticket_transition(v_t, 'assigned', 'w4', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'in_progress', 'w4', NULL);
  SELECT (public.create_service_job(v_t, 'req', true, 'w4')).id INTO v_j;
  SET ROLE b1_auth;
  BEGIN
    UPDATE public.service_tickets SET workflow_activated_at = NULL WHERE id = v_t;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RESET ROLE;
  BEGIN
    PERFORM public.govern_ticket_transition(v_t, 'resolved', 'w4', 'bypass?');
    v_bypassed := true;
  EXCEPTION WHEN OTHERS THEN v_bypassed := false;
  END;
  PERFORM b1_note('W4', NOT v_bypassed, CASE WHEN v_bypassed
    THEN 'FAIL-OPEN: cleared activation bypassed the gate (resolve succeeded)'
    ELSE 'no bypass' END);
EXCEPTION WHEN OTHERS THEN
  BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM b1_note('W4', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- ---- B2 assignment checks (required B2; SKIP blocks B2 acceptance) ----
-- Adaptive reassign: single-RPC proposal, with reassign_service_job fallback.
CREATE OR REPLACE FUNCTION b1_assign_adaptive(p_job uuid, p_tech uuid, p_rationale text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    PERFORM public.assign_service_job(p_job, p_tech, p_rationale, NULL);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ILIKE '%already assigned%'
       AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'reassign_service_job') THEN
      PERFORM public.reassign_service_job(p_job, p_tech, p_rationale, NULL);
    ELSE
      RAISE;
    END IF;
  END;
END $$;

-- S1 first assignment: agreed B2 semantics — auto-move unassigned->planned,
-- author in service_job_assignment_history, one audit row, activation intact.
DO $$
DECLARE v_j uuid; v_n0 int; v_n1 int; v_ev boolean; v_st text; v_act boolean;
  v_h boolean; v_hn int; v_as uuid;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_table('service_job_assignment_history')
      AND b1_has_func('assign_service_job')) THEN
    INSERT INTO b1_eval VALUES ('S1', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('S1', true);
  SELECT count(*) INTO v_n0 FROM public.service_workflow_audit;
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 's1-first', NULL);
  SELECT count(*) INTO v_n1 FROM public.service_workflow_audit;
  SELECT assigned_technician_id INTO v_as FROM public.service_jobs WHERE id = v_j;
  SELECT count(*) INTO v_hn FROM public.service_job_assignment_history WHERE job_id = v_j;
  SELECT EXISTS (SELECT 1 FROM public.service_job_assignment_history h
    WHERE h.job_id = v_j AND h.action = 'assign' AND h.from_technician_id IS NULL
      AND h.to_technician_id = b1_uid('tech1') AND h.actor_id = b1_uid('support')
      AND h.rationale = 's1-first') INTO v_h;
  SELECT EXISTS (SELECT 1 FROM public.service_workflow_audit r
    WHERE r::text LIKE '%' || b1_uid('tech1')::text || '%' AND r::text LIKE '%s1-first%')
    INTO v_ev;
  v_st := b1_state('service_jobs', v_j);
  SELECT (workflow_activated_at IS NOT NULL) INTO v_act FROM public.service_tickets
   WHERE id = (SELECT ticket_id FROM public.service_jobs WHERE id = v_j);
  PERFORM b1_note('S1', v_as = b1_uid('tech1') AND v_h AND v_hn = 1
    AND v_n1 = v_n0 + 1 AND v_ev AND v_st = 'planned' AND v_act,
    'assignee=' || coalesce(v_as::text, 'null') || ' state=' || v_st
    || ' hist=' || v_hn || ' audit+=' || (v_n1 - v_n0));
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('S1', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('S1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- S2 same-tech re-assign is idempotent success without audit spam.
DO $$
DECLARE v_j uuid; v_n0 int; v_n1 int; v_ok boolean := true;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('assign_service_job')) THEN
    INSERT INTO b1_eval VALUES ('S2', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('S2', true);
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 's2-first', NULL);
  SELECT count(*) INTO v_n0 FROM public.service_workflow_audit;
  BEGIN
    PERFORM b1_assign_adaptive(v_j, b1_uid('tech1'), 's2-repeat');
  EXCEPTION WHEN OTHERS THEN v_ok := false;
  END;
  SELECT count(*) INTO v_n1 FROM public.service_workflow_audit;
  PERFORM b1_note('S2', v_ok AND v_n1 - v_n0 <= 1
    AND (SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_j) = b1_uid('tech1'),
    'idempotent re-assign');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('S2', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('S2', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- S3 reassign tech1 -> tech2; author/audit chain lives in history + audit.
DO $$
DECLARE v_j uuid; v_e1 boolean; v_e2 boolean; v_h1 boolean; v_h2 boolean;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_table('service_job_assignment_history')
      AND b1_has_func('assign_service_job')) THEN
    INSERT INTO b1_eval VALUES ('S3', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('S3', true);
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 's3-first', NULL);
  PERFORM set_config('app.b1_uid', b1_uid('admin')::text, false);
  PERFORM b1_assign_adaptive(v_j, b1_uid('tech2'), 's3-re');
  SELECT EXISTS (SELECT 1 FROM public.service_job_assignment_history h
    WHERE h.job_id = v_j AND h.action = 'assign' AND h.from_technician_id IS NULL
      AND h.to_technician_id = b1_uid('tech1') AND h.actor_id = b1_uid('support')
      AND h.rationale = 's3-first') INTO v_h1;
  SELECT EXISTS (SELECT 1 FROM public.service_job_assignment_history h
    WHERE h.job_id = v_j AND h.action = 'reassign'
      AND h.from_technician_id = b1_uid('tech1')
      AND h.to_technician_id = b1_uid('tech2') AND h.actor_id = b1_uid('admin')
      AND h.rationale = 's3-re') INTO v_h2;
  SELECT EXISTS (SELECT 1 FROM public.service_workflow_audit r
    WHERE r::text LIKE '%' || b1_uid('tech1')::text || '%' AND r::text LIKE '%s3-first%')
    INTO v_e1;
  SELECT EXISTS (SELECT 1 FROM public.service_workflow_audit r
    WHERE r::text LIKE '%' || b1_uid('tech2')::text || '%' AND r::text LIKE '%s3-re%'
      AND r::text LIKE '%' || b1_uid('admin')::text || '%') INTO v_e2;
  PERFORM b1_note('S3', v_h1 AND v_h2 AND v_e1 AND v_e2
    AND (SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_j) = b1_uid('tech2'),
    'reassign chain complete');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('S3', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('S3', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- S4 agreed guard scope: scheduled visit allows reassign; in_progress denies;
-- terminal visit allows again.
DO $$
DECLARE v_j uuid; v_v uuid; v_sched boolean := false; v_deny boolean := false;
  v_ok boolean;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_table('service_job_visits')
      AND b1_has_func('assign_service_job') AND b1_has_func('create_service_job_visit')
      AND b1_has_func('govern_visit_transition') AND b1_has_func('govern_job_transition')) THEN
    INSERT INTO b1_eval VALUES ('S4', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('S4', true);
  PERFORM public.govern_job_transition(v_j, 'planned', 's4', NULL);
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 's4-first', NULL);
  SELECT (public.create_service_job_visit(v_j, 's4', NULL)).id INTO v_v;
  BEGIN
    PERFORM b1_assign_adaptive(v_j, b1_uid('tech2'), 's4-sched');
    v_sched := ((SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_j)
      = b1_uid('tech2'));
  EXCEPTION WHEN OTHERS THEN v_sched := false; END;
  PERFORM b1_arm_ticket_for_visit(v_j, b1_uid('tech2'));
  PERFORM public.govern_visit_transition(v_v, 'in_progress', 's4', NULL);
  BEGIN PERFORM b1_assign_adaptive(v_j, b1_uid('tech1'), 's4-re');
  EXCEPTION WHEN check_violation THEN v_deny := true; END;
  PERFORM public.govern_visit_transition(v_v, 'completed', 's4', NULL);
  PERFORM b1_assign_adaptive(v_j, b1_uid('tech1'), 's4-re');
  SELECT (assigned_technician_id = b1_uid('tech1')) INTO v_ok
    FROM public.service_jobs WHERE id = v_j;
  PERFORM b1_note('S4', v_sched AND v_deny AND v_ok,
    'sched-allowed=' || v_sched || ' active-denied=' || v_deny);
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('S4', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('S4', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- S5 reassign denied on terminal jobs.
DO $$
DECLARE v_c uuid; v_w uuid; v_x uuid; v_j uuid; v_n boolean := true;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('assign_service_job')
      AND b1_has_func('govern_job_transition') AND b1_has_func('waive_service_job')) THEN
    INSERT INTO b1_eval VALUES ('S5', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_c := b1_mkticket_job('S5C', true);
  PERFORM public.assign_service_job(v_c, b1_uid('tech1'), 's5', NULL);
  PERFORM public.govern_job_transition(v_c, 'planned', 's5', NULL);
  PERFORM public.govern_job_transition(v_c, 'in_progress', 's5', NULL);
  PERFORM public.govern_job_transition(v_c, 'awaiting_review', 's5', NULL);
  PERFORM b1_approved_chain(v_c);
  PERFORM public.govern_job_transition(v_c, 'completed', 's5', NULL);
  v_w := b1_mkticket_job('S5W', true);
  PERFORM public.waive_service_job(v_w, 's5', NULL);
  v_x := b1_mkticket_job('S5X', true);
  PERFORM public.govern_job_transition(v_x, 'planned', 's5', NULL);
  PERFORM public.govern_job_transition(v_x, 'cancelled', 's5', NULL);
  FOR v_j IN SELECT unnest(ARRAY[v_c, v_w, v_x]) LOOP
    BEGIN PERFORM b1_assign_adaptive(v_j, b1_uid('tech2'), 's5-re');
      v_n := false;
    EXCEPTION WHEN check_violation THEN NULL; END;
  END LOOP;
  PERFORM b1_note('S5', v_n, 'terminal jobs frozen');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('S5', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('S5', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- S6 own-job decline: success to unassigned; reason mandatory.
DO $$
DECLARE v_j uuid; v_noreason boolean := false; v_empty boolean := false;
  v_j2 uuid; v_j3 uuid; v_ev boolean;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('assign_service_job')
      AND b1_has_func('decline_service_job')) THEN
    INSERT INTO b1_eval VALUES ('S6', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('S6', true);
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 's6-first', NULL);
  PERFORM public.govern_job_transition(v_j, 'planned', 's6', NULL);
  v_j2 := b1_mkticket_job('S6B', true);
  PERFORM public.assign_service_job(v_j2, b1_uid('tech1'), 's6-first', NULL);
  v_j3 := b1_mkticket_job('S6C', true);
  PERFORM public.assign_service_job(v_j3, b1_uid('tech1'), 's6-first', NULL);
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  BEGIN PERFORM public.decline_service_job(v_j2, NULL, NULL);
  EXCEPTION WHEN OTHERS THEN v_noreason := true; END;
  BEGIN PERFORM public.decline_service_job(v_j3, '', NULL);
  EXCEPTION WHEN OTHERS THEN v_empty := true; END;
  PERFORM public.decline_service_job(v_j, 'overloaded', NULL);
  SELECT EXISTS (SELECT 1 FROM public.service_workflow_audit r
    WHERE r::text LIKE '%' || b1_uid('tech1')::text || '%'
      AND r::text LIKE '%overloaded%') INTO v_ev;
  PERFORM b1_note('S6', v_noreason AND v_empty AND v_ev
    AND b1_state('service_jobs', v_j) = 'unassigned'
    AND (SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_j) IS NULL,
    'decline own + reason required');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('S6', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('S6', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- S7 decline denied: other's, unassigned, terminal, roles, anon.
DO $$
DECLARE v_j uuid; v_u uuid; v_t uuid; v_o boolean := false; v_n boolean := false;
  v_c boolean := false; v_s boolean := false; v_m boolean := false; v_a boolean := false;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('assign_service_job')
      AND b1_has_func('decline_service_job')) THEN
    INSERT INTO b1_eval VALUES ('S7', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('S7', true);
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 's7-first', NULL);
  v_u := b1_mkticket_job('S7U', true);
  PERFORM set_config('app.b1_uid', b1_uid('tech2')::text, false);
  BEGIN PERFORM public.decline_service_job(v_j, 's7', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_o := true; END;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  BEGIN PERFORM public.decline_service_job(v_u, 's7', NULL);
  EXCEPTION WHEN OTHERS THEN v_n := (SQLSTATE IN ('42501', '23514')); END;
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  BEGIN PERFORM public.decline_service_job(v_j, 's7', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_c := true; END;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  BEGIN PERFORM public.decline_service_job(v_j, 's7', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_s := true; END;
  PERFORM set_config('app.b1_uid', b1_uid('sales')::text, false);
  BEGIN PERFORM public.decline_service_job(v_j, 's7', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_m := true; END;
  RESET app.b1_uid;
  BEGIN PERFORM public.decline_service_job(v_j, 's7', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_a := true; END;
  PERFORM b1_note('S7', v_o AND v_n AND v_c AND v_s AND v_m AND v_a,
    'decline fenced to owner-tech');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('S7', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('S7', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- S8 decline DENIED while visit in_progress (supervisor); visit untouched; assignee remains.
DO $$
DECLARE v_j uuid; v_v uuid; v_denied boolean := false; v_vs text; v_tech uuid;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_table('service_job_visits')
      AND b1_has_func('assign_service_job') AND b1_has_func('decline_service_job')
      AND b1_has_func('create_service_job_visit') AND b1_has_func('govern_visit_transition')
      AND b1_has_func('govern_job_transition')) THEN
    INSERT INTO b1_eval VALUES ('S8', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('S8', true);
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 's8-first', NULL);
  PERFORM public.govern_job_transition(v_j, 'planned', 's8', NULL);
  SELECT (public.create_service_job_visit(v_j, 's8', NULL)).id INTO v_v;
  PERFORM b1_arm_ticket_for_visit(v_j);
  PERFORM public.govern_visit_transition(v_v, 'in_progress', 's8', NULL);
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  BEGIN
    PERFORM public.decline_service_job(v_j, 's8', NULL);
  EXCEPTION WHEN check_violation THEN v_denied := true;
  END;
  v_vs := b1_state('service_job_visits', v_v);
  SELECT assigned_technician_id INTO v_tech FROM public.service_jobs WHERE id = v_j;
  PERFORM b1_note('S8', v_denied AND v_vs = 'in_progress' AND v_tech = b1_uid('tech1'),
    'active-visit decline denied; attendance intact');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('S8', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('S8', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- S9 assign permissions: roles denied, admin allowed, forged actor denied.
DO $$
DECLARE v_j uuid; v_c boolean := false; v_s boolean := false; v_t boolean := false;
  v_a boolean := false; v_g boolean := false; v_d boolean := false; v_adm boolean;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('assign_service_job')
      AND b1_has_func('decline_service_job')) THEN
    INSERT INTO b1_eval VALUES ('S9', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('S9', true);
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  BEGIN PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 's9', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_c := true; END;
  PERFORM set_config('app.b1_uid', b1_uid('sales')::text, false);
  BEGIN PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 's9', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_s := true; END;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  BEGIN PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 's9', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_t := true; END;
  RESET app.b1_uid;
  BEGIN PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 's9', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_a := true; END;
  PERFORM set_config('app.b1_uid', b1_uid('admin')::text, false);
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 's9-first', NULL);
  v_adm := (SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_j)
    = b1_uid('tech1');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  BEGIN PERFORM public.assign_service_job(v_j, b1_uid('tech2'), 's9', b1_uid('admin'));
  EXCEPTION WHEN SQLSTATE '42501' THEN v_g := true; END;
  BEGIN PERFORM public.decline_service_job(v_j, 's9', b1_uid('tech1'));
  EXCEPTION WHEN SQLSTATE '42501' THEN v_d := true; END;
  PERFORM b1_note('S9', v_c AND v_s AND v_t AND v_a AND v_adm AND v_g AND v_d,
    'assign fenced to staff, actors bound');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('S9', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('S9', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- S10 multiple independent jobs: decline/reassign isolated per job.
DO $$
DECLARE v_t uuid; v_1 uuid; v_2 uuid; v_ok boolean;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('assign_service_job')
      AND b1_has_func('decline_service_job') AND b1_has_func('govern_job_transition')) THEN
    INSERT INTO b1_eval VALUES ('S10', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-S10');
  SELECT (public.create_service_job(v_t, 'one', true, 's10')).id INTO v_1;
  SELECT (public.create_service_job(v_t, 'two', true, 's10')).id INTO v_2;
  PERFORM public.assign_service_job(v_1, b1_uid('tech1'), 's10', NULL);
  PERFORM public.assign_service_job(v_2, b1_uid('tech2'), 's10', NULL);
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  PERFORM public.decline_service_job(v_1, 's10', NULL);
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  PERFORM b1_assign_adaptive(v_2, b1_uid('tech1'), 's10-re');
  SELECT (a1 IS NULL AND s1 = 'unassigned' AND a2 = b1_uid('tech1'))
    INTO v_ok
    FROM (SELECT (SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_1) AS a1,
                 b1_state('service_jobs', v_1) AS s1,
                 (SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_2) AS a2) q;
  PERFORM b1_note('S10', v_ok, 'jobs independent');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('S10', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('S10', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- S11 authorship/history: ordered assign->reassign->decline chain in history + audit.
DO $$
DECLARE v_j uuid; v_e1 boolean; v_e2 boolean; v_h1 boolean; v_h2 boolean;
  v_h3 boolean; v_hn int;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_table('service_job_assignment_history')
      AND b1_has_func('assign_service_job') AND b1_has_func('decline_service_job')) THEN
    INSERT INTO b1_eval VALUES ('S11', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('S11', true);
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 's11-first', NULL);
  PERFORM set_config('app.b1_uid', b1_uid('admin')::text, false);
  PERFORM b1_assign_adaptive(v_j, b1_uid('tech2'), 's11-re');
  PERFORM set_config('app.b1_uid', b1_uid('tech2')::text, false);
  PERFORM public.decline_service_job(v_j, 's11-out', NULL);
  SELECT count(*) INTO v_hn FROM public.service_job_assignment_history WHERE job_id = v_j;
  SELECT EXISTS (SELECT 1 FROM public.service_job_assignment_history h
    WHERE h.job_id = v_j AND h.action = 'assign' AND h.from_technician_id IS NULL
      AND h.to_technician_id = b1_uid('tech1') AND h.actor_id = b1_uid('support')
      AND h.rationale = 's11-first') INTO v_h1;
  SELECT EXISTS (SELECT 1 FROM public.service_job_assignment_history h
    WHERE h.job_id = v_j AND h.action = 'reassign'
      AND h.from_technician_id = b1_uid('tech1')
      AND h.to_technician_id = b1_uid('tech2') AND h.actor_id = b1_uid('admin')
      AND h.rationale = 's11-re') INTO v_h2;
  SELECT EXISTS (SELECT 1 FROM public.service_job_assignment_history h
    WHERE h.job_id = v_j AND h.action = 'decline'
      AND h.from_technician_id = b1_uid('tech2') AND h.to_technician_id IS NULL
      AND h.actor_id = b1_uid('tech2') AND h.rationale = 's11-out') INTO v_h3;
  SELECT EXISTS (SELECT 1 FROM public.service_workflow_audit r
    WHERE r::text LIKE '%' || b1_uid('tech1')::text || '%' AND r::text LIKE '%s11-first%')
    INTO v_e1;
  SELECT EXISTS (SELECT 1 FROM public.service_workflow_audit r
    WHERE r::text LIKE '%' || b1_uid('tech2')::text || '%' AND r::text LIKE '%s11-out%')
    INTO v_e2;
  PERFORM b1_note('S11', v_hn = 3 AND v_h1 AND v_h2 AND v_h3 AND v_e1 AND v_e2
    AND (SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_j) IS NULL
    AND b1_state('service_jobs', v_j) = 'unassigned',
    'history chain x' || v_hn);
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('S11', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('S11', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- S12 ticket/job assignment separation both directions + activation intact.
DO $$
DECLARE v_t uuid; v_j uuid; v_ta uuid; v_ja uuid; v_act boolean;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('assign_service_job')) THEN
    INSERT INTO b1_eval VALUES ('S12', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-S12');
  SELECT (public.create_service_job(v_t, 'sep', true, 's12')).id INTO v_j;
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 's12', NULL);
  SELECT assigned_to INTO v_ta FROM public.service_tickets WHERE id = v_t;
  PERFORM public.govern_ticket_assign(v_t, b1_uid('tech2'), 's12');
  SELECT assigned_technician_id INTO v_ja FROM public.service_jobs WHERE id = v_j;
  SELECT (workflow_activated_at IS NOT NULL) INTO v_act
    FROM public.service_tickets WHERE id = v_t;
  PERFORM b1_note('S12', v_ta IS NULL AND v_ja = b1_uid('tech1') AND v_act,
    'assignments independent, activation intact');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('S12', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('S12', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- S13 visibility boundaries via RLS-as-caller.
-- Read model (B1 can_read_ticket_workflow, verified held post-B2): ticket
-- owner reads own tickets' jobs; assigned technicians read jobs on tickets
-- where they hold an assignment; staff read all; cross-customer reads denied.
DO $$
DECLARE v_1 uuid; v_2 uuid; v_3 uuid; v_t3 uuid; v_own int; v_oth int;
  v_cown int; v_ccross int; v_2own int; v_2cross int; v_sup int;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('assign_service_job')) THEN
    INSERT INTO b1_eval VALUES ('S13', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_1 := b1_mkticket_job('S13A', true);
  PERFORM public.assign_service_job(v_1, b1_uid('tech1'), 's13', NULL);
  v_2 := b1_mkticket_job('S13B', true);
  PERFORM public.assign_service_job(v_2, b1_uid('tech2'), 's13', NULL);
  v_t3 := b1_mkticket('cust2', 'B1-S13C');
  SELECT (public.create_service_job(v_t3, 's13c', true, 's13')).id INTO v_3;
  PERFORM public.assign_service_job(v_3, b1_uid('tech2'), 's13', NULL);
  SET ROLE b1_auth;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  SELECT count(*) INTO v_own FROM public.service_jobs WHERE id = v_1;
  SELECT count(*) INTO v_oth FROM public.service_jobs WHERE id = v_2;
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  SELECT count(*) INTO v_cown FROM public.service_jobs WHERE id IN (v_1, v_2);
  SELECT count(*) INTO v_ccross FROM public.service_jobs WHERE id = v_3;
  PERFORM set_config('app.b1_uid', b1_uid('cust2')::text, false);
  SELECT count(*) INTO v_2own FROM public.service_jobs WHERE id = v_3;
  SELECT count(*) INTO v_2cross FROM public.service_jobs WHERE id = v_1;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT count(*) INTO v_sup FROM public.service_jobs WHERE id IN (v_1, v_2, v_3);
  RESET ROLE;
  PERFORM b1_note('S13', v_own = 1 AND v_oth = 0
    AND v_cown = 2 AND v_ccross = 0 AND v_2own = 1 AND v_2cross = 0 AND v_sup = 3,
    'own=' || v_own || ' other=' || v_oth || ' cown=' || v_cown
    || ' ccross=' || v_ccross || ' sup=' || v_sup);
EXCEPTION WHEN OTHERS THEN
  BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM b1_note('S13', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- S14 B2 agency = own-decline only: assigned/other/unassigned techs are denied
-- job-FSM transitions (42501); staff control succeeds on the same job.
DO $$
DECLARE v_j uuid; v_u uuid; v_own boolean := false; v_oth boolean := false;
  v_una boolean := false; v_ctl boolean;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('assign_service_job')
      AND b1_has_func('govern_job_transition')) THEN
    INSERT INTO b1_eval VALUES ('S14', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('S14', true);
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 's14-first', NULL);
  v_u := b1_mkticket_job('S14U', true);
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  BEGIN PERFORM public.govern_job_transition(v_j, 'in_progress', 's14', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_own := true; END;
  BEGIN PERFORM public.govern_job_transition(v_u, 'planned', 's14', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_una := true; END;
  PERFORM set_config('app.b1_uid', b1_uid('tech2')::text, false);
  BEGIN PERFORM public.govern_job_transition(v_j, 'cancelled', 's14', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_oth := true; END;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  PERFORM public.govern_job_transition(v_j, 'in_progress', 's14', NULL);
  v_ctl := (b1_state('service_jobs', v_j) = 'in_progress');
  PERFORM b1_note('S14', v_own AND v_oth AND v_una AND v_ctl,
    'tech transitions denied, staff control ok');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('S14', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('S14', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- S15 atomic audit rollback on failed assign/decline/reassign.
DO $$
DECLARE v_j uuid; v_v uuid; v_n0 int; v_h0 int; v_a0 uuid; v_s0 text;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_table('service_job_visits')
      AND b1_has_table('service_job_assignment_history')
      AND b1_has_func('assign_service_job') AND b1_has_func('decline_service_job')
      AND b1_has_func('create_service_job_visit') AND b1_has_func('govern_job_transition')
      AND b1_has_func('govern_visit_transition')) THEN
    INSERT INTO b1_eval VALUES ('S15', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('S15', true);
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 's15-first', NULL);
  PERFORM public.govern_job_transition(v_j, 'planned', 's15', NULL);
  SELECT (public.create_service_job_visit(v_j, 's15', NULL)).id INTO v_v;
  PERFORM b1_arm_ticket_for_visit(v_j);
  PERFORM public.govern_visit_transition(v_v, 'in_progress', 's15', NULL);
  SELECT count(*) INTO v_n0 FROM public.service_workflow_audit;
  SELECT count(*) INTO v_h0 FROM public.service_job_assignment_history;
  SELECT assigned_technician_id, b1_state('service_jobs', v_j) INTO v_a0, v_s0
    FROM public.service_jobs WHERE id = v_j;
  BEGIN PERFORM public.assign_service_job(v_j, b1_uid('tech2'), 's15', b1_uid('admin'));
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  BEGIN PERFORM public.assign_service_job(v_j, '99999999-9999-9999-9999-999999999999', 's15', NULL);
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM b1_assign_adaptive(v_j, b1_uid('tech2'), 's15-re');
  EXCEPTION WHEN check_violation THEN NULL; END;
  PERFORM set_config('app.b1_uid', b1_uid('tech2')::text, false);
  BEGIN PERFORM public.decline_service_job(v_j, 's15', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  PERFORM b1_note('S15',
    (SELECT count(*) FROM public.service_workflow_audit) = v_n0
    AND (SELECT count(*) FROM public.service_job_assignment_history) = v_h0
    AND (SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_j) = v_a0
    AND b1_state('service_jobs', v_j) = v_s0, 'failures traceless');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('S15', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('S15', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- S16 B2 preserves all B1 objects + FSM walk intact (migration safety);
-- B2 objects asserted only when B2 is present (keeps B1-baseline meaning).
DO $$
DECLARE v_j uuid; v_ok boolean := true; v_b2 boolean := true;
  need_tables text[] := ARRAY['service_jobs','service_job_visits','service_reports',
    'service_report_revisions','service_report_reviews','service_acknowledgments',
    'service_workflow_audit'];
  need_funcs text[] := ARRAY['create_service_job','govern_job_transition',
    'create_service_job_visit','govern_visit_transition','waive_service_job'];
  need_b2_tables text[] := ARRAY['service_job_assignment_history'];
  need_b2_funcs text[] := ARRAY['assign_service_job','decline_service_job',
    'ensure_default_service_job'];
  t text;
BEGIN
  FOREACH t IN ARRAY need_tables LOOP
    IF NOT b1_has_table(t) THEN v_ok := false; END IF;
  END LOOP;
  FOREACH t IN ARRAY need_funcs LOOP
    IF NOT b1_has_func(t) THEN v_ok := false; END IF;
  END LOOP;
  IF NOT v_ok THEN
    PERFORM b1_note('S16', false, 'B1 objects missing post-B2'); RETURN;
  END IF;
  IF b1_has_func('assign_service_job') THEN
    FOREACH t IN ARRAY need_b2_tables LOOP
      IF NOT b1_has_table(t) THEN v_b2 := false; END IF;
    END LOOP;
    FOREACH t IN ARRAY need_b2_funcs LOOP
      IF NOT b1_has_func(t) THEN v_b2 := false; END IF;
    END LOOP;
    IF NOT v_b2 THEN
      PERFORM b1_note('S16', false, 'B2 objects missing'); RETURN;
    END IF;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('S16', true);
  PERFORM public.govern_job_transition(v_j, 'planned', 's16', NULL);
  PERFORM public.govern_job_transition(v_j, 'cancelled', 's16', NULL);
  PERFORM b1_note('S16', b1_state('service_jobs', v_j) = 'cancelled', 'B1 intact');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('S16', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('S16', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- S17 ensure_default_service_job atomicity: invalid tech or missing ticket
-- fails with NO partial job, NO activation, NO audit/history rows.
DO $$
DECLARE v_t uuid; v_bad boolean := false; v_nf boolean := false;
  v_n0 int; v_h0 int;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('ensure_default_service_job')) THEN
    INSERT INTO b1_eval VALUES ('S17', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-S17');
  SELECT count(*) INTO v_n0 FROM public.service_workflow_audit;
  SELECT count(*) INTO v_h0 FROM public.service_job_assignment_history;
  BEGIN
    PERFORM public.ensure_default_service_job(v_t,
      '99999999-9999-9999-9999-999999999999', 'Job 1', 's17', NULL);
  EXCEPTION WHEN SQLSTATE '22023' THEN v_bad := true; END;
  BEGIN
    PERFORM public.ensure_default_service_job(
      '99999999-9999-9999-9999-999999999999', b1_uid('tech1'), 'Job 1', 's17', NULL);
  EXCEPTION WHEN SQLSTATE 'P0002' THEN v_nf := true; END;
  PERFORM b1_note('S17', v_bad AND v_nf
    AND (SELECT count(*) FROM public.service_jobs WHERE ticket_id = v_t) = 0
    AND (SELECT workflow_activated_at FROM public.service_tickets WHERE id = v_t) IS NULL
    AND (SELECT count(*) FROM public.service_workflow_audit) = v_n0
    AND (SELECT count(*) FROM public.service_job_assignment_history) = v_h0,
    'ensure failures traceless');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('S17', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('S17', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- S18 ensure_default_service_job idempotent retry: repeated calls return the
-- same Job 1, never a second job; retry writes no audit/history.
DO $$
DECLARE v_t uuid; v_u uuid; v_1 uuid; v_2 uuid; v_3 uuid; v_4 uuid;
  v_n0 int; v_h0 int; v_n1 int; v_h1 int;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('ensure_default_service_job')) THEN
    INSERT INTO b1_eval VALUES ('S18', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-S18');
  SELECT (public.ensure_default_service_job(v_t, b1_uid('tech1'), 'Job 1', 's18', NULL)).id
    INTO v_1;
  SELECT count(*) INTO v_n0 FROM public.service_workflow_audit;
  SELECT count(*) INTO v_h0 FROM public.service_job_assignment_history;
  SELECT (public.ensure_default_service_job(v_t, b1_uid('tech1'), 'Job 1', 's18', NULL)).id
    INTO v_2;
  SELECT count(*) INTO v_n1 FROM public.service_workflow_audit;
  SELECT count(*) INTO v_h1 FROM public.service_job_assignment_history;
  v_u := b1_mkticket('cust1', 'B1-S18U');
  SELECT (public.ensure_default_service_job(v_u, NULL, 'Job 1', 's18', NULL)).id INTO v_3;
  SELECT (public.ensure_default_service_job(v_u, NULL, 'Job 1', 's18', NULL)).id INTO v_4;
  PERFORM b1_note('S18', v_1 = v_2 AND v_3 = v_4 AND v_n1 = v_n0 AND v_h1 = v_h0
    AND (SELECT count(*) FROM public.service_jobs WHERE ticket_id = v_t) = 1
    AND (SELECT count(*) FROM public.service_jobs WHERE ticket_id = v_u) = 1
    AND (SELECT job_sequence FROM public.service_jobs WHERE id = v_1) = 1
    AND (SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_1)
      = b1_uid('tech1')
    AND (SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_3) IS NULL,
    'retry same id, audit+=' || (v_n1 - v_n0) || ' hist+=' || (v_h1 - v_h0));
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('S18', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('S18', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- S19 ensure_default_service_job permissions + terminal tickets: customer,
-- technician, sales, anon, and forged actors denied (42501); closed/cancelled
-- tickets rejected (check_violation) with no job created.
DO $$
DECLARE v_t uuid; v_c uuid; v_x uuid; v_cu boolean := false; v_te boolean := false;
  v_sa boolean := false; v_an boolean := false; v_fo boolean := false;
  v_cl boolean := false; v_cx boolean := false; v_n0 int;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_func('ensure_default_service_job')) THEN
    INSERT INTO b1_eval VALUES ('S19', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-S19');
  v_c := b1_mkticket('cust1', 'B1-S19C');
  PERFORM public.govern_ticket_transition(v_c, 'assigned', 's19', NULL);
  PERFORM public.govern_ticket_transition(v_c, 'in_progress', 's19', NULL);
  PERFORM public.govern_ticket_transition(v_c, 'resolved', 's19', 'done');
  PERFORM public.govern_ticket_transition(v_c, 'closed', 's19', NULL);
  v_x := b1_mkticket('cust1', 'B1-S19X');
  PERFORM public.govern_ticket_transition(v_x, 'cancelled', 's19', NULL);
  SELECT count(*) INTO v_n0 FROM public.service_workflow_audit;
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  BEGIN PERFORM public.ensure_default_service_job(v_t, b1_uid('tech1'), 'Job 1', 's19', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_cu := true; END;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  BEGIN PERFORM public.ensure_default_service_job(v_t, b1_uid('tech1'), 'Job 1', 's19', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_te := true; END;
  PERFORM set_config('app.b1_uid', b1_uid('sales')::text, false);
  BEGIN PERFORM public.ensure_default_service_job(v_t, b1_uid('tech1'), 'Job 1', 's19', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_sa := true; END;
  RESET app.b1_uid;
  BEGIN PERFORM public.ensure_default_service_job(v_t, b1_uid('tech1'), 'Job 1', 's19', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_an := true; END;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  BEGIN PERFORM public.ensure_default_service_job(v_t, b1_uid('tech1'), 'Job 1', 's19',
    b1_uid('admin'));
  EXCEPTION WHEN SQLSTATE '42501' THEN v_fo := true; END;
  BEGIN PERFORM public.ensure_default_service_job(v_c, b1_uid('tech1'), 'Job 1', 's19', NULL);
  EXCEPTION WHEN check_violation THEN v_cl := true; END;
  BEGIN PERFORM public.ensure_default_service_job(v_x, b1_uid('tech1'), 'Job 1', 's19', NULL);
  EXCEPTION WHEN check_violation THEN v_cx := true; END;
  PERFORM b1_note('S19', v_cu AND v_te AND v_sa AND v_an AND v_fo AND v_cl AND v_cx
    AND (SELECT count(*) FROM public.service_jobs WHERE ticket_id IN (v_t, v_c, v_x)) = 0
    AND (SELECT count(*) FROM public.service_workflow_audit) = v_n0,
    'ensure fenced; terminal rejected tracelessly');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('S19', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('S19', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- S20 assignment history is append-only for clients and scoped to involved
-- parties + staff (tech-own-involved readable, others hidden, customer none).
DO $$
DECLARE v_a uuid; v_b uuid; v_u boolean := false; v_d boolean := false;
  v_i boolean := false; v_own int; v_cus int; v_sup int; v_tot int;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_table('service_job_assignment_history')
      AND b1_has_func('assign_service_job')) THEN
    INSERT INTO b1_eval VALUES ('S20', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_a := b1_mkticket_job('S20A', true);
  PERFORM public.assign_service_job(v_a, b1_uid('tech1'), 's20-first', NULL);
  PERFORM b1_assign_adaptive(v_a, b1_uid('tech2'), 's20-re');
  PERFORM set_config('app.b1_uid', b1_uid('admin')::text, false);
  v_b := b1_mkticket_job('S20B', true);
  PERFORM public.assign_service_job(v_b, b1_uid('tech2'), 's20-other', NULL);
  SET ROLE b1_auth;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  BEGIN UPDATE public.service_job_assignment_history SET rationale = 's20-hack'
    WHERE job_id = v_a;
  EXCEPTION WHEN OTHERS THEN v_u := true; END;
  BEGIN DELETE FROM public.service_job_assignment_history WHERE job_id = v_a;
  EXCEPTION WHEN OTHERS THEN v_d := true; END;
  BEGIN INSERT INTO public.service_job_assignment_history
    (job_id, ticket_id, action, actor_id) VALUES
    (v_a, (SELECT ticket_id FROM public.service_jobs WHERE id = v_a),
     'assign', b1_uid('tech1'));
  EXCEPTION WHEN OTHERS THEN v_i := true; END;
  SELECT count(*) INTO v_own FROM public.service_job_assignment_history
    WHERE job_id IN (v_a, v_b);
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  SELECT count(*) INTO v_cus FROM public.service_job_assignment_history
    WHERE job_id IN (v_a, v_b);
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT count(*) INTO v_sup FROM public.service_job_assignment_history
    WHERE job_id IN (v_a, v_b);
  RESET ROLE;
  SELECT count(*) INTO v_tot FROM public.service_job_assignment_history
    WHERE job_id IN (v_a, v_b);
  PERFORM b1_note('S20', v_u AND v_d AND v_i AND v_tot = 3
    AND v_own = 2 AND v_cus = 0 AND v_sup = 3,
    'own=' || v_own || ' cust=' || v_cus || ' sup=' || v_sup || ' tot=' || v_tot);
EXCEPTION WHEN OTHERS THEN
  BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM b1_note('S20', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- S21 opt-in entry is TWO transactions (proves the atomic-vs-partial
-- boundary): failed ticket-assign persists nothing; assign-OK + ensure-FAIL
-- persists the ticket assignment only (no job, no activation, no
-- workflow-audit/history rows); the dialog-retry sequence (assign again +
-- ensure) recovers to exactly one Job 1.
DO $$
DECLARE v_t uuid; v_j uuid; v_j2 uuid; v_ja int; v_act boolean;
  v_fo boolean := false; v_bad boolean := false;
  v_ta0 int; v_n0 int; v_h0 int;
  v_a_clean boolean; v_a_taudit int;
  v_p_asn boolean; v_p_jobs int; v_p_act boolean; v_p_wa int; v_p_hist int;
  v_p_taudit int;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_table('service_job_assignment_history')
      AND b1_has_func('ensure_default_service_job')
      AND b1_has_func('assign_service_job')) THEN
    INSERT INTO b1_eval VALUES ('S21', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', 'B1-S21');
  SELECT count(*) INTO v_ta0 FROM public.ticket_governance_audit WHERE ticket_id = v_t;
  SELECT count(*) INTO v_n0 FROM public.service_workflow_audit;
  SELECT count(*) INTO v_h0 FROM public.service_job_assignment_history;
  -- Leg A: forged ticket-assign fails AND persists nothing.
  BEGIN PERFORM public.govern_ticket_assign(v_t, b1_uid('tech1'), 's21', b1_uid('admin'));
  EXCEPTION WHEN SQLSTATE '42501' THEN v_fo := true; END;
  SELECT (assigned_to IS NULL AND status = 'open') INTO v_a_clean
    FROM public.service_tickets WHERE id = v_t;
  SELECT count(*) INTO v_a_taudit FROM public.ticket_governance_audit
    WHERE ticket_id = v_t;
  -- Leg B: assign OK, then ensure fails -> partial outcome persists.
  PERFORM public.govern_ticket_assign(v_t, b1_uid('tech1'), 's21', NULL);
  BEGIN PERFORM public.ensure_default_service_job(v_t,
    '99999999-9999-9999-9999-999999999999', 'Job 1', 's21', NULL);
  EXCEPTION WHEN SQLSTATE '22023' THEN v_bad := true; END;
  SELECT (assigned_to = b1_uid('tech1') AND status = 'assigned') INTO v_p_asn
    FROM public.service_tickets WHERE id = v_t;
  SELECT count(*) INTO v_p_jobs FROM public.service_jobs WHERE ticket_id = v_t;
  SELECT (workflow_activated_at IS NOT NULL) INTO v_p_act
    FROM public.service_tickets WHERE id = v_t;
  SELECT count(*) INTO v_p_wa FROM public.service_workflow_audit;
  SELECT count(*) INTO v_p_hist FROM public.service_job_assignment_history;
  SELECT count(*) INTO v_p_taudit FROM public.ticket_governance_audit
    WHERE ticket_id = v_t;
  -- Leg C: dialog-retry sequence (assign again + ensure) recovers fully.
  PERFORM public.govern_ticket_assign(v_t, b1_uid('tech1'), 's21-retry', NULL);
  SELECT (public.ensure_default_service_job(v_t, b1_uid('tech1'), 'Job 1', 's21', NULL)).id
    INTO v_j;
  SELECT (public.ensure_default_service_job(v_t, b1_uid('tech1'), 'Job 1', 's21', NULL)).id
    INTO v_j2;
  SELECT count(*) INTO v_ja FROM public.service_jobs WHERE ticket_id = v_t;
  SELECT (workflow_activated_at IS NOT NULL) INTO v_act
    FROM public.service_tickets WHERE id = v_t;
  PERFORM b1_note('S21', v_fo AND v_a_clean AND v_a_taudit = v_ta0 AND v_bad
    AND (SELECT assigned_to FROM public.service_tickets WHERE id = v_t)
      = b1_uid('tech1')
    AND v_p_asn AND v_p_jobs = 0 AND NOT v_p_act
    AND v_p_wa = v_n0 AND v_p_hist = v_h0 AND v_p_taudit = v_ta0 + 1
    AND v_j = v_j2 AND v_ja = 1 AND v_act
    AND (SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_j)
      = b1_uid('tech1')
    AND b1_state('service_jobs', v_j) = 'planned',
    'partial=ticket-only; retry=one Job 1 ' || left(v_j::text, 8));
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('S21', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('S21', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- S22 (B3-updated): scheduled visits still allow reassign/decline; attending on
-- scheduled visits is REPOINTED to the new assignee (B3 attendance rule).
-- New visits stamp current assignee; history stays chained. Decline clears
-- scheduled attending to NULL.
DO $$
DECLARE v_j uuid; v_d uuid; v_v1 uuid; v_v2 uuid; v_vd uuid;
  v_att1 uuid; v_att1b uuid; v_st1 text; v_att2 uuid; v_hn int;
  v_dok boolean := false; v_att_d uuid;
BEGIN
  IF NOT (b1_has_table('service_jobs') AND b1_has_table('service_job_visits')
      AND b1_has_table('service_job_assignment_history')
      AND b1_has_func('assign_service_job') AND b1_has_func('decline_service_job')
      AND b1_has_func('create_service_job_visit')) THEN
    INSERT INTO b1_eval VALUES ('S22', 'SKIP', 'pending B2 implementation'); RETURN;
  END IF;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_j := b1_mkticket_job('S22', true);
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 's22-first', NULL);
  SELECT (public.create_service_job_visit(v_j, 's22', NULL)).id INTO v_v1;
  SELECT attending_technician_id INTO v_att1
    FROM public.service_job_visits WHERE id = v_v1;
  PERFORM b1_assign_adaptive(v_j, b1_uid('tech2'), 's22-re');
  SELECT attending_technician_id, b1_state('service_job_visits', v_v1)
    INTO v_att1b, v_st1 FROM public.service_job_visits WHERE id = v_v1;
  SELECT (public.create_service_job_visit(v_j, 's22', NULL)).id INTO v_v2;
  SELECT attending_technician_id INTO v_att2
    FROM public.service_job_visits WHERE id = v_v2;
  SELECT count(*) INTO v_hn FROM public.service_job_assignment_history
    WHERE job_id = v_j;
  v_d := b1_mkticket_job('S22D', true);
  PERFORM public.assign_service_job(v_d, b1_uid('tech1'), 's22-first', NULL);
  SELECT (public.create_service_job_visit(v_d, 's22', NULL)).id INTO v_vd;
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  BEGIN
    PERFORM public.decline_service_job(v_d, 's22-out', NULL);
    SELECT attending_technician_id INTO v_att_d FROM public.service_job_visits WHERE id = v_vd;
    v_dok := ((SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_d)
      IS NULL AND b1_state('service_jobs', v_d) = 'unassigned'
      AND b1_state('service_job_visits', v_vd) = 'scheduled'
      AND v_att_d IS NULL);
  EXCEPTION WHEN OTHERS THEN v_dok := false; END;
  PERFORM b1_note('S22', v_att1 = b1_uid('tech1') AND v_att1b = b1_uid('tech2')
    AND v_st1 = 'scheduled' AND v_att2 = b1_uid('tech2') AND v_hn = 2
    AND (SELECT assigned_technician_id FROM public.service_jobs WHERE id = v_j)
      = b1_uid('tech2')
    AND v_dok, 'B3 repoint scheduled attending; moves chained');
EXCEPTION WHEN SQLSTATE '42883' THEN
  PERFORM b1_note('S22', false, 'contract signature mismatch: ' || left(SQLERRM, 200));
WHEN OTHERS THEN
  PERFORM b1_note('S22', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

SELECT check_id, status, detail FROM b1_eval ORDER BY check_id;
SELECT COUNT(*) FILTER (WHERE status='PASS') AS pass, COUNT(*) FILTER (WHERE status='FAIL') AS fail, COUNT(*) FILTER (WHERE status='SKIP') AS skip, COUNT(*) FILTER (WHERE status='DEFER') AS defer FROM b1_eval;
