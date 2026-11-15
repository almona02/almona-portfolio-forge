-- Spark forgery-family probes for amended corrective 20261112150000 (post-fix only).
-- Author: independent QA/security review (Spark). No secrets in this file.
-- Companion to spark_independent_probes.sql (run that file first): provides I-16C
-- (forgery INSERT denied on reports/revisions/reviews/acknowledgments + completion
-- gate holds), I-16D (UPDATE/DELETE denied on the same family), I-16E (authenticated
-- SELECT preserved). Prerequisites: same stack as the companion file. Rerunnable.
CREATE TABLE IF NOT EXISTS public.ind_eval(check_id text PRIMARY KEY, status text NOT NULL, detail text);
CREATE OR REPLACE FUNCTION ind_note(p_id text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.ind_eval(check_id, status, detail)
  VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, left(p_detail, 300))
  ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
END; $$;
CREATE OR REPLACE FUNCTION ind_denied(p_sql text)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN EXECUTE p_sql; RETURN false;
EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE = '42501' OR SQLERRM ILIKE '%permission denied%' OR SQLERRM ILIKE '%Authentication required%'
     OR SQLERRM ILIKE '%impersonation%' OR SQLERRM ILIKE '%Service-role actor%' OR SQLERRM ILIKE '%Unknown actor%'
     OR SQLERRM ILIKE '%immutable%' OR SQLERRM ILIKE '%Protected%' THEN RETURN true; END IF;
  RAISE; END; $$;
CREATE OR REPLACE FUNCTION ind_ticket(p_tag text)
RETURNS text LANGUAGE sql AS $$
  SELECT p_tag || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
$$;
DO $$
DECLARE v_t uuid; v_j uuid; v_v uuid;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  v_t := b1_mkticket('cust1', ind_ticket('IND-FORGE'));
  PERFORM public.govern_ticket_transition(v_t, 'assigned', 'ind', NULL, b1_uid('support'));
  PERFORM public.govern_ticket_transition(v_t, 'in_progress', 'ind', NULL, b1_uid('support'));
  SELECT (public.ensure_default_service_job(v_t, b1_uid('tech1'), 'Job 1', 'ind', NULL)).id INTO v_j;
  PERFORM public.govern_job_transition(v_j, 'in_progress', 'ind', NULL);
  SELECT (public.create_service_job_visit(v_j, 'ind', NULL)).id INTO v_v;
  PERFORM public.govern_visit_transition(v_v, 'in_progress', 'ind', NULL);
  PERFORM public.govern_visit_transition(v_v, 'completed', 'ind', NULL);
  PERFORM public.govern_job_transition(v_j, 'awaiting_review', 'ind', NULL);
  PERFORM set_config('app.fg_t', v_t::text, false);
  PERFORM set_config('app.fg_j', v_j::text, false);
  PERFORM set_config('app.fg_v', v_v::text, false);
END $$;

-- I-16C: forgery INSERT on all 4 tables denied (service_role + authenticated); completion fails; stays awaiting_review
DO $$
DECLARE ok boolean := true; det text := ''; d boolean; v_state text; v_completed boolean := false;
  v_rep uuid; v_rev uuid;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SET ROLE service_role;
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  PERFORM set_config('app.b1_uid', '', true);
  d := ind_denied(format($q$INSERT INTO public.service_reports (visit_id) VALUES (%L::uuid)$q$, current_setting('app.fg_v'))); ok := ok AND d; det := det || 'svcInsRep=' || d || ' ';
  d := ind_denied(format($q$INSERT INTO public.service_report_revisions (report_id, revision_number, findings, verification_outcome, submitted_by) VALUES (%L::uuid, 1, 'f', 'verified_fixed', %L::uuid)$q$, '00000000-0000-0000-0000-000000000000', b1_uid('tech1'))); ok := ok AND d; det := det || 'svcInsRev=' || d || ' ';
  d := ind_denied(format($q$INSERT INTO public.service_report_reviews (revision_id, reviewer_id, decision) VALUES (%L::uuid, %L::uuid, 'approved_issued')$q$, '00000000-0000-0000-0000-000000000000', b1_uid('support'))); ok := ok AND d; det := det || 'svcInsRvw=' || d || ' ';
  d := ind_denied(format($q$INSERT INTO public.service_acknowledgments (issued_revision_id, response, responded_by) VALUES (%L::uuid, 'accepted', %L::uuid)$q$, '00000000-0000-0000-0000-000000000000', b1_uid('cust1'))); ok := ok AND d; det := det || 'svcInsAck=' || d || ' ';
  RESET ROLE;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SET ROLE b1_auth;
  d := ind_denied(format($q$INSERT INTO public.service_reports (visit_id) VALUES (%L::uuid)$q$, current_setting('app.fg_v'))); ok := ok AND d; det := det || 'authInsRep=' || d || ' ';
  d := ind_denied(format($q$INSERT INTO public.service_report_reviews (revision_id, reviewer_id, decision) VALUES (%L::uuid, %L::uuid, 'approved_issued')$q$, '00000000-0000-0000-0000-000000000000', b1_uid('support'))); ok := ok AND d; det := det || 'authInsRvw=' || d || ' ';
  RESET ROLE;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  BEGIN
    PERFORM public.govern_job_transition(current_setting('app.fg_j')::uuid, 'completed', 'ind', NULL);
    v_completed := true;
  EXCEPTION WHEN OTHERS THEN v_completed := false; det := det || 'gate_held(' || SQLSTATE || ') '; END;
  SELECT state INTO v_state FROM public.service_jobs WHERE id = current_setting('app.fg_j')::uuid;
  PERFORM ind_note('I-16C', ok AND NOT v_completed AND v_state = 'awaiting_review', det || 'completed=' || v_completed || ' state=' || v_state);
EXCEPTION WHEN OTHERS THEN BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM ind_note('I-16C', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- I-16D: UPDATE/DELETE on 4 tables denied (service_role + authenticated); seed rows as owner first
DO $$
DECLARE ok boolean := true; det text := ''; d boolean; v_rep uuid; v_rev uuid; v_rvw uuid; v_ack uuid;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  INSERT INTO public.service_reports (visit_id) VALUES (current_setting('app.fg_v')::uuid) RETURNING id INTO v_rep;
  INSERT INTO public.service_report_revisions (report_id, revision_number, findings, verification_outcome, submitted_by)
    VALUES (v_rep, 1, 'seed', 'verified_fixed', b1_uid('tech1')) RETURNING id INTO v_rev;
  INSERT INTO public.service_report_reviews (revision_id, reviewer_id, decision)
    VALUES (v_rev, b1_uid('support'), 'returned') RETURNING id INTO v_rvw;
  INSERT INTO public.service_acknowledgments (issued_revision_id, response, responded_by)
    VALUES (v_rev, 'unavailable', b1_uid('cust1')) RETURNING id INTO v_ack;
  SET ROLE service_role;
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  d := ind_denied(format($q$UPDATE public.service_report_reviews SET decision='approved_issued' WHERE id=%L::uuid$q$, v_rvw)); ok := ok AND d; det := det || 'svcUpRvw=' || d || ' ';
  d := ind_denied(format($q$DELETE FROM public.service_report_reviews WHERE id=%L::uuid$q$, v_rvw)); ok := ok AND d; det := det || 'svcDelRvw=' || d || ' ';
  d := ind_denied(format($q$UPDATE public.service_report_revisions SET verification_outcome='not_verified' WHERE id=%L::uuid$q$, v_rev)); ok := ok AND d; det := det || 'svcUpRev=' || d || ' ';
  d := ind_denied(format($q$DELETE FROM public.service_reports WHERE id=%L::uuid$q$, v_rep)); ok := ok AND d; det := det || 'svcDelRep=' || d || ' ';
  d := ind_denied(format($q$UPDATE public.service_acknowledgments SET response='accepted' WHERE id=%L::uuid$q$, v_ack)); ok := ok AND d; det := det || 'svcUpAck=' || d || ' ';
  d := ind_denied(format($q$DELETE FROM public.service_acknowledgments WHERE id=%L::uuid$q$, v_ack)); ok := ok AND d; det := det || 'svcDelAck=' || d || ' ';
  RESET ROLE;
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SET ROLE b1_auth;
  d := ind_denied(format($q$UPDATE public.service_report_reviews SET decision='approved_issued' WHERE id=%L::uuid$q$, v_rvw)); ok := ok AND d; det := det || 'authUpRvw=' || d || ' ';
  d := ind_denied(format($q$DELETE FROM public.service_acknowledgments WHERE id=%L::uuid$q$, v_ack)); ok := ok AND d; det := det || 'authDelAck=' || d;
  RESET ROLE;
  PERFORM ind_note('I-16D', ok, det);
EXCEPTION WHEN OTHERS THEN BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM ind_note('I-16D', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

-- I-16E: SELECT on report family still works for authenticated (read path preserved)
DO $$
DECLARE n int := -1;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  SET ROLE b1_auth;
  BEGIN SELECT count(*) INTO n FROM public.service_reports; EXCEPTION WHEN OTHERS THEN n := -1; END;
  RESET ROLE;
  PERFORM ind_note('I-16E', n >= 0, 'auth SELECT reports count=' || n);
EXCEPTION WHEN OTHERS THEN BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM ind_note('I-16E', false, SQLSTATE || ' ' || left(SQLERRM, 200)); END $$;

SELECT check_id, status, left(detail, 200) FROM public.ind_eval WHERE check_id LIKE 'I-16%' ORDER BY 1;
