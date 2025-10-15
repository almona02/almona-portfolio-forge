-- Schema Performance & Optimization Enhancements
-- Safe, additive changes: improved ticket number generation, additional indexes, and helper objects.
-- Apply AFTER the base secure schema (service-ticketing-system-secure.sql).

-- 1. Deterministic & O(1) ticket number generation (replaces regex MAX scan)
CREATE TABLE IF NOT EXISTS public.ticket_number_sequences (
    year INTEGER PRIMARY KEY,
    last_value INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function: lock‑free style using retry loop; avoids full table scan & regex each insert
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    current_year INT := EXTRACT(YEAR FROM NOW())::INT;
    next_val INT;
BEGIN
    LOOP
        UPDATE public.ticket_number_sequences
        SET last_value = last_value + 1, updated_at = NOW()
        WHERE year = current_year
        RETURNING last_value INTO next_val;
        IF FOUND THEN EXIT; END IF;
        BEGIN
            INSERT INTO public.ticket_number_sequences(year, last_value) VALUES (current_year, 0)
            ON CONFLICT (year) DO NOTHING;
        EXCEPTION WHEN unique_violation THEN
            -- another session inserted concurrently; loop will retry
        END;
    END LOOP;

    RETURN 'TKT-' || current_year || '-' || LPAD(next_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON TABLE public.ticket_number_sequences IS 'Per-year ticket sequence for fast ticket number generation.';
COMMENT ON FUNCTION public.generate_ticket_number() IS 'Generates sequential ticket numbers without scanning service_tickets.';

-- 2. Additional targeted indexes (evaluate with pg_stat_statements before/after)
-- Composite / covering patterns for common dashboard filters
CREATE INDEX IF NOT EXISTS idx_service_tickets_status_priority_created ON public.service_tickets(status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_tickets_assigned_status ON public.service_tickets(assigned_to, status) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_tickets_open_active ON public.service_tickets(status) WHERE status IN ('open','assigned','in_progress');
CREATE INDEX IF NOT EXISTS idx_service_tickets_sla_breached ON public.service_tickets(sla_breached) WHERE sla_breached = TRUE;

-- JSONB fields (future text / part searches)
CREATE INDEX IF NOT EXISTS idx_ticket_messages_spare_parts_gin ON public.ticket_messages USING gin (spare_parts_details jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_attachments_gin ON public.ticket_messages USING gin (attachments jsonb_path_ops);

-- 3. MATERIALIZED VIEW for heavier SLA aggregation (optional dashboard usage)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.sla_performance_mv AS
SELECT 
    type,
    priority,
    COUNT(*)                             AS total_tickets,
    COUNT(*) FILTER (WHERE first_response_at IS NOT NULL) AS responded_tickets,
    COUNT(*) FILTER (WHERE status IN ('resolved','closed')) AS resolved_tickets,
    COUNT(*) FILTER (WHERE sla_breached) AS sla_breached_tickets,
    AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))/3600) FILTER (WHERE first_response_at IS NOT NULL) AS avg_response_time_hours,
    AVG(EXTRACT(EPOCH FROM ((COALESCE(resolved_at, closed_at)) - created_at))/3600) FILTER (WHERE status IN ('resolved','closed')) AS avg_resolution_time_hours,
    NOW() AS snapshot_at
FROM public.service_tickets
GROUP BY type, priority;

CREATE INDEX IF NOT EXISTS idx_sla_performance_mv_type_priority ON public.sla_performance_mv(type, priority);

-- Helper function to refresh MV (CALL public.refresh_sla_performance())
CREATE OR REPLACE FUNCTION public.refresh_sla_performance()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.sla_performance_mv;
END;
$$ LANGUAGE plpgsql SET search_path = public;

GRANT SELECT ON public.sla_performance_mv TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_sla_performance() TO authenticated;

-- 4. Advisory notes (not executed):
-- * Consider dropping single-column indexes redundant with new leading composite columns AFTER confirming via pg_stat_statements.
-- * Monitor bloat & VACUUM ANALYZE after large churn.
-- * For full-text search later: add tsvector column & GIN index (NOT included to keep patch minimal).

SELECT 'Performance enhancements applied (indexes, sequence-based ticket numbers, SLA MV).' AS message;
