import { expect, test } from '@playwright/test';

test.describe('Offline Resilience & Degradation', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/fabricator/drafting');
        // Wait for app to become stable
        await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
    });

    test('should prevent data loss when network goes offline', async ({ context, page }) => {
        // 1. Create initial state (e.g. draw a rect)
        // We'll simulate this by injecting state to ensure we have something to lose
        await page.evaluate(() => {
            const mockState = {
                entities: [{ id: 'OFFLINE_TEST', type: 'rectangle', x: 50, y: 50, width: 100, height: 100 }]
            };
            localStorage.setItem('constitutional-state-OFFLINE_POSE-smartdraw', JSON.stringify({
                poseId: 'OFFLINE_POSE',
                mode: 'smartdraw',
                state: mockState,
                metadata: { hash: 'offline-hash', timestamp: new Date().toISOString() }
            }));
        });

        // 2. Go Offline
        await context.setOffline(true);

        // 3. Attempt to "Save" or modify state (triggering a sync attempt)
        // We simulate a user action that would trigger the sync service
        // For now, we manually trigger the service if UI is hard to target, or verify the error boundary DOESN'T crash
        // Ideally, the app should just queue the update or save to localStorage (which works offline)
        
        await page.evaluate(async () => {
            // Simulate a state update
            // @ts-ignore
            if (window.appServices?.positionSync) {
                // @ts-ignore
                await window.appServices.positionSync.syncStateWithGuarantees('OFFLINE_POSE', 'smartdraw', {
                    entities: [{ id: 'OFFLINE_TEST', type: 'rectangle', x: 60, y: 60, width: 100, height: 100 }]
                });
            }
        });

        // 4. Verify no crash/error dialog (Constitutional Error Boundary should handle it gracefully)
        await expect(page.locator('text=Critical Error')).not.toBeVisible();

        // 5. Verify local persistence still works (localStorage is synchronous and offline-capable)
        const stored = await page.evaluate(() => localStorage.getItem('constitutional-state-OFFLINE_POSE-smartdraw'));
        expect(stored).toBeTruthy();
        expect(JSON.parse(stored!).state.entities[0].x).toBe(60); // Should have updated locally

        // 6. Go Online
        await context.setOffline(false);
    });
});
