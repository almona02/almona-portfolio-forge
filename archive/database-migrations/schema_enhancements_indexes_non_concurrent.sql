-- ============================================================================
-- NON-CONCURRENT INDEX CREATION FALLBACK
-- Use ONLY if your SQL execution environment (e.g., Supabase SQL editor batch)
-- automatically wraps multiple statements in a transaction, causing:
--   ERROR: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
-- This version omits CONCURRENTLY (will take stronger locks). Run during low traffic.
-- Each IF NOT EXISTS keeps it idempotent (Postgres 15+). If using older version
-- that lacks IF NOT EXISTS for indexes, you'll need manual existence checks.
-- ============================================================================

-- Tickets indexes
CREATE INDEX IF NOT EXISTS idx_service_tickets_status_created_at
    ON public.service_tickets (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_tickets_user_status_created
    ON public.service_tickets (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_tickets_active_partial
    ON public.service_tickets (priority, sla_response_due)
    WHERE status NOT IN ('resolved','closed');

CREATE INDEX IF NOT EXISTS idx_service_tickets_sla_breached
    ON public.service_tickets (sla_breached)
    WHERE sla_breached = TRUE;

-- Quotes / Orders
CREATE INDEX IF NOT EXISTS idx_quotes_user_status_created
    ON public.quotes (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_status_created
    ON public.orders (user_id, status, created_at DESC);

-- Products (active filter)
CREATE INDEX IF NOT EXISTS idx_products_active_partial
    ON public.products (created_at DESC)
    WHERE is_active = TRUE;

-- Products attributes JSONB (run only if column exists)
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='products' AND column_name='attributes' AND data_type='jsonb'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_products_attributes_gin'
        ) THEN
            EXECUTE 'CREATE INDEX idx_products_attributes_gin ON public.products USING gin (attributes)';
        END IF;
    END IF;
END $$;

-- Materialized view unique index (non-concurrent)
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_matviews WHERE schemaname='public' AND matviewname='mv_top_products'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='mv_top_products_product_id_uidx'
        ) THEN
            EXECUTE 'CREATE UNIQUE INDEX mv_top_products_product_id_uidx ON public.mv_top_products (product_id)';
        END IF;
    ELSE
        RAISE NOTICE 'mv_top_products not present; skipping index creation';
    END IF;
END $$;

-- ============================================================================
-- END
-- ============================================================================