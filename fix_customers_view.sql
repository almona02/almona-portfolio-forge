CREATE OR REPLACE VIEW public.customers
WITH (security_invoker = true)
AS 
SELECT 
  id as customer_id,
  id,
  username,
  full_name,
  company_name,
  phone,
  sector,
  workshop_location,
  governorate,
  address,
  tax_number,
  commercial_register,
  role,
  is_verified,
  created_at,
  updated_at
FROM public.profiles
WHERE role = 'customer';