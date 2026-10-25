import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
try {
  await db.exec(String.raw`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE TYPE public.user_role AS ENUM ('customer', 'admin');
    CREATE TABLE auth.users (id uuid PRIMARY KEY, aud text, role text, email text,
      raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
      SELECT (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$
      SELECT NULLIF(current_setting('request.jwt.claims', true), '')::jsonb->>'role' $$;
    CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id), full_name text,
      role public.user_role DEFAULT 'admin', is_verified boolean DEFAULT false, workshop_id uuid);
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
      BEGIN INSERT INTO public.profiles(id, full_name) VALUES (NEW.id, NEW.email); RETURN NEW; END $$;
    CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    INSERT INTO auth.users(id, email) VALUES ('00000000-0000-4000-8000-000000000001','existing-admin@example.invalid');`);
  await db.exec(readFileSync('supabase/migrations/20260920000100_protect_profile_privileges.sql', 'utf8'));
  const migrations = readdirSync('supabase/migrations').filter(name => name.endsWith('_signup_customer_default.sql'));
  assert.equal(migrations.length, 1, 'Exactly one signup role migration');
  await db.exec(readFileSync('supabase/migrations/' + migrations[0], 'utf8'));
  const result = await db.exec(readFileSync('supabase/tests/signup_customer_default_test.sql', 'utf8'));
  assert.match(JSON.stringify(result), /passed/);
  assert.equal((await db.query('SELECT role FROM public.profiles')).rows[0].role, 'admin', 'Existing administrator retained');
  assert.equal((await db.query('SELECT count(*)::int AS count FROM auth.users')).rows[0].count, 1, 'Fixture accounts rolled back');
  await db.exec("ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'admin'; INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ('00000000-0000-4000-8000-000000000002','drift@example.invalid','{\"role\":\"admin\"}');");
  assert.equal((await db.query("SELECT role FROM public.profiles WHERE id='00000000-0000-4000-8000-000000000002'")).rows[0].role, 'customer', 'Explicit trigger role survives default drift');
  console.log('PASS: signup defaults, plain/OAuth metadata spoofing, privilege guards, existing roles, rollback and default drift');
} finally { await db.close(); }
