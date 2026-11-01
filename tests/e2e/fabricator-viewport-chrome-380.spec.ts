/**
 * Batch F — strict browser fixture for Engineering Bay 380 px preview rail.
 *
 * Skip ONLY when E2E_FABRICATOR_POSE_URL (or E2E_POSE_DESIGN_URL) is unset.
 * A configured URL that fails to render the shell is a hard failure.
 */
import { expect, test } from '@playwright/test';

const POSE_URL = (process.env.E2E_FABRICATOR_POSE_URL || process.env.E2E_POSE_DESIGN_URL || '').trim();
/** Known assembly list entry label when the CALUMINIUM PS fixture is loaded. */
const KNOWN_PART_NAME = process.env.E2E_FABRICATOR_KNOWN_PART || 'Frame';

test.describe('Fabricator 380px preview-rail chrome', () => {
  test.beforeEach(({ }, testInfo) => {
    if (!POSE_URL) {
      testInfo.annotations.push({
        type: 'blocked',
        description: 'E2E_FABRICATOR_POSE_URL / E2E_POSE_DESIGN_URL not configured',
      });
      test.skip(true, 'Blocked: authenticated Engineering Bay pose URL not configured');
    }
  });

  test('Parts + deferred details + status non-overlap inside a 380px rail', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(POSE_URL, { waitUntil: 'domcontentloaded' });

    const shell = page.locator('[data-testid="engineering-bay-shell"]');
    await expect(shell, 'configured pose must render engineering-bay-shell').toBeVisible({
      timeout: 30_000,
    });

    const previewHost = page.locator('[data-testid="engineering-bay-preview-host"]');
    await expect(previewHost).toBeVisible();

    const rightToggle = page.locator(
      '[data-testid="engineering-bay-preview-host"] [aria-expanded="false"]',
    ).first();
    if (await rightToggle.count()) {
      await rightToggle.click();
    }

    const railBox = await previewHost.boundingBox();
    expect(railBox, 'preview host must have a box').toBeTruthy();
    expect(
      Math.abs(Math.round(railBox!.width) - 380),
      `outer preview rail width should be ~380px, got ${railBox!.width}`,
    ).toBeLessThanOrEqual(24);

    const chrome = page.locator('[data-testid="window-3d-chrome"]');
    await expect(chrome).toBeVisible({ timeout: 20_000 });

    const partsToggle = chrome.getByRole('button', { name: /Parts/i });
    await expect(partsToggle, 'Parts toggle required in 3D chrome').toBeVisible();
    await partsToggle.click();

    const parts = page.locator('[data-testid="window-3d-part-list-slot"]');
    await expect(parts).toBeVisible();

    const knownPart = parts.getByText(KNOWN_PART_NAME, { exact: false }).first();
    await expect(knownPart, `known manifest entry "${KNOWN_PART_NAME}" required`).toBeVisible();
    await knownPart.click();

    await expect(page.locator('[data-testid="window-3d-details-deferred"]')).toBeVisible();
    await expect(page.locator('[data-testid="window-3d-details-slot"]')).toHaveCount(0);

    const status = page.locator('[data-testid="window-3d-status-slot"]');
    await expect(status, 'status / preview-source slot required').toBeVisible();

    const canvasHit = page.locator('[data-testid="window-3d-canvas-hit"]');
    await expect(canvasHit).toBeVisible();

    const partsBox = await parts.boundingBox();
    const statusBox = await status.boundingBox();
    const hitBox = await canvasHit.boundingBox();
    expect(partsBox && statusBox && hitBox).toBeTruthy();
    expect(partsBox!.y + partsBox!.height).toBeLessThanOrEqual(statusBox!.y + 2);
    expect(hitBox!.width).toBeGreaterThanOrEqual(100);

    // Pointer access: centre of the reserved strip must reach the canvas (or hit itself),
    // not a chrome overlay. Fail if an intercepting element sits above the strip.
    const hitCenter = {
      x: hitBox!.x + hitBox!.width / 2,
      y: hitBox!.y + hitBox!.height / 2,
    };
    const topAtHit = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return null;
      const canvas = el.closest('canvas');
      const hit = el.closest('[data-testid="window-3d-canvas-hit"]');
      const chromeOverlay = el.closest('[data-testid="window-3d-panel-stack"], [data-testid="window-3d-status-slot"], [data-testid="window-3d-toolbar-slot"]');
      return {
        tag: el.tagName,
        testId: (el as HTMLElement).dataset?.testid ?? null,
        isCanvas: Boolean(canvas),
        isHitStrip: Boolean(hit),
        isChromeOverlay: Boolean(chromeOverlay),
      };
    }, hitCenter);
    expect(topAtHit, 'elementFromPoint must resolve inside the preview').toBeTruthy();
    expect(topAtHit!.isChromeOverlay, 'chrome overlay must not intercept the canvas hit strip').toBe(false);
    expect(
      topAtHit!.isCanvas || topAtHit!.isHitStrip,
      'reserved strip centre must hit canvas or the pass-through hit region',
    ).toBe(true);

    await partsToggle.click();
    await expect(page.locator('[data-testid="window-3d-part-list-slot"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="window-3d-details-slot"]')).toBeVisible();

    await page.screenshot({ path: testInfo.outputPath('chrome-380-rail.png') });
  });
});
