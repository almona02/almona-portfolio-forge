-- Read-only audit. Run against the intended environment; no customer rows returned.
-- Presence is not proof of correct grants, signatures or business behavior.
WITH expected_tables(name) AS (
  VALUES ('invoices'), ('payments'), ('fabricator_cutting_plans'),
         ('chat_interactions'), ('training_enrollments')
), expected_functions(name) AS (
  VALUES ('convert_fabricator_pose_quote_to_order'),
         ('admin_list_manufacturing_approval_requests'),
         ('admin_list_active_manufacturing_authority'),
         ('admin_approve_fabricator_manufacturing_approval'),
         ('admin_reject_fabricator_manufacturing_approval'),
         ('admin_revoke_fabricator_manufacturing_authority'),
         ('admin_approve_vendor_catalogue'),
         ('admin_list_hardener_proposals'),
         ('admin_review_fabricator_hardener'),
         ('admin_override_fabricator_hardener'),
         ('admin_revoke_fabricator_hardener')
)
SELECT jsonb_build_object(
  'database', current_database(),
  'checked_at', now(),
  'tables', (
    SELECT jsonb_agg(jsonb_build_object('name', name,
      'present', to_regclass(format('public.%I', name)) IS NOT NULL))
    FROM expected_tables
  ),
  'functions', (
    SELECT jsonb_agg(jsonb_build_object('name', e.name,
      'present', p.oid IS NOT NULL,
      'arguments', pg_get_function_identity_arguments(p.oid),
      'security_definer', p.prosecdef,
      'settings', p.proconfig,
      'anon_execute', has_function_privilege('anon', p.oid, 'execute')))
    FROM expected_functions e
    LEFT JOIN pg_proc p ON p.proname = e.name
      AND p.pronamespace = 'public'::regnamespace
  ),
  'public_tables_without_rls', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('table', c.relname,
      'anon_select', has_table_privilege('anon', c.oid, 'select'),
      'anon_insert', has_table_privilege('anon', c.oid, 'insert'),
      'anon_update', has_table_privilege('anon', c.oid, 'update'),
      'anon_delete', has_table_privilege('anon', c.oid, 'delete'),
      'anon_truncate', has_table_privilege('anon', c.oid, 'truncate'))), '[]'::jsonb)
    FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
  ),
  'editable_metadata_policies', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('table', tablename,
      'policy', policyname)), '[]'::jsonb)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (coalesce(qual, '') || coalesce(with_check, ''))
        ~ 'user_metadata|raw_user_meta_data'
  )
) AS audit;
