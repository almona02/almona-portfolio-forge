-- Hardener Selections Database Migration
-- Implements database schema for hardener code selections and audit logging
-- 
-- Constitutional Compliance: AICS-001 §7.4 (Audit Trail Doctrine)
-- 
-- @since Phase 1: Precision Upgrade Plan (January 2026)
-- ============================================================================
-- 1. Hardener Selections Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.hardener_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    window_unit_id TEXT NOT NULL,
    -- References window unit identifier
    project_id UUID REFERENCES public.fabricator_projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    -- Selection Context (from HardenerSelectionContext)
    profile_system TEXT NOT NULL,
    material TEXT NOT NULL CHECK (material IN ('aluminum', 'upvc')),
    glass_thickness_mm DECIMAL(5, 2) NOT NULL,
    sash_width_mm DECIMAL(8, 2) NOT NULL,
    sash_height_mm DECIMAL(8, 2) NOT NULL,
    opening_type TEXT NOT NULL CHECK (
        opening_type IN (
            'casement',
            'tilt-turn',
            'sliding',
            'fixed',
            'pivot'
        )
    ),
    region TEXT CHECK (
        region IN ('egypt', 'uae', 'saudi', 'kuwait', 'qatar')
    ),
    -- Selection Result (from HardenerSelectionResult)
    hardener_code TEXT NOT NULL,
    rule_id TEXT NOT NULL,
    validation_status TEXT NOT NULL CHECK (validation_status IN ('PASS', 'FAIL', 'WARNING')),
    system_stop_required BOOLEAN NOT NULL DEFAULT FALSE,
    requires_human_intervention BOOLEAN NOT NULL DEFAULT FALSE,
    -- Validation Details (JSONB for flexibility)
    validation_details JSONB DEFAULT '{}'::jsonb,
    justification TEXT,
    constitutional_disclaimer TEXT,
    -- Metadata
    system_mode TEXT NOT NULL CHECK (
        system_mode IN ('sandbox', 'production', 'certified')
    ) DEFAULT 'production',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Constraints
    CONSTRAINT valid_glass_thickness CHECK (
        glass_thickness_mm > 0
        AND glass_thickness_mm <= 30
    ),
    CONSTRAINT valid_sash_dimensions CHECK (
        sash_width_mm > 0
        AND sash_height_mm > 0
    )
);
-- ============================================================================
-- 2. Hardener Audit Log Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.hardener_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    selection_id UUID REFERENCES public.hardener_selections(id) ON DELETE CASCADE NOT NULL,
    window_unit_id TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE
    SET NULL,
        -- Audit Context
        selection_context JSONB NOT NULL,
        -- Full HardenerSelectionContext
        selection_result JSONB NOT NULL,
        -- Full HardenerSelectionResult
        -- Audit Metadata
        audit_hash TEXT,
        -- Hash for integrity verification
        system_mode TEXT NOT NULL CHECK (
            system_mode IN ('sandbox', 'production', 'certified')
        ),
        ip_address INET,
        user_agent TEXT,
        -- Timestamp
        created_at TIMESTAMPTZ DEFAULT NOW()
);
-- ============================================================================
-- 3. Indexes for Performance
-- ============================================================================
-- Hardener selections indexes
CREATE INDEX IF NOT EXISTS idx_hardener_selections_window_unit_id ON public.hardener_selections(window_unit_id);
CREATE INDEX IF NOT EXISTS idx_hardener_selections_project_id ON public.hardener_selections(project_id)
WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hardener_selections_user_id ON public.hardener_selections(user_id);
CREATE INDEX IF NOT EXISTS idx_hardener_selections_created_at ON public.hardener_selections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hardener_selections_hardener_code ON public.hardener_selections(hardener_code);
CREATE INDEX IF NOT EXISTS idx_hardener_selections_validation_status ON public.hardener_selections(validation_status);
-- Composite index for common queries (window unit + user)
CREATE INDEX IF NOT EXISTS idx_hardener_selections_window_user ON public.hardener_selections(window_unit_id, user_id);
-- Hardener audit log indexes
CREATE INDEX IF NOT EXISTS idx_hardener_audit_log_selection_id ON public.hardener_audit_log(selection_id);
CREATE INDEX IF NOT EXISTS idx_hardener_audit_log_window_unit_id ON public.hardener_audit_log(window_unit_id);
CREATE INDEX IF NOT EXISTS idx_hardener_audit_log_user_id ON public.hardener_audit_log(user_id)
WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hardener_audit_log_created_at ON public.hardener_audit_log(created_at DESC);
-- ============================================================================
-- 4. RLS (Row Level Security) Policies
-- ============================================================================
-- Enable RLS
ALTER TABLE public.hardener_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hardener_audit_log ENABLE ROW LEVEL SECURITY;
-- Policy: Users can view their own hardener selections
CREATE POLICY "Users can view their own hardener selections" ON public.hardener_selections FOR
SELECT USING (auth.uid() = user_id);
-- Policy: Users can insert their own hardener selections
CREATE POLICY "Users can insert their own hardener selections" ON public.hardener_selections FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- Policy: Users can update their own hardener selections
CREATE POLICY "Users can update their own hardener selections" ON public.hardener_selections FOR
UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Policy: Users can view audit logs for their selections
CREATE POLICY "Users can view audit logs for their selections" ON public.hardener_audit_log FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.hardener_selections hs
            WHERE hs.id = hardener_audit_log.selection_id
                AND hs.user_id = auth.uid()
        )
    );
-- Policy: System can insert audit logs (via service role)
-- Note: This requires service role key, handled in application layer
-- ============================================================================
-- 5. Updated At Trigger
-- ============================================================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hardener_selections_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger for hardener_selections
CREATE TRIGGER trigger_update_hardener_selections_updated_at BEFORE
UPDATE ON public.hardener_selections FOR EACH ROW EXECUTE FUNCTION update_hardener_selections_updated_at();
-- ============================================================================
-- 6. Comments for Documentation
-- ============================================================================
COMMENT ON TABLE public.hardener_selections IS 'Stores hardener code selections for window units. Constitutional compliance: AICS-001 §7.4';
COMMENT ON TABLE public.hardener_audit_log IS 'Audit trail for all hardener selection decisions. Constitutional compliance: AICS-001 §7.4';
COMMENT ON COLUMN public.hardener_selections.hardener_code IS 'Selected hardener code (e.g., HX-14-A-C). Tier 3 deterministic selection.';
COMMENT ON COLUMN public.hardener_selections.rule_id IS 'Rule ID that selected this hardener (e.g., HD-EG-ALU-12).';
COMMENT ON COLUMN public.hardener_selections.validation_status IS 'Validation status: PASS, FAIL, or WARNING. FAIL requires system stop.';
COMMENT ON COLUMN public.hardener_selections.system_stop_required IS 'If true, manufacturing cannot proceed (AICS-001 §2.8).';
COMMENT ON COLUMN public.hardener_audit_log.audit_hash IS 'Hash for integrity verification of audit record (AICS-001 §7.4).';