-- PR7 / UP-18: explicit idempotency key for position release freeze
-- (concurrent-safe replay).
--
-- The natural unique key (position_id, position_source, revision) already blocks
-- duplicate release rows, but exposing a deterministic idempotency_key makes the
-- replay contract explicit and matches the delivery/QC acknowledgement pattern.
-- Client key format: release:{positionId}:{source}:{revision}

BEGIN;

ALTER TABLE public.fabricator_position_releases
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

UPDATE public.fabricator_position_releases
SET idempotency_key = 'release:' || position_id::text || ':' || position_source || ':' || revision::text
WHERE idempotency_key IS NULL;

ALTER TABLE public.fabricator_position_releases
  ALTER COLUMN idempotency_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_fabricator_position_releases_idempotency
  ON public.fabricator_position_releases (idempotency_key);

COMMENT ON COLUMN public.fabricator_position_releases.idempotency_key IS
  'UP-18 deterministic release token (release:{positionId}:{source}:{revision}). Unique; concurrent duplicate inserts collapse onto the winner row.';

COMMIT;
