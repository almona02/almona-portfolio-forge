-- OPTIONAL local/E2E only — not a migration. Do NOT apply to production.
-- Inserts a single revocable caluminium-ps authority row when missing.
-- Never clears revoked_at (revoked rows stay revoked; reapproval = new revision).
--
-- Usage (local Supabase running):
--   psql "$DATABASE_URL" -f scripts/e2e-seed-manufacturing-authority-local.sql
-- or: npx supabase db execute --file scripts/e2e-seed-manufacturing-authority-local.sql

BEGIN;

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
VALUES (
  'a1000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'seed-manufacturing-authority@almona.local',
  '',
  now(), now(), now(),
  '{"provider":"seed","providers":["seed"]}'::JSONB,
  '{"seed":true}'::JSONB
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.fabricator_manufacturing_authority_revisions(
  approval_id, system_pack_id, system_pack_revision, authority_payload,
  approved_by, provenance
)
SELECT
  'd1000000-0000-4000-8000-000000000001'::UUID,
  'caluminium-ps',
  1,
  jsonb_build_object(
    'schema', 'almona.manufacturing-authority',
    'schemaVersion', 1,
    'system', jsonb_build_object('id', 'caluminium-ps'),
    'systemPack', jsonb_build_object(
      'id', 'caluminium-ps',
      'revision', 1,
      'evidenceStatus', 'approved',
      'approvalId', 'd1000000-0000-4000-8000-000000000001'
    ),
    'profiles', jsonb_build_array(
      jsonb_build_object(
        'role', 'frame',
        'profileId', 'PS-6601-FRAME',
        'stockLengthMm', 6000,
        'evidenceStatus', 'approved',
        'approvalId', 'b1000000-0000-4000-8000-000000000001'
      ),
      jsonb_build_object(
        'role', 'sash',
        'profileId', 'PS-5600-SASH',
        'stockLengthMm', 6000,
        'evidenceStatus', 'approved',
        'approvalId', 'b1000000-0000-4000-8000-000000000002'
      )
    ),
    'cuttingRules', jsonb_build_array(
      jsonb_build_object(
        'ruleId', 'caluminium-ps-cut',
        'revision', 1,
        'evidenceStatus', 'approved',
        'approvalId', 'c1000000-0000-4000-8000-000000000001',
        'deductions', jsonb_build_object('endDeductionMm', 20),
        'allowances', jsonb_build_object('weldMm', 3),
        'applicability', jsonb_build_object('materials', jsonb_build_array('aluminum'))
      )
    ),
    'toleranceRule', jsonb_build_object(
      'ruleId', 'caluminium-ps-tolerance',
      'revision', 1,
      'evidenceStatus', 'approved',
      'approvalId', 'c1000000-0000-4000-8000-000000000002'
    ),
    'manufacturingSettings', jsonb_build_object('sawKerfMm', 4, 'trimCutMm', 0)
  ),
  'a1000000-0000-4000-8000-000000000001'::UUID,
  'seed'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.fabricator_manufacturing_authority_revisions
  WHERE system_pack_id = 'caluminium-ps'
    AND system_pack_revision = 1
);

INSERT INTO public.fabricator_qc_tolerance_rules(
  system_pack_id, dimensional_tolerance_mm, approved, approved_by, approved_at
)
VALUES ('caluminium-ps', 1.5, TRUE, 'a1000000-0000-4000-8000-000000000001'::UUID, now())
ON CONFLICT (system_pack_id) DO NOTHING;

COMMIT;
