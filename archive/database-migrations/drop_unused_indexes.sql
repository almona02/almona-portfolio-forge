-- Drop unused indexes to improve write performance and reduce database size.
-- These indexes were identified as unused by the database linter.

-- It is safe to run this script multiple times.
-- The `DROP INDEX IF EXISTS` command will only execute if the index exists.

-- Unused indexes on public.audit_logs
DROP INDEX IF EXISTS public.idx_audit_logs_user_id;

-- Unused indexes on public.categories
DROP INDEX IF EXISTS public.idx_categories_parent_id;

-- Unused indexes on public.order_items
DROP INDEX IF EXISTS public.idx_order_items_product_id;
DROP INDEX IF EXISTS public.idx_order_items_variant_id;
DROP INDEX IF EXISTS public.idx_order_items_order_id;

-- Unused indexes on public.orders
DROP INDEX IF EXISTS public.idx_orders_quote_id;
DROP INDEX IF EXISTS public.idx_orders_status;
DROP INDEX IF EXISTS public.idx_orders_user_id;

-- Unused indexes on public.pricing_tiers
DROP INDEX IF EXISTS public.idx_pricing_tiers_product_id;

-- Unused indexes on public.product_reviews
DROP INDEX IF EXISTS public.idx_product_reviews_product_id;
DROP INDEX IF EXISTS public.idx_product_reviews_user_id;

-- Unused indexes on public.product_variants
DROP INDEX IF EXISTS public.idx_product_variants_product_id;

-- Unused indexes on public.quote_items
DROP INDEX IF EXISTS public.idx_quote_items_product_id;
DROP INDEX IF EXISTS public.idx_quote_items_variant_id;
DROP INDEX IF EXISTS public.idx_quote_items_quote_id;

-- Unused indexes on public.recently_viewed
DROP INDEX IF EXISTS public.idx_recently_viewed_product_id;
DROP INDEX IF EXISTS public.idx_recently_viewed_user_id;

-- Unused indexes on public.service_tickets
DROP INDEX IF EXISTS public.idx_service_tickets_assigned_by;
DROP INDEX IF EXISTS public.idx_service_tickets_related_order_id;
DROP INDEX IF EXISTS public.idx_service_tickets_related_product_id;
DROP INDEX IF EXISTS public.idx_service_tickets_related_quote_id;
DROP INDEX IF EXISTS public.idx_service_tickets_status_priority_created;
DROP INDEX IF EXISTS public.idx_service_tickets_assigned_to_status;
DROP INDEX IF EXISTS public.idx_service_tickets_open_priority;
DROP INDEX IF EXISTS public.idx_service_tickets_sla_breached_due;
DROP INDEX IF EXISTS public.idx_service_tickets_status;
DROP INDEX IF EXISTS public.idx_service_tickets_priority;
DROP INDEX IF EXISTS public.idx_service_tickets_created_at;
DROP INDEX IF EXISTS public.idx_service_tickets_type;
DROP INDEX IF EXISTS public.idx_service_tickets_assigned_to;
DROP INDEX IF EXISTS public.idx_service_tickets_sla_response_due;
DROP INDEX IF EXISTS public.idx_service_tickets_sla_resolution_due;
DROP INDEX IF EXISTS public.idx_service_tickets_ticket_number;
DROP INDEX IF EXISTS public.idx_service_tickets_active_partial;
DROP INDEX IF EXISTS public.idx_service_tickets_sla_breached;

-- Unused indexes on public.ticket_assignments_history
DROP INDEX IF EXISTS public.idx_ticket_assignments_history_assigned_by;
DROP INDEX IF EXISTS public.idx_ticket_assignments_history_assigned_from;
DROP INDEX IF EXISTS public.idx_ticket_assignments_history_assigned_to;
DROP INDEX IF EXISTS public.idx_ticket_assignments_history_ticket_id;

-- Unused indexes on public.ticket_escalations
DROP INDEX IF EXISTS public.idx_ticket_escalations_escalated_by;
DROP INDEX IF EXISTS public.idx_ticket_escalations_escalated_to;
DROP INDEX IF EXISTS public.idx_ticket_escalations_ticket_id;

-- Unused indexes on public.wishlists
DROP INDEX IF EXISTS public.idx_wishlists_product_id;
DROP INDEX IF EXISTS public.idx_wishlists_user_id;

-- Unused indexes on public.products
DROP INDEX IF EXISTS public.idx_products_active_category_featured;
DROP INDEX IF EXISTS public.idx_products_sku;
DROP INDEX IF EXISTS public.idx_products_active;
DROP INDEX IF EXISTS public.idx_products_featured;
DROP INDEX IF EXISTS public.idx_products_category;
DROP INDEX IF EXISTS public.idx_products_brand;
DROP INDEX IF EXISTS public.idx_products_active_partial;

-- Unused indexes on public.notifications
DROP INDEX IF EXISTS public.idx_notifications_user_read_created;
DROP INDEX IF EXISTS public.idx_notifications_user_id;
DROP INDEX IF EXISTS public.idx_notifications_read;

-- Unused indexes on public.ticket_messages
DROP INDEX IF EXISTS public.idx_ticket_messages_ticket_created;
DROP INDEX IF EXISTS public.idx_ticket_messages_ticket_id;
DROP INDEX IF EXISTS public.idx_ticket_messages_author_id;
DROP INDEX IF EXISTS public.idx_ticket_messages_created_at;
DROP INDEX IF EXISTS public.idx_ticket_messages_message_type;

-- Unused indexes on public.quotes
DROP INDEX IF EXISTS public.idx_quotes_status;

-- Unused indexes on public.tickets
DROP INDEX IF EXISTS public.idx_tickets_user_id;
