-- pgTAP: hardener admin verification / override / revoke / fail-closed / #68 gates
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
CREATE TEMP TABLE hardener_test_output (
  sequence_no INTEGER GENERATED ALWAYS AS IDENTITY,
  result TEXT NOT NULL
) ON COMMIT DROP;
INSERT INTO hardener_test_output(result) SELECT plan(22);

INSERT INTO auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
VALUES
  ('14000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'hardener-owner@example.test', '', now(), now()),
  ('14000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'hardener-user@example.test', '', now(), now()),
  ('14000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'hardener-admin@example.test', '', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles(id, full_name, role)
VALUES
  ('14000000-0000-0000-0000-000000000001', 'Hardener Owner', 'customer'),
  ('14000000-0000-0000-0000-000000000002', 'Hardener User', 'customer'),
  ('14000000-0000-0000-0000-000000000099', 'Hardener Admin', 'admin')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.fabricator_projects_v2(id, owner_user_id, project_code, project_name, client_name, system_pack_id)
VALUES ('24000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', 'HARD-TEST', 'Hardener Test', 'Test', 'caluminium-ps')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.fabricator_positions_v2(
  id, project_id, owner_user_id, overall_width_mm, overall_height_mm, system_pack_id,
  qc_revision, status, quantity, type
) VALUES (
  '34000000-0000-0000-0000-000000000001',
  '24000000-0000-0000-0000-000000000001',
  '14000000-0000-0000-0000-000000000001',
  1200, 1500, 'caluminium-ps', 1, 'design', 1, 'sliding_window_2sash'
)
ON CONFLICT (id) DO UPDATE
  SET qc_revision = 1, status = 'design', quantity = 1, type = 'sliding_window_2sash',
      system_pack_id = 'caluminium-ps', overall_width_mm = 1200, overall_height_mm = 1500;

-- N/A pack position
INSERT INTO public.fabricator_positions_v2(
  id, project_id, owner_user_id, overall_width_mm, overall_height_mm, system_pack_id,
  qc_revision, status, quantity, type
) VALUES (
  '34000000-0000-0000-0000-000000000099',
  '24000000-0000-0000-0000-000000000001',
  '14000000-0000-0000-0000-000000000001',
  800, 900, 'sandbox-no-hardener', 1, 'design', 1, 'fixed_window'
)
ON CONFLICT (id) DO UPDATE
  SET system_pack_id = 'sandbox-no-hardener', qc_revision = 1;

CREATE TEMP TABLE hardener_ids (
  proposal_id UUID,
  override_id UUID
) ON COMMIT DROP;

CREATE OR REPLACE FUNCTION pg_temp.full_checks(p_fail TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql
AS $$
  SELECT jsonb_build_array(
    jsonb_build_object('check', 'system_profile', 'passed', true),
    jsonb_build_object('check', 'material', 'passed', CASE WHEN p_fail = 'material' THEN false ELSE true END),
    jsonb_build_object('check', 'glass_thickness', 'passed', true),
    jsonb_build_object('check', 'sash_dimensions', 'passed', true),
    jsonb_build_object('check', 'sash_weight', 'passed', CASE WHEN p_fail = 'sash_weight' THEN false ELSE true END),
    jsonb_build_object('check', 'opening_type', 'passed', true)
  );
$$;

-- Owner proposes with full named checks + engineering evidence
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"14000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

INSERT INTO hardener_ids(proposal_id)
SELECT public.request_fabricator_hardener_verification(
  '34000000-0000-0000-0000-000000000001',
  (SELECT qc_revision FROM public.fabricator_positions_v2 WHERE id = '34000000-0000-0000-0000-000000000001'),
  'H-PS-SLIDE-01',
  '{"method":"catalogue","reference":"PS-6600-H1","calc":"ok"}'::jsonb,
  pg_temp.full_checks(),
  '{}',
  'sliding', 'aluminum', 6, 600, 1400, 28
);

INSERT INTO hardener_test_output(result)
SELECT ok(
  (SELECT proposal_id IS NOT NULL FROM hardener_ids LIMIT 1),
  'owner can propose hardener verification'
);

-- Empty checks rejected
INSERT INTO hardener_test_output(result)
SELECT throws_ok(
  $fmt$SELECT public.request_fabricator_hardener_verification(
    '34000000-0000-0000-0000-000000000001',
    (SELECT qc_revision FROM public.fabricator_positions_v2 WHERE id = '34000000-0000-0000-0000-000000000001'),
    'H-PS-EMPTY',
    '{"method":"catalogue","reference":"x"}'::jsonb,
    '[]'::jsonb,
    '{}',
    'sliding', 'aluminum', 6, 600, 1400, 28
  )$fmt$,
  'compatibility checks required (empty rejected)',
  'empty compatibility checks rejected'
);

-- Fabricated passed flag without sash weight dimension rejected
INSERT INTO hardener_test_output(result)
SELECT throws_ok(
  $fmt$SELECT public.request_fabricator_hardener_verification(
    '34000000-0000-0000-0000-000000000001',
    (SELECT qc_revision FROM public.fabricator_positions_v2 WHERE id = '34000000-0000-0000-0000-000000000001'),
    'H-PS-FAB',
    '{"method":"catalogue","reference":"x"}'::jsonb,
    pg_temp.full_checks(),
    '{}',
    'sliding', 'aluminum', 6, 600, 1400, NULL
  )$fmt$,
  'fabricated passed flag for sash_weight without dimension',
  'fabricated sash_weight passed flag rejected'
);

-- Unsupported hardener code rejected
INSERT INTO hardener_test_output(result)
SELECT throws_ok(
  $fmt$SELECT public.request_fabricator_hardener_verification(
    '34000000-0000-0000-0000-000000000001',
    (SELECT qc_revision FROM public.fabricator_positions_v2 WHERE id = '34000000-0000-0000-0000-000000000001'),
    'BADCODE',
    '{"method":"catalogue","reference":"x"}'::jsonb,
    pg_temp.full_checks(),
    '{}',
    'sliding', 'aluminum', 6, 600, 1400, 28
  )$fmt$,
  'unsupported hardener/profile mapping for code BADCODE',
  'unsupported hardener code rejected'
);

-- Versioned applicability (not name-based %-no-hardener)
INSERT INTO hardener_test_output(result)
SELECT ok(
  public.system_pack_requires_hardener('sandbox-no-hardener') IS FALSE,
  'versioned applicability metadata exempts sandbox estimate pack'
);

INSERT INTO hardener_test_output(result)
SELECT ok(
  public.system_pack_requires_hardener('evil-no-hardener') IS TRUE,
  'name-based %-no-hardener loophole is closed'
);

-- N/A pack clears manufacturing without proposal
INSERT INTO hardener_test_output(result)
SELECT ok(
  (SELECT manufacturing_cleared AND status = 'not_applicable'
   FROM public.get_fabricator_hardener_authority(
     '34000000-0000-0000-0000-000000000099', 1
   ) LIMIT 1),
  'packs that do not require hardeners clear manufacturing'
);

-- Pending proposal blocks manufacturing authority
INSERT INTO hardener_test_output(result)
SELECT throws_ok(
  format(
    $fmt$SELECT * FROM public.get_fabricator_hardener_authority(
      '34000000-0000-0000-0000-000000000001',
      %s
    )$fmt$,
    (SELECT qc_revision FROM public.fabricator_positions_v2 WHERE id = '34000000-0000-0000-0000-000000000001')
  ),
  'hardener proposal not approved (pending/rejected/stale/revoked block manufacturing)',
  'pending proposal blocks manufacturing'
);

-- 1) Normal user denied admin review
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"14000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

INSERT INTO hardener_test_output(result)
SELECT throws_ok(
  format(
    $fmt$SELECT public.admin_review_fabricator_hardener('%s', 'approve', 'nope')$fmt$,
    (SELECT proposal_id FROM hardener_ids LIMIT 1)
  ),
  'admin role required',
  'non-admin review denied'
);

-- Missing-profile / non-admin override denied
INSERT INTO hardener_test_output(result)
SELECT throws_ok(
  format(
    $fmt$SELECT public.admin_override_fabricator_hardener(
      '%s', 'H-OVERRIDE', 'override without admin rights', '{}'::jsonb, 'position'
    )$fmt$,
    (SELECT proposal_id FROM hardener_ids LIMIT 1)
  ),
  'admin role required',
  'non-admin override denied'
);

-- Admin approves clean proposal
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"14000000-0000-0000-0000-000000000099","role":"authenticated"}',
  true
);

INSERT INTO hardener_test_output(result)
SELECT lives_ok(
  format(
    $fmt$SELECT public.admin_review_fabricator_hardener('%s', 'approve', 'checks pass')$fmt$,
    (SELECT proposal_id FROM hardener_ids LIMIT 1)
  ),
  'admin can approve hardener proposal'
);

-- Owner sees manufacturing cleared
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"14000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

INSERT INTO hardener_test_output(result)
SELECT ok(
  (SELECT manufacturing_cleared FROM public.get_fabricator_hardener_authority(
    '34000000-0000-0000-0000-000000000001',
    (SELECT qc_revision FROM public.fabricator_positions_v2 WHERE id = '34000000-0000-0000-0000-000000000001')
  ) LIMIT 1),
  'approved hardener clears manufacturing stop'
);

-- Design change → stale + manufacturing stop
UPDATE public.fabricator_positions_v2
  SET overall_width_mm = 1300
  WHERE id = '34000000-0000-0000-0000-000000000001';

INSERT INTO hardener_test_output(result)
SELECT throws_ok(
  format(
    $fmt$SELECT * FROM public.get_fabricator_hardener_authority(
      '34000000-0000-0000-0000-000000000001',
      %s
    )$fmt$,
    (SELECT qc_revision FROM public.fabricator_positions_v2 WHERE id = '34000000-0000-0000-0000-000000000001')
  ),
  'hardener proposal not approved (pending/rejected/stale/revoked block manufacturing)',
  'stale approval after design change blocks manufacturing'
);

-- New proposal with failed checks → reject path + override
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"14000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

UPDATE hardener_ids SET proposal_id = public.request_fabricator_hardener_verification(
  '34000000-0000-0000-0000-000000000001',
  (SELECT qc_revision FROM public.fabricator_positions_v2 WHERE id = '34000000-0000-0000-0000-000000000001'),
  'H-PS-FAIL',
  '{"method":"catalogue","reference":"partial","calc":"partial"}'::jsonb,
  pg_temp.full_checks('material'),
  ARRAY['glass_thickness'],
  'sliding', 'upvc', 6, 600, 1400, 28
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"14000000-0000-0000-0000-000000000099","role":"authenticated"}',
  true
);

INSERT INTO hardener_test_output(result)
SELECT throws_ok(
  format(
    $fmt$SELECT public.admin_review_fabricator_hardener('%s', 'approve', 'should fail')$fmt$,
    (SELECT proposal_id FROM hardener_ids LIMIT 1)
  ),
  'cannot approve: 1 failed checks and missing evidence present',
  'admin cannot approve when checks fail and evidence missing'
);

INSERT INTO hardener_test_output(result)
SELECT lives_ok(
  format(
    $fmt$SELECT public.admin_review_fabricator_hardener('%s', 'reject', 'failed material check')$fmt$,
    (SELECT proposal_id FROM hardener_ids LIMIT 1)
  ),
  'admin can reject hardener proposal'
);

-- Rejected proposal blocks manufacturing
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"14000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

INSERT INTO hardener_test_output(result)
SELECT throws_ok(
  format(
    $fmt$SELECT * FROM public.get_fabricator_hardener_authority(
      '34000000-0000-0000-0000-000000000001',
      %s
    )$fmt$,
    (SELECT qc_revision FROM public.fabricator_positions_v2 WHERE id = '34000000-0000-0000-0000-000000000001')
  ),
  'hardener proposal not approved (pending/rejected/stale/revoked block manufacturing)',
  'rejected proposal blocks manufacturing'
);

-- Fresh proposal for override
UPDATE hardener_ids SET proposal_id = public.request_fabricator_hardener_verification(
  '34000000-0000-0000-0000-000000000001',
  (SELECT qc_revision FROM public.fabricator_positions_v2 WHERE id = '34000000-0000-0000-0000-000000000001'),
  'H-PS-OVERRIDE',
  '{"method":"shop","reference":"ST-9","calc":"override-candidate"}'::jsonb,
  pg_temp.full_checks('sash_weight'),
  ARRAY['sash_weight'],
  'sliding', 'aluminum', 6, 600, 1400, 28
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"14000000-0000-0000-0000-000000000099","role":"authenticated"}',
  true
);

-- Empty evidence override denied (admin still needs evidence object)
INSERT INTO hardener_test_output(result)
SELECT throws_ok(
  format(
    $fmt$SELECT public.admin_override_fabricator_hardener(
      '%s', 'H-PS-OVERRIDE', 'Workshop measured sash weight confirms catalogue exception', '{}'::jsonb, 'position'
    )$fmt$,
    (SELECT proposal_id FROM hardener_ids LIMIT 1)
  ),
  'override supporting evidence incomplete',
  'admin override without evidence denied'
);

-- Missing profile (delete admin profile temporarily) denied
DELETE FROM public.profiles WHERE id = '14000000-0000-0000-0000-000000000099';
INSERT INTO hardener_test_output(result)
SELECT throws_ok(
  format(
    $fmt$SELECT public.admin_override_fabricator_hardener(
      '%s', 'H-PS-OVERRIDE', 'Workshop measured sash weight confirms catalogue exception',
      '{"shopTicket":"ST-9","photoRef":"ev-1"}'::jsonb, 'position'
    )$fmt$,
    (SELECT proposal_id FROM hardener_ids LIMIT 1)
  ),
  'admin role required',
  'missing admin profile denies override'
);
INSERT INTO public.profiles(id, full_name, role)
VALUES ('14000000-0000-0000-0000-000000000099', 'Hardener Admin', 'admin')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

UPDATE hardener_ids SET override_id = public.admin_override_fabricator_hardener(
  (SELECT proposal_id FROM hardener_ids LIMIT 1),
  'H-PS-OVERRIDE',
  'Workshop measured sash weight confirms catalogue exception',
  '{"shopTicket":"ST-9","photoRef":"ev-1"}'::jsonb,
  'position'
);

INSERT INTO hardener_test_output(result)
SELECT ok(
  (SELECT override_id IS NOT NULL FROM hardener_ids LIMIT 1),
  'admin scoped override recorded'
);

-- Position-scoped override clears only this position
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"14000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

INSERT INTO hardener_test_output(result)
SELECT ok(
  (SELECT manufacturing_cleared FROM public.get_fabricator_hardener_authority(
    '34000000-0000-0000-0000-000000000001',
    (SELECT qc_revision FROM public.fabricator_positions_v2 WHERE id = '34000000-0000-0000-0000-000000000001')
  ) LIMIT 1),
  'position-scoped override clears recorded position'
);

-- Revoke
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"14000000-0000-0000-0000-000000000099","role":"authenticated"}',
  true
);

INSERT INTO hardener_test_output(result)
SELECT lives_ok(
  format(
    $fmt$SELECT public.admin_revoke_fabricator_hardener('%s', 'revoke after audit')$fmt$,
    (SELECT proposal_id FROM hardener_ids LIMIT 1)
  ),
  'admin can revoke hardener approval/override'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"14000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

INSERT INTO hardener_test_output(result)
SELECT throws_ok(
  format(
    $fmt$SELECT * FROM public.get_fabricator_hardener_authority(
      '34000000-0000-0000-0000-000000000001',
      %s
    )$fmt$,
    (SELECT qc_revision FROM public.fabricator_positions_v2 WHERE id = '34000000-0000-0000-0000-000000000001')
  ),
  'hardener proposal not approved (pending/rejected/stale/revoked block manufacturing)',
  'revocation restores manufacturing stop'
);

INSERT INTO hardener_test_output(result) SELECT * FROM finish();
SELECT result FROM hardener_test_output ORDER BY sequence_no;
ROLLBACK;
