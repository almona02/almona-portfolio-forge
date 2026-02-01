-- Migration 060: System Pricing History Table
-- -----------------------------------------------------------------------------
-- Creates system_pricing_history table for tracking price changes to system_pricing
-- configurations stored in fabricator_profiles.specifications.system_pricing
-- 
-- Features:
-- - Full audit trail of pricing changes
-- - Versioned pricing data snapshots
-- - Support for rollback functionality
-- - Links to system_pack_id and profile_id
-- - User tracking and change reasons
-- 
-- @since Pricing Tuning Studio - Gold Tier Enhancement
-- Create system_pricing_history table
CREATE TABLE IF NOT EXISTS public.system_pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_pack_id TEXT NOT NULL,
  profile_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Full pricing state snapshot (JSONB for flexibility)
  pricing_data JSONB NOT NULL,
  -- Change metadata
  change_type TEXT NOT NULL DEFAULT 'update' CHECK (
    change_type IN (
      'update',
      'bulk_update',
      'rollback',
      'initial_setup'
    )
  ),
  reason TEXT,
  version_number INTEGER NOT NULL DEFAULT 1,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Foreign key to fabricator_profiles
  CONSTRAINT fk_profile FOREIGN KEY (profile_id) REFERENCES public.fabricator_profiles(id) ON DELETE CASCADE
);
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_pricing_history_profile_system ON public.system_pricing_history(profile_id, system_pack_id);
CREATE INDEX IF NOT EXISTS idx_system_pricing_history_user ON public.system_pricing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_system_pricing_history_created ON public.system_pricing_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_pricing_history_change_type ON public.system_pricing_history(change_type);
CREATE INDEX IF NOT EXISTS idx_system_pricing_history_version ON public.system_pricing_history(profile_id, system_pack_id, version_number);
-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_system_pricing_history_lookup ON public.system_pricing_history(profile_id, system_pack_id, created_at DESC);
-- Enable Row Level Security
ALTER TABLE public.system_pricing_history ENABLE ROW LEVEL SECURITY;
-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own pricing history" ON public.system_pricing_history;
CREATE POLICY "Users can view their own pricing history" ON public.system_pricing_history FOR
SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own pricing history" ON public.system_pricing_history;
CREATE POLICY "Users can insert their own pricing history" ON public.system_pricing_history FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- Function to get next version number for a profile/system_pack combination
CREATE OR REPLACE FUNCTION get_next_pricing_version(p_profile_id UUID, p_system_pack_id TEXT) RETURNS INTEGER AS $$
DECLARE v_max_version INTEGER;
BEGIN
SELECT COALESCE(MAX(version_number), 0) INTO v_max_version
FROM public.system_pricing_history
WHERE profile_id = p_profile_id
  AND system_pack_id = p_system_pack_id;
RETURN v_max_version + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Comments for documentation
COMMENT ON TABLE public.system_pricing_history IS 'Audit trail of all system pricing changes. Stores full pricing state snapshots for rollback capability.';
COMMENT ON COLUMN public.system_pricing_history.pricing_data IS 'Complete snapshot of system_pricing state (matches fabricator_profiles.specifications.system_pricing structure)';
COMMENT ON COLUMN public.system_pricing_history.change_type IS 'Type of change: update (manual), bulk_update (bulk operation), rollback (restored from history), initial_setup (first configuration)';
COMMENT ON COLUMN public.system_pricing_history.version_number IS 'Sequential version number per profile/system_pack combination, used for rollback identification';
COMMENT ON COLUMN public.system_pricing_history.reason IS 'Optional user-provided reason for the price change';