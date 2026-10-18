-- Service Contracts & Preventive-Maintenance Visit Tickets.
-- Contracts are keyed by owner (factory/user) + machine, carry a regular visit
-- frequency, and each visit is proven by a visit ticket with photo evidence.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS public.service_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  machine_id uuid REFERENCES public.machine_profiles(id) ON DELETE SET NULL,
  factory_name text NOT NULL DEFAULT '',
  machine_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  visit_frequency text NOT NULL DEFAULT 'monthly'
    CHECK (visit_frequency IN ('weekly','biweekly','monthly','quarterly','biannual','annual')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  terms text,
  price numeric CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'EGP',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_contracts_owner_idx ON public.service_contracts(owner_id);
CREATE INDEX IF NOT EXISTS service_contracts_machine_idx ON public.service_contracts(machine_id);
CREATE INDEX IF NOT EXISTS service_contracts_status_idx ON public.service_contracts(status);

CREATE TABLE IF NOT EXISTS public.service_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.service_contracts(id) ON DELETE CASCADE,
  scheduled_at date NOT NULL,
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  type text NOT NULL DEFAULT 'preventive'
    CHECK (type IN ('preventive','corrective','inspection','installation','training')),
  technician text,
  summary text,
  photos text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_visits_contract_idx ON public.service_visits(contract_id);
CREATE INDEX IF NOT EXISTS service_visits_scheduled_idx ON public.service_visits(scheduled_at);

ALTER TABLE public.service_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_visits ENABLE ROW LEVEL SECURITY;

-- Owners and admins manage contracts.
DROP POLICY IF EXISTS service_contracts_manage ON public.service_contracts;
CREATE POLICY service_contracts_manage ON public.service_contracts FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR admin_private.is_admin())
  WITH CHECK (owner_id = auth.uid() OR admin_private.is_admin());

-- Visits follow their contract's owner/admin authority.
DROP POLICY IF EXISTS service_visits_manage ON public.service_visits;
CREATE POLICY service_visits_manage ON public.service_visits FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_contracts c WHERE c.id = contract_id AND (c.owner_id = auth.uid() OR admin_private.is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.service_contracts c WHERE c.id = contract_id AND (c.owner_id = auth.uid() OR admin_private.is_admin())));

-- Visit-photo evidence bucket: public read, authenticated upload.
INSERT INTO storage.buckets (id, name, public) VALUES ('service-visit-photos', 'service-visit-photos', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "service-visit-photos-public-read" ON storage.objects;
CREATE POLICY "service-visit-photos-public-read" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'service-visit-photos');

DROP POLICY IF EXISTS "service-visit-photos-upload" ON storage.objects;
CREATE POLICY "service-visit-photos-upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'service-visit-photos');

COMMIT;
