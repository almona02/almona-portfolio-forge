import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
// Execute the whole migration against minimal Supabase Storage fixtures rather
// than truncating executable SQL at a prose comment.
await db.exec(`
  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean);
  CREATE TABLE storage.objects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text
  );
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
`);
const baseline = await readFile('supabase/migrations/20261017233000_used_machine_marketplace.sql', 'utf8');
await db.exec(baseline);
const migration = await readFile('supabase/migrations/20261020125539_marketplace_submission_identity.sql', 'utf8');
await db.exec(migration);
await db.exec('SET ROLE anon');
const row = `INSERT INTO public.used_machine_listings(id,title,price,currency,location,condition,category,description,contact_name,contact_phone,images)
 VALUES ('11111111-1111-4111-8111-111111111111','Test cutting machine',100,'EGP','Cairo','good','Saw','Disposable database test only','Test seller','01000000000',ARRAY['https://example.invalid/photo'])`;
await db.exec(row);
await assert.rejects(db.exec(row), error => error.code === '23505');
const count = await db.query('SELECT count(*)::int AS count FROM public.used_machine_listings');
assert.equal(count.rows[0].count, 1);
await assert.rejects(db.exec("UPDATE public.used_machine_listings SET title = 'unauthorized change'"), error => error.code === '42501');
await assert.rejects(db.exec("INSERT INTO public.used_machine_listings(status) VALUES ('removed')"), error => error.code === '42501');
await db.exec('RESET ROLE');
const rls = await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.used_machine_listings'::regclass");
assert.equal(rls.rows[0].relrowsecurity, true);
console.log('PASS: real PostgreSQL engine — anonymous idempotent insert, duplicate rejection, row count, column grants and RLS');
await db.close();
