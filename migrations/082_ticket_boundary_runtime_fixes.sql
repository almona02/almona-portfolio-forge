-- Migration 082: Close P0.11 blockers discovered after 078/080/081 "Success" apply
--
-- Live verify failures (2026-09-08):
--   1) realityos_record_event: digest(text, unknown) does not exist
--      Cause: SECURITY DEFINER search_path = public hides pgcrypto (extensions schema on Supabase)
--   2) service_tickets INSERT: ticket_number NOT NULL
--      Cause: handle_new_ticket() may exist, but BEFORE INSERT trigger was never attached
--
-- Apply AFTER 078 → 080 → 081. Safe to re-run (idempotent).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Ensure pgcrypto is available (digest / encode)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 2. Fix realityos_record_event — search_path includes extensions; bytea digest
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.realityos_record_event(
    p_event_type core_event_type,
    p_entity_id VARCHAR,
    p_vertical_id VARCHAR,
    p_proof JSONB,
    p_payload JSONB,
    p_recorded_at TIMESTAMPTZ DEFAULT NOW()
  ) RETURNS TABLE(event_hash CHAR(64), chain_position BIGINT)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, extensions
AS $$
DECLARE
  v_prev_hash CHAR(64);
  v_payload_hash TEXT;
  v_proof_hash TEXT;
  v_event_hash TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(781004);

  SELECT re.event_hash INTO v_prev_hash
  FROM public.reality_events re
  ORDER BY re.chain_position DESC
  LIMIT 1;

  v_payload_hash := encode(
    digest(convert_to(COALESCE(p_payload, '{}'::jsonb)::text, 'UTF8'), 'sha256'),
    'hex'
  );
  v_proof_hash := encode(
    digest(convert_to(COALESCE(p_proof, '{}'::jsonb)::text, 'UTF8'), 'sha256'),
    'hex'
  );
  v_event_hash := encode(
    digest(
      convert_to(
        COALESCE(v_prev_hash, '') || v_payload_hash || v_proof_hash || COALESCE(p_proof->>'timestamp', ''),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  INSERT INTO public.reality_events (
    event_hash,
    prev_hash,
    event_type,
    entity_id,
    vertical_id,
    proof,
    payload,
    recorded_at,
    created_at
  )
  VALUES (
    v_event_hash::char(64),
    v_prev_hash,
    p_event_type,
    p_entity_id,
    p_vertical_id,
    p_proof,
    COALESCE(p_payload, '{}'::jsonb),
    p_recorded_at,
    NOW()
  )
  RETURNING public.reality_events.event_hash,
            public.reality_events.chain_position
  INTO event_hash, chain_position;

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.realityos_record_event(
  core_event_type, VARCHAR, VARCHAR, JSONB, JSONB, TIMESTAMPTZ
) IS 'Append-only RealityOS event recorder (search_path includes extensions/pgcrypto).';

DO $$ BEGIN
  GRANT EXECUTE ON FUNCTION public.realityos_record_event(
    core_event_type, VARCHAR, VARCHAR, JSONB, JSONB, TIMESTAMPTZ
  ) TO service_role;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not grant realityos_record_event to service_role: %', SQLERRM;
END $$;

DO $$ BEGIN
  GRANT EXECUTE ON FUNCTION public.realityos_record_event(
    core_event_type, VARCHAR, VARCHAR, JSONB, JSONB, TIMESTAMPTZ
  ) TO authenticated;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not grant realityos_record_event to authenticated: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Ensure ticket_number generator + BEFORE INSERT trigger (080 assumed function only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  ticket_num TEXT;
  current_year TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM NOW())::TEXT;

  SELECT COALESCE(
    MAX(CAST(SUBSTRING(ticket_number FROM 'TKT-' || current_year || '-(\d+)') AS INTEGER)),
    0
  ) + 1
  INTO next_num
  FROM public.service_tickets
  WHERE ticket_number ~ ('^TKT-' || current_year || '-\d+$');

  ticket_num := 'TKT-' || current_year || '-' || LPAD(next_num::TEXT, 6, '0');
  RETURN ticket_num;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.generate_ticket_number();
  END IF;
  -- SLA/assignment owned by application Tier-3 governance (do not mutate here).
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_new_ticket_trigger ON public.service_tickets;
CREATE TRIGGER handle_new_ticket_trigger
  BEFORE INSERT ON public.service_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_ticket();

COMMIT;
