#!/usr/bin/env node
/**
 * Remove all zero-byte files in the workspace, excluding common ignore directories.
 * Writes a log to deleted-zero-byte-files.json.
 *
 * Flags:
 *  --dry-run=true   Do not delete, just list
 */
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

const ROOT = process.cwd();
const argv = new Map(process.argv.slice(2).map((a)=>{
  const [k,v] = a.includes('=') ? a.split('=') : [a, 'true'];
  return [k.replace(/^--/, ''), v];
}));
const DRY_RUN = argv.get('dry-run') === 'true';

const IGNORE_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'out', '.output', '.next', '.turbo', '.vercel', 'storybook-static', 'coverage', '.nyc_output', '.cache', '.vscode', '.idea'
]);

const PRESERVE_FILENAMES = new Set(['.gitkeep', '.keep']);

async function walk(dir, out=[]) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (IGNORE_DIRS.has(ent.name)) continue;
      await walk(full, out);
    } else if (ent.isFile()) {
      out.push(full);
    }
  }
  return out;
}

async function main(){
  const files = await walk(ROOT);
  const zeroes = [];
  for (const f of files) {
    try {
      const st = await fsp.stat(f);
      if (st.size === 0 && !PRESERVE_FILENAMES.has(path.basename(f))) {
        zeroes.push(f);
      }
    } catch {}
  }
  const rel = zeroes.map((p)=>path.relative(ROOT, p));
  console.log(`Zero-byte files found: ${rel.length}`);
  for (const r of rel) console.log(` - ${r}`);

  const logPath = path.join(ROOT, 'deleted-zero-byte-files.json');
  if (DRY_RUN) {
    await fsp.writeFile(logPath, JSON.stringify({ dryRun: true, when: new Date().toISOString(), files: rel }, null, 2));
    console.log(`Dry run complete. Log written to ${logPath}`);
    return;
  }

  const deleted = [];
  for (const f of zeroes) {
    try {
      await fsp.unlink(f);
      deleted.push(path.relative(ROOT, f));
    } catch (e) {
      console.warn(`Failed to delete ${f}: ${e}`);
    }
  }
  await fsp.writeFile(logPath, JSON.stringify({ dryRun: false, when: new Date().toISOString(), files: deleted }, null, 2));
  console.log(`Deleted ${deleted.length} zero-byte files. Log written to ${logPath}`);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
