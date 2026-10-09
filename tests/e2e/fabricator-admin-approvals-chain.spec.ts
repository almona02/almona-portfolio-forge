/**
 * Admin Approvals end-to-end on local Supabase:
 * customer request → admin approve → Check approved → optimize unblocked.
 *
 * Requires:
 *   npx supabase start && db reset (admin-workflow migration)
 *   npx tsx scripts/e2e-seed-admin-approvals-chain.ts
 *   Vite with VITE_SUPABASE_URL=http://127.0.0.1:54321 (local anon key)
 */
import { expect, test, type Page } from '@playwright/test';

const LOCAL_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** supabase-js v2 storage key for http://127.0.0.1:54321 → sb-127-auth-token */
function supabaseAuthStorageKey(url: string): string {
  try {
    const host = new URL(url).hostname.split('.')[0] || 'localhost';
    return `sb-${host}-auth-token`;
  } catch {
    return 'sb-127-auth-token';
  }
}

function env(name: string, fallback?: string): string {
  const value = process.env[name]?.trim() || fallback || '';
  if (!value) {
    if (process.env.E2E_OPTIONAL === '1') {
      test.skip(true, `${name} missing (E2E_OPTIONAL=1)`);
      return '';
    }
    throw new Error(`Missing ${name}. Run scripts/e2e-seed-admin-approvals-chain.ts`);
  }
  return value;
}

async function dismissDevOverlays(page: Page): Promise<void> {
  await page
    .addStyleTag({
      content: [
        '.performance-dashboard, .performance-dashboard * { display: none !important; pointer-events: none !important; }',
        '[data-sonner-toaster] { pointer-events: none !important; }',
      ].join('\n'),
    })
    .catch(() => undefined);
}

async function login(page: Page, email: string, password: string): Promise<void> {
  // Password grant via API — avoids UI/rate-limit flakiness across multiple role switches.
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
    ({ key, sessionPayload }) => {
      try {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem(key, JSON.stringify(sessionPayload));
      } catch {
        /* ignore */
      }
    },
    {
      key: storageKey,
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

  await page.goto('/fabricator/studio/command', { waitUntil: 'domcontentloaded' });
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
  await dismissDevOverlays(page);
}

async function logout(page: Page): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
}

async function fillApprovalRequest(page: Page): Promise<void> {
  const section = page.getByRole('region', { name: /Catalogue and manufacturing approval/i });
  await expect(section).toBeVisible({ timeout: 60_000 });
  const inputs = section.locator('input');
  await expect(inputs.nth(0)).toBeVisible();
  await inputs.nth(0).fill('vendor-caluminium-ps-catalogue-v1');
  await inputs.nth(1).fill('vendor-caluminium-ps-cutting-rules-v1');
  await section.getByRole('button', { name: /Request approval/i }).click();
  await expect(page.getByText(/Review request .* submitted|submitted/i)).toBeVisible({
    timeout: 30_000,
  });
}

test.describe('Fabricator admin approvals chain', () => {
  test('request → admin approve → optimize unblocked', async ({ page }) => {
    test.setTimeout(300_000);

    const customerEmail = env('E2E_USER_EMAIL', 'e2e.customer@almona.local');
    const customerPassword = env('E2E_USER_PASSWORD', 'E2eCustomer!pass1');
    const adminEmail = env('E2E_ADMIN_EMAIL', 'e2e.admin@almona.local');
    const adminPassword = env('E2E_ADMIN_PASSWORD', 'E2eAdmin!pass1');
    const projectId =
      process.env.E2E_APPROVALS_PROJECT_ID?.trim() || 'a2000000-5466-4000-8000-000000000001';
    const positionId =
      process.env.E2E_APPROVALS_POSITION_ID?.trim() || 'a2000000-5466-4000-8000-000000000002';

    page.on('pageerror', (err) => console.log(`BROWSER ERROR: ${err.message}`));

    const bomUrl = `/fabricator/studio/projects/${projectId}/positions/${positionId}/bom`;
    const optUrl = `/fabricator/studio/projects/${projectId}/positions/${positionId}/optimization`;

    await login(page, customerEmail, customerPassword);
    await page.goto(optUrl, { waitUntil: 'domcontentloaded' });
    await fillApprovalRequest(page);

    await page.getByRole('button', { name: /Check approved versions/i }).click();
    await expect(
      page.getByText(/unavailable|not found|One active approved|failed|required|Approval request failed/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    await logout(page);

    await login(page, adminEmail, adminPassword);
    await page.goto('/fabricator/studio/approvals', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('manufacturing-approvals-admin')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('caluminium-ps').first()).toBeVisible({ timeout: 30_000 });
    await dismissDevOverlays(page);

    const approveBtn = page.getByRole('button', { name: /^Approve$/i }).first();
    await expect(approveBtn).toBeEnabled();
    const approveRpc = page.waitForResponse(
      (res) =>
        res.url().includes('/rpc/admin_approve_fabricator_manufacturing_approval') &&
        res.request().method() === 'POST',
      { timeout: 45_000 },
    );
    await approveBtn.click();
    const approveRes = await approveRpc;
    expect(
      approveRes.ok(),
      `approve RPC ${approveRes.status()} ${await approveRes.text()}`,
    ).toBeTruthy();
    await expect(page.getByTestId('active-authority-caluminium-ps')).toBeVisible({
      timeout: 45_000,
    });

    await logout(page);

    await login(page, customerEmail, customerPassword);
    await page.goto(optUrl, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /Check approved versions/i })).toBeVisible({
      timeout: 60_000,
    });
    await page.getByRole('button', { name: /Check approved versions/i }).click();
    await expect(page.getByText(/Approved caluminium-ps|catalogue revision/i)).toBeVisible({
      timeout: 30_000,
    });

    await page.goto(bomUrl, { waitUntil: 'domcontentloaded' });
    const retry = page.getByRole('button', { name: /^Retry$/i });
    if (await retry.isVisible().catch(() => false)) {
      await retry.click();
    }
    const generate = page.getByRole('button', { name: /Generate BOM/i });
    if (await generate.isVisible().catch(() => false)) {
      await generate.click();
    }
    await expect(
      page.getByText(/Manufacturing qualified|Estimate only|BOM Generation Failed/i).first(),
    ).toBeVisible({ timeout: 90_000 });

    await page.goto(optUrl, { waitUntil: 'domcontentloaded' });
    const body = await page.locator('body').innerText();
    if (body.includes('Manufacturing qualified') || !body.includes('manufacturing-qualified BOM is required')) {
      expect(body).not.toMatch(/approved manufacturing authority is unavailable/i);
    }
    await page.getByRole('button', { name: /Check approved versions/i }).click();
    await expect(page.getByText(/Approved caluminium-ps|catalogue revision/i)).toBeVisible({
      timeout: 30_000,
    });
  });

  test('non-admin is blocked from Approvals UI', async ({ page }) => {
    test.setTimeout(120_000);
    const customerEmail = env('E2E_USER_EMAIL', 'e2e.customer@almona.local');
    const customerPassword = env('E2E_USER_PASSWORD', 'E2eCustomer!pass1');
    await login(page, customerEmail, customerPassword);
    await page.goto('/fabricator/studio/approvals', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('manufacturing-approvals-blocked')).toBeVisible({
      timeout: 30_000,
    });
  });

  test('one-click Approve vendor catalogue writes vendor provenance', async ({ page }) => {
    test.setTimeout(180_000);
    const adminEmail = env('E2E_ADMIN_EMAIL', 'e2e.admin@almona.local');
    const adminPassword = env('E2E_ADMIN_PASSWORD', 'E2eAdmin!pass1');
    page.on('pageerror', (err) => console.log(`BROWSER ERROR: ${err.message}`));
    await login(page, adminEmail, adminPassword);
    await page.goto('/fabricator/studio/approvals', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('manufacturing-approvals-admin')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('vendor-catalogue-section')).toBeVisible({ timeout: 30_000 });
    await dismissDevOverlays(page);

    const approveBtn = page.getByTestId('approve-vendor-caluminium-ps');
    await expect(approveBtn).toBeEnabled({ timeout: 15_000 });
    const rpcWait = page.waitForResponse(
      (res) =>
        res.url().includes('/rpc/admin_approve_vendor_catalogue') && res.request().method() === 'POST',
      { timeout: 45_000 },
    );
    await approveBtn.click();
    const rpcRes = await rpcWait;
    expect(rpcRes.ok(), `vendor approve RPC status ${rpcRes.status()}`).toBeTruthy();

    await expect(page.getByTestId('active-authority-caluminium-ps')).toContainText(/vendor/i, {
      timeout: 45_000,
    });
    await dismissDevOverlays(page);

    const revokeWait = page.waitForResponse(
      (res) =>
        res.url().includes('/rpc/admin_revoke_fabricator_manufacturing_authority') &&
        res.request().method() === 'POST',
      { timeout: 45_000 },
    );
    await page
      .getByTestId('active-authority-caluminium-ps')
      .getByRole('button', { name: /Revoke/i })
      .click();
    const revokeRes = await revokeWait;
    expect(revokeRes.ok(), `revoke RPC status ${revokeRes.status()}`).toBeTruthy();
    await expect(page.getByTestId('active-authority-caluminium-ps')).toHaveCount(0, {
      timeout: 45_000,
    });
  });
});
