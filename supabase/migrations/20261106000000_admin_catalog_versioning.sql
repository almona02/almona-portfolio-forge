-- Admin catalog versioning: versioned supplier packs + pricing provenance rails.
--
-- Scope (own workshop, immediate + history):
-- 1. fabricator_system_packs gains version / updated_by / change_note columns so
--    every tuning-studio or admin save stamps a monotonically increasing version.
-- 2. fabricator_system_pack_history keeps an immutable per-version spec snapshot
--    for audit and rollback. Rollback = new version copying an old spec; history
--    rows are never mutated.
--
-- Pricing needs no DDL: the live price stays at
-- fabricator_profiles.specifications.system_pricing, provenance is stored as the
-- sibling key specifications.system_pricing_provenance, and per-version snapshots
-- already live in system_pricing_history (migration 060). The app resolves
-- provenance as sibling-first with history fallback.
--
-- RLS mirrors the tenant/global split from 20261101180000: owners manage their
-- tenant packs and history; global packs stay admin-managed.

-- ---------------------------------------------------------------------------
-- fabricator_system_packs version columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.fabricator_system_packs
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.fabricator_system_packs
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.fabricator_system_packs
  ADD COLUMN IF NOT EXISTS change_note TEXT;

COMMENT ON COLUMN public.fabricator_system_packs.version IS 'Monotonic per-pack version, incremented on every save. See fabricator_system_pack_history for snapshots.';
COMMENT ON COLUMN public.fabricator_system_packs.updated_by IS 'User who saved the current version.';
COMMENT ON COLUMN public.fabricator_system_packs.change_note IS 'Operator note recorded with the current version.';

-- ---------------------------------------------------------------------------
-- fabricator_system_pack_history (immutable snapshots)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fabricator_system_pack_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id TEXT NOT NULL,
  owner_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'tenant' CHECK (scope IN ('global', 'tenant')),
  version INTEGER NOT NULL,
  spec JSONB NOT NULL,
  change_note TEXT,
  source TEXT NOT NULL DEFAULT 'tuning_studio' CHECK (
    source IN ('tuning_studio', 'admin_catalog', 'rollback', 'initial_setup')
  ),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pack_history_version UNIQUE (pack_id, version)
);

CREATE INDEX IF NOT EXISTS idx_pack_history_pack_version
  ON public.fabricator_system_pack_history(pack_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_pack_history_owner
  ON public.fabricator_system_pack_history(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_pack_history_created
  ON public.fabricator_system_pack_history(created_at DESC);

COMMENT ON TABLE public.fabricator_system_pack_history IS 'Immutable per-version snapshots of fabricator_system_packs.spec. Rollback inserts a new version; rows are never updated.';

ALTER TABLE public.fabricator_system_pack_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner reads tenant pack history" ON public.fabricator_system_pack_history;
CREATE POLICY "Owner reads tenant pack history" ON public.fabricator_system_pack_history
  FOR SELECT TO authenticated
  USING (scope = 'tenant' AND owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Owner inserts tenant pack history" ON public.fabricator_system_pack_history;
CREATE POLICY "Owner inserts tenant pack history" ON public.fabricator_system_pack_history
  FOR INSERT TO authenticated
  WITH CHECK (scope = 'tenant' AND owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Admin manages global pack history" ON public.fabricator_system_pack_history;
CREATE POLICY "Admin manages global pack history" ON public.fabricator_system_pack_history
  FOR ALL TO authenticated
  USING (scope = 'global' AND public.is_admin(auth.uid()) IS TRUE)
  WITH CHECK (scope = 'global' AND public.is_admin(auth.uid()) IS TRUE);

DROP POLICY IF EXISTS "Global pack history readable" ON public.fabricator_system_pack_history;
CREATE POLICY "Global pack history readable" ON public.fabricator_system_pack_history
  FOR SELECT TO authenticated
  USING (scope = 'global');

-- No UPDATE or DELETE policies: history is append-only by design.
