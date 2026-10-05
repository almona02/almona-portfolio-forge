\set ON_ERROR_STOP on
-- Disposable, empty local test cluster only.
CREATE ROLE anon;
CREATE ROLE authenticated;
\ir ../../migrations/20261005_fabrication_consultation.sql
SET ROLE anon;
DO $$
DECLARE receipt uuid;
BEGIN
  receipt := public.submit_fabrication_consultation('Test Customer', '+201000000000', 'renovation', 'upvc', 'Test windows');
  IF receipt IS NULL THEN RAISE EXCEPTION 'Missing receipt'; END IF;
  BEGIN
    PERFORM public.submit_fabrication_consultation('X', '123', 'upvc', 'upvc', '');
    RAISE EXCEPTION 'Invalid request accepted' USING ERRCODE = 'ZZ001';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
  BEGIN
    PERFORM id FROM public.fabrication_consultation_requests;
    RAISE EXCEPTION 'Anonymous read allowed' USING ERRCODE = 'ZZ001';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM public.submit_fabrication_consultation('Test Customer', '+201000000000', 'renovation', 'upvc', 'Test 2');
  PERFORM public.submit_fabrication_consultation('Test Customer', '+201000000000', 'commercial', 'aluminum', 'Test 3');
  BEGIN
    PERFORM public.submit_fabrication_consultation('Test Customer', '+201000000000', 'renovation', 'upvc', 'Test 4');
    RAISE EXCEPTION 'Rate limit missing' USING ERRCODE = 'ZZ001';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL; END;
END $$;
RESET ROLE;
SET ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM id FROM public.fabrication_consultation_requests;
    RAISE EXCEPTION 'Authenticated read allowed' USING ERRCODE = 'ZZ001';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.fabrication_consultation_requests) <> 3 THEN RAISE EXCEPTION 'Persistence count mismatch'; END IF;
END $$;
SELECT 'Migration, persistence, validation, rate limit and private reads passed' AS result;
