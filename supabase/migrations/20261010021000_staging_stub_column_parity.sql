-- Staging stub → schema column parity.
-- Safe on prod (ADD COLUMN IF NOT EXISTS only). Enables empty-DB / manufacturing
-- migration replay against Phase B stub tables that omitted payload columns.
-- DO NOT treat as production promote authorization for ledger/binding migrations.

-- Authority revisions: stub lacked payload / audit columns
ALTER TABLE public.fabricator_manufacturing_authority_revisions
  ADD COLUMN IF NOT EXISTS authority_payload JSONB,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS revocation_reason TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS provenance TEXT;

-- Missing authority payloads remain unqualified. Schema parity must never
-- fabricate approved profiles, rules or machining settings for existing rows.

-- Positions v2: stub lacked workflow / identity columns used by convert/QC/release
ALTER TABLE public.fabricator_positions_v2
  ADD COLUMN IF NOT EXISTS order_number TEXT,
  ADD COLUMN IF NOT EXISTS pos_number TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS glazing JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'measuring',
  ADD COLUMN IF NOT EXISTS position_meta JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS optimization JSONB,
  ADD COLUMN IF NOT EXISTS grid JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS hardware JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS selected_preset TEXT,
  ADD COLUMN IF NOT EXISTS window_unit JSONB,
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'Tier 3',
  ADD COLUMN IF NOT EXISTS deterministic BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS constitutional_hash CHAR(64),
  ADD COLUMN IF NOT EXISTS audit_trail JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
