-- Fix for Materialized View in API
-- This script revokes SELECT permissions on the mv_top_products materialized view
-- from the anon and authenticated roles to prevent it from being exposed over the Data APIs.

-- Revoke SELECT permission from the anon role
REVOKE SELECT ON TABLE public.mv_top_products FROM anon;

-- Revoke SELECT permission from the authenticated role
REVOKE SELECT ON TABLE public.mv_top_products FROM authenticated;

-- Optional: Grant SELECT permission to a specific admin/service role if needed for internal use
-- CREATE ROLE api_internal_user;
-- GRANT SELECT ON TABLE public.mv_top_products TO api_internal_user;
