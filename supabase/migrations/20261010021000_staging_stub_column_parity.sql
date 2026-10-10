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

UPDATE public.fabricator_manufacturing_authority_revisions
SET authority_payload = coalesce(
  authority_payload,
  jsonb_build_object(
    'schema', 'almona.manufacturing-authority',
    'schemaVersion', 1,
    'system', jsonb_build_object('id', system_pack_id),
    'systemPack', jsonb_build_object(
      'id', system_pack_id,
      'revision', system_pack_revision,
      'evidenceStatus', 'approved',
      'approvalId', approval_id::TEXT
    ),
    'profiles', jsonb_build_array(
      jsonb_build_object(
        'role', 'frame', 'profileId', 'STUB-FRAME', 'stockLengthMm', 6000,
        'evidenceStatus', 'approved', 'approvalId', 'b1000000-0000-4000-8000-000000000001'
      ),
      jsonb_build_object(
        'role', 'sash', 'profileId', 'STUB-SASH', 'stockLengthMm', 6000,
        'evidenceStatus', 'approved', 'approvalId', 'b1000000-0000-4000-8000-000000000002'
      )
    ),
    'cuttingRules', jsonb_build_array(
      jsonb_build_object(
        'ruleId', system_pack_id || '-cut', 'revision', 1,
        'evidenceStatus', 'approved',
        'approvalId', 'c1000000-0000-4000-8000-000000000001',
        'deductions', jsonb_build_object('endDeductionMm', 20),
        'allowances', jsonb_build_object('weldMm', 3),
        'applicability', jsonb_build_object('materials', jsonb_build_array('aluminum'))
      )
    ),
    'toleranceRule', jsonb_build_object(
      'ruleId', system_pack_id || '-tolerance', 'revision', 1,
      'evidenceStatus', 'approved',
      'approvalId', 'c1000000-0000-4000-8000-000000000002'
    ),
    'manufacturingSettings', jsonb_build_object('sawKerfMm', 4, 'trimCutMm', 0)
  )
)
WHERE authority_payload IS NULL;

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
