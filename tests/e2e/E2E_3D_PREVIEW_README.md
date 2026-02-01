# E2E: 3D Preview and Full Workflow

Deep end-to-end test of the fabricator workflow: **Login → Measuring → Design → 3D Preview → Optimization → Reports → Production**, with scroll and visibility checks on every page.

## Prerequisites

1. **Dev server**: Start the app so Playwright can reach it.
   ```bash
   npm run dev
   ```
   App runs at `http://localhost:3000` (see `vite.config.ts`).

2. **Backend / auth**: For **real login** tests, your auth backend must accept:
   - Email: `almona.co@hotmail.com`
   - Password: `abcd1234`

   If you use dev bypass only, run with the `chromium` project (see below).

## Run E2E

**With real login** (user: almona.co@hotmail.com, pass: abcd1234):

```bash
npx playwright test tests/e2e/3d-preview-full-workflow.spec.ts --project=chromium-real-login
```

**With dev bypass** (no login form; uses injected token from global setup):

```bash
npx playwright test tests/e2e/3d-preview-full-workflow.spec.ts --project=chromium
```

**Full E2E suite** (all projects, including setup):

```bash
npm run test:e2e
```

## What is tested

| Step | Route | Checks |
|------|--------|--------|
| Login | `/login` | Form visible, submit, redirect off `/login` |
| Measuring | `/fabricator/workflow/measuring` | Steps, verification checkbox, “Finalize Design” |
| Design | `/fabricator/workflow/design` | Ribbon, Technical Design / System Configuration |
| **3D Preview** | `/fabricator/workflow/preview3d` | Heading “3D Preview”, “Continue to Optimization”, scroll/visibility |
| Optimization | `/fabricator/workflow/optimization` | Content visible, scroll |
| Production | `/fabricator/workflow/production` | Content visible, scroll |
| Reports | `/fabricator/reports` | Reports content, scroll to bottom |

One test runs the **full flow** in order: login → measuring → design → 3D preview → optimization → production → reports, and asserts scroll/visibility along the way.

## Scroll and visibility

- Each page asserts that the main content selector is visible.
- Where applicable, the test scrolls to the bottom and checks that the page is scrollable (`scrollHeight >= clientHeight`).
- The 3D Preview page explicitly checks the main content area and the “Continue to Optimization” button.

## Timeouts

- Test timeout: 120s per test.
- Login redirect: up to 30s.
- Page loads (measuring, design, etc.): 15–20s.

If the dev server or backend is slow, increase timeouts in the spec or in `playwright.config.ts`.
