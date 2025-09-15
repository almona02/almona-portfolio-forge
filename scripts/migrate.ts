#!/usr/bin/env ts-node
/**
 * Simple migration runner.
 *
 * Usage:
 *   DATABASE_URL=postgres://user:pass@host:5432/dbname node scripts/migrate.ts
 *
 * Features:
 * - Creates schema_migrations table if not exists
 * - Applies .sql files in /migrations in lexical order
 * - Skips files already recorded
 * - Wraps each migration in a transaction (BEGIN/COMMIT) unless file starts with -- NO_TRANSACTION
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL env var required');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl, ssl: databaseUrl.includes('supabase.co') ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (id bigserial primary key, filename text unique not null, applied_at timestamptz not null default now());`);
  const appliedRes = await client.query<{ filename: string }>(`SELECT filename FROM public.schema_migrations ORDER BY filename`);
  const applied = new Set<string>(appliedRes.rows.map((r: { filename: string }) => r.filename));

    const migrationsDir = join(process.cwd(), 'migrations');
    const files = readdirSync(migrationsDir)
      .filter(f => f.match(/\.sql$/))
      .sort();

    let appliedCount = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`SKIP  ${file}`);
        continue;
      }
      const fullPath = join(migrationsDir, file);
  const sql = readFileSync(fullPath, 'utf8');
      const useTransaction = !sql.startsWith('-- NO_TRANSACTION');
      console.log(`APPLY ${file}${useTransaction ? '' : ' (no txn)'}`);
      try {
        if (useTransaction) await client.query('BEGIN');
        await client.query(sql);
        if (useTransaction) await client.query('COMMIT');
        await client.query('INSERT INTO public.schema_migrations (filename) VALUES ($1)', [file]);
        appliedCount++;
      } catch (err) {
        if (useTransaction) await client.query('ROLLBACK');
        console.error(`ERROR in ${file}:`, (err as Error).message);
        process.exitCode = 2;
        break;
      }
    }

    console.log(`Done. Newly applied: ${appliedCount}`);
  } finally {
    await client.end();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
