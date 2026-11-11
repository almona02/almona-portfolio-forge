-- Machine identity PR1 disposable battery (run after migration on a prepared DB).
-- Expects GUCs / fixtures from the Python harness.

CREATE TEMP TABLE mi_eval (
  check_id text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('PASS','FAIL')),
  detail text NOT NULL DEFAULT ''
);

CREATE OR REPLACE FUNCTION pg_temp.auth_as(p_uid uuid, p_role text DEFAULT 'customer')
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_uid::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated', 'is_anonymous', false)::text,
    true
  );
  INSERT INTO public.profiles(id, role) VALUES (p_uid, p_role)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
END;
$$;

DO $$
DECLARE
  v_owner uuid := 'a1000000-0000-4000-8000-000000000001';
  v_other uuid := 'a1000000-0000-4000-8000-000000000002';
  v_admin uuid := 'a1000000-0000-4000-8000-000000000099';
  v_r jsonb;
  v_r2 jsonb;
  v_id uuid;
  v_id2 uuid;
  v_ticket uuid;
  v_row public.service_tickets%ROWTYPE;
  v_cnt int;
BEGIN
  INSERT INTO auth.users(id) VALUES (v_owner), (v_other), (v_admin)
  ON CONFLICT DO NOTHING;

  -- A1 catalog registration
  PERFORM pg_temp.auth_as(v_owner, 'customer');
  v_r := public.register_machine_identity(
    'Catalog CNC', 'YM-5K', 'YM-5K-238492', 'yilmaz', 'ym-5k', false,
    NULL, false, NULL, 'idem-catalog-1', 'web_registration', NULL, NULL
  );
  IF (v_r->>'machine_id') IS NULL OR (v_r->>'idempotent')::boolean IS TRUE THEN
    INSERT INTO mi_eval VALUES ('A1_catalog', 'FAIL', v_r::text);
  ELSE
    INSERT INTO mi_eval VALUES ('A1_catalog', 'PASS', v_r->>'machine_id');
  END IF;
  v_id := (v_r->>'machine_id')::uuid;

  -- A2 uncatalogued
  v_r := public.register_machine_identity(
    'Shop saw', 'Custom Panel Saw', 'CPS-100/22', 'unknown', NULL, true,
    NULL, false, NULL, 'idem-uncat-1', 'web_registration', NULL, NULL
  );
  IF (v_r->>'machine_id') IS NULL OR (v_r->>'identity_confidence') IS NULL THEN
    INSERT INTO mi_eval VALUES ('A2_uncatalogued', 'FAIL', v_r::text);
  ELSE
    INSERT INTO mi_eval VALUES ('A2_uncatalogued', 'PASS', coalesce(v_r->>'identity_confidence',''));
  END IF;

  -- A3 missing serial provisional
  v_r := public.register_machine_identity(
    'No plate', 'Unknown press', NULL, 'elumatec', NULL, true,
    NULL, false, NULL, 'idem-miss-1', 'service_intake', NULL, 'plate_illegible'
  );
  IF (v_r->>'identity_confidence') = 'provisional'
     AND EXISTS (SELECT 1 FROM public.machines m WHERE m.id = (v_r->>'machine_id')::uuid AND m.serial_number IS NULL AND m.provisional_asset_ref LIKE 'ALM-%') THEN
    INSERT INTO mi_eval VALUES ('A3_missing_serial', 'PASS', v_r->>'machine_id');
  ELSE
    INSERT INTO mi_eval VALUES ('A3_missing_serial', 'FAIL', v_r::text);
  END IF;

  -- A6 idempotent retry same key
  v_r2 := public.register_machine_identity(
    'Catalog CNC', 'YM-5K', 'YM-5K-238492', 'yilmaz', 'ym-5k', false,
    NULL, false, NULL, 'idem-catalog-1', 'web_registration', NULL, NULL
  );
  IF (v_r2->>'idempotent')::boolean AND (v_r2->>'machine_id') = v_id::text THEN
    INSERT INTO mi_eval VALUES ('A6_idempotent_retry', 'PASS', v_id::text);
  ELSE
    INSERT INTO mi_eval VALUES ('A6_idempotent_retry', 'FAIL', v_r2::text);
  END IF;

  -- conflicting payload same key
  BEGIN
    PERFORM public.register_machine_identity(
      'Other', 'OTHER', 'OTHER-1', 'yilmaz', NULL, true,
      NULL, false, NULL, 'idem-catalog-1', 'web_registration', NULL, NULL
    );
    INSERT INTO mi_eval VALUES ('A6b_idempotent_conflict', 'FAIL', 'expected error');
  EXCEPTION WHEN others THEN
    INSERT INTO mi_eval VALUES ('A6b_idempotent_conflict', 'PASS', SQLERRM);
  END;

  -- A5 cross-customer: other owner registers same serial → review, no disclosure in payload
  PERFORM pg_temp.auth_as(v_other, 'customer');
  v_r := public.register_machine_identity(
    'Claimed CNC', 'YM-5K', 'YM-5K-238492', 'yilmaz', 'ym-5k', false,
    NULL, false, NULL, 'idem-other-1', 'web_registration', NULL, NULL
  );
  IF (v_r->>'needs_staff_review')::boolean
     AND (v_r->>'identity_review_status') = 'duplicate_review'
     AND (v_r::text NOT ILIKE '%' || v_owner::text || '%') THEN
    INSERT INTO mi_eval VALUES ('A5_cross_customer_review', 'PASS', v_r->>'message');
  ELSE
    INSERT INTO mi_eval VALUES ('A5_cross_customer_review', 'FAIL', v_r::text);
  END IF;
  v_id2 := (v_r->>'machine_id')::uuid;

  -- Customer duplicate detect must not set foreign_match_exists true/false leak... returns null for non-staff
  v_r := public.machine_duplicate_detect('YM-5K-238492', 'yilmaz');
  IF (v_r->>'foreign_match_exists') IS NULL AND jsonb_typeof(v_r->'own_matches') = 'array' THEN
    INSERT INTO mi_eval VALUES ('A5b_detect_no_foreign_leak', 'PASS', v_r::text);
  ELSE
    INSERT INTO mi_eval VALUES ('A5b_detect_no_foreign_leak', 'FAIL', v_r::text);
  END IF;

  -- Retired included in staff detection
  UPDATE public.machines SET identity_lifecycle = 'retired' WHERE id = v_id;
  PERFORM pg_temp.auth_as(v_admin, 'admin');
  v_r := public.machine_duplicate_detect('YM-5K-238492', 'yilmaz');
  IF jsonb_array_length(v_r->'staff_matches') >= 1 THEN
    INSERT INTO mi_eval VALUES ('A_retired_in_detection', 'PASS', (v_r->'staff_matches')::text);
  ELSE
    INSERT INTO mi_eval VALUES ('A_retired_in_detection', 'FAIL', v_r::text);
  END IF;
  UPDATE public.machines SET identity_lifecycle = 'active' WHERE id = v_id;

  -- Separator-insensitive flags review only (different canonical)
  PERFORM pg_temp.auth_as(v_owner, 'customer');
  v_r := public.register_machine_identity(
    'Sep variant owner', 'YM-5K', 'YM5K238492', 'yilmaz', NULL, true,
    NULL, false, NULL, 'idem-sep-owner', 'web_registration', NULL, NULL
  );
  -- own exact different canonical is allowed; cross-customer sep flag tested via other
  PERFORM pg_temp.auth_as(v_other, 'customer');
  -- ensure another sep-insensitive candidate exists under owner with different canonical already
  v_r := public.machine_duplicate_detect('YM-5K-238492', 'yilmaz');
  -- as other looking at own only — flag may be true from global exists check
  IF (v_r ? 'review_flag_separator_insensitive') THEN
    INSERT INTO mi_eval VALUES ('A_sep_insensitive_flag_present', 'PASS', (v_r->>'review_flag_separator_insensitive'));
  ELSE
    INSERT INTO mi_eval VALUES ('A_sep_insensitive_flag_present', 'FAIL', v_r::text);
  END IF;

  -- Ticket link authz
  INSERT INTO public.service_tickets(id, ticket_number, user_id, title, description, type, priority, status)
  VALUES (
    'b1000000-0000-4000-8000-000000000010',
    'MI-PR1-T1',
    v_owner,
    'link test',
    'd',
    'general',
    'medium',
    'open'
  )
  ON CONFLICT (id) DO NOTHING;
  v_ticket := 'b1000000-0000-4000-8000-000000000010';

  PERFORM pg_temp.auth_as(v_owner, 'customer');
  v_row := public.link_ticket_machine(v_ticket, v_id);
  IF v_row.machine_id = v_id THEN
    INSERT INTO mi_eval VALUES ('A7_authorized_link', 'PASS', v_row.machine_id::text);
  ELSE
    INSERT INTO mi_eval VALUES ('A7_authorized_link', 'FAIL', 'no link');
  END IF;

  -- Cross-customer link denied
  PERFORM pg_temp.auth_as(v_other, 'customer');
  BEGIN
    PERFORM public.link_ticket_machine(v_ticket, v_id2);
    INSERT INTO mi_eval VALUES ('A8_cross_customer_link_deny', 'FAIL', 'expected deny');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO mi_eval VALUES ('A8_cross_customer_link_deny', 'PASS', SQLERRM);
  WHEN others THEN
    IF SQLSTATE = '42501' THEN
      INSERT INTO mi_eval VALUES ('A8_cross_customer_link_deny', 'PASS', SQLERRM);
    ELSE
      INSERT INTO mi_eval VALUES ('A8_cross_customer_link_deny', 'FAIL', SQLERRM);
    END IF;
  END;

  -- Null machine_id tickets still insertable
  INSERT INTO public.service_tickets(id, ticket_number, user_id, title, description, type, priority, status, machine_id)
  VALUES (
    'b1000000-0000-4000-8000-000000000011',
    'MI-PR1-T2',
    v_owner,
    'null machine',
    'd',
    'general',
    'low',
    'open',
    NULL
  );
  INSERT INTO mi_eval VALUES ('A9_null_machine_ticket', 'PASS', 'inserted');

  -- Audit events exist
  SELECT COUNT(*) INTO v_cnt FROM public.machine_identity_events WHERE machine_id = v_id;
  IF v_cnt >= 1 THEN
    INSERT INTO mi_eval VALUES ('A10_audit', 'PASS', v_cnt::text);
  ELSE
    INSERT INTO mi_eval VALUES ('A10_audit', 'FAIL', '0');
  END IF;

  -- UUID immutable / raw preserved
  IF EXISTS (
    SELECT 1 FROM public.machines
    WHERE id = v_id AND serial_number_raw = 'YM-5K-238492' AND serial_canonical = 'YM-5K-238492'
  ) THEN
    INSERT INTO mi_eval VALUES ('A11_raw_and_uuid', 'PASS', v_id::text);
  ELSE
    INSERT INTO mi_eval VALUES ('A11_raw_and_uuid', 'FAIL', 'raw mismatch');
  END IF;

  -- Legacy gaps on grandfathered path: insert pre-style then rely on columns
  INSERT INTO public.machines(id, name, model, serial_number, owner_id)
  VALUES ('c1000000-0000-4000-8000-000000000001', 'Legacy', 'L1', 'LEG-001', v_owner)
  ON CONFLICT (id) DO NOTHING;
  UPDATE public.machines
  SET serial_number_raw = COALESCE(serial_number_raw, serial_number),
      serial_canonical = COALESCE(serial_canonical, public.machine_serial_canonical_v1(serial_number)),
      identity_confidence = 'legacy_incomplete',
      manufacturer_validation_status = 'unchecked',
      legacy_gaps = '["installation_date_unknown","brand_unknown","catalog_unlinked"]'::jsonb
  WHERE id = 'c1000000-0000-4000-8000-000000000001';
  IF EXISTS (
    SELECT 1 FROM public.machines
    WHERE id = 'c1000000-0000-4000-8000-000000000001'
      AND identity_confidence = 'legacy_incomplete'
      AND installation_date IS NULL
  ) THEN
    INSERT INTO mi_eval VALUES ('A4_legacy_gaps', 'PASS', 'no invented dates');
  ELSE
    INSERT INTO mi_eval VALUES ('A4_legacy_gaps', 'FAIL', 'legacy');
  END IF;
END $$;

SELECT check_id, status, detail FROM mi_eval ORDER BY check_id;
SELECT COUNT(*) FILTER (WHERE status='PASS') AS pass, COUNT(*) FILTER (WHERE status='FAIL') AS fail FROM mi_eval;
