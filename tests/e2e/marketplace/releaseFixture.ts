import { build } from 'esbuild';
import { generateSW } from 'workbox-build';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { marketplaceNavigationPattern, marketplaceNavigationRule } from '../../../src/lib/marketplaceCachePolicy';
import { retainReleaseAssets } from '../../../scripts/retain-release-assets.mjs';

export async function startReleaseFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'almona-release-'));
  const project = process.cwd();
  const releases = { A: path.join(root, 'A'), B: path.join(root, 'B') };
  for (const release of ['A', 'B'] as const) {
    const directory = releases[release];
    await mkdir(path.join(directory, 'assets'), { recursive: true });
    const source = `
      import { registerAppServiceWorker, activateAppUpdate } from ${JSON.stringify(path.join(project, 'src/lib/pwaUpdate.ts'))};
      import { prepareMarketplaceReload } from ${JSON.stringify(path.join(project, 'src/lib/marketplaceRecovery.ts'))};
      import { loadLazyModule } from ${JSON.stringify(path.join(project, 'src/utils/lazyImport.ts'))};
      document.querySelector('#release').textContent = 'Release ${release}';
      registerAppServiceWorker().then(async () => {
        const registration = await navigator.serviceWorker.ready;
        document.querySelector('#worker').textContent = 'Worker ready';
        setInterval(() => { document.querySelector('#worker').textContent = registration.waiting ? 'Update waiting' : 'Worker ready'; }, 100);
        document.querySelector('#activate').onclick = () => activateAppUpdate(registration).catch(() => {document.querySelector('#result').textContent='Other tabs are open';});
      });
      document.querySelector('#recover').onclick = async () => { await prepareMarketplaceReload(); document.querySelector('#result').textContent = 'Recovery finished'; };
      if (location.pathname.startsWith('/used-machines')) {
        loadLazyModule(() => import('/assets/listing-${release}build.js'), 'UsedMachines').then(module => {
          document.querySelector('#listings').textContent = module.default;
        }).catch(() => {document.querySelector('#error').textContent = 'Could not load listings';});
      }
    `;
    await build({ stdin: { contents: source, resolveDir: project, loader: 'ts' }, bundle: true, format: 'esm', external: ['/assets/*'],
      outfile: path.join(directory, `assets/app-${release}build.js`), define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env.VITE_RELEASE_ID': '"local"' } });
    await writeFile(path.join(directory, `assets/listing-${release}build.js`), `export default '6 machines in release ${release}';`);
    await writeFile(path.join(directory, 'index.html'), `<!doctype html><html><body><h1 id="release"></h1><p id="document">Document ${release}</p>
      <p id="worker">Registering worker</p><a href="/used-machines">Browse machines</a><a href="/used-machines?tab=sell">Sell machine</a>
      <label>Workspace draft<input aria-label="Workspace draft"></label><button id="activate">Activate update</button><button id="recover">Recover failed page</button>
      <p id="result"></p><p id="listings"></p><p id="error" role="alert"></p><script type="module" src="/assets/app-${release}build.js"></script></body></html>`);
    await writeFile(path.join(directory, 'worker-recovery-guard.js'), await readFile(path.join(project, 'public/worker-recovery-guard.js')));
    await generateSW({ globDirectory: directory, swDest: path.join(directory, 'sw.js'), globPatterns: ['index.html', `assets/app-${release}build.js`],
      navigateFallback: 'index.html', skipWaiting: false, clientsClaim: false, importScripts: ['/worker-recovery-guard.js'],
      ...(release === 'B' ? { directoryIndex: '', navigateFallbackDenylist: [marketplaceNavigationPattern], navigateFallbackAllowlist: [/^\/fabricator(?:\/|$)/], runtimeCaching: [marketplaceNavigationRule] } : {}) });
    await retainReleaseAssets({ directory });
  }
  let active: 'A' | 'B' = 'A';
  let failChunks = false;
  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname === '/api/marketplace-events') { res.statusCode = 204; res.end(); return; }
    const name = url.pathname === '/' || !path.extname(url.pathname) ? '/index.html' : url.pathname;
    const target = path.resolve(releases[active], `.${name}`);
    if (!target.startsWith(releases[active] + path.sep)) { res.statusCode = 403; res.end(); return; }
    if (failChunks && name.includes('/listing-')) { res.statusCode = 503; res.end(); return; }
    try {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', name.endsWith('.js') ? 'application/javascript' : name.endsWith('.json') ? 'application/json' : 'text/html');
      res.end(await readFile(target));
    } catch { res.statusCode = 404; res.end(); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Fixture did not start');
  const origin = `http://127.0.0.1:${address.port}`;
  return {
    origin,
    async publish() { await retainReleaseAssets({ directory: releases.B, origin }); active = 'B'; },
    failChunks() { failChunks = true; },
    async bumpDocument() { const file = path.join(releases.B, 'index.html'); await writeFile(file, (await readFile(file, 'utf8')).replace('Document B', 'Fresh document B')); },
    async close() {
      await new Promise<void>((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
        // Browser/service-worker connections must not hold fixture teardown open.
        server.closeAllConnections();
      });
      if (!root.startsWith(path.join(os.tmpdir(), 'almona-release-'))) throw new Error('Unexpected fixture path');
      await rm(root, { recursive: true, force: true });
    },
  };
}
