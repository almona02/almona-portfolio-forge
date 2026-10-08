-- #54 rewrite: admin approve/reject wrappers reject non-admins; is_admin fail-closed.
-- Asserts no blanket seed authority rows from the admin-workflow migration.
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
CREATE TEMP TABLE admin_approval_test_output (
  sequence_no INTEGER GENERATED ALWAYS AS IDENTITY,
  result TEXT NOT NULL
) ON COMMIT DROP;
INSERT INTO admin_approval_test_output(result) SELECT plan(8);

INSERT INTO auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
VALUES
  ('12000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-approver@example.test', '', now(), now()),
  ('12000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'non-admin@example.test', '', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles(id, full_name, role)
VALUES
  ('12000000-0000-0000-0000-000000000001', 'Admin Approver', 'admin'),
  ('12000000-0000-0000-0000-000000000002', 'Non Admin', 'customer')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.fabricator_projects_v2(id, owner_user_id, project_code, project_name, client_name, system_pack_id)
VALUES ('22000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000002', 'ADM-TEST', 'Admin Approval Test', 'Test', 'caluminium-ps')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fabricator_positions_v2(id, project_id, owner_user_id, overall_width_mm, overall_height_mm, system_pack_id, qc_revision)
VALUES ('32000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000002', 1200, 1500, 'caluminium-ps', 1)
ON CONFLICT (id) DO NOTHING;

SELECT set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000002', true);
INSERT INTO public.fabricator_manufacturing_approval_requests(
  id, owner_user_id, position_id, position_revision, system_pack_id, catalogue_reference, rule_reference, notes, status
) VALUES (
  '42000000-0000-0000-0000-000000000001',
  '12000000-0000-0000-0000-000000000002',
  '32000000-0000-0000-0000-000000000001',
  1, 'caluminium-ps', 'cat-ref-doc', 'rule-ref-doc', 'test', 'pending'
);

-- No blanket seed from admin-workflow migration
INSERT INTO admin_approval_test_output(result)
SELECT ok(
  (SELECT count(*) = 0 FROM public.fabricator_manufacturing_authority_revisions WHERE provenance = 'seed'),
  'migration does not blanket-seed authority packs'
);

-- is_admin fail-closed: null user and missing profile never yield NULL
INSERT INTO admin_approval_test_output(result)
SELECT ok(public.is_admin(NULL) IS FALSE, 'is_admin(NULL) is false (fail closed)');

INSERT INTO admin_approval_test_output(result)
SELECT ok(
  public.is_admin('12000000-0000-0000-0000-000000000099') IS FALSE,
  'is_admin(missing profile) is false (fail closed)'
);

INSERT INTO admin_approval_test_output(result)
SELECT ok(
  (public.is_admin('12000000-0000-0000-0000-000000000002') IS DISTINCT FROM TRUE),
  'non-admin is_admin IS DISTINCT FROM TRUE'
);

-- Non-admin cannot list
INSERT INTO admin_approval_test_output(result)
SELECT throws_ok(
  $$SELECT * FROM public.admin_list_manufacturing_approval_requests('pending')$$,
  'admin role required',
  'non-admin list rejected'
);

-- Non-admin cannot reject
INSERT INTO admin_approval_test_output(result)
SELECT throws_ok(
  $$SELECT public.admin_reject_fabricator_manufacturing_approval('42000000-0000-0000-0000-000000000001', 'nope not allowed')$$,
  'admin role required',
  'non-admin reject rejected'
);

-- Non-admin cannot approve
INSERT INTO admin_approval_test_output(result)
SELECT throws_ok(
  $$SELECT public.admin_approve_fabricator_manufacturing_approval(
    '42000000-0000-0000-0000-000000000001',
    '{"schema":"almona.manufacturing-authority","schemaVersion":1,"system":{"id":"caluminium-ps"},"systemPack":{"id":"caluminium-ps","revision":1,"evidenceStatus":"approved","approvalId":"42000000-0000-0000-0000-000000000099"},"profiles":[{"role":"frame","profileId":"PS-6601-FRAME","stockLengthMm":6000,"evidenceStatus":"approved","approvalId":"51000000-0000-0000-0000-000000000001"},{"role":"sash","profileId":"PS-5600-SASH","stockLengthMm":6000,"evidenceStatus":"approved","approvalId":"51000000-0000-0000-0000-000000000002"}],"cuttingRules":[{"ruleId":"caluminium-ps-cut","revision":1,"evidenceStatus":"approved","approvalId":"61000000-0000-0000-0000-000000000001"}],"toleranceRule":{"ruleId":"caluminium-ps-tolerance","revision":1,"evidenceStatus":"approved","approvalId":"61000000-0000-0000-0000-000000000002"}}'::jsonb
  )$$,
  'admin role required',
  'non-admin approve rejected'
);

-- Admin can list
SELECT set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000001', true);
INSERT INTO admin_approval_test_output(result)
SELECT ok(
  (SELECT count(*) >= 1 FROM public.admin_list_manufacturing_approval_requests('pending')),
  'admin can list pending requests'
);

INSERT INTO admin_approval_test_output(result) SELECT * FROM finish();
SELECT result FROM admin_approval_test_output ORDER BY sequence_no;
ROLLBACK;
