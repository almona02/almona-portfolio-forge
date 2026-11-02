-- Disposable PostgreSQL only; never run against a linked Supabase database.
\set ON_ERROR_STOP on
DO $$ BEGIN
 IF current_database() !~ '^marketplace_replay_test_' THEN RAISE EXCEPTION 'Disposable marketplace_replay_test_ database required'; END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
CREATE TABLE public.profiles(id uuid PRIMARY KEY, role text);
GRANT SELECT ON public.profiles TO authenticated;
CREATE SCHEMA storage;
CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean);
CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE SCHEMA admin_private;
CREATE FUNCTION admin_private.is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT EXISTS(SELECT FROM public.profiles WHERE id=auth.uid() AND role='admin') $$;
GRANT USAGE ON SCHEMA admin_private TO authenticated;
\ir ../../supabase/migrations/20261017233000_used_machine_marketplace.sql
\ir ../../supabase/migrations/20261018001000_admin_audit_log.sql
SET ROLE anon;
INSERT INTO public.used_machine_listings(title,price,location,condition,category,description,contact_name,contact_phone,images)
VALUES ('Replay test machine',100,'Cairo','good','saw','Disposable test listing','Test seller','123456789',ARRAY['fixture.jpg']);
RESET ROLE;
SELECT id AS listing_id FROM public.used_machine_listings \gset
SET ROLE anon;
SELECT public.increment_used_machine_views(:'listing_id'::uuid);
RESET ROLE;
DO $$ BEGIN
 IF (SELECT views FROM public.used_machine_listings) <> 1 THEN RAISE EXCEPTION 'Counter failed'; END IF;
 IF has_column_privilege('anon','public.used_machine_listings','price','UPDATE') OR has_table_privilege('anon','public.used_machine_listings','DELETE') THEN RAISE EXCEPTION 'Public column/delete permissions too broad'; END IF;
 IF NOT EXISTS(SELECT FROM pg_class WHERE oid='public.used_machine_listings'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'RLS disabled'; END IF;
END $$;
\ir ../../supabase/migrations/20261018180000_used_machine_admin_controls.sql
\ir ../../supabase/migrations/20261020125539_marketplace_submission_identity.sql
-- Model later hardening: replay must preserve intentional removals and stricter ACLs.
DROP POLICY admin_audit_insert_admin ON public.admin_audit_log;
REVOKE INSERT, UPDATE, DELETE ON public.admin_audit_log FROM anon, authenticated;
INSERT INTO public.admin_audit_log(action,entity_type) VALUES ('fixture','machine');
DROP POLICY used_machine_insert_open ON public.used_machine_listings;
ALTER POLICY "used-machine-images-open-upload" ON storage.objects WITH CHECK (bucket_id='used-machine-images' AND name LIKE 'approved/%');
UPDATE storage.buckets SET public=false;
CREATE OR REPLACE FUNCTION public.increment_used_machine_views(listing_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ UPDATE public.used_machine_listings SET views=views+2 WHERE id=listing_id AND status='active' $$;
REVOKE ALL ON FUNCTION public.increment_used_machine_views(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.increment_used_machine_views(uuid) TO service_role;
CREATE TEMP TABLE before_policies AS SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname IN ('public','storage');
CREATE TEMP TABLE before_function AS SELECT pg_get_functiondef(oid) definition,proacl FROM pg_proc WHERE oid='public.increment_used_machine_views(uuid)'::regprocedure;
CREATE TEMP TABLE before_indexes AS SELECT indexname,indexdef FROM pg_indexes WHERE tablename IN ('used_machine_listings','admin_audit_log');
CREATE TEMP TABLE before_listings AS SELECT * FROM public.used_machine_listings;
CREATE TEMP TABLE before_audit AS SELECT * FROM public.admin_audit_log;
\ir ../../supabase/migrations/20261017233000_used_machine_marketplace.sql
\ir ../../supabase/migrations/20261018001000_admin_audit_log.sql
\ir ../../supabase/migrations/20261017233000_used_machine_marketplace.sql
\ir ../../supabase/migrations/20261018001000_admin_audit_log.sql
DO $$ BEGIN
 IF EXISTS((SELECT * FROM before_policies EXCEPT SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname IN ('public','storage')) UNION ALL (SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname IN ('public','storage') EXCEPT SELECT * FROM before_policies)) THEN RAISE EXCEPTION 'Policies changed'; END IF;
 IF EXISTS(SELECT * FROM before_function EXCEPT SELECT pg_get_functiondef(oid),proacl FROM pg_proc WHERE oid='public.increment_used_machine_views(uuid)'::regprocedure) THEN RAISE EXCEPTION 'Hardened counter changed'; END IF;
 IF EXISTS(SELECT * FROM before_indexes EXCEPT SELECT indexname,indexdef FROM pg_indexes WHERE tablename IN ('used_machine_listings','admin_audit_log')) THEN RAISE EXCEPTION 'Indexes changed'; END IF;
 IF EXISTS(SELECT * FROM before_listings EXCEPT SELECT * FROM public.used_machine_listings) OR (SELECT count(*) FROM public.used_machine_listings)<>1 THEN RAISE EXCEPTION 'Listing data changed'; END IF;
 IF EXISTS(SELECT * FROM before_audit EXCEPT SELECT * FROM public.admin_audit_log) THEN RAISE EXCEPTION 'Audit data changed'; END IF;
 IF NOT has_table_privilege('authenticated','public.used_machine_listings','DELETE') OR NOT has_column_privilege('anon','public.used_machine_listings','id','INSERT') THEN RAISE EXCEPTION 'Later marketplace grants lost'; END IF;
 IF has_table_privilege('authenticated','public.admin_audit_log','INSERT') THEN RAISE EXCEPTION 'Audit writes restored'; END IF;
 IF (SELECT public FROM storage.buckets WHERE id='used-machine-images') THEN RAISE EXCEPTION 'Bucket made public'; END IF;
END $$;
DROP FUNCTION public.increment_used_machine_views(uuid);
\ir ../../supabase/migrations/20261017233000_used_machine_marketplace.sql
DO $$ BEGIN
 IF NOT has_function_privilege('anon','public.increment_used_machine_views(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Missing counter not repaired'; END IF;
 IF EXISTS(SELECT FROM pg_policies WHERE policyname='used_machine_insert_open') THEN RAISE EXCEPTION 'Removed policy restored'; END IF;
END $$;
\echo Marketplace and audit fresh install and hardened replay passed
