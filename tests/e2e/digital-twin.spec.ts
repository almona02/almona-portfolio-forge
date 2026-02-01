import { expect, test } from '@playwright/test';

test.describe('Digital Twin Dashboard', () => {
  test('should load dashboard with asset details', async ({ page }) => {
    // 1. Mock the machines API response
    // Supabase usually requests: https://<project>.supabase.co/rest/v1/machines?select=...
    // We'll intercept any request to "machines" endpoint
    await page.route('**/rest/v1/machines*', async route => {
      const mockMachine = [{
        id: 'mock-123',
        serial_number: 'SN-MOCK-999',
        name: 'Mock Digital Twin Asset',
        model: 'Yilmaz FR 222',
        brand: 'Yilmaz',
        status: 'online',
        is_active: true,
        specifications: { "power": "5kW" },
        installation_date: '2025-01-01',
        warranty_expiry: '2030-01-01T00:00:00Z', // Future date
        warranty_valid: true,
        image_url: '' // No image to trigger placeholder
      }];
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMachine)
      });
    });

    // 2. Mock specific asset request if the app uses fetchAssetById (future proofing)
    await page.route('**/rest/v1/assets*', async route => {
         // Fallback mock if it uses the new 'assets' table
         const mockAsset = [{
            id: 'mock-123',
            serial_number: 'SN-MOCK-999',
            name: 'Mock Digital Twin Asset',
            // ... keys matching assets table
             specifications: { "power": "5kW" },
             status: 'online'
          }];
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockAsset)
          });
    });

    // 2b. Inject Auth Token (Bypass Login)
    await page.goto('/'); // Initialize origin
    await page.evaluate(() => {
      window.localStorage.setItem('almona_dev_auth', 'true');
    });

    // 3. Navigate to the dashboard
    // The route is /machines/:machineId
    await page.goto('/machines/mock-123');

    // 4. Verification
    
    // Header
    await expect(page.getByText('Mock Digital Twin Asset')).toBeVisible();
    await expect(page.getByText('SN: SN-MOCK-999')).toBeVisible();
    
    // Badges
    await expect(page.getByText('online', { exact: true })).toBeVisible();
    await expect(page.getByText('Warranty Active')).toBeVisible();

    // Stats
    await expect(page.getByText('Efficiency')).toBeVisible();
    await expect(page.getByText('98%')).toBeVisible();

    // QR Code
    // The QR code component usually renders an svg
    await expect(page.locator('svg[height="120"]')).toBeVisible(); // QRCodeSVG size is 120
    await expect(page.getByText('Asset Tag')).toBeVisible();

    // 5. Timeline Tab
    // 5. Timeline Tab
    const timelineTab = page.getByText('Timeline', { exact: true });
    await expect(timelineTab).toBeVisible();
    // await timelineTab.click(); // It's default, but clicking ensures interactivity
    if (await timelineTab.getAttribute('data-state') !== 'active') {
       await timelineTab.click();
    } 
    
    // Check for mock events (which are currently hardcoded in the component)
    await expect(page.getByText('Firmware Update v2.1')).toBeVisible();
    await expect(page.getByText('Quarterly Audit')).toBeVisible();
  });
});
