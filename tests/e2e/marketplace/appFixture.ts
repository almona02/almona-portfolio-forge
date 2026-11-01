import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
export async function serveBuiltApp() {
  const root = path.resolve('dist');
  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname.startsWith('/api/')) { res.statusCode = 204; res.end(); return; }
    const file = path.resolve(root, `.${url.pathname === '/' || !path.extname(url.pathname) ? '/index.html' : url.pathname}`);
    if (!file.startsWith(root + path.sep)) { res.statusCode = 403; res.end(); return; }
    try {
      const extension = path.extname(file);
      res.setHeader('Content-Type', extension === '.js' ? 'application/javascript' : extension === '.css' ? 'text/css' : extension === '.json' || extension === '.webmanifest' ? 'application/json' : extension === '.svg' ? 'image/svg+xml' : extension === '.html' ? 'text/html' : 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      res.end(await readFile(file));
    } catch { res.statusCode = 404; res.end(); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('App fixture did not start');
  return { origin: `http://127.0.0.1:${address.port}`, close: () => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }) };
}
