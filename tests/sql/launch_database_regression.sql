-- Run only against a disposable local PostgreSQL database. Never production.
\set ON_ERROR_STOP on
DO $$ BEGIN
  IF current_database() <> 'almona_launch_regression'
     OR inet_server_addr() <> '127.0.0.1'::inet THEN
    RAISE EXCEPTION 'This test requires the disposable local almona_launch_regression database';
  END IF;
END $$;

DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('request.jwt.claim.role', true), '') $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
  $$ SELECT jsonb_build_object('role', auth.role()) $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

\ir ../../migrations/001_initial_schema.sql
ALTER TABLE public.profiles ADD COLUMN workshop_id uuid;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000001', 'one@example.invalid'),
  ('00000000-0000-0000-0000-000000000002', 'two@example.invalid'),
  ('00000000-0000-0000-0000-000000000003', 'three@example.invalid');
DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000003';
CREATE POLICY test_owner_insert ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

\ir ../../supabase/migrations/20260920000100_protect_profile_privileges.sql
\ir ../../supabase/migrations/20260920000100_protect_profile_privileges.sql

SET ROLE authenticated;
SET request.jwt.claim.role = 'authenticated';
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
UPDATE public.profiles SET full_name = 'Allowed edit' WHERE id = auth.uid();
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND full_name = 'Allowed edit') THEN
    RAISE EXCEPTION 'Normal profile edit failed';
  END IF;
  BEGIN
    UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid();
    RAISE EXCEPTION 'Self-promotion was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.profiles SET is_verified = true WHERE id = auth.uid();
    RAISE EXCEPTION 'Self-verification was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.profiles SET workshop_id = '00000000-0000-0000-0000-000000000099' WHERE id = auth.uid();
    RAISE EXCEPTION 'Self-assigned workshop was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.profiles SET full_name = 'Forbidden' WHERE id = '00000000-0000-0000-0000-000000000002';
  IF FOUND THEN RAISE EXCEPTION 'Cross-user update was allowed'; END IF;
  IF has_table_privilege(current_user, 'public.profiles', 'TRUNCATE') THEN
    RAISE EXCEPTION 'Browser can truncate profiles';
  END IF;
END $$;

SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
DO $$ BEGIN
  BEGIN
    INSERT INTO public.profiles (id, role) VALUES (auth.uid(), 'admin');
    RAISE EXCEPTION 'Privileged profile insertion was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.profiles (id, is_verified) VALUES (auth.uid(), true);
    RAISE EXCEPTION 'Verified profile insertion was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
INSERT INTO public.profiles (id, full_name) VALUES (auth.uid(), 'Safe fallback');
RESET ROLE;
RESET request.jwt.claim.role;
RESET request.jwt.claim.sub;
GRANT SELECT, UPDATE ON public.profiles TO service_role;
SET ROLE service_role;
SET request.jwt.claim.role = 'service_role';
UPDATE public.profiles SET role = 'admin', is_verified = true
WHERE id = '00000000-0000-0000-0000-000000000002';
RESET ROLE;
RESET request.jwt.claim.role;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000002' AND role = 'admin' AND is_verified) THEN
    RAISE EXCEPTION 'Trusted server privilege assignment failed';
  END IF;
END $$;
\echo 'PASS: profile edits, role/verification protection, isolation, server administration, repeatability'

\ir ../../supabase/migrations/20260215_quotes_api_columns.sql
INSERT INTO public.quotes (user_id, contact_name, contact_info)
VALUES ('00000000-0000-0000-0000-000000000001', 'Keep current name',
  '{"name":"Old name","email":"legacy@example.invalid"}');
\ir ../../supabase/migrations/20260920000200_align_quote_api.sql
\ir ../../supabase/migrations/20260920000200_align_quote_api.sql
GRANT SELECT, INSERT ON public.quotes TO service_role;
GRANT SELECT, INSERT ON public.quote_items TO service_role;
GRANT SELECT ON public.products TO service_role;
INSERT INTO public.products (id, sku, name_ar, name_en, category)
VALUES ('00000000-0000-0000-0000-000000000010', 'TEST-10', 'Test AR', 'Test EN', 'machine');
SET ROLE service_role;
INSERT INTO public.quotes (contact_name, contact_email, total_amount)
VALUES ('Guest', 'guest@example.invalid', NULL);
INSERT INTO public.quote_items (quote_id, product_id, quantity, unit_price, total_price)
SELECT id, '00000000-0000-0000-0000-000000000010', 2, 12.5, 25
FROM public.quotes WHERE contact_email = 'guest@example.invalid';
INSERT INTO public.quote_items (quote_id, service_id, quantity, unit_price, total_price)
SELECT id, 'service-maintenance', 1, NULL, NULL
FROM public.quotes WHERE contact_email = 'guest@example.invalid';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.quote_items WHERE product_sku = 'TEST-10' AND total_price = 25 AND NOT price_pending) THEN
    RAISE EXCEPTION 'Product snapshot or price was lost';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.quote_items WHERE service_id = 'service-maintenance' AND price_pending AND unit_price = 0) THEN
    RAISE EXCEPTION 'Unpriced service did not retain pending-price state';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.quotes WHERE contact_email = 'guest@example.invalid' AND total_amount = 0 AND contact_info->>'email' = 'guest@example.invalid') THEN
    RAISE EXCEPTION 'Legacy API header compatibility failed';
  END IF;
END $$;
RESET ROLE;
SET ROLE authenticated;
SET request.jwt.claim.role = 'authenticated';
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.quotes WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'Guest quotes exposed to customers';
  END IF;
  BEGIN
    INSERT INTO public.quotes (contact_name, total_amount) VALUES ('Forbidden', 0);
    RAISE EXCEPTION 'Browser created an ownerless quote';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
INSERT INTO public.quotes (user_id, total_amount) VALUES (auth.uid(), 0);
RESET ROLE;
RESET request.jwt.claim.role;
RESET request.jwt.claim.sub;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.quotes WHERE contact_email = 'legacy@example.invalid' AND contact_name = 'Keep current name') THEN
    RAISE EXCEPTION 'Contact backfill overwrote existing data or missed legacy email';
  END IF;
  IF (SELECT count(DISTINCT public.generate_quote_number()) FROM generate_series(1,100)) <> 100 THEN
    RAISE EXCEPTION 'Quote numbers are not unique';
  END IF;
  PERFORM setval('public.quote_number_seq', 999999, true);
  IF public.generate_quote_number() <> 'QT-1000000' THEN
    RAISE EXCEPTION 'Quote number was truncated after six digits';
  END IF;
END $$;
\echo 'PASS: server guest quote, zero total, owner quote, guest isolation, repeatability'

-- Subscription shape from migration 011; no Fabricator tables needed here.
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id),
  plan_type text NOT NULL CHECK (plan_type IN ('free','basic','pro','enterprise')),
  projects_used integer DEFAULT 0,
  projects_limit integer CHECK (projects_limit IS NULL OR projects_limit > 0),
  status text DEFAULT 'active' CHECK (status IN ('active','cancelled','expired'))
);
INSERT INTO public.subscriptions (user_id, plan_type, projects_limit)
VALUES ('00000000-0000-0000-0000-000000000002', 'pro', NULL);
DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000003';

\ir ../../supabase/migrations/20260920000300_repair_registration.sql
\ir ../../supabase/migrations/20260920000300_repair_registration.sql
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-000000000004', 'four@example.invalid', '{"full_name":"New user","role":"admin"}');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.subscriptions) <> 4 THEN
    RAISE EXCEPTION 'Registration or subscription backfill failed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000004' AND role = 'customer' AND full_name = 'New user') THEN
    RAISE EXCEPTION 'New profile missing or metadata elevated privileges';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = '00000000-0000-0000-0000-000000000002' AND plan_type = 'pro' AND projects_limit IS NULL) THEN
    RAISE EXCEPTION 'Paid subscription was overwritten';
  END IF;
  -- Prove a failed subscription cannot leave an orphan auth account.
  ALTER TABLE public.subscriptions ADD CONSTRAINT test_subscription_failure
    CHECK (user_id <> '00000000-0000-0000-0000-000000000005');
  BEGIN
    INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-000000000005', 'five@example.invalid');
    RAISE EXCEPTION 'Expected registration failure was swallowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000005') THEN
    RAISE EXCEPTION 'Failed registration left orphan auth account';
  END IF;
  ALTER TABLE public.subscriptions DROP CONSTRAINT test_subscription_failure;
END $$;
\echo 'PASS: signup, safe metadata, missing-row repair, paid-plan preservation, atomic failure, repeatability'
