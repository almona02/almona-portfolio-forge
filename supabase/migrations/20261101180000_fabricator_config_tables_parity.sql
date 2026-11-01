-- Workshop configurator tables: schema parity for staging.
--
-- `fabricator_accessories`, `profile_accessory_compatibility` and
-- `fabricator_system_packs` exist on production but were never captured as a
-- migration, so staging (apnmoevmvihfzcnttctx) has none of them and the
-- Admin → Manufacturing Config / Factory Admin configurator cannot load there.
--
-- Everything is additive (`IF NOT EXISTS`); on production the CREATE
-- statements are no-ops. Policies are (re)declared explicitly because the
-- production `auth_manage_system_packs` policy allowed ANY authenticated user
-- to update/delete global vendor packs (`owner_user_id IS NULL`). Here global
-- packs are read-only for non-admins; owners manage their tenant packs;
-- admins (public.is_admin, fail-closed) manage global rows.
--
-- Apply to staging first; review the policy tightening before production.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- fabricator_accessories (owner-scoped hardware catalogue)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fabricator_accessories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hinge','lock','handle','seal','spacer','corner','other')),
  category TEXT,
  unit_price NUMERIC NOT NULL,
  base_cost NUMERIC NOT NULL,
  markup_percentage NUMERIC DEFAULT 30.0,
  supplier TEXT,
  sku TEXT,
  description TEXT,
  compatible_materials TEXT[] DEFAULT '{}'::text[],
  region TEXT[] DEFAULT '{global}'::text[],
  image_url TEXT,
  specifications JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_pricing CHECK (unit_price >= 0 AND base_cost >= 0 AND markup_percentage >= 0)
);
CREATE INDEX IF NOT EXISTS idx_fabricator_accessories_user_id ON public.fabricator_accessories(user_id);
CREATE INDEX IF NOT EXISTS idx_fabricator_accessories_user_type ON public.fabricator_accessories(user_id, type);
CREATE INDEX IF NOT EXISTS idx_fabricator_accessories_type ON public.fabricator_accessories(type);
CREATE INDEX IF NOT EXISTS idx_fabricator_accessories_updated ON public.fabricator_accessories(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_fabricator_accessories_materials ON public.fabricator_accessories USING gin (compatible_materials);
CREATE INDEX IF NOT EXISTS idx_fabricator_accessories_region ON public.fabricator_accessories USING gin (region);
-- idx_fabricator_accessories_name_trgm (gin_trgm_ops) intentionally omitted: needs pg_trgm.

ALTER TABLE public.fabricator_accessories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_view_accessories ON public.fabricator_accessories;
CREATE POLICY auth_view_accessories ON public.fabricator_accessories
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS auth_insert_accessories ON public.fabricator_accessories;
CREATE POLICY auth_insert_accessories ON public.fabricator_accessories
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
DROP POLICY IF EXISTS auth_update_accessories ON public.fabricator_accessories;
CREATE POLICY auth_update_accessories ON public.fabricator_accessories
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS auth_delete_accessories ON public.fabricator_accessories;
CREATE POLICY auth_delete_accessories ON public.fabricator_accessories
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- profile_accessory_compatibility (set kits: profile ↔ accessory)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_accessory_compatibility (
  profile_id UUID NOT NULL REFERENCES public.fabricator_profiles(id) ON DELETE CASCADE,
  accessory_id UUID NOT NULL REFERENCES public.fabricator_accessories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (profile_id, accessory_id)
);
CREATE INDEX IF NOT EXISTS idx_compatibility_profile ON public.profile_accessory_compatibility(profile_id);
CREATE INDEX IF NOT EXISTS idx_compatibility_accessory ON public.profile_accessory_compatibility(accessory_id);

ALTER TABLE public.profile_accessory_compatibility ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_view_compatibilities ON public.profile_accessory_compatibility;
CREATE POLICY auth_view_compatibilities ON public.profile_accessory_compatibility
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.fabricator_profiles fp WHERE fp.id = profile_id AND fp.user_id = auth.uid()));
DROP POLICY IF EXISTS auth_manage_compatibilities ON public.profile_accessory_compatibility;
CREATE POLICY auth_manage_compatibilities ON public.profile_accessory_compatibility
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.fabricator_profiles fp WHERE fp.id = profile_id AND fp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.fabricator_profiles fp WHERE fp.id = profile_id AND fp.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- fabricator_system_packs (vendor = global/read-only, tenant = owner-managed)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fabricator_system_packs (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  regions TEXT[] DEFAULT '{}'::text[],
  brands TEXT[] DEFAULT '{}'::text[],
  spec JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  owner_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global','tenant'))
);
CREATE INDEX IF NOT EXISTS idx_fabricator_system_packs_owner_user_id ON public.fabricator_system_packs(owner_user_id);

ALTER TABLE public.fabricator_system_packs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Global system packs readable" ON public.fabricator_system_packs;
CREATE POLICY "Global system packs readable" ON public.fabricator_system_packs
  FOR SELECT TO authenticated USING (scope = 'global');
DROP POLICY IF EXISTS "Owner manages tenant system packs" ON public.fabricator_system_packs;
CREATE POLICY "Owner manages tenant system packs" ON public.fabricator_system_packs
  FOR ALL TO authenticated
  USING (scope = 'tenant' AND owner_user_id = auth.uid())
  WITH CHECK (scope = 'tenant' AND owner_user_id = auth.uid());
-- Tightened: previously `owner_user_id = auth.uid() OR owner_user_id IS NULL` (no WITH CHECK),
-- which let any authenticated user alter global vendor packs.
DROP POLICY IF EXISTS auth_manage_system_packs ON public.fabricator_system_packs;
CREATE POLICY admin_manages_global_system_packs ON public.fabricator_system_packs
  FOR ALL TO authenticated
  USING (scope = 'global' AND public.is_admin(auth.uid()) IS TRUE)
  WITH CHECK (scope = 'global' AND public.is_admin(auth.uid()) IS TRUE);

COMMIT;
