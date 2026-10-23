-- PR7: explicit idempotency key for position release freeze (concurrent-safe replay).
--
-- The natural unique key (position_id, position_source, revision) already blocks
-- duplicate release rows, but exposing a deterministic idempotency key makes the
-- replay contract explicit and matches the delivery/QC acknowledgement pattern.

BEGIN;

ALTER TABLE public.fabricator_position_releases
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

UPDATE public.fabricator_position_releases
SET idempotency_key = 'release:' || position_id || ':' || position_source || ':' || revision
WHERE idempotency_key IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_fabricator_position_releases_idempotency
  ON public.fabricator_position_releases (idempotency_key);

COMMIT;
