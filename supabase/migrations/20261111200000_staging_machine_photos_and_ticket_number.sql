-- Staging browser-gate fixes (machine photo storage + server-side ticket_number).
-- Private buckets only; scoped owner policies. No production apply in this package.
-- ticket_number: BEFORE INSERT trigger assigns a unique server-side value when absent.
-- Do not generate collision-prone client ticket numbers.

-- ---------------------------------------------------------------------------
-- 1) Private machine-photos + profile-thumbnails buckets (idempotent)
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('machine-photos', 'machine-photos', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-thumbnails', 'profile-thumbnails', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- machine-photos: owner folder = first path segment (auth.uid)
DROP POLICY IF EXISTS machine_photos_select_own ON storage.objects;
DROP POLICY IF EXISTS machine_photos_insert_own ON storage.objects;
DROP POLICY IF EXISTS machine_photos_update_own ON storage.objects;
DROP POLICY IF EXISTS machine_photos_delete_own ON storage.objects;

CREATE POLICY machine_photos_select_own ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'machine-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY machine_photos_insert_own ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'machine-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY machine_photos_update_own ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'machine-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'machine-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY machine_photos_delete_own ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'machine-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- profile-thumbnails: same owner-folder contract (existing app clients)
DROP POLICY IF EXISTS profile_thumbnails_select_own ON storage.objects;
DROP POLICY IF EXISTS profile_thumbnails_insert_own ON storage.objects;
DROP POLICY IF EXISTS profile_thumbnails_update_own ON storage.objects;
DROP POLICY IF EXISTS profile_thumbnails_delete_own ON storage.objects;

CREATE POLICY profile_thumbnails_select_own ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'profile-thumbnails'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY profile_thumbnails_insert_own ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-thumbnails'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY profile_thumbnails_update_own ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-thumbnails'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-thumbnails'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY profile_thumbnails_delete_own ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-thumbnails'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------------------------------------------------------------------------
-- 2) Server-side ticket_number allocation (NOT NULL, no client default)
-- ---------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS public.service_ticket_number_seq;

CREATE OR REPLACE FUNCTION public.service_tickets_assign_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_year text := to_char((timezone('utc', now())), 'YYYY');
  v_n bigint;
  v_candidate text;
BEGIN
  IF NEW.ticket_number IS NOT NULL AND btrim(NEW.ticket_number) <> '' THEN
    RETURN NEW;
  END IF;

  LOOP
    v_n := nextval('public.service_ticket_number_seq');
    v_candidate := 'TKT-' || v_year || '-' || lpad(v_n::text, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.service_tickets st WHERE st.ticket_number = v_candidate
    );
  END LOOP;

  NEW.ticket_number := v_candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS service_tickets_assign_ticket_number_bi ON public.service_tickets;
CREATE TRIGGER service_tickets_assign_ticket_number_bi
  BEFORE INSERT ON public.service_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.service_tickets_assign_ticket_number();

REVOKE ALL ON FUNCTION public.service_tickets_assign_ticket_number() FROM PUBLIC;
