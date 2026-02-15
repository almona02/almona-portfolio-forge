# 404 Analysis: Page vs API vs Asset

**Deep codebase analysis of all potential 404 sources.**

---

## 1. PAGE ROUTES (SPA / Vercel rewrites)

### ✅ Routes with Vercel rewrites (serve index.html)
- `/`, `/machines`, `/machines/:path*`, `/products/*`, `/used-machines`, `/used-machines/:path*`
- `/fabricator`, `/fabricator-workflow`, `/ydt`, `/prestige-agent`, `/test-scanner`
- `/dealer-verification`, `/yilmaz-machines-egypt`, `/fabricator-pro-software`, `/egyptian-project-wizard`
- Catch-all `/(.*)` → index.html

### ⚠️ Nav links with NO matching Route (→ NotFound)
| Path | Used in | Status |
|------|---------|--------|
| `/reports` | IndustrialNavbar, EnterpriseSidebar | **404** – No root route; only `/fabricator/studio/reports` exists |
| `/machine-status` | IndustrialNavbar quick action | **404** – No route |
| `/quality-reports` | IndustrialNavbar quick action | **404** – No route |
| `/pricing-settings` | IndustrialNavbar, EnterpriseSidebar | **404** – No route |
| `/offers` | IndustrialNavbar, EnterpriseSidebar | **404** – No route |
| `/cost-reports` | IndustrialNavbar, EnterpriseSidebar | **404** – No route |
| `/accounting` | IndustrialNavbar, EnterpriseSidebar | **404** – No route |

**Impact:** User clicks "Quick Reports", "Machine Status", etc. → 404 (NotFound page).

### ✅ Routes that exist and redirect correctly
- `/machines` → `MachinesRedirect` → `/products/machines` (preserves query)
- `/usedmachines` → `/used-machines`
- `/support/new` → `/support/tickets/new`
- `/portal/create-ticket` → `/support/tickets/new`
- `/fabricator/*` → various studio redirects

### ⚠️ Legacy paths that may need redirects
- `/fabricator/workflow/preview3d` – `FabricatorWorkflowToStudioRedirect` does not handle `preview3d`; falls through to `studioProjects()`
- `/fabricator/workflow/measuring` – same

---

## 2. API CALLS (fetch / relative URLs)

### 🔴 Relative `/api/*` – 404 on Vercel (no proxy in production)

| Source | URL | Backend |
|--------|-----|---------|
| `main.tsx` | `/api/egypt/users/:id/recent-projects` | Vite proxy (dev only) → **404 on Vercel** |
| `main.tsx` | `/api/egypt/materials/common` | Vite proxy (dev only) → **404 on Vercel** |
| `MorningBriefWidget.tsx` | `/api/v2/ydt/future-intelligence/feedback` | Relative → **404 on Vercel** |
| `AdvisoryDashboard.tsx` | `/api/v2/advisories/validate` | Relative → **404 on Vercel** |
| `FutureKnowledgeGraph.ts` | `/api/v2` (default base) | Relative → **404 on Vercel** |

**Cause:** Vite proxy (`/api` → `localhost:8000`) only runs in dev. On Vercel, `/api` is served by serverless functions; there is no `api/` folder, so these return 404.

**Fix options:**
1. Use `VITE_API_URL` for these calls (point to backend)
2. Add Vercel serverless functions under `api/`
3. Remove or guard these calls when `VITE_API_URL` is unset

### ✅ API calls using `VITE_API_URL` (backend)
These use `API_BASE` from `VITE_API_URL` and go to the backend (Railway/Render). They only 404 if the backend is down or `VITE_API_URL` is missing:

- `customersApi.ts`, `workflowsApi.ts`, `invoiceTemplatesApi.ts`, `quoteTemplatesApi.ts`
- `notificationsApi.ts`, `analyticsQueriesApi.ts`, `analyticsMetricsApi.ts`
- `reportGenerationApi.ts`, `reportTemplatesApi.ts`, `bulkOperationsApi.ts`
- `projectActivitiesApi.ts`, `projectTemplatesApi.ts`, `filterPresetsApi.ts`
- `DXFProfileImporter.tsx` (profile-import)
- `smartScanApi.ts`, `customersApi.ts`, etc.

---

## 3. ASSETS (images, documents)

### 🔴 Images referenced but not in `public/images/`

**`public/images/` currently has:** `profiles/*.jpg` only (6 files)

**Referenced in code (likely 404):**

| Path | Source |
|------|--------|
| `/images/machines/cutting-machine.jpg` | Login.tsx, Register.tsx |
| `/images/machines/DC-421-PBS.jpg` | YilmazDealer.tsx |
| `/images/machines/PIM-6509.jpg` | YilmazDealer.tsx |
| `/images/machines/CNC-608.jpg` | YilmazDealer.tsx |
| `/images/machines/CRM-250-S.jpg` | SpareParts.tsx |
| `/images/machines/KM-215-S.jpg` | SpareParts.tsx |
| `/images/machines/cnc-2000.jpg` | AIRecommendationDemo.tsx |
| `/images/machines/cnc-3000.jpg` | AIRecommendationDemo.tsx |
| `/images/machines/cnc-5000.jpg` | AIRecommendationDemo.tsx |
| `/images/egypt-workflow-step1.webp` | main.tsx (cache warming) |
| `/images/egypt-workflow-step2.webp` | main.tsx |
| `/images/katra-pro-red-logo.webp` | main.tsx |
| `/images/foxywin-logo.webp` | main.tsx |
| `/images/caluminium-ps-logo.webp` | main.tsx |
| `/images/egyptian-industrial-hero-bg.webp` | EgyptianIndustrialHero.tsx |
| `/images/egyptian-industrial-hero-bg.png` | About.tsx |
| `/images/about-page-image.png` | About.tsx |
| `/images/hero01 (1).webp` … `(4).webp` | AboutSection.tsx |
| `/images/factory .png` | Products.tsx |
| `/images/fabrication/fabrication-hero.jpg` | FabricationServices.tsx |
| `/images/fabrication/*-showcase.jpg` | FabricationServices.tsx |
| `/images/projects/project-*.jpg` | FabricationServices.tsx |
| `/images/placeholder-machine.jpg` | OptimizedProductCard.tsx |
| `/images/company/global-imports-1995.jpg` | timelineData.ts |
| `/images/company/yilmaz-resilience-2000.jpg` | timelineData.ts |
| `/images/machinery-marketplace-og.jpg` | MachineSEO.tsx |
| `/images/machinery-marketplace-twitter.jpg` | MachineSEO.tsx |

**yilmazMachines.ts** references many `/images/machines/*.png` and `/documents/specs/*.pdf` – all need to exist in `public/`.

### ✅ Images that exist
- `/images/profiles/ahmed-hassan.jpg`, `fatima-al-sayed.jpg`, etc. (6 files)

### 🔴 Documents referenced but not in `public/documents/`

| Path | Source |
|------|--------|
| `/documents/specs/DK-502.pdf` | SupportPortal.tsx |
| `/documents/specs/AIM-3410.pdf` | yilmazMachines – **exists** |
| `/documents/egyptian/import-license-requirements.pdf` | EgyptianComplianceDocs.tsx |
| `/documents/egyptian/safety-standards-compliance.pdf` | EgyptianComplianceDocs.tsx |
| `/documents/egyptian/tax-regulations-guide.pdf` | EgyptianComplianceDocs.tsx |
| `/documents/egyptian/certification-process.pdf` | EgyptianComplianceDocs.tsx |
| `/documents/business_license_2024.pdf` | PartnerOnboarding.tsx |

**`public/documents/` currently has:** `specs/AIM-3410.pdf`, `parsed_machine_specs.json`, `extracted_machine_specs.json`

---

## 4. SERVICE WORKER / PWA

| Asset | Status |
|-------|--------|
| `/sw.js` | Generated by VitePWA at build; in `dist/` |
| `/service-worker.js` | Registered in index.html; exists in `public/` |
| `/manifest.webmanifest` | VitePWA generates; vercel.json has headers |

**Note:** Both `sw.js` (VitePWA) and `service-worker.js` (custom) are used; confirm intended behavior.

---

## 5. SUMMARY: Priority fixes

### High (user-facing 404s)
1. **Nav links** – Add routes or redirects for: `/reports`, `/machine-status`, `/quality-reports`, `/pricing-settings`, `/offers`, `/cost-reports`, `/accounting`
2. **Relative API calls** – Switch `/api/egypt/*` and `/api/v2/*` to use `VITE_API_URL` or add Vercel API routes
3. **Missing images** – Add `/images/machines/*`, `/images/fabrication/*`, hero images, etc. to `public/`, or use placeholders/fallbacks

### Medium (graceful degradation)
4. **Missing documents** – Add PDFs to `public/documents/` or remove/update links
5. **Cache warming** – main.tsx prefetches images that may not exist; consider conditional prefetch

### Low
6. **Legacy workflow paths** – Ensure `/fabricator/workflow/preview3d` and `/measuring` redirect correctly

---

## 7. FIXES APPLIED (2026-02)

### Page routes
- Added 7 redirects: `/reports`, `/machine-status`, `/quality-reports`, `/pricing-settings`, `/offers`, `/cost-reports`, `/accounting` → canonical studio/shop/settings

### API calls
- Created `src/lib/apiBase.ts` – `getApiBase()`, `isApiAvailable()`
- `main.tsx`: prefetch now uses `getApiBase()` + `/egypt/...` (no `/api/*`)
- `MorningBriefWidget`, `AdvisoryDashboard`, `FutureKnowledgeGraph`: use `getApiBase()` for all fetches

### Assets
- Removed image cache warming in `main.tsx` (was prefetching non-existent images → 404 spam)

### PWA
- Removed custom `service-worker.js` registration from `index.html` – VitePWA only (`sw.js`)

### 404 reporter
- `NotFound.tsx`: logs pathname, referrer, isAuthed, fromNavbar (for known nav paths) to console + gtag

### Security (Python)
- `pillow`: 12.1.0 → >=12.1.1 (CVE-2026-25990)
- `pypdf`: 5.3.0 → >=6.1.3 (CVE-2025-55197, CVE-2025-62708)
- `sqlparse`: 0.5.3 → >=0.5.4 (CVE-2024-4340)

### Security (npm)
- `markdown-it`: ^14.1.0 → ^14.1.1 (CVE-2026-2327 ReDoS)
- `qs`: resolution ^6.14.2 (CVE-2026-2391)

---

## 6. VERCEL REWRITES COVERAGE

Current rewrites cover:
- Static HTML: dealer-verification, yilmaz-machines-egypt, fabricator-pro-software
- SPA routes: machines, products, used-machines, fabricator, ydt, test-scanner, fabricator-workflow, egyptian-project-wizard
- Catch-all: `/(.*)` → index.html

**Missing explicit rewrites (handled by catch-all):**
- `/shop`, `/reports`, `/support/*`, `/login`, `/register`, `/admin`, `/portal`, etc.

Catch-all serves index.html for all paths; React Router then decides. Unmatched paths show NotFound.
