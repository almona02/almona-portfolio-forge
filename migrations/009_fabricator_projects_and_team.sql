-- Migration 009: Fabricator Projects, Positions, Customers, Team & System Packs Multitenancy
-- -----------------------------------------------------------------------------
-- This migration adds:
-- - fabricator_projects           : project headers (wizard → dashboard)
-- - fabricator_positions          : poses / window units within projects
-- - fabricator_customers          : per‑tenant customer directory
-- - fabricator_team_members       : tenant‑level fabricator team
-- - fabricator_project_members    : project‑level membership / ACL
-- - Multitenant columns + RLS for fabricator_system_packs
--
-- It assumes:
-- - public.profiles exists and is the tenant root (owner_user_id references)
-- - fabricator_system_packs may already exist; columns are added conditionally

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. Enum types
-- ============================================================================

DO $$
BEGIN
  CREATE TYPE fabricator_role AS ENUM (
    'owner',
    'admin',
    'operator',
    'technical_officer',
    'installer',
    'sales'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. Projects
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fabricator_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  project_code TEXT UNIQUE NOT NULL,                 -- e.g. FP-XXXXXX
  project_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  site_name TEXT,

  currency TEXT NOT NULL DEFAULT 'EGP',
  region TEXT NOT NULL DEFAULT 'global',
  system_pack_id TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'draft',              -- draft/measuring/design/optimized/production/closed
  meta JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.fabricator_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages own projects" ON public.fabricator_projects;

CREATE POLICY "Owner manages own projects"
  ON public.fabricator_projects
  FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- ============================================================================
-- 3. Positions / Window Units
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fabricator_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.fabricator_projects(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  order_number TEXT NOT NULL,
  pos_number TEXT NOT NULL,
  type TEXT NOT NULL,

  overall_width_mm INTEGER NOT NULL,
  overall_height_mm INTEGER NOT NULL,
  color TEXT NOT NULL,
  glazing JSONB DEFAULT '{}'::jsonb,

  system_pack_id TEXT,
  status TEXT NOT NULL DEFAULT 'measuring',          -- measuring/design/optimized/production/quality/delivered
  quantity INTEGER NOT NULL DEFAULT 1,
  position_meta JSONB DEFAULT '{}'::jsonb,           -- flat/floor/elevation/room etc.
  optimization JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fabricator_positions_project
  ON public.fabricator_positions(project_id);

ALTER TABLE public.fabricator_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages own positions" ON public.fabricator_positions;

CREATE POLICY "Owner manages own positions"
  ON public.fabricator_positions
  FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- ============================================================================
-- 4. Fabricator Customers (per‑tenant directory)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fabricator_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  name TEXT NOT NULL,                                -- company / client name
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  sector sector_type DEFAULT 'GENERAL',

  billing_info JSONB DEFAULT '{}'::jsonb,
  shipping_info JSONB DEFAULT '{}'::jsonb,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.fabricator_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages own fabricator customers" ON public.fabricator_customers;

CREATE POLICY "Owner manages own fabricator customers"
  ON public.fabricator_customers
  FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- ============================================================================
-- 5. Fabricator Team Members (tenant‑level)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fabricator_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  role fabricator_role NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  permissions JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (owner_user_id, member_profile_id)
);

ALTER TABLE public.fabricator_team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages own fabricator team" ON public.fabricator_team_members;

CREATE POLICY "Owner manages own fabricator team"
  ON public.fabricator_team_members
  FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- ============================================================================
-- 6. Project‑level Membership (per‑project ACL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fabricator_project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.fabricator_projects(id) ON DELETE CASCADE,
  member_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  role fabricator_role NOT NULL,
  permissions JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (project_id, member_profile_id)
);

ALTER TABLE public.fabricator_project_members ENABLE ROW LEVEL SECURITY;

-- Policy: project owner or the member themselves can see their membership rows.
DROP POLICY IF EXISTS "Project members visibility" ON public.fabricator_project_members;

CREATE POLICY "Project members visibility"
  ON public.fabricator_project_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.fabricator_projects p
      WHERE p.id = project_id
        AND p.owner_user_id = auth.uid()
    )
    OR member_profile_id = auth.uid()
  );

-- Policy: only project owner manages project memberships.
DROP POLICY IF EXISTS "Project owner manages members" ON public.fabricator_project_members;

CREATE POLICY "Project owner manages members"
  ON public.fabricator_project_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.fabricator_projects p
      WHERE p.id = project_id
        AND p.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.fabricator_projects p
      WHERE p.id = project_id
        AND p.owner_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 7. Multitenant System Packs (fabricator_system_packs)
-- ============================================================================

-- Add owner_user_id (tenant) column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fabricator_system_packs'
      AND column_name = 'owner_user_id'
  ) THEN
    ALTER TABLE public.fabricator_system_packs
      ADD COLUMN owner_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add scope column (global vs tenant) if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fabricator_system_packs'
      AND column_name = 'scope'
  ) THEN
    ALTER TABLE public.fabricator_system_packs
      ADD COLUMN scope TEXT NOT NULL DEFAULT 'global'
      CHECK (scope IN ('global', 'tenant'));
  END IF;
END $$;

-- Enable RLS and policies
ALTER TABLE public.fabricator_system_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Global system packs readable" ON public.fabricator_system_packs;
DROP POLICY IF EXISTS "Owner manages tenant system packs" ON public.fabricator_system_packs;

-- Everyone (even unauthenticated) can read global packs
CREATE POLICY "Global system packs readable"
  ON public.fabricator_system_packs
  FOR SELECT
  USING (scope = 'global');

-- Authenticated owner manages their own tenant‑scoped packs
CREATE POLICY "Owner manages tenant system packs"
  ON public.fabricator_system_packs
  FOR ALL
  USING (
    scope = 'tenant'
    AND owner_user_id = auth.uid()
  )
  WITH CHECK (
    scope = 'tenant'
    AND owner_user_id = auth.uid()
  );


