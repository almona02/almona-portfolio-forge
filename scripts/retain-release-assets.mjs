import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const assetPattern = /^assets\/[A-Za-z0-9_.-]+\.(?:js|css|woff2?)$/;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const MAX_BYTES = 256 * 1024 * 1024;
const MAX_FILES = 2000;
const MAX_AGE = 7 * 86400000;

export function validateReleaseManifest(manifest) {
  if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.releases) || manifest.releases.length > 3) throw new Error('Invalid release manifest');
  for (const release of manifest.releases) {
    if (!release || !/^[a-f0-9]{12,64}$/i.test(release.id) || !Number.isFinite(release.createdAt) || !Array.isArray(release.assets) || release.assets.length > MAX_FILES) throw new Error('Invalid release entry');
    for (const asset of release.assets) {
      if (!assetPattern.test(asset.path) || !/^[a-f0-9]{64}$/.test(asset.sha256) || !Number.isSafeInteger(asset.size) || asset.size < 0 || asset.size > MAX_BYTES) throw new Error('Invalid retained asset');
    }
  }
  return manifest;
}

export async function retainReleaseAssets({ directory = 'dist', origin, fetcher = fetch, now = Date.now() } = {}) {
  const root = path.resolve(directory);
  const assets = [];
  for (const entry of await readdir(path.join(root, 'assets'))) {
    const name = `assets/${entry}`;
    if (!assetPattern.test(name)) continue;
    const bytes = await readFile(path.join(root, name));
    assets.push({ path: name, sha256: digest(bytes), size: bytes.length });
  }
  const index = await readFile(path.join(root, 'index.html'));
  const current = { id: digest(index).slice(0, 20), createdAt: now, assets };
  const currentPaths = new Map(assets.map(asset => [asset.path, asset]));
  let previous = [];
  let downloaded = 0;
  let totalBytes = assets.reduce((sum, asset) => sum + asset.size, 0);
  const fetched = new Map();
  if (origin) {
    const source = new URL(origin);
    if (source.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(source.hostname)) throw new Error('Asset origin must use HTTPS');
    source.pathname = '/'; source.search = ''; source.hash = '';
    const get = async (name, optional = false) => {
      const response = await fetcher(new URL(name, source), { redirect: 'error', signal: AbortSignal.timeout(20000), cache: 'no-store' });
      if (optional && response.status === 404) return null;
      if (!response.ok) throw new Error(`Cannot retain previous release: ${name} (${response.status})`);
      const length = Number(response.headers.get('content-length') || 0);
      if (length > MAX_BYTES || totalBytes + length > MAX_BYTES) throw new Error('Retained assets exceed size budget');
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > MAX_BYTES || totalBytes + bytes.length > MAX_BYTES) throw new Error('Retained assets exceed size budget');
      return bytes;
    };
    const rawManifest = await get('release-assets.json', true);
    if (rawManifest && !/^\s*</.test(rawManifest.toString().slice(0, 100))) {
      if (rawManifest.length > 1024 * 1024) throw new Error('Release manifest too large');
      const manifest = validateReleaseManifest(JSON.parse(rawManifest));
      previous = manifest.releases.filter(release => release.id !== current.id && release.createdAt <= now && now - release.createdAt <= MAX_AGE).slice(0, 2);
      const unique = new Map(previous.flatMap(release => release.assets).map(asset => [asset.path, asset]));
      for (const asset of unique.values()) {
        const existing = currentPaths.get(asset.path);
        if (existing && existing.sha256 !== asset.sha256) throw new Error(`Immutable asset changed: ${asset.path}`);
      }
      const pending = [...unique.values()].filter(asset => !currentPaths.has(asset.path));
      while (pending.length) {
        await Promise.all(pending.splice(0, 6).map(async asset => {
          const bytes = await get(asset.path);
          if (bytes.length !== asset.size || digest(bytes) !== asset.sha256) throw new Error(`Retained asset integrity mismatch: ${asset.path}`);
          totalBytes += bytes.length;
          if (totalBytes > MAX_BYTES) throw new Error('Retained assets exceed size budget');
          await writeFile(path.join(root, asset.path), bytes);
          downloaded++;
        }));
      }
    } else {
      // First rollout: bootstrap the currently published hashed JS/CSS graph.
      // No fetched code is executed. Subsequent releases use checksummed manifests.
      const oldIndex = await get('');
      const queue = [];
      const discover = text => {
        for (const match of text.matchAll(/["'](?:\.\/|\/?assets\/)([A-Za-z0-9_.-]+-[A-Za-z0-9_-]{6,}\.(?:js|css|woff2?))["']/g)) {
          const name = `assets/${match[1]}`;
          if (!fetched.has(name)) { fetched.set(name, null); queue.push(name); }
        }
      };
      discover(oldIndex.toString());
      if (!queue.length) throw new Error('Could not discover previous release assets');
      while (queue.length) {
        if (fetched.size > MAX_FILES) throw new Error('Too many previous assets');
        await Promise.all(queue.splice(0, 6).map(async name => {
          const bytes = await get(name);
          if (/^\s*<!doctype|^\s*<html/i.test(bytes.toString().slice(0, 100))) throw new Error(`HTML returned for asset ${name}`);
          totalBytes += bytes.length;
          if (totalBytes > MAX_BYTES) throw new Error('Retained assets exceed size budget');
          const asset = { path: name, sha256: digest(bytes), size: bytes.length };
          const existing = currentPaths.get(name);
          if (existing && existing.sha256 !== asset.sha256) throw new Error(`Immutable asset changed: ${name}`);
          fetched.set(name, asset);
          if (!existing) { await writeFile(path.join(root, name), bytes); downloaded++; }
          if (/\.(?:js|css)$/.test(name)) discover(bytes.toString());
        }));
      }
      previous = [{ id: digest(oldIndex).slice(0, 20), createdAt: now, assets: [...fetched.values()] }].filter(release => release.id !== current.id);
    }
  }
  await mkdir(root, { recursive: true });
  const manifest = { version: 1, releases: [current, ...previous].slice(0, 3) };
  validateReleaseManifest(manifest);
  await writeFile(path.join(root, 'release-assets.json'), JSON.stringify(manifest));
  return { downloaded, releases: manifest.releases.length, bytes: totalBytes };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const origin = process.env.RELEASE_ASSET_ORIGIN || (process.env.VERCEL ? 'https://www.almona02.com' : undefined);
  try {
    const result = await retainReleaseAssets({ origin });
    console.log(`Release assets: ${result.releases} releases, ${result.downloaded} retained files, ${Math.ceil(result.bytes / 1024 / 1024)} MiB`);
  } catch (error) {
    // Retention is best-effort: a failed fetch must never block the deployment.
    console.warn(`Release asset retention skipped: ${error instanceof Error ? error.message : String(error)}`);
  }
}
