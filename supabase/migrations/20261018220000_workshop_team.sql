-- Fabricator-admin team management: the factory owner (fabricator_admin) assigns
-- factory-scoped roles to their workshop members.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS public.workshop_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  factory_role text NOT NULL DEFAULT 'operator'
    CHECK (factory_role IN ('technical_office','operator','technician','supervisor','manager')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workshop_id, user_id)
);

CREATE INDEX IF NOT EXISTS workshop_members_workshop_idx ON public.workshop_members(workshop_id);
CREATE INDEX IF NOT EXISTS workshop_members_user_idx ON public.workshop_members(user_id);

ALTER TABLE public.workshop_members ENABLE ROW LEVEL SECURITY;

-- Workshop owner (fabricator_admin) or Almona admin manages members.
DROP POLICY IF EXISTS workshop_members_manage ON public.workshop_members;
CREATE POLICY workshop_members_manage ON public.workshop_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workshops w WHERE w.id = workshop_id AND w.owner_id = auth.uid()) OR admin_private.is_admin())
  WITH CHECK (EXISTS (SELECT 1 FROM public.workshops w WHERE w.id = workshop_id AND w.owner_id = auth.uid()) OR admin_private.is_admin());

-- Members can read their own workshop roster.
DROP POLICY IF EXISTS workshop_members_read ON public.workshop_members;
CREATE POLICY workshop_members_read ON public.workshop_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.workshops w WHERE w.id = workshop_id AND w.owner_id = auth.uid()) OR admin_private.is_admin());

COMMIT;
