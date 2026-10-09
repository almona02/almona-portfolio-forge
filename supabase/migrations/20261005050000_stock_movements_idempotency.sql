-- UP-10: durable idempotency for stock intake movements (optional column).
-- Notes-based [idempotency=…] remains for older clients.

BEGIN;

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_movements_user_idempotency
  ON public.stock_movements (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.stock_movements.idempotency_key IS
  'UP-10 client intake token. Unique per user when set; prevents duplicate movement inserts.';

COMMIT;
