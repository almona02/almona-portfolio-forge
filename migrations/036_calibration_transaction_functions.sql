-- Calibration Safety Net - Transaction Functions
-- ================================================
-- PostgreSQL functions for atomic, transactional operations on calibration data.
-- These functions use SECURITY DEFINER to bypass RLS and advisory locks for
-- concurrency control.
--
-- Functions:
-- 1. certify_calibration_baseline() - Atomic baseline certification
-- 2. freeze_calibration() - Freeze learning due to drift/anomaly
-- 3. log_calibration_anomaly() - Idempotent anomaly logging with deduplication
-- 4. get_calibration_baseline() - Safe baseline lookup
-- ============================================================================
-- FUNCTION: Certify Calibration Baseline
-- ============================================================================
-- Atomically certifies a baseline and updates the status registry.
-- Uses advisory locks to prevent concurrent certification attempts.
CREATE OR REPLACE FUNCTION certify_calibration_baseline(
        p_profile_id VARCHAR,
        p_joint_type VARCHAR,
        p_baseline_version VARCHAR,
        p_baseline_hash VARCHAR,
        p_k_factor DECIMAL,
        p_confidence DECIMAL,
        p_certified_by VARCHAR,
        p_model_version VARCHAR,
        p_workshop_id VARCHAR DEFAULT NULL,
        p_sample_size INTEGER DEFAULT 0,
        p_reasoning JSONB DEFAULT '[]'::jsonb
    ) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_lock_key INTEGER;
v_baseline_id UUID;
v_registry_id UUID;
BEGIN -- Generate advisory lock key (namespaced to prevent collisions)
v_lock_key := hashtext(
    'calibration_certify:' || p_profile_id || '|' || p_joint_type || '|' || COALESCE(p_workshop_id, 'global')
);
-- Acquire advisory lock (transaction-level, auto-released on commit/rollback)
PERFORM pg_advisory_xact_lock(v_lock_key);
-- Check if baseline already exists (idempotency)
SELECT id INTO v_baseline_id
FROM public.calibration_baselines
WHERE profile_id = p_profile_id
    AND joint_type = p_joint_type
    AND COALESCE(workshop_id, '') = COALESCE(p_workshop_id, '')
    AND baseline_version = p_baseline_version
    AND baseline_hash = p_baseline_hash;
-- If baseline exists, return existing ID
IF v_baseline_id IS NOT NULL THEN RETURN v_baseline_id;
END IF;
-- Validate confidence for certified status
IF p_confidence < 0.85 THEN RAISE EXCEPTION 'Confidence must be >= 0.85 for certified baseline, got %',
p_confidence;
END IF;
-- Insert new baseline
INSERT INTO public.calibration_baselines (
        profile_id,
        joint_type,
        workshop_id,
        baseline_version,
        baseline_hash,
        k_factor,
        confidence,
        certified_by,
        sample_size,
        model_version,
        reasoning,
        status
    )
VALUES (
        p_profile_id,
        p_joint_type,
        p_workshop_id,
        p_baseline_version,
        p_baseline_hash,
        p_k_factor,
        p_confidence,
        p_certified_by,
        p_sample_size,
        p_model_version,
        p_reasoning,
        'certified'
    )
RETURNING id INTO v_baseline_id;
-- Update or insert status registry (handle NULL workshop_id)
INSERT INTO public.calibration_status_registry (
        profile_id,
        joint_type,
        workshop_id,
        status,
        current_baseline_id
    )
SELECT p_profile_id,
    p_joint_type,
    p_workshop_id,
    'certified',
    v_baseline_id
WHERE NOT EXISTS (
        SELECT 1
        FROM public.calibration_status_registry
        WHERE profile_id = p_profile_id
            AND joint_type = p_joint_type
            AND (
                workshop_id IS NOT DISTINCT
                FROM p_workshop_id
            )
    );
-- Update if exists
UPDATE public.calibration_status_registry
SET status = 'certified',
    current_baseline_id = v_baseline_id,
    updated_at = NOW()
WHERE profile_id = p_profile_id
    AND joint_type = p_joint_type
    AND (
        workshop_id IS NOT DISTINCT
        FROM p_workshop_id
    );
RETURN v_baseline_id;
EXCEPTION
WHEN OTHERS THEN RAISE EXCEPTION 'Failed to certify baseline: %',
SQLERRM;
END;
$$;
-- ============================================================================
-- FUNCTION: Freeze Calibration
-- ============================================================================
-- Freezes calibration learning for a profile/joint due to drift or anomaly.
-- Uses advisory locks to prevent concurrent freeze attempts.
CREATE OR REPLACE FUNCTION freeze_calibration(
        p_profile_id VARCHAR,
        p_joint_type VARCHAR,
        p_frozen_reason TEXT,
        p_workshop_id VARCHAR DEFAULT NULL
    ) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_lock_key INTEGER;
v_registry_id UUID;
BEGIN -- Generate advisory lock key
v_lock_key := hashtext(
    'calibration_freeze:' || p_profile_id || '|' || p_joint_type || '|' || COALESCE(p_workshop_id, 'global')
);
-- Acquire advisory lock
PERFORM pg_advisory_xact_lock(v_lock_key);
-- Update or insert status registry (handle NULL workshop_id)
INSERT INTO public.calibration_status_registry (
        profile_id,
        joint_type,
        workshop_id,
        status,
        frozen_reason,
        frozen_at
    )
SELECT p_profile_id,
    p_joint_type,
    p_workshop_id,
    'frozen',
    p_frozen_reason,
    NOW()
WHERE NOT EXISTS (
        SELECT 1
        FROM public.calibration_status_registry
        WHERE profile_id = p_profile_id
            AND joint_type = p_joint_type
            AND (
                workshop_id IS NOT DISTINCT
                FROM p_workshop_id
            )
    );
-- Update if exists
UPDATE public.calibration_status_registry
SET status = 'frozen',
    frozen_reason = p_frozen_reason,
    frozen_at = NOW(),
    updated_at = NOW()
WHERE profile_id = p_profile_id
    AND joint_type = p_joint_type
    AND (
        workshop_id IS NOT DISTINCT
        FROM p_workshop_id
    );
RETURN TRUE;
EXCEPTION
WHEN OTHERS THEN RAISE EXCEPTION 'Failed to freeze calibration: %',
SQLERRM;
END;
$$;
-- ============================================================================
-- FUNCTION: Log Calibration Anomaly
-- ============================================================================
-- Logs a calibration anomaly with deduplication window (default 5 minutes).
-- If a similar anomaly exists within the window, updates its timestamp instead
-- of creating a duplicate.
CREATE OR REPLACE FUNCTION log_calibration_anomaly(
        p_profile_id VARCHAR,
        p_joint_type VARCHAR,
        p_anomaly_type VARCHAR,
        p_severity VARCHAR,
        p_workshop_id VARCHAR DEFAULT NULL,
        p_details JSONB DEFAULT '{}'::jsonb,
        p_execution_context JSONB DEFAULT '{}'::jsonb,
        p_deduplicate_window_minutes INTEGER DEFAULT 5
    ) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_existing_id UUID;
v_anomaly_id UUID;
BEGIN -- Check for existing unresolved anomaly within deduplication window
SELECT id INTO v_existing_id
FROM public.calibration_anomalies
WHERE profile_id = p_profile_id
    AND joint_type = p_joint_type
    AND COALESCE(workshop_id, '') = COALESCE(p_workshop_id, '')
    AND anomaly_type = p_anomaly_type
    AND severity = p_severity
    AND NOT resolved
    AND created_at > NOW() - (p_deduplicate_window_minutes || ' minutes')::INTERVAL
    AND details @> p_details -- JSONB contains check
ORDER BY created_at DESC
LIMIT 1;
-- If duplicate exists, update timestamp and return existing ID
IF v_existing_id IS NOT NULL THEN
UPDATE public.calibration_anomalies
SET created_at = NOW()
WHERE id = v_existing_id;
RETURN v_existing_id;
END IF;
-- Insert new anomaly
INSERT INTO public.calibration_anomalies (
        profile_id,
        joint_type,
        workshop_id,
        anomaly_type,
        severity,
        details,
        execution_context
    )
VALUES (
        p_profile_id,
        p_joint_type,
        p_workshop_id,
        p_anomaly_type,
        p_severity,
        p_details,
        p_execution_context
    )
RETURNING id INTO v_anomaly_id;
RETURN v_anomaly_id;
EXCEPTION
WHEN OTHERS THEN RAISE EXCEPTION 'Failed to log anomaly: %',
SQLERRM;
END;
$$;
-- ============================================================================
-- FUNCTION: Get Calibration Baseline
-- ============================================================================
-- Safely retrieves the current certified baseline for a profile/joint/workshop.
-- Returns NULL if no certified baseline exists (no exception).
CREATE OR REPLACE FUNCTION get_calibration_baseline(
        p_profile_id VARCHAR,
        p_joint_type VARCHAR,
        p_workshop_id VARCHAR DEFAULT NULL
    ) RETURNS TABLE (
        baseline_id UUID,
        k_factor DECIMAL,
        confidence DECIMAL,
        baseline_version VARCHAR,
        baseline_hash VARCHAR,
        certified_at TIMESTAMPTZ,
        certified_by VARCHAR,
        status calibration_status
    ) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN RETURN QUERY
SELECT b.id as baseline_id,
    b.k_factor,
    b.confidence,
    b.baseline_version,
    b.baseline_hash,
    b.certified_at,
    b.certified_by,
    r.status
FROM public.calibration_status_registry r
    LEFT JOIN public.calibration_baselines b ON r.current_baseline_id = b.id
WHERE r.profile_id = p_profile_id
    AND r.joint_type = p_joint_type
    AND COALESCE(r.workshop_id, '') = COALESCE(p_workshop_id, '')
    AND r.status = 'certified'
LIMIT 1;
-- If no certified baseline, return NULL (no exception)
IF NOT FOUND THEN RETURN;
END IF;
END;
$$;
-- ============================================================================
-- PERMISSIONS
-- ============================================================================
-- Grant execute permissions to service role and authenticated users
GRANT EXECUTE ON FUNCTION certify_calibration_baseline(
        VARCHAR,
        VARCHAR,
        VARCHAR,
        VARCHAR,
        DECIMAL,
        DECIMAL,
        VARCHAR,
        VARCHAR,
        VARCHAR,
        INTEGER,
        JSONB
    ) TO service_role,
    authenticated;
GRANT EXECUTE ON FUNCTION freeze_calibration(VARCHAR, VARCHAR, TEXT, VARCHAR) TO service_role,
    authenticated;
GRANT EXECUTE ON FUNCTION log_calibration_anomaly(
        VARCHAR,
        VARCHAR,
        VARCHAR,
        VARCHAR,
        VARCHAR,
        JSONB,
        JSONB,
        INTEGER
    ) TO service_role,
    authenticated;
GRANT EXECUTE ON FUNCTION get_calibration_baseline(VARCHAR, VARCHAR, VARCHAR) TO service_role,
    authenticated;
-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION certify_calibration_baseline IS 'Atomically certifies a calibration baseline and updates status registry. 
     Uses advisory locks for concurrency control.';
COMMENT ON FUNCTION freeze_calibration IS 'Freezes calibration learning for a profile/joint due to drift or anomaly.';
COMMENT ON FUNCTION log_calibration_anomaly IS 'Logs calibration anomaly with deduplication window (default 5 minutes).';
COMMENT ON FUNCTION get_calibration_baseline IS 'Safely retrieves current certified baseline. Returns NULL if none exists.';