-- Independent Spark probe against B4 correction (not part of product freeze).
-- Assumes B4 migration already applied and disposable_b4 helpers (b1_uid, b4_mk_*, …) exist.

CREATE TABLE IF NOT EXISTS public.spark_probe_eval (
  check_id text PRIMARY KEY,
  status text NOT NULL,
  detail text
);
TRUNCATE public.spark_probe_eval;

CREATE OR REPLACE FUNCTION public.spark_note(p_id text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.spark_probe_eval(check_id, status, detail)
  VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, p_detail)
  ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
END;
$$;

-- ---------------------------------------------------------------------------
-- SP-1: Getter JSON privacy — inspect payload keys/content, not just counts
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text; v_rev public.service_report_revisions;
  v_bundle jsonb; v_staff jsonb;
  v_rev_arr jsonb; v_keys text; v_has_findings boolean; v_has_evidence boolean;
  v_has_work boolean; v_has_decl boolean; v_empty boolean;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b4_mk_completed_visit('sp1');
  v_path := v_t::text || '/b4/sp1-SECRET-evidence.jpg';
  PERFORM b4_seed_evidence(v_t, v_path);
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);
  v_rev := public.submit_service_report_revision(
    v_v,
    'UNISSUED_FINDINGS_MARKER_SP1',
    'UNISSUED_WORK_MARKER_SP1',
    '[]'::jsonb, true, 'verified_fixed', NULL,
    'UNISSUED_DECL_MARKER_SP1',
    ARRAY[v_path], NULL, gen_random_uuid(), NULL);

  -- Staff sees the revision content
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, true);
  BEGIN
    EXECUTE 'SET ROLE authenticated';
    v_staff := public.get_service_report_for_visit(v_v);
    EXECUTE 'RESET ROLE';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    PERFORM spark_note('SP-1-staff', false, SQLERRM);
    RETURN;
  END;

  -- Customer getter: inspect JSON body directly
  PERFORM set_config('app.b1_uid', b1_uid('cust1')::text, true);
  BEGIN
    EXECUTE 'SET ROLE authenticated';
    v_bundle := public.get_service_report_for_visit(v_v);
    EXECUTE 'RESET ROLE';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    PERFORM spark_note('SP-1-cust', false, 'getter error: ' || SQLERRM);
    RETURN;
  END;

  v_rev_arr := COALESCE(v_bundle->'revisions', 'null'::jsonb);
  v_empty := (jsonb_typeof(v_rev_arr) = 'array' AND jsonb_array_length(v_rev_arr) = 0);
  v_keys := v_bundle::text;
  v_has_findings := v_keys LIKE '%UNISSUED_FINDINGS_MARKER_SP1%';
  v_has_work := v_keys LIKE '%UNISSUED_WORK_MARKER_SP1%';
  v_has_decl := v_keys LIKE '%UNISSUED_DECL_MARKER_SP1%';
  v_has_evidence := v_keys LIKE '%sp1-SECRET-evidence.jpg%';

  PERFORM spark_note('SP-1-staff',
    COALESCE(jsonb_array_length(v_staff->'revisions'), 0) = 1
      AND (v_staff::text LIKE '%UNISSUED_FINDINGS_MARKER_SP1%')
      AND (v_staff::text LIKE '%sp1-SECRET-evidence.jpg%'),
    left(v_staff::text, 200));

  PERFORM spark_note('SP-1-cust-json',
    v_empty AND NOT v_has_findings AND NOT v_has_work AND NOT v_has_decl AND NOT v_has_evidence
      AND (v_bundle ? 'report') AND (v_bundle ? 'revisions'),
    format('empty=%s findings=%s work=%s decl=%s evidence=%s sample=%s',
      v_empty, v_has_findings, v_has_work, v_has_decl, v_has_evidence, left(v_bundle::text, 180)));
END $$;

-- ---------------------------------------------------------------------------
-- SP-2: Labour XOR enforced in RPC; soft table CHECK does not invent no_labour
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text;
  a boolean; b boolean; c boolean; d boolean;
  v_rev public.service_report_revisions;
  v_nl boolean; v_lab jsonb;
BEGIN
  SELECT * INTO v_t, v_j, v_v FROM b4_mk_completed_visit('sp2');
  v_path := v_t::text || '/b4/sp2.jpg';
  PERFORM b4_seed_evidence(v_t, v_path);
  PERFORM set_config('app.b1_uid', b1_uid('tech1')::text, false);

  -- empty labour without no_labour → deny
  a := b4_denied(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[]'::jsonb,false,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$,
    v_v, v_path, gen_random_uuid()));
  -- labour + no_labour → deny
  b := b4_denied(format(
    $q$SELECT public.submit_service_report_revision(%L::uuid,'f','w','[{"hours":1,"description":"x"}]'::jsonb,true,'verified_fixed',NULL,'decl',ARRAY[%L]::text[],NULL,%L::uuid,NULL)$q$,
    v_v, v_path, gen_random_uuid()));
  -- valid no_labour
  v_rev := public.submit_service_report_revision(
    v_v, 'f', 'w', '[]'::jsonb, true, 'verified_fixed', NULL, 'decl',
    ARRAY[v_path], NULL, gen_random_uuid(), NULL);
  c := (v_rev.no_labour IS TRUE AND jsonb_array_length(v_rev.labour) = 0);

  -- F-B4-05: empty labour + no_labour=false must be rejected at table boundary
  BEGIN
    INSERT INTO public.service_report_revisions(
      report_id, revision_number, findings, work_performed, labour, no_labour,
      verification_outcome, technician_declaration, submitted_by, evidence_paths
    ) VALUES (
      v_rev.report_id, 99, 'legacy', 'legacy', '[]'::jsonb, false,
      'verified_fixed', NULL, b1_uid('tech1'), ARRAY[]::text[]
    );
    d := false; -- should not succeed
    DELETE FROM public.service_report_revisions WHERE report_id = v_rev.report_id AND revision_number = 99;
  EXCEPTION WHEN check_violation THEN
    d := true;
  END;

  -- Contradictory CHECK must still fire
  BEGIN
    INSERT INTO public.service_report_revisions(
      report_id, revision_number, findings, work_performed, labour, no_labour,
      verification_outcome, technician_declaration, submitted_by
    ) VALUES (
      v_rev.report_id, 98, 'x', 'x', '[{"hours":1,"description":"z"}]'::jsonb, true,
      'verified_fixed', 'd', b1_uid('tech1')
    );
    PERFORM spark_note('SP-2-check', false, 'contradictory labour CHECK did not fire');
    RETURN;
  EXCEPTION WHEN check_violation THEN
    NULL; -- expected
  END;

  PERFORM spark_note('SP-2', a AND b AND c AND d,
    format('empty_deny=%s xor_deny=%s no_lab_ok=%s empty_table_reject=%s', a, b, c, d));
END $$;

-- ---------------------------------------------------------------------------
-- SP-3: Auth before visit-state (unrelated caller on non-completed visit)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_t uuid; v_j uuid; v_v uuid; v_path text;
  v_sqlstate text; v_msg text; a boolean := false; b boolean := false;
BEGIN
  PERFORM set_config('app.b1_uid', b1_uid('support')::text, false);
  INSERT INTO public.service_tickets (ticket_number, user_id, title, description, type, priority, status, assigned_to, assigned_by, assigned_at)
  VALUES (
    'SP3-' || substr(replace(gen_random_uuid()::text,'-',''),1,6),
    b1_uid('cust1'), 'sp3', 'sp3', 'general', 'medium', 'assigned',
    b1_uid('tech1'), b1_uid('support'), now()
  ) RETURNING id INTO v_t;
  SELECT (public.create_service_job(v_t, 'SP3', true, 'sp3')).id INTO v_j;
  PERFORM public.assign_service_job(v_j, b1_uid('tech1'), 'sp3', NULL);
  SELECT (public.schedule_service_job_visit(
    v_j, now()+interval '1 hour', now()+interval '2 hours', 'sp3', NULL
  )).id INTO v_v;
  v_path := v_t::text || '/b4/sp3.jpg';
  PERFORM b4_seed_evidence(v_t, v_path);

  PERFORM set_config('app.b1_uid', b1_uid('tech2')::text, false);
  BEGIN
    PERFORM public.submit_service_report_revision(
      v_v, 'f', 'w', '[]'::jsonb, true, 'verified_fixed', NULL, 'decl',
      ARRAY[v_path], NULL, gen_random_uuid(), NULL);
  EXCEPTION WHEN OTHERS THEN
    v_sqlstate := SQLSTATE; v_msg := SQLERRM;
    a := (SQLSTATE = '42501' AND SQLERRM ILIKE '%historical attending%');
    b := (SQLERRM ILIKE '%completed visits%' OR SQLERRM ILIKE '%Reports may only%');
  END;
  PERFORM spark_note('SP-3', a AND NOT b,
    format('auth_first=%s state_leaked=%s sqlstate=%s msg=%s', a, b, v_sqlstate, left(v_msg, 120)));
END $$;

SELECT check_id, status, detail FROM public.spark_probe_eval ORDER BY 1;
SELECT COUNT(*) FILTER (WHERE status='PASS') AS pass,
       COUNT(*) FILTER (WHERE status='FAIL') AS fail
FROM public.spark_probe_eval;
