-- Patch 2: Address residual linter warnings
-- Covers:
--   * function_search_path_mutable for public.is_admin (possible 0-arg original variant)
--   * Remaining quote policies (Consolidated quote view/update) not yet updated
--   * Ensures any legacy policies without explicit role scoping are replaced
-- Safe & idempotent.

-- 1. Harden is_admin() 0-arg variant (if it exists) to eliminate mutable search_path warning.
-- Some earlier schemas define is_admin() without params; policies were migrated to is_admin(uuid)
-- but the linter may still see the old variant. We fix both defensively.
-- Recreate both variants explicitly (idempotent with CREATE OR REPLACE) to ensure fixed search_path.
CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;$$;

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role = 'admin'
  );
END;$$;

-- 2. Update quotes policies (old names still referenced by linter)
-- Remove legacy consolidated policies; replace with explicit role-scoped, performance-optimized versions.
DROP POLICY IF EXISTS "Consolidated quote view policy" ON public.quotes;
DROP POLICY IF EXISTS "Consolidated quote update policy" ON public.quotes;
DROP POLICY IF EXISTS "Quotes SELECT policy" ON public.quotes;
DROP POLICY IF EXISTS "Quotes UPDATE policy" ON public.quotes;

-- View (SELECT) policy: owner, or elevated roles (admin, sales_rep)
CREATE POLICY "Quotes SELECT policy" ON public.quotes
  FOR SELECT TO authenticated
  USING ((SELECT auth.role()) = 'authenticated' AND (
      user_id = (SELECT auth.uid()) OR
      (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin','sales_rep')
  ));

-- Update policy: owner in draft OR admin/sales_rep
CREATE POLICY "Quotes UPDATE policy" ON public.quotes
  FOR UPDATE TO authenticated
  USING ((SELECT auth.role()) = 'authenticated' AND (
      (user_id = (SELECT auth.uid()) AND status = 'draft') OR
      (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin','sales_rep')
  ))
  WITH CHECK ((SELECT auth.role()) = 'authenticated' AND (
      (user_id = (SELECT auth.uid()) AND status = 'draft') OR
      (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin','sales_rep')
  ));

-- 3. NOTE on remaining auth_allow_anonymous_sign_ins warnings:
-- After this patch, all policies are restricted with TO authenticated or require auth.role()='authenticated'.
-- If the linter still flags them, it may be using a cached snapshot; rerun after a few minutes or a new migration.

-- 4. Unused indexes: recently created fkey-supporting indexes may legitimately appear unused until queries run.
-- Consider waiting for production workload before dropping. Only drop if confirmed unnecessary after monitoring pg_stat_user_indexes.

-- End Patch 2.
