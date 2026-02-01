-- Migration: Create CNC Safety Logs Table
-- Purpose: Track all 3-step safety verification events for audit trail
-- Date: 2026-01-XX
-- Gold Tier: Comprehensive safety logging with full audit trail
-- Create cnc_safety_logs table
CREATE TABLE IF NOT EXISTS public.cnc_safety_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    machine_type TEXT,
    -- Step 1: Safety Warning Acknowledgment
    verification_step_1_at TIMESTAMPTZ,
    step_1_ip INET,
    step_1_warnings_acknowledged TEXT [],
    -- Step 2: Toolpath Preview & Collision Check
    verification_step_2_at TIMESTAMPTZ,
    step_2_ip INET,
    collision_check_passed BOOLEAN,
    step_2_collisions_detected INTEGER DEFAULT 0,
    step_2_out_of_bounds INTEGER DEFAULT 0,
    -- Step 3: Final Verification & Digital Signature
    verification_step_3_at TIMESTAMPTZ,
    step_3_ip INET,
    digital_signature_hash TEXT,
    gcode_hash_before TEXT,
    gcode_hash_after TEXT,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Constraints
    CONSTRAINT unique_job_id UNIQUE (job_id)
);
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cnc_safety_logs_job_id ON public.cnc_safety_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_cnc_safety_logs_user_id ON public.cnc_safety_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_cnc_safety_logs_created_at ON public.cnc_safety_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cnc_safety_logs_machine_type ON public.cnc_safety_logs(machine_type);
-- Enable Row Level Security
ALTER TABLE public.cnc_safety_logs ENABLE ROW LEVEL SECURITY;
-- RLS Policies
-- Users can view their own safety logs
CREATE POLICY "Users can view their own safety logs" ON public.cnc_safety_logs FOR
SELECT USING (auth.uid() = user_id);
-- Users can insert their own safety logs
CREATE POLICY "Users can insert their own safety logs" ON public.cnc_safety_logs FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- Users can update their own safety logs (for step-by-step updates)
CREATE POLICY "Users can update their own safety logs" ON public.cnc_safety_logs FOR
UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Admins can view all safety logs
CREATE POLICY "Admins can view all safety logs" ON public.cnc_safety_logs FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
        )
    );
-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_cnc_safety_logs_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_cnc_safety_logs_updated_at BEFORE
UPDATE ON public.cnc_safety_logs FOR EACH ROW EXECUTE FUNCTION update_cnc_safety_logs_updated_at();
-- Add comments for documentation
COMMENT ON TABLE public.cnc_safety_logs IS 'Tracks all 3-step safety verification events for CNC G-code exports';
COMMENT ON COLUMN public.cnc_safety_logs.job_id IS 'Unique job/project identifier';
COMMENT ON COLUMN public.cnc_safety_logs.verification_step_1_at IS 'Timestamp when Step 1 (Safety Warnings) was completed';
COMMENT ON COLUMN public.cnc_safety_logs.verification_step_2_at IS 'Timestamp when Step 2 (Toolpath Preview) was completed';
COMMENT ON COLUMN public.cnc_safety_logs.verification_step_3_at IS 'Timestamp when Step 3 (Final Verification) was completed';
COMMENT ON COLUMN public.cnc_safety_logs.digital_signature_hash IS 'Cryptographic hash of digital signature';
COMMENT ON COLUMN public.cnc_safety_logs.gcode_hash_before IS 'G-code hash before generation (for verification)';
COMMENT ON COLUMN public.cnc_safety_logs.gcode_hash_after IS 'G-code hash after generation (for verification)';