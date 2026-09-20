-- Read-only checks for the September 2026 launch database repairs.
SELECT 'profile_guard_enabled' AS check_name,
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.profiles'::regclass
    AND tgname = 'protect_profile_privileges' AND tgenabled = 'O')::text AS result
UNION ALL SELECT 'browser_profile_truncate_blocked',
  (NOT has_table_privilege('authenticated', 'public.profiles', 'TRUNCATE'))::text
UNION ALL SELECT 'profile_service_policy_roles', roles::text
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
    AND policyname = 'Service role can insert profiles'
UNION ALL SELECT 'guest_quote_user_id_nullable', is_nullable
  FROM information_schema.columns WHERE table_schema = 'public'
    AND table_name = 'quotes' AND column_name = 'user_id'
UNION ALL SELECT 'quote_sequence_active',
  (position('nextval' in pg_get_functiondef('public.generate_quote_number()'::regprocedure)) > 0)::text
UNION ALL SELECT 'quote_compatibility_triggers', count(*)::text
  FROM pg_trigger WHERE NOT tgisinternal AND tgenabled = 'O'
    AND tgname IN ('normalize_quote_api_item', 'normalize_quote_api_header')
UNION ALL SELECT 'missing_profiles', count(*)::text FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
UNION ALL SELECT 'missing_subscriptions', count(*)::text FROM public.profiles p
  WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.id)
UNION ALL SELECT 'signup_no_silent_failure',
  (position('EXCEPTION' in upper(pg_get_functiondef('public.handle_new_user()'::regprocedure))) = 0)::text
UNION ALL SELECT 'core_rls_enabled', bool_and(relrowsecurity)::text FROM pg_class
  WHERE oid IN ('public.profiles'::regclass, 'public.quotes'::regclass,
    'public.quote_items'::regclass, 'public.subscriptions'::regclass);
