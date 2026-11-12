-- pgTAP / manual SQL checklist for Slice 0 security boundary.
-- PREPARE ONLY: run against a disposable database after applying
-- 20261111010000_service_slice0_security_boundary.sql + staging_service_tickets_rls.sql.
-- Do not run against production customer data.

BEGIN;

SELECT plan(12);

SELECT has_function('public', 'get_shared_ticket', ARRAY['text']);
SELECT has_function('public', 'revoke_ticket_share', ARRAY['text']);
SELECT has_function('public', 'govern_ticket_transition', ARRAY['uuid','text','text','text']);
SELECT has_function('public', 'govern_ticket_assign', ARRAY['uuid','uuid','text']);
SELECT has_function('public', 'govern_ticket_bulk_assign', ARRAY['uuid[]','uuid','text']);

SELECT is(
  (SELECT public FROM storage.buckets WHERE id = 'ticket-attachments'),
  false,
  'ticket-attachments bucket is private'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'ticket-attachments-public-read'
  ),
  'anonymous public-read policy removed'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'service_tickets'),
  'service_tickets RLS enabled'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.service_tickets', 'UPDATE'),
  'anon cannot UPDATE service_tickets'
);

SELECT is(
  public.is_valid_ticket_status_transition('closed', 'open'),
  false,
  'reopen from closed is invalid'
);

SELECT is(
  public.is_valid_ticket_status_transition('assigned', 'in_progress'),
  true,
  'technician accept transition remains valid'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.service_tickets'::regclass
      AND tgname = 'enforce_governed_ticket_columns_trigger'
  ),
  'governed column trigger installed'
);

SELECT * FROM finish();
ROLLBACK;
