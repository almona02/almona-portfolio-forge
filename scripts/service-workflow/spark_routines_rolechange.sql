-- Spark role-change probe. Runs while ADMIN2 profile role = 'support'.
-- Draft SPK-RC-1 authored+submitted by ADMIN2 BEFORE the flip (see runner).
SET ROLE ra_auth;
CREATE TEMP TABLE spark_results(check_id text PRIMARY KEY, status text NOT NULL, detail text NOT NULL DEFAULT '');
DO $$
DECLARE vid uuid; st text; p jsonb;
BEGIN
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  SELECT v.id INTO vid FROM public.service_routine_versions v
    JOIN public.service_routines ro ON ro.id = v.routine_id WHERE ro.code = 'SPK-RC-1';
  BEGIN
    PERFORM public.record_service_routine_review(vid, 'self after role change');
    INSERT INTO spark_results VALUES ('SPK-D4-rolechange', 'FAIL', 'author self-reviewed after becoming support');
  EXCEPTION WHEN OTHERS THEN
    st := SQLSTATE;
    IF st = '42501' AND NOT EXISTS (SELECT 1 FROM public.service_routine_reviews WHERE version_id = vid) THEN
      INSERT INTO spark_results VALUES ('SPK-D4-rolechange', 'PASS', 'uid-based author denial survives role change');
    ELSE
      INSERT INTO spark_results VALUES ('SPK-D4-rolechange', 'FAIL', 'state=' || st);
    END IF;
  END;
  -- Non-author admin review still allowed; publish by admin succeeds.
  PERFORM set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  PERFORM public.record_service_routine_review(vid, 'independent admin review');
  p := public.publish_service_routine_version(vid);
  IF (p->>'status') = 'published' THEN
    INSERT INTO spark_results VALUES ('SPK-D4-rolechange-publish', 'PASS', 'non-author review + publish ok');
  ELSE
    INSERT INTO spark_results VALUES ('SPK-D4-rolechange-publish', 'FAIL', COALESCE(p::text, 'null'));
  END IF;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO spark_results VALUES ('SPK-D4-rolechange', 'FAIL', 'raised ' || SQLSTATE || ' ' || SQLERRM);
END $$;
SELECT check_id, status, detail FROM spark_results ORDER BY check_id;