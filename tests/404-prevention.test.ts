/**
 * 404 Prevention Test
 *
 * Asserts that every nav link has a matching Route or Redirect in App.tsx.
 * Prevents the "nav links hit NotFound" issue from returning.
 *
 * Run: npm run test -- tests/404-prevention.test.ts
 */
import { describe, it, expect } from 'vitest';
import { NAV_LINK_PATHS, REDIRECT_SOURCE_PATHS } from '../src/lib/navLinks';

// Paths that have Route elements (direct - no redirect) in App.tsx
const ROUTE_PATHS = [
  '/',
  '/shop',
  '/settings',
  '/about',
  '/contact',
  '/login',
  '/register',
  '/portal',
  '/admin',
  '/products',
  '/products/machines',
  '/products/configurator',
  '/products/3d-gallery',
  '/services',
  '/services/ai-advisor',
  '/services/sales',
  '/services/training',
  '/services/spare-parts',
  '/fabrication-services',
  '/fabricator-workflow',
  '/fabricator/studio/projects',
  '/fabricator/customers',
  '/fabricator/inventory',
  '/fabricator/profiles',
  '/fabricator/quality',
  '/fabricator/analytics',
  '/used-machines',
  '/support',
  '/support/tickets/new',
] as const;

function isHandled(path: string): boolean {
  if (ROUTE_PATHS.includes(path as any)) return true;
  if (REDIRECT_SOURCE_PATHS.includes(path as any)) return true;
  // /fabricator/* catch-all in App.tsx handles all fabricator subpaths
  if (path.startsWith('/fabricator/')) return true;
  // Prefix match for nested routes (e.g. /fabricator/studio/projects handles /fabricator/studio)
  if (ROUTE_PATHS.some((r) => path.startsWith(r + '/') || path === r)) return true;
  return false;
}

describe('404 prevention', () => {
  it('every nav link has a matching Route or Redirect', () => {
    const unhandled = NAV_LINK_PATHS.filter((path) => !isHandled(path));
    expect(
      unhandled,
      `Nav links without Route or Redirect (add to App.tsx): ${unhandled.join(', ')}`
    ).toEqual([]);
  });

  it('redirect source paths are in nav links', () => {
    const missing = REDIRECT_SOURCE_PATHS.filter((p) => !NAV_LINK_PATHS.includes(p));
    expect(
      missing,
      `Redirect sources not in NAV_LINK_PATHS (add to navLinks.ts): ${missing.join(', ')}`
    ).toEqual([]);
  });
});
