-- pgTAP: authoritative binding — settings, stock, rule-content fingerprint
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
SELECT plan(7);

SELECT throws_ok(
  $$SELECT * FROM public.authority_machining_settings('{"schema":"almona.manufacturing-authority"}'::jsonb)$$,
  'authority manufacturingSettings.sawKerfMm/trimCutMm required',
  'rejects authority without manufacturingSettings'
);

SELECT is(
  (SELECT saw_kerf_mm FROM public.authority_machining_settings(
    '{"manufacturingSettings":{"sawKerfMm":4,"trimCutMm":0}}'::jsonb
  )),
  4::numeric,
  'reads approved kerf from manufacturingSettings'
);

SELECT ok(
  public.authority_permitted_stock_lengths(
    '{"profiles":[{"profileId":"A","stockLengthMm":6000,"evidenceStatus":"approved"},{"profileId":"B","stockLengthMm":6500,"evidenceStatus":"approved"}]}'::jsonb
  ) @> ARRAY[6000::numeric, 6500::numeric],
  'collects permitted catalogue stock lengths'
);

SELECT throws_ok(
  $$SELECT public.assert_evidence_against_authority(
    '{"kerfMm":0,"trimMm":0,"cuttingPlan":[{"stockLength":6000,"profile":{"id":"PS-FRAME"},"cuts":[{"cutId":"c1","length":100}]}]}'::jsonb,
    '{"manufacturingSettings":{"sawKerfMm":4,"trimCutMm":0},"profiles":[{"profileId":"PS-FRAME","stockLengthMm":6000,"evidenceStatus":"approved"}]}'::jsonb
  )$$,
  'kerfMm does not match approved manufacturing settings',
  'rejects zero-kerf tampering'
);

SELECT throws_ok(
  $$SELECT public.assert_evidence_against_authority(
    '{"kerfMm":4,"trimMm":0,"cuttingPlan":[{"stockLength":9999,"profile":{"id":"PS-FRAME"},"cuts":[{"cutId":"c1","length":100}]}]}'::jsonb,
    '{"manufacturingSettings":{"sawKerfMm":4,"trimCutMm":0},"profiles":[{"profileId":"PS-FRAME","stockLengthMm":6000,"evidenceStatus":"approved"}]}'::jsonb
  )$$,
  'cuttingPlan[0] stock length is not in approved catalogue',
  'rejects invented stock length'
);

-- Content fingerprint changes when deductions change under same ruleId/revision
SELECT ok(
  public.approved_rule_content_fingerprint(
    '[{"approvalId":"a","ruleId":"cut","revision":1,"evidenceStatus":"approved","deductions":{"endDeductionMm":20},"allowances":null,"applicability":null}]'::jsonb
  ) IS DISTINCT FROM public.approved_rule_content_fingerprint(
    '[{"approvalId":"a","ruleId":"cut","revision":1,"evidenceStatus":"approved","deductions":{"endDeductionMm":99},"allowances":null,"applicability":null}]'::jsonb
  ),
  'rule content fingerprint changes when deductions change'
);

SELECT ok(
  length(public.approved_rule_content_fingerprint(
    '[{"approvalId":"a","ruleId":"cut","revision":1,"evidenceStatus":"approved","deductions":{"endDeductionMm":20}}]'::jsonb
  )) = 64,
  'rule content fingerprint is sha256 hex'
);

SELECT * FROM finish();
ROLLBACK;
