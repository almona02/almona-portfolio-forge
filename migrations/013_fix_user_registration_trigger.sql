-- Migration 013: Fix user registration trigger to include all metadata fields
-- This fixes the issue where company_name, phone, and sector were not being saved during registration
-- Update the trigger function to include all user metadata fields
-- This version includes better error handling and validation
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
DECLARE sector_value TEXT;
validated_sector sector_type;
BEGIN -- Extract and validate sector value
sector_value := NEW.raw_user_meta_data->>'sector';
-- Validate sector enum value, default to 'GENERAL' if invalid
BEGIN IF sector_value IS NOT NULL
AND sector_value != '' THEN -- Try to cast to enum, catch invalid value errors
validated_sector := sector_value::sector_type;
ELSE validated_sector := 'GENERAL'::sector_type;
END IF;
EXCEPTION
WHEN OTHERS THEN -- If sector value is invalid, default to GENERAL
validated_sector := 'GENERAL'::sector_type;
END;
-- Insert or update profile
INSERT INTO public.profiles (
        id,
        full_name,
        avatar_url,
        company_name,
        phone,
        sector
    )
VALUES (
        NEW.id,
        COALESCE(
            NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
            NEW.email
        ),
        NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
        NULLIF(NEW.raw_user_meta_data->>'company_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'phone', ''),
        validated_sector
    ) ON CONFLICT (id) DO
UPDATE
SET full_name = COALESCE(
        NULLIF(EXCLUDED.full_name, ''),
        profiles.full_name
    ),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    company_name = COALESCE(
        NULLIF(EXCLUDED.company_name, ''),
        profiles.company_name
    ),
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
    sector = COALESCE(EXCLUDED.sector, profiles.sector),
    updated_at = NOW();
RETURN NEW;
EXCEPTION
WHEN OTHERS THEN -- Log error but don't fail the user creation
-- This ensures users can still be created even if profile creation fails
RAISE WARNING 'Error creating profile for user %: %',
NEW.id,
SQLERRM;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Add INSERT policy for profiles (for service role operations)
-- Note: The trigger uses SECURITY DEFINER so it bypasses RLS, but we add this for completeness
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles" ON public.profiles FOR
INSERT WITH CHECK (true);
-- SECURITY DEFINER function bypasses this anyway
-- Grant necessary permissions
GRANT INSERT ON public.profiles TO service_role;
GRANT UPDATE ON public.profiles TO service_role;