-- Lane A browser-chain persisted-state checks T1-T9 (isolated local DB).
-- Suffix 3 chain: SPK-BRW-3 (good, retired) + SPK-BRW-BAD-3 (invalid, in_review).
-- Run: PGPASSWORD=<isolated> psql "host=127.0.0.1 port=54422 user=postgres dbname=postgres" -f this file
SELECT 'T1 versions' AS t, r.code, v.status, v.version_ordinal, v.published_at IS NOT NULL AS pub, v.retired_at IS NOT NULL AS ret
FROM public.service_routines r JOIN public.service_routine_versions v ON v.routine_id=r.id
WHERE r.code IN ('SPK-BRW-3','SPK-BRW-BAD-3') ORDER BY r.code;
SELECT 'T2 ordinals-distinct' AS t, count(*), count(DISTINCT version_ordinal)
FROM public.service_routine_versions v JOIN public.service_routines r ON r.id=v.routine_id
WHERE r.code='SPK-BRW-3' AND v.version_ordinal IS NOT NULL;
SELECT 'T3 review' AS t, p.role AS reviewer_role, rv.eligible_for_publish, (rv.draft_revision = v.draft_revision) AS rev_match, (v.author_id <> rv.reviewer_id) AS distinct_actor
FROM public.service_routine_reviews rv JOIN public.service_routine_versions v ON v.id=rv.version_id
JOIN public.service_routines r ON r.id=v.routine_id JOIN public.profiles p ON p.id=rv.reviewer_id
WHERE r.code='SPK-BRW-3';
SELECT 'T4 audit' AS t, a.action, count(*), bool_and(a.actor_id IS NOT NULL AND a.actor_role IS NOT NULL AND a.entity_type IS NOT NULL AND a.entity_id IS NOT NULL AND (a.details ? 'routine_id')) AS attributed
FROM public.service_workflow_audit a JOIN public.service_routine_versions v ON v.id = a.entity_id
JOIN public.service_routines r ON r.id=v.routine_id WHERE r.code='SPK-BRW-3' GROUP BY 2 ORDER BY 2;
SELECT 'T5 published-once' AS t, count(*) FROM public.service_workflow_audit a
JOIN public.service_routine_versions v ON v.id=a.entity_id JOIN public.service_routines r ON r.id=v.routine_id
WHERE r.code='SPK-BRW-3' AND a.action='routine_published';
SELECT 'T6 bad-intact' AS t, v.status, v.version_ordinal, v.published_at FROM public.service_routine_versions v
JOIN public.service_routines r ON r.id=v.routine_id WHERE r.code='SPK-BRW-BAD-3';
SELECT 'T7 routine-status' AS t, code, status FROM public.service_routines WHERE code IN ('SPK-BRW-3','SPK-BRW-BAD-3') ORDER BY 1;
SELECT 'T8 single-rows' AS t, code, count(*) FROM public.service_routines WHERE code LIKE 'SPK-BRW-%' GROUP BY code ORDER BY code;
SELECT 'T9 bad-review' AS t, p.role, rv.eligible_for_publish FROM public.service_routine_reviews rv
JOIN public.service_routine_versions v ON v.id=rv.version_id JOIN public.service_routines r ON r.id=v.routine_id
JOIN public.profiles p ON p.id=rv.reviewer_id WHERE r.code='SPK-BRW-BAD-3';
SELECT 'T4b created' AS t, a.action, count(*), bool_and(a.actor_role='admin' AND a.entity_type='service_routine') AS ok
FROM public.service_workflow_audit a WHERE a.action='routine_draft_created' AND a.details->>'code' IN ('SPK-BRW-3','SPK-BRW-BAD-3') GROUP BY 2;
