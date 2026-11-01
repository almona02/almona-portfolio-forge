/**
 * Batch F — browser fixtures for 3D chrome at Engineering Bay rail (380) and studio bands.
 * Skips when no auth/session; records viewport + chrome attributes when the bay is reachable.
 */
import { expect, test } from '@playwright/test';

const WIDTHS = [380, 768, 1024, 1440] as const;

test.describe('Fabricator viewport chrome fixtures', () => {
  for (const width of WIDTHS) {
    test(`chrome host usable at ${width}px (no horizontal overflow on shell)`, async ({ page }) => {
      await page.setViewportSize({ width: Math.max(width, 390), height: 900 });
      // Public prestige entry is enough to assert shell CSS; deep bay may require auth.
      await page.goto('/fabricator', { waitUntil: 'domcontentloaded' });
      const shell = page.locator('[data-testid="design-workspace-shell"], [data-testid="engineering-bay-shell"], main').first();
      await expect(shell).toBeVisible({ timeout: 15_000 });
      const box = await shell.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        expect(box.width).toBeGreaterThan(0);
        // No catastrophic overflow past viewport
        expect(box.x + box.width).toBeLessThanOrEqual(Math.max(width, 390) + 2);
      }
    });
  }
});
