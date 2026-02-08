import { expect, test } from '@playwright/test';

test.describe('Fabricator Reality Workflow - Project Studio', () => {

  test('should support full Design-Optimize-Quote workflow', async ({ page }) => {
    test.setTimeout(90000); // Extended timeout for first load
    // Enable console logging from the browser to debug potential runtime errors
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

    // Canonical studio route: /fabricator/studio/projects/:projectId
    console.log('Navigating to /fabricator/studio/projects/demo-proj-001');
    const response = await page.goto('/fabricator/studio/projects/demo-proj-001', { waitUntil: 'domcontentloaded' });
    console.log(`Navigation status: ${response?.status()}`);

    // 2. Verify Initial Load
    console.log('Waiting for "Project Studio" text...');
    await expect(page.getByRole('heading', { name: /Project Studio/i })).toBeVisible({ timeout: 30000 });
    console.log('Project Studio loaded.');

    console.log('Waiting for "Add New Unit" button...');
    const addUnitBtn = page.getByRole('button', { name: 'Add New Unit' });
    await expect(addUnitBtn).toBeVisible();
    await addUnitBtn.click();
    console.log('Clicked Add New Unit');
    
    // Check that a unit was added to the sidebar list (e.g. "U1")
    console.log('Waiting for U1...');
    await expect(page.getByText('U1').first()).toBeVisible();

    // 4. Verify Design Tab (Default)
    console.log('Verifying Design Tab...');
    await expect(page.getByRole('tab', { name: 'Design' })).toHaveAttribute('data-state', 'active');
    
    // Check for "Designing: U1" header which confirms state update
    await expect(page.getByText(/Designing: U1/i)).toBeVisible();

    // 5. Run Optimization
    console.log('Switching to Optimize Tab...');
    await page.getByRole('tab', { name: 'Optimize' }).click();
    
    // Click Optimization
    console.log('Clicking Run Optimization...');
    const runOptBtn = page.getByRole('button', { name: /Run Optimization|Optimize All/i });
    await expect(runOptBtn).toBeVisible();
    await runOptBtn.click();

    // Wait for results
    console.log('Waiting for optimization results...');
    await expect(page.getByText('Total Material')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Total Waste')).toBeVisible();
    
    // 6. Verify Quote Generation
    console.log('Switching to Quote Tab...');
    await page.getByRole('tab', { name: 'Quote' }).click();

    // Verify Quote Document
    console.log('Verifying Quote...');
    await expect(page.getByRole('heading', { name: 'QUOTATION' })).toBeVisible();
    
    // Verify Read-Only Canvas Preview
    const previewCanvas = page.locator('table canvas').first();
    await expect(previewCanvas).toBeVisible();
    console.log('Test Complete Success');
  });

});
