DROP TABLE IF EXISTS shield_anomalies CASCADE;
DROP TABLE IF EXISTS shield_events CASCADE;

CREATE TABLE shield_events (
  event_hash TEXT PRIMARY KEY,
  prev_hash TEXT,
  chain_position BIGINT NOT NULL UNIQUE,
  event_type shield_event_type NOT NULL,
  entity_id TEXT NOT NULL,
  vertical_id TEXT NOT NULL,
  proof JSONB NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_shield_chain_shape CHECK (
    (prev_hash IS NULL AND chain_position = 1)
    OR (prev_hash IS NOT NULL AND chain_position > 1)
  ),
  CONSTRAINT chk_shield_proof CHECK (
    jsonb_typeof(proof) = 'object'
    AND proof ? 'verified_by'
    AND proof ? 'timestamp'
  )
);

CREATE INDEX idx_shield_events_entity ON shield_events(entity_id, recorded_at DESC);
CREATE INDEX idx_shield_events_vertical ON shield_events(vertical_id, recorded_at DESC);
CREATE INDEX idx_shield_events_prev ON shield_events(prev_hash) WHERE prev_hash IS NOT NULL;
CREATE INDEX idx_shield_events_position ON shield_events(chain_position DESC);

CREATE TRIGGER trg_shield_no_update
  BEFORE UPDATE OR DELETE ON shield_events
  FOR EACH ROW EXECUTE FUNCTION shield_block_mutation();

ALTER TABLE shield_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY shield_events_select_all ON shield_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY shield_events_insert_anon ON shield_events FOR INSERT TO anon, authenticated WITH CHECK (true);

INSERT INTO shield_events (
  event_hash, prev_hash, chain_position, event_type, entity_id, vertical_id, proof, recorded_at, created_at
) VALUES (
  '0000000000000000000000000000000000000000000000000000000000000000',
  NULL,
  1,
  'VERIFICATION',
  'shield_genesis',
  'shield_core',
  '{"verified_by": "system", "timestamp": "2025-02-20T00:00:00Z", "location": null}'::jsonb,
  '2025-02-20 00:00:00'::timestamptz,
  '2025-02-20 00:00:00'::timestamptz
);

CREATE TABLE shield_anomalies (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_hash TEXT NOT NULL REFERENCES shield_events(event_hash),
  pattern TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendation TEXT NOT NULL DEFAULT '',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_shield_anom_no_update
  BEFORE UPDATE OR DELETE ON shield_anomalies
  FOR EACH ROW EXECUTE FUNCTION shield_block_mutation();
ALTER TABLE shield_anomalies ENABLE ROW LEVEL SECURITY;
CREATE POLICY shield_anom_select_all ON shield_anomalies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY shield_anom_insert_auth ON shield_anomalies FOR INSERT TO anon, authenticated WITH CHECK (true);
