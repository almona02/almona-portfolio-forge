import type { IncomingMessage, ServerResponse } from 'node:http';

/** Hard 404 document for the visibility missing-listing fixture (and manual probes). */
export default function handler(_req: IncomingMessage, res: ServerResponse): void {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.end(
    '<!doctype html><html lang="en"><meta charset="utf-8"><title>Listing not found</title><h1>Listing not found</h1><p>This used-machine listing does not exist.</p><p><a href="/used-machines">Back to marketplace</a></p></html>',
  );
}
