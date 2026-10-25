-- Retry-safe public submissions use the existing UUID primary key.
-- Grant only the additional insert column; keep RLS, status and views protected.
GRANT INSERT(id) ON public.used_machine_listings TO anon, authenticated;
