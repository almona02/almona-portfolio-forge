-- pgTAP: canonical_jsonb_serialize contract (parity with TS golden vectors)
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
SELECT plan(12);

SELECT is(public.canonical_jsonb_serialize('null'::jsonb), 'null', 'null');
SELECT is(public.canonical_jsonb_serialize('true'::jsonb), 'true', 'true');
SELECT is(public.canonical_jsonb_serialize('false'::jsonb), 'false', 'false');
SELECT is(public.canonical_jsonb_serialize('4'::jsonb), '4', 'int');
SELECT is(public.canonical_jsonb_serialize('0'::jsonb), '0', 'zero');
SELECT is(public.canonical_jsonb_serialize('1.5'::jsonb), '1.5', 'decimal');
SELECT is(public.canonical_jsonb_serialize('{}'::jsonb), '{}', 'empty object');
SELECT is(public.canonical_jsonb_serialize('[]'::jsonb), '[]', 'empty array');

SELECT is(
  public.canonical_jsonb_serialize('{"trimCutMm":0,"sawKerfMm":4}'::jsonb),
  '{"sawKerfMm": 4, "trimCutMm": 0}',
  'key order independent'
);

SELECT is(
  public.canonical_jsonb_serialize(
    '{"materials":["aluminum","ألومنيوم"],"note":"café","nested":{"z":1,"a":null}}'::jsonb
  ),
  '{"materials": ["aluminum", "ألومنيوم"], "nested": {"a": null, "z": 1}, "note": "café"}',
  'nested + unicode'
);

SELECT is(
  public.canonical_jsonb_serialize('[{"b":2,"a":1},{"a":3}]'::jsonb),
  '[{"a": 1, "b": 2}, {"a": 3}]',
  'array of objects'
);

-- Fingerprint must not depend on jsonb::text key insertion order
SELECT is(
  public.approved_rule_content_fingerprint(
    '[{"approvalId":"a","ruleId":"cut","revision":1,"evidenceStatus":"approved","deductions":{"endDeductionMm":20,"weld":{"left":1,"right":2}},"allowances":null,"applicability":{"materials":["aluminum"]}}]'::jsonb
  ),
  public.approved_rule_content_fingerprint(
    '[{"approvalId":"a","ruleId":"cut","revision":1,"evidenceStatus":"approved","deductions":{"weld":{"right":2,"left":1},"endDeductionMm":20},"allowances":null,"applicability":{"materials":["aluminum"]}}]'::jsonb
  ),
  'rule content fingerprint stable under nested key reorder'
);

SELECT * FROM finish();
ROLLBACK;
