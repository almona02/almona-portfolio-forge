-- Narrow containment migration. No rows or function bodies are changed.
-- The ledger is server-owned: no tenant ownership mapping exists for direct clients.
SET LOCAL lock_timeout = '5s';
DO $hardening$
DECLARE
  item record;
BEGIN
  -- Include every descendant so direct partition access cannot bypass the parent.
  FOR item IN
    WITH RECURSIVE ledger_relations(oid) AS (
      SELECT to_regclass('public.reality_events')::oid
      UNION ALL
      SELECT i.inhrelid FROM pg_inherits i JOIN ledger_relations r ON r.oid = i.inhparent
    )
    SELECT c.oid, n.nspname, c.relname
    FROM ledger_relations r JOIN pg_class c ON c.oid = r.oid
    JOIN pg_namespace n ON n.oid = c.relnamespace
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM PUBLIC, anon, authenticated', item.nspname, item.relname);
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', item.nspname, item.relname);
    -- Preserve existing service-role/server grants. No client policy is intentional.
  END LOOP;

  -- Identity/serial sequences are an independent privilege surface.
  FOR item IN
    SELECT s.oid::regclass AS signature
    FROM pg_class s JOIN pg_depend d ON d.objid = s.oid
    WHERE s.relkind = 'S' AND d.classid = 'pg_class'::regclass
      AND d.refclassid = 'pg_class'::regclass
      AND d.refobjid = to_regclass('public.reality_events')
      AND d.deptype IN ('a', 'i')
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE %s FROM PUBLIC, anon, authenticated', item.signature);
  END LOOP;

  FOR item IN
    SELECT p.oid::regprocedure AS signature, p.proname
    FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN ('realityos_record_event', 'reality_events_readonly')
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON FUNCTION %s FROM PUBLIC, anon, authenticated', item.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', item.signature);
  END LOOP;

  -- The materialized aggregate bypasses the base table's RLS.
  IF to_regclass('public.mv_event_type_distribution') IS NOT NULL THEN
    REVOKE ALL PRIVILEGES ON TABLE public.mv_event_type_distribution FROM PUBLIC, anon, authenticated;
  END IF;

  -- Keep authenticated browser operations working while removing anonymous entry.
  -- Explicit list prevents silently granting auth access to future internal functions.
  FOR item IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN (
        'admin_list_manufacturing_approval_requests', 'admin_list_active_manufacturing_authority',
        'admin_approve_fabricator_manufacturing_approval', 'admin_reject_fabricator_manufacturing_approval',
        'admin_revoke_fabricator_manufacturing_authority', 'admin_approve_vendor_catalogue',
        'admin_list_hardener_proposals', 'admin_review_fabricator_hardener',
        'admin_override_fabricator_hardener', 'admin_revoke_fabricator_hardener',
        'admin_upsert_hardener_applicability', 'convert_fabricator_pose_quote_to_order'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', item.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', item.signature);
  END LOOP;
END;
$hardening$;
