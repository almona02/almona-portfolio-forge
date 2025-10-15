-- Migration: add 'support' value to user_role enum if not exists
-- Postgres native enum cannot use IF NOT EXISTS directly on ADD VALUE prior to PG 15
-- This block is idempotent: it checks catalog before adding.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role'
      AND e.enumlabel = 'support'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'support';
  END IF;
END$$;
