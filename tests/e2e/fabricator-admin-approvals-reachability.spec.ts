/**
 * Approvals queue reachability across viewports (authenticated).
 * Uses local Supabase admin login + DEV reachability fixture for long queues
 * (no production SQL). Screenshots → test-results/approvals-reachability/.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { APPROVALS_REACHABILITY_STORAGE_KEY } from '../../src/lib/fabricator/approvals/approvalsReachabilityFixture';

const LOCAL_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const ARTIFACT_DIR = path.join('test-results', 'approvals-reachability');

type ViewportCase = {
  name: string;
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
};

const VIEWPORTS: ViewportCase[] = [
  { name: '320x568', width: 320, height: 568, isMobile: true },
  { name: '390x844', width: 390, height: 844, isMobile: true },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: 'short-landscape', width: 812, height: 375, isMobile: true },
  { name: '200pct-zoom', width: 1366, height: 768, deviceScaleFactor: 2 },
];

function supabaseAuthStorageKey(url: string): string {
  try {
    const host = new URL(url).hostname.split('.')[0] || 'localhost';
    return `sb-${host}-auth-token`;
  } catch {
    return 'sb-127-auth-token';
  }
}

async function dismissDevOverlays(page: Page): Promise<void> {
  await page
    .addStyleTag({
      content: [
        '.performance-dashboard, .performance-dashboard *, .performance-dashboard-toggle { display: none !important; pointer-events: none !important; }',
        '[data-sonner-toaster] { pointer-events: none !important; }',
        /* Floating FABs sit above sticky action rows on phones */
        '[aria-label="Open performance dashboard"],',
        '.fixed.bottom-6.right-6, .fixed.bottom-4.right-4 {',
        '  display: none !important; pointer-events: none !important; visibility: hidden !important;',
        '}',
      ].join('\n'),
    })
    .catch(() => undefined);
}

async function loginAsAdmin(page: Page): Promise<void> {
  const email = process.env.E2E_ADMIN_EMAIL?.trim() || 'e2e.admin@almona.local';
  const password = process.env.E2E_ADMIN_PASSWORD?.trim() || 'E2eAdmin!pass1';

  const tokenRes = await page.request.post(
    `${LOCAL_SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: {
        apikey: LOCAL_ANON_KEY,
        'Content-Type': 'application/json',
      },
      data: { email, password },
    },
  );
  expect(tokenRes.ok(), `auth token ${tokenRes.status()} ${await tokenRes.text()}`).toBeTruthy();
  const session = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    user: unknown;
  };

  const storageKey = supabaseAuthStorageKey(LOCAL_SUPABASE_URL);
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ key, sessionPayload, fixtureKey }) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem(key, JSON.stringify(sessionPayload));
      sessionStorage.setItem(fixtureKey, '1');
    },
    {
      key: storageKey,
      fixtureKey: APPROVALS_REACHABILITY_STORAGE_KEY,
      sessionPayload: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: Math.floor(Date.now() / 1000) + (session.expires_in || 3600),
        token_type: session.token_type || 'bearer',
        user: session.user,
      },
    },
  );
}

/** Control is visible and its click center is not covered by sticky chrome / overlays. */
async function assertUnobscured(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, 'bounding box').toBeTruthy();
  if (!box) return;
  expect(box.width).toBeGreaterThan(4);
  expect(box.height).toBeGreaterThan(4);

  // Must sit inside the Approvals scrollport (not clipped by studio shell)
  const inScroller = await locator.evaluate((el) => {
    const scroller = document.querySelector(
      '[data-testid="manufacturing-approvals-admin"]',
    ) as HTMLElement | null;
    if (!scroller) return false;
    const er = el.getBoundingClientRect();
    const sr = scroller.getBoundingClientRect();
    const cx = er.left + er.width / 2;
    const cy = er.top + er.height / 2;
    return cx >= sr.left && cx <= sr.right && cy >= sr.top && cy <= sr.bottom;
  });
  expect(inScroller, 'inside approvals scrollport').toBe(true);

  const hit = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    return !!top && (el === top || el.contains(top) || top.contains(el));
  });
  const id =
    (await locator.getAttribute('data-testid')) ||
    (await locator.evaluate((el) => el.textContent || el.tagName));
  expect(hit, `unobscured ${id}`).toBe(true);
}

async function scrollControlIntoView(page: Page, locator: Locator): Promise<void> {
  await locator.evaluate((el) => {
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
  });
  await page.waitForTimeout(120);
}

async function openApprovals(page: Page): Promise<void> {
  await page.goto('/fabricator/studio/approvals', { waitUntil: 'domcontentloaded' });
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
  await dismissDevOverlays(page);
  await expect(page.getByTestId('manufacturing-approvals-admin')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('approvals-jump-nav')).toBeVisible();
  await expect(page.getByTestId('hardener-approvals-panel')).toBeVisible();
}

async function verifyViewport(page: Page, vp: ViewportCase): Promise<void> {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  // deviceScaleFactor is set at context creation for zoom case; CSS zoom for extra coverage
  if (vp.name === '200pct-zoom') {
    await page.evaluate(() => {
      (document.documentElement as HTMLElement).style.zoom = '2';
    });
  } else {
    await page.evaluate(() => {
      (document.documentElement as HTMLElement).style.zoom = '1';
    });
  }

  await openApprovals(page);

  const stickyOffset = Number(
    await page.getByTestId('manufacturing-approvals-admin').getAttribute('data-sticky-offset'),
  );
  expect(stickyOffset).toBeGreaterThan(24);

  // Jump nav keyboard: focus first jump, Enter to pending, verify section not under sticky chrome
  const jumpPending = page.getByTestId('approvals-jump-approvals-pending');
  await jumpPending.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  const pendingTop = await page.locator('#approvals-pending').evaluate((el) => {
    return el.getBoundingClientRect().top;
  });
  expect(pendingTop).toBeGreaterThanOrEqual(stickyOffset - 2);

  for (const section of [
    'approvals-vendor',
    'approvals-pending',
    'approvals-active',
    'approvals-hardener',
  ] as const) {
    await page.getByTestId(`approvals-jump-${section}`).focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(350);
    const top = await page.locator(`#${section}`).evaluate((el) => el.getBoundingClientRect().top);
    expect(top, `${vp.name} ${section} jump offset`).toBeGreaterThanOrEqual(stickyOffset - 4);
  }

  // Vendor action (last pack for long scroll)
  const vendorBtn = page.getByTestId('approve-vendor-reachability-vendor-pack-08');
  await scrollControlIntoView(page, vendorBtn);
  await assertUnobscured(vendorBtn);
  await vendorBtn.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('approvals-status')).toBeVisible();
  // Re-measure sticky chrome after status appears; jumps still clear it
  const stickyAfterStatus = Number(
    await page.getByTestId('manufacturing-approvals-admin').getAttribute('data-sticky-offset'),
  );
  expect(stickyAfterStatus).toBeGreaterThanOrEqual(stickyOffset);
  await page.getByTestId('approvals-jump-approvals-hardener').click();
  await page.waitForTimeout(350);
  const hardenerTop = await page.locator('#approvals-hardener').evaluate((el) => {
    return el.getBoundingClientRect().top;
  });
  expect(hardenerTop).toBeGreaterThanOrEqual(stickyAfterStatus - 4);

  // Pending approve/reject
  const approvePending = page.getByTestId(
    'approve-request-11111111-1111-4111-8111-000000000001',
  );
  await scrollControlIntoView(page, approvePending);
  await assertUnobscured(approvePending);
  await assertUnobscured(
    page.getByTestId('reject-request-11111111-1111-4111-8111-000000000001'),
  );

  // Active revoke (last row)
  const revokeBtn = page.getByTestId('revoke-44444444-4444-4444-8444-000000000006');
  await scrollControlIntoView(page, revokeBtn);
  await assertUnobscured(revokeBtn);

  const hardenerId = '55555555-5555-4555-8555-000000000002';
  await scrollControlIntoView(page, page.getByTestId(`hardener-reject-${hardenerId}`));
  await assertUnobscured(page.getByTestId(`hardener-reject-${hardenerId}`));
  await assertUnobscured(page.getByTestId(`hardener-approve-${hardenerId}`));
  await scrollControlIntoView(page, page.getByTestId(`hardener-override-${hardenerId}`));
  await assertUnobscured(page.getByTestId(`hardener-override-${hardenerId}`));

  // Status lives in sticky chrome (top) — still visible after deep scroll
  await scrollControlIntoView(
    page,
    page.getByTestId('hardener-proposal-55555555-5555-4555-8555-000000000005'),
  );
  await assertUnobscured(page.getByTestId('approvals-status'));

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, `${vp.name}.png`),
    fullPage: false,
  });
}

test.describe('Approvals reachability (authenticated)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(240_000);

  test('all viewports: scroll, keyboard, unobscured actions', async ({ browser }) => {
    const results: Array<{ name: string; ok: boolean }> = [];

    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.deviceScaleFactor ?? 1,
        isMobile: vp.isMobile ?? false,
        hasTouch: vp.isMobile ?? false,
      });
      const page = await context.newPage();
      try {
        await loginAsAdmin(page);
        await verifyViewport(page, vp);
        results.push({ name: vp.name, ok: true });
      } catch (err) {
        results.push({ name: vp.name, ok: false });
        fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(ARTIFACT_DIR, `${vp.name}-FAIL.png`) }).catch(() => undefined);
        await context.close();
        throw err;
      }
      await context.close();
    }

    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'viewport-results.json'),
      JSON.stringify({ results, at: new Date().toISOString() }, null, 2),
    );
  });
});
