-- Add digital twin linkage + service ticket relation to quotes for customer portal tracking
-- Safe / idempotent. Run after unify_tickets_migration.sql (so generate_digital_twin_code exists) and base schema.

BEGIN;

-- 1. Add columns if they do not exist
DO $$ BEGIN
  ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS digital_twin_code TEXT; -- twin / digital reference
  ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS related_service_ticket_id UUID REFERENCES public.service_tickets(id) ON DELETE SET NULL;
  ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL;
  ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS portal_reference TEXT; -- optional human friendly link string
EXCEPTION WHEN others THEN NULL; END $$;

-- 2. Indexes (partial unique on twin code)
CREATE UNIQUE INDEX IF NOT EXISTS uq_quotes_digital_twin_code ON public.quotes(digital_twin_code) WHERE digital_twin_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_related_service_ticket ON public.quotes(related_service_ticket_id);
CREATE INDEX IF NOT EXISTS idx_quotes_machine_id ON public.quotes(machine_id);
CREATE INDEX IF NOT EXISTS idx_quotes_portal_reference ON public.quotes(portal_reference);

-- 2b. Enforce digital twin code format if present
DO $$ BEGIN
  ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_dtc_format CHECK (
      digital_twin_code IS NULL OR digital_twin_code ~ '^DTC-[0-9]{4}-[A-Z0-9]{8}$'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Trigger function to auto-populate digital_twin_code when linked to a service ticket or machine
CREATE OR REPLACE FUNCTION public.set_quote_digital_twin_code()
RETURNS TRIGGER AS $$
DECLARE v_serial TEXT; v_st_code TEXT; BEGIN
  -- If already provided, respect user-set value
  IF NEW.digital_twin_code IS NOT NULL AND NEW.digital_twin_code <> '' THEN
    RETURN NEW;
  END IF;

  -- Inherit from related service ticket if present
  IF NEW.related_service_ticket_id IS NOT NULL THEN
     SELECT digital_twin_code INTO v_st_code FROM public.service_tickets WHERE id = NEW.related_service_ticket_id;
     IF v_st_code IS NOT NULL THEN
        NEW.digital_twin_code := v_st_code;
        RETURN NEW;
     END IF;
  END IF;

  -- Generate using machine context if available (requires function from unify_tickets_migration)
  IF NEW.machine_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'generate_digital_twin_code'
  ) THEN
     SELECT serial_number INTO v_serial FROM public.machines WHERE id = NEW.machine_id;
     NEW.digital_twin_code := public.generate_digital_twin_code(NEW.machine_id, v_serial);
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_quote_digital_twin_code ON public.quotes;
CREATE TRIGGER trg_set_quote_digital_twin_code
  BEFORE INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_quote_digital_twin_code();

-- 4. Portal lookup function (SECURITY INVOKER so RLS still applies)
-- Allows customers to search their own quotes by quote_number or digital_twin_code or portal_reference
CREATE OR REPLACE FUNCTION public.portal_quote_lookup(_query TEXT)
RETURNS TABLE (
  id UUID,
  quote_number TEXT,
  status quote_status,
  digital_twin_code TEXT,
  portal_reference TEXT,
  total_amount DECIMAL(12,2),
  related_service_ticket_id UUID,
  created_at timestamptz
)
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT q.id,
         q.quote_number,
         q.status,
         q.digital_twin_code,
         q.portal_reference,
         q.total_amount,
         q.related_service_ticket_id,
         q.created_at
  FROM public.quotes q
  WHERE q.user_id = auth.uid()
    AND (
      q.quote_number ILIKE '%'||_query||'%' OR
      (q.digital_twin_code IS NOT NULL AND q.digital_twin_code ILIKE '%'||_query||'%') OR
      (q.portal_reference IS NOT NULL AND q.portal_reference ILIKE '%'||_query||'%')
    )
  ORDER BY q.created_at DESC
  LIMIT 50;
$$;

COMMIT;

-- End add_quote_twin_linkage.sql