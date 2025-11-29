-- Performance indexes for Almona Portfolio Forge
-- Migration: 010_performance_indexes.sql
-- Created: 2025-01-XX
-- Description: Database performance optimization indexes for common queries
-- Part of Phase 1.3: Database Performance Optimization

-- Profile queries optimization (if profiles table has project_id column)
-- Note: This index is conditional - only create if the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'project_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_project_id 
    ON profiles(project_id) 
    WHERE project_id IS NOT NULL;
  END IF;
END $$;

-- Inventory performance for remnant-aware optimization
-- Enhanced index for material_remnants table (from migration 006)
-- Conditional: Only create if table and columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'material_remnants'
  ) THEN
    -- Check if required columns exist
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'material_remnants' 
      AND column_name IN ('user_id', 'profile_id', 'length', 'created_at', 'status')
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_material_remnants_available
      ON material_remnants(user_id, profile_id, length, created_at)
      WHERE status = 'available' AND length > 0;
      
      -- Additional remnant index for optimization queries
      CREATE INDEX IF NOT EXISTS idx_material_remnants_optimization
      ON material_remnants(profile_id, length, created_at)
      WHERE status = 'available' AND length > 0;
    END IF;
  END IF;
END $$;

-- Real-time dashboard performance
-- Conditional: Only create if table and columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'orders'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'orders' 
      AND column_name IN ('created_at', 'status')
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_orders_created_at
      ON orders(created_at DESC)
      WHERE status NOT IN ('cancelled');
    END IF;
  END IF;
END $$;

-- Service tickets for customer portal
-- Conditional: Check for user_id OR customer_id column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'service_tickets'
  ) THEN
    -- Try user_id first (most common)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'service_tickets' 
      AND column_name = 'user_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_service_tickets_customer
      ON service_tickets(user_id, created_at DESC, status);
    -- Fallback to customer_id if it exists instead
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'service_tickets' 
      AND column_name = 'customer_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_service_tickets_customer
      ON service_tickets(customer_id, created_at DESC, status);
    END IF;
  END IF;
END $$;

-- Optimization results for quick retrieval (if table exists)
-- Note: This index is conditional - only create if the table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'optimization_results'
  ) THEN
    -- Check if columns exist before creating index
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'optimization_results' 
      AND column_name = 'project_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_optimization_results 
      ON optimization_results(project_id, created_at DESC);
      
      -- Add algorithm_type index if column exists
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'optimization_results' 
        AND column_name = 'algorithm_type'
      ) THEN
        CREATE INDEX IF NOT EXISTS idx_optimization_results_algorithm 
        ON optimization_results(project_id, algorithm_type, created_at DESC);
      END IF;
    END IF;
  END IF;
END $$;

-- Quote performance
-- Conditional: Only create if table and column exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'quotes'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'quotes' 
      AND column_name = 'digital_twin_code'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_quotes_digital_twin
      ON quotes(digital_twin_code, created_at DESC)
      WHERE digital_twin_code IS NOT NULL;
    END IF;
  END IF;
END $$;

-- Additional indexes for Fabricator performance
-- Conditional: Only create if table and columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'fabricator_projects'
  ) THEN
    -- Check for owner_user_id (the actual column name) and timestamp column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'fabricator_projects' 
      AND column_name = 'owner_user_id'
    ) THEN
      -- Try created_at first
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'fabricator_projects' 
        AND column_name = 'created_at'
      ) THEN
        CREATE INDEX IF NOT EXISTS idx_fabricator_projects_user
        ON fabricator_projects(owner_user_id, created_at DESC);
      -- Fallback to updated_at if created_at doesn't exist
      ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'fabricator_projects' 
        AND column_name = 'updated_at'
      ) THEN
        CREATE INDEX IF NOT EXISTS idx_fabricator_projects_user
        ON fabricator_projects(owner_user_id, updated_at DESC);
      END IF;
    -- Fallback: check for user_id if owner_user_id doesn't exist
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'fabricator_projects' 
      AND column_name = 'user_id'
    ) THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'fabricator_projects' 
        AND column_name = 'created_at'
      ) THEN
        CREATE INDEX IF NOT EXISTS idx_fabricator_projects_user
        ON fabricator_projects(user_id, created_at DESC);
      ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'fabricator_projects' 
        AND column_name = 'updated_at'
      ) THEN
        CREATE INDEX IF NOT EXISTS idx_fabricator_projects_user
        ON fabricator_projects(user_id, updated_at DESC);
      END IF;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'fabricator_projects' 
      AND column_name IN ('status', 'updated_at')
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_fabricator_projects_status
      ON fabricator_projects(status, updated_at DESC);
    END IF;
  END IF;
END $$;

-- Workspace snapshots for auto-save performance
-- Conditional: Only create if table and columns exist
-- Note: workspace_snapshots uses 'last_modified' not 'created_at'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'workspace_snapshots'
  ) THEN
    -- Check for user_id and last_modified (the actual column name)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'workspace_snapshots' 
      AND column_name = 'user_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'workspace_snapshots' 
      AND column_name = 'last_modified'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_user
      ON workspace_snapshots(user_id, last_modified DESC);
    -- Fallback: if created_at exists instead
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'workspace_snapshots' 
      AND column_name = 'user_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'workspace_snapshots' 
      AND column_name = 'created_at'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_user
      ON workspace_snapshots(user_id, created_at DESC);
    END IF;
  END IF;
END $$;

-- Machine data for health monitoring
-- Conditional: Only create if table and columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'machine_data'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'machine_data' 
      AND column_name IN ('machine_id', 'timestamp')
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_machine_data_timestamp
      ON machine_data(machine_id, timestamp DESC);
    END IF;
  END IF;
END $$;

-- User sessions for authentication performance (table may not exist yet)
-- CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active
-- ON user_sessions(user_id, created_at DESC)
-- WHERE expires_at > NOW();

-- Product search optimization
-- Conditional: Only create if table and columns exist
-- Note: products table uses 'category' (enum) not 'category_id'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'products'
  ) THEN
    -- Check for 'category' column (enum type)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'products' 
      AND column_name = 'category'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'products' 
      AND column_name = 'created_at'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'products' 
      AND column_name = 'is_active'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_products_category_active
      ON products(category, created_at DESC)
      WHERE is_active = true;
    -- Fallback: check for category_id if it exists (for future schema changes)
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'products' 
      AND column_name = 'category_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'products' 
      AND column_name = 'created_at'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'products' 
      AND column_name = 'is_active'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_products_category_active
      ON products(category_id, created_at DESC)
      WHERE is_active = true;
    END IF;
  END IF;
END $$;

-- Comments: These indexes are designed to optimize the most common query patterns
-- in the Almona Portfolio Forge application, particularly for the Fabricator workflow,
-- dashboard queries, and user-facing features.
--
-- Note: CONCURRENTLY was removed to allow migration within transaction blocks.
-- For production deployments with high write loads, consider creating these indexes
-- manually with CONCURRENTLY outside of migration transactions to avoid table locks.
