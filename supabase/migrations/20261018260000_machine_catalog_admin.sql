-- Allow the Almona admin (CEO) to manage the YILMAZ machine catalog.
BEGIN;
SET LOCAL lock_timeout = '5s';

DROP POLICY IF EXISTS "Admin manages machine catalog" ON public.yilmaz_machines;
CREATE POLICY "Admin manages machine catalog" ON public.yilmaz_machines FOR ALL TO authenticated
  USING (admin_private.is_admin()) WITH CHECK (admin_private.is_admin());

COMMIT;
