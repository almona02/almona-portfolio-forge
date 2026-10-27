import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Connect, Plugin } from 'vite';

/** Missing machine-readable resources must never turn into a successful SPA document. */
export function resourceBoundary(root: string, development = false): Connect.NextHandleFunction {
  return (req, res, next) => {
    let pathname: string;
    try { pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname); }
    catch { res.statusCode = 400; res.end('Bad request'); return; }
    if (/^\/api(?:\/|$)/.test(pathname)) return next();
    if (development && /^\/(?:src\/|node_modules\/|@)/.test(pathname)) return next();
    if (!/^\/\.well-known(?:\/|$)/.test(pathname) && !/\.(?:txt|xml|json|webmanifest)$/i.test(pathname)) return next();
    const file = path.resolve(root, '.' + pathname);
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !existsSync(file)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.end('Not found');
      return;
    }
    next();
  };
}

export function publicResourceBoundary(): Plugin {
  return {
    name: 'public-resource-boundary',
    configureServer(server) { server.middlewares.use(resourceBoundary(server.config.publicDir, true)); },
    configurePreviewServer(server) {
      const root = path.resolve(server.config.root, server.config.build.outDir);
      server.middlewares.use(resourceBoundary(root));
      // Mirror the deployed catalogue rewrites so preview tests exercise raw HTML too.
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');
        const catalogues: Record<string, string> = { '/products': '/catalogue-products.html', '/products/machines': '/catalogue-machines.html' };
        const model = url.pathname.match(/^\/products\/machines\/([a-zA-Z0-9_-]+)(\.html)?$/);
        if (model?.[2]) {
          res.statusCode = 308; res.setHeader('Location', `/products/machines/${model[1]}${url.search}`); res.end(); return;
        }
        const target = catalogues[url.pathname] || (model ? `/catalogue-models/${model[1]}.html` : undefined);
        if (!target) return next();
        if (!existsSync(path.join(root, target))) {
          res.statusCode = 404; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end('Machine not found'); return;
        }
        req.url = target + url.search;
        next();
      });
    },
  };
}
