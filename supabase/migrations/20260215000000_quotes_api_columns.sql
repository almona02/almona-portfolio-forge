-- Add columns for API v2 quote creation (contact_name, contact_email, etc.)
-- Run this if your quotes table uses the base schema with contact_info JSONB only.
-- Idempotent: uses IF NOT EXISTS / DO blocks.

BEGIN;

-- Add contact/API columns if they don't exist
DO $$ BEGIN
  ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS contact_name TEXT;
  ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS contact_email TEXT;
  ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS contact_phone TEXT;
  ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS company TEXT;
  ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS project_description TEXT;
  ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'standard';
  ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS delivery_location TEXT;
  ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS special_requirements TEXT;
END $$;

-- Guest creation is performed by the backend service role, not anonymous RLS.
ALTER TABLE public.quotes ALTER COLUMN user_id DROP NOT NULL;

COMMIT;
