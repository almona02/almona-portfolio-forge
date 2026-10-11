-- PR #76 security regressions. Disposable fixtures; all writes rolled back.
BEGIN;
SET LOCAL search_path TO public, extensions, pg_temp;
SELECT plan(8);
INSERT INTO auth.users(id, instance_id, aud, role, email, created_at, updated_at)
VALUES ('14000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pr76-owner@example.test',now(),now());
INSERT INTO public.fabricator_projects_v2(id,owner_user_id,project_code,project_name,client_name,system_pack_id)
VALUES ('24000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000001','PR76-SEC','PR76 security','Test','caluminium-ps');
INSERT INTO public.fabricator_positions_v2(id,project_id,owner_user_id,overall_width_mm,overall_height_mm,system_pack_id,qc_revision,quantity,components)
VALUES ('34000000-0000-0000-0000-000000000001','24000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000001',1200,1500,'caluminium-ps',1,1,
 '[{"id":"c1","profile":{"id":"PS-FRAME"},"cuttingLengths":[1200],"angles":[45],"quantity":1}]'::jsonb);
SELECT set_config('request.jwt.claims','{}',true);
SELECT throws_ok($$SELECT public.derive_required_cuts_from_position('34000000-0000-0000-0000-000000000001',1)$$,'42501','authentication required','anonymous ledger read rejected');
SELECT set_config('request.jwt.claims','{"sub":"14000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
SELECT throws_ok($$SELECT public.derive_required_cuts_from_position('34000000-0000-0000-0000-000000000001',1)$$,'42501','position owner mismatch','cross-owner ledger read rejected');
SELECT set_config('request.jwt.claims','{"sub":"14000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
SELECT is(jsonb_array_length(public.derive_required_cuts_from_position('34000000-0000-0000-0000-000000000001',1)),1,'owner ledger read succeeds');
SELECT throws_ok($$SELECT public.derive_required_cuts_from_position('34000000-0000-0000-0000-000000000001',2)$$,'stale position revision (expected 2, actual 1)','stale ledger read rejected');
SELECT ok(NOT has_function_privilege('anon','public.derive_required_cuts_from_position(uuid,bigint)','EXECUTE'),'anonymous RPC execute remains revoked');
SELECT is(public.authority_permitted_stock_lengths('{"profiles":[{"profileId":"A","stockLengthMm":6000,"evidenceStatus":"approved"},{"profileId":"A","stockLengthMm":7000,"evidenceStatus":"pending"}]}'::jsonb),ARRAY[6000::numeric],'pending catalogue stock excluded');
SELECT throws_ok($$SELECT public.assert_evidence_against_authority(
 '{"kerfMm":4,"trimMm":0,"cuttingPlan":[{"stockLength":6500,"profile":{"id":"A"}}]}'::jsonb,
 '{"manufacturingSettings":{"sawKerfMm":4,"trimCutMm":0},"profiles":[{"profileId":"A","stockLengthMm":6000,"evidenceStatus":"approved"},{"profileId":"B","stockLengthMm":6500,"evidenceStatus":"approved"}]}'::jsonb)$$,
 'cuttingPlan[0] stock length is not approved for this profile','another profile stock cannot be substituted');
SELECT lives_ok($$SELECT public.assert_evidence_against_authority(
 '{"kerfMm":4,"trimMm":0,"cuttingPlan":[{"stockLength":6000,"profile":{"id":"A"}}]}'::jsonb,
 '{"manufacturingSettings":{"sawKerfMm":4,"trimCutMm":0},"profiles":[{"profileId":"A","stockLengthMm":6000,"evidenceStatus":"approved"}]}'::jsonb)$$,'matching approved profile and stock accepted');
SELECT * FROM finish();
ROLLBACK;
