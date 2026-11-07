-- Backfill legacy dependency tables for fresh databases.
--
-- Four tables exist on live (created via the legacy migrations/ path or the
-- dashboard) but were never ported to the canonical supabase/migrations chain.
-- Later canonical migrations reference them in foreign keys, RLS policies, and
-- DROP POLICY statements, so a fresh `supabase db reset` fails at
-- 20261016001112 (and would fail again at 20261018183000, 20261018200000, and
-- 20261018220000). This file recreates them faithfully:
--
--   fabricator_customers  from migrations/009_fabricator_projects_and_team.sql
--   machine_profiles      from migrations/20251203_create_machine_profiles.sql
--                         (schema only: no seed templates, no generated_gcode /
--                         machine_job_queue, which nothing in this chain needs)
--   workshops             from migrations/036_add_operation_mode.sql
--                         (including the profiles.workshop_id column its RLS
--                         policy reads)
--   ticket_messages       from the live-generated src/types/database.ts shape
--                         (no CREATE exists anywhere in the repo history)
--   service_tickets cols  prerequisites carry a stub; live has the full
--                         support-desk shape and 20261018122551 triggers on
--                         assigned_to/status/priority (ADD COLUMN IF NOT EXISTS)
--   admin-console tables  13 RLS-fix targets of 20261018260000/20261018280000
--                         (yilmaz_machines, price_history, optimizer_leads,
--                         security_events, audit_signatures, inventory_*,
--                         spare_parts, used_machines, user_addresses,
--                         erp_transaction_log, cnc_safety_logs,
--                         predictive_maintenance_logs)
--
-- Everything is IF NOT EXISTS / DROP-then-CREATE idempotent, so this is a
-- no-op on databases that already have these tables. It is a NEW file with a
-- version just before the first failing migration, so no applied migration is
-- edited and no history hash changes.

-- ---------------------------------------------------------------------------
-- 1. fabricator_customers (per-tenant customer directory)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fabricator_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  sector public.sector_type DEFAULT 'GENERAL',
  billing_info JSONB DEFAULT '{}'::jsonb,
  shipping_info JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.fabricator_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages own fabricator customers" ON public.fabricator_customers;
CREATE POLICY "Owner manages own fabricator customers"
  ON public.fabricator_customers
  FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. machine_profiles (CNC machine registry for Fabricator Pro)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'machine_brand') THEN
    CREATE TYPE public.machine_brand AS ENUM (
      'yilmaz', 'elumatec', 'fomm', 'emmegi', 'biesse', 'custom'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'machine_status') THEN
    CREATE TYPE public.machine_status AS ENUM (
      'idle', 'running', 'maintenance', 'error', 'offline'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.machine_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  brand public.machine_brand NOT NULL DEFAULT 'custom',
  model VARCHAR(255) NOT NULL,
  serial_number VARCHAR(100),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  location VARCHAR(255),
  max_x_travel DECIMAL(10,2) DEFAULT 6500.00,
  max_y_travel DECIMAL(10,2) DEFAULT 1200.00,
  max_z_travel DECIMAL(10,2) DEFAULT 300.00,
  max_spindle_speed INTEGER DEFAULT 18000,
  max_feed_rate DECIMAL(10,2) DEFAULT 15000.00,
  rapid_feed_rate DECIMAL(10,2) DEFAULT 30000.00,
  tool_changer_capacity INTEGER DEFAULT 10,
  controller_type VARCHAR(100),
  gcode_dialect VARCHAR(50) DEFAULT 'fanuc',
  post_processor_config JSONB DEFAULT '{}'::jsonb,
  default_tools JSONB DEFAULT '[]'::jsonb,
  safety_limits JSONB DEFAULT '{}'::jsonb,
  calibration_date TIMESTAMPTZ,
  calibration_accuracy DECIMAL(5,3),
  last_maintenance_date TIMESTAMPTZ,
  next_maintenance_date TIMESTAMPTZ,
  total_runtime_hours DECIMAL(10,2) DEFAULT 0,
  status public.machine_status DEFAULT 'offline',
  current_job_id UUID,
  last_heartbeat TIMESTAMPTZ,
  current_program VARCHAR(255),
  error_message TEXT,
  telemetry JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_machine_profiles_owner_id ON public.machine_profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_machine_profiles_brand ON public.machine_profiles(brand);
CREATE INDEX IF NOT EXISTS idx_machine_profiles_status ON public.machine_profiles(status);
CREATE INDEX IF NOT EXISTS idx_machine_profiles_is_active ON public.machine_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_machine_profiles_last_heartbeat ON public.machine_profiles(last_heartbeat);

ALTER TABLE public.machine_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own machines or templates" ON public.machine_profiles;
CREATE POLICY "Users can view own machines or templates"
  ON public.machine_profiles FOR SELECT
  USING (owner_id = auth.uid() OR owner_id IS NULL);

DROP POLICY IF EXISTS "Users can insert own machines" ON public.machine_profiles;
CREATE POLICY "Users can insert own machines"
  ON public.machine_profiles FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR (owner_id IS NULL AND auth.uid() IS NOT NULL));

DROP POLICY IF EXISTS "Users can update own machines" ON public.machine_profiles;
CREATE POLICY "Users can update own machines"
  ON public.machine_profiles FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own machines" ON public.machine_profiles;
CREATE POLICY "Users can delete own machines"
  ON public.machine_profiles FOR DELETE
  USING (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.update_machine_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_machine_profiles_updated_at ON public.machine_profiles;
CREATE TRIGGER update_machine_profiles_updated_at
  BEFORE UPDATE ON public.machine_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_machine_profiles_updated_at();

-- ---------------------------------------------------------------------------
-- 3. workshops (workshop metadata + operation mode)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'workshop_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN workshop_id UUID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS operation_mode VARCHAR(20) DEFAULT 'production' NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_operation_mode' AND conrelid = 'public.workshops'::regclass
  ) THEN
    ALTER TABLE public.workshops
      ADD CONSTRAINT check_operation_mode CHECK (operation_mode IN ('sandbox', 'production', 'certified'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_workshops_operation_mode ON public.workshops(operation_mode);
CREATE INDEX IF NOT EXISTS idx_workshops_owner_id ON public.workshops(owner_id);

ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workshop owners can manage their workshops" ON public.workshops;
CREATE POLICY "Workshop owners can manage their workshops"
  ON public.workshops FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can view workshops they belong to" ON public.workshops;
CREATE POLICY "Users can view workshops they belong to"
  ON public.workshops FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND workshop_id = workshops.id
    )
  );

-- ---------------------------------------------------------------------------
-- 4. ticket_messages (support ticket conversation)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'message'
    CHECK (message_type IN ('message', 'spare_parts_request', 'status_update', 'assignment', 'resolution', 'internal_note')),
  is_internal_note BOOLEAN NOT NULL DEFAULT FALSE,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  spare_parts_details JSONB,
  status_change JSONB,
  time_spent_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_created
  ON public.ticket_messages(ticket_id, created_at DESC);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5. service_tickets live columns (prerequisites carry a stub)
-- ---------------------------------------------------------------------------
-- 20260113400000 creates a stub (id, ticket_number, user_id, title,
-- description, timestamps). Live has the full support-desk shape below, and
-- 20261018122551 creates an UPDATE OF trigger on assigned_to/status/priority,
-- which fails when the columns are missing. Every ADD is IF NOT EXISTS and
-- every NOT NULL carries a DEFAULT, so this is safe on live rows too.
ALTER TABLE public.service_tickets
  ADD COLUMN IF NOT EXISTS digital_twin_code TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS machine_model TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS maintenance_type TEXT,
  ADD COLUMN IF NOT EXISTS context JSONB,
  ADD COLUMN IF NOT EXISTS related_quote_id UUID,
  ADD COLUMN IF NOT EXISTS related_order_id UUID,
  ADD COLUMN IF NOT EXISTS related_product_id UUID,
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_by UUID,
  ADD COLUMN IF NOT EXISTS sla_response_due TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_resolution_due TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS escalated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT,
  ADD COLUMN IF NOT EXISTS site_location TEXT,
  ADD COLUMN IF NOT EXISTS machine_serial_number TEXT,
  ADD COLUMN IF NOT EXISTS resolution_summary TEXT,
  ADD COLUMN IF NOT EXISTS customer_satisfaction_rating NUMERIC,
  ADD COLUMN IF NOT EXISTS customer_feedback TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 6. Admin-console dependency tables (RLS-fix targets)
-- ---------------------------------------------------------------------------
-- 20261018260000 and 20261018280000 DROP/CREATE policies on tables that only
-- ever existed on live (legacy path or dashboard). DROP POLICY fails when the
-- table itself is missing, so every target is recreated here. Shapes with a
-- legacy CREATE are replicated; the rest follow app usage
-- (src/lib/inventory.ts, src/utils/excelImport.ts) or a minimal faithful
-- shape where nothing in the repo queries them.

-- 6a. yilmaz_machines (from migrations/025; schema + RLS, no seed rows).
CREATE TABLE IF NOT EXISTS public.yilmaz_machines (
  id TEXT PRIMARY KEY,
  model_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  type TEXT,
  power_consumption TEXT,
  voltage TEXT,
  frequency TEXT,
  phase TEXT,
  amperage TEXT,
  air_consumption TEXT,
  air_pressure TEXT,
  width_mm INTEGER,
  length_mm INTEGER,
  height_mm INTEGER,
  weight_net_kg DECIMAL(10,2),
  weight_gross_kg DECIMAL(10,2),
  image_url TEXT,
  spec_pdf_url TEXT,
  youtube_url TEXT,
  model_3d_path TEXT,
  has_3d_model BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  release_date DATE,
  specifications JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_yilmaz_machines_category ON public.yilmaz_machines(category);
CREATE INDEX IF NOT EXISTS idx_yilmaz_machines_model_code ON public.yilmaz_machines(model_code);
ALTER TABLE public.yilmaz_machines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view machines" ON public.yilmaz_machines;
CREATE POLICY "Anyone can view machines" ON public.yilmaz_machines FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role can manage machines" ON public.yilmaz_machines;
CREATE POLICY "Service role can manage machines" ON public.yilmaz_machines
  FOR ALL USING (auth.role() = 'service_role');

-- 6b. price_history (from migrations/005; policy reads changed_by).
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('profile', 'accessory', 'material', 'labor', 'configuration')),
  entity_id UUID,
  entity_name TEXT,
  region TEXT,
  currency TEXT NOT NULL,
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2),
  price_change_percentage DECIMAL(5,2),
  change_reason TEXT,
  changed_by UUID REFERENCES public.profiles(id),
  change_source TEXT DEFAULT 'manual' CHECK (change_source IN ('manual', 'bulk_import', 'api', 'scheduled')),
  version_number INTEGER DEFAULT 1,
  is_current_version BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_price_change CHECK (new_price >= 0)
);
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- 6c. optimizer_leads (from migrations/011).
CREATE TABLE IF NOT EXISTS public.optimizer_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  optimization_result JSONB,
  savings_egp DECIMAL(10,2),
  converted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.optimizer_leads ENABLE ROW LEVEL SECURITY;

-- 6d. security_events (from migrations/20251203).
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  severity VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON public.security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- 6e. audit_signatures (from migrations/20251205).
CREATE TABLE IF NOT EXISTS public.audit_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  previous_hash TEXT,
  current_hash TEXT NOT NULL
);
ALTER TABLE public.audit_signatures ENABLE ROW LEVEL SECURITY;

-- 6f. inventory_reservations (shape from src/lib/inventory.ts).
CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  reservation_type TEXT,
  status TEXT NOT NULL DEFAULT 'reserved',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;

-- 6g. inventory_logs (shape from src/lib/inventory.ts).
CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  old_quantity NUMERIC,
  new_quantity NUMERIC,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

-- 6h. spare_parts (shape from src/utils/excelImport.ts).
CREATE TABLE IF NOT EXISTS public.spare_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  compatible_machines TEXT[] DEFAULT '{}',
  price NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_order_quantity INTEGER NOT NULL DEFAULT 1,
  weight_kg NUMERIC,
  specifications JSONB DEFAULT '{}'::jsonb,
  image_url TEXT,
  is_critical BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;

-- 6i. used_machines (nothing in the repo queries it; minimal marketplace shape).
CREATE TABLE IF NOT EXISTS public.used_machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  currency TEXT NOT NULL DEFAULT 'EGP',
  status TEXT NOT NULL DEFAULT 'available',
  owner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.used_machines ENABLE ROW LEVEL SECURITY;

-- 6j. user_addresses (policy reads user_id).
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT,
  address JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- 6k. erp_transaction_log (policy reads quote_id).
CREATE TABLE IF NOT EXISTS public.erp_transaction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  action TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.erp_transaction_log ENABLE ROW LEVEL SECURITY;

-- 6l. cnc_safety_logs (admin-only policy; nothing queries it).
CREATE TABLE IF NOT EXISTS public.cnc_safety_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT,
  severity TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.cnc_safety_logs ENABLE ROW LEVEL SECURITY;

-- 6m. predictive_maintenance_logs (admin/technician policy; nothing queries it).
CREATE TABLE IF NOT EXISTS public.predictive_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_ref TEXT,
  prediction JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.predictive_maintenance_logs ENABLE ROW LEVEL SECURITY;
