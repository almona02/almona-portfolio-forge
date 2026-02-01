-- ============================================================================
-- Check Actual Table Names in Database
-- ============================================================================
-- Run this first to verify table names before running migrations
-- ============================================================================

-- Check for remnant-related tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%remnant%'
ORDER BY table_name;

-- Check for inventory-related tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%inventory%'
ORDER BY table_name;

-- Check for optimization-related tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%optim%'
ORDER BY table_name;

-- Check all fabricator tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%fabricator%'
ORDER BY table_name;

-- Check all service/ticket tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%service%' OR table_name LIKE '%ticket%')
ORDER BY table_name;

-- Check all reality/event tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%reality%' OR table_name LIKE '%event%' OR table_name LIKE '%qr%')
ORDER BY table_name;

-- Check all product/order tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%product%' OR table_name LIKE '%order%')
ORDER BY table_name;
