-- Find the 2 remaining policies that need optimization
SELECT 
    tablename,
    policyname,
    qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
AND qual LIKE '%EXISTS%SELECT%profiles%'
AND qual NOT LIKE '%auth.jwt()%'
ORDER BY tablename, policyname;
