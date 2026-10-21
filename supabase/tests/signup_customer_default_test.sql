-- Transactional registration regression. No accounts or emails survive this test.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $test$
DECLARE
  v_id uuid;
  v_first uuid;
  v_kind text;
  v_admin_count bigint;
BEGIN
  PERFORM set_config('request.jwt.claims', '{}', true);
  SELECT count(*) INTO v_admin_count FROM public.profiles WHERE role::text = 'admin';
  IF (SELECT column_default FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role')
      IS DISTINCT FROM '''customer''::user_role' THEN
    RAISE EXCEPTION 'profiles.role must default to customer';
  END IF;
  CREATE TEMP TABLE signup_default_probe (LIKE public.profiles INCLUDING DEFAULTS) ON COMMIT DROP;
  INSERT INTO signup_default_probe (id) VALUES (gen_random_uuid());
  IF EXISTS (SELECT 1 FROM signup_default_probe WHERE role::text IS DISTINCT FROM 'customer') THEN
    RAISE EXCEPTION 'Omitted role did not receive customer default';
  END IF;
  FOREACH v_kind IN ARRAY ARRAY['plain', 'metadata-admin', 'oauth-metadata-admin'] LOOP
    v_id := gen_random_uuid();
    v_first := COALESCE(v_first, v_id);
    INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (v_id, 'authenticated', 'authenticated', v_id::text || '@signup-test.invalid',
      jsonb_build_object('provider', CASE WHEN v_kind = 'oauth-metadata-admin' THEN 'google' ELSE 'email' END),
      CASE WHEN v_kind = 'plain' THEN '{}'::jsonb ELSE '{"full_name":"Signup security test","role":"admin","is_admin":true,"is_verified":true}'::jsonb END,
      now(), now());
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_id AND role::text = 'customer' AND is_verified = false) THEN
      RAISE EXCEPTION 'Signup fixture % did not receive an unverified customer profile', v_kind;
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM public.profiles WHERE role::text = 'admin') <> v_admin_count THEN
    RAISE EXCEPTION 'Signup changed the number of administrator profiles';
  END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_first, 'role', 'authenticated')::text, true);
  BEGIN
    UPDATE public.profiles SET role = 'admin' WHERE id = v_first;
    RAISE EXCEPTION 'Browser self-promotion was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.profiles SET is_verified = true WHERE id = v_first;
    RAISE EXCEPTION 'Browser verification escalation was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Signup trigger function is publicly executable';
  END IF;
END;
$test$;
ROLLBACK;
SELECT 'passed (all signup fixtures rolled back)' AS signup_customer_regression;
