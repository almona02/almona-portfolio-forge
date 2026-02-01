-- ============================================================================
-- Check Products Table Schema
-- ============================================================================
-- Run this to see the actual column names in the products table
-- ============================================================================

-- Get all columns for products table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'products'
ORDER BY ordinal_position;

-- Get all columns for orders table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'orders'
ORDER BY ordinal_position;

-- Get all columns for order_items table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'order_items'
ORDER BY ordinal_position;
