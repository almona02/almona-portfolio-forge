CREATE EXTENSION IF NOT EXISTS pgtap;

-- Supabase SQL Editor can reuse a pooled backend whose pgTAP temp plan survived
-- a prior run. Reset only pgTAP's session-local harness objects before planning.
DO $reset_pgtap$
BEGIN
  IF to_regclass('pg_temp.__tcache__') IS NOT NULL THEN
    EXECUTE 'DROP TABLE pg_temp.__tcache__';
  END IF;
  IF to_regclass('pg_temp.__tresults__') IS NOT NULL THEN
    EXECUTE 'DROP TABLE pg_temp.__tresults__';
  END IF;
  IF to_regclass('pg_temp.__tcache___numb_seq') IS NOT NULL THEN
    EXECUTE 'DROP SEQUENCE pg_temp.__tcache___numb_seq';
  END IF;
  IF to_regclass('pg_temp.__tresults___numb_seq') IS NOT NULL THEN
    EXECUTE 'DROP SEQUENCE pg_temp.__tresults___numb_seq';
  END IF;
END;
$reset_pgtap$;

BEGIN;
CREATE TEMP TABLE qc_test_output (
  sequence_no integer GENERATED ALWAYS AS IDENTITY,
  result text NOT NULL
) ON COMMIT DROP;

INSERT INTO qc_test_output(result) SELECT plan(9);

INSERT INTO auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'qc-owner@example.test', '', now(), now()),
       ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'qc-other@example.test', '', now(), now());
INSERT INTO public.fabricator_projects_v2(id, owner_user_id, project_code, project_name, client_name, system_pack_id)
VALUES ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'QC-TEST', 'QC Test', 'Test', 'rock60');
INSERT INTO public.fabricator_positions_v2(id, project_id, owner_user_id, overall_width_mm, overall_height_mm, system_pack_id, qc_revision)
VALUES ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1210, 1550, 'rock60', 4),
       ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1210, 1550, 'rock60', 4);
INSERT INTO public.fabricator_qc_tolerance_rules(system_pack_id, dimensional_tolerance_mm, approved, approved_by, approved_at)
VALUES ('rock60', 2, true, '10000000-0000-0000-0000-000000000001', now());

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
INSERT INTO qc_test_output(result) SELECT throws_ok($$SELECT * FROM public.approve_fabricator_quality_control('30000000-0000-0000-0000-000000000001',4,'{"checks":{"measurements":true,"design":true,"model":true,"optimization":true,"materials":true,"commands":true,"documents":true},"measurements":{"width":{},"height":{"actualMm":1550}},"notes":"ok evidence"}','40000000-0000-0000-0000-000000000001')$$, 'finite dimensional measurements are required', 'missing measurement rejected');
INSERT INTO qc_test_output(result) SELECT throws_ok($$SELECT * FROM public.approve_fabricator_quality_control('30000000-0000-0000-0000-000000000001',4,'{"checks":{"measurements":true,"design":true,"model":true,"optimization":true,"materials":true,"commands":true,"documents":true},"measurements":{"width":{"actualMm":"NaN"},"height":{"actualMm":1550}},"notes":"ok evidence"}','40000000-0000-0000-0000-000000000002')$$, 'finite dimensional measurements are required', 'non-finite measurement rejected');
INSERT INTO qc_test_output(result) SELECT throws_ok($$SELECT * FROM public.approve_fabricator_quality_control('30000000-0000-0000-0000-000000000001',4,'{"checks":{"measurements":true,"design":true,"model":true,"optimization":true,"materials":true,"commands":true,"documents":true},"measurements":{"width":{"actualMm":1210,"targetMm":1210},"height":{"actualMm":1550}},"notes":"ok evidence"}','40000000-0000-0000-0000-000000000003')$$, 'targets and tolerances must not be supplied by the client', 'caller target rejected');
INSERT INTO qc_test_output(result) SELECT throws_ok($$SELECT * FROM public.approve_fabricator_quality_control('30000000-0000-0000-0000-000000000001',3,'{"checks":{},"measurements":{},"notes":"bad"}','40000000-0000-0000-0000-000000000004')$$, 'position revision changed', 'stale revision rejected');

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
INSERT INTO qc_test_output(result) SELECT throws_ok($$SELECT * FROM public.approve_fabricator_quality_control('30000000-0000-0000-0000-000000000001',4,'{"checks":{},"measurements":{},"notes":"bad"}','40000000-0000-0000-0000-000000000005')$$, 'position not found or not owned by inspector', 'unauthorized user rejected');

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
INSERT INTO qc_test_output(result) SELECT lives_ok($$SELECT * FROM public.approve_fabricator_quality_control('30000000-0000-0000-0000-000000000001',4,'{"checks":{"measurements":true,"design":true,"model":true,"optimization":true,"materials":true,"commands":true,"documents":true},"measurements":{"width":{"actualMm":1210},"height":{"actualMm":1551}},"notes":"dimensions verified"}','40000000-0000-0000-0000-000000000006')$$, 'valid approval succeeds');
INSERT INTO qc_test_output(result) SELECT lives_ok($$SELECT * FROM public.approve_fabricator_quality_control('30000000-0000-0000-0000-000000000001',4,'{"checks":{"measurements":true,"design":true,"model":true,"optimization":true,"materials":true,"commands":true,"documents":true},"measurements":{"width":{"actualMm":1210},"height":{"actualMm":1551}},"notes":"dimensions verified"}','40000000-0000-0000-0000-000000000006')$$, 'identical retry succeeds');
INSERT INTO qc_test_output(result) SELECT is((SELECT count(*) FROM public.fabricator_quality_approvals WHERE position_id = '30000000-0000-0000-0000-000000000001'), 1::BIGINT, 'identical retry creates one approval record');
INSERT INTO qc_test_output(result) SELECT throws_ok($$SELECT * FROM public.approve_fabricator_quality_control('30000000-0000-0000-0000-000000000002',4,'{"checks":{"measurements":true,"design":true,"model":true,"optimization":true,"materials":true,"commands":true,"documents":true},"measurements":{"width":{"actualMm":1210},"height":{"actualMm":1551}},"notes":"dimensions verified"}','40000000-0000-0000-0000-000000000006')$$, 'idempotency key was reused for a different approval request', 'mismatched retry key rejected');

INSERT INTO qc_test_output(result) SELECT * FROM finish();
SELECT result FROM qc_test_output ORDER BY sequence_no;
ROLLBACK;
