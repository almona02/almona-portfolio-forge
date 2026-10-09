-- #54/#66 rewrite: fail-closed admin gates + vendor catalogue approve (no blanket seed).
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
INSERT INTO admin_approval_test_output(result) SELECT plan(12);

INSERT INTO auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
VALUES
  ('12000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-approver@example.test', '', now(), now()),
  ('12000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'non-admin@example.test', '', now(), now()),
  ('12000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'missing-profile@example.test', '', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles(id, full_name, role)
VALUES
  ('12000000-0000-0000-0000-000000000001', 'Admin Approver', 'admin'),
  ('12000000-0000-0000-0000-000000000002', 'Non Admin', 'customer')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

-- Intentionally no profile for 0003 (missing-profile user)

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

INSERT INTO admin_approval_test_output(result)
SELECT ok(
  (SELECT count(*) = 0 FROM public.fabricator_manufacturing_authority_revisions WHERE provenance = 'seed'),
  'migration does not blanket-seed authority packs'
);

INSERT INTO admin_approval_test_output(result)
SELECT ok(public.is_admin(NULL) IS FALSE, 'is_admin(NULL) is false (fail closed)');

INSERT INTO admin_approval_test_output(result)
SELECT ok(
  public.is_admin('12000000-0000-0000-0000-000000000099') IS FALSE,
  'is_admin(missing uuid) is false (fail closed)'
);

INSERT INTO admin_approval_test_output(result)
SELECT ok(
  public.is_admin('12000000-0000-0000-0000-000000000003') IS FALSE,
  'is_admin(auth user without profile) is false (fail closed)'
);

-- Non-admin rejected
INSERT INTO admin_approval_test_output(result)
SELECT throws_ok(
  $$SELECT * FROM public.admin_list_manufacturing_approval_requests('pending')$$,
  'admin role required',
  'non-admin list rejected'
);

INSERT INTO admin_approval_test_output(result)
SELECT throws_ok(
  $$SELECT public.admin_approve_vendor_catalogue('caluminium-ps')$$,
  'admin role required',
  'non-admin vendor catalogue rejected'
);

-- Missing-profile user rejected (fail closed)
SELECT set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000003', true);
INSERT INTO admin_approval_test_output(result)
SELECT throws_ok(
  $$SELECT public.admin_approve_vendor_catalogue('caluminium-ps')$$,
  'admin role required',
  'missing-profile vendor catalogue rejected'
);

INSERT INTO admin_approval_test_output(result)
SELECT throws_ok(
  $$SELECT * FROM public.admin_list_manufacturing_approval_requests('pending')$$,
  'admin role required',
  'missing-profile list rejected'
);

-- Admin vendor catalogue approve
SELECT set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000001', true);
INSERT INTO admin_approval_test_output(result)
SELECT ok(
  (SELECT public.admin_approve_vendor_catalogue('caluminium-ps') IS NOT NULL),
  'admin can approve vendor catalogue for caluminium-ps'
);

INSERT INTO admin_approval_test_output(result)
SELECT ok(
  (SELECT count(*) = 1 AND min(provenance) = 'vendor'
   FROM public.fabricator_manufacturing_authority_revisions
   WHERE system_pack_id = 'caluminium-ps' AND revoked_at IS NULL),
  'vendor provenance active for caluminium-ps'
);

INSERT INTO admin_approval_test_output(result)
SELECT ok(
  (SELECT count(*) >= 1 FROM public.fabricator_manufacturing_authority_audit
   WHERE system_pack_id = 'caluminium-ps' AND event = 'approve'
     AND details->>'provenance' = 'vendor'),
  'vendor approve writes audit row'
);

-- Revoke then confirm inactive
INSERT INTO admin_approval_test_output(result)
SELECT lives_ok(
  $$SELECT public.admin_revoke_fabricator_manufacturing_authority(
    (SELECT approval_id FROM public.fabricator_manufacturing_authority_revisions
     WHERE system_pack_id = 'caluminium-ps' AND revoked_at IS NULL LIMIT 1),
    'revoke after vendor approve test'
  )$$,
  'admin can revoke vendor authority'
);

INSERT INTO admin_approval_test_output(result) SELECT * FROM finish();
SELECT result FROM admin_approval_test_output ORDER BY sequence_no;
ROLLBACK;
