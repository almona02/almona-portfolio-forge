-- Generic admin configuration surface: pricing, regional settings, feature flags,
-- SLA and content — stored as typed key/value rows the Almona admin (CEO) can edit.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text','number','boolean')),
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE (category, key)
);
CREATE INDEX IF NOT EXISTS app_settings_category_idx ON public.app_settings(category);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_read ON public.app_settings;
CREATE POLICY app_settings_read ON public.app_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS app_settings_admin_write ON public.app_settings;
CREATE POLICY app_settings_admin_write ON public.app_settings FOR ALL TO authenticated
  USING (admin_private.is_admin()) WITH CHECK (admin_private.is_admin());

-- Seed common configuration defaults (idempotent).
INSERT INTO public.app_settings (category, key, value, type, description) VALUES
  ('pricing', 'labor_rate_cairo_hour', '150', 'number', 'Labor rate per hour in Cairo (base currency)'),
  ('pricing', 'material_margin_pct', '30', 'number', 'Default material margin percentage'),
  ('regional', 'egypt_vat_pct', '14', 'number', 'Egypt VAT rate'),
  ('regional', 'turkey_kdv_pct', '20', 'number', 'Turkey KDV rate'),
  ('flags', 'enable_dual_output', 'false', 'boolean', 'Enable dual-output beta'),
  ('flags', 'enable_pattern_suggestions', 'true', 'boolean', 'Enable pattern suggestions'),
  ('sla', 'high_response_hours', '4', 'number', 'High-priority ticket response SLA (hours)'),
  ('sla', 'high_resolution_hours', '48', 'number', 'High-priority ticket resolution SLA (hours)'),
  ('content', 'support_email', 'support@almona02.com', 'text', 'Public support email')
ON CONFLICT (category, key) DO NOTHING;

COMMIT;
