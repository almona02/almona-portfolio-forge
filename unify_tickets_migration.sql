-- Unify legacy `tickets` and enhanced `service_tickets` plus quote / maintenance / emergency flows
-- Safe / idempotent migration adding unified category + maintenance + digital twin code support
-- Run after core schemas (`database-schema.sql` and `service-ticketing-system.sql`) are applied.

BEGIN;

-- Ensure cryptographic functions (digest) are available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create ticket_category enum (categories business requested)
DO $$ BEGIN
    CREATE TYPE ticket_category AS ENUM (
        'support',               -- General support ticket
        'preventive_maintenance',-- Recurring PM plan instance
        'scheduled_maintenance', -- One-off scheduled maintenance visit
        'emergency_service',     -- Emergency / urgent service request
        'product_quote',         -- Direct quote request from product page
        'add_to_quote'           -- Incremental add-to-quote (shop action)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add new columns to service_tickets if missing
DO $$ BEGIN
    ALTER TABLE public.service_tickets ADD COLUMN IF NOT EXISTS category ticket_category DEFAULT 'support';
    ALTER TABLE public.service_tickets ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;                -- For scheduled maintenance
    ALTER TABLE public.service_tickets ADD COLUMN IF NOT EXISTS maintenance_metadata JSONB DEFAULT '{}'::jsonb; -- Flexible PM details (tasks, checklist, frequency)
    ALTER TABLE public.service_tickets ADD COLUMN IF NOT EXISTS digital_twin_code TEXT;                   -- Generated digital twin reference
    ALTER TABLE public.service_tickets ADD COLUMN IF NOT EXISTS machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL; -- Direct FK (in addition to serial if present)
    ALTER TABLE public.service_tickets ADD COLUMN IF NOT EXISTS created_via TEXT;                         -- Source channel (services_page, product_page, shop, api)
EXCEPTION WHEN others THEN NULL; END $$;

-- 2b. Re-define ticket number generator to avoid ambiguous variable/column names
-- Fixes ERROR 42702 (ambiguous column reference) observed in legacy definition
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    v_next_num INTEGER;
    v_current_year TEXT := to_char(NOW(),'YYYY');
    v_ticket TEXT;
BEGIN
    SELECT COALESCE(MAX( (regexp_match(st.ticket_number, '^TKT-'||v_current_year||'-(\\d+)$'))[1]::INT), 0) + 1
    INTO v_next_num
    FROM public.service_tickets st
    WHERE st.ticket_number LIKE 'TKT-'||v_current_year||'-%';

    v_ticket := 'TKT-' || v_current_year || '-' || LPAD(v_next_num::TEXT, 6, '0');
    RETURN v_ticket;
END;
$$ LANGUAGE plpgsql;

-- 3. Digital twin code generator (deterministic-ish yet unique)
-- Format: DTC-<YEAR>-<BASE32( random || machine || clock_seq ) 8 chars>
CREATE OR REPLACE FUNCTION public.generate_digital_twin_code(_machine_id UUID, _serial TEXT)
RETURNS TEXT AS $$
DECLARE
    base TEXT;
    year_part TEXT := to_char(NOW(),'YYYY');
BEGIN
    base := encode( digest( coalesce(_machine_id::text,'') || coalesce(_serial,'') || clock_timestamp()::text || gen_random_uuid()::text, 'sha256'), 'hex');
    -- Convert hex to base32 subset by mapping (take first 40 bits -> 8 chars from a custom alphabet)
    -- Simpler: just take first 8 alphanumerics from hex and upper-case.
    RETURN 'DTC-' || year_part || '-' || upper(substr(regexp_replace(base,'[^a-zA-Z0-9]','','g'),1,8));
END;
$$ LANGUAGE plpgsql;

-- 4. BEFORE INSERT trigger to auto-generate digital_twin_code for maintenance categories
CREATE OR REPLACE FUNCTION public.set_digital_twin_code()
RETURNS TRIGGER AS $$
DECLARE serial TEXT; mach_serial TEXT; BEGIN
    IF (NEW.category IN ('preventive_maintenance','scheduled_maintenance','emergency_service'))
       AND (NEW.digital_twin_code IS NULL OR NEW.digital_twin_code='') THEN
        -- Try to derive serial preference: direct machine_id, else existing machine_serial_number column
        IF NEW.machine_id IS NOT NULL THEN
            SELECT serial_number INTO serial FROM public.machines WHERE id = NEW.machine_id;
        END IF;
        IF serial IS NULL THEN
            serial := NEW.machine_serial_number;
        END IF;
        NEW.digital_twin_code := public.generate_digital_twin_code(NEW.machine_id, serial);
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_digital_twin_code ON public.service_tickets;
CREATE TRIGGER trg_set_digital_twin_code
    BEFORE INSERT ON public.service_tickets
    FOR EACH ROW EXECUTE FUNCTION public.set_digital_twin_code();

-- 5. Data backfill: migrate legacy simple `tickets` table rows (if table exists & has rows not yet migrated)
DO $$ DECLARE
    _exists BOOLEAN;
BEGIN
    SELECT to_regclass('public.tickets') IS NOT NULL INTO _exists;
    IF _exists THEN
        -- Insert only those not already mapped (heuristic: match on title + created_at by same user)
        INSERT INTO public.service_tickets (
            ticket_number, user_id, title, description, type, priority, status,
            machine_serial_number, machine_id, category, created_at, updated_at
        )
        SELECT
            generate_ticket_number(),
            t.user_id, -- profiles id matches auth.users id
            t.title,
            t.description,
            CASE WHEN t.type = 'maintenance' THEN 'maintenance' ELSE 'general' END::ticket_type,
            COALESCE(NULLIF(t.priority,''),'medium')::ticket_priority,
            COALESCE(NULLIF(t.status,''),'open')::ticket_status,
            m.serial_number,
            t.machine_id,
            'support'::ticket_category,
            t.created_at,
            t.updated_at
        FROM public.tickets t
        LEFT JOIN public.machines m ON m.id = t.machine_id
        WHERE NOT EXISTS (
            SELECT 1 FROM public.service_tickets st
            WHERE st.user_id = t.user_id
              AND st.title = t.title
              AND abs(EXTRACT(EPOCH FROM (st.created_at - t.created_at))) < 5
        );
    END IF;
END $$;

-- 6. Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_service_tickets_category ON public.service_tickets(category);
CREATE INDEX IF NOT EXISTS idx_service_tickets_scheduled_for ON public.service_tickets(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_service_tickets_digital_twin_code ON public.service_tickets(digital_twin_code) WHERE digital_twin_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_tickets_machine_id ON public.service_tickets(machine_id);

-- 7. RLS policy adjustments (allow customers to see their maintenance tickets as before – reuse existing policies)
-- Existing policies already keyed on user_id and staff roles; category does not change them.

-- 8. Optional: view combining category & type for reporting
DROP VIEW IF EXISTS public.unified_ticket_overview;
-- Recreate with security_invoker so row-level policies apply as the querying user (Supabase lint fix)
CREATE VIEW public.unified_ticket_overview WITH (security_invoker = on) AS
SELECT 
    st.id,
    st.ticket_number,
    st.user_id,
    st.category,
    st.type,
    st.priority,
    st.status,
    st.machine_id,
    st.machine_serial_number,
    st.digital_twin_code,
    st.scheduled_for,
    st.created_at,
    st.updated_at
FROM public.service_tickets st;

GRANT SELECT ON public.unified_ticket_overview TO authenticated;

COMMIT;

-- End unify_tickets_migration.sql