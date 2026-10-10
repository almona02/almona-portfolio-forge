/**
 * Approvals queue reachability across viewports (authenticated).
 * Uses local Supabase admin login + DEV reachability fixture for long queues
 * (no production SQL). Keeps production floating controls / notifications.
 * Screenshots → test-results/approvals-reachability/.
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
  /** CSS page zoom applied AFTER navigation (not deviceScaleFactor). */
  pageZoom?: number;
  isMobile?: boolean;
};

const VIEWPORTS: ViewportCase[] = [
  { name: '320x568', width: 320, height: 568, isMobile: true },
  { name: '390x844', width: 390, height: 844, isMobile: true },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: 'short-landscape', width: 812, height: 375, isMobile: true },
  { name: '200pct-zoom', width: 1366, height: 768, pageZoom: 2 },
];

function supabaseAuthStorageKey(url: string): string {
  try {
    const host = new URL(url).hostname.split('.')[0] || 'localhost';
    return `sb-${host}-auth-token`;
  } catch {
    return 'sb-127-auth-token';
  }
}

async function readEffectiveZoom(page: Page): Promise<number> {
  return page.evaluate(() => {
    // Prefer explicit CSS zoom we set after navigation (visualViewport.scale stays 1).
    const inline = (document.documentElement.style.zoom || '').trim();
    const computed = getComputedStyle(document.documentElement).zoom;
    for (const raw of [inline, computed]) {
      const parsed = parseFloat(String(raw || ''));
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    const vv = window.visualViewport?.scale;
    return typeof vv === 'number' && vv > 0 ? vv : 1;
  });
}

/** Apply CSS page zoom AFTER navigation and assert the effective scale. */
async function applyAndAssertPageZoom(page: Page, scale: number): Promise<void> {
  await page.evaluate((s) => {
    document.documentElement.style.zoom = String(s);
  }, scale);
  await page.waitForTimeout(80);
  const effective = await readEffectiveZoom(page);
  expect(effective, 'effective page zoom').toBeCloseTo(scale, 1);
  await page.evaluate((s) => {
    document.documentElement.dataset.approvalsPageZoom = String(s);
  }, scale);
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

/**
 * Control is visible, inside the Approvals scrollport, and actionable.
 * At pageZoom>1, Playwright trial-click is the authority (CSS zoom breaks
 * elementFromPoint/viewport math); at 100% we also assert hit-testing.
 */
async function assertUnobscured(page: Page, locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, 'bounding box').toBeTruthy();
  if (!box) return;
  expect(box.width).toBeGreaterThan(4);
  expect(box.height).toBeGreaterThan(4);

  const zoom = await readEffectiveZoom(page);
  // Actionability: not covered for pointer events (works under CSS zoom).
  await locator.click({ trial: true, timeout: 8_000 });

  if (zoom > 1.05) return;

  const inScroller = await locator.evaluate((el) => {
    const scroller = document.querySelector(
      '[data-testid="manufacturing-approvals-admin"]',
    ) as HTMLElement | null;
    if (!scroller) return false;
    const er = el.getBoundingClientRect();
    const sr = scroller.getBoundingClientRect();
    const cx = er.left + Math.min(24, er.width * 0.25);
    const cy = er.top + er.height / 2;
    return (
      cx >= sr.left &&
      cx <= sr.right &&
      cy >= sr.top &&
      cy <= sr.bottom &&
      cx >= 0 &&
      cy >= 0 &&
      cx <= window.innerWidth &&
      cy <= window.innerHeight
    );
  });
  expect(inScroller, 'inside approvals scrollport + viewport').toBe(true);

  const hit = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const points = [
      [r.left + Math.min(24, r.width * 0.25), r.top + r.height / 2],
      [r.left + r.width / 2, r.top + r.height / 2],
    ] as const;
    let lastCover: string | null = 'no-points';
    for (const [x, y] of points) {
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) {
        lastCover = `oob(${x.toFixed(0)},${y.toFixed(0)})`;
        continue;
      }
      const top = document.elementFromPoint(x, y);
      if (top && (el === top || el.contains(top) || top.contains(el))) {
        return { ok: true as const, cover: null as string | null };
      }
      lastCover = top ? `${top.tagName}.${String(top.className)}`.slice(0, 120) : 'null';
    }
    return { ok: false as const, cover: lastCover };
  });
  const id =
    (await locator.getAttribute('data-testid')) ||
    (await locator.evaluate((el) => el.textContent || el.tagName));
  expect(hit.ok, `unobscured ${id} cover=${hit.cover}`).toBe(true);
}

/**
 * Scroll the Approvals scroller so the control sits in the usable band between
 * measured sticky jump-chrome (top) and production FAB / status-bar clearance (bottom).
 */
async function scrollControlIntoView(page: Page, locator: Locator): Promise<void> {
  const testId = await locator.getAttribute('data-testid');
  await page.evaluate(
    ({ id, fabClearance }) => {
      const scroller = document.querySelector(
        '[data-testid="manufacturing-approvals-admin"]',
      ) as HTMLElement | null;
      const stickyEl = document.querySelector(
        '[data-testid="approvals-sticky-chrome"]',
      ) as HTMLElement | null;
      const el = id
        ? (document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null)
        : null;
      if (!scroller || !el) return;
      const zoom =
        parseFloat(String(getComputedStyle(document.documentElement).zoom || '1')) || 1;
      const stickyBottom =
        stickyEl?.getBoundingClientRect().bottom ??
        scroller.getBoundingClientRect().top + 56;
      const sr = scroller.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      const usableTop = stickyBottom + 8;
      const usableBottom = sr.bottom - fabClearance;
      const elMid = er.top + er.height / 2;
      let targetY: number;
      if (usableBottom <= usableTop + 48) {
        // Short / zoomed viewports: pin just under sticky chrome.
        targetY = usableTop + er.height / 2 + 4;
      } else {
        targetY = (usableTop + usableBottom) / 2;
      }
      scroller.scrollTop += (elMid - targetY) / zoom;
    },
    { id: testId, fabClearance: 112 },
  );
  await page.waitForTimeout(160);
}

async function ensureUnobscured(page: Page, locator: Locator): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt++) {
    await scrollControlIntoView(page, locator);
    try {
      await assertUnobscured(page, locator);
      return;
    } catch {
      await page.evaluate((dir) => {
        const scroller = document.querySelector(
          '[data-testid="manufacturing-approvals-admin"]',
        ) as HTMLElement | null;
        const zoom =
          parseFloat(String(getComputedStyle(document.documentElement).zoom || '1')) || 1;
        if (scroller) scroller.scrollTop += dir / zoom;
      }, attempt % 2 === 0 ? 64 : -96);
      await page.waitForTimeout(80);
    }
  }
  await assertUnobscured(page, locator);
}

async function keyboardActivate(page: Page, locator: Locator): Promise<void> {
  await ensureUnobscured(page, locator);
  await locator.focus();
  await page.keyboard.press('Enter');
}

async function openApprovals(page: Page): Promise<void> {
  await page.goto('/fabricator/studio/approvals', { waitUntil: 'domcontentloaded' });
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
  // Intentionally keep production FABs, Perf chip, and notification toasters.
  await expect(page.getByTestId('manufacturing-approvals-admin')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('approvals-jump-nav')).toBeVisible();
  await expect(page.getByTestId('hardener-approvals-panel')).toBeVisible();
}

async function assertFloatingChromePresent(page: Page): Promise<void> {
  // At least one production-style floating control or status chrome should exist.
  const fabOrStatus = await page.evaluate(() => {
    const fixed = Array.from(document.querySelectorAll('body *')).some((el) => {
      const s = getComputedStyle(el);
      if (s.position !== 'fixed' && s.position !== 'sticky') return false;
      const r = el.getBoundingClientRect();
      return r.width > 24 && r.height > 24 && r.bottom > window.innerHeight - 120;
    });
    const statusBar = !!document.querySelector('[data-testid="manufacturing-status-bar"], footer, [class*="StatusBar"]');
    return fixed || statusBar;
  });
  expect(fabOrStatus, 'production floating / status chrome present').toBe(true);
}

async function verifyViewport(page: Page, vp: ViewportCase): Promise<void> {
  await page.setViewportSize({ width: vp.width, height: vp.height });

  await openApprovals(page);

  // Zoom must be applied AFTER navigation (goto resets documentElement styles).
  const expectedZoom = vp.pageZoom ?? 1;
  await applyAndAssertPageZoom(page, expectedZoom);
  expect(await readEffectiveZoom(page)).toBeCloseTo(expectedZoom, 1);

  // Allow sticky chrome ResizeObserver to settle under the new scale.
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(120);

  await assertFloatingChromePresent(page);

  const liveStickyBottom = async () =>
    page.locator('[data-testid="approvals-sticky-chrome"]').evaluate((el) => {
      return el.getBoundingClientRect().bottom;
    });

  // Jump nav via keyboard — section top clears live sticky chrome bottom
  for (const section of [
    'approvals-vendor',
    'approvals-pending',
    'approvals-active',
    'approvals-hardener',
  ] as const) {
    const jump = page.getByTestId(`approvals-jump-${section}`);
    await jump.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(450);
    const stickyBottom = await liveStickyBottom();
    const top = await page.locator(`#${section}`).evaluate((el) => el.getBoundingClientRect().top);
    expect(top, `${vp.name} ${section} jump offset`).toBeGreaterThanOrEqual(stickyBottom - 2);
  }

  // --- Vendor approve (keyboard) ---
  await page.getByTestId('approvals-jump-approvals-vendor').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const vendorBtn = page.getByTestId('approve-vendor-reachability-vendor-pack-08');
  await keyboardActivate(page, vendorBtn);
  await expect(page.getByTestId('approvals-status')).toBeVisible();
  // Zoom must still hold after in-page status update
  expect(await readEffectiveZoom(page)).toBeCloseTo(expectedZoom, 1);

  // After status grows sticky chrome, hardener jump still clears live sticky bottom
  await page.getByTestId('approvals-jump-approvals-hardener').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(450);
  const stickyBottomAfterStatus = await liveStickyBottom();
  const hardenerTop = await page.locator('#approvals-hardener').evaluate((el) => {
    return el.getBoundingClientRect().top;
  });
  expect(hardenerTop).toBeGreaterThanOrEqual(stickyBottomAfterStatus - 2);

  // --- Pending approve + reject (keyboard) ---
  await page.getByTestId('approvals-jump-approvals-pending').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const pendingApprove = page.getByTestId(
    'approve-request-11111111-1111-4111-8111-000000000001',
  );
  await keyboardActivate(page, pendingApprove);
  await expect(page.getByTestId('approvals-status')).toContainText(/Approved|Rejected|Vendor/i);

  const pendingReject = page.getByTestId(
    'reject-request-11111111-1111-4111-8111-000000000002',
  );
  await keyboardActivate(page, pendingReject);

  // --- Active authority revoke (keyboard) ---
  await page.getByTestId('approvals-jump-approvals-active').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const revokeBtn = page.getByTestId('revoke-44444444-4444-4444-8444-000000000006');
  await keyboardActivate(page, revokeBtn);

  // --- Hardener: Approve, Reject, Revoke, both override inputs, override submit ---
  await page.getByTestId('approvals-jump-approvals-hardener').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  // Row ...0002: checks pass (i=1) → Approve enabled
  const hardenerPassId = '55555555-5555-4555-8555-000000000002';
  await keyboardActivate(page, page.getByTestId(`hardener-approve-${hardenerPassId}`));

  // Row ...0003: i=2, checks pass → Reject
  const hardenerRejectId = '55555555-5555-4555-8555-000000000003';
  await keyboardActivate(page, page.getByTestId(`hardener-reject-${hardenerRejectId}`));

  // Row ...0004: i=3, failed checks → Approve disabled; Revoke + override path
  const hardenerOverrideId = '55555555-5555-4555-8555-000000000004';
  await ensureUnobscured(page, page.getByTestId(`hardener-revoke-${hardenerOverrideId}`));
  await page.getByTestId(`hardener-revoke-${hardenerOverrideId}`).focus();
  // Do not activate Revoke yet — exercise override inputs first on same card
  const reason = page.getByTestId(`hardener-override-reason-${hardenerOverrideId}`);
  const evidence = page.getByTestId(`hardener-override-evidence-${hardenerOverrideId}`);
  const overrideBtn = page.getByTestId(`hardener-override-${hardenerOverrideId}`);

  await ensureUnobscured(page, reason);
  await reason.focus();
  await page.keyboard.type('keyboard override reason for reachability');

  await ensureUnobscured(page, evidence);
  await evidence.focus();
  await page.keyboard.type('evidence-ref-keyboard-01');

  await keyboardActivate(page, overrideBtn);

  // Separate card for hardener Revoke keyboard activate (row ...0005)
  const hardenerRevokeId = '55555555-5555-4555-8555-000000000005';
  await keyboardActivate(page, page.getByTestId(`hardener-revoke-${hardenerRevokeId}`));

  // Status still unobscured in sticky chrome after deep actions
  await ensureUnobscured(page, page.getByTestId('approvals-status'));
  expect(await readEffectiveZoom(page)).toBeCloseTo(expectedZoom, 1);

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, `${vp.name}.png`),
    fullPage: false,
  });
}

test.describe('Approvals reachability (authenticated)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(300_000);

  test('all viewports: scroll, keyboard, unobscured actions', async ({ browser }) => {
    const results: Array<{ name: string; ok: boolean; zoom: number }> = [];

    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        isMobile: vp.isMobile ?? false,
        hasTouch: vp.isMobile ?? false,
      });
      const page = await context.newPage();
      try {
        await loginAsAdmin(page);
        await verifyViewport(page, vp);
        results.push({ name: vp.name, ok: true, zoom: vp.pageZoom ?? 1 });
      } catch (err) {
        results.push({ name: vp.name, ok: false, zoom: vp.pageZoom ?? 1 });
        fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
        await page
          .screenshot({ path: path.join(ARTIFACT_DIR, `${vp.name}-FAIL.png`) })
          .catch(() => undefined);
        await context.close();
        throw err;
      }
      await context.close();
    }

    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'viewport-results.json'),
      JSON.stringify(
        {
          results,
          floatingControls: 'present (not dismissed)',
          zoomPolicy: 'CSS zoom applied after navigation; effective scale asserted',
          at: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  });
});
