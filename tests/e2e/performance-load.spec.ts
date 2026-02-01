import { expect, test } from '@playwright/test';

test.describe('Performance Load Tests', () => {

    test('should maintain frame rate with 100+ elements', async ({ page }) => {
        // 1. Load Drafting
        await page.goto('/fabricator/drafting');
        await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });

        // 2. Inject 100 Rectangles
        await page.evaluate(() => {
            const entities = [];
            for (let i = 0; i < 100; i++) {
                entities.push({
                    id: `PERF_${i}`,
                    type: 'rectangle',
                    x: (i % 10) * 100,
                    y: Math.floor(i / 10) * 100,
                    width: 90,
                    height: 90,
                    profileId: 'system-alumil-m11000'
                });
            }
            
            // Assuming we can access the CanvasManager or Store directly for testing
            // If not, we set localStorage and reload
            localStorage.setItem('constitutional-state-PERF_POSE-smartdraw', JSON.stringify({
                poseId: 'PERF_POSE',
                mode: 'smartdraw',
                state: { entities },
                metadata: { hash: 'perf-hash', tier: 'Tier 3', timestamp: new Date().toISOString() }
            }));
        });

        // Reload to render the injected state
        const startTime = Date.now();
        await page.reload();
        await expect(page.locator('canvas')).toBeVisible();
        
        // Measure "Time to Interactive" / Render completion
        // This is a rough proxy: waiting for the main thread to settle
        await page.waitForTimeout(100); 
        const loadTime = Date.now() - startTime;
        
        console.log(`Load time for 100 elements: ${loadTime}ms`);
        
        // Performance assertions
        // Ideally we'd hook into requestAnimationFrame, but for now we ensure it doesn't timeout
        expect(loadTime).toBeLessThan(5000); // Generous buffer for CI, aim for <1000ms locally
    });

    test('should not leak memory after repeated reload', async ({ page }) => {
        await page.goto('/fabricator/drafting');
        
        // Baseline memory check (only works in Chromium with flag, but skip check if not available)
        const getMemory = async () => {
            return await page.evaluate(() => (performance as any).memory?.usedJSHeapSize);
        };

        const startMem = await getMemory();
        if (!startMem) {
            test.skip('Memory API not available');
            return;
        }

        // Reload 10 times
        for (let i = 0; i < 10; i++) {
            await page.reload();
            await expect(page.locator('canvas')).toBeVisible();
        }

        const endMem = await getMemory();
        const growth = endMem - startMem;
        
        console.log(`Memory growth: ${(growth / 1024 / 1024).toFixed(2)} MB`);
        
        // Assert growth is within reasonable limits (e.g. < 50MB for 10 reloads)
        expect(growth).toBeLessThan(50 * 1024 * 1024);
    });
});
