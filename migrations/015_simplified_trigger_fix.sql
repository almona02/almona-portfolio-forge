-- Migration 015: Simplified trigger fix - minimal version that definitely works
-- This is a fallback if migration 013 still causes issues
-- It creates a basic profile first, then updates it
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$ BEGIN -- First, try to create a basic profile with just the essentials
    -- This ensures the profile exists even if metadata is missing
INSERT INTO public.profiles (id, full_name, sector)
VALUES (
        NEW.id,
        COALESCE(
            NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
            NEW.email
        ),
        'GENERAL'::sector_type
    ) ON CONFLICT (id) DO NOTHING;
-- Then update with additional fields if they exist
-- Use a separate update to avoid issues with NULL values
UPDATE public.profiles
SET avatar_url = COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
        avatar_url
    ),
    company_name = COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'company_name', ''),
        company_name
    ),
    phone = COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'phone', ''),
        phone
    ),
    sector = CASE
        WHEN NEW.raw_user_meta_data->>'sector' IN ('ALUMINIUM', 'UPVC', 'STEEL', 'GLASS', 'GENERAL') THEN (NEW.raw_user_meta_data->>'sector')::sector_type
        ELSE sector
    END,
    updated_at = NOW()
WHERE id = NEW.id;
RETURN NEW;
EXCEPTION
WHEN OTHERS THEN -- If anything fails, at least ensure basic profile exists
BEGIN
INSERT INTO public.profiles (id, full_name, sector)
VALUES (
        NEW.id,
        COALESCE(NEW.email, 'User'),
        'GENERAL'::sector_type
    ) ON CONFLICT (id) DO NOTHING;
EXCEPTION
WHEN OTHERS THEN -- Even this failed, but don't block user creation
NULL;
END;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();