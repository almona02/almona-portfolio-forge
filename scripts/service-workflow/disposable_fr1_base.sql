-- FR-1 disposable base: stub roles/ext/auth + pre-Slice-0 tables (production-shaped absence of B1 jobs/visits).
-- Harness applies REAL Slice0 A + MI C/D + TKT §2 + FR-1 RLS/F7 migrations next.
-- Test-only stubs are marked; never ship.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'b1_auth') THEN CREATE ROLE b1_auth LOGIN; END IF;
END $$;
GRANT authenticated TO b1_auth;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);
-- TEST-ONLY STUB for hosted auth.uid(): reads GUC app.b1_uid. Never ships.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
  SELECT NULLIF(current_setting('app.b1_uid', true), '')::uuid;
$$;
GRANT USAGE ON SCHEMA auth TO authenticated;

CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE IF NOT EXISTS storage.buckets (id text PRIMARY KEY, name text, public boolean NOT NULL DEFAULT false);
CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
CREATE OR REPLACE FUNCTION storage.foldername(p_name text) RETURNS text[]
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT (string_to_array(trim(both '/' from p_name), '/'))[1:array_length(string_to_array(trim(both '/' from p_name), '/'), 1) - 1];
$$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL
);
-- Hosted clients need SELECT on profiles for role routing / RLS subqueries.
-- Own-row only: ticket RLS EXISTS (profiles WHERE id = auth.uid() ...) must not recurse.
GRANT SELECT ON public.profiles TO authenticated;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_staff ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE TABLE IF NOT EXISTS public.service_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  title text,
  description text,
  type text,
  priority text,
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES auth.users(id),
  assigned_by uuid,
  assigned_at timestamptz,
  escalated boolean NOT NULL DEFAULT false,
  escalated_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  resolution_summary text,
  first_response_at timestamptz,
  sla_response_due timestamptz,
  sla_resolution_due timestamptz,
  sla_breached boolean NOT NULL DEFAULT false,
  machine_model text,
  machine_serial_number text,
  site_location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ticket_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  ticket_id uuid NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id),
  message text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_internal_note boolean NOT NULL DEFAULT false,
  message_type text NOT NULL DEFAULT 'message',
  created_at timestamptz NOT NULL DEFAULT now()
);
