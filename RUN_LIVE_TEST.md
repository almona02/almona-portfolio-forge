# How to Run Live Testing for Almona02.com

## Quick Start

Since the Blackbox AI browser tool is disabled, I've created an automated Puppeteer script that you can run locally to test your live site.

### Step 1: Install Puppeteer

Open your terminal in this directory and run:

```bash
npm install puppeteer
```

### Step 2: Run the Test Script

```bash
node test-almona02-live.js
```

Or if you prefer headless mode (no visible browser):

```bash
node test-almona02-live.js --headless
```

## What the Script Does

The automated test script will:

1. ✅ **Launch Chrome browser** and navigate to https://almona02.com
2. ✅ **Login** using credentials: almona.co@hotmail.com / abcd1234
3. ✅ **Create a new project** with test data
4. ✅ **Add 3 windows** with different sizes:
   - Small: 800mm x 1200mm
   - Medium: 1500mm x 1800mm
   - Large: 2400mm x 2100mm
5. ✅ **Generate cut list** and optimization
6. ✅ **Download output files** (PDF, Excel, etc.)
7. ✅ **Take screenshots** at each step
8. ✅ **Generate test report** with results

## Output Files

After running the test, you'll find:

### 📸 Screenshots
Location: `./test-screenshots/`
- All major steps captured with timestamps
- Useful for debugging and verification

### 📁 Downloads
Location: `./test-downloads/`
- PDF cut list
- Excel/CSV files
- Any other exported files

### 📄 Test Report
Location: `./test-report.json`
- Complete test results
- Pass/fail status for each test
- Error messages if any
- Cut list data extracted from the page

## Test Results Format

The test report includes:

```json
{
  "timestamp": "2026-02-03T...",
  "tests": [
    {
      "name": "Navigate to Site",
      "status": "PASS"
    },
    {
      "name": "Login",
      "status": "PASS"
    },
    {
      "name": "Add Small Window",
      "status": "PASS",
      "details": "800x1200mm"
    }
    // ... more tests
  ],
  "screenshots": ["01_homepage.png", "02_login_filled.png", ...],
  "downloadedFiles": ["cutlist.pdf", "cutlist.xlsx", ...],
  "errors": [],
  "cutListData": {
    "windows": [...],
    "totalMaterial": "...",
    "wastePercentage": "..."
  },
  "summary": {
    "total": 8,
    "passed": 8,
    "failed": 0,
    "errors": 0
  }
}
```

## Customization

You can modify the test script to:

### Change Window Sizes
Edit the `CONFIG.windows` array in `test-almona02-live.js`:

```javascript
windows: [
  { width: 1000, height: 1500, type: 'Custom Window 1' },
  { width: 2000, height: 2000, type: 'Custom Window 2' },
  // Add more windows...
]
```

### Adjust Timeouts
If the site is slow, increase timeouts:

```javascript
timeout: 60000  // 60 seconds instead of 30
```

### Change Screenshot Directory
```javascript
screenshotDir: './my-screenshots'
```

## Troubleshooting

### Issue: Puppeteer Installation Fails

**Solution:**
```bash
# Try with legacy peer deps
npm install puppeteer --legacy-peer-deps

# Or use specific version
npm install puppeteer@21.0.0
```

### Issue: Script Can't Find Elements

**Cause:** The selectors in the script might not match your actual site structure.

**Solution:**
1. Run the script once to get screenshots
2. Check the screenshots to see the actual page structure
3. Update the selectors in the script to match your site

Example selectors to update:
```javascript
// Email input
'input[type="email"]'  // Change to match your site

// Login button
'button[type="submit"]'  // Change to match your site

// New Project button
'button:has-text("New Project")'  // Change to match your site
```

### Issue: Downloads Don't Work

**Solution:**
The script sets up a download directory automatically. If downloads fail:
1. Check browser console for errors
2. Verify the download buttons are being clicked (check screenshots)
3. Manually test downloads in the browser

### Issue: Test Runs Too Fast

**Solution:**
Increase wait times in the script:
```javascript
await waitAndLog(page, 'Message', 5000);  // Wait 5 seconds instead of 2
```

## Manual Testing Alternative

If the automated script doesn't work for your site structure, use the comprehensive manual testing guide:

📄 **ALMONA02_LIVE_TESTING_GUIDE.md**

This guide provides:
- Step-by-step manual testing procedures
- Detailed checklists
- Expected results for each step
- Verification points for cut list optimization

## Verifying Cut List Optimization

### Expected Calculations

**Window 1 (800 x 1200mm):**
- Perimeter: 4,000mm

**Window 2 (1500 x 1800mm):**
- Perimeter: 6,600mm

**Window 3 (2400 x 2100mm):**
- Perimeter: 9,000mm

**Total Material Needed: 19,600mm**

### Good Optimization Indicators

✅ **Waste < 15%** - Excellent optimization
⚠️ **Waste 15-20%** - Acceptable optimization
❌ **Waste > 20%** - Poor optimization, needs improvement

### Check These in Output Files

1. **PDF Report:**
   - All 3 windows listed with correct dimensions
   - Material quantities calculated
   - Cutting patterns shown
   - Waste percentage displayed

2. **Excel File:**
   - Each window as separate row
   - Dimensions match input
   - Formulas calculate correctly
   - Totals sum properly

3. **Optimization Quality:**
   - Smart grouping of similar cuts
   - Minimal waste per profile
   - Efficient use of standard lengths
   - Clear cutting sequence

## Next Steps After Testing

1. **Review test-report.json** for overall results
2. **Check screenshots** to verify UI/UX
3. **Examine downloaded files** for accuracy
4. **Compare calculations** with expected values
5. **Document any issues** found
6. **Re-run tests** after fixes

## Support

If you encounter issues:
1. Check the screenshots in `./test-screenshots/`
2. Review the test report in `./test-report.json`
3. Look for error messages in the console output
4. Verify the site is accessible at https://almona02.com
5. Ensure credentials are correct

## Advanced Usage

### Run Specific Tests Only

Modify the script to comment out tests you don't need:

```javascript
// Comment out tests you want to skip
// await runLoginTest();
await runProjectCreationTest();
await runWindowDrawingTests();
// await runCutListTest();
```

### Parallel Testing

To test multiple scenarios simultaneously, create multiple test scripts with different configurations.

### Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/live-test.yml
name: Live Site Testing
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install puppeteer
      - run: node test-almona02-live.js
      - uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: |
            test-screenshots/
            test-report.json
```

---

## Summary

You now have two options for testing:

1. **Automated Testing** (Recommended)
   - Run: `node test-almona02-live.js`
   - Fast, repeatable, generates reports
   - Best for regression testing

2. **Manual Testing**
   - Follow: `ALMONA02_LIVE_TESTING_GUIDE.md`
   - More thorough, catches UX issues
   - Best for exploratory testing

Both approaches will verify:
- ✅ Login functionality
- ✅ Project creation
- ✅ Window drawing (3 different sizes)
- ✅ Cut list optimization
- ✅ Output file generation
- ✅ Data accuracy

Good luck with your testing! 🚀
