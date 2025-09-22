-- Unused index review. Generated from linter output. These are optional drops.
-- Review each index usage in your environment before executing.
-- Safe pattern: DROP INDEX CONCURRENTLY IF EXISTS <index_name>;

-- products
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_products_category;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_products_sku;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_products_brand;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_products_active;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_products_featured;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_products_search_ar;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_products_search_en;

-- quotes
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_quotes_status;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_quotes_related_service_ticket;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_quotes_machine_id;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_quotes_portal_reference;

-- orders
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_orders_user_id;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_orders_status;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_orders_quote_id_fkey;

-- quote_items
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_quote_items_quote_id;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_quote_items_product_id_fkey;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_quote_items_variant_id_fkey;

-- order_items
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_order_items_order_id;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_order_items_product_id_fkey;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_order_items_variant_id_fkey;

-- recently_viewed
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_recently_viewed_user_id;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_recently_viewed_product_id_fkey;

-- wishlists
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_wishlists_user_id;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_wishlists_product_id_fkey;

-- notifications
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_notifications_read;

-- warranty_registrations
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_warranty_registrations_serial;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_warranty_registrations_customer;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_warranty_registrations_status;

-- tickets
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_tickets_machine_id;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_tickets_user_id_fkey;

-- pricing_tiers
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_pricing_tiers_product_id_fkey;

-- product_reviews
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_product_reviews_product_id_fkey;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_product_reviews_user_id_fkey;

-- product_variants
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_product_variants_product_id_fkey;

-- service_tickets
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_service_tickets_assigned_by_fkey;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_service_tickets_assigned_to_fkey;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_service_tickets_related_order_id_fkey;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_service_tickets_related_product_id_fkey;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_service_tickets_related_quote_id_fkey;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_service_tickets_category;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_service_tickets_scheduled_for;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_service_tickets_machine_id;

-- audit_logs
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_audit_logs_user_id_fkey;

-- categories
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_categories_parent_id_fkey;
