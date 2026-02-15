/**
 * Canonical list of nav link paths (pathname only, no hash/query).
 * Used by Navbar, EnterpriseSidebar, IndustrialNavbar, etc.
 *
 * 404 prevention: Every path here MUST have a matching Route or Redirect in App.tsx.
 * See tests/404-prevention.test.ts
 */
export const NAV_LINK_PATHS = [
  // Root & main
  '/',
  '/shop',
  '/settings',
  '/about',
  '/contact',
  '/login',
  '/register',
  '/portal',
  '/admin',

  // Products & services
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

  // Fabricator workflow (hash-based)
  '/fabricator-workflow',

  // Fabricator studio (redirect targets)
  '/fabricator/studio/projects',
  '/fabricator/customers',
  '/fabricator/inventory',
  '/fabricator/profiles',
  '/fabricator/quality',
  '/fabricator/analytics',

  // Nav links that redirect (no dedicated page)
  '/reports',
  '/machine-status',
  '/quality-reports',
  '/pricing-settings',
  '/offers',
  '/cost-reports',
  '/accounting',
  '/machines',

  // Used machines
  '/used-machines',

  // Support
  '/support',
  '/support/tickets/new',
] as const;

export type NavLinkPath = (typeof NAV_LINK_PATHS)[number];

/**
 * Paths that are redirect sources (nav links that go to these get redirected).
 * Must have Route path="X" element={<RedirectWithQuery to="..." />} in App.tsx.
 */
export const REDIRECT_SOURCE_PATHS = [
  '/reports',
  '/machine-status',
  '/quality-reports',
  '/pricing-settings',
  '/offers',
  '/cost-reports',
  '/accounting',
  '/machines',
] as const;
