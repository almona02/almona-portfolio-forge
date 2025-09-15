-- Comprehensive RLS setup for service_tickets
-- 1. Ensure enum user_role has 'support'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'user_role' AND e.enumlabel = 'support'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'support';
  END IF;
END $$;

-- 2. Enable RLS
ALTER TABLE public.service_tickets ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies we are replacing (idempotent)
DO $$
DECLARE pol text;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='service_tickets' LOOP
    IF pol IN ('allow_service_ticket_insert_roles','service_ticket_update_roles','service_ticket_delete_roles') THEN
      EXECUTE format('DROP POLICY %I ON public.service_tickets', pol);
    END IF;
  END LOOP;
END $$;

-- 4. Insert policy
CREATE POLICY allow_service_ticket_insert_roles
  ON public.service_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('customer','support','admin','technician','sales_rep')
    )
  );

-- 5. Update policy (owner or privileged roles)
CREATE POLICY service_ticket_update_roles
  ON public.service_tickets
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('support','admin','technician')
    )
  )
  WITH CHECK (
    -- Ensure same constraint on new row
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('support','admin','technician')
    )
  );

-- 6. Delete policy (privileged roles only)
CREATE POLICY service_ticket_delete_roles
  ON public.service_tickets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('support','admin')
    )
  );

-- 7. (Optional) Select policy - if none exists and RLS enabled, need to allow
-- If ANY SELECT policy already exists we skip creating ours to avoid duplicate object errors.
-- If you prefer to replace existing SELECT policies, uncomment the DROP loop below.
-- DO $$
-- DECLARE pol text; BEGIN
--   FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='service_tickets' AND command='SELECT' LOOP
--     EXECUTE format('DROP POLICY %I ON public.service_tickets', pol);
--   END LOOP;
-- END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
      WHERE schemaname='public'
        AND tablename='service_tickets'
        AND command='SELECT'
  ) THEN
    EXECUTE 'CREATE POLICY service_ticket_select ON public.service_tickets FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;
