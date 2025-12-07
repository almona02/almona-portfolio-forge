-- Visual assets migration: layout/profile thumbnails and storage policies
-- 1) Columns for thumbnails
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS layout_thumbnail_url TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Mirror thumbnail column on fabricator_profiles (primary app table)
ALTER TABLE public.fabricator_profiles
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 2) Ensure specifications is JSONB with default object for geometryConfig, etc.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'specifications'
  ) THEN
    ALTER TABLE public.profiles
      ALTER COLUMN specifications SET DEFAULT '{}'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fabricator_profiles'
      AND column_name = 'specifications'
  ) THEN
    ALTER TABLE public.fabricator_profiles
      ALTER COLUMN specifications SET DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 3) Storage bucket policies (create buckets in dashboard: layout-thumbnails, profile-thumbnails)
-- Public read for layout thumbnails
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'layout_thumbnails_public_read') THEN
    CREATE POLICY layout_thumbnails_public_read
    ON storage.objects FOR SELECT
    USING (bucket_id = 'layout-thumbnails');
  END IF;
END $$;

-- Authenticated upload for layout thumbnails
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'layout_thumbnails_auth_upload') THEN
    CREATE POLICY layout_thumbnails_auth_upload
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'layout-thumbnails' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- Public read for profile thumbnails
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profile_thumbnails_public_read') THEN
    CREATE POLICY profile_thumbnails_public_read
    ON storage.objects FOR SELECT
    USING (bucket_id = 'profile-thumbnails');
  END IF;
END $$;

-- Authenticated upload for profile thumbnails
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profile_thumbnails_auth_upload') THEN
    CREATE POLICY profile_thumbnails_auth_upload
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'profile-thumbnails' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- 4) Documentation comments
COMMENT ON COLUMN public.quotes.layout_thumbnail_url IS 'URL to the 3D/Schematic render of the window layout';
COMMENT ON COLUMN public.profiles.thumbnail_url IS 'URL to the visual cross-section of the profile';
COMMENT ON COLUMN public.fabricator_profiles.thumbnail_url IS 'URL to the visual cross-section of the profile';

