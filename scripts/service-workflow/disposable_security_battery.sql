-- Security remediation battery for B1/B2 actor / activation / direct-write fixes.
-- Intended to FAIL-OPEN against vulnerable B1+B2, PASS after corrective migration.
-- Uses same disposable fixtures as disposable_b1_battery (b1_uid / b1_mkticket helpers).

CREATE TABLE IF NOT EXISTS public.sec_eval (
  check_id text PRIMARY KEY,
  status text NOT NULL,
  detail text
);
TRUNCATE public.sec_eval;

CREATE OR REPLACE FUNCTION sec_note(p_id text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.sec_eval(check_id, status, detail)
  VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, left(p_detail, 300))
  ON CONFLICT (check_id) DO UPDATE
    SET status = EXCLUDED.status, detail = EXCLUDED.detail;
END;
$$;

CREATE OR REPLACE FUNCTION sec_expect_denied(p_sql text)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql;
  RETURN false; -- succeeded = fail-open
EXCEPTION WHEN SQLSTATE '42501' THEN
  RETURN true;
WHEN OTHERS THEN
  -- other errors still count as denied for exploit attempts
  IF SQLSTATE IN ('42501', 'P0001') OR SQLERRM ILIKE '%Authentication required%'
     OR SQLERRM ILIKE '%impersonation%'
     OR SQLERRM ILIKE '%Service-role actor%'
     OR SQLERRM ILIKE '%immutable%'
     OR SQLERRM ILIKE '%permission denied%'
     OR SQLERRM ILIKE '%Protected ticket%'
  THEN
    RETURN true;
  END IF;
  RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION sec_ticket(p_tag text)
RETURNS text LANGUAGE sql AS $$
  SELECT p_tag || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
$$;

-- ---------------------------------------------------------------------------
-- SEC1: Anonymous + real staff actor ID must be rejected (assign surface)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t uuid; v_j uuid; v_denied boolean;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', sec_ticket('SEC1'));
  SELECT (public.create_service_job(v_t, 'sec1', true, 'sec1')).id INTO v_j;

  SET ROLE anon;
  PERFORM set_config('request.jwt.claim.role', 'anon', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  PERFORM set_config('app.b1_uid', '', true);

  v_denied := sec_expect_denied(format(
    $q$SELECT public.assign_service_job(%L::uuid, %L::uuid, 'anon-spoof', %L::uuid)$q$,
    v_j, b1_uid('tech1'), b1_uid('support')
  ));
  RESET ROLE;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  PERFORM sec_note('SEC1', v_denied, CASE WHEN v_denied
    THEN 'anon+staff actor rejected'
    ELSE 'FAIL-OPEN: anon impersonated staff via p_actor_id' END);
EXCEPTION WHEN OTHERS THEN
  BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM sec_note('SEC1', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- ---------------------------------------------------------------------------
-- SEC2: Authenticated mismatched actor cannot impersonate
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t uuid; v_j uuid; v_denied boolean;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', sec_ticket('SEC2'));
  SELECT (public.create_service_job(v_t, 'sec2', true, 'sec2')).id INTO v_j;

  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  SET ROLE b1_auth;
  v_denied := sec_expect_denied(format(
    $q$SELECT public.assign_service_job(%L::uuid, %L::uuid, 'mismatch', %L::uuid)$q$,
    v_j, b1_uid('tech2'), b1_uid('support')
  ));
  RESET ROLE;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  PERFORM sec_note('SEC2', v_denied, CASE WHEN v_denied
    THEN 'mismatched actor denied'
    ELSE 'FAIL-OPEN: authenticated impersonation succeeded' END);
EXCEPTION WHEN OTHERS THEN
  BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM sec_note('SEC2', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- ---------------------------------------------------------------------------
-- SEC3: Authorized service-role actor works; missing actor denied
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t uuid; v_j uuid; v_ok boolean := false; v_missing_denied boolean;
BEGIN
  PERFORM set_config('app.b1_uid', '', true);
  SET ROLE service_role;
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);

  -- Create ticket as table owner path first
  RESET ROLE;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', sec_ticket('SEC3'));

  SET ROLE service_role;
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('app.b1_uid', '', true);

  BEGIN
    -- Prefer 5-arg create (post-fix). On vulnerable B1, create ignores actor
    -- and fails under service_role; prove override via assign instead.
    BEGIN
      SELECT (public.create_service_job(
        v_t, 'sec3', true, 'svc', b1_uid('support')
      )).id INTO v_j;
      v_ok := (v_j IS NOT NULL);
    EXCEPTION WHEN undefined_function OR SQLSTATE '42883' OR SQLSTATE '42501' THEN
      -- Seed a job as table owner, then service-role assign with actor override
      RESET ROLE;
      PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
      SELECT (public.create_service_job(v_t, 'sec3', true, 'seed')).id INTO v_j;
      SET ROLE service_role;
      PERFORM set_config('request.jwt.claim.role', 'service_role', true);
      PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
      PERFORM set_config('request.jwt.claim.sub', '', true);
      PERFORM set_config('app.b1_uid', '', true);
      PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'svc-actor', b1_uid('support'));
      v_ok := true;
    END;
  EXCEPTION WHEN OTHERS THEN
    v_ok := false;
  END;

  v_missing_denied := sec_expect_denied(format(
    $q$SELECT public.assign_service_job(
      (SELECT id FROM public.service_jobs WHERE ticket_id = %L::uuid LIMIT 1),
      %L::uuid, 'missing-actor', NULL::uuid)$q$,
    v_t, b1_uid('tech1')
  ));
  -- If no job yet (authorized create failed), still probe create without actor
  IF v_j IS NULL THEN
    v_missing_denied := sec_expect_denied(format(
      $q$SELECT public.create_service_job(%L::uuid, 'sec3b', true, 'missing-actor')$q$,
      v_t
    ));
  END IF;

  RESET ROLE;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  PERFORM sec_note('SEC3', v_ok AND v_missing_denied,
    CASE WHEN v_ok AND v_missing_denied THEN 'service-role actor ok; missing denied'
         WHEN NOT v_ok THEN 'FAIL: service-role+actor create failed'
         ELSE 'FAIL-OPEN: service-role missing actor allowed' END);
EXCEPTION WHEN OTHERS THEN
  BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM sec_note('SEC3', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- ---------------------------------------------------------------------------
-- SEC4: Activation durability boundaries (do not conflate)
--   - Ordinary authenticated owner/assignee/staff: must be denied (already at
--     7a830739 for client UPDATE). Not an API-accessible clear if denied.
--   - Privileged table-owner / DEFINER SQL: pre-fix may clear (not ordinary
--     client exploit); post-fix must deny (immutable once set).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t uuid; v_j uuid;
  v_clear_denied boolean; v_rewrite_denied boolean;
  v_priv_clear_denied boolean; v_still boolean; v_actor uuid;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', sec_ticket('SEC4'));
  -- assign ticket to support so owner/assignee paths are realistic
  UPDATE public.service_tickets SET assigned_to = b1_uid('support') WHERE id = v_t;
  SELECT (public.create_service_job(v_t, 'sec4', true, 'sec4')).id INTO v_j;
  SELECT workflow_activated_by INTO v_actor FROM public.service_tickets WHERE id = v_t;

  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SET ROLE b1_auth;
  v_clear_denied := sec_expect_denied(format(
    $q$UPDATE public.service_tickets SET workflow_activated_at = NULL WHERE id = %L::uuid$q$, v_t
  ));
  v_rewrite_denied := sec_expect_denied(format(
    $q$UPDATE public.service_tickets SET workflow_activated_by = %L::uuid WHERE id = %L::uuid$q$,
    b1_uid('cust2'), v_t
  ));
  RESET ROLE;

  -- Privileged clear must also fail after remediation (immutable once set)
  v_priv_clear_denied := sec_expect_denied(format(
    $q$UPDATE public.service_tickets SET workflow_activated_at = NULL, workflow_activated_by = NULL WHERE id = %L::uuid$q$,
    v_t
  ));

  SELECT (workflow_activated_at IS NOT NULL AND workflow_activated_by = v_actor)
    INTO v_still FROM public.service_tickets WHERE id = v_t;

  PERFORM sec_note('SEC4',
    v_clear_denied AND v_rewrite_denied AND v_priv_clear_denied AND v_still,
    CASE WHEN v_clear_denied AND v_rewrite_denied AND v_priv_clear_denied AND v_still
      THEN 'activation clear/rewrite blocked (client+privileged)'
      ELSE format('clear=%s rewrite=%s priv=%s still=%s',
        v_clear_denied, v_rewrite_denied, v_priv_clear_denied, v_still)
    END);
EXCEPTION WHEN OTHERS THEN
  BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM sec_note('SEC4', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- ---------------------------------------------------------------------------
-- SEC5: Direct INSERT boundaries (test separately)
--   - Ordinary authenticated admin/support: expect DENIED (no table INSERT).
--   - service_role (+ BYPASSRLS posture before_fix): pre-fix may INSERT
--     without activation/sequence/audit; post-fix must DENY.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t uuid; v_denied_auth boolean; v_denied_svc boolean;
  v_jobs0 int; v_jobs1 int; v_act boolean; v_aud0 int; v_aud1 int;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', sec_ticket('SEC5'));
  SELECT count(*) INTO v_jobs0 FROM public.service_jobs WHERE ticket_id = v_t;
  SELECT count(*) INTO v_aud0 FROM public.service_workflow_audit WHERE ticket_id = v_t;

  SET ROLE b1_auth;
  v_denied_auth := sec_expect_denied(format(
    $q$INSERT INTO public.service_jobs (ticket_id, job_sequence, title, required, state, created_by)
       VALUES (%L::uuid, 1, 'direct', true, 'unassigned', %L::uuid)$q$,
    v_t, b1_uid('support')
  ));
  RESET ROLE;

  SET ROLE service_role;
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  v_denied_svc := sec_expect_denied(format(
    $q$INSERT INTO public.service_jobs (ticket_id, job_sequence, title, required, state, created_by)
       VALUES (%L::uuid, 1, 'direct-svc', true, 'unassigned', %L::uuid)$q$,
    v_t, b1_uid('support')
  ));
  RESET ROLE;

  SELECT count(*) INTO v_jobs1 FROM public.service_jobs WHERE ticket_id = v_t;
  SELECT (workflow_activated_at IS NOT NULL) INTO v_act FROM public.service_tickets WHERE id = v_t;
  SELECT count(*) INTO v_aud1 FROM public.service_workflow_audit WHERE ticket_id = v_t;

  PERFORM sec_note('SEC5',
    v_denied_auth AND v_denied_svc AND v_jobs0 = v_jobs1 AND NOT v_act AND v_aud0 = v_aud1,
    CASE WHEN v_denied_auth AND v_denied_svc AND v_jobs0 = v_jobs1 AND NOT v_act
      THEN 'direct INSERT blocked; no activation/audit'
      ELSE format('auth=%s svc=%s jobs=%s->%s act=%s',
        v_denied_auth, v_denied_svc, v_jobs0, v_jobs1, v_act)
    END);
EXCEPTION WHEN OTHERS THEN
  BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM sec_note('SEC5', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- ---------------------------------------------------------------------------
-- SEC6: Legitimate governed creation/assignment + atomic audit
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t uuid; v_j uuid; v_j2 uuid;
  v_act boolean; v_seq int; v_hist int; v_aud int; v_tech uuid;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', sec_ticket('SEC6'));
  SELECT (public.ensure_default_service_job(
    v_t, b1_uid('tech1'), 'Job 1', 'sec6 ensure', NULL
  )).id INTO v_j;
  SELECT workflow_activated_at IS NOT NULL, job_sequence, assigned_technician_id
    INTO v_act, v_seq, v_tech
  FROM public.service_jobs j
  JOIN public.service_tickets t ON t.id = j.ticket_id
  WHERE j.id = v_j
  LIMIT 1;
  SELECT (workflow_activated_at IS NOT NULL) INTO v_act
    FROM public.service_tickets WHERE id = v_t;
  SELECT job_sequence, assigned_technician_id INTO v_seq, v_tech
    FROM public.service_jobs WHERE id = v_j;
  SELECT count(*) INTO v_hist FROM public.service_job_assignment_history WHERE job_id = v_j;
  SELECT count(*) INTO v_aud FROM public.service_workflow_audit
    WHERE ticket_id = v_t AND entity_id = v_j;

  -- second job via create_service_job
  SELECT (public.create_service_job(v_t, 'Job 2', true, 'sec6 j2')).id INTO v_j2;

  PERFORM sec_note('SEC6',
    v_act AND v_seq = 1 AND v_tech = b1_uid('tech1') AND v_hist >= 1 AND v_aud >= 1 AND v_j2 IS NOT NULL,
    format('act=%s seq=%s tech_ok=%s hist=%s aud=%s j2=%s',
      v_act, v_seq, (v_tech = b1_uid('tech1')), v_hist, v_aud, (v_j2 IS NOT NULL)));
EXCEPTION WHEN OTHERS THEN
  PERFORM sec_note('SEC6', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- ---------------------------------------------------------------------------
-- SEC7: Cleared activation must not bypass resolve gate (prove immutability impact)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t uuid; v_j uuid; v_bypassed boolean := false; v_cleared boolean := false;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', sec_ticket('SEC7'));
  PERFORM public.govern_ticket_transition(v_t, 'assigned', 'sec7', NULL);
  PERFORM public.govern_ticket_transition(v_t, 'in_progress', 'sec7', NULL);
  SELECT (public.create_service_job(v_t, 'req', true, 'sec7')).id INTO v_j;

  BEGIN
    UPDATE public.service_tickets SET workflow_activated_at = NULL WHERE id = v_t;
    v_cleared := true;
  EXCEPTION WHEN OTHERS THEN
    v_cleared := false;
  END;

  BEGIN
    PERFORM public.govern_ticket_transition(v_t, 'resolved', 'sec7', 'bypass?');
    v_bypassed := true;
  EXCEPTION WHEN OTHERS THEN
    v_bypassed := false;
  END;

  PERFORM sec_note('SEC7', (NOT v_cleared) AND (NOT v_bypassed),
    CASE WHEN NOT v_cleared AND NOT v_bypassed THEN 'no clear; no resolve bypass'
         WHEN v_cleared AND v_bypassed THEN 'FAIL-OPEN: clear enabled resolve bypass'
         ELSE format('cleared=%s bypassed=%s', v_cleared, v_bypassed) END);
EXCEPTION WHEN OTHERS THEN
  PERFORM sec_note('SEC7', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

-- ---------------------------------------------------------------------------
-- SEC8: Spark forged-review → job-completion (service_role direct writes)
--   service_role must NOT INSERT report/revision/review to unlock completed.
--   Report submission/review RPCs remain deferred — no compensating write grant.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid;
  v_rep uuid; v_rev uuid;
  v_forge_ok boolean := false; v_completed boolean := false;
  v_state text;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', sec_ticket('SEC8'));
  SELECT (public.create_service_job(v_t, 'sec8', true, 'sec8')).id INTO v_j;
  PERFORM public.govern_job_transition(v_j, 'planned', 'sec8', NULL);
  PERFORM public.govern_job_transition(v_j, 'in_progress', 'sec8', NULL);
  PERFORM public.govern_job_transition(v_j, 'awaiting_review', 'sec8', NULL);
  SELECT (public.create_service_job_visit(v_j, 'sec8 visit', NULL)).id INTO v_v;
  PERFORM public.govern_visit_transition(v_v, 'in_progress', 'sec8', NULL);
  PERFORM public.govern_visit_transition(v_v, 'completed', 'sec8', NULL);

  SET ROLE service_role;
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  PERFORM set_config('app.b1_uid', '', true);

  BEGIN
    INSERT INTO public.service_reports (visit_id)
    VALUES (v_v) RETURNING id INTO v_rep;
    INSERT INTO public.service_report_revisions (
      report_id, revision_number, findings, verification_outcome, submitted_by
    ) VALUES (
      v_rep, 1, 'forged', 'verified_fixed', b1_uid('support')
    ) RETURNING id INTO v_rev;
    INSERT INTO public.service_report_reviews (
      revision_id, reviewer_id, decision
    ) VALUES (
      v_rev, b1_uid('support'), 'approved_issued'
    );
    v_forge_ok := true;
  EXCEPTION WHEN OTHERS THEN
    v_forge_ok := false;
  END;
  RESET ROLE;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);

  IF v_forge_ok THEN
    BEGIN
      PERFORM public.govern_job_transition(v_j, 'completed', 'sec8 forged', NULL);
      v_completed := true;
    EXCEPTION WHEN OTHERS THEN
      v_completed := false;
    END;
  END IF;

  SELECT state INTO v_state FROM public.service_jobs WHERE id = v_j;

  PERFORM sec_note('SEC8',
    (NOT v_forge_ok) AND (NOT v_completed) AND v_state = 'awaiting_review',
    CASE WHEN NOT v_forge_ok AND NOT v_completed AND v_state = 'awaiting_review'
      THEN 'service_role forged review blocked; job stays awaiting_review'
      WHEN v_forge_ok AND v_completed
      THEN 'FAIL-OPEN: forged review unlocked job completion'
      ELSE format('forge=%s completed=%s state=%s', v_forge_ok, v_completed, v_state)
    END);
EXCEPTION WHEN OTHERS THEN
  BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM sec_note('SEC8', false, SQLSTATE || ' ' || left(SQLERRM, 200));
END $$;

SELECT check_id, status, detail FROM public.sec_eval ORDER BY check_id;
SELECT COUNT(*) FILTER (WHERE status='PASS') AS pass,
       COUNT(*) FILTER (WHERE status='FAIL') AS fail
FROM public.sec_eval;
