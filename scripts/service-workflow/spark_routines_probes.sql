-- Spark independent Lane A probes. Implementation SHA bound by runner.
-- Behavior + business-state asserts only; audit asserts run post-hoc (superuser).
SET ROLE ra_auth;
CREATE TEMP TABLE spark_results(check_id text PRIMARY KEY, status text NOT NULL, detail text NOT NULL DEFAULT '');

-- Admin UUIDs from disposable base (see base file for full map).
-- ADMIN1 aaaaaaa1 / ADMIN2 aaaaaaa2 / SUPPORT bbbb1 / TECH cccc1 / CUST dddd1 / SALES eeee1

-- D1-ok: admin creates draft, row + version exist, status draft, ordinal NULL.
DO $$
DECLARE r jsonb;
BEGIN
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  r := public.create_service_routine_draft('SPK-D1-OK', 'Spark ok', '', '', '{"sections":[]}', ARRAY['saw']);
  IF (r->>'routine_id') IS NOT NULL AND (r->>'status') = 'draft'
     AND EXISTS (SELECT 1 FROM public.service_routines WHERE code = 'SPK-D1-OK' AND status = 'draft')
     AND EXISTS (SELECT 1 FROM public.service_routine_versions v JOIN public.service_routines ro ON ro.id = v.routine_id WHERE ro.code = 'SPK-D1-OK' AND v.status = 'draft' AND v.version_ordinal IS NULL) THEN
    INSERT INTO spark_results VALUES ('SPK-D1-ok', 'PASS', 'admin draft created, ordinal NULL');
  ELSE
    INSERT INTO spark_results VALUES ('SPK-D1-ok', 'FAIL', 'unexpected create result ' || COALESCE(r::text, 'null'));
  END IF;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO spark_results VALUES ('SPK-D1-ok', 'FAIL', 'raised ' || SQLSTATE || ' ' || SQLERRM);
END $$;

-- D1-role: support/tech/sales/customer create denied 42501, no row (checked as admin).
DO $$
DECLARE uids text[] := ARRAY['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'cccccccc-cccc-cccc-cccc-ccccccccccc1', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', 'dddddddd-dddd-dddd-dddd-ddddddddddd1'];
DECLARE lbls text[] := ARRAY['support', 'tech', 'sales', 'cust'];
DECLARE i int; st text; v_code text;
BEGIN
  FOR i IN 1..4 LOOP
    v_code := 'SPK-D1-' || lbls[i];
    PERFORM set_config('app.b1_uid', uids[i], false);
    BEGIN
      PERFORM public.create_service_routine_draft(v_code, 'x');
      INSERT INTO spark_results VALUES ('SPK-D1-' || lbls[i], 'FAIL', 'unexpectedly allowed');
    EXCEPTION WHEN OTHERS THEN
      st := SQLSTATE;
      PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
      IF st = '42501' AND NOT EXISTS (SELECT 1 FROM public.service_routines WHERE service_routines.code = v_code) THEN
        INSERT INTO spark_results VALUES ('SPK-D1-' || lbls[i], 'PASS', 'denied 42501, no row');
      ELSE
        INSERT INTO spark_results VALUES ('SPK-D1-' || lbls[i], 'FAIL', 'state=' || st);
      END IF;
    END;
  END LOOP;
END $$;

-- D1-anon: no actor context denied, no row.
DO $$
DECLARE st text;
BEGIN
  PERFORM set_config('app.b1_uid', '', false);
  BEGIN
    PERFORM public.create_service_routine_draft('SPK-D1-ANON', 'x');
    INSERT INTO spark_results VALUES ('SPK-D1-anon', 'FAIL', 'unexpectedly allowed');
  EXCEPTION WHEN OTHERS THEN
    st := SQLSTATE;
    PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
    IF st = '42501' AND NOT EXISTS (SELECT 1 FROM public.service_routines WHERE code = 'SPK-D1-ANON') THEN
      INSERT INTO spark_results VALUES ('SPK-D1-anon', 'PASS', 'denied 42501, no row');
    ELSE
      INSERT INTO spark_results VALUES ('SPK-D1-anon', 'FAIL', 'state=' || st);
    END IF;
  END;
END $$;

-- D1-impersonate: caller admin1 with p_actor_id=admin2 denied.
DO $$
DECLARE st text;
BEGIN
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  BEGIN
    PERFORM public.create_service_routine_draft('SPK-D1-IMP', 'x', '', '', '{"sections":[]}', '{}', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2');
    INSERT INTO spark_results VALUES ('SPK-D1-impersonate', 'FAIL', 'impersonation allowed');
  EXCEPTION WHEN OTHERS THEN
    st := SQLSTATE;
    PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
    IF st = '42501' AND NOT EXISTS (SELECT 1 FROM public.service_routines WHERE code = 'SPK-D1-IMP') THEN
      INSERT INTO spark_results VALUES ('SPK-D1-impersonate', 'PASS', 'denied 42501, no row');
    ELSE
      INSERT INTO spark_results VALUES ('SPK-D1-impersonate', 'FAIL', 'state=' || st);
    END IF;
  END;
END $$;

-- D1-svc: service-role claim without actor denied; with admin actor allowed.
DO $$
DECLARE st text; r jsonb;
BEGIN
  PERFORM set_config('app.b1_uid', '', false);
  PERFORM set_config('request.jwt.claim.role', 'service_role', false);
  BEGIN
    PERFORM public.create_service_routine_draft('SPK-D1-SVC0', 'x');
    INSERT INTO spark_results VALUES ('SPK-D1-svc-nactor', 'FAIL', 'actorless service call allowed');
  EXCEPTION WHEN OTHERS THEN
    st := SQLSTATE;
    PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
    PERFORM set_config('request.jwt.claim.role', '', false);
    IF st = '42501' AND NOT EXISTS (SELECT 1 FROM public.service_routines WHERE code = 'SPK-D1-SVC0') THEN
      INSERT INTO spark_results VALUES ('SPK-D1-svc-nactor', 'PASS', 'denied 42501, no row');
    ELSE
      INSERT INTO spark_results VALUES ('SPK-D1-svc-nactor', 'FAIL', 'state=' || st);
    END IF;
  END;
  PERFORM set_config('app.b1_uid', '', false);
  PERFORM set_config('request.jwt.claim.role', 'service_role', false);
  BEGIN
    r := public.create_service_routine_draft('SPK-D1-SVC1', 'x', '', '', '{"sections":[]}', '{}', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1');
    PERFORM set_config('request.jwt.claim.role', '', false);
    IF (r->>'routine_id') IS NOT NULL THEN
      INSERT INTO spark_results VALUES ('SPK-D1-svc-ok', 'PASS', 'service+actor allowed');
    ELSE
      INSERT INTO spark_results VALUES ('SPK-D1-svc-ok', 'FAIL', 'null result');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('request.jwt.claim.role', '', false);
    INSERT INTO spark_results VALUES ('SPK-D1-svc-ok', 'FAIL', 'raised ' || SQLSTATE);
  END;
END $$;

-- Session helpers: note() records a check; pg_temp.mkflow() builds submitted+reviewed draft.
CREATE FUNCTION pg_temp.note(pid text, ppass boolean, pdetail text) RETURNS void
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO spark_results VALUES (pid, CASE WHEN ppass THEN 'PASS' ELSE 'FAIL' END, COALESCE(pdetail, ''));
END; $$;
CREATE FUNCTION pg_temp.mkflow(pcode text, p_payload jsonb, p_fams text[]) RETURNS uuid
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE rr jsonb; vv uuid;
BEGIN
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  rr := public.create_service_routine_draft(pcode, 't', '', '', p_payload, p_fams);
  vv := (rr->>'version_id')::uuid;
  PERFORM public.submit_service_routine_for_review(vv);
  PERFORM set_config('app.b1_uid', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', false);
  PERFORM public.record_service_routine_review(vv, 'looks fine');
  RETURN vv;
END; $$;

-- Shared good payload (safety section + gate; general measurement with source).
-- Each D2 variant mutates exactly one gate. Publish attempted after submit+review.
DO $$
DECLARE
  good jsonb := '{"sections":[{"kind":"safety","items":[{"id":"sg1","type":"safety_gate","requirement_class":"safety_gate","instruction":"Isolate"}]},{"kind":"general","items":[{"id":"m1","type":"measurement","unit":"mm","limit_value":"5","tolerance_source_ref":"DOC-1"}]}]}';
  r jsonb; vid uuid; st text; ok boolean;
BEGIN
  -- D2-nosafety: no safety section at all.
  vid := pg_temp.mkflow('SPK-D2-NOS', '{"sections":[{"kind":"general","items":[]}]}', ARRAY['saw']);
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  BEGIN
    PERFORM public.publish_service_routine_version(vid);
    PERFORM pg_temp.note('SPK-D2-nosafety', false, 'published without safety section');
  EXCEPTION WHEN OTHERS THEN
    SELECT v.status = 'in_review' AND v.version_ordinal IS NULL AND v.published_at IS NULL INTO ok
      FROM public.service_routine_versions v WHERE v.id = vid;
    PERFORM pg_temp.note('SPK-D2-nosafety', SQLSTATE = '22023' AND ok, 'state=' || SQLSTATE || ' row_intact=' || COALESCE(ok::text, '?'));
  END;
  -- D2-outside: gate item outside safety section.
  vid := pg_temp.mkflow('SPK-D2-OUT', '{"sections":[{"kind":"safety","items":[{"id":"sg1","type":"safety_gate","requirement_class":"safety_gate"}]},{"kind":"general","items":[{"id":"sg2","type":"safety_gate"}]}]}', ARRAY['saw']);
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  BEGIN
    PERFORM public.publish_service_routine_version(vid);
    PERFORM pg_temp.note('SPK-D2-outside', false, 'published with gate outside section');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-D2-outside', SQLSTATE = '22023', 'state=' || SQLSTATE); END;
  -- D2-nogate: safety section present but no gate item.
  vid := pg_temp.mkflow('SPK-D2-NOG', '{"sections":[{"kind":"safety","items":[{"id":"i1","type":"inspection"}]}]}', ARRAY['saw']);
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  BEGIN
    PERFORM public.publish_service_routine_version(vid);
    PERFORM pg_temp.note('SPK-D2-nogate', false, 'published without gate item');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-D2-nogate', SQLSTATE = '22023', 'state=' || SQLSTATE); END;
  -- D2-waivable: gate marked waivable.
  vid := pg_temp.mkflow('SPK-D2-WAI', '{"sections":[{"kind":"safety","items":[{"id":"sg1","type":"safety_gate","waivable":true}]}]}', ARRAY['saw']);
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  BEGIN
    PERFORM public.publish_service_routine_version(vid);
    PERFORM pg_temp.note('SPK-D2-waivable', false, 'published with waivable gate');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-D2-waivable', SQLSTATE = '22023', 'state=' || SQLSTATE); END;
  -- D2-interval: cadence interval <= 0.
  vid := pg_temp.mkflow('SPK-D2-INT', '{"sections":[{"kind":"safety","items":[{"id":"sg1","type":"safety_gate"}]}],"cadence":{"interval":0}}', ARRAY['saw']);
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  BEGIN
    PERFORM public.publish_service_routine_version(vid);
    PERFORM pg_temp.note('SPK-D2-interval', false, 'published with interval 0');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-D2-interval', SQLSTATE = '22023', 'state=' || SQLSTATE); END;
  -- D2-nofamily: payload good but no family applicability.
  vid := pg_temp.mkflow('SPK-D2-NOF', good, ARRAY[]::text[]);
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  BEGIN
    PERFORM public.publish_service_routine_version(vid);
    PERFORM pg_temp.note('SPK-D2-nofamily', false, 'published without family');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-D2-nofamily', SQLSTATE = '22023', 'state=' || SQLSTATE); END;
  -- D2-noreview: good payload + family, submitted, NO review recorded.
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  r := public.create_service_routine_draft('SPK-D2-NOR', 't', '', '', good, ARRAY['saw']);
  vid := (r->>'version_id')::uuid;
  PERFORM public.submit_service_routine_for_review(vid);
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  BEGIN
    PERFORM public.publish_service_routine_version(vid);
    PERFORM pg_temp.note('SPK-D2-noreview', false, 'published without review');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-D2-noreview', SQLSTATE = '22023', 'state=' || SQLSTATE); END;
END $$;

-- D3: measurement limit without source in general section denied.
-- D3b: same inside safety section (contract has no section qualifier; expect deny).
DO $$
DECLARE vid uuid;
BEGIN
  vid := pg_temp.mkflow('SPK-D3-GEN', '{"sections":[{"kind":"safety","items":[{"id":"sg1","type":"safety_gate"}]},{"kind":"general","items":[{"id":"m1","type":"measurement","limit_value":"5"}]}]}', ARRAY['saw']);
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  BEGIN
    PERFORM public.publish_service_routine_version(vid);
    PERFORM pg_temp.note('SPK-D3-nosource', false, 'published limit-without-source');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-D3-nosource', SQLSTATE = '22023', 'state=' || SQLSTATE); END;
  vid := pg_temp.mkflow('SPK-D3-SAF', '{"sections":[{"kind":"safety","items":[{"id":"sg1","type":"safety_gate"},{"id":"m9","type":"measurement","limit_value":"5"}]}]}', ARRAY['saw']);
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  BEGIN
    PERFORM public.publish_service_routine_version(vid);
    PERFORM pg_temp.note('SPK-D3b-safety-nosource', false, 'FINDING: safety-section limit-without-source published');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-D3b-safety-nosource', SQLSTATE = '22023', 'state=' || SQLSTATE); END;
END $$;

-- D4: support review + any-admin publish succeeds; ordinal 1; next draft -> ordinal 2.
DO $$
DECLARE
  good jsonb := '{"sections":[{"kind":"safety","items":[{"id":"sg1","type":"safety_gate"}]}]}';
  r jsonb; vid uuid; rid uuid; p jsonb; v2 uuid; p2 jsonb;
BEGIN
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  r := public.create_service_routine_draft('SPK-D4-BIND', 't', '', '', good, ARRAY['saw']);
  vid := (r->>'version_id')::uuid; rid := (r->>'routine_id')::uuid;
  PERFORM public.submit_service_routine_for_review(vid);
  PERFORM set_config('app.b1_uid', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', false);
  PERFORM public.record_service_routine_review(vid, 'support review');
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  p := public.publish_service_routine_version(vid);
  IF (p->>'version_ordinal')::int = 1 AND (p->>'status') = 'published' AND (p->>'idempotent')::boolean = false THEN
    PERFORM pg_temp.note('SPK-D4-bind-ok', true, 'support review + admin2 publish, ordinal 1');
  ELSE
    PERFORM pg_temp.note('SPK-D4-bind-ok', false, 'unexpected ' || p::text);
  END IF;
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  r := public.create_next_service_routine_draft(rid);
  v2 := (r->>'version_id')::uuid;
  PERFORM public.submit_service_routine_for_review(v2);
  PERFORM set_config('app.b1_uid', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', false);
  PERFORM public.record_service_routine_review(v2, 'second');
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  p2 := public.publish_service_routine_version(v2);
  IF (p2->>'version_ordinal')::int = 2 THEN
    PERFORM pg_temp.note('SPK-D4-next-ordinal', true, 'second publish ordinal 2');
  ELSE
    PERFORM pg_temp.note('SPK-D4-next-ordinal', false, 'unexpected ' || p2::text);
  END IF;
EXCEPTION WHEN OTHERS THEN
  PERFORM pg_temp.note('SPK-D4-bind-ok', false, 'raised ' || SQLSTATE || ' ' || SQLERRM);
  PERFORM pg_temp.note('SPK-D4-next-ordinal', false, 'skipped after raise');
END $$;

-- D4-self: author cannot review own draft (42501), no review row.
DO $$
DECLARE r jsonb; vid uuid; st text;
BEGIN
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  r := public.create_service_routine_draft('SPK-D4-SELF', 't', '', '', '{"sections":[]}', ARRAY['saw']);
  vid := (r->>'version_id')::uuid;
  PERFORM public.submit_service_routine_for_review(vid);
  BEGIN
    PERFORM public.record_service_routine_review(vid, 'self');
    PERFORM pg_temp.note('SPK-D4-self', false, 'self-review allowed');
  EXCEPTION WHEN OTHERS THEN
    st := SQLSTATE;
    IF st = '42501' AND NOT EXISTS (SELECT 1 FROM public.service_routine_reviews WHERE version_id = vid) THEN
      PERFORM pg_temp.note('SPK-D4-self', true, 'denied 42501, no row');
    ELSE
      PERFORM pg_temp.note('SPK-D4-self', false, 'state=' || st);
    END IF;
  END;
END $$;

-- D4-stale: edit after approval invalidates eligibility, preserves history row,
-- publish on stale approval denied; fresh review then publishes.
DO $$
DECLARE
  good jsonb := '{"sections":[{"kind":"safety","items":[{"id":"sg1","type":"safety_gate"}]}]}';
  edited jsonb := '{"sections":[{"kind":"safety","items":[{"id":"sg1","type":"safety_gate"},{"id":"i2","type":"inspection"}]}]}';
  r jsonb; vid uuid; rev1 text; rev2 text; st text; p jsonb;
BEGIN
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  r := public.create_service_routine_draft('SPK-D4-STALE', 't', '', '', good, ARRAY['saw']);
  vid := (r->>'version_id')::uuid; rev1 := r->>'draft_revision';
  PERFORM public.submit_service_routine_for_review(vid);
  PERFORM set_config('app.b1_uid', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', false);
  PERFORM public.record_service_routine_review(vid, 'first');
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  r := public.update_service_routine_draft(vid, rev1, edited);
  rev2 := r->>'draft_revision';
  IF rev2 IS DISTINCT FROM rev1
     AND EXISTS (SELECT 1 FROM public.service_routine_reviews WHERE version_id = vid AND eligible_for_publish = false AND invalidated_at IS NOT NULL)
     AND (SELECT status FROM public.service_routine_versions WHERE id = vid) = 'draft' THEN
    PERFORM pg_temp.note('SPK-D4-stale-invalidate', true, 'edit advanced digest, eligibility cleared, history kept');
  ELSE
    PERFORM pg_temp.note('SPK-D4-stale-invalidate', false, 'rev1=' || COALESCE(rev1,'?') || ' rev2=' || COALESCE(rev2,'?'));
  END IF;
  PERFORM public.submit_service_routine_for_review(vid);
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  BEGIN
    PERFORM public.publish_service_routine_version(vid);
    PERFORM pg_temp.note('SPK-D4-stale-publish', false, 'published on invalidated approval');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-D4-stale-publish', SQLSTATE = '22023', 'state=' || SQLSTATE); END;
  PERFORM set_config('app.b1_uid', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', false);
  PERFORM public.record_service_routine_review(vid, 'second');
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  p := public.publish_service_routine_version(vid);
  PERFORM pg_temp.note('SPK-D4-fresh-publish', (p->>'status') = 'published', COALESCE(p::text, 'null'));
EXCEPTION WHEN OTHERS THEN
  PERFORM pg_temp.note('SPK-D4-stale-invalidate', false, 'raised ' || SQLSTATE || ' ' || SQLERRM);
END $$;

-- D4-lifecycle: review on draft denied; double submit denied.
DO $$
DECLARE r jsonb; vid uuid; n int := 0;
BEGIN
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  r := public.create_service_routine_draft('SPK-D4-LIFE', 't', '', '', '{"sections":[]}', ARRAY['saw']);
  vid := (r->>'version_id')::uuid;
  PERFORM set_config('app.b1_uid', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', false);
  BEGIN PERFORM public.record_service_routine_review(vid, 'early'); EXCEPTION WHEN OTHERS THEN IF SQLSTATE = '22023' THEN n := n + 1; END IF; END;
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  PERFORM public.submit_service_routine_for_review(vid);
  BEGIN PERFORM public.submit_service_routine_for_review(vid); EXCEPTION WHEN OTHERS THEN IF SQLSTATE = '22023' THEN n := n + 1; END IF; END;
  PERFORM pg_temp.note('SPK-D4-lifecycle', n = 2, 'early-review + double-submit both 22023: ' || n || '/2');
END $$;

-- D5: RPC-only writes + published/retired immutability at table level.
DO $$
DECLARE vid uuid; rid uuid; r jsonb;
BEGIN
  vid := pg_temp.mkflow('SPK-D5-IMM', '{"sections":[{"kind":"safety","items":[{"id":"sg1","type":"safety_gate"}]}]}', ARRAY['saw']);
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  PERFORM public.publish_service_routine_version(vid);
  -- direct UPDATE of published payload as authenticated admin -> denied.
  BEGIN
    UPDATE public.service_routine_versions SET payload = '{"sections":[]}' WHERE id = vid;
    PERFORM pg_temp.note('SPK-D5-direct-update-pub', false, 'direct update of published allowed');
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_temp.note('SPK-D5-direct-update-pub', SQLSTATE = '42501'
      AND (SELECT payload ? 'sections' FROM public.service_routine_versions WHERE id = vid), 'state=' || SQLSTATE);
  END;
  -- direct DELETE of published version -> denied, row survives.
  BEGIN
    DELETE FROM public.service_routine_versions WHERE id = vid;
    PERFORM pg_temp.note('SPK-D5-direct-delete-pub', false, 'direct delete allowed');
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_temp.note('SPK-D5-direct-delete-pub', SQLSTATE = '42501'
      AND EXISTS (SELECT 1 FROM public.service_routine_versions WHERE id = vid), 'state=' || SQLSTATE);
  END;
  -- RPC update on published -> 22023.
  BEGIN
    PERFORM public.update_service_routine_draft(vid, 'whatever', '{"sections":[]}');
    PERFORM pg_temp.note('SPK-D5-rpc-update-pub', false, 'RPC update of published allowed');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-D5-rpc-update-pub', SQLSTATE = '22023', 'state=' || SQLSTATE); END;
  -- RPC-only proof: direct UPDATE of a *draft* also denied (no write policies).
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  r := public.create_service_routine_draft('SPK-D5-DRF', 't', '', '', '{"sections":[]}', ARRAY['saw']);
  BEGIN
    UPDATE public.service_routine_versions SET payload = '{"sections":[]}' WHERE id = (r->>'version_id')::uuid;
    PERFORM pg_temp.note('SPK-D5-direct-update-draft', false, 'direct draft update allowed (not RPC-only)');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-D5-direct-update-draft', SQLSTATE = '42501', 'state=' || SQLSTATE); END;
  -- direct INSERT denied.
  BEGIN
    INSERT INTO public.service_routines (code, name_en, owner_id) VALUES ('SPK-D5-INS', 'x', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1');
    PERFORM pg_temp.note('SPK-D5-direct-insert', false, 'direct insert allowed');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-D5-direct-insert', SQLSTATE = '42501', 'state=' || SQLSTATE); END;
END $$;

-- D6: code uniqueness incl. retired; whitespace-trimmed; no rename path.
DO $$
DECLARE r jsonb; vid uuid; st text;
BEGIN
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  r := public.create_service_routine_draft('SPK-D6-CODE', 't');
  BEGIN
    PERFORM public.create_service_routine_draft('SPK-D6-CODE', 'dup');
    PERFORM pg_temp.note('SPK-D6-dup', false, 'duplicate code allowed');
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_temp.note('SPK-D6-dup', SQLSTATE = '23505'
      AND (SELECT count(*) FROM public.service_routines WHERE code = 'SPK-D6-CODE') = 1, 'state=' || SQLSTATE);
  END;
  BEGIN
    PERFORM public.create_service_routine_draft('  SPK-D6-CODE  ', 'ws');
    PERFORM pg_temp.note('SPK-D6-trim', false, 'whitespace-variant code allowed');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-D6-trim', SQLSTATE = '23505', 'state=' || SQLSTATE); END;
  -- retire the only version, then reuse attempt must still fail.
  vid := pg_temp.mkflow('SPK-D6-RET', '{"sections":[{"kind":"safety","items":[{"id":"sg1","type":"safety_gate"}]}]}', ARRAY['saw']);
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  PERFORM public.publish_service_routine_version(vid);
  PERFORM public.retire_service_routine_version(vid);
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  BEGIN
    PERFORM public.create_service_routine_draft('SPK-D6-RET', 'reuse');
    PERFORM pg_temp.note('SPK-D6-retired', false, 'retired code released for reuse');
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_temp.note('SPK-D6-retired', SQLSTATE = '23505'
      AND (SELECT count(*) FROM public.service_routines WHERE code = 'SPK-D6-RET') = 1, 'state=' || SQLSTATE);
  END;
  -- no rename path: update_service_routine_draft carries no code param; code stable across edits.
  r := public.create_service_routine_draft('SPK-D6-STABLE', 't');
  vid := (r->>'version_id')::uuid;
  PERFORM public.update_service_routine_draft(vid, r->>'draft_revision', '{"sections":[]}', 'renamed-title');
  IF (SELECT code FROM public.service_routines WHERE id = (r->>'routine_id')::uuid) = 'SPK-D6-STABLE'
     AND (SELECT name_en FROM public.service_routines WHERE id = (r->>'routine_id')::uuid) = 'renamed-title' THEN
    PERFORM pg_temp.note('SPK-D6-stable', true, 'code immutable across edits, name editable');
  ELSE
    PERFORM pg_temp.note('SPK-D6-stable', false, 'code changed or name not updated');
  END IF;
END $$;

-- D7: fresh save applies + advances revision; stale save conflicts 40001, row unchanged.
DO $$
DECLARE
  p1 jsonb := '{"sections":[{"kind":"safety","items":[{"id":"sg1","type":"safety_gate"}]}]}';
  p2 jsonb := '{"sections":[{"kind":"safety","items":[{"id":"sg1","type":"safety_gate"},{"id":"i2","type":"inspection"}]}]}';
  r jsonb; vid uuid; rev1 text; rev2 text; st text;
BEGIN
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  r := public.create_service_routine_draft('SPK-D7-STALE', 't', '', '', p1, ARRAY['saw']);
  vid := (r->>'version_id')::uuid; rev1 := r->>'draft_revision';
  r := public.update_service_routine_draft(vid, rev1, p2);
  rev2 := r->>'draft_revision';
  IF rev2 IS DISTINCT FROM rev1 THEN
    PERFORM pg_temp.note('SPK-D7-fresh', true, 'fresh save applied, revision advanced');
  ELSE
    PERFORM pg_temp.note('SPK-D7-fresh', false, 'revision did not advance');
  END IF;
  BEGIN
    PERFORM public.update_service_routine_draft(vid, rev1, p1);
    PERFORM pg_temp.note('SPK-D7-stale', false, 'stale save silently applied');
  EXCEPTION WHEN OTHERS THEN
    st := SQLSTATE;
    IF st = '40001'
       AND (SELECT draft_revision FROM public.service_routine_versions WHERE id = vid) = rev2
       AND (SELECT payload FROM public.service_routine_versions WHERE id = vid) = p2 THEN
      PERFORM pg_temp.note('SPK-D7-stale', true, 'conflict 40001, newer content intact');
    ELSE
      PERFORM pg_temp.note('SPK-D7-stale', false, 'state=' || st);
    END IF;
  END;
END $$;

-- D8: no failed publish may allocate an ordinal or stamp published_at.
DO $$
DECLARE n int;
BEGIN
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  SELECT count(*) INTO n FROM public.service_routine_versions v
    JOIN public.service_routines ro ON ro.id = v.routine_id
   WHERE ro.code LIKE 'SPK-D2-%' AND v.status <> 'published'
     AND (v.version_ordinal IS NOT NULL OR v.published_at IS NOT NULL);
  PERFORM pg_temp.note('SPK-D8-no-ordinal-on-deny', n = 0, 'denied versions with ordinal/stamp: ' || n);
END $$;

-- D9 (tightened): applicability metadata + catalog relationships only.
DO $$
DECLARE r jsonb; rid uuid; st text;
BEGIN
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  r := public.create_service_routine_draft('SPK-D9-APPL', 't', '', '', '{"sections":[]}', ARRAY['saw']);
  rid := (r->>'routine_id')::uuid;
  -- manufacturer link requires value_family.
  BEGIN
    PERFORM public.set_service_routine_applicability(rid, 'manufacturer', 'ACME', NULL);
    PERFORM pg_temp.note('SPK-D9-mfr-nofam', false, 'manufacturer link without value_family allowed');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-D9-mfr-nofam', SQLSTATE = '22023', 'state=' || SQLSTATE); END;
  -- catalog_model link requires value_family.
  BEGIN
    PERFORM public.set_service_routine_applicability(rid, 'catalog_model', 'MODEL-X', NULL);
    PERFORM pg_temp.note('SPK-D9-model-nofam', false, 'model link without value_family allowed');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-D9-model-nofam', SQLSTATE = '22023', 'state=' || SQLSTATE); END;
  -- family mismatch on metadata: hard deny, no row.
  BEGIN
    PERFORM public.set_service_routine_applicability(rid, 'catalog_model', 'MODEL-X', 'router');
    PERFORM pg_temp.note('SPK-D9-mismatch', false, 'family-mismatched model link allowed');
  EXCEPTION WHEN OTHERS THEN
    st := SQLSTATE;
    IF st = '22023' AND NOT EXISTS (SELECT 1 FROM public.service_routine_applicability WHERE routine_id = rid AND value = 'MODEL-X') THEN
      PERFORM pg_temp.note('SPK-D9-mismatch', true, 'hard deny 22023, no row');
    ELSE
      PERFORM pg_temp.note('SPK-D9-mismatch', false, 'state=' || st);
    END IF;
  END;
  -- coherent catalog link stored with value_family round-trip.
  PERFORM public.set_service_routine_applicability(rid, 'catalog_model', 'MODEL-S', 'saw');
  IF EXISTS (SELECT 1 FROM public.service_routine_applicability WHERE routine_id = rid AND kind = 'catalog_model' AND value = 'MODEL-S' AND value_family = 'saw') THEN
    PERFORM pg_temp.note('SPK-D9-model-ok', true, 'coherent model link stored');
  ELSE
    PERFORM pg_temp.note('SPK-D9-model-ok', false, 'row missing');
  END IF;
  -- explicit deny_list blocks even with override reason.
  PERFORM public.set_service_routine_manufacturer_restrictions(rid, NULL, ARRAY['EVILCO']);
  BEGIN
    PERFORM public.set_service_routine_applicability(rid, 'manufacturer', 'EVILCO', 'saw', 'admin says so');
    PERFORM pg_temp.note('SPK-D9-deny', false, 'denied manufacturer attached via override');
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_temp.note('SPK-D9-deny', SQLSTATE = '22023', 'state=' || SQLSTATE);
  END;
  -- allow_list blocks non-listed, admits listed.
  PERFORM public.set_service_routine_manufacturer_restrictions(rid, ARRAY['ACME'], ARRAY[]::text[]);
  BEGIN
    PERFORM public.set_service_routine_applicability(rid, 'manufacturer', 'OTHER', 'saw');
    PERFORM pg_temp.note('SPK-D9-allow-deny', false, 'non-allow-listed manufacturer admitted');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-D9-allow-deny', SQLSTATE = '22023', 'state=' || SQLSTATE); END;
  PERFORM public.set_service_routine_applicability(rid, 'manufacturer', 'ACME', 'saw');
  IF EXISTS (SELECT 1 FROM public.service_routine_applicability WHERE routine_id = rid AND kind = 'manufacturer' AND value = 'ACME') THEN
    PERFORM pg_temp.note('SPK-D9-allow-ok', true, 'allow-listed manufacturer stored');
  ELSE
    PERFORM pg_temp.note('SPK-D9-allow-ok', false, 'row missing');
  END IF;
  -- non-admin applicability write denied.
  PERFORM set_config('app.b1_uid', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', false);
  BEGIN
    PERFORM public.set_service_routine_applicability(rid, 'family', 'router');
    PERFORM pg_temp.note('SPK-D9-support-deny', false, 'support applicability write allowed');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-D9-support-deny', SQLSTATE = '42501', 'state=' || SQLSTATE); END;
END $$;

-- D10: retire published ok; retire draft denied; double retire denied; routine status follows.
DO $$
DECLARE r jsonb; vid uuid; rid uuid; n int := 0;
BEGIN
  vid := pg_temp.mkflow('SPK-D10-RET', '{"sections":[{"kind":"safety","items":[{"id":"sg1","type":"safety_gate"}]}]}', ARRAY['saw']);
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  PERFORM public.publish_service_routine_version(vid);
  PERFORM public.retire_service_routine_version(vid);
  SELECT count(*) INTO n FROM public.service_routine_versions WHERE id = vid AND status = 'retired' AND retired_at IS NOT NULL;
  PERFORM pg_temp.note('SPK-D10-retire-ok', n = 1, 'published retired with stamp');
  BEGIN PERFORM public.retire_service_routine_version(vid);
    PERFORM pg_temp.note('SPK-D10-twice', false, 'double retire allowed');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-D10-twice', SQLSTATE = '22023', 'state=' || SQLSTATE); END;
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  r := public.create_service_routine_draft('SPK-D10-DRF', 't', '', '', '{"sections":[]}', ARRAY['saw']);
  BEGIN PERFORM public.retire_service_routine_version((r->>'version_id')::uuid);
    PERFORM pg_temp.note('SPK-D10-draft', false, 'draft retire allowed');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-D10-draft', SQLSTATE = '22023', 'state=' || SQLSTATE); END;
  SELECT count(*) INTO n FROM public.service_routines ro
    JOIN public.service_routine_versions v ON v.routine_id = ro.id
   WHERE v.id = vid AND ro.status = 'retired';
  PERFORM pg_temp.note('SPK-D10-routine-status', n = 1, 'routine status follows last publish retire');
END $$;

-- Preview matrix: drafts admin/support only; published +tech; customer/anon never.
DO $$
DECLARE
  r jsonb; draft_vid uuid; pub_vid uuid; pv jsonb;
  ADMIN1 text := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  SUPPORT text := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
  TECH text := 'cccccccc-cccc-cccc-cccc-ccccccccccc1';
  CUST text := 'dddddddd-dddd-dddd-dddd-ddddddddddd1';
BEGIN
  PERFORM set_config('app.b1_uid', ADMIN1, false);
  r := public.create_service_routine_draft('SPK-PV-DRF', 't', '', '', '{"sections":[]}', ARRAY['saw']);
  draft_vid := (r->>'version_id')::uuid;
  pub_vid := pg_temp.mkflow('SPK-PV-PUB', '{"sections":[{"kind":"general","items":[{"id":"g1","type":"note"}]},{"kind":"safety","items":[{"id":"sg1","type":"safety_gate"},{"id":"m1","type":"measurement","unit":"bar"}]}]}', ARRAY['saw']);
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  PERFORM public.publish_service_routine_version(pub_vid);
  -- draft preview: admin ok.
  PERFORM set_config('app.b1_uid', ADMIN1, false);
  BEGIN pv := public.get_service_routine_preview(draft_vid);
    PERFORM pg_temp.note('SPK-PV-draft-admin', (pv->>'read_only')::boolean = true, 'admin draft preview');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-PV-draft-admin', false, 'raised ' || SQLSTATE); END;
  -- draft preview: support ok.
  PERFORM set_config('app.b1_uid', SUPPORT, false);
  BEGIN pv := public.get_service_routine_preview(draft_vid);
    PERFORM pg_temp.note('SPK-PV-draft-support', (pv->>'status') = 'draft', 'support draft preview');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-PV-draft-support', false, 'raised ' || SQLSTATE); END;
  -- draft preview: technician denied (style grant is NOT a draft grant).
  PERFORM set_config('app.b1_uid', TECH, false);
  BEGIN pv := public.get_service_routine_preview(draft_vid);
    PERFORM pg_temp.note('SPK-PV-draft-tech', false, 'tech reached unpublished draft');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-PV-draft-tech', SQLSTATE = '42501', 'state=' || SQLSTATE); END;
  -- draft preview: customer denied.
  PERFORM set_config('app.b1_uid', CUST, false);
  BEGIN pv := public.get_service_routine_preview(draft_vid);
    PERFORM pg_temp.note('SPK-PV-draft-cust', false, 'customer reached draft');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-PV-draft-cust', SQLSTATE = '42501', 'state=' || SQLSTATE); END;
  -- draft preview: anon denied.
  PERFORM set_config('app.b1_uid', '', false);
  BEGIN pv := public.get_service_routine_preview(draft_vid);
    PERFORM pg_temp.note('SPK-PV-draft-anon', false, 'anon reached draft');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-PV-draft-anon', SQLSTATE = '42501', 'state=' || SQLSTATE); END;
  -- published preview: tech ok, customer/anon denied.
  PERFORM set_config('app.b1_uid', TECH, false);
  BEGIN pv := public.get_service_routine_preview(pub_vid);
    PERFORM pg_temp.note('SPK-PV-pub-tech', (pv->>'status') = 'published' AND (pv->>'read_only')::boolean, 'tech published preview');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-PV-pub-tech', false, 'raised ' || SQLSTATE); END;
  PERFORM set_config('app.b1_uid', CUST, false);
  BEGIN pv := public.get_service_routine_preview(pub_vid);
    PERFORM pg_temp.note('SPK-PV-pub-cust', false, 'customer reached published preview');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-PV-pub-cust', SQLSTATE = '42501', 'state=' || SQLSTATE); END;
  -- preview fidelity: safety section first, version/ordinal echoed, no invented judgement.
  PERFORM set_config('app.b1_uid', ADMIN1, false);
  pv := public.get_service_routine_preview(pub_vid);
  IF (pv->'preview'->'sections'->0->>'kind') = 'safety'
     AND (pv->>'version_ordinal')::int = 1
     AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(pv->'preview'->'sections'->1->'items') it WHERE (it.value ? 'judgement') OR (it.value ? 'verdict') OR (it.value ? 'pass'))
     AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(pv->'preview'->'sections'->0->'items') it WHERE (it.value ? 'judgement') OR (it.value ? 'verdict') OR ((it.value ? 'pass') AND (it.value->>'id') = 'm1')) THEN
    PERFORM pg_temp.note('SPK-PV-fidelity', true, 'safety-first, ordinal echoed, no invented judgement');
  ELSE
    PERFORM pg_temp.note('SPK-PV-fidelity', false, 'preview=' || COALESCE((pv->'preview')::text, 'null'));
  END IF;
  -- missing version: P0002, no payload.
  BEGIN pv := public.get_service_routine_preview('00000000-0000-0000-0000-000000000000');
    PERFORM pg_temp.note('SPK-PV-missing', false, 'missing version returned payload');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-PV-missing', SQLSTATE = 'P0002', 'state=' || SQLSTATE); END;
END $$;

-- D11: repeat publish idempotent (same ordinal, no new row); unauthorized repeat denied first.
DO $$
DECLARE vid uuid; p1 jsonb; p2 jsonb; st text;
BEGIN
  vid := pg_temp.mkflow('SPK-D11-IDEM', '{"sections":[{"kind":"safety","items":[{"id":"sg1","type":"safety_gate"}]}]}', ARRAY['saw']);
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  p1 := public.publish_service_routine_version(vid);
  p2 := public.publish_service_routine_version(vid);
  IF (p1->>'version_ordinal') = (p2->>'version_ordinal') AND (p2->>'idempotent')::boolean
     AND (SELECT count(*) FROM public.service_routine_versions WHERE id = vid AND status = 'published') = 1 THEN
    PERFORM pg_temp.note('SPK-D11-idem', true, 'repeat same ordinal, single row');
  ELSE
    PERFORM pg_temp.note('SPK-D11-idem', false, 'p1=' || p1::text || ' p2=' || p2::text);
  END IF;
  PERFORM set_config('app.b1_uid', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', false);
  BEGIN
    PERFORM public.publish_service_routine_version(vid);
    PERFORM pg_temp.note('SPK-D11-unauth', false, 'support repeat bypassed authz');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-D11-unauth', SQLSTATE = '42501', 'state=' || SQLSTATE); END;
END $$;

-- RLS: technician sees published/retired only; customer zero rows; support sees drafts.
DO $$
DECLARE n_pub int; n_all int; n_cust int; n_sup int;
BEGIN
  PERFORM set_config('app.b1_uid', 'cccccccc-cccc-cccc-cccc-ccccccccccc1', false);
  SELECT count(*) INTO n_pub FROM public.service_routine_versions WHERE status IN ('published', 'retired');
  SELECT count(*) INTO n_all FROM public.service_routine_versions;
  PERFORM pg_temp.note('SPK-RLS-tech', n_all = n_pub AND n_pub >= 1, 'tech sees ' || n_all || '/' || n_pub || ' published-only');
  PERFORM set_config('app.b1_uid', 'dddddddd-dddd-dddd-dddd-ddddddddddd1', false);
  SELECT count(*) INTO n_cust FROM public.service_routines;
  SELECT count(*) INTO n_all FROM public.service_routine_versions;
  PERFORM pg_temp.note('SPK-RLS-cust', n_cust = 0 AND n_all = 0, 'customer sees zero rows');
  PERFORM set_config('app.b1_uid', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', false);
  SELECT count(*) INTO n_sup FROM public.service_routine_versions WHERE status IN ('draft', 'in_review');
  PERFORM pg_temp.note('SPK-RLS-support', n_sup >= 1, 'support sees drafts: ' || n_sup);
END $$;

-- SIG: freeze-doc RPC signatures exist (names + arg counts).
DO $$
DECLARE want text[][] := ARRAY[
  ARRAY['create_service_routine_draft', '7'], ARRAY['update_service_routine_draft', '7'],
  ARRAY['submit_service_routine_for_review', '2'], ARRAY['record_service_routine_review', '3'],
  ARRAY['publish_service_routine_version', '2'], ARRAY['retire_service_routine_version', '2'],
  ARRAY['set_service_routine_applicability', '6'], ARRAY['get_service_routine_preview', '2'],
  ARRAY['create_next_service_routine_draft', '3'], ARRAY['set_service_routine_manufacturer_restrictions', '4']];
DECLARE i int; missing text := '';
BEGIN
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  FOR i IN 1..10 LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                   WHERE n.nspname = 'public' AND p.proname = want[i][1] AND p.pronargs = want[i][2]::int) THEN
      missing := missing || want[i][1] || ' ';
    END IF;
  END LOOP;
  PERFORM pg_temp.note('SPK-SIG', missing = '', CASE WHEN missing = '' THEN '10/10 RPCs match' ELSE 'missing: ' || missing END);
END $$;

-- CC-inflight: same routine cannot hold two in-flight drafts; next draft only
-- after the in-flight version leaves draft/in_review (sequential ordinals).
DO $$
DECLARE
  good jsonb := '{"sections":[{"kind":"safety","items":[{"id":"sg1","type":"safety_gate"}]}]}';
  r jsonb; rid uuid; vid uuid;
BEGIN
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  r := public.create_service_routine_draft('SPK-CC-INFLIGHT', 't', '', '', good, ARRAY['saw']);
  rid := (r->>'routine_id')::uuid; vid := (r->>'version_id')::uuid;
  BEGIN
    PERFORM public.create_next_service_routine_draft(rid);
    PERFORM pg_temp.note('SPK-CC-inflight-draft', false, 'second draft allowed alongside draft');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-CC-inflight-draft', SQLSTATE = '22023', 'state=' || SQLSTATE); END;
  PERFORM public.submit_service_routine_for_review(vid);
  BEGIN
    PERFORM public.create_next_service_routine_draft(rid);
    PERFORM pg_temp.note('SPK-CC-inflight-review', false, 'second draft allowed alongside in_review');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-CC-inflight-review', SQLSTATE = '22023', 'state=' || SQLSTATE); END;
  PERFORM set_config('app.b1_uid', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', false);
  PERFORM public.record_service_routine_review(vid, 'cc');
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  PERFORM public.publish_service_routine_version(vid);
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  BEGIN
    r := public.create_next_service_routine_draft(rid);
    PERFORM pg_temp.note('SPK-CC-next-ok', (r->>'status') = 'draft', 'next draft after publish');
  EXCEPTION WHEN OTHERS THEN PERFORM pg_temp.note('SPK-CC-next-ok', false, 'raised ' || SQLSTATE); END;
END $$;

SELECT check_id, status, detail FROM spark_results ORDER BY check_id;
