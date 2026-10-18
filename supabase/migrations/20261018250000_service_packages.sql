-- Service packages with editable pricing (replaces the hardcoded "contact for quote").
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS public.service_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id text NOT NULL UNIQUE,
  title_en text NOT NULL,
  title_ar text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  features jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_packages_read ON public.service_packages;
CREATE POLICY service_packages_read ON public.service_packages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS service_packages_admin_write ON public.service_packages;
CREATE POLICY service_packages_admin_write ON public.service_packages FOR ALL TO authenticated
  USING (admin_private.is_admin()) WITH CHECK (admin_private.is_admin());

INSERT INTO public.service_packages (package_id, title_en, title_ar, price, features) VALUES
  ('basic', 'Starter Workshop Care', 'خدمة الورش المبتدئة', 0, '["Machine inspection & maintenance", "Spare-part compatibility checks"]'),
  ('professional', 'Growth Factory Care', 'خدمة المصانع النامية', 0, '["Preventive maintenance planning", "Spare-part & operator training"]'),
  ('enterprise', 'Enterprise Plant Care', 'خدمة المصانع الكبرى', 0, '["Site-specific service scope", "Maintenance & training coordination"]')
ON CONFLICT (package_id) DO NOTHING;

COMMIT;
