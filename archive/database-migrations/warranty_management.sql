-- Warranty Management Schema (Idempotent)
-- Provides:
--  1. warranty_plans: configurable plans editable by sales/admin
--  2. warranty_registrations: individual machine/customer warranty records
--  3. Functions to confirm sale & validate warranty
--  4. Triggers to auto-compute end date & sync machines table (warranty_valid / warranty_expiry)
-- Execute in Supabase SQL editor or migration tool. Safe to re-run.

BEGIN;

-- 0. ENUM types (if you prefer ENUM; else TEXT with CHECK). Using ENUM for consistency.
DO $$ BEGIN
  CREATE TYPE warranty_status AS ENUM ('pending','active','expired','void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. warranty_plans (editable catalog by sales/admin)
CREATE TABLE IF NOT EXISTS public.warranty_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_duration_months INT NOT NULL CHECK (default_duration_months > 0),
  coverage JSONB DEFAULT '{}'::jsonb,          -- structure: {parts: [...], labor: true, onsite: true, exclusions: [...]}
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. warranty_registrations
CREATE TABLE IF NOT EXISTS public.warranty_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_code TEXT UNIQUE,                          -- human-friendly code (auto-generated)
  plan_id UUID REFERENCES public.warranty_plans(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  machine_serial_number TEXT NOT NULL,               -- final validated serial
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sale_confirmed BOOLEAN DEFAULT FALSE,
  sale_confirmed_at TIMESTAMPTZ,
  sale_confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  warranty_start_date DATE,                          -- usually sale_confirmed_at::date
  warranty_end_date DATE,
  duration_months INT,                               -- snapshot of plan or overridden
  status warranty_status DEFAULT 'pending',
  meta JSONB DEFAULT '{}'::jsonb,                    -- arbitrary extra data (e.g. installer, location)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2b. Indexes
CREATE INDEX IF NOT EXISTS idx_warranty_registrations_serial ON public.warranty_registrations(machine_serial_number);
CREATE INDEX IF NOT EXISTS idx_warranty_registrations_customer ON public.warranty_registrations(customer_id);
CREATE INDEX IF NOT EXISTS idx_warranty_registrations_status ON public.warranty_registrations(status);

-- 3. Helper: update_updated_at trigger (reuse if exists)
CREATE OR REPLACE FUNCTION public.warranty_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_warranty_plans_updated
    BEFORE UPDATE ON public.warranty_plans
    FOR EACH ROW EXECUTE FUNCTION public.warranty_update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_warranty_registrations_updated
    BEFORE UPDATE ON public.warranty_registrations
    FOR EACH ROW EXECUTE FUNCTION public.warranty_update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Generate warranty code (e.g., WTY-2025-00001)
CREATE OR REPLACE FUNCTION public.generate_warranty_code()
RETURNS TEXT AS $$
DECLARE year_part TEXT; next_num INT; BEGIN
  year_part := to_char(NOW(),'YYYY');
  SELECT COALESCE(MAX( (regexp_match(warranty_code,'WTY-'||year_part||'-(\\d+)'))[1]::INT),0)+1
    INTO next_num
  FROM public.warranty_registrations
  WHERE warranty_code LIKE 'WTY-'||year_part||'-%';
  RETURN 'WTY-'||year_part||'-'||LPAD(next_num::TEXT,5,'0');
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_warranty_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.warranty_code IS NULL OR NEW.warranty_code = '' THEN
    NEW.warranty_code := public.generate_warranty_code();
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_set_warranty_code
    BEFORE INSERT ON public.warranty_registrations
    FOR EACH ROW EXECUTE FUNCTION public.set_warranty_code();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Auto-compute end date when start/duration change
CREATE OR REPLACE FUNCTION public.warranty_compute_end_date()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.warranty_start_date IS NOT NULL AND NEW.duration_months IS NOT NULL) THEN
    NEW.warranty_end_date := (NEW.warranty_start_date + (NEW.duration_months || ' months')::interval)::date;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_warranty_compute_end
    BEFORE INSERT OR UPDATE ON public.warranty_registrations
    FOR EACH ROW EXECUTE FUNCTION public.warranty_compute_end_date();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Sync machines table when warranty becomes active
CREATE OR REPLACE FUNCTION public.sync_machine_warranty()
RETURNS TRIGGER AS $$
DECLARE m_id UUID; BEGIN
  IF NEW.status = 'active' AND NEW.sale_confirmed AND NEW.machine_serial_number IS NOT NULL THEN
    -- Ensure a machine record exists for this serial & owner
    SELECT id INTO m_id FROM public.machines WHERE serial_number = NEW.machine_serial_number LIMIT 1;
    IF m_id IS NULL THEN
      -- Create minimal machine record (name/model unknown placeholders if not existing)
      INSERT INTO public.machines (name, model, serial_number, owner_id, warranty_expiry, warranty_valid)
      VALUES ('Machine '||substring(NEW.machine_serial_number,1,8), 'Unknown', NEW.machine_serial_number, NEW.customer_id, NEW.warranty_end_date, TRUE)
      ON CONFLICT (serial_number) DO UPDATE SET warranty_expiry = EXCLUDED.warranty_expiry, warranty_valid = TRUE;
    ELSE
      UPDATE public.machines
        SET warranty_expiry = NEW.warranty_end_date, warranty_valid = TRUE, updated_at = NOW()
      WHERE id = m_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_sync_machine_warranty
    AFTER INSERT OR UPDATE ON public.warranty_registrations
    FOR EACH ROW EXECUTE FUNCTION public.sync_machine_warranty();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7. Confirm sale function (SECURITY DEFINER so sales_rep/admin can perform atomically)
CREATE OR REPLACE FUNCTION public.confirm_warranty_sale(_warranty_id UUID, _serial TEXT, _duration_override INT DEFAULT NULL)
RETURNS public.warranty_registrations AS $$
DECLARE v_role TEXT; rec public.warranty_registrations; plan_months INT; BEGIN
  v_role := (auth.jwt() ->> 'role');
  IF v_role NOT IN ('admin','sales_rep') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(default_duration_months,12) INTO plan_months
    FROM public.warranty_plans wp
    WHERE wp.id = (SELECT plan_id FROM public.warranty_registrations WHERE id = _warranty_id);

  UPDATE public.warranty_registrations wr
    SET machine_serial_number = _serial,
        sale_confirmed = TRUE,
        sale_confirmed_at = NOW(),
        sale_confirmed_by = auth.uid(),
        warranty_start_date = CURRENT_DATE,
        duration_months = COALESCE(_duration_override, wr.duration_months, plan_months),
        status = 'active'
    WHERE wr.id = _warranty_id
    RETURNING * INTO rec;

  IF rec.id IS NULL THEN
    RAISE EXCEPTION 'Warranty not found';
  END IF;
  RETURN rec;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Validate warranty function (customer or public if you later open policy)
CREATE OR REPLACE FUNCTION public.validate_warranty(_serial TEXT)
RETURNS TABLE (
  warranty_code TEXT,
  machine_serial_number TEXT,
  status warranty_status,
  warranty_start_date DATE,
  warranty_end_date DATE,
  days_remaining INT,
  plan_name TEXT,
  coverage JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT wr.warranty_code, wr.machine_serial_number, wr.status, wr.warranty_start_date, wr.warranty_end_date,
         CASE WHEN wr.warranty_end_date >= CURRENT_DATE THEN (wr.warranty_end_date - CURRENT_DATE) ELSE 0 END AS days_remaining,
         wp.name, wp.coverage
  FROM public.warranty_registrations wr
  LEFT JOIN public.warranty_plans wp ON wp.id = wr.plan_id
  WHERE wr.machine_serial_number = _serial AND wr.status = 'active';
END; $$ LANGUAGE plpgsql;

-- 9. RLS Enable
ALTER TABLE public.warranty_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_registrations ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies
-- Plans: everyone can view active; sales/admin manage
DO $$ BEGIN
  DROP POLICY IF EXISTS "View active warranty plans" ON public.warranty_plans;
  CREATE POLICY "View active warranty plans" ON public.warranty_plans
    FOR SELECT USING (is_active = TRUE);
END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "Manage warranty plans" ON public.warranty_plans;
  CREATE POLICY "Manage warranty plans" ON public.warranty_plans
    FOR ALL USING ((auth.jwt() ->> 'role') IN ('admin','sales_rep'));
END $$;

-- Registrations: customers view own (only active or pending created for them), create restricted; staff manage
DO $$ BEGIN
  DROP POLICY IF EXISTS "Customers view own warranties" ON public.warranty_registrations;
  CREATE POLICY "Customers view own warranties" ON public.warranty_registrations
    FOR SELECT USING (customer_id = auth.uid());
END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "Customers create pending warranty" ON public.warranty_registrations;
  CREATE POLICY "Customers create pending warranty" ON public.warranty_registrations
    FOR INSERT WITH CHECK (customer_id = auth.uid() AND sale_confirmed = FALSE);
END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "Staff manage warranties" ON public.warranty_registrations;
  CREATE POLICY "Staff manage warranties" ON public.warranty_registrations
    FOR ALL USING ((auth.jwt() ->> 'role') IN ('admin','sales_rep'));
END $$;

-- 11. Seed a default plan if none exists
INSERT INTO public.warranty_plans (name, description, default_duration_months, coverage)
SELECT 'Standard 12M', 'Standard 12 month warranty', 12, '{"parts":[],"labor":true,"onsite":true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.warranty_plans WHERE name = 'Standard 12M');

COMMIT;

-- END Warranty Management Schema
