import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { getTransformedRoutes } = require('../.batch1-tools/node_modules/@vercel/routing-utils');
const releaseRoot = resolve(process.argv[2] || 'batch1-release');
if (!releaseRoot.startsWith(resolve('.') + (process.platform === 'win32' ? '\\' : '/'))) {
  throw new Error('Release directory must be inside this workspace.');
}
const destination = resolve(releaseRoot, '.vercel/output');
if (existsSync(destination)) throw new Error('Release output already exists; preserve it and choose a new destination.');
const privateValues = [];
for (const file of ['.env', 'python_backend/.env']) {
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z_0-9]+)\s*=\s*(.*)$/);
    if (!match || !/SECRET|PASSWORD|SERVICE.*KEY|JWT_SECRET/.test(match[1])) continue;
    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
    if (value.length >= 16) privateValues.push([match[1], value]);
  }
}
let checked = 0;
const apiTargets = new Set();
function scan(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, item.name);
    if (item.isDirectory()) scan(path);
    else if (/\.(js|html|json|css|map|txt)$/.test(item.name)) {
      const contents = readFileSync(path, 'utf8');
      for (const match of contents.matchAll(/VITE_API_URL["']?\s*:\s*["']([^"']+)/g)) apiTargets.add(match[1]);
      for (const [name, value] of privateValues) {
        if (contents.includes(value)) throw new Error(`Private ${name} found in build output; deployment blocked.`);
      }
      for (const token of contents.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
        try {
          if (JSON.parse(Buffer.from(token[1], 'base64url')).role === 'service_role') {
            throw new Error('Service-role credential found in build output; deployment blocked.');
          }
        } catch (error) { if (error.message.includes('deployment blocked')) throw error; }
      }
      checked++;
    }
  }
}
scan('dist');
if (apiTargets.size !== 1 || !apiTargets.has('https://almona-portfolio-forge-production.up.railway.app')) {
  throw new Error('Production API setting does not match the verified Railway target; deployment blocked.');
}
const configuration = JSON.parse(readFileSync('vercel.json', 'utf8'));
const transformed = getTransformedRoutes(configuration);
if (transformed.error) throw new Error(JSON.stringify(transformed.error));
const overrides = {};
function htmlAliases(directory, prefix = '') {
  for (const item of readdirSync(directory, {withFileTypes: true})) {
    const path = prefix + item.name;
    if (item.isDirectory()) htmlAliases(resolve(directory, item.name), path + '/');
    else if (item.name.endsWith('.html')) overrides[path] = {path: path.slice(0, -5)};
  }
}
htmlAliases('dist');
for (const route of transformed.routes) {
  if (route.dest?.endsWith('.html')) route.dest = route.dest.slice(0, -5);
}
mkdirSync(destination, { recursive: true });
cpSync('dist', resolve(destination, 'static'), { recursive: true });
writeFileSync(resolve(destination, 'config.json'), JSON.stringify({version: 3, routes: transformed.routes, overrides}, null, 2));
writeFileSync(resolve(destination, 'builds.json'), JSON.stringify({target: 'production'}));
mkdirSync(resolve(releaseRoot, '.vercel'), {recursive: true});
cpSync('.vercel/project.json', resolve(releaseRoot, '.vercel/project.json'));
const metadata = {batch: 1, builtAt: new Date().toISOString(), apiBase: [...apiTargets][0],
  indexSha256: createHash('sha256').update(readFileSync('dist/index.html')).digest('hex')};
writeFileSync(resolve(destination, 'static/batch1-verification.json'), JSON.stringify(metadata, null, 2));
console.log(`PASS: ${checked} build files scanned; static-only release prepared with existing Vercel routes.`);
