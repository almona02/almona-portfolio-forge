-- Add covering index for unindexed foreign key

-- The foreign key `tickets_machine_id_fkey` on the `public.tickets` table
-- does not have a covering index, which can cause performance issues.
-- This script creates the necessary index.

CREATE INDEX IF NOT EXISTS idx_tickets_machine_id ON public.tickets(machine_id);
