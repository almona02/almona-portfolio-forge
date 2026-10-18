-- Fabricator manufacturing rules (with approval workflow) and tuning parameters
-- for optimization / cut-list, editable by the factory owner (fabricator_admin).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS public.manufacturing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('machining','assembly','cutting','quality')),
  description text,
  applies_to text,
  details jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','rejected')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS manufacturing_rules_owner_idx ON public.manufacturing_rules(owner_id);
CREATE INDEX IF NOT EXISTS manufacturing_rules_status_idx ON public.manufacturing_rules(status);

CREATE TABLE IF NOT EXISTS public.fabricator_tuning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL DEFAULT '',
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, key)
);
CREATE INDEX IF NOT EXISTS fabricator_tuning_owner_idx ON public.fabricator_tuning(owner_id);

ALTER TABLE public.manufacturing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabricator_tuning ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS manufacturing_rules_manage ON public.manufacturing_rules;
CREATE POLICY manufacturing_rules_manage ON public.manufacturing_rules FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR admin_private.is_admin())
  WITH CHECK (owner_id = auth.uid() OR admin_private.is_admin());

DROP POLICY IF EXISTS fabricator_tuning_manage ON public.fabricator_tuning;
CREATE POLICY fabricator_tuning_manage ON public.fabricator_tuning FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR admin_private.is_admin())
  WITH CHECK (owner_id = auth.uid() OR admin_private.is_admin());

COMMIT;
