import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { retainReleaseAssets, validateReleaseManifest } from './retain-release-assets.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
async function fixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'almona-assets-'));
  await mkdir(path.join(root, 'assets'));
  await writeFile(path.join(root, 'index.html'), '<script src="/assets/index-newbuild.js"></script>');
  await writeFile(path.join(root, 'assets/index-newbuild.js'), 'new release');
  try { await run(root); } finally { await rm(root, { recursive: true, force: true }); }
}
const previous = (text = 'old page') => ({ version: 1, releases: [{ id: 'a'.repeat(20), createdAt: Date.now() - 1000,
  assets: [{ path: 'assets/page-oldbuild.js', size: Buffer.byteLength(text), sha256: sha(text) }] }] });

test('retains a verified old chunk without adding it to the new release asset list', () => fixture(async root => {
  const result = await retainReleaseAssets({ directory: root, origin: 'https://example.com', fetcher: async url =>
    new Response(url.pathname.endsWith('.json') ? JSON.stringify(previous()) : 'old page') });
  assert.equal(result.downloaded, 1);
  assert.equal(await readFile(path.join(root, 'assets/page-oldbuild.js'), 'utf8'), 'old page');
  const manifest = JSON.parse(await readFile(path.join(root, 'release-assets.json'), 'utf8'));
  assert.equal(manifest.releases.length, 2);
  assert.equal(manifest.releases[0].assets.length, 1);
}));
test('fails closed on corrupted or unavailable retained assets', () => fixture(async root => {
  for (const response of [new Response('corrupt'), new Response('', { status: 404 })]) {
    await assert.rejects(retainReleaseAssets({ directory: root, origin: 'https://example.com', fetcher: async url =>
      url.pathname.endsWith('.json') ? new Response(JSON.stringify(previous())) : response }), /integrity|Cannot retain/);
  }
}));
test('rejects traversal paths and non-HTTPS remote origins', () => fixture(async root => {
  const manifest = previous(); manifest.releases[0].assets[0].path = 'assets/../../.env';
  assert.throws(() => validateReleaseManifest(manifest), /Invalid retained asset/);
  await assert.rejects(retainReleaseAssets({ directory: root, origin: 'http://example.com' }), /HTTPS/);
}));
test('bootstraps the old hashed dependency graph when the SPA returns HTML for the absent manifest', () => fixture(async root => {
  const files = {
    '/release-assets.json': '<!doctype html><html>old shell</html>',
    '/': '<script src="/assets/index-oldbuild.js"></script>',
    '/assets/index-oldbuild.js': 'const route=()=>import("./page-oldbuild.js");',
    '/assets/page-oldbuild.js': 'export default "old listing";',
  };
  const result = await retainReleaseAssets({ directory: root, origin: 'https://example.com', fetcher: async url =>
    new Response(files[url.pathname] ?? '', { status: url.pathname in files ? 200 : 404 }) });
  assert.equal(result.downloaded, 2);
  assert.match(await readFile(path.join(root, 'assets/page-oldbuild.js'), 'utf8'), /old listing/);
}));
test('drops releases beyond the retention age', () => fixture(async root => {
  const manifest = previous(); manifest.releases[0].createdAt = Date.now() - 8 * 86400000;
  const result = await retainReleaseAssets({ directory: root, origin: 'https://example.com', fetcher: async () => new Response(JSON.stringify(manifest)) });
  assert.equal(result.releases, 1);
  assert.equal(result.downloaded, 0);
}));
