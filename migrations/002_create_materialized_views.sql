-- ============================================================================
-- Phase 2: Materialized Views for Analytics (FIXED FOR SUPABASE)
-- ============================================================================
-- Estimated Time: 2-3 hours
-- Expected Impact: 90%+ faster analytics queries
-- Risk Level: LOW (read-only, can be refreshed concurrently)
-- ============================================================================
-- IMPORTANT: Only creates views for tables that exist
-- ============================================================================

-- ============================================================================
-- AFTER SALES ANALYTICS
-- ============================================================================

-- Ticket statistics by status
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_tickets') THEN
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ticket_stats_by_status AS
        SELECT 
            status,
            COUNT(*) as ticket_count,
            AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_hours,
            COUNT(*) FILTER (WHERE priority = 'high') as high_priority_count,
            COUNT(*) FILTER (WHERE priority = 'medium') as medium_priority_count,
            COUNT(*) FILTER (WHERE priority = 'low') as low_priority_count,
            MIN(created_at) as oldest_ticket,
            MAX(created_at) as newest_ticket
        FROM service_tickets
        WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY status;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ticket_stats_status 
        ON mv_ticket_stats_by_status(status);
    END IF;
END $$;

-- Technician performance
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_tickets') THEN
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_technician_performance AS
        SELECT 
            assigned_to,
            COUNT(*) as tickets_handled,
            COUNT(*) FILTER (WHERE status = 'resolved') as tickets_resolved,
            COUNT(*) FILTER (WHERE status = 'in_progress') as tickets_in_progress,
            AVG(EXTRACT(EPOCH FROM (resolved_at - assigned_at))/3600) as avg_resolution_hours,
            MIN(assigned_at) as first_assignment,
            MAX(assigned_at) as last_assignment
        FROM service_tickets
        WHERE assigned_at >= CURRENT_DATE - INTERVAL '30 days'
          AND assigned_to IS NOT NULL
        GROUP BY assigned_to;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_technician_performance_assigned 
        ON mv_technician_performance(assigned_to);
    END IF;
END $$;

-- Daily ticket trends
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_tickets') THEN
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_ticket_trends AS
        SELECT 
            DATE_TRUNC('day', created_at) as day,
            COUNT(*) as tickets_created,
            COUNT(*) FILTER (WHERE status = 'resolved') as tickets_resolved,
            AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_hours
        FROM service_tickets
        WHERE created_at >= CURRENT_DATE - INTERVAL '180 days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY day DESC;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_ticket_trends_day 
        ON mv_daily_ticket_trends(day);
    END IF;
END $$;

-- ============================================================================
-- FABRICATOR PRO ANALYTICS
-- ============================================================================

-- Material usage statistics (handles both table name possibilities)
DO $$ 
DECLARE
    remnant_table_name text;
BEGIN
    -- Check which remnant table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'remnant_inventory') THEN
        remnant_table_name := 'remnant_inventory';
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'remnants') THEN
        remnant_table_name := 'remnants';
    ELSE
        remnant_table_name := NULL;
    END IF;

    -- Only create view if both tables exist
    IF remnant_table_name IS NOT NULL AND 
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fabricator_profiles') THEN
        
        EXECUTE format('
            CREATE MATERIALIZED VIEW IF NOT EXISTS mv_material_usage_stats AS
            SELECT 
                fp.material,
                COUNT(DISTINCT ri.id) as remnant_count,
                SUM(ri.length_mm) as total_length_mm,
                AVG(ri.length_mm) as avg_length_mm,
                SUM(ri.estimated_value) as total_value,
                COUNT(DISTINCT ri.warehouse_id) as warehouse_count
            FROM fabricator_profiles fp
            LEFT JOIN %I ri ON ri.profile_id = fp.id
            WHERE ri.created_at >= CURRENT_DATE - INTERVAL ''90 days''
            GROUP BY fp.material
        ', remnant_table_name);

        CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_material_usage_material 
        ON mv_material_usage_stats(material);
    END IF;
END $$;

-- Optimization efficiency trends
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'optimization_results') THEN
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_optimization_efficiency AS
        SELECT 
            DATE_TRUNC('week', created_at) as week,
            COUNT(*) as optimization_count,
            AVG(waste_percentage) as avg_waste_percentage,
            AVG(cost_savings) as avg_cost_savings,
            SUM(cost_savings) as total_cost_savings,
            MIN(waste_percentage) as best_waste_percentage,
            MAX(waste_percentage) as worst_waste_percentage
        FROM optimization_results
        WHERE created_at >= CURRENT_DATE - INTERVAL '180 days'
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY week DESC;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_optimization_efficiency_week 
        ON mv_optimization_efficiency(week);
    END IF;
END $$;

-- ============================================================================
-- E-COMMERCE ANALYTICS
-- ============================================================================

-- Product performance
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
        
        -- Check if category column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'category') THEN
            -- Version with category
            CREATE MATERIALIZED VIEW IF NOT EXISTS mv_product_performance AS
            SELECT 
                p.id as product_id,
                COALESCE(p.name_en, p.name_ar, p.sku) as product_name,
                p.category,
                COUNT(DISTINCT o.id) as order_count,
                SUM(oi.quantity) as total_quantity_sold,
                SUM(oi.total_price) as total_revenue,
                AVG(oi.unit_price) as avg_selling_price
            FROM products p
            LEFT JOIN order_items oi ON oi.product_id = p.id
            LEFT JOIN orders o ON o.id = oi.order_id
            WHERE o.created_at >= CURRENT_DATE - INTERVAL '90 days'
            GROUP BY p.id, COALESCE(p.name_en, p.name_ar, p.sku), p.category
            ORDER BY total_revenue DESC NULLS LAST;
        ELSE
            -- Version without category
            CREATE MATERIALIZED VIEW IF NOT EXISTS mv_product_performance AS
            SELECT 
                p.id as product_id,
                COALESCE(p.name_en, p.name_ar, p.sku) as product_name,
                COUNT(DISTINCT o.id) as order_count,
                SUM(oi.quantity) as total_quantity_sold,
                SUM(oi.total_price) as total_revenue,
                AVG(oi.unit_price) as avg_selling_price
            FROM products p
            LEFT JOIN order_items oi ON oi.product_id = p.id
            LEFT JOIN orders o ON o.id = oi.order_id
            WHERE o.created_at >= CURRENT_DATE - INTERVAL '90 days'
            GROUP BY p.id, COALESCE(p.name_en, p.name_ar, p.sku)
            ORDER BY total_revenue DESC NULLS LAST;
        END IF;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_product_performance_product 
        ON mv_product_performance(product_id);
    END IF;
END $$;

-- Category performance
DO $$ 
DECLARE
    price_column text;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') AND
       EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'products' AND column_name = 'category') THEN
        
        -- Determine which price column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'base_price') THEN
            price_column := 'base_price';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cost_price') THEN
            price_column := 'cost_price';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'price') THEN
            price_column := 'price';
        ELSE
            price_column := NULL;
        END IF;

        -- Only create view if we have a price column
        IF price_column IS NOT NULL THEN
            EXECUTE format('
                CREATE MATERIALIZED VIEW IF NOT EXISTS mv_category_performance AS
                SELECT 
                    category,
                    COUNT(DISTINCT id) as product_count,
                    COUNT(DISTINCT id) FILTER (WHERE is_active = true) as active_product_count,
                    AVG(%I) as avg_price
                FROM products
                GROUP BY category
            ', price_column);

            CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_category_performance_category 
            ON mv_category_performance(category);
        END IF;
    END IF;
END $$;

-- ============================================================================
-- REALITYOS ANALYTICS
-- ============================================================================

-- Event type distribution
DO $$ 
DECLARE
    time_column text;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reality_events') THEN
        -- Determine which timestamp column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reality_events' AND column_name = 'timestamp') THEN
            time_column := 'timestamp';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reality_events' AND column_name = 'created_at') THEN
            time_column := 'created_at';
        ELSE
            time_column := NULL;
        END IF;

        -- Only create view if we have a time column
        IF time_column IS NOT NULL THEN
            EXECUTE format('
                CREATE MATERIALIZED VIEW IF NOT EXISTS mv_event_type_distribution AS
                SELECT 
                    event_type,
                    COUNT(*) as event_count,
                    COUNT(DISTINCT entity_id) as unique_entities,
                    MIN(%I) as first_occurrence,
                    MAX(%I) as last_occurrence
                FROM reality_events
                WHERE %I >= CURRENT_DATE - INTERVAL ''30 days''
                GROUP BY event_type
                ORDER BY event_count DESC
            ', time_column, time_column, time_column);

            CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_event_type_distribution_type 
            ON mv_event_type_distribution(event_type);
        END IF;
    END IF;
END $$;

-- ============================================================================
-- REFRESH FUNCTION
-- ============================================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS TABLE(view_name text, status text) AS $$
BEGIN
    -- After Sales
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_ticket_stats_by_status') THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ticket_stats_by_status;
        RETURN QUERY SELECT 'mv_ticket_stats_by_status'::text, 'refreshed'::text;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_technician_performance') THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_technician_performance;
        RETURN QUERY SELECT 'mv_technician_performance'::text, 'refreshed'::text;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_daily_ticket_trends') THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_ticket_trends;
        RETURN QUERY SELECT 'mv_daily_ticket_trends'::text, 'refreshed'::text;
    END IF;
    
    -- Fabricator Pro
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_material_usage_stats') THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_material_usage_stats;
        RETURN QUERY SELECT 'mv_material_usage_stats'::text, 'refreshed'::text;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_optimization_efficiency') THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_optimization_efficiency;
        RETURN QUERY SELECT 'mv_optimization_efficiency'::text, 'refreshed'::text;
    END IF;
    
    -- E-commerce
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_product_performance') THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_performance;
        RETURN QUERY SELECT 'mv_product_performance'::text, 'refreshed'::text;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_category_performance') THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_category_performance;
        RETURN QUERY SELECT 'mv_category_performance'::text, 'refreshed'::text;
    END IF;
    
    -- RealityOS
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_event_type_distribution') THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_event_type_distribution;
        RETURN QUERY SELECT 'mv_event_type_distribution'::text, 'refreshed'::text;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check created materialized views
SELECT 
    schemaname,
    matviewname,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;
