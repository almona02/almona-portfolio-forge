-- Cursor evidence: Lane A disposable battery (RA-A1..A13). Not Spark evidence.
CREATE TEMP TABLE ra_results (
  check_id text PRIMARY KEY,
  status text NOT NULL,
  detail text NOT NULL DEFAULT ''
);

CREATE OR REPLACE FUNCTION pg_temp.ra_note(p_id text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO ra_results(check_id, status, detail)
  VALUES (p_id, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, COALESCE(p_detail, ''))
  ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.ra_as(p_uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('app.b1_uid', p_uid::text, true);
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.ra_denied(p_sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
    RETURN false;
  EXCEPTION WHEN OTHERS THEN
    RETURN true;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.ra_failinfo(p_sql text, OUT denied boolean, OUT err_state text, OUT msg text)
RETURNS record LANGUAGE plpgsql AS $$
BEGIN
  denied := false;
  err_state := NULL;
  msg := NULL;
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    denied := true;
    err_state := SQLSTATE;
    msg := SQLERRM;
  END;
END;
$$;

DO $$
DECLARE
  admin1 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  admin2 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';
  support1 uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
  tech1 uuid := 'cccccccc-cccc-cccc-cccc-ccccccccccc1';
  cust1 uuid := 'dddddddd-dddd-dddd-dddd-ddddddddddd1';
  sales1 uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1';
  v_payload jsonb;
  v_bad jsonb;
  v_created jsonb;
  v_version uuid;
  v_routine uuid;
  v_rev text;
  v_pub jsonb;
  v_pub2 jsonb;
  v_preview jsonb;
  v_next jsonb;
  v_hist int;
  v_elig int;
  v_fail boolean;
  v_fail_state text;
  v_fail_msg text;
  v_pub_audit_before bigint;
  v_status_before text;
BEGIN
  v_payload := jsonb_build_object(
    'sections', jsonb_build_array(
      jsonb_build_object(
        'id', 'safety', 'kind', 'safety', 'title', 'Safety',
        'items', jsonb_build_array(jsonb_build_object(
          'id', 'sg1', 'type', 'safety_gate', 'requirement_class', 'safety_gate',
          'instruction', 'LOTO', 'evidence', 'none', 'waivable', false
        ))
      ),
      jsonb_build_object(
        'id', 'insp', 'kind', 'inspection', 'title', 'Inspection',
        'items', jsonb_build_array(jsonb_build_object(
          'id', 'm1', 'type', 'measurement', 'requirement_class', 'required',
          'instruction', 'Gap', 'unit', 'mm', 'evidence', 'measurement'
        ))
      )
    ),
    'cadence', jsonb_build_object('interval', 90, 'unit', 'days')
  );

  -- RA-A1 authz
  PERFORM pg_temp.ra_as(cust1);
  PERFORM pg_temp.ra_note('RA-A1-cust', pg_temp.ra_denied(format(
    $q$SELECT public.create_service_routine_draft('RA-X','x','','',%L::jsonb,ARRAY['saw'],NULL)$q$, v_payload::text
  )), 'customer denied');
  PERFORM pg_temp.ra_as(tech1);
  PERFORM pg_temp.ra_note('RA-A1-tech', pg_temp.ra_denied(format(
    $q$SELECT public.create_service_routine_draft('RA-X','x','','',%L::jsonb,ARRAY['saw'],NULL)$q$, v_payload::text
  )), 'tech denied');
  PERFORM pg_temp.ra_as(sales1);
  PERFORM pg_temp.ra_note('RA-A1-sales', pg_temp.ra_denied(format(
    $q$SELECT public.create_service_routine_draft('RA-X','x','','',%L::jsonb,ARRAY['saw'],NULL)$q$, v_payload::text
  )), 'sales denied');

  PERFORM pg_temp.ra_as(admin1);
  v_created := public.create_service_routine_draft('RA-SAW-OK', 'Saw OK', '', '', v_payload, ARRAY['saw'], NULL);
  v_version := (v_created ->> 'version_id')::uuid;
  v_routine := (v_created ->> 'routine_id')::uuid;
  v_rev := v_created ->> 'draft_revision';
  PERFORM pg_temp.ra_note('RA-A1', v_version IS NOT NULL, coalesce(v_created::text, 'null'));

  -- RA-A12 stale edit
  PERFORM pg_temp.ra_note('RA-A12', pg_temp.ra_denied(format(
    $q$SELECT public.update_service_routine_draft(%L::uuid,'stale',%L::jsonb,NULL,NULL,NULL,NULL)$q$,
    v_version, v_payload::text
  )), 'stale denied');
  PERFORM pg_temp.ra_note('RA-A12b',
    (SELECT draft_revision FROM public.service_routine_versions WHERE id = v_version) = v_rev,
    'unchanged');

  -- RA-A3 / F-04: inspection-section measurement limit without source
  v_bad := jsonb_set(v_payload, '{sections,1,items,0,limit_value}', '"1.0"');
  PERFORM public.update_service_routine_draft(v_version, v_rev, v_bad, NULL, NULL, NULL, NULL);
  v_rev := (SELECT draft_revision FROM public.service_routine_versions WHERE id = v_version);
  PERFORM public.submit_service_routine_for_review(v_version, NULL);
  PERFORM pg_temp.ra_as(support1);
  PERFORM public.record_service_routine_review(v_version, 'ok', NULL);
  PERFORM pg_temp.ra_as(admin1);
  SELECT status INTO v_status_before FROM public.service_routine_versions WHERE id = v_version;
  SELECT count(*) INTO v_pub_audit_before
  FROM public.service_workflow_audit WHERE action = 'routine_published';
  SELECT * INTO v_fail, v_fail_state, v_fail_msg FROM pg_temp.ra_failinfo(format(
    $q$SELECT public.publish_service_routine_version(%L::uuid,NULL)$q$, v_version
  ));
  PERFORM pg_temp.ra_note('RA-A3', v_fail, 'inspection limit w/o source');
  PERFORM pg_temp.ra_note('RA-A3-22023',
    v_fail AND v_fail_state = '22023'
    AND v_fail_msg ILIKE '%tolerance_source_ref%'
    AND v_fail_msg ILIKE '%m1%',
    coalesce(v_fail_state || ' ' || left(v_fail_msg, 160), 'no fail'));
  PERFORM pg_temp.ra_note('RA-A3-nomut',
    (SELECT status FROM public.service_routine_versions WHERE id = v_version) = v_status_before
    AND (SELECT count(*) FROM public.service_workflow_audit WHERE action = 'routine_published') = v_pub_audit_before,
    'no publish mutation/audit');

  -- F-04: safety-section measurement limit without source
  v_bad := jsonb_build_object(
    'sections', jsonb_build_array(
      jsonb_build_object(
        'id', 'safety', 'kind', 'safety', 'title', 'Safety',
        'items', jsonb_build_array(
          jsonb_build_object(
            'id', 'sg1', 'type', 'safety_gate', 'requirement_class', 'safety_gate',
            'instruction', 'LOTO', 'evidence', 'none', 'waivable', false
          ),
          jsonb_build_object(
            'id', 'sm1', 'type', 'measurement', 'requirement_class', 'required',
            'instruction', 'Voltage check', 'unit', 'V', 'limit_value', '24',
            'evidence', 'measurement'
          )
        )
      ),
      jsonb_build_object(
        'id', 'insp', 'kind', 'inspection', 'title', 'Inspection',
        'items', jsonb_build_array(jsonb_build_object(
          'id', 't1', 'type', 'task', 'requirement_class', 'optional', 'instruction', 'note'
        ))
      )
    ),
    'cadence', jsonb_build_object('interval', 90, 'unit', 'days')
  );
  PERFORM public.update_service_routine_draft(
    v_version,
    (SELECT draft_revision FROM public.service_routine_versions WHERE id = v_version),
    v_bad, NULL, NULL, NULL, NULL
  );
  v_rev := (SELECT draft_revision FROM public.service_routine_versions WHERE id = v_version);
  PERFORM public.submit_service_routine_for_review(v_version, NULL);
  PERFORM pg_temp.ra_as(support1);
  PERFORM public.record_service_routine_review(v_version, 'ok', NULL);
  PERFORM pg_temp.ra_as(admin1);
  SELECT * INTO v_fail, v_fail_state, v_fail_msg FROM pg_temp.ra_failinfo(format(
    $q$SELECT public.publish_service_routine_version(%L::uuid,NULL)$q$, v_version
  ));
  PERFORM pg_temp.ra_note('RA-A3-safety',
    v_fail AND v_fail_state = '22023' AND v_fail_msg ILIKE '%sm1%' AND v_fail_msg ILIKE '%tolerance_source_ref%',
    coalesce(left(v_fail_msg, 160), 'no fail'));

  -- Fix payload (returns to draft, invalidates review)
  PERFORM public.update_service_routine_draft(
    v_version,
    (SELECT draft_revision FROM public.service_routine_versions WHERE id = v_version),
    v_payload, NULL, NULL, NULL, NULL
  );
  v_rev := (SELECT draft_revision FROM public.service_routine_versions WHERE id = v_version);
  SELECT count(*) INTO v_hist FROM public.service_routine_reviews WHERE version_id = v_version;
  SELECT count(*) INTO v_elig FROM public.service_routine_reviews
  WHERE version_id = v_version AND eligible_for_publish;
  PERFORM pg_temp.ra_note('RA-A5-hist', v_hist >= 1 AND v_elig = 0, format('hist=%s elig=%s', v_hist, v_elig));

  -- RA-A2 no safety section
  PERFORM public.update_service_routine_draft(
    v_version, v_rev,
    jsonb_build_object('sections', jsonb_build_array(jsonb_build_object(
      'id', 'insp', 'kind', 'inspection', 'title', 'Only',
      'items', jsonb_build_array(jsonb_build_object(
        'id', 't1', 'type', 'task', 'requirement_class', 'optional', 'instruction', 'x'
      ))
    ))),
    NULL, NULL, NULL, NULL
  );
  v_rev := (SELECT draft_revision FROM public.service_routine_versions WHERE id = v_version);
  PERFORM public.submit_service_routine_for_review(v_version, NULL);
  PERFORM pg_temp.ra_as(support1);
  PERFORM public.record_service_routine_review(v_version, 'ok', NULL);
  PERFORM pg_temp.ra_as(admin1);
  PERFORM pg_temp.ra_note('RA-A2', pg_temp.ra_denied(format(
    $q$SELECT public.publish_service_routine_version(%L::uuid,NULL)$q$, v_version
  )), 'missing safety section');

  -- Restore good payload with valid measurement sources in safety + inspection (F-04)
  v_payload := jsonb_build_object(
    'sections', jsonb_build_array(
      jsonb_build_object(
        'id', 'safety', 'kind', 'safety', 'title', 'Safety',
        'items', jsonb_build_array(
          jsonb_build_object(
            'id', 'sg1', 'type', 'safety_gate', 'requirement_class', 'safety_gate',
            'instruction', 'LOTO', 'evidence', 'none', 'waivable', false
          ),
          jsonb_build_object(
            'id', 'sm-ok', 'type', 'measurement', 'requirement_class', 'required',
            'instruction', 'Isolation voltage', 'unit', 'V', 'limit_value', '0',
            'tolerance_source_ref', 'doc:oem-loto-table-1', 'evidence', 'measurement'
          )
        )
      ),
      jsonb_build_object(
        'id', 'insp', 'kind', 'inspection', 'title', 'Inspection',
        'items', jsonb_build_array(jsonb_build_object(
          'id', 'm-ok', 'type', 'measurement', 'requirement_class', 'required',
          'instruction', 'Gap', 'unit', 'mm', 'limit_value', '1.0',
          'tolerance_source_ref', 'doc:oem-gap-spec', 'evidence', 'measurement'
        ))
      )
    ),
    'cadence', jsonb_build_object('interval', 90, 'unit', 'days')
  );
  PERFORM public.update_service_routine_draft(
    v_version,
    (SELECT draft_revision FROM public.service_routine_versions WHERE id = v_version),
    v_payload, NULL, NULL, NULL, NULL
  );
  v_rev := (SELECT draft_revision FROM public.service_routine_versions WHERE id = v_version);

  -- RA-A5 self-review
  PERFORM public.submit_service_routine_for_review(v_version, NULL);
  PERFORM pg_temp.ra_note('RA-A5-self', pg_temp.ra_denied(format(
    $q$SELECT public.record_service_routine_review(%L::uuid,'no',NULL)$q$, v_version
  )), 'self review');

  PERFORM pg_temp.ra_as(support1);
  PERFORM public.record_service_routine_review(v_version, 'feasible', NULL);

  -- Publish without family would fail — families already set at create
  PERFORM pg_temp.ra_as(admin1);
  v_pub := public.publish_service_routine_version(v_version, NULL);
  PERFORM pg_temp.ra_note('RA-A2-ok', (v_pub ->> 'status') = 'published' AND (v_pub ->> 'version_ordinal') = '1', v_pub::text);
  PERFORM pg_temp.ra_note('RA-A3-ok-safety',
    (v_pub ->> 'status') = 'published'
    AND (SELECT payload #>> '{sections,0,items,1,tolerance_source_ref}'
         FROM public.service_routine_versions WHERE id = v_version) = 'doc:oem-loto-table-1',
    'safety measurement with source published');
  PERFORM pg_temp.ra_note('RA-A3-ok-insp',
    (v_pub ->> 'status') = 'published'
    AND (SELECT payload #>> '{sections,1,items,0,tolerance_source_ref}'
         FROM public.service_routine_versions WHERE id = v_version) = 'doc:oem-gap-spec',
    'inspection measurement with source published');

  -- RA-A11 idempotent republish
  v_pub2 := public.publish_service_routine_version(v_version, NULL);
  PERFORM pg_temp.ra_note('RA-A11',
    COALESCE((v_pub2 ->> 'idempotent')::boolean, false)
    AND (v_pub2 ->> 'version_ordinal') = '1'
    AND (SELECT count(*) FROM public.service_routine_versions WHERE routine_id = v_routine AND status = 'published') = 1,
    v_pub2::text);

  -- RA-A8 preview
  PERFORM pg_temp.ra_as(tech1);
  v_preview := public.get_service_routine_preview(v_version, NULL);
  PERFORM pg_temp.ra_note('RA-A8-tech',
    COALESCE((v_preview ->> 'read_only')::boolean, false)
    AND (v_preview -> 'preview' -> 'sections' -> 0 ->> 'kind') = 'safety',
    left(v_preview::text, 180));
  PERFORM pg_temp.ra_as(cust1);
  PERFORM pg_temp.ra_note('RA-A8-cust', pg_temp.ra_denied(format(
    $q$SELECT public.get_service_routine_preview(%L::uuid,NULL)$q$, v_version
  )), 'customer denied published? wait — customer denied for published');
  -- contract: tech/support/admin only for preview; customer denied — PASS

  -- RA-A4 family mismatch hard deny for catalog_model
  PERFORM pg_temp.ra_as(admin1);
  PERFORM pg_temp.ra_note('RA-A4-family', pg_temp.ra_denied(format(
    $q$SELECT public.set_service_routine_applicability(%L::uuid,'catalog_model','MODEL-X','crimper',NULL,NULL)$q$,
    v_routine
  )), 'family mismatch');
  PERFORM public.set_service_routine_applicability(v_routine, 'catalog_model', 'MODEL-SAW', 'saw', NULL, NULL);
  PERFORM pg_temp.ra_note('RA-A4-ok', true, 'catalog model linked');

  -- manufacturer deny list
  PERFORM public.set_service_routine_manufacturer_restrictions(v_routine, NULL, ARRAY['BADCO'], NULL);
  PERFORM pg_temp.ra_note('RA-A4-deny', pg_temp.ra_denied(format(
    $q$SELECT public.set_service_routine_applicability(%L::uuid,'manufacturer','BADCO','saw','please',NULL)$q$,
    v_routine
  )), 'deny list blocks override');

  -- RA-A6 published immutable + next draft
  PERFORM pg_temp.ra_note('RA-A6-edit', pg_temp.ra_denied(format(
    $q$SELECT public.update_service_routine_draft(%L::uuid,%L,%L::jsonb,NULL,NULL,NULL,NULL)$q$,
    v_version, (SELECT draft_revision FROM public.service_routine_versions WHERE id = v_version), v_payload::text
  )), 'published not editable');
  v_next := public.create_next_service_routine_draft(v_routine, v_payload, NULL);
  PERFORM pg_temp.ra_note('RA-A6-next', (v_next ->> 'status') = 'draft', v_next::text);

  -- RA-A7 retire + code reuse denied
  PERFORM public.retire_service_routine_version(v_version, NULL);
  PERFORM pg_temp.ra_note('RA-A7',
    (SELECT status FROM public.service_routine_versions WHERE id = v_version) = 'retired',
    'retired');
  PERFORM pg_temp.ra_as(tech1);
  v_preview := public.get_service_routine_preview(v_version, NULL);
  PERFORM pg_temp.ra_note('RA-A7-preview', (v_preview ->> 'status') = 'retired', 'preview retained');
  PERFORM pg_temp.ra_as(admin1);
  PERFORM pg_temp.ra_note('RA-A13', pg_temp.ra_denied(format(
    $q$SELECT public.create_service_routine_draft('RA-SAW-OK','reuse','','',%L::jsonb,ARRAY['saw'],NULL)$q$,
    v_payload::text
  )), 'code not released');

  -- RA-A10: durable success audits (mutation+audit atomic). Deny-class audits are optional
  -- per contract and do not persist when the RPC RAISE rolls back the same transaction;
  -- deny leaves business unchanged (covered by RA-A1/A4/A9/A12/A13).
  PERFORM pg_temp.ra_note('RA-A10',
    (SELECT count(*) FROM public.service_workflow_audit WHERE action = 'routine_published') >= 1
    AND (SELECT count(*) FROM public.service_workflow_audit WHERE action = 'routine_review_invalidated') >= 1
    AND (SELECT count(*) FROM public.service_workflow_audit WHERE action = 'routine_retired') >= 1
    AND (SELECT count(*) FROM public.service_workflow_audit WHERE action = 'routine_review_recorded') >= 1
    AND (SELECT count(*) FROM public.service_workflow_audit WHERE action = 'routine_draft_created') >= 1,
    'success audit events durable');

  -- RA-A9 anon
  PERFORM set_config('app.b1_uid', '', true);
  PERFORM pg_temp.ra_note('RA-A9-anon', pg_temp.ra_denied(format(
    $q$SELECT public.publish_service_routine_version(%L::uuid,NULL)$q$, v_version
  )), 'anon denied');
END $$;

SELECT check_id, status, detail FROM ra_results ORDER BY check_id;
SELECT
  count(*) FILTER (WHERE status = 'PASS') AS pass,
  count(*) FILTER (WHERE status = 'FAIL') AS fail
FROM ra_results;
