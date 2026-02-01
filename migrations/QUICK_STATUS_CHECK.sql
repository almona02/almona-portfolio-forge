-- =====================================================
-- QUICK SUPABASE STATUS CHECK
-- Copy and paste this entire query into Supabase SQL Editor
-- =====================================================

-- Quick overview of what's migrated
WITH table_checks AS (
  SELECT 
    'E-commerce' as system,
    'profiles' as table_name,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') as exists
  UNION ALL SELECT 'E-commerce', 'products', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products')
  UNION ALL SELECT 'E-commerce', 'orders', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders')
  UNION ALL SELECT 'E-commerce', 'quotes', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes')
  
  UNION ALL SELECT 'Inventory', 'inventory_reservations', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_reservations')
  UNION ALL SELECT 'Inventory', 'inventory_logs', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_logs')
  UNION ALL SELECT 'Inventory', 'stock_alerts', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_alerts')
  
  UNION ALL SELECT 'Fabricator', 'fabricator_profiles', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fabricator_profiles')
  UNION ALL SELECT 'Fabricator', 'fabricator_projects', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fabricator_projects')
  UNION ALL SELECT 'Fabricator', 'remnants', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'remnants')
  
  UNION ALL SELECT 'YDT Service', 'yilmaz_machines', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'yilmaz_machines')
  UNION ALL SELECT 'YDT Service', 'service_tickets', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_tickets')
  UNION ALL SELECT 'YDT Service', 'yilmaz_machine_knowledge', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'yilmaz_machine_knowledge')
  
  UNION ALL SELECT 'RealityOS', 'event_ledger', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_ledger')
  UNION ALL SELECT 'RealityOS', 'qr_lifecycle', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'qr_lifecycle')
)
SELECT 
  system,
  table_name,
  CASE WHEN exists THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM table_checks
ORDER BY system, table_name;

-- Extensions check
SELECT 
  'Extension: ' || extname as check_item,
  CASE WHEN extname IN ('uuid-ossp', 'pg_trgm', 'vector', 'pgcrypto') 
    THEN '✅ Installed' 
    ELSE '⚠️ Installed (may not be needed)' 
  END as status
FROM pg_extension
WHERE extname NOT IN ('plpgsql')
ORDER BY extname;

-- Total counts
SELECT 
  (SELECT count(*) FROM pg_tables WHERE schemaname = 'public') as total_tables,
  (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') as total_rls_policies,
  pg_size_pretty(pg_database_size(current_database())) as database_size;
