-- Fix RLS initplan warnings by wrapping auth.* calls with SELECT
-- and drop duplicate foreign-key helper indexes.
-- Safe to run multiple times (idempotent): uses DROP POLICY/IF EXISTS guards and conditional index drops.

-- PROFILES
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (((SELECT auth.uid()) = id) OR ((SELECT auth.jwt()) ->> 'role') = 'admin');

-- QUOTES
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
CREATE POLICY "Users can view their own quotes" ON public.quotes
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create their own quotes" ON public.quotes;
CREATE POLICY "Users can create their own quotes" ON public.quotes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own draft quotes" ON public.quotes;
CREATE POLICY "Users can update their own draft quotes" ON public.quotes
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND status = 'draft');

DROP POLICY IF EXISTS "Admins can manage all quotes" ON public.quotes;
CREATE POLICY "Admins can manage all quotes" ON public.quotes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

-- PRODUCTS (admin policy and public view consolidation)
DROP POLICY IF EXISTS "Admins can manage all data" ON public.products;
CREATE POLICY "Admins can manage all data" ON public.products
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

-- Keep public view policy defined elsewhere; ensure we don't duplicate authenticated-only variants
DROP POLICY IF EXISTS "Authenticated users can view active products" ON public.products;

-- ORDERS
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
CREATE POLICY "Users can create their own orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders" ON public.orders
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

-- WISHLISTS
DROP POLICY IF EXISTS "Users can manage their own wishlist" ON public.wishlists;
CREATE POLICY "Users can manage their own wishlist" ON public.wishlists
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- RECENTLY VIEWED
DROP POLICY IF EXISTS "Users can manage their own recently viewed" ON public.recently_viewed;
CREATE POLICY "Users can manage their own recently viewed" ON public.recently_viewed
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users modify own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.notifications;
CREATE POLICY "Users can manage their own notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- CATEGORIES / REVIEWS: drop redundant authenticated-only duplicates, keep public policies
DROP POLICY IF EXISTS "Authenticated users can view active categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can view approved reviews" ON public.product_reviews;

-- WARRANTY: wrap auth calls and scope to authenticated to avoid anon duplicates
-- warranty_plans
DROP POLICY IF EXISTS "Manage warranty plans" ON public.warranty_plans;
CREATE POLICY "Manage warranty plans" ON public.warranty_plans
  FOR ALL TO authenticated
  USING (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'));

-- warranty_registrations
DROP POLICY IF EXISTS "Customers view own warranties" ON public.warranty_registrations;
CREATE POLICY "Customers view own warranties" ON public.warranty_registrations
  FOR SELECT TO authenticated
  USING (customer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Customers create pending warranty" ON public.warranty_registrations;
CREATE POLICY "Customers create pending warranty" ON public.warranty_registrations
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = (SELECT auth.uid()) AND sale_confirmed = FALSE);

DROP POLICY IF EXISTS "Staff manage warranties" ON public.warranty_registrations;
CREATE POLICY "Staff manage warranties" ON public.warranty_registrations
  FOR ALL TO authenticated
  USING (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'));

-- SERVICE TICKETS consolidate names referenced by linter
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='service_tickets' AND policyname='allow_service_ticket_insert_roles') THEN
    EXECUTE 'DROP POLICY allow_service_ticket_insert_roles ON public.service_tickets';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='service_tickets' AND policyname='service_ticket_update_roles') THEN
    EXECUTE 'DROP POLICY service_ticket_update_roles ON public.service_tickets';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='service_tickets' AND policyname='service_ticket_delete_roles') THEN
    EXECUTE 'DROP POLICY service_ticket_delete_roles ON public.service_tickets';
  END IF;
END $$;

CREATE POLICY allow_service_ticket_insert_roles ON public.service_tickets
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('customer','support','admin','technician','sales_rep')));

CREATE POLICY service_ticket_update_roles ON public.service_tickets
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('support','admin','technician')))
  WITH CHECK (user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('support','admin','technician')));

CREATE POLICY service_ticket_delete_roles ON public.service_tickets
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('support','admin')));

-- DUPLICATE INDEX CLEANUP: drop *_fkey duplicates if base index exists
DO $$ BEGIN
  -- notifications: idx_notifications_user_id_fkey duplicates idx_notifications_user_id
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='idx_notifications_user_id_fkey'
  ) AND EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='idx_notifications_user_id'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS public.idx_notifications_user_id_fkey';
  END IF;

  -- order_items: idx_order_items_order_id_fkey duplicates idx_order_items_order_id
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='idx_order_items_order_id_fkey'
  ) AND EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='idx_order_items_order_id'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS public.idx_order_items_order_id_fkey';
  END IF;

  -- orders: idx_orders_user_id_fkey duplicates idx_orders_user_id
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='idx_orders_user_id_fkey'
  ) AND EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='idx_orders_user_id'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS public.idx_orders_user_id_fkey';
  END IF;

  -- quote_items: idx_quote_items_quote_id_fkey duplicates idx_quote_items_quote_id
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='idx_quote_items_quote_id_fkey'
  ) AND EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='idx_quote_items_quote_id'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS public.idx_quote_items_quote_id_fkey';
  END IF;
END $$;
