-- migrations/078_realityos_record_event_function.sql
-- RealityOS: DB-native append-only event recorder
--
-- Creates a SECURITY DEFINER function for service_role to record events into
-- public.reality_events with correct prev_hash linkage and event_hash computation.
--
-- Notes:
-- - Uses an advisory transaction lock to serialize inserts and preserve chain integrity.
-- - Computes event_hash using the same formula documented in src/lib/realityos/EventLedger.ts:
--   SHA-256(prev_hash + payload_hash + proof_hash + proof.timestamp)
-- - DB constraints in 041 require proof JSON to contain 'verified_by' and 'timestamp' keys.
--
BEGIN;
CREATE OR REPLACE FUNCTION public.realityos_record_event(
    p_event_type core_event_type,
    p_entity_id VARCHAR,
    p_vertical_id VARCHAR,
    p_proof JSONB,
    p_payload JSONB,
    p_recorded_at TIMESTAMPTZ DEFAULT NOW()
  ) RETURNS TABLE(event_hash CHAR(64), chain_position BIGINT) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_prev_hash CHAR(64);
v_payload_hash TEXT;
v_proof_hash TEXT;
v_event_hash TEXT;
BEGIN -- Serialize inserts to preserve chain integrity
PERFORM pg_advisory_xact_lock(781004);
-- arbitrary constant lock id
-- Read previous hash (latest event)
SELECT re.event_hash INTO v_prev_hash
FROM public.reality_events re
ORDER BY re.chain_position DESC
LIMIT 1;
-- Compute hashes
v_payload_hash := encode(
  digest(COALESCE(p_payload, '{}'::jsonb)::text, 'sha256'), 'hex'
);
v_proof_hash := encode(
  digest(COALESCE(p_proof, '{}'::jsonb)::text, 'sha256'), 'hex'
);
v_event_hash := encode(
  digest(
    COALESCE(v_prev_hash, '') || v_payload_hash || v_proof_hash || COALESCE(p_proof->>'timestamp', ''), 'sha256'
  ), 'hex'
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
  public.reality_events.chain_position INTO event_hash,
  chain_position;
RETURN NEXT;
END;
$$;
COMMENT ON FUNCTION public.realityos_record_event(
  core_event_type,
  VARCHAR,
  VARCHAR,
  JSONB,
  JSONB,
  TIMESTAMPTZ
) IS 'Append-only RealityOS event recorder. Computes event_hash and links prev_hash deterministically. Intended for service_role use.';
-- Grants (best-effort; may be skipped if roles not present)
DO $$ BEGIN
GRANT EXECUTE ON FUNCTION public.realityos_record_event(
    core_event_type,
    VARCHAR,
    VARCHAR,
    JSONB,
    JSONB,
    TIMESTAMPTZ
  ) TO service_role;
EXCEPTION
WHEN OTHERS THEN RAISE NOTICE 'Could not grant execute on realityos_record_event: %',
SQLERRM;
END $$;
COMMIT;