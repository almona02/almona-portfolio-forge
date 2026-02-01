-- ============================================================================
-- Phase 1: Missing Composite Indexes - Quick Wins (FIXED FOR SUPABASE)
-- ============================================================================
-- Estimated Time: 1-2 hours
-- Expected Impact: 10-30% faster queries
-- Risk Level: LOW
-- ============================================================================
-- IMPORTANT: Supabase wraps migrations in transactions, so we CANNOT use
-- CREATE INDEX CONCURRENTLY. Instead, we create indexes normally.
-- This may briefly lock tables, so run during low-traffic periods.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For text search

-- ============================================================================
-- E-COMMERCE INDEXES (if tables exist)
-- ============================================================================

-- Products: Category + Active + Featured filtering
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        -- Check which columns exist and create appropriate indexes
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category') AND
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_active') AND
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_featured') THEN
            CREATE INDEX IF NOT EXISTS idx_products_category_active_featured 
            ON products(category, is_active, is_featured) 
            WHERE is_active = true;
        END IF;
        
        -- Products: Full-text search optimization (using actual column names)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'name_en') THEN
            CREATE INDEX IF NOT EXISTS idx_products_name_en_trgm 
            ON products USING gin(name_en gin_trgm_ops);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'name_ar') THEN
            CREATE INDEX IF NOT EXISTS idx_products_name_ar_trgm 
            ON products USING gin(name_ar gin_trgm_ops);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'description') THEN
            CREATE INDEX IF NOT EXISTS idx_products_description_trgm 
            ON products USING gin(description gin_trgm_ops);
        END IF;
    END IF;
END $$;

-- Orders: User dashboard queries
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_user_status_created 
        ON orders(user_id, status, created_at DESC);
    END IF;
END $$;

-- Order items: Order detail queries
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
        CREATE INDEX IF NOT EXISTS idx_order_items_order_product 
        ON order_items(order_id, product_id);
    END IF;
END $$;

-- ============================================================================
-- AFTER SALES INDEXES
-- ============================================================================

-- Service tickets: Technician dashboard
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_tickets') THEN
        CREATE INDEX IF NOT EXISTS idx_service_tickets_assigned_status 
        ON service_tickets(assigned_to, status, created_at DESC)
        WHERE assigned_to IS NOT NULL;
        
        -- Service tickets: User/Customer view (using user_id, not customer_id)
        CREATE INDEX IF NOT EXISTS idx_service_tickets_user_status 
        ON service_tickets(user_id, status, updated_at DESC);
    END IF;
END $$;

-- Ticket messages: Conversation loading
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_messages') THEN
        CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_created 
        ON ticket_messages(ticket_id, created_at DESC);
    END IF;
END $$;

-- Machine telemetry: Time-series queries
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'machine_telemetry') THEN
        CREATE INDEX IF NOT EXISTS idx_machine_telemetry_machine_timestamp 
        ON machine_telemetry(machine_id, timestamp DESC);
    END IF;
END $$;

-- ============================================================================
-- FABRICATOR PRO INDEXES
-- ============================================================================

-- Projects: User dashboard
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fabricator_projects') THEN
        CREATE INDEX IF NOT EXISTS idx_fabricator_projects_user_status 
        ON fabricator_projects(owner_user_id, status, updated_at DESC);
    END IF;
END $$;

-- Remnants: Warehouse inventory (check both possible table names)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'remnant_inventory') THEN
        CREATE INDEX IF NOT EXISTS idx_remnants_warehouse_available 
        ON remnant_inventory(warehouse_id, is_available, created_at DESC)
        WHERE is_available = true;
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'remnants') THEN
        CREATE INDEX IF NOT EXISTS idx_remnants_warehouse_available 
        ON remnants(warehouse_id, is_available, created_at DESC)
        WHERE is_available = true;
    END IF;
END $$;

-- Profiles: Material search
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fabricator_profiles') THEN
        -- Check if is_active column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fabricator_profiles' AND column_name = 'is_active') THEN
            CREATE INDEX IF NOT EXISTS idx_fabricator_profiles_material_active 
            ON fabricator_profiles(material, is_active)
            WHERE is_active = true;
        ELSE
            -- Index without is_active filter
            CREATE INDEX IF NOT EXISTS idx_fabricator_profiles_material 
            ON fabricator_profiles(material);
        END IF;
    END IF;
END $$;

-- Optimization results: Project history
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'optimization_results') THEN
        CREATE INDEX IF NOT EXISTS idx_optimization_results_project_created 
        ON optimization_results(project_id, created_at DESC);
    END IF;
END $$;

-- ============================================================================
-- REALITYOS INDEXES
-- ============================================================================

-- Events: Entity timeline (check for timestamp or created_at)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reality_events') THEN
        -- Check which timestamp column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reality_events' AND column_name = 'timestamp') THEN
            CREATE INDEX IF NOT EXISTS idx_reality_events_entity_timestamp 
            ON reality_events(entity_id, timestamp DESC);
            
            -- Events: Type filtering
            CREATE INDEX IF NOT EXISTS idx_reality_events_entity_type_timestamp 
            ON reality_events(entity_id, event_type, timestamp DESC);
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reality_events' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_reality_events_entity_created 
            ON reality_events(entity_id, created_at DESC);
            
            -- Events: Type filtering
            CREATE INDEX IF NOT EXISTS idx_reality_events_entity_type_created 
            ON reality_events(entity_id, event_type, created_at DESC);
        END IF;
    END IF;
END $$;

-- QR codes: Fast lookup
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qr_codes') THEN
        CREATE INDEX IF NOT EXISTS idx_qr_codes_code_active 
        ON qr_codes(code) 
        WHERE is_active = true;
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check created indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
  AND schemaname = 'public'
ORDER BY tablename, indexname;
