import { expect, test } from '@playwright/test';

test.describe('Almona Drafting Smoke Test', () => {
  test('should load the dashboard and verify title', async ({ page }) => {
    await page.goto('/');
    
    // Check page title or key element
    await expect(page).toHaveTitle(/Almona|Portfolio/i);
    
    // Wait for main layout to exist
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to drafting workbench', async ({ page }) => {
    // 1. Prepare: Inject a mock project into the store via window.jobsStore
    // We navigate to home first to ensure the app and store are loaded
    await page.goto('/');
    
    await page.evaluate(() => {
      const mockProject = {
        id: 'e2e-test-project-123',
        projectCode: 'E2E-001',
        customer: 'Playwright Test',
        orderNumber: 'ORD-123',
        posNumber: '001',
        status: 'draft',
        overallWidth: 2000,
        overallHeight: 2000,
        type: 'window',
        systemPackId: 'rock60',
        components: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Access the exposed store
      const store = (window as any).jobsStore;
      if (store) {
        store.getState().setJobs([mockProject]);
      } else {
        throw new Error('jobsStore not exposed on window');
      }
    });

    // 2. Act: Navigate to the design page for this project
    await page.goto('/fabricator/workflow/design/e2e-test-project-123');
    
    // 3. Assert: Verify critical elements (Canvas, Props Tab)
    // Canvas might take a moment to initialize the 3D context
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });
    
    // Check for the Props tab or Side panel elements that confirm EngineeringBay loaded
    // Verify Engineering Bay loaded
    await expect(page.getByRole('heading', { name: 'Engineering Bay' })).toBeVisible({ timeout: 10000 });

    // Switch to Drafting Mode
    const draftingButton = page.getByRole('button', { name: /Drafting Mode/i });
    if (await draftingButton.isVisible()) {
        await draftingButton.click();
    }

    // Verify Drafting Workbench elements
    await expect(page.getByText('Window / Door')).toBeVisible();
  });
});
