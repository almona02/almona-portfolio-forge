-- Migration 005: Pricing Configuration System
-- Creates comprehensive pricing engine tables with multi-currency support,
-- regional pricing variations, material markups, labor costs, and price history

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Pricing Configuration Table
-- Stores user-specific pricing settings and markups
CREATE TABLE IF NOT EXISTS public.pricing_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('turkey', 'egypt', 'global')),
  currency TEXT NOT NULL CHECK (currency IN ('TRY', 'EGP', 'USD', 'EUR')),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Material markups
  material_markup_percentage DECIMAL(5,2) DEFAULT 35.00,
  aluminum_markup_percentage DECIMAL(5,2),
  upvc_markup_percentage DECIMAL(5,2),
  wood_markup_percentage DECIMAL(5,2),
  
  -- Labor cost configuration
  labor_markup_percentage DECIMAL(5,2) DEFAULT 50.00,
  base_labor_rate_per_hour DECIMAL(10,2),
  
  -- Hardware and accessories
  hardware_markup_percentage DECIMAL(5,2) DEFAULT 40.00,
  glazing_markup_percentage DECIMAL(5,2) DEFAULT 30.00,
  installation_markup_percentage DECIMAL(5,2) DEFAULT 45.00,
  
  -- Tax and discount settings
  default_tax_rate DECIMAL(5,2) DEFAULT 20.00,
  tax_name TEXT DEFAULT 'VAT',
  min_profit_margin DECIMAL(5,2) DEFAULT 25.00,
  max_discount_percentage DECIMAL(5,2) DEFAULT 15.00,
  
  -- Currency and rounding settings
  rounding_method TEXT DEFAULT 'standard' CHECK (rounding_method IN ('standard', 'up', 'down', 'nearest')),
  rounding_precision INTEGER DEFAULT 2,
  
  -- Additional settings
  settings JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_markups CHECK (
    material_markup_percentage >= 0 AND
    labor_markup_percentage >= 0 AND
    hardware_markup_percentage >= 0 AND
    glazing_markup_percentage >= 0 AND
    installation_markup_percentage >= 0
  ),
  CONSTRAINT valid_tax_discount CHECK (
    default_tax_rate >= 0 AND
    min_profit_margin >= 0 AND
    max_discount_percentage >= 0 AND max_discount_percentage <= 100
  )
);

-- 2. Material-Specific Pricing Table
-- Stores pricing rules for specific materials and profiles
CREATE TABLE IF NOT EXISTS public.material_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.fabricator_profiles(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL CHECK (material_type IN ('aluminum', 'upvc', 'wood')),
  region TEXT NOT NULL CHECK (region IN ('turkey', 'egypt', 'global')),
  currency TEXT NOT NULL CHECK (currency IN ('TRY', 'EGP', 'USD', 'EUR')),
  
  -- Pricing
  base_cost_per_meter DECIMAL(10,2) NOT NULL,
  markup_percentage DECIMAL(5,2) DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  final_price_per_meter DECIMAL(10,2) NOT NULL,
  
  -- Quantity break pricing
  quantity_breaks JSONB DEFAULT '[]'::jsonb, -- [{min: 1, max: 10, discount: 5}, ...]
  
  -- Validity period
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_pricing CHECK (
    base_cost_per_meter >= 0 AND
    markup_percentage >= -100 AND
    discount_percentage >= 0 AND discount_percentage <= 100 AND
    final_price_per_meter >= 0
  )
);

-- 3. Labor Cost Configuration Table
-- Stores labor costs by operation type
CREATE TABLE IF NOT EXISTS public.labor_cost_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('turkey', 'egypt', 'global')),
  currency TEXT NOT NULL CHECK (currency IN ('TRY', 'EGP', 'USD', 'EUR')),
  
  operation_type TEXT NOT NULL, -- 'cutting', 'machining', 'assembly', 'welding', 'finishing', 'installation'
  operation_name TEXT NOT NULL,
  base_rate_per_hour DECIMAL(10,2) NOT NULL,
  markup_percentage DECIMAL(5,2) DEFAULT 0,
  final_rate_per_hour DECIMAL(10,2) NOT NULL,
  
  -- Complexity multipliers
  complexity_multipliers JSONB DEFAULT '{}'::jsonb, -- {simple: 1.0, medium: 1.2, complex: 1.5}
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_labor_rates CHECK (
    base_rate_per_hour >= 0 AND
    final_rate_per_hour >= 0
  )
);

-- 4. Price History Table
-- Tracks all price changes for audit and versioning
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Reference to what was priced
  entity_type TEXT NOT NULL CHECK (entity_type IN ('profile', 'accessory', 'material', 'labor', 'configuration')),
  entity_id UUID,
  entity_name TEXT,
  
  -- Pricing details
  region TEXT,
  currency TEXT NOT NULL,
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2),
  price_change_percentage DECIMAL(5,2),
  
  -- Change metadata
  change_reason TEXT,
  changed_by UUID REFERENCES public.profiles(id),
  change_source TEXT DEFAULT 'manual' CHECK (change_source IN ('manual', 'bulk_import', 'api', 'scheduled')),
  
  -- Version info
  version_number INTEGER DEFAULT 1,
  is_current_version BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_price_change CHECK (new_price >= 0)
);

-- 5. Exchange Rate Cache Table
-- Caches exchange rates for multi-currency quotes
CREATE TABLE IF NOT EXISTS public.exchange_rate_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL CHECK (from_currency IN ('TRY', 'EGP', 'USD', 'EUR')),
  to_currency TEXT NOT NULL CHECK (to_currency IN ('TRY', 'EGP', 'USD', 'EUR')),
  rate DECIMAL(12,6) NOT NULL,
  source TEXT DEFAULT 'api' CHECK (source IN ('api', 'fallback', 'manual')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  PRIMARY KEY (from_currency, to_currency),
  CONSTRAINT valid_rate CHECK (rate > 0),
  CONSTRAINT different_currencies CHECK (from_currency != to_currency)
);

-- 6. Price Validation Alerts Table
-- Stores alerts for price validation issues
CREATE TABLE IF NOT EXISTS public.price_validation_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'low_profit_margin',
    'negative_price',
    'excessive_markup',
    'currency_mismatch',
    'expired_price',
    'missing_configuration'
  )),
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Bulk Price Import Log Table
-- Tracks bulk price update operations
CREATE TABLE IF NOT EXISTS public.bulk_price_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  filename TEXT,
  file_type TEXT CHECK (file_type IN ('csv', 'excel', 'json')),
  total_records INTEGER DEFAULT 0,
  successful_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  error_log JSONB DEFAULT '[]'::jsonb,
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pricing_configs_user_region ON public.pricing_configurations(user_id, region, is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_configs_currency ON public.pricing_configurations(currency);

CREATE INDEX IF NOT EXISTS idx_material_pricing_user_material ON public.material_pricing_rules(user_id, material_type, region);
CREATE INDEX IF NOT EXISTS idx_material_pricing_profile ON public.material_pricing_rules(profile_id);
CREATE INDEX IF NOT EXISTS idx_material_pricing_active ON public.material_pricing_rules(is_active, valid_from, valid_until);

CREATE INDEX IF NOT EXISTS idx_labor_costs_user_region ON public.labor_cost_configurations(user_id, region, operation_type);
CREATE INDEX IF NOT EXISTS idx_labor_costs_active ON public.labor_cost_configurations(is_active);

CREATE INDEX IF NOT EXISTS idx_price_history_user_entity ON public.price_history(user_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_price_history_created ON public.price_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_version ON public.price_history(entity_id, version_number);

CREATE INDEX IF NOT EXISTS idx_exchange_rate_cache_timestamp ON public.exchange_rate_cache(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_exchange_rate_cache_expires ON public.exchange_rate_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON public.price_validation_alerts(user_id, is_resolved, severity);
CREATE INDEX IF NOT EXISTS idx_price_alerts_entity ON public.price_validation_alerts(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_bulk_imports_user ON public.bulk_price_imports(user_id, status, created_at DESC);

-- Update trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_pricing_configs_updated_at ON public.pricing_configurations;
CREATE TRIGGER update_pricing_configs_updated_at
  BEFORE UPDATE ON public.pricing_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_material_pricing_updated_at ON public.material_pricing_rules;
CREATE TRIGGER update_material_pricing_updated_at
  BEFORE UPDATE ON public.material_pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_labor_costs_updated_at ON public.labor_cost_configurations;
CREATE TRIGGER update_labor_costs_updated_at
  BEFORE UPDATE ON public.labor_cost_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate final price with markup and discount
CREATE OR REPLACE FUNCTION calculate_final_price(
  base_cost DECIMAL,
  markup_percentage DECIMAL,
  discount_percentage DECIMAL DEFAULT 0
)
RETURNS DECIMAL AS $$
BEGIN
  RETURN ROUND(
    base_cost * (1 + markup_percentage / 100) * (1 - discount_percentage / 100),
    2
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get current active pricing configuration
CREATE OR REPLACE FUNCTION get_active_pricing_config(
  p_user_id UUID,
  p_region TEXT DEFAULT 'global',
  p_currency TEXT DEFAULT 'USD'
)
RETURNS TABLE (
  id UUID,
  region TEXT,
  currency TEXT,
  material_markup_percentage DECIMAL,
  labor_markup_percentage DECIMAL,
  hardware_markup_percentage DECIMAL,
  glazing_markup_percentage DECIMAL,
  installation_markup_percentage DECIMAL,
  default_tax_rate DECIMAL,
  min_profit_margin DECIMAL,
  max_discount_percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    pc.region,
    pc.currency,
    pc.material_markup_percentage,
    pc.labor_markup_percentage,
    pc.hardware_markup_percentage,
    pc.glazing_markup_percentage,
    pc.installation_markup_percentage,
    pc.default_tax_rate,
    pc.min_profit_margin,
    pc.max_discount_percentage
  FROM public.pricing_configurations pc
  WHERE pc.user_id = p_user_id
    AND pc.is_active = TRUE
    AND (pc.region = p_region OR pc.region = 'global')
    AND pc.currency = p_currency
  ORDER BY 
    CASE WHEN pc.region = p_region THEN 0 ELSE 1 END,
    pc.updated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log price change
CREATE OR REPLACE FUNCTION log_price_change(
  p_user_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_entity_name TEXT,
  p_region TEXT,
  p_currency TEXT,
  p_old_price DECIMAL,
  p_new_price DECIMAL,
  p_change_reason TEXT DEFAULT NULL,
  p_changed_by UUID DEFAULT NULL,
  p_change_source TEXT DEFAULT 'manual'
)
RETURNS UUID AS $$
DECLARE
  v_price_change_percentage DECIMAL;
  v_version_number INTEGER;
  v_history_id UUID;
BEGIN
  -- Calculate price change percentage
  IF p_old_price > 0 THEN
    v_price_change_percentage := ((p_new_price - p_old_price) / p_old_price) * 100;
  ELSE
    v_price_change_percentage := 0;
  END IF;
  
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_number
  FROM public.price_history
  WHERE entity_id = p_entity_id AND entity_type = p_entity_type;
  
  -- Mark previous versions as not current
  UPDATE public.price_history
  SET is_current_version = FALSE
  WHERE entity_id = p_entity_id 
    AND entity_type = p_entity_type
    AND is_current_version = TRUE;
  
  -- Insert new price history record
  INSERT INTO public.price_history (
    user_id,
    entity_type,
    entity_id,
    entity_name,
    region,
    currency,
    old_price,
    new_price,
    price_change_percentage,
    change_reason,
    changed_by,
    change_source,
    version_number,
    is_current_version
  ) VALUES (
    p_user_id,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_region,
    p_currency,
    p_old_price,
    p_new_price,
    v_price_change_percentage,
    p_change_reason,
    p_changed_by,
    p_change_source,
    v_version_number,
    TRUE
  ) RETURNING id INTO v_history_id;
  
  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.pricing_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_cost_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rate_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_validation_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_price_imports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own pricing configs" ON public.pricing_configurations;
DROP POLICY IF EXISTS "Users can manage their own pricing configs" ON public.pricing_configurations;

DROP POLICY IF EXISTS "Users can view their own material pricing" ON public.material_pricing_rules;
DROP POLICY IF EXISTS "Users can manage their own material pricing" ON public.material_pricing_rules;

DROP POLICY IF EXISTS "Users can view their own labor costs" ON public.labor_cost_configurations;
DROP POLICY IF EXISTS "Users can manage their own labor costs" ON public.labor_cost_configurations;

DROP POLICY IF EXISTS "Users can view their own price history" ON public.price_history;
DROP POLICY IF EXISTS "Users can insert their own price history" ON public.price_history;

DROP POLICY IF EXISTS "Public can view exchange rates" ON public.exchange_rate_cache;
DROP POLICY IF EXISTS "Service role can manage exchange rates" ON public.exchange_rate_cache;

DROP POLICY IF EXISTS "Users can view their own alerts" ON public.price_validation_alerts;
DROP POLICY IF EXISTS "Users can manage their own alerts" ON public.price_validation_alerts;

DROP POLICY IF EXISTS "Users can view their own bulk imports" ON public.bulk_price_imports;
DROP POLICY IF EXISTS "Users can manage their own bulk imports" ON public.bulk_price_imports;

-- Pricing configurations policies
CREATE POLICY "Users can view their own pricing configs" ON public.pricing_configurations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own pricing configs" ON public.pricing_configurations
  FOR ALL USING (auth.uid() = user_id);

-- Material pricing policies
CREATE POLICY "Users can view their own material pricing" ON public.material_pricing_rules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own material pricing" ON public.material_pricing_rules
  FOR ALL USING (auth.uid() = user_id);

-- Labor cost policies
CREATE POLICY "Users can view their own labor costs" ON public.labor_cost_configurations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own labor costs" ON public.labor_cost_configurations
  FOR ALL USING (auth.uid() = user_id);

-- Price history policies
CREATE POLICY "Users can view their own price history" ON public.price_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own price history" ON public.price_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Exchange rate cache policies (public read, service role write)
CREATE POLICY "Public can view exchange rates" ON public.exchange_rate_cache
  FOR SELECT USING (TRUE);

CREATE POLICY "Service role can manage exchange rates" ON public.exchange_rate_cache
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Price validation alerts policies
CREATE POLICY "Users can view their own alerts" ON public.price_validation_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own alerts" ON public.price_validation_alerts
  FOR ALL USING (auth.uid() = user_id);

-- Bulk import policies
CREATE POLICY "Users can view their own bulk imports" ON public.bulk_price_imports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own bulk imports" ON public.bulk_price_imports
  FOR ALL USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE public.pricing_configurations IS 'User-specific pricing configurations with regional and currency support';
COMMENT ON TABLE public.material_pricing_rules IS 'Material and profile-specific pricing rules with quantity breaks';
COMMENT ON TABLE public.labor_cost_configurations IS 'Labor cost configurations by operation type and region';
COMMENT ON TABLE public.price_history IS 'Complete audit trail of all price changes with versioning';
COMMENT ON TABLE public.exchange_rate_cache IS 'Cached exchange rates for multi-currency pricing';
COMMENT ON TABLE public.price_validation_alerts IS 'Alerts for price validation issues and anomalies';
COMMENT ON TABLE public.bulk_price_imports IS 'Log of bulk price update operations from CSV/Excel imports';
COMMENT ON FUNCTION get_active_pricing_config(UUID, TEXT, TEXT) IS 'Returns the active pricing configuration for a user, region, and currency';
COMMENT ON FUNCTION log_price_change(UUID, TEXT, UUID, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, TEXT, UUID, TEXT) IS 'Logs a price change to the history table with automatic versioning';

