-- migrations/073_fabricator_v2_constitutional_chain.sql
-- Constitutional Migration Audit Chain for Fabricator v1 -> v2 cutover
-- AICS-001: Cryptographic Chain of Custody (append-only, tamper-evident)
--
-- Notes:
-- - Aligns with existing Fabricator multitenancy patterns in migrations/009_fabricator_projects_and_team.sql
-- - Uses pgcrypto.digest(..., 'sha256') (pgcrypto enabled in migrations/001_initial_schema.sql)
-- - Enforces append-only via RLS policies (no UPDATE/DELETE) and chain integrity checks
--
BEGIN;
-- ============================================================================
-- 1) Migration chain table (append-only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.fabricator_migration_chain (
  -- Constitutional identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_position BIGINT GENERATED ALWAYS AS IDENTITY,
  -- Multitenancy alignment (use exact v1 column name)
  -- For project rows: owner_user_id is set; project_id may be NULL
  -- For position rows: owner_user_id and project_id should be set
  owner_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.fabricator_projects(id) ON DELETE CASCADE,
  -- Source (v1)
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  source_entity JSONB NOT NULL,
  source_hash CHAR(64) NOT NULL,
  -- Target (v2)
  target_table TEXT NOT NULL,
  target_id UUID NOT NULL,
  target_hash CHAR(64) NOT NULL,
  -- Cryptographic chain
  previous_hash CHAR(64),
  migration_hash CHAR(64) NOT NULL,
  -- Constitutional metadata
  constitutional_metadata JSONB NOT NULL DEFAULT jsonb_build_object(
    'tier',
    'Tier 3',
    'deterministic',
    true,
    'migration_type',
    'fabricator_consolidation',
    'constitutional_version',
    'AICS-001_v1.0.0'
  ),
  migration_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.fabricator_migration_chain IS 'Append-only cryptographic migration chain for Fabricator v1->v2 consolidation. Provides row-level chain-of-custody for constitutional migration audits.';
-- Chain integrity + hash format checks
ALTER TABLE public.fabricator_migration_chain
ADD CONSTRAINT chk_fabricator_migration_chain_integrity CHECK (
    (
      previous_hash IS NULL
      AND chain_position = 1
    )
    OR (
      previous_hash IS NOT NULL
      AND chain_position > 1
    )
  ),
  ADD CONSTRAINT chk_fabricator_migration_chain_hash_format CHECK (
    source_hash ~ '^[a-f0-9]{64}$'
    AND target_hash ~ '^[a-f0-9]{64}$'
    AND migration_hash ~ '^[a-f0-9]{64}$'
    AND (
      previous_hash IS NULL
      OR previous_hash ~ '^[a-f0-9]{64}$'
    )
  );
-- Prevent duplicate mapping of the same source row into a target row
CREATE UNIQUE INDEX IF NOT EXISTS ux_fabricator_migration_chain_mapping ON public.fabricator_migration_chain(source_table, source_id, target_table, target_id);
-- Allow FK references to chain head hashes (certificate table)
CREATE UNIQUE INDEX IF NOT EXISTS ux_fabricator_migration_chain_migration_hash ON public.fabricator_migration_chain(migration_hash);
CREATE INDEX IF NOT EXISTS idx_fabricator_migration_chain_position ON public.fabricator_migration_chain(chain_position);
CREATE INDEX IF NOT EXISTS idx_fabricator_migration_chain_owner ON public.fabricator_migration_chain(owner_user_id)
WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fabricator_migration_chain_project ON public.fabricator_migration_chain(project_id)
WHERE project_id IS NOT NULL;
-- ============================================================================
-- 2) Append-only RLS policies (no UPDATE/DELETE)
-- ============================================================================
ALTER TABLE public.fabricator_migration_chain ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own migration chain rows" ON public.fabricator_migration_chain;
CREATE POLICY "Users can view own migration chain rows" ON public.fabricator_migration_chain FOR
SELECT USING (
    owner_user_id = auth.uid()
    OR owner_user_id IS NULL
  );
-- Insert restricted to service_role (migrations themselves run as privileged user)
DROP POLICY IF EXISTS "Service role inserts migration chain rows" ON public.fabricator_migration_chain;
CREATE POLICY "Service role inserts migration chain rows" ON public.fabricator_migration_chain FOR
INSERT WITH CHECK (auth.role() = 'service_role');
-- Constitutional append-only: forbid UPDATE and DELETE
DROP POLICY IF EXISTS "No updates on migration chain" ON public.fabricator_migration_chain;
CREATE POLICY "No updates on migration chain" ON public.fabricator_migration_chain FOR
UPDATE USING (false);
DROP POLICY IF EXISTS "No deletes on migration chain" ON public.fabricator_migration_chain;
CREATE POLICY "No deletes on migration chain" ON public.fabricator_migration_chain FOR DELETE USING (false);
-- ============================================================================
-- 3) Cryptographic hash trigger (fails closed on error)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.compute_fabricator_migration_chain_hash() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE prev_chain_hash CHAR(64);
canonical_payload TEXT;
BEGIN -- Link to previous chain hash (append-only order)
SELECT migration_hash INTO prev_chain_hash
FROM public.fabricator_migration_chain
ORDER BY chain_position DESC
LIMIT 1;
NEW.previous_hash := prev_chain_hash;
-- Deterministic canonical payload for hashing
canonical_payload := jsonb_build_object(
  'owner_user_id', NEW.owner_user_id, 'project_id', NEW.project_id, 'source_table', NEW.source_table, 'source_id', NEW.source_id, 'target_table', NEW.target_table, 'target_id', NEW.target_id, 'source_hash', NEW.source_hash, 'target_hash', NEW.target_hash, 'migration_timestamp', NEW.migration_timestamp, 'constitutional_metadata', NEW.constitutional_metadata, 'previous_hash', NEW.previous_hash
)::text;
-- SHA-256(prev_hash + canonical_payload)
NEW.migration_hash := encode(
  digest(
    COALESCE(NEW.previous_hash, '') || '|' || canonical_payload, 'sha256'
  ), 'hex'
);
RETURN NEW;
EXCEPTION
WHEN OTHERS THEN -- Constitutional requirement: fail migration rather than corrupt chain
RAISE EXCEPTION 'Constitutional migration hash computation failed: %',
SQLERRM;
END;
$$;
DROP TRIGGER IF EXISTS trg_fabricator_migration_chain_hash ON public.fabricator_migration_chain;
CREATE TRIGGER trg_fabricator_migration_chain_hash BEFORE
INSERT ON public.fabricator_migration_chain FOR EACH ROW EXECUTE FUNCTION public.compute_fabricator_migration_chain_hash();
COMMIT;