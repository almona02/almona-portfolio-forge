-- pgTAP: design-ledger reconciliation + kerf/trim accounting for optimization evidence
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
SELECT plan(8);

-- Valid reconciled payload
SELECT lives_ok(
  $$SELECT * FROM public.validate_optimization_evidence_payload(
    '{"schema":"almona.optimization-result","schemaVersion":2,"kerfMm":4,"trimMm":0,"requiredCuts":[{"cutId":"c1","profileId":"PS-FRAME","length":1200,"angle":45},{"cutId":"c2","profileId":"PS-FRAME","length":1400,"angle":45}],"cuttingPlan":[{"stockLength":6000,"profile":{"id":"PS-FRAME"},"cuts":[{"cutId":"c1","length":1200,"angle":45},{"cutId":"c2","length":1400,"angle":45}]}]}'::jsonb,
    2
  )$$,
  'accepts reconciled design ledger + placement'
);

-- Kerf-only overrun (lengths fit, consumption does not)
SELECT throws_ok(
  $$SELECT * FROM public.validate_optimization_evidence_payload(
    '{"schema":"almona.optimization-result","schemaVersion":2,"kerfMm":4,"trimMm":0,"requiredCuts":[{"cutId":"c1","profileId":"PS-FRAME","length":1000,"angle":0},{"cutId":"c2","profileId":"PS-FRAME","length":1000,"angle":0}],"cuttingPlan":[{"stockLength":2000,"profile":{"id":"PS-FRAME"},"cuts":[{"cutId":"c1","length":1000,"angle":0},{"cutId":"c2","length":1000,"angle":0}]}]}'::jsonb,
    2
  )$$,
  'cuttingPlan[0] stock overrun (consumed 2008 mm > stock 2000 mm including kerf/trim)',
  'rejects kerf-only overrun'
);

-- Missing cut
SELECT throws_ok(
  $$SELECT * FROM public.validate_optimization_evidence_payload(
    '{"schema":"almona.optimization-result","schemaVersion":2,"kerfMm":4,"trimMm":0,"requiredCuts":[{"cutId":"c1","profileId":"PS-FRAME","length":1200,"angle":45},{"cutId":"c2","profileId":"PS-FRAME","length":1400,"angle":45}],"cuttingPlan":[{"stockLength":6000,"profile":{"id":"PS-FRAME"},"cuts":[{"cutId":"c1","length":1200,"angle":45}]}]}'::jsonb,
    1
  )$$,
  'design ledger cut count mismatch (required 2, placed 1)',
  'rejects missing design ledger cut'
);

-- Duplicate cut
SELECT throws_ok(
  $$SELECT * FROM public.validate_optimization_evidence_payload(
    '{"schema":"almona.optimization-result","schemaVersion":2,"kerfMm":4,"trimMm":0,"requiredCuts":[{"cutId":"c1","profileId":"PS-FRAME","length":1200,"angle":45}],"cuttingPlan":[{"stockLength":6000,"profile":{"id":"PS-FRAME"},"cuts":[{"cutId":"c1","length":1200,"angle":45},{"cutId":"c1","length":1200,"angle":45}]}]}'::jsonb,
    2
  )$$,
  'design ledger cut count mismatch (required 1, placed 2)',
  'rejects duplicate placed cut'
);

-- Substituted profile
SELECT throws_ok(
  $$SELECT * FROM public.validate_optimization_evidence_payload(
    '{"schema":"almona.optimization-result","schemaVersion":2,"kerfMm":4,"trimMm":0,"requiredCuts":[{"cutId":"c1","profileId":"PS-FRAME","length":1200,"angle":45}],"cuttingPlan":[{"stockLength":6000,"profile":{"id":"PS-SASH"},"cuts":[{"cutId":"c1","length":1200,"angle":45}]}]}'::jsonb,
    1
  )$$,
  'design ledger substituted profile for cut c1',
  'rejects substituted profile'
);

-- Wrongly sized
SELECT throws_ok(
  $$SELECT * FROM public.validate_optimization_evidence_payload(
    '{"schema":"almona.optimization-result","schemaVersion":2,"kerfMm":4,"trimMm":0,"requiredCuts":[{"cutId":"c1","profileId":"PS-FRAME","length":1200,"angle":45}],"cuttingPlan":[{"stockLength":6000,"profile":{"id":"PS-FRAME"},"cuts":[{"cutId":"c1","length":999,"angle":45}]}]}'::jsonb,
    1
  )$$,
  'design ledger wrongly sized cut c1',
  'rejects wrongly sized cut'
);

-- schemaVersion 1 rejected
SELECT throws_ok(
  $$SELECT * FROM public.validate_optimization_evidence_payload(
    '{"schema":"almona.optimization-result","schemaVersion":1,"cuttingPlan":[{"stockLength":6000,"cuts":[{"cutId":"c1","length":1200}]}]}'::jsonb,
    1
  )$$,
  'evidence payload schemaVersion must be >= 2',
  'rejects schemaVersion < 2'
);

-- Incorrect rule version label vs approved content
SELECT ok(
  public.canonical_approved_rule_version(
    '[{"approvalId":"b2000000-0000-4000-8000-000000000020","ruleId":"ps-default","revision":1,"evidenceStatus":"approved"}]'::jsonb
  ) IS DISTINCT FROM 'rules-fixture',
  'approved rule version is content-bound, not a free-form label'
);

SELECT * FROM finish();
ROLLBACK;
