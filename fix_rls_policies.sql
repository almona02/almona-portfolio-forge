-- RLS Policies

-- audit_logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- order_items
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
CREATE POLICY "Users can view their own order items" ON public.order_items
FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items" ON public.order_items
FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- pricing_tiers
DROP POLICY IF EXISTS "Anyone can view pricing tiers" ON public.pricing_tiers;
CREATE POLICY "Anyone can view pricing tiers" ON public.pricing_tiers
FOR SELECT USING (true);

-- product_variants
DROP POLICY IF EXISTS "Anyone can view variants for active products" ON public.product_variants;
CREATE POLICY "Anyone can view variants for active products" ON public.product_variants
FOR SELECT USING (EXISTS (SELECT 1 FROM public.products WHERE id = product_id AND is_active = true));

-- quote_items
DROP POLICY IF EXISTS "Users can view their own quote items" ON public.quote_items;
CREATE POLICY "Users can view their own quote items" ON public.quote_items
FOR SELECT USING (EXISTS (SELECT 1 FROM public.quotes WHERE id = quote_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can view all quote items" ON public.quote_items;
CREATE POLICY "Admins can view all quote items" ON public.quote_items
FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));