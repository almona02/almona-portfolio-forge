-- Migration: Add Operation Mode Support
-- Author: Almona Engineering
-- Date: 2025-02-27
-- Purpose: Enable operation mode tracking (sandbox/production/certified)
-- 
-- NOTE: This migration creates the workshops table if it doesn't exist,
-- then adds operation_mode column. The workshops table is a lightweight
-- metadata table for workshop-level settings.
BEGIN;
-- Step 0: Add workshop_id to profiles if it doesn't exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'workshop_id'
) THEN
ALTER TABLE public.profiles
ADD COLUMN workshop_id UUID;
END IF;
END $$;
-- Step 1: Create workshops table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.workshops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Step 2: Add operation_mode column with default
ALTER TABLE public.workshops
ADD COLUMN IF NOT EXISTS operation_mode VARCHAR(20) DEFAULT 'production' NOT NULL;
-- Step 3: Add validation check constraint
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'check_operation_mode'
        AND conrelid = 'public.workshops'::regclass
) THEN
ALTER TABLE public.workshops
ADD CONSTRAINT check_operation_mode CHECK (
        operation_mode IN ('sandbox', 'production', 'certified')
    );
END IF;
END $$;
-- Step 4: Create index for frequent lookups during auth context building
CREATE INDEX IF NOT EXISTS idx_workshops_operation_mode ON public.workshops(operation_mode);
CREATE INDEX IF NOT EXISTS idx_workshops_owner_id ON public.workshops(owner_id);
-- Step 5: Add comment for documentation
COMMENT ON COLUMN public.workshops.operation_mode IS 'Determines the strictness of validation and audit logging (sandbox|production|certified)';
COMMENT ON TABLE public.workshops IS 'Workshop metadata and settings. Links to profiles via owner_id.';
-- Step 6: Enable RLS (Row Level Security)
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
-- Step 7: Create RLS policies
DROP POLICY IF EXISTS "Workshop owners can manage their workshops" ON public.workshops;
CREATE POLICY "Workshop owners can manage their workshops" ON public.workshops FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "Users can view workshops they belong to" ON public.workshops;
CREATE POLICY "Users can view workshops they belong to" ON public.workshops FOR
SELECT USING (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
                AND workshop_id = workshops.id
        )
    );
COMMIT;