-- Independent Spark probes for B5 freeze f8fb9358 (disposable/local only).
-- Requires disposable helpers from B5 battery (b1_uid, b5_mk_*, b5_submit, …)
-- or equivalent. Not a product freeze artifact; do not apply to staging.

CREATE TABLE IF NOT EXISTS public.spark_b5_eval (
  check_id text PRIMARY KEY,
  status text NOT NULL,
  detail text
);
TRUNCATE public.spark_b5_eval;

CREATE OR REPLACE FUNCTION public.spark_b5_note(p_id text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.spark_b5_eval(check_id, status, detail)
  VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, left(p_detail, 500))
  ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
END;
$$;

CREATE OR REPLACE FUNCTION public.spark_b5_denied(p_sql text)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql; RETURN false;
EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE IN ('42501','22023','P0002','23514','23505','check_violation')
     OR SQLERRM ILIKE '%permission%' OR SQLERRM ILIKE '%only%'
     OR SQLERRM ILIKE '%required%' OR SQLERRM ILIKE '%Authors%'
     OR SQLERRM ILIKE '%already%' OR SQLERRM ILIKE '%Return%'
     OR SQLERRM ILIKE '%impersonation%' OR SQLERRM ILIKE '%Authentication%'
     OR SQLERRM ILIKE '%Not authorized%'
  THEN RETURN true; END IF;
  RAISE;
END;
$$;

-- SP5-01: exact-revision review — return targets specific revision_id
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid;
  v_r1 public.service_report_revisions;
  v_r2 public.service_report_revisions;
  v_rw public.service_report_reviews;
  a boolean;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b5_mk_completed_visit('sp501');
  v_r1 := b5_submit(v_v, v_t, 'sp501a');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_rw := public.review_service_report_revision(v_r1.id, 'returned', 'fix findings', NULL);
  v_r2 := b5_submit(v_v, v_t, 'sp501b');
  -- Approving r1 again must fail (already decided); approve must target r2
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  a := spark_b5_denied(format(
    $q$SELECT public.review_service_report_revision(%L::uuid,'approved_issued',NULL,NULL)$q$,
    v_r1.id));
  v_rw := public.review_service_report_revision(v_r2.id, 'approved_issued', NULL, NULL);
  PERFORM spark_b5_note('SP5-01_exact_revision',
    a AND v_rw.revision_id = v_r2.id AND v_r2.revision_number = 2,
    'r1_blocked=' || a::text || ' decided=' || v_rw.revision_id::text);
END $$;

-- SP5-02: author cannot review; elevated author still denied; admin/support ok
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid;
  v_rev public.service_report_revisions;
  a boolean; b boolean; c boolean;
  v_rw public.service_report_reviews;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b5_mk_completed_visit('sp502');
  v_rev := b5_submit(v_v, v_t, 'sp502');
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  a := spark_b5_denied(format(
    $q$SELECT public.review_service_report_revision(%L::uuid,'approved_issued',NULL,NULL)$q$,
    v_rev.id));
  UPDATE public.profiles SET role = 'admin' WHERE id = b1_uid('tech1');
  b := spark_b5_denied(format(
    $q$SELECT public.review_service_report_revision(%L::uuid,'approved_issued',NULL,NULL)$q$,
    v_rev.id));
  UPDATE public.profiles SET role = 'technician' WHERE id = b1_uid('tech1');
  PERFORM set_config('app.b1_uid', b1_uid('admin')::text, false);
  v_rw := public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);
  c := v_rw.decision = 'approved_issued' AND v_rw.reviewer_id = b1_uid('admin');
  PERFORM spark_b5_note('SP5-02_author_separation',
    a AND b AND c,
    format('tech=%s elevated=%s admin_ok=%s', a, b, c));
END $$;

-- SP5-03: return requires comments; resubmit immutable prior; audit rows present
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid;
  v_r1 public.service_report_revisions;
  v_r2 public.service_report_revisions;
  v_findings text; v_n_audit int; a boolean;
  v_state text;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b5_mk_completed_visit('sp503');
  v_r1 := b5_submit(v_v, v_t, 'sp503a');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  a := spark_b5_denied(format(
    $q$SELECT public.review_service_report_revision(%L::uuid,'returned',NULL,NULL)$q$,
    v_r1.id));
  PERFORM public.review_service_report_revision(v_r1.id, 'returned', 'need torque values', NULL);
  SELECT state INTO v_state FROM public.service_jobs WHERE id = v_j;
  v_r2 := b5_submit(v_v, v_t, 'sp503b');
  SELECT findings INTO v_findings FROM public.service_report_revisions WHERE id = v_r1.id;
  SELECT count(*) INTO v_n_audit FROM public.service_workflow_audit
  WHERE ticket_id = v_t AND action IN ('return_report', 'approve_issue_report', 'job_transition');
  PERFORM spark_b5_note('SP5-03_return_resubmit_audit',
    a AND v_state = 'in_progress' AND v_findings = 'findings-sp503a'
      AND v_r2.revision_number = 2 AND v_n_audit >= 1,
    format('empty_denied=%s job=%s r1=%s r2n=%s audit=%s',
      a, v_state, v_findings, v_r2.revision_number, v_n_audit));
END $$;

-- SP5-04: atomic approve — review + issued visibility + completing_revision + audit
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid;
  v_rev public.service_report_revisions;
  v_rw public.service_report_reviews;
  v_job public.service_jobs;
  v_n_review int; v_n_audit int; v_vis boolean;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b5_mk_completed_visit('sp504');
  v_rev := b5_submit(v_v, v_t, 'sp504');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_rw := public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);
  SELECT * INTO v_job FROM public.service_jobs WHERE id = v_j;
  SELECT count(*) INTO v_n_review FROM public.service_report_reviews WHERE revision_id = v_rev.id;
  SELECT count(*) INTO v_n_audit FROM public.service_workflow_audit
  WHERE ticket_id = v_t AND action IN ('approve_issue_report', 'job_transition');
  v_vis := admin_private.revision_is_customer_visible(v_rev.id);
  PERFORM spark_b5_note('SP5-04_atomic_issue',
    v_rw.decision = 'approved_issued'
      AND v_n_review = 1
      AND v_job.state = 'completed'
      AND v_job.completing_revision_id = v_rev.id
      AND v_vis
      AND v_n_audit >= 2,
    format('job=%s completing=%s vis=%s audit=%s',
      v_job.state, v_job.completing_revision_id, v_vis, v_n_audit));
END $$;

-- SP5-05: issued retained while newer unissued correction awaits (FWR keeps job open)
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid;
  v_r1 public.service_report_revisions;
  v_r2 public.service_report_revisions;
  v_bundle jsonb; v_n int; v_id text; v_staff_n int;
  v_path text; v_secret text;
  v_cust_has_secret boolean; v_table_r1 int; v_table_r2 int;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b5_mk_completed_visit('sp505');
  v_r1 := b5_submit(v_v, v_t, 'sp505a', 'further_work_required', 'need parts');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  PERFORM public.review_service_report_revision(v_r1.id, 'approved_issued', NULL, NULL);
  v_secret := 'SECRET_UNISSUED_CORR';
  v_path := v_t::text || '/b4/sp505-SECRET.jpg';
  PERFORM b5_seed_evidence(v_t, v_path);
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  v_r2 := public.submit_service_report_revision(
    v_v, v_secret, 'work-corr', '[]'::jsonb, true, 'verified_fixed', NULL,
    'I declare', ARRAY[v_path], NULL, gen_random_uuid(), NULL);

  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  EXECUTE 'SET ROLE b1_auth';
  v_bundle := public.get_service_report_for_visit(v_v);
  SELECT count(*) INTO v_table_r1 FROM public.service_report_revisions WHERE id = v_r1.id;
  SELECT count(*) INTO v_table_r2 FROM public.service_report_revisions WHERE id = v_r2.id;
  EXECUTE 'RESET ROLE';
  v_n := jsonb_array_length(v_bundle->'revisions');
  v_id := v_bundle->'revisions'->0->>'id';
  v_cust_has_secret := v_bundle::text LIKE '%' || v_secret || '%'
                    OR v_bundle::text LIKE '%sp505-SECRET.jpg%';

  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  EXECUTE 'SET ROLE b1_auth';
  v_staff_n := jsonb_array_length((public.get_service_report_for_visit(v_v))->'revisions');
  EXECUTE 'RESET ROLE';

  PERFORM spark_b5_note('SP5-05_issued_retained_privacy',
    v_n = 1 AND v_id = v_r1.id::text AND NOT v_cust_has_secret
      AND v_table_r1 = 1 AND v_table_r2 = 0 AND v_staff_n = 2,
    format('cust_n=%s table_r1=%s table_r2=%s staff_n=%s secret_leak=%s',
      v_n, v_table_r1, v_table_r2, v_staff_n, v_cust_has_secret));
END $$;

-- SP5-06: getter + table SELECT matrix (cust, tech, sales-owner, support, anon, unrelated)
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid;
  v_rev public.service_report_revisions;
  v_g_n int; v_t_n int;
  v_ok boolean := true;
  v_detail text := '';
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b5_mk_completed_visit('sp506', b1_uid('sales'));
  v_rev := b5_submit(v_v, v_t, 'sp506');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  PERFORM public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);

  -- sales owner (non-customer role)
  PERFORM set_config('app.b1_uid', b1_uid('sales')::text, false);
  EXECUTE 'SET ROLE b1_auth';
  v_g_n := jsonb_array_length((public.get_service_report_for_visit(v_v))->'revisions');
  SELECT count(*) INTO v_t_n FROM public.service_report_revisions WHERE id = v_rev.id;
  EXECUTE 'RESET ROLE';
  v_ok := v_ok AND v_g_n = 1 AND v_t_n = 1;
  v_detail := v_detail || format('sales_g=%s_t=%s;', v_g_n, v_t_n);

  -- support staff
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  EXECUTE 'SET ROLE b1_auth';
  v_g_n := jsonb_array_length((public.get_service_report_for_visit(v_v))->'revisions');
  SELECT count(*) INTO v_t_n FROM public.service_report_revisions WHERE id = v_rev.id;
  EXECUTE 'RESET ROLE';
  v_ok := v_ok AND v_g_n = 1 AND v_t_n = 1;
  v_detail := v_detail || format('support_g=%s_t=%s;', v_g_n, v_t_n);

  -- technician (workflow staff role)
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  EXECUTE 'SET ROLE b1_auth';
  v_g_n := jsonb_array_length((public.get_service_report_for_visit(v_v))->'revisions');
  SELECT count(*) INTO v_t_n FROM public.service_report_revisions WHERE id = v_rev.id;
  EXECUTE 'RESET ROLE';
  v_ok := v_ok AND v_g_n = 1 AND v_t_n = 1;
  v_detail := v_detail || format('tech_g=%s_t=%s;', v_g_n, v_t_n);

  -- unrelated customer
  PERFORM set_config('app.b1_uid', b1_uid('cust2')::text, false);
  EXECUTE 'SET ROLE b1_auth';
  BEGIN
    PERFORM public.get_service_report_for_visit(v_v);
    v_ok := false;
    v_detail := v_detail || 'cust2_getter_allowed;';
  EXCEPTION WHEN OTHERS THEN
    v_detail := v_detail || 'cust2_getter_denied;';
  END;
  SELECT count(*) INTO v_t_n FROM public.service_report_revisions WHERE id = v_rev.id;
  EXECUTE 'RESET ROLE';
  v_ok := v_ok AND v_t_n = 0;
  v_detail := v_detail || format('cust2_t=%s;', v_t_n);

  -- anonymous / no uid
  PERFORM set_config('app.b1_uid', '', false);
  BEGIN
    EXECUTE 'SET ROLE b1_auth';
    PERFORM public.get_service_report_for_visit(v_v);
    EXECUTE 'RESET ROLE';
    v_ok := false;
    v_detail := v_detail || 'anon_allowed;';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    v_detail := v_detail || 'anon_denied;';
  END;

  PERFORM spark_b5_note('SP5-06_visibility_matrix', v_ok, v_detail);
END $$;

-- SP5-07: further_work_required blocks completion; outstanding visit blocks completion
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_v2 uuid;
  v_rev public.service_report_revisions;
  v_state text; v_cr uuid;
  v_s timestamptz := now() + interval '10 hours';
  v_e timestamptz := now() + interval '12 hours';
BEGIN
  -- FWR
  SELECT * INTO v_t, v_j, v_v FROM b5_mk_completed_visit('sp507a');
  v_rev := b5_submit(v_v, v_t, 'sp507a', 'further_work_required', 'parts');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  PERFORM public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);
  SELECT state, completing_revision_id INTO v_state, v_cr FROM public.service_jobs WHERE id = v_j;
  PERFORM spark_b5_note('SP5-07a_fwr_blocks_complete',
    v_state = 'awaiting_review' AND v_cr IS NULL,
    format('state=%s completing=%s', v_state, coalesce(v_cr::text,'null')));

  -- Outstanding scheduled visit
  SELECT * INTO v_t, v_j, v_v FROM b5_mk_completed_visit('sp507b');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SELECT (public.schedule_service_job_visit(v_j, v_s, v_e, 'outstanding', NULL)).id INTO v_v2;
  v_rev := b5_submit(v_v, v_t, 'sp507b');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  PERFORM public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);
  SELECT state, completing_revision_id INTO v_state, v_cr FROM public.service_jobs WHERE id = v_j;
  PERFORM spark_b5_note('SP5-07b_outstanding_visit_blocks',
    v_state = 'awaiting_review' AND v_cr IS NULL,
    format('state=%s completing=%s visit2=%s', v_state, coalesce(v_cr::text,'null'), v_v2));
END $$;

-- SP5-08: B6 unavailable — no acknowledge/close RPCs; ack direct write denied
DO $$
DECLARE
  a boolean; b boolean; c boolean;
  v_ack_reg boolean;
  v_close_reg boolean;
BEGIN
  v_ack_reg := to_regprocedure('public.acknowledge_service_report_revision(uuid,uuid)') IS NOT NULL
            OR to_regprocedure('public.acknowledge_service_report(uuid,uuid)') IS NOT NULL
            OR to_regprocedure('public.submit_service_acknowledgment(uuid,text,uuid)') IS NOT NULL;
  v_close_reg := to_regprocedure('public.close_service_workflow_ticket(uuid,uuid)') IS NOT NULL
              OR to_regprocedure('public.close_workflow_ticket(uuid,uuid)') IS NOT NULL;

  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, false);
  BEGIN
    EXECUTE 'SET ROLE b1_auth';
    BEGIN
      INSERT INTO public.service_acknowledgments(
        issued_revision_id, response, responded_by
      ) VALUES (gen_random_uuid(), 'accepted', b1_uid('cust1'));
      a := false;
    EXCEPTION WHEN OTHERS THEN
      a := true;
    END;
    EXECUTE 'RESET ROLE';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    a := true;
  END;

  PERFORM spark_b5_note('SP5-08_b6_unavailable',
    (NOT v_ack_reg) AND (NOT v_close_reg) AND a,
    format('ack_rpc=%s close_rpc=%s ack_insert_denied=%s', v_ack_reg, v_close_reg, a));
END $$;

-- SP5-09: actor injection / service_role delegation / forged actor
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid;
  v_rev public.service_report_revisions;
  a boolean; b boolean; c boolean;
  v_rw public.service_report_reviews;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b5_mk_completed_visit('sp509');
  v_rev := b5_submit(v_v, v_t, 'sp509');

  -- Authenticated tech forging support actor id
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  a := spark_b5_denied(format(
    $q$SELECT public.review_service_report_revision(%L::uuid,'approved_issued',NULL,%L::uuid)$q$,
    v_rev.id, b1_uid('support')));

  -- service_role without delegated actor
  BEGIN
    EXECUTE 'SET ROLE service_role';
    PERFORM set_config('request.jwt.claim.role', 'service_role', true);
    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
    PERFORM set_config('app.b1_uid', '', false);
    b := spark_b5_denied(format(
      $q$SELECT public.review_service_report_revision(%L::uuid,'approved_issued',NULL,NULL)$q$,
      v_rev.id));
    EXECUTE 'RESET ROLE';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    b := true;
  END;

  -- service_role with delegated support actor
  BEGIN
    EXECUTE 'SET ROLE service_role';
    PERFORM set_config('request.jwt.claim.role', 'service_role', true);
    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
    PERFORM set_config('app.b1_uid', '', false);
    v_rw := public.review_service_report_revision(
      v_rev.id, 'approved_issued', NULL, b1_uid('support'));
    c := v_rw.reviewer_id = b1_uid('support');
    EXECUTE 'RESET ROLE';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    c := false;
    PERFORM spark_b5_note('SP5-09_delegation', false, SQLERRM);
    RETURN;
  END;

  PERFORM spark_b5_note('SP5-09_injection_delegation',
    a AND b AND c,
    format('forge_denied=%s sr_no_actor=%s sr_delegated=%s', a, b, c));
END $$;

-- SP5-10: direct-write denial on reviews (authenticated)
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid;
  v_rev public.service_report_revisions;
  a boolean := false;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b5_mk_completed_visit('sp510');
  v_rev := b5_submit(v_v, v_t, 'sp510');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  BEGIN
    EXECUTE 'SET ROLE b1_auth';
    BEGIN
      INSERT INTO public.service_report_reviews(revision_id, reviewer_id, decision)
      VALUES (v_rev.id, b1_uid('support'), 'approved_issued');
      a := false;
    EXCEPTION WHEN OTHERS THEN
      a := true;
    END;
    EXECUTE 'RESET ROLE';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    a := true;
  END;
  PERFORM spark_b5_note('SP5-10_direct_write', a, 'denied=' || a::text);
END $$;

-- SP5-11: verification outcome preserved on approve (not rewritten to RTS)
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid;
  v_rev public.service_report_revisions;
  v_out text;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b5_mk_completed_visit('sp511');
  v_rev := b5_submit(v_v, v_t, 'sp511', 'not_reproduced', 'could not reproduce on site');
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  PERFORM public.review_service_report_revision(v_rev.id, 'approved_issued', NULL, NULL);
  SELECT verification_outcome INTO v_out FROM public.service_report_revisions WHERE id = v_rev.id;
  PERFORM spark_b5_note('SP5-11_verification_preserved',
    v_out = 'not_reproduced',
    'outcome=' || coalesce(v_out,'null'));
END $$;

SELECT check_id, status, detail FROM public.spark_b5_eval ORDER BY check_id;
SELECT
  COUNT(*) FILTER (WHERE status = 'PASS') AS pass,
  COUNT(*) FILTER (WHERE status = 'FAIL') AS fail,
  0 AS skip,
  COUNT(*) FILTER (WHERE status = 'DEFER') AS defer
FROM public.spark_b5_eval;
