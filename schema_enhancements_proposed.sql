-- ============================================================================
-- SCHEMA ENHANCEMENTS PROPOSED (SAFE / INCREMENTAL)
-- Generated: 2025-09-05
-- Purpose: Performance, Integrity, Security, Function Refactors, Analytics
-- NOTE: Copy sections you want into Supabase SQL editor incrementally.
--       Everything uses IF EXISTS / IF NOT EXISTS where possible to stay idempotent.
-- ============================================================================

-- =============================
-- 0. SAFETY GUARD RUNTIME INFO
-- =============================
-- View current active transactions & locks (OPTIONAL - run manually before applying heavy changes)
-- SELECT * FROM pg_stat_activity WHERE datname = current_database();
-- SELECT * FROM pg_locks l JOIN pg_class c ON l.relation = c.oid WHERE c.relkind = 'r';

-- ==========================================================
-- 1. PERFORMANCE: INDEX OPTIMIZATION & QUERY SELECTIVITY
-- ==========================================================
-- RATIONALE:
--  - Composite indexes for common filter patterns (user_id + status + created_at)
--  - Partial indexes to reduce bloat for active/open subsets
--  - Functional / GIN indexes for search and jsonb fields
--  - CONCURRENTLY where feasible (cannot be inside a transaction block in Supabase)

-- 1.1 TICKETS (Non-concurrent variant for environments that auto-wrap in a transaction)
CREATE INDEX IF NOT EXISTS idx_service_tickets_status_created_at
    ON public.service_tickets (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_tickets_user_status_created
    ON public.service_tickets (user_id, status, created_at DESC);

-- Partial: open/active tickets (exclude resolved/closed)
CREATE INDEX IF NOT EXISTS idx_service_tickets_active_partial
    ON public.service_tickets (priority, sla_response_due)
    WHERE status NOT IN ('resolved','closed');

-- SLA breach quick lookup
CREATE INDEX IF NOT EXISTS idx_service_tickets_sla_breached
    ON public.service_tickets (sla_breached)
    WHERE sla_breached = TRUE;

-- 1.2 QUOTES / ORDERS timeline queries
CREATE INDEX IF NOT EXISTS idx_quotes_user_status_created
    ON public.quotes (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_status_created
    ON public.orders (user_id, status, created_at DESC);

-- 1.3 PRODUCTS: active + category filter (assumes product_categories junction or category_id exists)
-- If you often filter active products only:
CREATE INDEX IF NOT EXISTS idx_products_active_partial
    ON public.products (created_at DESC)
    WHERE is_active = TRUE;

-- 1.4 JSONB / SEARCH: Add GIN on attributes/details fields if they exist
-- Conditional GIN index (run manually if column exists). Remove CONCURRENTLY if running inside a migration transaction.
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='products' AND column_name='attributes' AND data_type='jsonb'
    ) THEN
        -- dynamic check for existing index name
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_products_attributes_gin'
        ) THEN
            RAISE NOTICE 'Run separately (outside DO) -> CREATE INDEX IF NOT EXISTS idx_products_attributes_gin ON public.products USING gin (attributes);';
        END IF;
    END IF;
END $$;

-- =====================================================
-- 2. DATA INTEGRITY: CONSTRAINTS / CHECKS / UNIQUENESS
-- =====================================================
-- 2.1 Ensure ticket_number uniqueness (if not already unique)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conrelid = 'public.service_tickets'::regclass AND conname = 'service_tickets_ticket_number_key'
    ) THEN
        BEGIN
            EXECUTE 'ALTER TABLE public.service_tickets ADD CONSTRAINT service_tickets_ticket_number_key UNIQUE (ticket_number)';
        EXCEPTION WHEN duplicate_table THEN NULL; END;
    END IF;
END $$;

-- 2.2 Add CHECK to enforce logical SLA ordering
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'service_tickets_sla_order_check'
    ) THEN
        EXECUTE 'ALTER TABLE public.service_tickets ADD CONSTRAINT service_tickets_sla_order_check CHECK (sla_response_due IS NULL OR sla_resolution_due IS NULL OR sla_response_due <= sla_resolution_due)';
    END IF;
END $$;

-- 2.3 Prevent negative pricing (example for products.price)
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='price'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conrelid='public.products'::regclass AND conname='products_price_nonnegative'
    ) THEN
        EXECUTE 'ALTER TABLE public.products ADD CONSTRAINT products_price_nonnegative CHECK (price IS NULL OR price >= 0)';
    END IF;
END $$;

-- 2.4 Quote numeric consistency (subtotal <= total_amount if both present)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conrelid='public.quotes'::regclass AND conname='quotes_subtotal_total_check'
    ) THEN
        EXECUTE 'ALTER TABLE public.quotes ADD CONSTRAINT quotes_subtotal_total_check CHECK (subtotal IS NULL OR total_amount IS NULL OR subtotal <= total_amount)';
    END IF;
END $$;

-- =============================================================
-- 3. SECURITY & RLS HARDENING / LEAST PRIVILEGE IMPROVEMENTS
-- =============================================================
-- 3.1 Ensure all future functions run with explicit search_path
-- Template helper (create any new functions with: SET search_path = public, pg_temp;)

-- 3.2 Lock down notifications so only owner sees them (if not already)
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='notifications'
    ) THEN
        -- Add restrictive policy if missing
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Users view own notifications'
        ) THEN
            EXECUTE 'CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid())';
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Users modify own notifications'
        ) THEN
            EXECUTE 'CREATE POLICY "Users modify own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid())';
        END IF;
    END IF;
END $$;

-- 3.3 Optional: Deny by default (ensure NO policy allows broad SELECT true on sensitive tables)
-- (Manual review recommended before automatic revocation.)

-- =============================================================
-- 4. FUNCTION REFACTOR: SEQUENCE-BASED TICKET NUMBERING
-- =============================================================
-- Current pattern parses max numeric suffix per year (risk: race conditions under concurrency).
-- Proposal: Dedicated sequence + year prefix. (No yearly reset needed unless business requires.)

-- 4.1 Create sequence (idempotent)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class WHERE relkind='S' AND relname='ticket_number_global_seq'
    ) THEN
        EXECUTE 'CREATE SEQUENCE ticket_number_global_seq';
    END IF;
END $$;

-- 4.2 New function (keeps old one intact; switch triggers after validation)
CREATE OR REPLACE FUNCTION public.generate_ticket_number_seq()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    next_val BIGINT;
    yr text := to_char(now(),'YYYY');
BEGIN
    SELECT nextval('ticket_number_global_seq') INTO next_val;
    RETURN 'TKT-' || yr || '-' || lpad(next_val::text, 8, '0');
END; $$;

-- 4.3 OPTIONAL: Switch trigger logic to use new function (commented out until ready)
-- UPDATE: Uncomment after testing consistency.
-- DO $$ BEGIN
--     IF EXISTS (
--         SELECT 1 FROM information_schema.triggers 
--         WHERE event_object_table='service_tickets' AND trigger_name='service_tickets_before_insert'
--     ) THEN
--         -- Adjust handle_new_ticket function instead if it calls old generator
--         -- Example patch (pseudo, apply manually):
--         -- CREATE OR REPLACE FUNCTION public.handle_new_ticket() ...
--         --   IF NEW.ticket_number IS NULL OR NEW.ticket_number='' THEN
--         --       NEW.ticket_number := public.generate_ticket_number_seq();
--         --   END IF; ...
--     END IF;
-- END $$;

-- 4.4 SLA recalculation helper (bulk fix when priority/type changes)
CREATE OR REPLACE FUNCTION public.recalculate_sla_for_ticket(p_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    r RECORD;
    dates RECORD;
BEGIN
    SELECT id, priority, type, created_at, first_response_at, status INTO r
    FROM public.service_tickets WHERE id = p_ticket_id;
    IF NOT FOUND THEN
        RETURN; -- ticket not found, nothing to do
    END IF;
    SELECT response_due, resolution_due INTO dates
    FROM public.calculate_sla_dates(r.priority, r.type, r.created_at);

    UPDATE public.service_tickets
    SET sla_response_due = dates.response_due,
        sla_resolution_due = dates.resolution_due
    WHERE id = p_ticket_id;
END; $$;

-- 4.5 Bulk recalculation procedure (for migrations)
CREATE OR REPLACE FUNCTION public.recalculate_sla_bulk(limit_rows integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    c int := 0;
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.service_tickets ORDER BY created_at DESC LIMIT limit_rows LOOP
        PERFORM public.recalculate_sla_for_ticket(r.id);
        c := c + 1;
    END LOOP;
    RETURN c;
END; $$;

-- =============================================================
-- 5. ANALYTICS & OBSERVABILITY (MATERIALIZED VIEWS)
-- =============================================================
-- 5.1 Daily SLA performance aggregation
CREATE TABLE IF NOT EXISTS public.ticket_sla_daily_metrics (
    metric_date date PRIMARY KEY,
    total_tickets int DEFAULT 0,
    responded_within_sla int DEFAULT 0,
    resolved_within_sla int DEFAULT 0,
    breached int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Incremental upsert function
CREATE OR REPLACE FUNCTION public.refresh_ticket_sla_daily_metrics(p_day date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    rec RECORD;
BEGIN
    SELECT 
        COUNT(*) AS total_tickets,
        COUNT(CASE WHEN first_response_at IS NOT NULL AND first_response_at <= sla_response_due THEN 1 END) AS responded_within_sla,
        COUNT(CASE WHEN resolved_at IS NOT NULL AND resolved_at <= sla_resolution_due THEN 1 END) AS resolved_within_sla,
        COUNT(CASE WHEN sla_breached = TRUE THEN 1 END) AS breached
    INTO rec
    FROM public.service_tickets
    WHERE created_at::date = p_day;

    INSERT INTO public.ticket_sla_daily_metrics(metric_date,total_tickets,responded_within_sla,resolved_within_sla,breached)
    VALUES(p_day, COALESCE(rec.total_tickets,0), COALESCE(rec.responded_within_sla,0), COALESCE(rec.resolved_within_sla,0), COALESCE(rec.breached,0))
    ON CONFLICT (metric_date) DO UPDATE SET
        total_tickets = EXCLUDED.total_tickets,
        responded_within_sla = EXCLUDED.responded_within_sla,
        resolved_within_sla = EXCLUDED.resolved_within_sla,
        breached = EXCLUDED.breached;
END; $$;

-- 5.2 Materialized view: top products (by quote items / order items) - ADJUST if table names differ
-- (Example assumes quote_items has product_id & quantity; adapt if you have order_items table.)
-- Create materialized view (ensure underlying table exists). If quote_items doesn't exist, skip.
-- Materialized view (requires table public.quote_items). Run this only after quote_items exists.
-- If quote_items is absent, skip this block.
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_top_products AS
SELECT qi.product_id,
       COUNT(*) AS line_items,
       SUM(qi.quantity) AS total_units,
       MAX(qi.created_at) AS last_seen
FROM public.quote_items qi
GROUP BY qi.product_id;

-- Unique index required for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS mv_top_products_product_id_uidx ON public.mv_top_products (product_id);

-- 5.3 Helper to refresh materialized view
-- NOTE: REFRESH MATERIALIZED VIEW CONCURRENTLY cannot run inside a transaction block
-- and also cannot be executed from within a PL/pgSQL function safely when concurrency is needed.
-- Provide a simple non-concurrent refresh helper; use manual CONCURRENTLY in an ad-hoc session if needed:
--   REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_top_products;  -- run manually
CREATE OR REPLACE FUNCTION public.refresh_mv_top_products()
RETURNS void
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
    REFRESH MATERIALIZED VIEW public.mv_top_products;
$$;

-- =============================================================
-- 6. HOUSEKEEPING / MAINTENANCE HINTS (MANUAL)
-- =============================================================
-- (Run manually in cron/jobs or Supabase scheduled tasks):
-- SELECT public.refresh_ticket_sla_daily_metrics(current_date);
-- SELECT public.refresh_mv_top_products();
-- VACUUM (VERBOSE, ANALYZE) public.service_tickets;  -- heavy, schedule off-peak
-- REINDEX INDEX CONCURRENTLY idx_service_tickets_status_created_at; -- if bloat detected

-- =============================================================
-- 7. ROLLBACK NOTES
-- =============================================================
-- To drop added objects if needed:
-- DROP FUNCTION public.generate_ticket_number_seq();
-- DROP SEQUENCE ticket_number_global_seq;
-- DROP MATERIALIZED VIEW public.mv_top_products;
-- DROP TABLE public.ticket_sla_daily_metrics;

-- =============================================================
-- END OF SCRIPT
-- =============================================================
