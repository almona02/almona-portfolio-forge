-- pgTAP: #67 convert + optimization evidence hardeners (authenticated JWT claims)
-- Note: fabricator_positions_v2 has BEFORE UPDATE bump_fabricator_qc_revision — track revision after writes.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

DO $reset_pgtap$
BEGIN
  IF to_regclass('pg_temp.__tcache__') IS NOT NULL THEN EXECUTE 'DROP TABLE pg_temp.__tcache__'; END IF;
  IF to_regclass('pg_temp.__tresults__') IS NOT NULL THEN EXECUTE 'DROP TABLE pg_temp.__tresults__'; END IF;
  IF to_regclass('pg_temp.__tcache___numb_seq') IS NOT NULL THEN EXECUTE 'DROP SEQUENCE pg_temp.__tcache___numb_seq'; END IF;
  IF to_regclass('pg_temp.__tresults___numb_seq') IS NOT NULL THEN EXECUTE 'DROP SEQUENCE pg_temp.__tresults___numb_seq'; END IF;
END;
$reset_pgtap$;

BEGIN;
SET LOCAL search_path TO public, extensions, pg_temp;
CREATE TEMP TABLE convert_order_test_output (
  sequence_no INTEGER GENERATED ALWAYS AS IDENTITY,
  result TEXT NOT NULL
) ON COMMIT DROP;
INSERT INTO convert_order_test_output(result) SELECT plan(17);

-- Hardened evidence fixture (schema + cuttingPlan). Fingerprint bound to placement digest.
CREATE TEMP TABLE convert_opt_evidence (
  payload JSONB NOT NULL,
  cut_count INTEGER NOT NULL,
  placement_fp TEXT
) ON COMMIT DROP;

INSERT INTO convert_opt_evidence(payload, cut_count) VALUES (
  jsonb_build_object(
    'schema', 'almona.optimization-result',
    'schemaVersion', 2,
    'kerfMm', 4,
    'trimMm', 0,
    -- Client requiredCuts are ignored on record_*; cutIds must match derive (componentId:index).
    'requiredCuts', jsonb_build_array(
      jsonb_build_object('cutId', 'c1:0', 'profileId', 'PS-FRAME', 'length', 1200, 'angle', 45),
      jsonb_build_object('cutId', 'c1:1', 'profileId', 'PS-FRAME', 'length', 1400, 'angle', 45)
    ),
    'cuttingPlan', jsonb_build_array(
      jsonb_build_object(
        'stockLength', 6000,
        'profile', jsonb_build_object('id', 'PS-FRAME'),
        'cuts', jsonb_build_array(
          jsonb_build_object('cutId', 'c1:0', 'length', 1200, 'angle', 45),
          jsonb_build_object('cutId', 'c1:1', 'length', 1400, 'angle', 45)
        )
      )
    )
  ),
  2
);

UPDATE convert_opt_evidence SET placement_fp = (
  SELECT v.o_design_fingerprint || '||' || v.o_placement_fingerprint
  FROM public.validate_optimization_evidence_payload(payload, cut_count) AS v
);

INSERT INTO auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
VALUES
  ('13000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'convert-owner@example.test', '', now(), now()),
  ('13000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'convert-other@example.test', '', now(), now()),
  ('13000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'convert-admin@example.test', '', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles(id, full_name, role)
VALUES
  ('13000000-0000-0000-0000-000000000001', 'Convert Owner', 'customer'),
  ('13000000-0000-0000-0000-000000000002', 'Convert Other', 'customer'),
  ('13000000-0000-0000-0000-000000000099', 'Convert Admin', 'admin')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.fabricator_projects_v2(id, owner_user_id, project_code, project_name, client_name, system_pack_id)
VALUES ('23000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', 'CONV-TEST', 'Convert Test', 'Test', 'caluminium-ps')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.fabricator_positions_v2(
  id, project_id, owner_user_id, overall_width_mm, overall_height_mm, system_pack_id,
  qc_revision, status, optimization, quantity, components
) VALUES (
  '33000000-0000-0000-0000-000000000001',
  '23000000-0000-0000-0000-000000000001',
  '13000000-0000-0000-0000-000000000001',
  1200, 1500, 'caluminium-ps', 1, 'measuring', NULL, 1,
  jsonb_build_array(
    jsonb_build_object(
      'id', 'c1',
      'profile', jsonb_build_object('id', 'PS-FRAME', 'profileCode', 'PS-FRAME'),
      'cuttingLengths', jsonb_build_array(1200, 1400),
      'angles', jsonb_build_array(45, 45),
      'quantity', 1
    )
  )
)
ON CONFLICT (id) DO UPDATE
  SET status = 'measuring',
      optimization = NULL,
      quantity = 1,
      system_pack_id = 'caluminium-ps',
      components = EXCLUDED.components;

CREATE TEMP TABLE convert_auth_rev (
  system_pack_revision BIGINT NOT NULL
) ON COMMIT DROP;

INSERT INTO convert_auth_rev(system_pack_revision)
SELECT a.system_pack_revision
FROM public.fabricator_manufacturing_authority_revisions a
WHERE a.system_pack_id = 'caluminium-ps' AND a.revoked_at IS NULL
ORDER BY a.system_pack_revision DESC
LIMIT 1;

INSERT INTO public.fabricator_manufacturing_authority_revisions (
  approval_id, system_pack_id, system_pack_revision, authority_payload, approved_by
)
SELECT
  'b2000000-0000-4000-8000-000000000067',
  'caluminium-ps',
  1,
  jsonb_build_object(
    'schema', 'almona.manufacturing-authority',
    'schemaVersion', 1,
    'system', jsonb_build_object('id', 'caluminium-ps'),
    'systemPack', jsonb_build_object(
      'revision', 1, 'evidenceStatus', 'approved',
      'approvalId', 'b2000000-0000-4000-8000-000000000067'
    ),
    'profiles', jsonb_build_array(
      jsonb_build_object('role', 'frame', 'profileId', 'PS-FRAME', 'stockLengthMm', 6000, 'evidenceStatus', 'approved', 'approvalId', 'b2000000-0000-4000-8000-000000000010'),
      -- Permitted short bar: raw 1200+1400 fits; with kerf 4×2 overrun (integration path).
      jsonb_build_object('role', 'frame-short', 'profileId', 'PS-FRAME', 'stockLengthMm', 2600, 'evidenceStatus', 'approved', 'approvalId', 'b2000000-0000-4000-8000-000000000012'),
      jsonb_build_object('role', 'sash', 'profileId', 'PS-SASH', 'stockLengthMm', 6000, 'evidenceStatus', 'approved', 'approvalId', 'b2000000-0000-4000-8000-000000000011')
    ),
    'cuttingRules', jsonb_build_array(
      jsonb_build_object(
        'ruleId', 'ps-default', 'revision', 1,
        'approvalId', 'b2000000-0000-4000-8000-000000000020',
        'evidenceStatus', 'approved',
        'deductions', jsonb_build_object('endDeductionMm', 20),
        'allowances', jsonb_build_object('weldMm', 3),
        'applicability', jsonb_build_object('materials', jsonb_build_array('aluminum'))
      )
    ),
    'toleranceRule', jsonb_build_object('evidenceStatus', 'approved', 'approvalId', 'b2000000-0000-4000-8000-000000000030'),
    'manufacturingSettings', jsonb_build_object('sawKerfMm', 4, 'trimCutMm', 0)
  ),
  '13000000-0000-0000-0000-000000000099'
WHERE NOT EXISTS (SELECT 1 FROM convert_auth_rev);

INSERT INTO convert_auth_rev(system_pack_revision)
SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM convert_auth_rev);

-- Ensure active caluminium-ps authority permits the short bar used by kerf-overrun record tests.
-- Transaction-local; rolled back with the suite. Does not mutate production outside this test txn.
UPDATE public.fabricator_manufacturing_authority_revisions a
SET authority_payload = jsonb_set(
  a.authority_payload,
  '{profiles}',
  (a.authority_payload->'profiles') || jsonb_build_array(
    jsonb_build_object(
      'role', 'frame-short',
      'profileId', 'PS-FRAME',
      'stockLengthMm', 2600,
      'evidenceStatus', 'approved',
      'approvalId', 'b2000000-0000-4000-8000-000000000012'
    )
  )
)
WHERE a.system_pack_id = 'caluminium-ps'
  AND a.revoked_at IS NULL
  AND NOT (a.authority_payload->'profiles' @> '[{"stockLengthMm": 2600}]'::jsonb);

CREATE TEMP TABLE convert_pos_rev (
  qc_revision BIGINT NOT NULL
) ON COMMIT DROP;

INSERT INTO convert_pos_rev(qc_revision)
SELECT qc_revision FROM public.fabricator_positions_v2
WHERE id = '33000000-0000-0000-0000-000000000001';

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"13000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

-- 1) Client JSON alone must not qualify (UPDATE bumps qc_revision)
UPDATE public.fabricator_positions_v2
  SET status = 'optimized',
      optimization = '{"bars":[{"id":"b1"}],"efficiency":0.9,"serverValidated":true}'::jsonb
  WHERE id = '33000000-0000-0000-0000-000000000001';

UPDATE convert_pos_rev SET qc_revision = (
  SELECT qc_revision FROM public.fabricator_positions_v2
  WHERE id = '33000000-0000-0000-0000-000000000001'
);

-- #68: approve hardener at the post-update revision before opt/convert gates
DO $hardener_clear$
DECLARE
  v_prop UUID;
BEGIN
  INSERT INTO public.profiles(id, full_name, role)
  VALUES ('13000000-0000-0000-0000-000000000099', 'Convert Admin', 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin';

  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"13000000-0000-0000-0000-000000000001","role":"authenticated"}',
    true
  );
  v_prop := public.request_fabricator_hardener_verification(
    '33000000-0000-0000-0000-000000000001',
    (SELECT qc_revision FROM convert_pos_rev LIMIT 1),
    'H-PS-CONVERT-01',
    '{"method":"catalogue","reference":"convert-test","calc":"ok"}'::jsonb,
    jsonb_build_array(
      jsonb_build_object('check', 'system_profile', 'passed', true),
      jsonb_build_object('check', 'material', 'passed', true),
      jsonb_build_object('check', 'glass_thickness', 'passed', true),
      jsonb_build_object('check', 'sash_dimensions', 'passed', true),
      jsonb_build_object('check', 'sash_weight', 'passed', true),
      jsonb_build_object('check', 'opening_type', 'passed', true)
    ),
    '{}',
    'sliding', 'aluminum', 6, 600, 1400, 28
  );
  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"13000000-0000-0000-0000-000000000099","role":"authenticated"}',
    true
  );
  PERFORM public.admin_review_fabricator_hardener(v_prop, 'approve', 'convert fixture');
  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"13000000-0000-0000-0000-000000000001","role":"authenticated"}',
    true
  );
END;
$hardener_clear$;

INSERT INTO convert_order_test_output(result)
SELECT throws_ok(
  format(
    $fmt$SELECT * FROM public.convert_fabricator_pose_quote_to_order(
      '23000000-0000-0000-0000-000000000001',
      '33000000-0000-0000-0000-000000000001',
      %s, 100, 14, 114, 'EGP', 0.14, NULL, '[]'::jsonb, '{"k":1}'::jsonb, NULL
    )$fmt$,
    (SELECT qc_revision FROM convert_pos_rev LIMIT 1)
  ),
  'optimization evidence missing (server validation required)',
  'client-written optimization JSON does not qualify'
);

-- 2) Record evidence as owner at current revision
INSERT INTO convert_order_test_output(result)
SELECT lives_ok(
  format(
    $fmt$SELECT public.record_fabricator_optimization_evidence(
      '33000000-0000-0000-0000-000000000001',
      %s, %s, %L, %s, %L, %s, %L::jsonb
    )$fmt$,
    (SELECT qc_revision FROM convert_pos_rev LIMIT 1),
    (SELECT qc_revision FROM convert_pos_rev LIMIT 1),
    (SELECT placement_fp FROM convert_opt_evidence LIMIT 1),
    (SELECT system_pack_revision FROM convert_auth_rev LIMIT 1),
    (SELECT public.approved_rule_content_fingerprint(
      a.authority_payload->'cuttingRules'
    ) FROM public.fabricator_manufacturing_authority_revisions a
     WHERE a.system_pack_id = 'caluminium-ps' AND a.revoked_at IS NULL
     ORDER BY a.system_pack_revision DESC LIMIT 1),
    (SELECT cut_count FROM convert_opt_evidence LIMIT 1),
    (SELECT payload::text FROM convert_opt_evidence LIMIT 1)
  ),
  'owner can record optimization evidence'
);

-- 2b) Validator path: kerf-aware overrun (raw lengths fit; consumed with kerf does not)
INSERT INTO convert_order_test_output(result)
SELECT throws_ok(
  $fmt$SELECT * FROM public.validate_optimization_evidence_payload(
    '{"schema":"almona.optimization-result","schemaVersion":2,"kerfMm":4,"trimMm":0,"requiredCuts":[{"cutId":"c1:0","profileId":"PS-FRAME","length":1200,"angle":45},{"cutId":"c1:1","profileId":"PS-FRAME","length":1400,"angle":45}],"cuttingPlan":[{"stockLength":2600,"profile":{"id":"PS-FRAME"},"cuts":[{"cutId":"c1:0","length":1200,"angle":45},{"cutId":"c1:1","length":1400,"angle":45}]}]}'::jsonb,
    2
  )$fmt$,
  'cuttingPlan[0] stock overrun (consumed 2608 mm > stock 2600 mm including kerf/trim)',
  'stock overrun rejected when validating evidence'
);

-- 2b-record) Recording gate: same overrun on authority-permitted short stock (2600)
INSERT INTO convert_order_test_output(result)
SELECT throws_ok(
  format(
    $fmt$SELECT public.record_fabricator_optimization_evidence(
      '33000000-0000-0000-0000-000000000001',
      %s, %s, 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef', %s, %L, 2,
      '{"schema":"almona.optimization-result","schemaVersion":2,"kerfMm":4,"trimMm":0,"requiredCuts":[{"cutId":"c1:0","profileId":"PS-FRAME","length":1200,"angle":45},{"cutId":"c1:1","profileId":"PS-FRAME","length":1400,"angle":45}],"cuttingPlan":[{"stockLength":2600,"profile":{"id":"PS-FRAME"},"cuts":[{"cutId":"c1:0","length":1200,"angle":45},{"cutId":"c1:1","length":1400,"angle":45}]}]}'::jsonb
    )$fmt$,
    (SELECT qc_revision FROM convert_pos_rev LIMIT 1),
    (SELECT qc_revision FROM convert_pos_rev LIMIT 1),
    (SELECT system_pack_revision FROM convert_auth_rev LIMIT 1),
    (SELECT public.approved_rule_content_fingerprint(
      a.authority_payload->'cuttingRules'
    ) FROM public.fabricator_manufacturing_authority_revisions a
     WHERE a.system_pack_id = 'caluminium-ps' AND a.revoked_at IS NULL
     ORDER BY a.system_pack_revision DESC LIMIT 1)
  ),
  'cuttingPlan[0] stock overrun (consumed 2608 mm > stock 2600 mm including kerf/trim)',
  'stock overrun rejected when recording evidence on permitted short stock'
);

-- 2c) Reject placeholder ledger fingerprint
INSERT INTO convert_order_test_output(result)
SELECT throws_ok(
  format(
    $fmt$SELECT public.record_fabricator_optimization_evidence(
      '33000000-0000-0000-0000-000000000001',
      %s, %s, 'ledger-fp-abcdefgh', %s, %L, %s, %L::jsonb
    )$fmt$,
    (SELECT qc_revision FROM convert_pos_rev LIMIT 1),
    (SELECT qc_revision FROM convert_pos_rev LIMIT 1),
    (SELECT system_pack_revision FROM convert_auth_rev LIMIT 1),
    (SELECT public.approved_rule_content_fingerprint(
      a.authority_payload->'cuttingRules'
    ) FROM public.fabricator_manufacturing_authority_revisions a
     WHERE a.system_pack_id = 'caluminium-ps' AND a.revoked_at IS NULL
     ORDER BY a.system_pack_revision DESC LIMIT 1),
    (SELECT cut_count FROM convert_opt_evidence LIMIT 1),
    (SELECT payload::text FROM convert_opt_evidence LIMIT 1)
  ),
  'ledger fingerprint is not authoritative',
  'placeholder ledger fingerprint rejected'
);

-- 3) Happy-path convert
INSERT INTO convert_order_test_output(result)
SELECT ok(
  (SELECT order_id IS NOT NULL FROM public.convert_fabricator_pose_quote_to_order(
    '23000000-0000-0000-0000-000000000001',
    '33000000-0000-0000-0000-000000000001',
    (SELECT qc_revision FROM convert_pos_rev LIMIT 1),
    100, 14, 114, 'EGP', 0.14, NULL, '[]'::jsonb, '{"k":1}'::jsonb, 'notes'
  ) LIMIT 1),
  'convert succeeds with server-stamped evidence'
);

-- 4) Identical retry reuses order
INSERT INTO convert_order_test_output(result)
SELECT ok(
  (SELECT reused FROM public.convert_fabricator_pose_quote_to_order(
    '23000000-0000-0000-0000-000000000001',
    '33000000-0000-0000-0000-000000000001',
    (SELECT qc_revision FROM convert_pos_rev LIMIT 1),
    100, 14, 114, 'EGP', 0.14, NULL, '[]'::jsonb, '{"k":1}'::jsonb, 'notes'
  ) LIMIT 1),
  'identical retry reuses existing order'
);

-- 5) Changed money rejected
INSERT INTO convert_order_test_output(result)
SELECT throws_ok(
  format(
    $fmt$SELECT * FROM public.convert_fabricator_pose_quote_to_order(
      '23000000-0000-0000-0000-000000000001',
      '33000000-0000-0000-0000-000000000001',
      %s, 200, 28, 228, 'EGP', 0.14, NULL, '[]'::jsonb, '{"k":1}'::jsonb, NULL
    )$fmt$,
    (SELECT qc_revision FROM convert_pos_rev LIMIT 1)
  ),
  'quote money/payload changed; use a new revision',
  'changed money on same revision rejected'
);

-- 6) Inconsistent totals rejected
INSERT INTO convert_order_test_output(result)
SELECT throws_ok(
  format(
    $fmt$SELECT * FROM public.convert_fabricator_pose_quote_to_order(
      '23000000-0000-0000-0000-000000000001',
      '33000000-0000-0000-0000-000000000001',
      %s, 100, 14, 200, 'EGP', 0.14, NULL, '[]'::jsonb, '{"k":1}'::jsonb, NULL
    )$fmt$,
    (SELECT qc_revision FROM convert_pos_rev LIMIT 1)
  ),
  'quote totals inconsistent (subtotal + tax ≠ total)',
  'inconsistent money rejected'
);

-- 7) Non-owner convert denied
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"13000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

INSERT INTO convert_order_test_output(result)
SELECT throws_ok(
  format(
    $fmt$SELECT * FROM public.convert_fabricator_pose_quote_to_order(
      '23000000-0000-0000-0000-000000000001',
      '33000000-0000-0000-0000-000000000001',
      %s, 100, 14, 114, 'EGP', 0.14, NULL, '[]'::jsonb, '{"k":1}'::jsonb, NULL
    )$fmt$,
    (SELECT qc_revision FROM convert_pos_rev LIMIT 1)
  ),
  'position owner mismatch',
  'non-owner convert denied'
);

-- 8) Non-owner cannot record evidence
INSERT INTO convert_order_test_output(result)
SELECT throws_ok(
  format(
    $fmt$SELECT public.record_fabricator_optimization_evidence(
      '33000000-0000-0000-0000-000000000001',
      %s, %s, %L, %s, 'rules-v1', %s, %L::jsonb
    )$fmt$,
    (SELECT qc_revision FROM convert_pos_rev LIMIT 1),
    (SELECT qc_revision FROM convert_pos_rev LIMIT 1),
    (SELECT placement_fp FROM convert_opt_evidence LIMIT 1),
    (SELECT system_pack_revision FROM convert_auth_rev LIMIT 1),
    (SELECT cut_count FROM convert_opt_evidence LIMIT 1),
    (SELECT payload::text FROM convert_opt_evidence LIMIT 1)
  ),
  'position owner mismatch',
  'non-owner evidence record denied'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"13000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

-- 9) Stale revision rejected at record time
INSERT INTO convert_order_test_output(result)
SELECT throws_ok(
  format(
    $fmt$SELECT public.record_fabricator_optimization_evidence(
      '33000000-0000-0000-0000-000000000001',
      9999, 9999, %L, %s, 'rules-v1', %s, %L::jsonb
    )$fmt$,
    (SELECT placement_fp FROM convert_opt_evidence LIMIT 1),
    (SELECT system_pack_revision FROM convert_auth_rev LIMIT 1),
    (SELECT cut_count FROM convert_opt_evidence LIMIT 1),
    (SELECT payload::text FROM convert_opt_evidence LIMIT 1)
  ),
  format(
    'stale position revision (expected 9999, actual %s)',
    (SELECT qc_revision FROM convert_pos_rev LIMIT 1)
  ),
  'stale revision rejected when recording evidence'
);

-- 10) Input change invalidates evidence → convert fails
UPDATE public.fabricator_positions_v2
  SET quantity = 2
  WHERE id = '33000000-0000-0000-0000-000000000001';

UPDATE convert_pos_rev SET qc_revision = (
  SELECT qc_revision FROM public.fabricator_positions_v2
  WHERE id = '33000000-0000-0000-0000-000000000001'
);

INSERT INTO convert_order_test_output(result)
SELECT throws_ok(
  format(
    $fmt$SELECT * FROM public.convert_fabricator_pose_quote_to_order(
      '23000000-0000-0000-0000-000000000001',
      '33000000-0000-0000-0000-000000000001',
      %s, 100, 14, 114, 'EGP', 0.14, NULL, '[]'::jsonb, '{"k":1}'::jsonb, NULL
    )$fmt$,
    (SELECT qc_revision FROM convert_pos_rev LIMIT 1)
  ),
  'optimization evidence missing (server validation required)',
  'quantity change invalidates prior evidence'
);

-- Re-record after invalidation for revocation test
UPDATE public.fabricator_positions_v2
  SET quantity = 1
  WHERE id = '33000000-0000-0000-0000-000000000001';

UPDATE convert_pos_rev SET qc_revision = (
  SELECT qc_revision FROM public.fabricator_positions_v2
  WHERE id = '33000000-0000-0000-0000-000000000001'
);

SELECT public.record_fabricator_optimization_evidence(
  '33000000-0000-0000-0000-000000000001',
  (SELECT qc_revision FROM convert_pos_rev LIMIT 1),
  (SELECT qc_revision FROM convert_pos_rev LIMIT 1),
  (SELECT placement_fp FROM convert_opt_evidence LIMIT 1),
  (SELECT system_pack_revision FROM convert_auth_rev LIMIT 1),
  'rules-v1',
  (SELECT cut_count FROM convert_opt_evidence LIMIT 1),
  (SELECT payload FROM convert_opt_evidence LIMIT 1)
);

-- 11) Revoke authority → convert rejects
UPDATE public.fabricator_manufacturing_authority_revisions
   SET revoked_at = now(),
       revocation_reason = 'pgTAP revoke convert gate'
 WHERE approval_id = (
   SELECT authority_approval_id FROM public.fabricator_optimization_evidence
   WHERE position_id = '33000000-0000-0000-0000-000000000001' AND invalidated_at IS NULL
   LIMIT 1
 );

INSERT INTO convert_order_test_output(result)
SELECT throws_ok(
  format(
    $fmt$SELECT * FROM public.convert_fabricator_pose_quote_to_order(
      '23000000-0000-0000-0000-000000000001',
      '33000000-0000-0000-0000-000000000001',
      %s, 100, 14, 114, 'EGP', 0.14, NULL, '[]'::jsonb, '{"k":2}'::jsonb, NULL
    )$fmt$,
    (SELECT qc_revision FROM convert_pos_rev LIMIT 1)
  ),
  'manufacturing authority revoked',
  'revoked authority blocks convert'
);

UPDATE public.fabricator_manufacturing_authority_revisions
   SET revoked_at = NULL, revocation_reason = NULL
 WHERE system_pack_id = 'caluminium-ps';

INSERT INTO convert_order_test_output(result)
SELECT has_function(
  'public',
  'convert_fabricator_pose_quote_to_order',
  ARRAY[
    'uuid','uuid','bigint','numeric','numeric','numeric',
    'text','numeric','numeric','jsonb','jsonb','text'
  ]
);

INSERT INTO convert_order_test_output(result)
SELECT has_function(
  'public',
  'record_fabricator_optimization_evidence',
  ARRAY[
    'uuid','bigint','bigint','text','bigint','text','integer','jsonb'
  ]
);

INSERT INTO convert_order_test_output(result)
SELECT ok(
  to_regclass('public.fabricator_optimization_evidence') IS NOT NULL,
  'fabricator_optimization_evidence table exists'
);

INSERT INTO convert_order_test_output(result) SELECT * FROM finish();
SELECT result FROM convert_order_test_output ORDER BY sequence_no;
ROLLBACK;
