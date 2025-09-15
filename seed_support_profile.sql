-- IMPORTANT: profiles.id must match an existing auth.users.id (Supabase) or existing user row.
-- Strategy: Pick an existing user (by email) and elevate their role to 'support'.
-- Replace 'support_qa@example.com' with a real email present in auth.users.

WITH target AS (
  SELECT id FROM auth.users WHERE email = 'support_qa@example.com' LIMIT 1
)
UPDATE public.profiles p
SET
  username = COALESCE(p.username,'support_qa'),
  full_name = COALESCE(p.full_name,'Support QA User'),
  role = 'support',
  is_verified = true,
  preferences = COALESCE(p.preferences, jsonb_build_object(
    'language','en',
    'currency','USD',
    'notifications', jsonb_build_object('email',true,'sms',false,'push',false),
    'theme','dark'
  )::jsonb),
  updated_at = now()
FROM target
WHERE p.id = target.id;

-- Optional: report if no matching auth user found
DO $$
DECLARE cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt FROM auth.users WHERE email = 'support_qa@example.com';
  IF cnt = 0 THEN
    RAISE NOTICE 'No auth user with email support_qa@example.com found. Create the user first, then re-run this script.';
  END IF;
END $$;
