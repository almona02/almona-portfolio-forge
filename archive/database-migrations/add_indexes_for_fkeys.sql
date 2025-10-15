-- Add covering indexes for unindexed foreign keys

-- This script creates indexes for foreign key constraints that were
-- identified as missing a covering index, which can improve query performance.

-- It is safe to run this script multiple times.
-- The `CREATE INDEX IF NOT EXISTS` command will only execute if the index does not exist.

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_fkey ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id_fkey ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_fkey ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id_fkey ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id_fkey ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id_fkey ON public.order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_orders_quote_id_fkey ON public.orders(quote_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id_fkey ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_product_id_fkey ON public.pricing_tiers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id_fkey ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id_fkey ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id_fkey ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_product_id_fkey ON public.quote_items(product_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id_fkey ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_variant_id_fkey ON public.quote_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_product_id_fkey ON public.recently_viewed(product_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_assigned_by_fkey ON public.service_tickets(assigned_by);
CREATE INDEX IF NOT EXISTS idx_service_tickets_assigned_to_fkey ON public.service_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_service_tickets_related_order_id_fkey ON public.service_tickets(related_order_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_related_product_id_fkey ON public.service_tickets(related_product_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_related_quote_id_fkey ON public.service_tickets(related_quote_id);
CREATE INDEX IF NOT EXISTS idx_ticket_assignments_history_assigned_by_fkey ON public.ticket_assignments_history(assigned_by);
CREATE INDEX IF NOT EXISTS idx_ticket_assignments_history_assigned_from_fkey ON public.ticket_assignments_history(assigned_from);
CREATE INDEX IF NOT EXISTS idx_ticket_assignments_history_assigned_to_fkey ON public.ticket_assignments_history(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ticket_assignments_history_ticket_id_fkey ON public.ticket_assignments_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_escalations_escalated_by_fkey ON public.ticket_escalations(escalated_by);
CREATE INDEX IF NOT EXISTS idx_ticket_escalations_escalated_to_fkey ON public.ticket_escalations(escalated_to);
CREATE INDEX IF NOT EXISTS idx_ticket_escalations_ticket_id_fkey ON public.ticket_escalations(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_author_id_fkey ON public.ticket_messages(author_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id_fkey ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id_fkey ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id_fkey ON public.wishlists(product_id);
