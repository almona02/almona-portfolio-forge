-- Unified Ticketing Migration
-- Creates/aligns service_tickets + ticket_messages with application types (tickets.ts)
-- Safe (idempotent) creation; does not drop existing data.

BEGIN;

-- 1. Ensure ENUM types exist (reuse existing ticket_type etc. if present)
DO $$ BEGIN
  CREATE TYPE ticket_type AS ENUM ('general','technical','billing','sales','spare_parts','warranty','complaint','installation','maintenance','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Ensure new value 'other' exists if type pre-existed without it
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'ticket_type' AND e.enumlabel = 'other'
  ) THEN
    ALTER TYPE ticket_type ADD VALUE 'other';
  END IF;
END $$;
DO $$ BEGIN
    CREATE TYPE ticket_priority AS ENUM ('low','medium','high','critical','urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('open','assigned','in_progress','awaiting_parts','awaiting_customer','pending_approval','resolved','closed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE message_type AS ENUM ('message','spare_parts_request','status_update','assignment','resolution','internal_note');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. service_tickets table
CREATE TABLE IF NOT EXISTS public.service_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_number TEXT UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type ticket_type NOT NULL DEFAULT 'general',
    priority ticket_priority NOT NULL DEFAULT 'medium',
    status ticket_status NOT NULL DEFAULT 'open',
    related_quote_id UUID NULL REFERENCES public.quotes(id) ON DELETE SET NULL,
    related_order_id UUID NULL REFERENCES public.orders(id) ON DELETE SET NULL,
    related_product_id UUID NULL REFERENCES public.products(id) ON DELETE SET NULL,
    assigned_to UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    assigned_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    sla_response_due TIMESTAMPTZ,
    sla_resolution_due TIMESTAMPTZ,
    first_response_at TIMESTAMPTZ,
    sla_breached BOOLEAN DEFAULT FALSE,
    escalated BOOLEAN DEFAULT FALSE,
    escalated_at TIMESTAMPTZ,
    contact_phone TEXT,
    contact_email TEXT,
    preferred_contact_method TEXT DEFAULT 'email',
    site_location TEXT,
    machine_serial_number TEXT,
    resolution_summary TEXT,
    customer_satisfaction_rating INT,
    customer_feedback TEXT,
    maintenance_type TEXT CHECK (maintenance_type IN ('preventive','corrective','predictive','emergency') OR maintenance_type IS NULL),
    urgency_level TEXT CHECK (urgency_level IN ('routine','urgent','critical') OR urgency_level IS NULL),
    source TEXT, -- creation source (services, quote, spare_parts, training, emergency, machine, api)
    context JSONB, -- raw context payload used for creation
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);

-- 2b. Backfill new columns if table pre-existed without them
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='service_tickets'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema='public' AND table_name='service_tickets' AND column_name='source'
    ) THEN
      ALTER TABLE public.service_tickets ADD COLUMN source TEXT;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema='public' AND table_name='service_tickets' AND column_name='context'
    ) THEN
      ALTER TABLE public.service_tickets ADD COLUMN context JSONB;
    END IF;
  END IF;
END $$;

-- 3. ticket_messages table
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type message_type NOT NULL DEFAULT 'message',
    is_internal_note BOOLEAN DEFAULT FALSE,
    attachments JSONB DEFAULT '[]'::jsonb,
    spare_parts_details JSONB,
    status_change JSONB,
    time_spent_minutes INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    edited_at TIMESTAMPTZ
);

-- 4. update trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- 5. Triggers
DO $$ BEGIN
  CREATE TRIGGER update_service_tickets_updated_at
    BEFORE UPDATE ON public.service_tickets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Ticket number generator
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT AS $$
DECLARE next_num INTEGER; year_part TEXT; BEGIN
  year_part := to_char(NOW(),'YYYY');
  SELECT COALESCE(MAX( (regexp_match(ticket_number,'TKT-'||year_part||'-(\\d+)'))[1]::INT),0)+1 INTO next_num FROM public.service_tickets WHERE ticket_number LIKE 'TKT-'||year_part||'-%';
  RETURN 'TKT-'||year_part||'-'||LPAD(next_num::TEXT,5,'0');
END; $$ LANGUAGE plpgsql;

-- 7. Before insert trigger to set ticket_number
CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.generate_ticket_number();
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER set_ticket_number_trigger
    BEFORE INSERT ON public.service_tickets
    FOR EACH ROW EXECUTE FUNCTION public.set_ticket_number();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_service_tickets_user_id ON public.service_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_status ON public.service_tickets(status);
CREATE INDEX IF NOT EXISTS idx_service_tickets_type ON public.service_tickets(type);
CREATE INDEX IF NOT EXISTS idx_service_tickets_priority ON public.service_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_service_tickets_assigned_to ON public.service_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_service_tickets_created_at ON public.service_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_service_tickets_ticket_number ON public.service_tickets(ticket_number);
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='service_tickets' AND column_name='source'
  ) THEN
    BEGIN
      CREATE INDEX IF NOT EXISTS idx_service_tickets_source ON public.service_tickets(source);
    EXCEPTION WHEN others THEN NULL; END;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_author_id ON public.ticket_messages(author_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON public.ticket_messages(created_at);

-- 9. RLS enable
ALTER TABLE public.service_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies
-- Basic user ownership
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users view own tickets" ON public.service_tickets;
  CREATE POLICY "Users view own tickets" ON public.service_tickets
    FOR SELECT USING (auth.uid() = user_id);
END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users create own tickets" ON public.service_tickets;
  CREATE POLICY "Users create own tickets" ON public.service_tickets
    FOR INSERT WITH CHECK (auth.uid() = user_id);
END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users update own open tickets" ON public.service_tickets;
  CREATE POLICY "Users update own open tickets" ON public.service_tickets
    FOR UPDATE USING (auth.uid() = user_id AND status IN ('open','awaiting_customer'));
END $$;

-- Staff broader access (admin / technician / sales_rep)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Staff view tickets" ON public.service_tickets;
  CREATE POLICY "Staff view tickets" ON public.service_tickets
    FOR SELECT USING ((auth.jwt() ->> 'role') IN ('admin','technician','sales_rep'));
END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "Staff manage tickets" ON public.service_tickets;
  CREATE POLICY "Staff manage tickets" ON public.service_tickets
    FOR ALL USING ((auth.jwt() ->> 'role') IN ('admin','technician'));
END $$;

-- Messages policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users view ticket messages" ON public.ticket_messages;
  CREATE POLICY "Users view ticket messages" ON public.ticket_messages
    FOR SELECT USING (EXISTS (
      SELECT 1 FROM public.service_tickets st
      WHERE st.id = ticket_id AND (st.user_id = auth.uid() OR (auth.jwt() ->> 'role') IN ('admin','technician','sales_rep'))
    ));
END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users create ticket messages" ON public.ticket_messages;
  CREATE POLICY "Users create ticket messages" ON public.ticket_messages
    FOR INSERT WITH CHECK (EXISTS (
      SELECT 1 FROM public.service_tickets st
      WHERE st.id = ticket_id AND (st.user_id = auth.uid() OR (auth.jwt() ->> 'role') IN ('admin','technician','sales_rep'))
    ));
END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "Staff manage messages" ON public.ticket_messages;
  CREATE POLICY "Staff manage messages" ON public.ticket_messages
    FOR ALL USING ((auth.jwt() ->> 'role') IN ('admin','technician'));
END $$;

COMMIT;

-- END Unified Ticketing Migration
