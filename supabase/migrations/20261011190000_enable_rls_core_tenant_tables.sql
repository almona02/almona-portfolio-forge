-- Tenant isolation for the core fabricator tenant tables.
--
-- These tables shipped without row level security while ~12 sibling fabricator
-- tables (position releases, pose quotes, optimization evidence, approvals,
-- hardener audit) already enforce owner-scoped policies. With RLS disabled the
-- anon and authenticated grants were live, so any holder of the public anon key
-- (which ships inside the frontend bundle) could read and write every tenant's
-- rows, bypassing the application-level owner filters entirely.
--
-- Policy shape mirrors public.fabricator_position_releases and uses each table's
-- real owner column: owner_user_id for the fabricator v1/v2 tables, user_id for
-- fabricator_profiles, orders and stock_movements.

BEGIN;

-- fabricator_positions (owner column: owner_user_id)
ALTER TABLE public.fabricator_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fabricator_positions_select_own ON public.fabricator_positions;
CREATE POLICY fabricator_positions_select_own ON public.fabricator_positions
FOR SELECT USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS fabricator_positions_insert_own ON public.fabricator_positions;
CREATE POLICY fabricator_positions_insert_own ON public.fabricator_positions
FOR INSERT WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS fabricator_positions_update_own ON public.fabricator_positions;
CREATE POLICY fabricator_positions_update_own ON public.fabricator_positions
FOR UPDATE USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS fabricator_positions_delete_own ON public.fabricator_positions;
CREATE POLICY fabricator_positions_delete_own ON public.fabricator_positions
FOR DELETE USING (owner_user_id = auth.uid());

REVOKE ALL ON public.fabricator_positions FROM anon;

-- fabricator_positions_v2 (owner column: owner_user_id)
ALTER TABLE public.fabricator_positions_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fabricator_positions_v2_select_own ON public.fabricator_positions_v2;
CREATE POLICY fabricator_positions_v2_select_own ON public.fabricator_positions_v2
FOR SELECT USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS fabricator_positions_v2_insert_own ON public.fabricator_positions_v2;
CREATE POLICY fabricator_positions_v2_insert_own ON public.fabricator_positions_v2
FOR INSERT WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS fabricator_positions_v2_update_own ON public.fabricator_positions_v2;
CREATE POLICY fabricator_positions_v2_update_own ON public.fabricator_positions_v2
FOR UPDATE USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS fabricator_positions_v2_delete_own ON public.fabricator_positions_v2;
CREATE POLICY fabricator_positions_v2_delete_own ON public.fabricator_positions_v2
FOR DELETE USING (owner_user_id = auth.uid());

REVOKE ALL ON public.fabricator_positions_v2 FROM anon;

-- fabricator_projects (owner column: owner_user_id)
ALTER TABLE public.fabricator_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fabricator_projects_select_own ON public.fabricator_projects;
CREATE POLICY fabricator_projects_select_own ON public.fabricator_projects
FOR SELECT USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS fabricator_projects_insert_own ON public.fabricator_projects;
CREATE POLICY fabricator_projects_insert_own ON public.fabricator_projects
FOR INSERT WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS fabricator_projects_update_own ON public.fabricator_projects;
CREATE POLICY fabricator_projects_update_own ON public.fabricator_projects
FOR UPDATE USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS fabricator_projects_delete_own ON public.fabricator_projects;
CREATE POLICY fabricator_projects_delete_own ON public.fabricator_projects
FOR DELETE USING (owner_user_id = auth.uid());

REVOKE ALL ON public.fabricator_projects FROM anon;

-- fabricator_projects_v2 (owner column: owner_user_id)
ALTER TABLE public.fabricator_projects_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fabricator_projects_v2_select_own ON public.fabricator_projects_v2;
CREATE POLICY fabricator_projects_v2_select_own ON public.fabricator_projects_v2
FOR SELECT USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS fabricator_projects_v2_insert_own ON public.fabricator_projects_v2;
CREATE POLICY fabricator_projects_v2_insert_own ON public.fabricator_projects_v2
FOR INSERT WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS fabricator_projects_v2_update_own ON public.fabricator_projects_v2;
CREATE POLICY fabricator_projects_v2_update_own ON public.fabricator_projects_v2
FOR UPDATE USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS fabricator_projects_v2_delete_own ON public.fabricator_projects_v2;
CREATE POLICY fabricator_projects_v2_delete_own ON public.fabricator_projects_v2
FOR DELETE USING (owner_user_id = auth.uid());

REVOKE ALL ON public.fabricator_projects_v2 FROM anon;

-- fabricator_profiles (owner column: user_id)
ALTER TABLE public.fabricator_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fabricator_profiles_select_own ON public.fabricator_profiles;
CREATE POLICY fabricator_profiles_select_own ON public.fabricator_profiles
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS fabricator_profiles_insert_own ON public.fabricator_profiles;
CREATE POLICY fabricator_profiles_insert_own ON public.fabricator_profiles
FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS fabricator_profiles_update_own ON public.fabricator_profiles;
CREATE POLICY fabricator_profiles_update_own ON public.fabricator_profiles
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS fabricator_profiles_delete_own ON public.fabricator_profiles;
CREATE POLICY fabricator_profiles_delete_own ON public.fabricator_profiles
FOR DELETE USING (user_id = auth.uid());

REVOKE ALL ON public.fabricator_profiles FROM anon;

-- orders (owner column: user_id)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orders_select_own ON public.orders;
CREATE POLICY orders_select_own ON public.orders
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS orders_insert_own ON public.orders;
CREATE POLICY orders_insert_own ON public.orders
FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS orders_update_own ON public.orders;
CREATE POLICY orders_update_own ON public.orders
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS orders_delete_own ON public.orders;
CREATE POLICY orders_delete_own ON public.orders
FOR DELETE USING (user_id = auth.uid());

REVOKE ALL ON public.orders FROM anon;

-- stock_movements (owner column: user_id)
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stock_movements_select_own ON public.stock_movements;
CREATE POLICY stock_movements_select_own ON public.stock_movements
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS stock_movements_insert_own ON public.stock_movements;
CREATE POLICY stock_movements_insert_own ON public.stock_movements
FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS stock_movements_update_own ON public.stock_movements;
CREATE POLICY stock_movements_update_own ON public.stock_movements
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS stock_movements_delete_own ON public.stock_movements;
CREATE POLICY stock_movements_delete_own ON public.stock_movements
FOR DELETE USING (user_id = auth.uid());

REVOKE ALL ON public.stock_movements FROM anon;

COMMIT;
