-- migrations/070_fabricator_v2_schema.sql
-- Fabricator v2 canonical tables (constitutional source of truth)
--
-- Creates:
-- - public.fabricator_projects_v2
-- - public.fabricator_positions_v2
--
-- Constitutional columns:
-- - tier, deterministic, constitutional_hash, audit_trail, last_validated_at
--
BEGIN;

-- ============================================================================
-- Projects v2
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fabricator_projects_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  project_code TEXT NOT NULL,
  project_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  site_name TEXT,

  currency TEXT NOT NULL DEFAULT 'EGP',
  region TEXT NOT NULL DEFAULT 'global',
  system_pack_id TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'draft',
  meta JSONB DEFAULT '{}'::jsonb,

  -- Constitutional metadata
  tier TEXT NOT NULL DEFAULT 'Tier 3',
  deterministic BOOLEAN NOT NULL DEFAULT TRUE,
  constitutional_hash CHAR(64),
  audit_trail JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_validated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Avoid cross-tenant collisions (v1 used project_code UNIQUE globally)
  UNIQUE (owner_user_id, project_code)
);

ALTER TABLE public.fabricator_projects_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages own projects v2" ON public.fabricator_projects_v2;
CREATE POLICY "Owner manages own projects v2"
  ON public.fabricator_projects_v2
  FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- ============================================================================
-- Positions v2
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fabricator_positions_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.fabricator_projects_v2(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  order_number TEXT,
  pos_number TEXT,
  type TEXT,

  overall_width_mm INTEGER,
  overall_height_mm INTEGER,
  color TEXT,
  glazing JSONB DEFAULT '{}'::jsonb,

  system_pack_id TEXT,
  status TEXT NOT NULL DEFAULT 'measuring',
  quantity INTEGER NOT NULL DEFAULT 1,

  -- v1 had both position_meta + meta (059); keep both for compatibility
  position_meta JSONB DEFAULT '{}'::jsonb,
  meta JSONB DEFAULT '{}'::jsonb,
  optimization JSONB,

  -- Rich state fields used by UI
  grid JSONB DEFAULT '{}'::jsonb,
  components JSONB DEFAULT '[]'::jsonb,
  hardware JSONB DEFAULT '{}'::jsonb,
  selected_preset TEXT,

  -- Canonical payload (full WindowUnit-like state)
  window_unit JSONB,

  -- Constitutional metadata
  tier TEXT NOT NULL DEFAULT 'Tier 3',
  deterministic BOOLEAN NOT NULL DEFAULT TRUE,
  constitutional_hash CHAR(64),
  audit_trail JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_validated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fabricator_positions_v2_project
  ON public.fabricator_positions_v2(project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fabricator_positions_v2_owner
  ON public.fabricator_positions_v2(owner_user_id);

ALTER TABLE public.fabricator_positions_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages own positions v2" ON public.fabricator_positions_v2;
CREATE POLICY "Owner manages own positions v2"
  ON public.fabricator_positions_v2
  FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

COMMIT;

