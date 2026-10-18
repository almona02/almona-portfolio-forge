-- Admin controls for the Used Machines marketplace.
-- Admins can read every status (active/sold/flagged/removed) and hard-delete listings.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Admins read all statuses, not just active (public still reads active only).
DROP POLICY IF EXISTS used_machine_admin_read ON public.used_machine_listings;
CREATE POLICY used_machine_admin_read ON public.used_machine_listings
  FOR SELECT TO authenticated USING (admin_private.is_admin());

-- Admins can hard-delete any listing (reported/flagged, sold, or otherwise).
GRANT DELETE ON public.used_machine_listings TO authenticated;
DROP POLICY IF EXISTS used_machine_admin_delete ON public.used_machine_listings;
CREATE POLICY used_machine_admin_delete ON public.used_machine_listings
  FOR DELETE TO authenticated USING (admin_private.is_admin());

COMMIT;
