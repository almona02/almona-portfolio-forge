-- Optimized RLS Policies for Better Performance
-- Key improvements: indexed columns, reduced subqueries, materialized role checks

-- 1. Create function for role checking to avoid repeated subqueries
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Create indexes for RLS performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_id_role ON public.profiles(id, role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_user_status ON public.quotes(user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_tickets_user_assigned ON public.service_tickets(user_id, assigned_to);

-- 3. Optimized product policies
DROP POLICY IF EXISTS "Consolidated product view policy" ON public.products;
CREATE POLICY "Optimized product view policy" ON public.products
  FOR SELECT USING (
    is_active = true OR 
    (auth.role() = 'authenticated' AND get_user_role() = 'admin')
  );

-- 4. Optimized quote policies with better indexing
DROP POLICY IF EXISTS "Consolidated quote view policy" ON public.quotes;
CREATE POLICY "Optimized quote view policy" ON public.quotes
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      user_id = auth.uid() OR 
      get_user_role() IN ('admin', 'sales_rep')
    )
  );

-- 5. Optimized service ticket policies
DROP POLICY IF EXISTS "Service tickets view policy" ON public.service_tickets;
CREATE POLICY "Optimized service tickets view policy" ON public.service_tickets
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      user_id = auth.uid() OR 
      assigned_to = auth.uid() OR 
      get_user_role() IN ('admin', 'technician', 'sales_rep')
    )
  );

-- 6. Add partial indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_featured 
  ON public.products(category, brand) WHERE is_active = true AND is_featured = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_pending_user 
  ON public.quotes(user_id, created_at) WHERE status IN ('draft', 'pending');

-- 7. Optimize notification policies with better filtering
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Optimized notifications view policy" ON public.notifications
  FOR SELECT USING (
    auth.role() = 'authenticated' AND user_id = auth.uid()
  );