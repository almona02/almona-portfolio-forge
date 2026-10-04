-- FP-028 / P4.5 live authority cases.
-- On Supabase, pgtap installs into the extensions schema.
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
CREATE TEMP TABLE manufacturing_authority_test_output (
  sequence_no INTEGER GENERATED ALWAYS AS IDENTITY,
  result TEXT NOT NULL
) ON COMMIT DROP;
INSERT INTO manufacturing_authority_test_output(result) SELECT plan(6);

INSERT INTO auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
VALUES ('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'authority-owner@example.test', '', now(), now()),
       ('11000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'authority-other@example.test', '', now(), now());
INSERT INTO public.fabricator_projects_v2(id, owner_user_id, project_code, project_name, client_name, system_pack_id)
VALUES ('21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'AUTH-TEST', 'Authority Test', 'Test', 'rock60');
INSERT INTO public.fabricator_positions_v2(id, project_id, owner_user_id, overall_width_mm, overall_height_mm, system_pack_id, qc_revision)
VALUES ('31000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 1210, 1550, 'rock60', 7);

SELECT set_config('request.jwt.claim.sub', '', true);
INSERT INTO manufacturing_authority_test_output(result)
SELECT throws_ok(
  $$SELECT * FROM public.get_fabricator_manufacturing_authority('31000000-0000-0000-0000-000000000001', 7)$$,
  'authentication required', 'unauthenticated access rejected'
);

SELECT set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000002', true);
INSERT INTO manufacturing_authority_test_output(result)
SELECT throws_ok(
  $$SELECT * FROM public.get_fabricator_manufacturing_authority('31000000-0000-0000-0000-000000000001', 7)$$,
  'position not found or not owned by requester', 'cross-owner access rejected'
);

SELECT set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);
INSERT INTO manufacturing_authority_test_output(result)
SELECT throws_ok(
  $$SELECT * FROM public.get_fabricator_manufacturing_authority('31000000-0000-0000-0000-000000000001', 6)$$,
  'position revision changed', 'stale position revision rejected'
);
INSERT INTO manufacturing_authority_test_output(result)
SELECT throws_ok(
  $$SELECT * FROM public.get_fabricator_manufacturing_authority('31000000-0000-0000-0000-000000000001', 7)$$,
  'approved manufacturing authority is unavailable', 'missing authority rejected'
);

INSERT INTO public.fabricator_manufacturing_authority_revisions(
  approval_id, system_pack_id, system_pack_revision, authority_payload, approved_by
)
VALUES (
  '41000000-0000-0000-0000-000000000001', 'rock60', 1,
  '{
    "schema":"almona.manufacturing-authority",
    "schemaVersion":1,
    "system":{"id":"rock60"},
    "systemPack":{"id":"rock60","revision":1,"evidenceStatus":"approved","approvalId":"41000000-0000-0000-0000-000000000001"},
    "profiles":[
      {"role":"frame","profileId":"R60-F","stockLengthMm":6000,"evidenceStatus":"approved","approvalId":"51000000-0000-0000-0000-000000000001"},
      {"role":"sash","profileId":"R60-S","stockLengthMm":6000,"evidenceStatus":"approved","approvalId":"51000000-0000-0000-0000-000000000002"}
    ],
    "cuttingRules":[{"ruleId":"rock60-cut","revision":1,"evidenceStatus":"approved","approvalId":"61000000-0000-0000-0000-000000000001"}],
    "toleranceRule":{"ruleId":"rock60-tolerance","revision":1,"evidenceStatus":"approved","approvalId":"61000000-0000-0000-0000-000000000002"}
  }'::JSONB,
  '11000000-0000-0000-0000-000000000001'
);

INSERT INTO manufacturing_authority_test_output(result)
SELECT is(
  (SELECT authority_approval_id FROM public.get_fabricator_manufacturing_authority('31000000-0000-0000-0000-000000000001', 7)),
  '41000000-0000-0000-0000-000000000001'::UUID,
  'owned current position resolves exact active authority'
);

UPDATE public.fabricator_manufacturing_authority_revisions
SET revoked_at = now(), revocation_reason = 'test revocation'
WHERE approval_id = '41000000-0000-0000-0000-000000000001';
INSERT INTO manufacturing_authority_test_output(result)
SELECT throws_ok(
  $$SELECT * FROM public.get_fabricator_manufacturing_authority('31000000-0000-0000-0000-000000000001', 7)$$,
  'approved manufacturing authority is unavailable', 'revoked authority rejected'
);

INSERT INTO manufacturing_authority_test_output(result) SELECT * FROM finish();
SELECT result FROM manufacturing_authority_test_output ORDER BY sequence_no;
ROLLBACK;
