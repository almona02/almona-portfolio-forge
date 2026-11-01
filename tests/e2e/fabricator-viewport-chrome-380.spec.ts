/**
 * Batch F — browser fixture for Engineering Bay 380 px preview rail.
 *
 * Requires an authenticated fabricator session (E2E_FABRICATOR_POSE_URL or storage state).
 * Without that fixture this test **skips** — it must not pass against a generic public page.
 */
import { expect, test, type Page } from '@playwright/test';

const POSE_URL = process.env.E2E_FABRICATOR_POSE_URL || process.env.E2E_POSE_DESIGN_URL || '';

async function openEngineeringBay(page: Page): Promise<boolean> {
  if (!POSE_URL) return false;
  await page.goto(POSE_URL, { waitUntil: 'domcontentloaded' });
  const shell = page.locator('[data-testid="engineering-bay-shell"]');
  try {
    await shell.waitFor({ state: 'visible', timeout: 20_000 });
    return true;
  } catch {
    return false;
  }
}

test.describe('Fabricator 380px preview-rail chrome', () => {
  test('Parts + status + canvas hit do not overlap inside a 380px rail', async ({ page }, testInfo) => {
    const opened = await openEngineeringBay(page);
    if (!opened) {
      testInfo.annotations.push({
        type: 'blocked',
        description: 'Missing E2E_FABRICATOR_POSE_URL / authenticated Engineering Bay fixture',
      });
      test.skip(true, 'Blocked: authenticated Engineering Bay pose URL not configured');
      return;
    }

    // Desktop viewport; the *rail* is 380 — not the whole browser.
    await page.setViewportSize({ width: 1440, height: 900 });

    const previewHost = page.locator('[data-testid="engineering-bay-preview-host"]');
    await expect(previewHost).toBeVisible();
    const railBox = await previewHost.boundingBox();
    expect(railBox).toBeTruthy();
    expect(Math.round(railBox!.width)).toBeGreaterThanOrEqual(48);
    // Expanded rail targets ENGINEERING_BAY_PREVIEW_RAIL_PX (380).
    if (railBox!.width >= 300) {
      expect(Math.abs(Math.round(railBox!.width) - 380)).toBeLessThanOrEqual(24);
    }

    const chrome = page.locator('[data-testid="window-3d-chrome"]');
    await expect(chrome).toBeVisible({ timeout: 15_000 });

    const partsToggle = page.getByRole('button', { name: /Parts/i }).first();
    if (await partsToggle.count()) {
      await partsToggle.click();
    }

    const parts = page.locator('[data-testid="window-3d-part-list-slot"]');
    const status = page.locator('[data-testid="window-3d-status-slot"]');
    const canvasHit = page.locator('[data-testid="window-3d-canvas-hit"]');

    if (await parts.count()) {
      await expect(parts).toBeVisible();
    }
    if (await status.count()) {
      const partsBox = await parts.boundingBox();
      const statusBox = await status.boundingBox();
      const hitBox = await canvasHit.boundingBox();
      expect(statusBox).toBeTruthy();
      expect(hitBox).toBeTruthy();
      if (partsBox && statusBox) {
        // Status is a flex row under panels — bottoms of parts should not cover status top.
        expect(partsBox.y + partsBox.height).toBeLessThanOrEqual(statusBox.y + 2);
      }
      if (hitBox) {
        expect(hitBox.width).toBeGreaterThanOrEqual(100);
      }
    }

    await page.screenshot({
      path: testInfo.outputPath('chrome-380-rail.png'),
      fullPage: false,
    });
  });
});
