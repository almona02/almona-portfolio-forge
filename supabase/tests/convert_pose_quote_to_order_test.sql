-- pgTAP: #57 convert_fabricator_pose_quote_to_order fail-closed + happy path
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
INSERT INTO convert_order_test_output(result) SELECT plan(5);

INSERT INTO auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
VALUES
  ('13000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'convert-owner@example.test', '', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles(id, full_name, role)
VALUES ('13000000-0000-0000-0000-000000000001', 'Convert Owner', 'customer')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.fabricator_projects_v2(id, owner_user_id, project_code, project_name, client_name, system_pack_id)
VALUES ('23000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', 'CONV-TEST', 'Convert Test', 'Test', 'caluminium-ps')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.fabricator_positions_v2(
  id, project_id, owner_user_id, overall_width_mm, overall_height_mm, system_pack_id, qc_revision, status, optimization
) VALUES (
  '33000000-0000-0000-0000-000000000001',
  '23000000-0000-0000-0000-000000000001',
  '13000000-0000-0000-0000-000000000001',
  1200, 1500, 'caluminium-ps', 1, 'measuring', NULL
)
ON CONFLICT (id) DO UPDATE
  SET status = 'measuring', optimization = NULL, qc_revision = 1;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"13000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

INSERT INTO convert_order_test_output(result)
SELECT throws_ok(
  $$SELECT * FROM public.convert_fabricator_pose_quote_to_order(
    '23000000-0000-0000-0000-000000000001',
    '33000000-0000-0000-0000-000000000001',
    1, 100, 14, 114, 'EGP', 0.14, NULL, '[]'::jsonb, '{}'::jsonb, NULL
  )$$,
  'optimization not approved on position (durable status required)',
  'convert denied without durable optimized status'
);

UPDATE public.fabricator_positions_v2
  SET status = 'optimized',
      optimization = '{"bars":[{"id":"b1"}],"efficiency":0.9}'::jsonb
  WHERE id = '33000000-0000-0000-0000-000000000001';

INSERT INTO convert_order_test_output(result)
SELECT ok(
  (SELECT order_id IS NOT NULL FROM public.convert_fabricator_pose_quote_to_order(
    '23000000-0000-0000-0000-000000000001',
    '33000000-0000-0000-0000-000000000001',
    1, 100, 14, 114, 'EGP', 0.14, NULL, '[]'::jsonb, '{}'::jsonb, 'notes'
  ) LIMIT 1),
  'convert succeeds when position is optimized'
);

INSERT INTO convert_order_test_output(result)
SELECT ok(
  (SELECT reused FROM public.convert_fabricator_pose_quote_to_order(
    '23000000-0000-0000-0000-000000000001',
    '33000000-0000-0000-0000-000000000001',
    1, 100, 14, 114, 'EGP', 0.14, NULL, '[]'::jsonb, '{}'::jsonb, 'notes'
  ) LIMIT 1),
  'second convert reuses existing order'
);

INSERT INTO convert_order_test_output(result)
SELECT throws_ok(
  $$SELECT * FROM public.convert_fabricator_pose_quote_to_order(
    '23000000-0000-0000-0000-000000000001',
    '33000000-0000-0000-0000-000000000001',
    1, 100, 14, 200, 'EGP', 0.14, NULL, '[]'::jsonb, '{}'::jsonb, NULL
  )$$,
  'quote totals inconsistent (subtotal + tax ≠ total)',
  'inconsistent money rejected'
);

INSERT INTO convert_order_test_output(result)
SELECT has_function(
  'public',
  'convert_fabricator_pose_quote_to_order',
  ARRAY[
    'uuid','uuid','bigint','numeric','numeric','numeric',
    'text','numeric','numeric','jsonb','jsonb','text'
  ]
);

INSERT INTO convert_order_test_output(result) SELECT * FROM finish();
SELECT result FROM convert_order_test_output ORDER BY sequence_no;
ROLLBACK;
