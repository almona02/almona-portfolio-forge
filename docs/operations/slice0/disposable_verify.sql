-- Slice 0 disposable verification harness (synthetic fixtures only).
\set ON_ERROR_STOP on

CREATE TEMP TABLE IF NOT EXISTS slice0_results (
  step text PRIMARY KEY,
  ok boolean NOT NULL,
  detail text NOT NULL
);
TRUNCATE slice0_results;

-- 1) Share minimize + internal-note exclusion
DO $$
DECLARE
  payload jsonb;
BEGIN
  payload := public.get_shared_ticket('validsharetoken00001111222233334444555566667777');
  IF payload->'ticket' ? 'contact_phone' OR payload->'ticket' ? 'contact_email' THEN
    RAISE EXCEPTION 'PII leaked in share ticket payload';
  END IF;
  IF jsonb_array_length(payload->'messages') <> 1 THEN
    RAISE EXCEPTION 'Expected 1 public message, got %', jsonb_array_length(payload->'messages');
  END IF;
  IF (payload->'messages'->0->>'message') ILIKE '%INTERNAL%' THEN
    RAISE EXCEPTION 'Internal note content exposed';
  END IF;
  IF payload->'messages'->0->'attachments'->0 ? 'url' THEN
    RAISE EXCEPTION 'Public attachment URL still present in share payload';
  END IF;
  IF COALESCE(payload->'messages'->0->'attachments'->0->>'storage_path', '') = '' THEN
    RAISE EXCEPTION 'Expected storage_path for secure attachment resolution';
  END IF;
  INSERT INTO slice0_results VALUES ('share_minimize_internal_notes', true, 'allowlist + internal excluded + path-only attachment');
END $$;

-- 2) Expired / short tokens
DO $$
BEGIN
  BEGIN
    PERFORM public.get_shared_ticket('expiredsharetoken000011112222333344445555666677');
    RAISE EXCEPTION 'expired token should fail';
  EXCEPTION WHEN SQLSTATE 'P0002' THEN
    NULL;
  END;
  BEGIN
    PERFORM public.get_shared_ticket('short');
    RAISE EXCEPTION 'short token should fail';
  EXCEPTION WHEN SQLSTATE 'P0002' THEN
    NULL;
  END;
  INSERT INTO slice0_results VALUES ('share_invalid_expired_short', true, 'invalid tokens rejected');
END $$;

-- 3) Revocation
DO $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM public.revoke_ticket_share('validsharetoken00001111222233334444555566667777');
  BEGIN
    PERFORM public.get_shared_ticket('validsharetoken00001111222233334444555566667777');
    RAISE EXCEPTION 'revoked token should fail';
  EXCEPTION WHEN SQLSTATE 'P0002' THEN
    NULL;
  END;
  INSERT INTO public.ticket_shares(ticket_id, token, created_by, expires_at)
  VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'validsharetokenAAAA1111222233334444555566667777',
    '44444444-4444-4444-4444-444444444444',
    now() + interval '7 days'
  );
  INSERT INTO slice0_results VALUES ('share_revocation', true, 'revoked token rejected; replacement share created');
END $$;

-- 4) Direct mutation bypass blocked
DO $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  BEGIN
    UPDATE public.service_tickets
    SET status = 'in_progress'
    WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    RAISE EXCEPTION 'direct status update should be blocked';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
    WHEN SQLSTATE '42501' THEN NULL;
  END;
  BEGIN
    UPDATE public.service_tickets
    SET assigned_to = '22222222-2222-2222-2222-222222222222'
    WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    RAISE EXCEPTION 'direct assignee update should be blocked';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
    WHEN SQLSTATE '42501' THEN NULL;
  END;
  INSERT INTO slice0_results VALUES ('direct_mutation_blocked', true, 'status/assignee updates require governed RPC');
END $$;

-- 5) Authorized technician transition + atomic audit
DO $$
DECLARE
  before_audit int;
  after_audit int;
  row public.service_tickets%ROWTYPE;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  SELECT count(*) INTO before_audit FROM public.ticket_governance_audit
  WHERE ticket_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  row := public.govern_ticket_transition(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'in_progress',
    'accept assignment',
    NULL
  );
  IF row.status IS DISTINCT FROM 'in_progress' THEN
    RAISE EXCEPTION 'expected in_progress, got %', row.status;
  END IF;
  SELECT count(*) INTO after_audit FROM public.ticket_governance_audit
  WHERE ticket_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    AND action = 'status_transition'
    AND to_status = 'in_progress';
  IF after_audit <= before_audit THEN
    RAISE EXCEPTION 'audit row missing for successful transition';
  END IF;
  INSERT INTO slice0_results VALUES ('authorized_transition_atomic_audit', true, 'technician accept persisted with audit');
END $$;

-- 6) Unrelated user denied
DO $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  BEGIN
    PERFORM public.govern_ticket_transition(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'resolved',
      'should fail',
      NULL
    );
    RAISE EXCEPTION 'unrelated user transition should fail';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
    WHEN SQLSTATE '42501' THEN NULL;
  END;
  INSERT INTO slice0_results VALUES ('unrelated_user_denied', true, 'non-assignee/non-admin blocked');
END $$;

-- 7) Failed transition does not write audit / change status
DO $$
DECLARE
  before_status text;
  before_audit int;
  after_audit int;
BEGIN
  SELECT status INTO before_status FROM public.service_tickets
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  SELECT count(*) INTO before_audit FROM public.ticket_governance_audit
  WHERE ticket_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  PERFORM set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  BEGIN
    PERFORM public.govern_ticket_transition(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'open',
      'illegal',
      NULL
    );
    RAISE EXCEPTION 'illegal transition should fail';
  EXCEPTION
    WHEN check_violation THEN NULL;
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%Invalid ticket status transition%' THEN
        NULL;
      ELSE
        RAISE;
      END IF;
  END;
  IF (SELECT status FROM public.service_tickets WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') IS DISTINCT FROM before_status THEN
    RAISE EXCEPTION 'status changed despite failed transition';
  END IF;
  SELECT count(*) INTO after_audit FROM public.ticket_governance_audit
  WHERE ticket_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  IF after_audit <> before_audit THEN
    RAISE EXCEPTION 'audit written for failed transition';
  END IF;
  INSERT INTO slice0_results VALUES ('failed_transition_no_audit_commit', true, 'illegal transition rolled back without audit');
END $$;

-- 8) Admin bulk partial failure
DO $$
DECLARE
  bulk jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
  INSERT INTO public.service_tickets(id, ticket_number, user_id, title, description, status)
  VALUES (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'ST-SLICE0-2',
    '11111111-1111-1111-1111-111111111111',
    'Second ticket',
    'Bulk target',
    'open'
  )
  ON CONFLICT (id) DO NOTHING;
  bulk := public.govern_ticket_bulk_assign(
    ARRAY['dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid],
    '33333333-3333-3333-3333-333333333333',
    'bulk test'
  );
  IF jsonb_array_length(bulk->'succeeded') <> 1 THEN
    RAISE EXCEPTION 'expected 1 succeeded bulk assign, got %', bulk;
  END IF;
  IF jsonb_array_length(bulk->'failed') <> 1 THEN
    RAISE EXCEPTION 'expected 1 failed bulk assign, got %', bulk;
  END IF;
  IF COALESCE((bulk->>'partial')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'expected partial=true';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.ticket_governance_audit
    WHERE ticket_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' AND action = 'assign'
  ) THEN
    RAISE EXCEPTION 'missing bulk success audit';
  END IF;
  INSERT INTO slice0_results VALUES ('bulk_partial_failure_audit', true, 'one success audited; one failure listed');
END $$;

-- 9) Attachment bucket privacy
DO $$
BEGIN
  IF (SELECT public FROM storage.buckets WHERE id = 'ticket-attachments') IS NOT FALSE THEN
    RAISE EXCEPTION 'ticket-attachments still public';
  END IF;
  INSERT INTO slice0_results VALUES ('attachment_bucket_private', true, 'bucket.public=false');
END $$;

-- 10) Legacy public URL maps to storage_path on share
DO $$
DECLARE
  payload jsonb;
BEGIN
  payload := public.get_shared_ticket('validsharetokenAAAA1111222233334444555566667777');
  IF payload->'ticket' ? 'contact_email' THEN
    RAISE EXCEPTION 'PII present on replacement share';
  END IF;
  IF COALESCE(payload->'messages'->0->'attachments'->0->>'storage_path','')
       IS DISTINCT FROM 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/jam.jpg' THEN
    RAISE EXCEPTION 'legacy public URL did not resolve to storage_path: %', payload->'messages'->0->'attachments';
  END IF;
  INSERT INTO slice0_results VALUES ('legacy_attachment_path_resolution', true, 'legacy URL mapped to storage_path');
END $$;

SELECT step, ok, detail FROM slice0_results ORDER BY step;

SELECT
  CASE WHEN count(*) FILTER (WHERE NOT ok) = 0 THEN 'PASS' ELSE 'FAIL' END AS overall,
  count(*) AS checks,
  count(*) FILTER (WHERE ok) AS passed,
  count(*) FILTER (WHERE NOT ok) AS failed
FROM slice0_results;
