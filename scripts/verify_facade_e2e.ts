
import fs from 'fs';
import { chromium } from 'playwright';

async function run() {
  console.log('🚀 Starting Facade E2E Verification (Chrome)...');
  
  // Launch Chrome (requires Chrome to be installed on host)
  // Fallback to bundled chromium if chrome channel fails
  let browser;
  try {
      console.log('Attempting to launch Google Chrome...');
      browser = await chromium.launch({ channel: 'chrome', headless: false });
  } catch (e) {
      console.log('Chrome launch failed, falling back to Chromium...');
      browser = await chromium.launch({ headless: false });
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Login
    console.log('📍 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { timeout: 30000 });
    
    console.log('🔑 Logging in...');
    
    // Check if we are already logged in (look for dashboard or user icon)
    // Wait for initial loading screen to disappear
    console.log('⏳ Waiting for application to load...');
    try {
      await page.waitForSelector('.loading-screen', { state: 'detached', timeout: 15000 });
    } catch (e) {
      console.log('⚠️ Loading screen did not detach or was not found. Proceeding...');
    }

    // Check if we are already logged in (look for dashboard or user icon)
    const dashboardCheck = page.locator('text=Dashboard').first();
    let isLoggedIn = false;

    if (await dashboardCheck.isVisible()) {
         console.log('ℹ️ Already logged in. Proceeding...');
         isLoggedIn = true;
    } else {
        // User Guidance: "Login button on the top navbar, right side"
        const loginLink = page.locator('a[href="/login"]').first();
        
        if (await loginLink.isVisible()) {
             console.log('✅ Found login link.');
             await loginLink.click();
        } else {
             // Fallback
             const btn = page.locator('button:has-text("Login")').first();
             if (await btn.isVisible()) {
                 await btn.click();
             } else {
                 console.log('⚠️ Specific login button not found.');
             }
        }
    }
        
    // Wait for hydration if needed
    await page.waitForTimeout(2000);
    
    // Final check if we are on login page or logged in
    if (!isLoggedIn) {
        if (page.url().includes('/login')) {
             console.log('✅ Navigated to login page.');
             
            // Fill form
            await page.waitForSelector('input[type="email"]', { timeout: 10000 });
            await page.fill('input[type="email"]', 'almona.co@hotmail.com');
            await page.fill('input[type="password"]', 'abcd1234');
            
            // Submit
            const submitBtn = page.locator('button[type="submit"]').first();
            if (await submitBtn.isVisible()) {
                await submitBtn.click();
            } else {
                await page.keyboard.press('Enter');
            }

            // Wait for login to complete
            await page.waitForLoadState('networkidle');
        } else if (await page.locator('text=Dashboard').isVisible()) {
             console.log('ℹ️ Already logged in.');
        } else {
             console.log('⚠️ Could not navigate to login. Dumping HTML...');
             const html = await page.content();
             fs.writeFileSync('debug_layout.html', html);
             console.log('📝 HTML dumped to debug_layout.html');
        }
    }

    console.log('✅ Login Sequence Complete. Waiting for Dashboard...');
    await page.waitForTimeout(5000); // Give React time to hydrate

    // 2. Dashboard & Project
    console.log('📂 Creating Test Project...');
    
    // Check if we are on dashboard
    if (await page.getByText('New Project').isVisible()) {
        const newProjectBtn = page.getByText('New Project').first();
        await newProjectBtn.click();
        
        // Fill Project Dialog
        await page.waitForSelector('input', { timeout: 5000 });
        // Assume first input is name
        await page.locator('input').first().fill('Chrome E2E Test');
        
        // Find Create button (usually inside a dialog footer)
        const createBtn = page.locator('button:has-text("Create")').first();
        if (await createBtn.isVisible()) await createBtn.click();
        
        console.log('✅ Project Creation Triggered.');
    } else {
        console.log('ℹ️ "New Project" button not found. Maybe already in a project?');
    }
    
    await page.waitForTimeout(3000);

    // 3. Facade Mode
    console.log('🏗️ Switching to Facade Mode...');
    
    // Try to find the mode switcher. It might be a tab or a button.
    // Based on code: Button variant 'ghost' or 'secondary'
    const facadeBtn = page.locator('button:has-text("Curtain Wall")').first();
    const facadeBtn2 = page.locator('button:has-text("Facade")').first();
    
    if (await facadeBtn.isVisible()) {
        await facadeBtn.click();
        console.log('✅ Switched to Curtain Wall Mode.');
    } else if (await facadeBtn2.isVisible()) {
        await facadeBtn2.click();
         console.log('✅ Switched to Facade Mode (Alt text).');
    } else {
         console.warn('⚠️ Facade Mode toggle not found!');
    }
    
    await page.waitForTimeout(2000);
    
    // Verify Dimensions inputs exist
    const widthInput = page.locator('input[type="number"]').first();
    if (await widthInput.isVisible()) {
        console.log('✅ Found Dimension Inputs. Setting 4000x3000...');
        await widthInput.fill('4000');
        // Assume height is next or nearby. 
        // This is a rough check, mainly ensuring the UI is interactive.
    }

    // 4. Report Generation
    console.log('📄 Generating Facade Report...');
    const reportBtn = page.locator('button:has-text("Generate Facade Report")');
    
    if (await reportBtn.isVisible()) {
        const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
        await reportBtn.click();
        const download = await downloadPromise;
        console.log(`✅ Download Started: ${download.suggestedFilename()}`);
        console.log('🎉 E2E TEST PASSED: Report generated successfully.');
    } else {
        console.warn('⚠️ "Generate Facade Report" button not visible.');
    }

  } catch (error) {
    console.error('❌ E2E TEST FAILED:', error);
    // Take a screenshot on failure
    await page.screenshot({ path: 'e2e_failure.png' });
    console.log('📸 Failure screenshot saved to e2e_failure.png');
    
    // Also dump HTML
    const html = await page.content();
    fs.writeFileSync('e2e_failure.html', html);
    console.log('📝 Failure HTML saved to e2e_failure.html');
    
  } finally {
    console.log('🛑 Closing Browser in 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

run();
