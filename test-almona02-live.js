/**
 * Almona02.com Live Testing Script
 * 
 * This script uses Puppeteer to automate testing of the live site
 * 
 * Prerequisites:
 * npm install puppeteer
 * 
 * Usage:
 * node test-almona02-live.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  url: 'https://almona02.com',
  credentials: {
    email: 'almona.co@hotmail.com',
    password: 'abcd1234'
  },
  windows: [
    { width: 800, height: 1200, type: 'Small Window' },
    { width: 1500, height: 1800, type: 'Medium Window' },
    { width: 2400, height: 2100, type: 'Large Window' }
  ],
  screenshotDir: './test-screenshots',
  timeout: 30000
};

// Create screenshots directory
if (!fs.existsSync(CONFIG.screenshotDir)) {
  fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
}

// Utility function to take screenshot
async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}_${name}.png`;
  const filepath = path.join(CONFIG.screenshotDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot saved: ${filename}`);
  return filepath;
}

// Utility function to wait and log
async function waitAndLog(page, message, ms = 2000) {
  console.log(`⏳ ${message}`);
  await page.waitForTimeout(ms);
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Almona02.com Live Testing...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless mode
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--start-maximized']
  });

  const page = await browser.newPage();
  
  // Enable console logging from the page
  page.on('console', msg => console.log('🌐 PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.error('❌ PAGE ERROR:', error.message));

  const testResults = {
    timestamp: new Date().toISOString(),
    tests: [],
    screenshots: [],
    errors: []
  };

  try {
    // ============================================
    // TEST 1: Navigate to Site
    // ============================================
    console.log('\n📋 TEST 1: Navigate to Site');
    await page.goto(CONFIG.url, { waitUntil: 'networkidle2', timeout: CONFIG.timeout });
    await waitAndLog(page, 'Page loaded', 2000);
    testResults.screenshots.push(await takeScreenshot(page, '01_homepage'));
    testResults.tests.push({ name: 'Navigate to Site', status: 'PASS' });

    // ============================================
    // TEST 2: Login
    // ============================================
    console.log('\n📋 TEST 2: Login');
    
    // Try to find login form - adjust selectors based on actual site
    const loginSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email" i]',
      '#email',
      '.email-input'
    ];

    let emailInput = null;
    for (const selector of loginSelectors) {
      try {
        emailInput = await page.$(selector);
        if (emailInput) {
          console.log(`✅ Found email input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!emailInput) {
      console.log('⚠️  Could not find email input. Taking screenshot for manual inspection.');
      testResults.screenshots.push(await takeScreenshot(page, '02_login_page_inspection'));
      testResults.errors.push('Email input not found - manual inspection needed');
    } else {
      // Enter credentials
      await page.type('input[type="email"], input[name="email"]', CONFIG.credentials.email);
      await waitAndLog(page, 'Email entered', 1000);

      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        '#password',
        '.password-input'
      ];

      for (const selector of passwordSelectors) {
        try {
          const passwordInput = await page.$(selector);
          if (passwordInput) {
            await page.type(selector, CONFIG.credentials.password);
            console.log('✅ Password entered');
            break;
          }
        } catch (e) {
          continue;
        }
      }

      await waitAndLog(page, 'Credentials entered', 1000);
      testResults.screenshots.push(await takeScreenshot(page, '02_login_filled'));

      // Click login button
      const loginButtonSelectors = [
        'button[type="submit"]',
        'button:has-text("Login")',
        'button:has-text("Sign In")',
        '.login-button',
        '#login-button'
      ];

      for (const selector of loginButtonSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            await button.click();
            console.log('✅ Login button clicked');
            break;
          }
        } catch (e) {
          continue;
        }
      }

      await waitAndLog(page, 'Waiting for login to complete', 3000);
      testResults.screenshots.push(await takeScreenshot(page, '03_after_login'));
      testResults.tests.push({ name: 'Login', status: 'PASS' });
    }

    // ============================================
    // TEST 3: Create New Project
    // ============================================
    console.log('\n📋 TEST 3: Create New Project');
    
    // Look for "New Project" or "Create Project" button
    const newProjectSelectors = [
      'button:has-text("New Project")',
      'button:has-text("Create Project")',
      'a:has-text("New Project")',
      '.new-project-button',
      '#new-project'
    ];

    let projectCreated = false;
    for (const selector of newProjectSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          console.log('✅ New Project button clicked');
          await waitAndLog(page, 'Waiting for project form', 2000);
          testResults.screenshots.push(await takeScreenshot(page, '04_new_project_form'));
          projectCreated = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!projectCreated) {
      console.log('⚠️  Could not find New Project button. Taking screenshot.');
      testResults.screenshots.push(await takeScreenshot(page, '04_dashboard_inspection'));
      testResults.errors.push('New Project button not found');
    } else {
      // Fill project details
      const projectName = `Test_CutList_${new Date().toISOString().split('T')[0]}`;
      
      try {
        await page.type('input[name="name"], input[placeholder*="name" i]', projectName);
        await page.type('input[name="client"], input[placeholder*="client" i]', 'Test Client');
        console.log('✅ Project details entered');
        
        await waitAndLog(page, 'Project form filled', 1000);
        testResults.screenshots.push(await takeScreenshot(page, '05_project_form_filled'));

        // Submit form
        await page.click('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
        await waitAndLog(page, 'Project created', 3000);
        testResults.screenshots.push(await takeScreenshot(page, '06_project_created'));
        testResults.tests.push({ name: 'Create Project', status: 'PASS' });
      } catch (e) {
        console.error('❌ Error filling project form:', e.message);
        testResults.errors.push(`Project form error: ${e.message}`);
      }
    }

    // ============================================
    // TEST 4-6: Add Windows
    // ============================================
    for (let i = 0; i < CONFIG.windows.length; i++) {
      const window = CONFIG.windows[i];
      console.log(`\n📋 TEST ${4 + i}: Add ${window.type} (${window.width}x${window.height})`);

      try {
        // Look for "Add Window" or similar button
        const addWindowSelectors = [
          'button:has-text("Add Window")',
          'button:has-text("New Window")',
          '.add-window-button',
          '#add-window'
        ];

        for (const selector of addWindowSelectors) {
          try {
            const button = await page.$(selector);
            if (button) {
              await button.click();
              console.log('✅ Add Window button clicked');
              break;
            }
          } catch (e) {
            continue;
          }
        }

        await waitAndLog(page, 'Window form opened', 2000);
        testResults.screenshots.push(await takeScreenshot(page, `07_window${i + 1}_form`));

        // Enter window dimensions
        const widthSelectors = ['input[name="width"]', 'input[placeholder*="width" i]', '#width'];
        const heightSelectors = ['input[name="height"]', 'input[placeholder*="height" i]', '#height'];

        for (const selector of widthSelectors) {
          try {
            const input = await page.$(selector);
            if (input) {
              await page.type(selector, window.width.toString());
              console.log(`✅ Width entered: ${window.width}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }

        for (const selector of heightSelectors) {
          try {
            const input = await page.$(selector);
            if (input) {
              await page.type(selector, window.height.toString());
              console.log(`✅ Height entered: ${window.height}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }

        await waitAndLog(page, 'Window dimensions entered', 1000);
        testResults.screenshots.push(await takeScreenshot(page, `08_window${i + 1}_filled`));

        // Save window
        await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Add")');
        await waitAndLog(page, 'Window saved', 2000);
        testResults.screenshots.push(await takeScreenshot(page, `09_window${i + 1}_saved`));
        
        testResults.tests.push({ 
          name: `Add ${window.type}`, 
          status: 'PASS',
          details: `${window.width}x${window.height}mm`
        });
      } catch (e) {
        console.error(`❌ Error adding ${window.type}:`, e.message);
        testResults.errors.push(`Window ${i + 1} error: ${e.message}`);
        testResults.tests.push({ name: `Add ${window.type}`, status: 'FAIL' });
      }
    }

    // ============================================
    // TEST 7: Generate Cut List
    // ============================================
    console.log('\n📋 TEST 7: Generate Cut List');

    try {
      const cutListSelectors = [
        'button:has-text("Generate Cut List")',
        'button:has-text("Cut List")',
        'button:has-text("Optimization")',
        '.generate-cutlist-button',
        '#generate-cutlist'
      ];

      for (const selector of cutListSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            await button.click();
            console.log('✅ Generate Cut List button clicked');
            break;
          }
        } catch (e) {
          continue;
        }
      }

      await waitAndLog(page, 'Generating cut list...', 5000);
      testResults.screenshots.push(await takeScreenshot(page, '10_cutlist_generated'));
      testResults.tests.push({ name: 'Generate Cut List', status: 'PASS' });

      // Extract cut list data from page
      const cutListData = await page.evaluate(() => {
        const data = {
          windows: [],
          totalMaterial: null,
          wastePercentage: null,
          profiles: []
        };

        // Try to extract data from tables or lists
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) {
              data.windows.push(Array.from(cells).map(cell => cell.textContent.trim()));
            }
          });
        });

        return data;
      });

      console.log('📊 Cut List Data:', JSON.stringify(cutListData, null, 2));
      testResults.cutListData = cutListData;

    } catch (e) {
      console.error('❌ Error generating cut list:', e.message);
      testResults.errors.push(`Cut list generation error: ${e.message}`);
      testResults.tests.push({ name: 'Generate Cut List', status: 'FAIL' });
    }

    // ============================================
    // TEST 8: Download Output Files
    // ============================================
    console.log('\n📋 TEST 8: Download Output Files');

    try {
      // Set download path
      const downloadPath = path.join(__dirname, 'test-downloads');
      if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
      }

      await page._client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath
      });

      // Try to download PDF
      const pdfSelectors = [
        'button:has-text("Download PDF")',
        'button:has-text("Export PDF")',
        'a:has-text("PDF")',
        '.download-pdf-button'
      ];

      for (const selector of pdfSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            await button.click();
            console.log('✅ PDF download initiated');
            await waitAndLog(page, 'Downloading PDF...', 3000);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Try to download Excel
      const excelSelectors = [
        'button:has-text("Download Excel")',
        'button:has-text("Export Excel")',
        'a:has-text("Excel")',
        '.download-excel-button'
      ];

      for (const selector of excelSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            await button.click();
            console.log('✅ Excel download initiated');
            await waitAndLog(page, 'Downloading Excel...', 3000);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      testResults.screenshots.push(await takeScreenshot(page, '11_downloads_complete'));
      testResults.tests.push({ name: 'Download Output Files', status: 'PASS' });

      // Check downloaded files
      const files = fs.readdirSync(downloadPath);
      console.log('📁 Downloaded files:', files);
      testResults.downloadedFiles = files;

    } catch (e) {
      console.error('❌ Error downloading files:', e.message);
      testResults.errors.push(`Download error: ${e.message}`);
      testResults.tests.push({ name: 'Download Output Files', status: 'FAIL' });
    }

    // ============================================
    // Final Screenshot
    // ============================================
    await waitAndLog(page, 'Taking final screenshot', 2000);
    testResults.screenshots.push(await takeScreenshot(page, '12_final_state'));

  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    testResults.errors.push(`Critical error: ${error.message}`);
    await takeScreenshot(page, 'ERROR_critical');
  } finally {
    // ============================================
    // Generate Test Report
    // ============================================
    console.log('\n📊 Generating Test Report...');
    
    const report = {
      ...testResults,
      summary: {
        total: testResults.tests.length,
        passed: testResults.tests.filter(t => t.status === 'PASS').length,
        failed: testResults.tests.filter(t => t.status === 'FAIL').length,
        errors: testResults.errors.length
      }
    };

    const reportPath = path.join(__dirname, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`✅ Test report saved: ${reportPath}`);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${report.summary.total}`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`⚠️  Errors: ${report.summary.errors}`);
    console.log('='.repeat(60));

    if (report.summary.errors > 0) {
      console.log('\n⚠️  ERRORS ENCOUNTERED:');
      report.errors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
    }

    console.log(`\n📸 Screenshots saved in: ${CONFIG.screenshotDir}`);
    console.log(`📁 Downloads saved in: ./test-downloads`);
    console.log(`📄 Full report: ${reportPath}`);

    await browser.close();
    console.log('\n✅ Testing complete!');
  }
}

// Run tests
runTests().catch(console.error);
