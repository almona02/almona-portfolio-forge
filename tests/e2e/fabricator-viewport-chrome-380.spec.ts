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

  test('Parts + deferred details + canvas receiver at 380px rail', async ({ page }, testInfo) => {
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
    const canvas = previewHost.locator('canvas').first();
    await expect(canvas, 'R3F canvas required in preview host').toBeVisible();

    const partsBox = await parts.boundingBox();
    const statusBox = await status.boundingBox();
    const hitBox = await canvasHit.boundingBox();
    expect(partsBox && statusBox && hitBox).toBeTruthy();
    expect(partsBox!.y + partsBox!.height).toBeLessThanOrEqual(statusBox!.y + 2);
    expect(hitBox!.width).toBeGreaterThanOrEqual(100);

    const hitCenter = {
      x: hitBox!.x + hitBox!.width / 2,
      y: hitBox!.y + hitBox!.height / 2,
    };

    // Positive: centre of reserved strip must resolve to the actual canvas receiver.
    const topAtHit = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return null;
      return {
        tag: el.tagName,
        isCanvas: el.tagName === 'CANVAS' || Boolean(el.closest('canvas')),
        isHitStripOnly:
          Boolean(el.closest('[data-testid="window-3d-canvas-hit"]'))
          && el.tagName !== 'CANVAS'
          && !el.closest('canvas'),
        isChromeOverlay: Boolean(
          el.closest('[data-testid="window-3d-panel-stack"], [data-testid="window-3d-status-slot"], [data-testid="window-3d-toolbar-slot"]'),
        ),
      };
    }, hitCenter);
    expect(topAtHit, 'elementFromPoint must resolve inside the preview').toBeTruthy();
    expect(topAtHit!.isChromeOverlay, 'chrome overlay must not intercept the canvas').toBe(false);
    expect(topAtHit!.isCanvas, 'reserved strip centre must hit the canvas element').toBe(true);

    // Negative: if the hit strip starts intercepting input, the canvas check must fail.
    await canvasHit.evaluate((el) => {
      (el as HTMLElement).style.pointerEvents = 'auto';
      (el as HTMLElement).style.background = 'rgba(255,0,0,0.01)';
    });
    const blocked = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return null;
      return {
        isCanvas: el.tagName === 'CANVAS' || Boolean(el.closest('canvas')),
        hitStripIntercepts:
          (el as HTMLElement).dataset?.testid === 'window-3d-canvas-hit'
          || Boolean(el.closest('[data-testid="window-3d-canvas-hit"]') && el.tagName !== 'CANVAS'),
      };
    }, hitCenter);
    expect(blocked?.isCanvas, 'intercepting hit strip must not count as canvas access').toBe(false);
    expect(blocked?.hitStripIntercepts).toBe(true);
    // Restore pass-through for remaining interactions.
    await canvasHit.evaluate((el) => {
      (el as HTMLElement).style.pointerEvents = '';
      (el as HTMLElement).style.background = '';
    });

    // Observable renderer gesture: click canvas after restore; canvas remains the target.
    await canvas.click({ position: { x: 8, y: 8 }, force: false });
    const afterClick = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return el ? (el.tagName === 'CANVAS' || Boolean(el.closest('canvas'))) : false;
    }, hitCenter);
    expect(afterClick).toBe(true);

    await partsToggle.click();
    await expect(page.locator('[data-testid="window-3d-part-list-slot"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="window-3d-details-slot"]')).toBeVisible();

    await page.screenshot({ path: testInfo.outputPath('chrome-380-rail.png') });
  });
});
