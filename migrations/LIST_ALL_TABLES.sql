-- Run this to see which specific tables exist
SELECT 
  table_name,
  pg_size_pretty(pg_total_relation_size('public.' || table_name)) as size,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.tablename) as columns
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY table_name;
