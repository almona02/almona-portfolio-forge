-- Baseline objects assumed by later supabase/migrations on production.
-- These historically lived in repo-root migrations/001+ and were never
-- timestamped into supabase/migrations, so empty `db reset` failed mid-chain.
-- Idempotent CREATE IF NOT EXISTS only — not a full prod schema dump.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN CREATE TYPE public.user_role AS ENUM ('customer', 'admin', 'sales_rep', 'technician');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.quote_status AS ENUM ('draft', 'pending', 'sent', 'accepted', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.order_status AS ENUM (
  'draft', 'pending', 'confirmed', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.product_category AS ENUM (
  'machine', 'spare_part', 'raw_material', 'tool', 'accessory'
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.sector_type AS ENUM ('ALUMINIUM', 'UPVC', 'STEEL', 'GLASS', 'GENERAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  company_name TEXT,
  phone TEXT,
  sector public.sector_type DEFAULT 'GENERAL',
  workshop_location TEXT,
  governorate TEXT,
  address JSONB,
  tax_number TEXT,
  commercial_register TEXT,
  role public.user_role DEFAULT 'customer',
  is_verified BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'basic', 'pro', 'enterprise')),
  projects_used INTEGER DEFAULT 0,
  projects_limit INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  category public.product_category NOT NULL DEFAULT 'accessory',
  price NUMERIC(12, 2),
  currency TEXT DEFAULT 'EGP',
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  status public.quote_status DEFAULT 'draft',
  title TEXT,
  description TEXT,
  notes TEXT,
  internal_notes TEXT,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12, 2) DEFAULT 0,
  discount_amount NUMERIC(12, 2) DEFAULT 0,
  shipping_cost NUMERIC(12, 2) DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EGP',
  valid_until TIMESTAMPTZ,
  contact_info JSONB,
  shipping_address JSONB,
  delivery_timeline TEXT,
  payment_terms TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name_ar TEXT NOT NULL DEFAULT '',
  product_name_en TEXT NOT NULL DEFAULT '',
  product_sku TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  configurations JSONB DEFAULT '{}'::jsonb,
  specifications JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  quote_id UUID REFERENCES public.quotes(id),
  status public.order_status DEFAULT 'pending',
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12, 2) DEFAULT 0,
  discount_amount NUMERIC(12, 2) DEFAULT 0,
  shipping_cost NUMERIC(12, 2) DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EGP',
  billing_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fabricator_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_code TEXT UNIQUE NOT NULL,
  project_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  site_name TEXT,
  currency TEXT NOT NULL DEFAULT 'EGP',
  region TEXT NOT NULL DEFAULT 'global',
  system_pack_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fabricator_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.fabricator_projects(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL DEFAULT '',
  pos_number TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'window',
  overall_width_mm INTEGER NOT NULL,
  overall_height_mm INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT 'White',
  glazing JSONB DEFAULT '{}'::jsonb,
  system_pack_id TEXT,
  status TEXT NOT NULL DEFAULT 'measuring',
  quantity INTEGER NOT NULL DEFAULT 1,
  position_meta JSONB DEFAULT '{}'::jsonb,
  optimization JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fabricator_projects_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_code TEXT NOT NULL,
  project_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  site_name TEXT,
  currency TEXT NOT NULL DEFAULT 'EGP',
  region TEXT NOT NULL DEFAULT 'global',
  system_pack_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  meta JSONB DEFAULT '{}'::jsonb,
  tier TEXT NOT NULL DEFAULT 'Tier 3',
  deterministic BOOLEAN NOT NULL DEFAULT TRUE,
  constitutional_hash CHAR(64),
  audit_trail JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_user_id, project_code)
);

CREATE TABLE IF NOT EXISTS public.fabricator_positions_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.fabricator_projects_v2(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_number TEXT,
  pos_number TEXT,
  type TEXT,
  overall_width_mm INTEGER,
  overall_height_mm INTEGER,
  color TEXT,
  glazing JSONB DEFAULT '{}'::jsonb,
  system_pack_id TEXT,
  status TEXT NOT NULL DEFAULT 'measuring',
  quantity INTEGER NOT NULL DEFAULT 1,
  position_meta JSONB DEFAULT '{}'::jsonb,
  meta JSONB DEFAULT '{}'::jsonb,
  optimization JSONB,
  grid JSONB DEFAULT '{}'::jsonb,
  components JSONB DEFAULT '[]'::jsonb,
  hardware JSONB DEFAULT '{}'::jsonb,
  selected_preset TEXT,
  window_unit JSONB,
  tier TEXT NOT NULL DEFAULT 'Tier 3',
  deterministic BOOLEAN NOT NULL DEFAULT TRUE,
  constitutional_hash CHAR(64),
  audit_trail JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fabricator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  material TEXT NOT NULL CHECK (material IN ('aluminum', 'upvc', 'wood')),
  width NUMERIC(8, 2) NOT NULL,
  height NUMERIC(8, 2),
  thickness NUMERIC(8, 2),
  color TEXT DEFAULT '#C0C0C0',
  cost_per_meter NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cutting_allowance NUMERIC(5, 2) DEFAULT 3.0,
  supplier TEXT,
  stock_quantity NUMERIC(10, 2) DEFAULT 0,
  min_stock_level NUMERIC(10, 2) DEFAULT 0,
  max_stock_level NUMERIC(10, 2),
  system_brand TEXT,
  specifications JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.fabricator_profiles(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  unit TEXT DEFAULT 'meters',
  project_id UUID,
  reference_number TEXT,
  related_movement_id UUID REFERENCES public.stock_movements(id) ON DELETE SET NULL,
  stock_before NUMERIC(10, 2) NOT NULL,
  stock_after NUMERIC(10, 2) NOT NULL,
  notes TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.fabricator_profiles(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL DEFAULT 'low_stock',
  severity TEXT,
  threshold_value NUMERIC,
  current_value NUMERIC NOT NULL DEFAULT 0,
  is_resolved BOOLEAN DEFAULT FALSE,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Minimal stub so 20260908 policy block can attach if present
CREATE TABLE IF NOT EXISTS public.service_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
