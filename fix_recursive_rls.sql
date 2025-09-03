-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a fixed policy using JWT claims (no recursion)
CREATE POLICY "Admins can view all profiles" ON public.profiles 
FOR SELECT USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'admin'
);

-- Alternative: If JWT claims approach doesn't work, use this function-based approach
/*
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM auth.users 
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'role' = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Admins can view all profiles" ON public.profiles 
FOR SELECT USING (public.is_admin());
*/

-- Fix policies for other tables to prevent similar recursion issues
-- Fix policies for other tables to prevent similar recursion issues
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
FOR SELECT USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');

DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items" ON public.order_items
FOR SELECT USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');

DROP POLICY IF EXISTS "Admins can view all quote items" ON public.quote_items;
CREATE POLICY "Admins can view all quote items" ON public.quote_items
FOR SELECT USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');