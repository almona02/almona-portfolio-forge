-- Migration: Add Inspector Role
-- Author: Almona Engineering
-- Date: 2025-02-27
-- Purpose: Add 'inspector' role to fabricator_role enum for read-only audit access

BEGIN;

-- Add inspector role to enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'inspector' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'fabricator_role')
    ) THEN
        ALTER TYPE fabricator_role ADD VALUE IF NOT EXISTS 'inspector';
    END IF;
END $$;

COMMENT ON TYPE fabricator_role IS 'User roles in the fabricator system. Inspector role provides read-only access for audits.';

COMMIT;




























