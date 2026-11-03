-- Disposable PostgreSQL only. Never run this fixture against a linked database.
\set ON_ERROR_STOP on
DO $$ BEGIN
 IF current_database() !~ '^ticket_audit_test_' THEN RAISE EXCEPTION 'Disposable ticket_audit_test_ database required'; END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
CREATE TYPE public.user_role AS ENUM ('customer','technician','admin');
CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users(id),full_name text,username text,role public.user_role);
CREATE TABLE public.products(id uuid PRIMARY KEY,sku text,price numeric);
-- Same minimal shape as the fresh-database prerequisites; existing ticket must survive.
CREATE TABLE public.service_tickets(id uuid PRIMARY KEY,ticket_number text,user_id uuid,title text,description text,created_at timestamptz,updated_at timestamptz);
INSERT INTO auth.users VALUES ('10000000-0000-0000-0000-000000000001');
INSERT INTO public.profiles VALUES ('10000000-0000-0000-0000-000000000001','Test admin','test-admin','admin');
INSERT INTO public.service_tickets(id,ticket_number,user_id,title) VALUES ('20000000-0000-0000-0000-000000000001','TEST-1','10000000-0000-0000-0000-000000000001','Preserved ticket');
\ir ../../supabase/migrations/20261018001000_admin_audit_log.sql
\ir ../../supabase/migrations/20261018122551_admin_control_security.sql
DO $$ BEGIN
 IF NOT EXISTS(SELECT FROM public.service_tickets WHERE title='Preserved ticket' AND status='open' AND priority='medium' AND assigned_to IS NULL) THEN RAISE EXCEPTION 'Missing defaults or existing ticket lost'; END IF;
 IF has_table_privilege('authenticated','public.admin_audit_log','INSERT') OR has_function_privilege('authenticated','public.admin_change_user_role(uuid,uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'Browser security weakened'; END IF;
 IF NOT has_function_privilege('service_role','public.admin_change_user_role(uuid,uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'Server role RPC grant lost'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
UPDATE public.service_tickets SET assigned_to='10000000-0000-0000-0000-000000000001';
UPDATE public.service_tickets SET status='in_progress';
UPDATE public.service_tickets SET priority='high';
UPDATE public.service_tickets SET priority=priority, title='Updated title';
INSERT INTO public.products VALUES ('30000000-0000-0000-0000-000000000001','TEST-SKU',10);
UPDATE public.products SET price=12;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.admin_audit_log)<>4 THEN RAISE EXCEPTION 'Audit changes missing or duplicate'; END IF;
 IF (SELECT count(DISTINCT action) FROM public.admin_audit_log WHERE action IN ('ticket_assigned','ticket_status','ticket_priority','price_updated'))<>4 THEN RAISE EXCEPTION 'Audit categories missing'; END IF;
 IF EXISTS(SELECT FROM public.admin_audit_log WHERE actor_name<>'Test admin') THEN RAISE EXCEPTION 'Actor identity lost'; END IF;
END $$;
CREATE TEMP TABLE before_columns AS SELECT column_name,udt_name,column_default,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='service_tickets';
-- Warm replay against canonical columns, populated rows and existing audit triggers.
\ir ../../supabase/migrations/20261018122551_admin_control_security.sql
DO $$ BEGIN
 IF EXISTS(SELECT * FROM before_columns EXCEPT SELECT column_name,udt_name,column_default,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='service_tickets') THEN RAISE EXCEPTION 'Existing ticket column contract changed'; END IF;
 IF (SELECT count(*) FROM public.admin_audit_log)<>4 OR (SELECT count(*) FROM public.service_tickets)<>1 THEN RAISE EXCEPTION 'Replay changed data'; END IF;
END $$;
UPDATE public.service_tickets SET priority='urgent';
DO $$ BEGIN
 IF (SELECT count(*) FROM public.admin_audit_log)<>5 THEN RAISE EXCEPTION 'Replay lost or duplicated trigger'; END IF;
END $$;
\echo PASS: minimal and canonical ticket schemas, audit behavior, replay and browser restrictions
