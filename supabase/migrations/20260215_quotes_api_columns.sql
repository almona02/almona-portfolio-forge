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
EXCEPTION WHEN others THEN NULL;
END $$;

-- Make user_id nullable for anonymous/API-created quotes (optional)
-- Uncomment if you need to support quote creation without authenticated user:
-- ALTER TABLE public.quotes ALTER COLUMN user_id DROP NOT NULL;

COMMIT;
