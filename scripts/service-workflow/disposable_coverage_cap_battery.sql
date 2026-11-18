-- F-COV-CAP-1 evidence: no silent truncation; continuation covers all candidates.
-- Applied after base CR battery on the same disposable cluster. Not staging.
CREATE TEMP TABLE IF NOT EXISTS cr_cap_results (
  check_id text PRIMARY KEY,
  status text NOT NULL,
  detail text NOT NULL DEFAULT ''
);

CREATE OR REPLACE FUNCTION pg_temp.cr_cap_note(p_id text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO cr_cap_results(check_id, status, detail)
  VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, COALESCE(p_detail, ''))
  ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.cr_cap_as(p_uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('app.b1_uid', p_uid::text, true);
END;
$$;

DO $$
DECLARE
  admin1 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  support1 uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
  cust1 uuid := 'dddddddd-dddd-dddd-dddd-ddddddddddd1';
  v_payload jsonb;
  v_created jsonb;
  v_routine uuid;
  v_draft uuid;
  v_v1 uuid;
  v_mach uuid;
  v_as_of date := DATE '2026-03-15';
  v_cov895 uuid;
  v_cov500 uuid;
  v_cov501 uuid;
  v_sched jsonb;
  v_gen jsonb;
  v_items int;
  v_status text;
  v_cont_cov uuid;
  v_cont_seq int;
  v_total int;
  v_min_seq int;
  v_max_seq int;
  v_dup int;
  v_loops int;
  v_all_items jsonb := '[]'::jsonb;
  v_expected_895 int := 895;
  v_first895 date;
  v_first500 date;
  v_first501 date;
BEGIN
  v_payload := jsonb_build_object(
    'sections', jsonb_build_array(
      jsonb_build_object(
        'id', 'safety', 'kind', 'safety', 'title', 'Safety',
        'items', jsonb_build_array(jsonb_build_object(
          'id', 'sg1', 'type', 'safety_gate', 'requirement_class', 'safety_gate',
          'instruction', 'LOTO', 'evidence', 'none', 'waivable', false
        ))
      )
    ),
    'cadence', jsonb_build_object('interval', 1, 'unit', 'days')
  );

  INSERT INTO public.machines (id, name, model, brand, catalog_model_id, catalog_link_status, owner_id)
  VALUES (gen_random_uuid(), 'Saw CAP', 'saw', 'Acme', 'CM-SAW-1', 'linked', cust1)
  RETURNING id INTO v_mach;

  PERFORM pg_temp.cr_cap_as(admin1);
  v_created := public.create_service_routine_draft(
    'CR-CAP-1', 'Cap Fix Routine', '', '', v_payload, ARRAY['saw'], NULL
  );
  v_routine := (v_created->>'routine_id')::uuid;
  v_draft := (v_created->>'version_id')::uuid;
  PERFORM public.set_service_routine_applicability(v_routine, 'family', 'saw', NULL, NULL, NULL);
  PERFORM public.set_service_routine_applicability(v_routine, 'catalog_model', 'CM-SAW-1', 'saw', NULL, NULL);
  PERFORM public.submit_service_routine_for_review(v_draft, NULL);
  PERFORM pg_temp.cr_cap_as(support1);
  PERFORM public.record_service_routine_review(v_draft, 'ok', NULL);
  PERFORM pg_temp.cr_cap_as(admin1);
  PERFORM public.publish_service_routine_version(v_draft, NULL);
  SELECT id INTO v_v1 FROM public.service_routine_versions
  WHERE routine_id = v_routine AND status = 'published' ORDER BY version_ordinal LIMIT 1;

  -- 895 = (as_of - first) + 90 + 1 with daily cadence
  v_first895 := v_as_of - 804;
  v_created := public.create_machine_coverage(
    v_mach, v_v1, v_first895, v_first895, 1, 'days', NULL, NULL
  );
  v_cov895 := (v_created->>'coverage_id')::uuid;

  -- ---- CAP-895 schedule full eligible range (unbounded) ----
  v_sched := public.list_machine_coverage_schedule(v_as_of, NULL, v_cov895, NULL, NULL, NULL, NULL);
  v_items := COALESCE((v_sched->>'item_count')::int, jsonb_array_length(v_sched->'items'));
  PERFORM pg_temp.cr_cap_note('CR-CAP-895-sched',
    (v_sched->>'status') = 'complete'
    AND jsonb_typeof(v_sched->'continuation') = 'null'
    AND v_items = v_expected_895
    AND (v_sched->'items'->0->>'sequence')::int = 1
    AND (v_sched->'items'->(v_expected_895 - 1)->>'sequence')::int = v_expected_895,
    format('status=%s count=%s first=%s last=%s',
      v_sched->>'status', v_items,
      v_sched->'items'->0->>'sequence',
      v_sched->'items'->(v_expected_895 - 1)->>'sequence')
  );

  -- ---- CAP-895 schedule continuation pages, no gaps/dups ----
  v_all_items := '[]'::jsonb;
  v_cont_cov := NULL;
  v_cont_seq := NULL;
  v_loops := 0;
  LOOP
    v_loops := v_loops + 1;
    EXIT WHEN v_loops > 50;
    IF v_cont_cov IS NULL THEN
      v_sched := public.list_machine_coverage_schedule(
        v_as_of, NULL, v_cov895, NULL, 300, NULL, NULL
      );
    ELSE
      v_sched := public.list_machine_coverage_schedule(
        v_as_of, NULL, v_cov895, NULL, 300, v_cont_cov, v_cont_seq
      );
    END IF;
    v_all_items := v_all_items || COALESCE(v_sched->'items', '[]'::jsonb);
    v_status := v_sched->>'status';
    IF v_status = 'complete' THEN
      EXIT;
    END IF;
    v_cont_cov := (v_sched->'continuation'->>'coverage_id')::uuid;
    v_cont_seq := (v_sched->'continuation'->>'next_sequence')::int;
    IF v_cont_cov IS NULL OR v_cont_seq IS NULL THEN
      EXIT;
    END IF;
  END LOOP;
  SELECT count(*)::int, min((e->>'sequence')::int), max((e->>'sequence')::int),
         count(*)::int - count(DISTINCT (e->>'sequence')::int)
    INTO v_total, v_min_seq, v_max_seq, v_dup
  FROM jsonb_array_elements(v_all_items) e;
  PERFORM pg_temp.cr_cap_note('CR-CAP-895-sched-cont',
    v_status = 'complete'
    AND v_total = v_expected_895
    AND v_min_seq = 1
    AND v_max_seq = v_expected_895
    AND v_dup = 0,
    format('loops=%s total=%s min=%s max=%s dup=%s status=%s',
      v_loops, v_total, v_min_seq, v_max_seq, v_dup, v_status)
  );

  -- ---- CAP-500 boundary: exactly 500 eligible, unbounded complete ----
  v_first500 := v_as_of - 409; -- 409+90+1 = 500
  v_created := public.create_machine_coverage(
    v_mach, v_v1, v_first500, v_first500, 1, 'days', NULL, NULL
  );
  v_cov500 := (v_created->>'coverage_id')::uuid;
  v_sched := public.list_machine_coverage_schedule(v_as_of, NULL, v_cov500, NULL, NULL, NULL, NULL);
  PERFORM pg_temp.cr_cap_note('CR-CAP-500-sched',
    (v_sched->>'status') = 'complete'
    AND (v_sched->>'item_count')::int = 500,
    format('count=%s', v_sched->>'item_count')
  );

  -- ---- CAP-501 boundary: batch_limit 500 → incomplete then continue ----
  v_first501 := v_as_of - 410; -- 410+90+1 = 501
  v_created := public.create_machine_coverage(
    v_mach, v_v1, v_first501, v_first501, 1, 'days', NULL, NULL
  );
  v_cov501 := (v_created->>'coverage_id')::uuid;
  v_sched := public.list_machine_coverage_schedule(v_as_of, NULL, v_cov501, NULL, 500, NULL, NULL);
  PERFORM pg_temp.cr_cap_note('CR-CAP-501-sched-batch',
    (v_sched->>'status') = 'incomplete'
    AND (v_sched->>'item_count')::int = 500
    AND (v_sched->'continuation'->>'next_sequence')::int = 501,
    format('status=%s count=%s cont=%s',
      v_sched->>'status', v_sched->>'item_count', v_sched->'continuation'->>'next_sequence')
  );
  v_sched := public.list_machine_coverage_schedule(
    v_as_of, NULL, v_cov501, NULL, 500,
    (v_sched->'continuation'->>'coverage_id')::uuid,
    (v_sched->'continuation'->>'next_sequence')::int
  );
  PERFORM pg_temp.cr_cap_note('CR-CAP-501-sched-cont',
    (v_sched->>'status') = 'complete'
    AND (v_sched->>'item_count')::int = 1
    AND (v_sched->'items'->0->>'sequence')::int = 501,
    format('status=%s count=%s seq=%s',
      v_sched->>'status', v_sched->>'item_count', v_sched->'items'->0->>'sequence')
  );

  -- ---- CAP-501 generate: batch 500 then continue; no dups/gaps ----
  v_gen := public.generate_machine_coverage_occurrences(
    v_as_of, v_cov501, NULL, 500, NULL, NULL
  );
  PERFORM pg_temp.cr_cap_note('CR-CAP-501-gen-batch',
    (v_gen->>'status') = 'incomplete'
    AND (v_gen->>'processed')::int = 500
    AND (v_gen->'continuation'->>'next_sequence')::int = 501,
    format('status=%s processed=%s cont=%s created=%s',
      v_gen->>'status', v_gen->>'processed',
      v_gen->'continuation'->>'next_sequence', v_gen->>'created')
  );
  v_gen := public.generate_machine_coverage_occurrences(
    v_as_of, v_cov501, NULL, 500,
    (v_gen->'continuation'->>'coverage_id')::uuid,
    (v_gen->'continuation'->>'next_sequence')::int
  );
  SELECT count(*)::int, min(sequence), max(sequence),
         count(*) - count(DISTINCT sequence)
    INTO v_total, v_min_seq, v_max_seq, v_dup
  FROM public.service_maintenance_occurrences WHERE coverage_id = v_cov501;
  PERFORM pg_temp.cr_cap_note('CR-CAP-501-gen-cont',
    (v_gen->>'status') = 'complete'
    AND v_total = 501
    AND v_min_seq = 1
    AND v_max_seq = 501
    AND v_dup = 0,
    format('status=%s total=%s min=%s max=%s dup=%s',
      v_gen->>'status', v_total, v_min_seq, v_max_seq, v_dup)
  );

  -- ---- CAP-500 generate unbounded complete (no silent stop) ----
  v_gen := public.generate_machine_coverage_occurrences(
    v_as_of, v_cov500, NULL, NULL, NULL, NULL
  );
  SELECT count(*)::int, min(sequence), max(sequence),
         count(*) - count(DISTINCT sequence)
    INTO v_total, v_min_seq, v_max_seq, v_dup
  FROM public.service_maintenance_occurrences WHERE coverage_id = v_cov500;
  PERFORM pg_temp.cr_cap_note('CR-CAP-500-gen',
    (v_gen->>'status') = 'complete'
    AND jsonb_typeof(v_gen->'continuation') = 'null'
    AND v_total = 500
    AND v_min_seq = 1 AND v_max_seq = 500 AND v_dup = 0,
    format('status=%s total=%s created=%s', v_gen->>'status', v_total, v_gen->>'created')
  );

  -- ---- CAP-895 generate via continuation until complete ----
  v_cont_cov := NULL;
  v_cont_seq := NULL;
  v_loops := 0;
  LOOP
    v_loops := v_loops + 1;
    EXIT WHEN v_loops > 100;
    IF v_cont_cov IS NULL THEN
      v_gen := public.generate_machine_coverage_occurrences(
        v_as_of, v_cov895, NULL, 100, NULL, NULL
      );
    ELSE
      v_gen := public.generate_machine_coverage_occurrences(
        v_as_of, v_cov895, NULL, 100, v_cont_cov, v_cont_seq
      );
    END IF;
    v_status := v_gen->>'status';
    EXIT WHEN v_status = 'complete';
    v_cont_cov := (v_gen->'continuation'->>'coverage_id')::uuid;
    v_cont_seq := (v_gen->'continuation'->>'next_sequence')::int;
    IF v_cont_cov IS NULL OR v_cont_seq IS NULL THEN
      EXIT;
    END IF;
  END LOOP;
  SELECT count(*)::int, min(sequence), max(sequence),
         count(*) - count(DISTINCT sequence)
    INTO v_total, v_min_seq, v_max_seq, v_dup
  FROM public.service_maintenance_occurrences WHERE coverage_id = v_cov895;
  PERFORM pg_temp.cr_cap_note('CR-CAP-895-gen-cont',
    v_status = 'complete'
    AND v_total = v_expected_895
    AND v_min_seq = 1
    AND v_max_seq = v_expected_895
    AND v_dup = 0,
    format('loops=%s total=%s min=%s max=%s dup=%s',
      v_loops, v_total, v_min_seq, v_max_seq, v_dup)
  );

  -- Repeat generate: idempotent, no new rows
  v_gen := public.generate_machine_coverage_occurrences(
    v_as_of, v_cov895, NULL, NULL, NULL, NULL
  );
  SELECT count(*)::int INTO v_items
  FROM public.service_maintenance_occurrences WHERE coverage_id = v_cov895;
  PERFORM pg_temp.cr_cap_note('CR-CAP-895-gen-idem',
    (v_gen->>'status') = 'complete'
    AND (v_gen->>'created')::int = 0
    AND v_items = v_expected_895,
    format('created=%s total=%s', v_gen->>'created', v_items)
  );
END;
$$;

SELECT check_id || ' | ' || status || ' | ' || detail AS result
FROM cr_cap_results
ORDER BY check_id;
