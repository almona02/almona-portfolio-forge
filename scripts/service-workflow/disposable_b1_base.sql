-- B1 disposable base: stub roles/ext/auth + pre-Slice-0 tables.
-- The harness applies the REAL 20261111010000 boundary migration next,
-- then the REAL ticket-number trigger section. Test-only stubs are marked.
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
-- Mirrors hosted Supabase: authenticated clients may call auth.uid().
-- Without this, invoker-context policies calling admin_private.caller_uid()
-- fail as the b1_auth stand-in role with "permission denied for schema auth".
GRANT USAGE ON SCHEMA auth TO authenticated;

-- TEST-ONLY STUBS for hosted storage (policies reference these; unexercised here).
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

-- Fixture actors (fixed UUIDs so checks are deterministic).
INSERT INTO auth.users (id) VALUES
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333'),
  ('44444444-4444-4444-4444-444444444444'),
  ('55555555-5555-5555-5555-555555555555'),
  ('66666666-6666-6666-6666-666666666666'),
  ('77777777-7777-7777-7777-777777777777')
ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'customer'),
  ('22222222-2222-2222-2222-222222222222', 'customer'),
  ('33333333-3333-3333-3333-333333333333', 'technician'),
  ('44444444-4444-4444-4444-444444444444', 'technician'),
  ('55555555-5555-5555-5555-555555555555', 'support'),
  ('66666666-6666-6666-6666-666666666666', 'admin'),
  ('77777777-7777-7777-7777-777777777777', 'sales_rep')
ON CONFLICT DO NOTHING;
