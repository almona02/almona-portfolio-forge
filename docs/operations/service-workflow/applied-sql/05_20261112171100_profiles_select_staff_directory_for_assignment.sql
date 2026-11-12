-- Admin/support need a staff directory to assign jobs (getAvailableAssignees).
-- Scoped: only callers with admin|support may read profiles whose role is
-- technician|admin|support. Customers and technicians cannot enumerate others.
-- Staging-only apply under B2 authorization. Production unauthorized.

DROP POLICY IF EXISTS profiles_select_staff_directory ON public.profiles;
CREATE POLICY profiles_select_staff_directory ON public.profiles
FOR SELECT TO authenticated
USING (
  admin_private.caller_role() IN ('admin', 'support')
  AND role IN ('technician', 'admin', 'support')
);
