-- Consolidate multiple-permissive RLS policies, tighten anon scope, add FK indexes,
-- fix function search_path, and revoke API exposure for materialized views.
-- Idempotent and safe to run multiple times.

-- ===============
-- Helpers
-- ===============
-- Convenience: check staff/admin roles via JWT
DO $$ BEGIN END $$;  -- noop to keep file executable even if copied piecemeal

-- ===============
-- Orders: unify policies
-- ===============
DO $$
BEGIN
  -- Drop legacy/overlapping policies if they exist
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname IN (
    'Admins can manage all orders',
    'Users can create their own orders',
    'Users and admins can view orders',
    'Users can view their own orders'
  );
  IF FOUND THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders';
    EXECUTE 'DROP POLICY IF EXISTS "Users and admins can view orders" ON public.orders';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders';
  END IF;

  -- Create unified SELECT policy for authenticated
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='orders' AND p.policyname='orders_select_authenticated' AND p.cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY orders_select_authenticated ON public.orders
      FOR SELECT TO authenticated
      USING (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (
          (user_id = (SELECT auth.uid()))
          OR (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
        )
      )
    $q$;
  END IF;

  -- Create unified INSERT policy for authenticated
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='orders' AND p.policyname='orders_insert_authenticated' AND p.cmd='INSERT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY orders_insert_authenticated ON public.orders
      FOR INSERT TO authenticated
      WITH CHECK (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (
          (user_id = (SELECT auth.uid()))
          OR (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
        )
      )
    $q$;
  END IF;

  -- Ensure admins can UPDATE/DELETE any orders
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='orders' AND p.policyname='orders_admin_update' AND p.cmd='UPDATE'
  ) THEN
    EXECUTE $q$
      CREATE POLICY orders_admin_update ON public.orders
      FOR UPDATE TO authenticated
      USING (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
      )
      WITH CHECK (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
      )
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='orders' AND p.policyname='orders_admin_delete' AND p.cmd='DELETE'
  ) THEN
    EXECUTE $q$
      CREATE POLICY orders_admin_delete ON public.orders
      FOR DELETE TO authenticated
      USING (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
      )
    $q$;
  END IF;
END $$;

-- ===============
-- Quotes: unify policies
-- ===============
DO $$
BEGIN
  -- Drop overlapping/legacy quote policies
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='quotes' AND policyname IN (
    'Admins can manage all quotes',
    'Users can create their own quotes',
    'Users can view their own quotes',
    'Quotes SELECT policy',
    'Quotes UPDATE policy',
    'Users can update their own draft quotes'
  );
  IF FOUND THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all quotes" ON public.quotes';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create their own quotes" ON public.quotes';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes';
    EXECUTE 'DROP POLICY IF EXISTS "Quotes SELECT policy" ON public.quotes';
    EXECUTE 'DROP POLICY IF EXISTS "Quotes UPDATE policy" ON public.quotes';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own draft quotes" ON public.quotes';
  END IF;

  -- Unified SELECT for authenticated
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='quotes' AND p.policyname='quotes_select_authenticated' AND p.cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY quotes_select_authenticated ON public.quotes
      FOR SELECT TO authenticated
      USING (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (
          (user_id = (SELECT auth.uid()))
          OR (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
        )
      )
    $q$;
  END IF;

  -- Unified INSERT for authenticated
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='quotes' AND p.policyname='quotes_insert_authenticated' AND p.cmd='INSERT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY quotes_insert_authenticated ON public.quotes
      FOR INSERT TO authenticated
      WITH CHECK (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (
          (user_id = (SELECT auth.uid()))
          OR (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
        )
      )
    $q$;
  END IF;

  -- Unified UPDATE for authenticated
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='quotes' AND p.policyname='quotes_update_authenticated' AND p.cmd='UPDATE'
  ) THEN
    EXECUTE $q$
      CREATE POLICY quotes_update_authenticated ON public.quotes
      FOR UPDATE TO authenticated
      USING (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (
          (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
          OR (user_id = (SELECT auth.uid()) AND status = 'draft')
        )
      )
      WITH CHECK (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (
          (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
          OR (user_id = (SELECT auth.uid()) AND status = 'draft')
        )
      )
    $q$;
  END IF;

  -- Optional: admin DELETE (not warned but preserve behavior)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='quotes' AND p.policyname='quotes_admin_delete' AND p.cmd='DELETE'
  ) THEN
    EXECUTE $q$
      CREATE POLICY quotes_admin_delete ON public.quotes
      FOR DELETE TO authenticated
      USING (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
      )
    $q$;
  END IF;
END $$;

-- ===============
-- Products: drop duplicate admin action policies and tighten public view to anon
-- ===============
DO $$
BEGIN
  -- Drop specific admin action policies that duplicate the consolidated admin-all policy
  EXECUTE 'DROP POLICY IF EXISTS "Admin INSERT policy for products" ON public.products';
  EXECUTE 'DROP POLICY IF EXISTS "Admin UPDATE policy for products" ON public.products';
  EXECUTE 'DROP POLICY IF EXISTS "Admin DELETE policy for products" ON public.products';
  -- Drop broad catch-all admin policy to allow per-action policies without duplication
  EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all data" ON public.products';

  -- Recreate public/anon view of active products as anon-only to avoid duplication for authenticated
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='Anyone can view active products'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view active products" ON public.products';
  END IF;
  -- Create anon-only view policy for active products
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='Anon can view active products' AND cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY "Anon can view active products" ON public.products
      FOR SELECT TO anon
      USING (is_active = true)
    $q$;
  END IF;

  -- Unified SELECT for authenticated: admins all rows, others only active
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='products_select_authenticated' AND cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY products_select_authenticated ON public.products
      FOR SELECT TO authenticated
      USING (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (
          (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
          OR (is_active = true)
        )
      )
    $q$;
  END IF;

  -- Per-action admin policies for write operations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='products_admin_insert' AND cmd='INSERT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY products_admin_insert ON public.products
      FOR INSERT TO authenticated
      WITH CHECK (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
      )
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='products_admin_update' AND cmd='UPDATE'
  ) THEN
    EXECUTE $q$
      CREATE POLICY products_admin_update ON public.products
      FOR UPDATE TO authenticated
      USING (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
      )
      WITH CHECK (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
      )
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='products_admin_delete' AND cmd='DELETE'
  ) THEN
    EXECUTE $q$
      CREATE POLICY products_admin_delete ON public.products
      FOR DELETE TO authenticated
      USING (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
      )
    $q$;
  END IF;
END $$;

-- ===============
-- Profiles: consolidate to single SELECT and user-manage UPDATE
-- ===============
DO $$
BEGIN
  -- Drop overlapping profile policies
  EXECUTE 'DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles';
  -- Also drop admin-select to replace with a unified SELECT policy
  EXECUTE 'DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles';

  -- Unified SELECT for authenticated: self or admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Profiles SELECT policy' AND cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY "Profiles SELECT policy" ON public.profiles
      FOR SELECT TO authenticated
      USING (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (
          (id = (SELECT auth.uid()))
          OR (((SELECT auth.jwt()) ->> 'role') IN ('admin'))
        )
      )
    $q$;
  END IF;

  -- Manage own profile for UPDATE only (avoid SELECT duplication)
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can manage their own profile'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can update their own profile (unified)' AND cmd='UPDATE'
  ) THEN
    EXECUTE $q$
      CREATE POLICY "Users can update their own profile (unified)" ON public.profiles
      FOR UPDATE TO authenticated
      USING (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (id = (SELECT auth.uid()))
      )
      WITH CHECK (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (id = (SELECT auth.uid()))
      )
    $q$;
  END IF;
END $$;

-- ===============
-- Service tickets: remove legacy duplicate named policies
-- ===============
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Service tickets INSERT policy" ON public.service_tickets';
  EXECUTE 'DROP POLICY IF EXISTS "Service tickets UPDATE policy" ON public.service_tickets';
  EXECUTE 'DROP POLICY IF EXISTS "Service tickets DELETE policy" ON public.service_tickets';
  EXECUTE 'DROP POLICY IF EXISTS "Service tickets SELECT policy" ON public.service_tickets';
  -- Keep consolidated service_ticket_* policies that already exist
END $$;

-- Harden service_tickets policies against anonymous sessions
DO $$
BEGIN
  -- Insert policy: allow certain roles or owners to insert; block anonymous
  EXECUTE $q$ DROP POLICY IF EXISTS allow_service_ticket_insert_roles ON public.service_tickets $q$;
  EXECUTE $q$
    CREATE POLICY allow_service_ticket_insert_roles
      ON public.service_tickets
      FOR INSERT TO authenticated
      WITH CHECK (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND EXISTS (
          SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
              AND p.role IN ('customer','support','admin','technician','sales_rep')
        )
      )
  $q$;

  -- Update policy: owner or privileged roles; block anonymous
  EXECUTE $q$ DROP POLICY IF EXISTS service_ticket_update_roles ON public.service_tickets $q$;
  EXECUTE $q$
    CREATE POLICY service_ticket_update_roles
      ON public.service_tickets
      FOR UPDATE TO authenticated
      USING (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (
          user_id = (SELECT auth.uid()) OR EXISTS (
            SELECT 1 FROM public.profiles p
              WHERE p.id = (SELECT auth.uid())
                AND p.role IN ('support','admin','technician')
          )
        )
      )
      WITH CHECK (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (
          user_id = (SELECT auth.uid()) OR EXISTS (
            SELECT 1 FROM public.profiles p
              WHERE p.id = (SELECT auth.uid())
                AND p.role IN ('support','admin','technician')
          )
        )
      )
  $q$;

  -- Delete policy: privileged roles; block anonymous
  EXECUTE $q$ DROP POLICY IF EXISTS service_ticket_delete_roles ON public.service_tickets $q$;
  EXECUTE $q$
    CREATE POLICY service_ticket_delete_roles
      ON public.service_tickets
      FOR DELETE TO authenticated
      USING (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND EXISTS (
          SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
              AND p.role IN ('support','admin')
        )
      )
  $q$;

  -- Select policy: was permissive TRUE; now block anonymous
  EXECUTE $q$ DROP POLICY IF EXISTS service_ticket_select ON public.service_tickets $q$;
  EXECUTE $q$
    CREATE POLICY service_ticket_select ON public.service_tickets
      FOR SELECT TO authenticated
      USING (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
      )
  $q$;
END $$;

-- ===============
-- Warranty plans: consolidate SELECT and keep staff manage
-- ===============
DO $$
BEGIN
  -- Drop overlapping policies
  EXECUTE 'DROP POLICY IF EXISTS "Manage warranty plans" ON public.warranty_plans';
  EXECUTE 'DROP POLICY IF EXISTS "View active warranty plans" ON public.warranty_plans';

  -- Unified SELECT for authenticated: staff see all, others see active
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='warranty_plans' AND policyname='warranty_plans_select_authenticated' AND cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY warranty_plans_select_authenticated ON public.warranty_plans
      FOR SELECT TO authenticated
      USING (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (
          (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
          OR (is_active = true)
        )
      )
    $q$;
  END IF;

  -- Anon can view active plans
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='warranty_plans' AND policyname='Anon can view active warranty plans' AND cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY "Anon can view active warranty plans" ON public.warranty_plans
      FOR SELECT TO anon
  USING (is_active = true)
    $q$;
  END IF;

  -- Staff manage (INSERT/UPDATE/DELETE)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='warranty_plans' AND policyname='warranty_plans_staff_update' AND cmd='UPDATE'
  ) THEN
    EXECUTE $q$
      CREATE POLICY warranty_plans_staff_update ON public.warranty_plans
      FOR UPDATE TO authenticated
      USING (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
      )
      WITH CHECK (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
      )
    $q$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='warranty_plans' AND policyname='warranty_plans_staff_insert' AND cmd='INSERT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY warranty_plans_staff_insert ON public.warranty_plans
      FOR INSERT TO authenticated
      WITH CHECK (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
      )
    $q$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='warranty_plans' AND policyname='warranty_plans_staff_delete' AND cmd='DELETE'
  ) THEN
    EXECUTE $q$
      CREATE POLICY warranty_plans_staff_delete ON public.warranty_plans
      FOR DELETE TO authenticated
      USING (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
      )
    $q$;
  END IF;
END $$;

-- ===============
-- Warranty registrations: unify SELECT/INSERT and ensure staff manage
-- ===============
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Customers view own warranties" ON public.warranty_registrations';
  EXECUTE 'DROP POLICY IF EXISTS "Customers create pending warranty" ON public.warranty_registrations';
  EXECUTE 'DROP POLICY IF EXISTS "Staff manage warranties" ON public.warranty_registrations';

  -- Unified SELECT for authenticated
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='warranty_registrations' AND policyname='warranty_registrations_select_authenticated' AND cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY warranty_registrations_select_authenticated ON public.warranty_registrations
      FOR SELECT TO authenticated
      USING (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (
          (customer_id = (SELECT auth.uid()))
          OR (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
        )
      )
    $q$;
  END IF;

  -- Unified INSERT for authenticated
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='warranty_registrations' AND policyname='warranty_registrations_insert_authenticated' AND cmd='INSERT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY warranty_registrations_insert_authenticated ON public.warranty_registrations
      FOR INSERT TO authenticated
      WITH CHECK (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (
          (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
          OR (customer_id = (SELECT auth.uid()) AND sale_confirmed = false)
        )
      )
    $q$;
  END IF;

  -- Staff manage UPDATE/DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='warranty_registrations' AND policyname='warranty_registrations_staff_update' AND cmd='UPDATE'
  ) THEN
    EXECUTE $q$
      CREATE POLICY warranty_registrations_staff_update ON public.warranty_registrations
      FOR UPDATE TO authenticated
      USING (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
      )
      WITH CHECK (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
      )
    $q$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='warranty_registrations' AND policyname='warranty_registrations_staff_delete' AND cmd='DELETE'
  ) THEN
    EXECUTE $q$
      CREATE POLICY warranty_registrations_staff_delete ON public.warranty_registrations
      FOR DELETE TO authenticated
      USING (
        (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
        AND (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
      )
    $q$;
  END IF;
END $$;

-- ===============
-- Tighten anonymous access: switch public->anon for read-only public content
-- Categories, Product Reviews
-- ===============
DO $$
BEGIN
  -- Categories
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='Anyone can view active categories'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view active categories" ON public.categories';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='Anon can view active categories' AND cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY "Anon can view active categories" ON public.categories
      FOR SELECT TO anon
      USING (is_active = true)
    $q$;
  END IF;

  -- Product reviews
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_reviews' AND policyname='Anyone can view approved reviews'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.product_reviews';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_reviews' AND policyname='Anon can view approved reviews' AND cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY "Anon can view approved reviews" ON public.product_reviews
      FOR SELECT TO anon
      USING (is_approved = true)
    $q$;
  END IF;
END $$;

-- ===============
-- Foreign key indexes for warranty_registrations
-- ===============
-- Note: CONCURRENTLY requires running outside a transaction. Supabase migration runner handles this.
CREATE INDEX IF NOT EXISTS idx_warranty_registrations_order_id ON public.warranty_registrations(order_id);
CREATE INDEX IF NOT EXISTS idx_warranty_registrations_plan_id ON public.warranty_registrations(plan_id);
CREATE INDEX IF NOT EXISTS idx_warranty_registrations_product_id ON public.warranty_registrations(product_id);
CREATE INDEX IF NOT EXISTS idx_warranty_registrations_sale_confirmed_by ON public.warranty_registrations(sale_confirmed_by);

-- ===============
-- Functions: set stable search_path
-- ===============
DO $$
DECLARE
  fn record;
  target_names text[] := ARRAY[
    'warranty_update_updated_at',
    'generate_warranty_code',
    'set_warranty_code',
    'warranty_compute_end_date',
    'sync_machine_warranty',
    'confirm_warranty_sale',
    'validate_warranty',
    'generate_ticket_number',
    'generate_digital_twin_code',
    'set_digital_twin_code',
    'set_quote_digital_twin_code',
    'portal_quote_lookup'
  ];
BEGIN
  FOR fn IN
    SELECT p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = ANY(target_names)
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = pg_catalog, public', fn.nspname, fn.proname, fn.args);
  END LOOP;
END $$;

-- ===============
-- Audit logs: admin-only, block anonymous
-- ===============
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='audit_logs' AND p.policyname='Admins can view all audit logs' AND p.cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
      FOR SELECT TO authenticated
      USING (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
        AND (((SELECT auth.jwt()) ->> 'role') = 'admin')
      )
    $q$;
  END IF;
END $$;

-- ===============
-- Order items: user can see own; admins all; block anonymous
-- ===============
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Users and admins can view order items" ON public.order_items';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='order_items' AND p.policyname='order_items_select_authenticated' AND p.cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY order_items_select_authenticated ON public.order_items
      FOR SELECT TO authenticated
      USING (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
        AND (
          (((SELECT auth.jwt()) ->> 'role') = 'admin')
          OR EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_items.order_id
              AND o.user_id = (SELECT auth.uid())
          )
        )
      )
    $q$;
  END IF;
END $$;

-- ===============
-- Pricing tiers: anon read allowed; authenticated with anon-guard
-- ===============
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Anyone can view pricing tiers" ON public.pricing_tiers';
  -- anon can read pricing tiers (public information)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='pricing_tiers' AND p.policyname='Anon can view pricing tiers' AND p.cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY "Anon can view pricing tiers" ON public.pricing_tiers
      FOR SELECT TO anon
      USING (true)
    $q$;
  END IF;
  -- authenticated can read with anon guard
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view pricing tiers" ON public.pricing_tiers';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='pricing_tiers' AND p.policyname='pricing_tiers_select_authenticated' AND p.cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY pricing_tiers_select_authenticated ON public.pricing_tiers
      FOR SELECT TO authenticated
      USING (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
      )
    $q$;
  END IF;
END $$;

-- ===============
-- Product variants: anon can read active products' variants; authenticated with anon-guard
-- ===============
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Anyone can view variants for active products" ON public.product_variants';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='product_variants' AND p.policyname='Anon can view variants for active products' AND p.cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY "Anon can view variants for active products" ON public.product_variants
      FOR SELECT TO anon
      USING (
        EXISTS (
          SELECT 1 FROM public.products pr
          WHERE pr.id = product_variants.product_id AND pr.is_active = true
        )
      )
    $q$;
  END IF;
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view variants for active products" ON public.product_variants';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='product_variants' AND p.policyname='product_variants_select_authenticated' AND p.cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY product_variants_select_authenticated ON public.product_variants
      FOR SELECT TO authenticated
      USING (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
        AND (
          (((SELECT auth.jwt()) ->> 'role') IN ('admin','sales_rep'))
          OR EXISTS (
            SELECT 1 FROM public.products pr
            WHERE pr.id = product_variants.product_id AND pr.is_active = true
          )
        )
      )
    $q$;
  END IF;
END $$;

-- ===============
-- Quote items: user or admin; block anonymous
-- ===============
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Users can view their own quote items" ON public.quote_items';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can view all quote items" ON public.quote_items';
  EXECUTE 'DROP POLICY IF EXISTS "Users and admins can view quote items" ON public.quote_items';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='quote_items' AND p.policyname='quote_items_select_authenticated' AND p.cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY quote_items_select_authenticated ON public.quote_items
      FOR SELECT TO authenticated
      USING (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
        AND (
          (((SELECT auth.jwt()) ->> 'role') = 'admin')
          OR EXISTS (
            SELECT 1 FROM public.quotes q
            WHERE q.id = quote_items.quote_id AND q.user_id = (SELECT auth.uid())
          )
        )
      )
    $q$;
  END IF;
END $$;

-- ===============
-- Wishlists and Recently Viewed: manage own; block anonymous
-- ===============
DO $$
BEGIN
  -- Wishlists
  EXECUTE 'DROP POLICY IF EXISTS "Users can manage their own wishlist" ON public.wishlists';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='wishlists' AND p.policyname='wishlists_manage_own' AND p.cmd='ALL'
  ) THEN
    EXECUTE $q$
      CREATE POLICY wishlists_manage_own ON public.wishlists
      FOR ALL TO authenticated
      USING (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
        AND user_id = (SELECT auth.uid())
      )
      WITH CHECK (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
        AND user_id = (SELECT auth.uid())
      )
    $q$;
  END IF;

  -- Recently viewed
  EXECUTE 'DROP POLICY IF EXISTS "Users can manage their own recently viewed" ON public.recently_viewed';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='recently_viewed' AND p.policyname='recently_viewed_manage_own' AND p.cmd='ALL'
  ) THEN
    EXECUTE $q$
      CREATE POLICY recently_viewed_manage_own ON public.recently_viewed
      FOR ALL TO authenticated
      USING (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
        AND user_id = (SELECT auth.uid())
      )
      WITH CHECK (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
        AND user_id = (SELECT auth.uid())
      )
    $q$;
  END IF;
END $$;

-- ===============
-- Notifications: manage own; block anonymous
-- ===============
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications';
  EXECUTE 'DROP POLICY IF EXISTS "Users modify own notifications" ON public.notifications';
  EXECUTE 'DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.notifications';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='notifications' AND p.policyname='notifications_manage_own' AND p.cmd='ALL'
  ) THEN
    EXECUTE $q$
      CREATE POLICY notifications_manage_own ON public.notifications
      FOR ALL TO authenticated
      USING (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
        AND user_id = (SELECT auth.uid())
      )
      WITH CHECK (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
        AND user_id = (SELECT auth.uid())
      )
    $q$;
  END IF;
END $$;

-- ===============
-- Machines: manage own; block anonymous
-- ===============
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Users can update own machines" ON public.machines';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view own machines" ON public.machines';
  EXECUTE 'DROP POLICY IF EXISTS "Users can insert own machines" ON public.machines';
  EXECUTE 'DROP POLICY IF EXISTS "Users can manage their own machines" ON public.machines';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='machines' AND p.policyname='machines_manage_own' AND p.cmd='ALL'
  ) THEN
    EXECUTE $q$
      CREATE POLICY machines_manage_own ON public.machines
      FOR ALL TO authenticated
      USING (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
        AND owner_id = (SELECT auth.uid())
      )
      WITH CHECK (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
        AND owner_id = (SELECT auth.uid())
      )
    $q$;
  END IF;
END $$;

-- ===============
-- Tickets: manage own; block anonymous
-- ===============
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Users can update own tickets" ON public.tickets';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets';
  EXECUTE 'DROP POLICY IF EXISTS "Users can insert own tickets" ON public.tickets';
  EXECUTE 'DROP POLICY IF EXISTS "Users can manage their own tickets" ON public.tickets';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='tickets' AND p.policyname='tickets_manage_own' AND p.cmd='ALL'
  ) THEN
    EXECUTE $q$
      CREATE POLICY tickets_manage_own ON public.tickets
      FOR ALL TO authenticated
      USING (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
        AND user_id = (SELECT auth.uid())
      )
      WITH CHECK (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
        AND user_id = (SELECT auth.uid())
      )
    $q$;
  END IF;
END $$;

-- ===============
-- SLA configurations: view for authenticated (non-anon); admin manage; block anonymous
-- ===============
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Anyone can view SLA configurations" ON public.sla_configurations';
  EXECUTE 'DROP POLICY IF EXISTS "Consolidated SLA configurations view policy" ON public.sla_configurations';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='sla_configurations' AND p.policyname='sla_configurations_select_authenticated' AND p.cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY sla_configurations_select_authenticated ON public.sla_configurations
      FOR SELECT TO authenticated
      USING (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
      )
    $q$;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "Admin management for SLA configurations" ON public.sla_configurations';
  EXECUTE 'DROP POLICY IF EXISTS "Only admins can manage SLA configurations" ON public.sla_configurations';
  EXECUTE 'DROP POLICY IF EXISTS "Admin INSERT for SLA configurations" ON public.sla_configurations';
  EXECUTE 'DROP POLICY IF EXISTS "Admin UPDATE for SLA configurations" ON public.sla_configurations';
  EXECUTE 'DROP POLICY IF EXISTS "Admin DELETE for SLA configurations" ON public.sla_configurations';
  -- Admin INSERT/UPDATE/DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='sla_configurations' AND p.policyname='sla_configurations_admin_insert' AND p.cmd='INSERT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY sla_configurations_admin_insert ON public.sla_configurations
      FOR INSERT TO authenticated
      WITH CHECK (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
        AND (((SELECT auth.jwt()) ->> 'role') = 'admin')
      )
    $q$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='sla_configurations' AND p.policyname='sla_configurations_admin_update' AND p.cmd='UPDATE'
  ) THEN
    EXECUTE $q$
      CREATE POLICY sla_configurations_admin_update ON public.sla_configurations
      FOR UPDATE TO authenticated
      USING (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
        AND (((SELECT auth.jwt()) ->> 'role') = 'admin')
      )
      WITH CHECK (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
        AND (((SELECT auth.jwt()) ->> 'role') = 'admin')
      )
    $q$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='sla_configurations' AND p.policyname='sla_configurations_admin_delete' AND p.cmd='DELETE'
  ) THEN
    EXECUTE $q$
      CREATE POLICY sla_configurations_admin_delete ON public.sla_configurations
      FOR DELETE TO authenticated
      USING (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
        AND (((SELECT auth.jwt()) ->> 'role') = 'admin')
      )
    $q$;
  END IF;
END $$;

-- ===============
-- Ticket related: simple authenticated views with anon-guard
-- ===============
DO $$
BEGIN
  -- ticket_assignments_history
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view assignment history" ON public.ticket_assignments_history';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view assignment history for their tickets" ON public.ticket_assignments_history';
  EXECUTE 'DROP POLICY IF EXISTS "Staff can manage assignment history" ON public.ticket_assignments_history';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='ticket_assignments_history' AND p.policyname='ticket_assignments_history_select_authenticated' AND p.cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY ticket_assignments_history_select_authenticated ON public.ticket_assignments_history
      FOR SELECT TO authenticated
      USING (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
      )
    $q$;
  END IF;

  -- ticket_escalations
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view escalations" ON public.ticket_escalations';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view escalations for their tickets" ON public.ticket_escalations';
  EXECUTE 'DROP POLICY IF EXISTS "Staff can manage escalations" ON public.ticket_escalations';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='ticket_escalations' AND p.policyname='ticket_escalations_select_authenticated' AND p.cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY ticket_escalations_select_authenticated ON public.ticket_escalations
      FOR SELECT TO authenticated
      USING (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
      )
    $q$;
  END IF;

  -- ticket_messages
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view ticket messages" ON public.ticket_messages';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view messages for their tickets" ON public.ticket_messages';
  EXECUTE 'DROP POLICY IF EXISTS "Staff can manage all messages" ON public.ticket_messages';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='ticket_messages' AND p.policyname='ticket_messages_select_authenticated' AND p.cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY ticket_messages_select_authenticated ON public.ticket_messages
      FOR SELECT TO authenticated
      USING (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
      )
    $q$;
  END IF;
END $$;

-- ===============
-- Ticket SLA daily metrics: staff/admin only; block anonymous
-- ===============
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Admins can view SLA metrics" ON public.ticket_sla_daily_metrics';
  EXECUTE 'DROP POLICY IF EXISTS "Staff can view SLA metrics" ON public.ticket_sla_daily_metrics';
  EXECUTE 'DROP POLICY IF EXISTS "Staff and admins can view SLA metrics" ON public.ticket_sla_daily_metrics';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='ticket_sla_daily_metrics' AND p.policyname='ticket_sla_daily_metrics_select_staff' AND p.cmd='SELECT'
  ) THEN
    EXECUTE $q$
      CREATE POLICY ticket_sla_daily_metrics_select_staff ON public.ticket_sla_daily_metrics
      FOR SELECT TO authenticated
      USING (
        COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
        AND (((SELECT auth.jwt()) ->> 'role') IN ('admin','technician'))
      )
    $q$;
  END IF;
END $$;

-- ===============
-- Materialized view: revoke API access
-- ===============
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE schemaname='public' AND matviewname='mv_top_products'
  ) THEN
    EXECUTE 'REVOKE SELECT ON TABLE public.mv_top_products FROM PUBLIC, anon, authenticated';
  END IF;
END $$;
