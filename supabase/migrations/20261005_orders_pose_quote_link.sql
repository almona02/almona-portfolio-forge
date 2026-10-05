-- UP-16: Link orders to fabricator_pose_quotes without overloading catalog quotes FK.
-- Idempotent convert: one order per pose quote.

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fabricator_pose_quote_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_fabricator_pose_quote_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_fabricator_pose_quote_id_fkey
      FOREIGN KEY (fabricator_pose_quote_id)
      REFERENCES public.fabricator_pose_quotes(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_fabricator_pose_quote_unique
  ON public.orders (fabricator_pose_quote_id)
  WHERE fabricator_pose_quote_id IS NOT NULL;

COMMENT ON COLUMN public.orders.fabricator_pose_quote_id IS
  'UP-16 link to pose quote (project/position/revision). Separate from catalog quotes.quote_id.';

COMMIT;
