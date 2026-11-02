#!/usr/bin/env node
/**
 * Guard against migration version formats that break Supabase Preview / db push.
 *
 * Known failure mode (supabase/cli#6036): mixing 8-digit (YYYYMMDD) versions with
 * 14-digit versions that share the same date prefix makes FindPendingMigrations
 * report "Remote migration versions not found in local migrations directory"
 * because remote sorts by version string while local historically sorted by
 * filename ('_' > '0').
 *
 * Require every migration file to use a canonical 14-digit version prefix, and
 * reject any version that is a proper prefix of another.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'supabase', 'migrations');
const FILE_RE = /^(\d+)_(.+)\.sql$/;

const entries = readdirSync(DIR)
  .filter((name) => name.endsWith('.sql'))
  .map((name) => {
    const match = name.match(FILE_RE);
    if (!match) {
      return { name, error: 'filename must match <version>_<name>.sql' };
    }
    return { name, version: match[1], slug: match[2] };
  });

const errors = [];

for (const entry of entries) {
  if (entry.error) {
    errors.push(`${entry.name}: ${entry.error}`);
    continue;
  }
  if (!/^\d{14}$/.test(entry.version)) {
    errors.push(
      `${entry.name}: version "${entry.version}" must be exactly 14 digits (YYYYMMDDHHMMSS). ` +
        `Short YYYYMMDD versions collide with later same-day migrations and break Supabase Preview.`,
    );
  }
}

const versions = entries.filter((e) => e.version).map((e) => e.version);
const unique = new Set(versions);
if (unique.size !== versions.length) {
  const dupes = versions.filter((v, i) => versions.indexOf(v) !== i);
  errors.push(`duplicate migration versions: ${[...new Set(dupes)].join(', ')}`);
}

for (const a of unique) {
  for (const b of unique) {
    if (a !== b && b.startsWith(a)) {
      errors.push(
        `version prefix collision: "${a}" is a prefix of "${b}" (rename the shorter one to a full 14-digit timestamp)`,
      );
    }
  }
}

// Catch the merge-order trap even if lengths somehow match inconsistently.
const byFile = [...entries].filter((e) => e.version).sort((a, b) => a.name.localeCompare(b.name));
const byVersion = [...entries].filter((e) => e.version).sort((a, b) => a.version.localeCompare(b.version));
for (let i = 0; i < byFile.length; i++) {
  if (byFile[i].version !== byVersion[i].version) {
    errors.push(
      `filename sort diverges from version sort at index ${i}: ` +
        `file-order=${byFile[i].version} version-order=${byVersion[i].version}`,
    );
    break;
  }
}

if (errors.length) {
  console.error('Supabase migration version check failed:\n');
  for (const err of errors) console.error(`  - ${err}`);
  console.error(
    '\nPad short versions like 20261001_foo.sql → 20261001000000_foo.sql, ' +
      'then repair remote history (UPDATE schema_migrations / migration repair) to match.',
  );
  process.exit(1);
}

console.log(`OK: ${entries.length} migrations use canonical 14-digit versions with no prefix collisions.`);
