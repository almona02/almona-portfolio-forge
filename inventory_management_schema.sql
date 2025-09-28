-- Enhanced Inventory Management Schema
-- This file adds inventory tracking and reservation tables to support advanced stock management

-- 1. Create inventory reservations table
CREATE TABLE IF NOT EXISTS public.inventory_reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reservation_type TEXT NOT NULL CHECK (reservation_type IN ('quote', 'order')),
    reference_id UUID, -- ID of quote or order
    status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'confirmed', 'cancelled', 'expired')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create inventory logs table for tracking stock changes
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    old_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('adjustment', 'sale', 'return', 'reservation', 'release')),
    reason TEXT,
    reference_id UUID, -- ID of related order, quote, etc.
    user_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create stock alerts table
CREATE TABLE IF NOT EXISTS public.stock_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'overstock')),
    threshold_value INTEGER,
    current_stock INTEGER,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product_id ON public.inventory_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_status ON public.inventory_reservations(status);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expires_at ON public.inventory_reservations(expires_at);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON public.inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON public.inventory_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_product_id ON public.stock_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_resolved ON public.stock_alerts(is_resolved);

-- 5. Enable RLS on new tables
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
-- Inventory reservations - users can view their own, admins can view all
DROP POLICY IF EXISTS "Users can view their own reservations" ON public.inventory_reservations;
CREATE POLICY "Users can view their own reservations" ON public.inventory_reservations
    FOR SELECT USING (
        reference_id IN (
            SELECT id FROM public.quotes WHERE user_id = auth.uid()
            UNION
            SELECT id FROM public.orders WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage all reservations" ON public.inventory_reservations;
CREATE POLICY "Admins can manage all reservations" ON public.inventory_reservations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'sales_rep'))
    );

-- Inventory logs - admins only
DROP POLICY IF EXISTS "Admins can view inventory logs" ON public.inventory_logs;
CREATE POLICY "Admins can view inventory logs" ON public.inventory_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'sales_rep'))
    );

-- Stock alerts - admins only
DROP POLICY IF EXISTS "Admins can manage stock alerts" ON public.stock_alerts;
CREATE POLICY "Admins can manage stock alerts" ON public.stock_alerts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'sales_rep'))
    );

-- 7. Create function to automatically create stock alerts
CREATE OR REPLACE FUNCTION public.create_stock_alert()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if stock is below minimum level
    IF NEW.stock_quantity <= NEW.min_stock_level AND NEW.stock_quantity > 0 THEN
        INSERT INTO public.stock_alerts (product_id, alert_type, threshold_value, current_stock)
        VALUES (NEW.id, 'low_stock', NEW.min_stock_level, NEW.stock_quantity)
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- Check if stock is out
    IF NEW.stock_quantity = 0 THEN
        INSERT INTO public.stock_alerts (product_id, alert_type, threshold_value, current_stock)
        VALUES (NEW.id, 'out_of_stock', 0, 0)
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- Log the stock change
    INSERT INTO public.inventory_logs (product_id, old_quantity, new_quantity, change_type, reason)
    VALUES (NEW.id, OLD.stock_quantity, NEW.stock_quantity, 'adjustment', 'Stock update');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for automatic stock alerts
DROP TRIGGER IF EXISTS trigger_create_stock_alert ON public.products;
CREATE TRIGGER trigger_create_stock_alert
    AFTER UPDATE OF stock_quantity ON public.products
    FOR EACH ROW
    WHEN (OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity)
    EXECUTE FUNCTION public.create_stock_alert();

-- 9. Create function to clean up expired reservations
CREATE OR REPLACE FUNCTION public.cleanup_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    -- Release expired reservations
    UPDATE public.products 
    SET stock_quantity = stock_quantity + (
        SELECT COALESCE(SUM(quantity), 0)
        FROM public.inventory_reservations
        WHERE product_id = products.id 
        AND status = 'reserved' 
        AND expires_at < NOW()
    )
    WHERE id IN (
        SELECT DISTINCT product_id 
        FROM public.inventory_reservations
        WHERE status = 'reserved' 
        AND expires_at < NOW()
    );
    
    -- Mark expired reservations as expired
    UPDATE public.inventory_reservations
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'reserved' 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO public.inventory_logs (product_id, old_quantity, new_quantity, change_type, reason)
    SELECT 
        product_id,
        0,
        quantity,
        'release',
        'Expired reservation cleanup'
    FROM public.inventory_reservations
    WHERE status = 'expired' 
    AND updated_at > NOW() - INTERVAL '1 minute';
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to get inventory summary
CREATE OR REPLACE FUNCTION public.get_inventory_summary()
RETURNS TABLE (
    total_products INTEGER,
    active_products INTEGER,
    out_of_stock INTEGER,
    low_stock INTEGER,
    total_value DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_products,
        COUNT(*) FILTER (WHERE is_active = true)::INTEGER as active_products,
        COUNT(*) FILTER (WHERE is_active = true AND stock_quantity = 0)::INTEGER as out_of_stock,
        COUNT(*) FILTER (WHERE is_active = true AND stock_quantity > 0 AND stock_quantity <= min_stock_level)::INTEGER as low_stock,
        COALESCE(SUM(stock_quantity * COALESCE(price, 0)) FILTER (WHERE is_active = true), 0) as total_value
    FROM public.products;
END;
$$ LANGUAGE plpgsql;

-- 11. Grant necessary permissions
GRANT ALL ON public.inventory_reservations TO authenticated;
GRANT ALL ON public.inventory_logs TO authenticated;
GRANT ALL ON public.stock_alerts TO authenticated;
GRANT SELECT ON public.inventory_reservations TO anon;
GRANT SELECT ON public.inventory_logs TO anon;
GRANT SELECT ON public.stock_alerts TO anon;

-- Success message
SELECT 'Enhanced Inventory Management Schema Created Successfully!' as message;
