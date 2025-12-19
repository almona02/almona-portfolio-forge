# Phase 1 Validation Instructions

## Quick Start

1. **Start Dev Server:**
   ```bash
   npm run dev
   ```

2. **Open Browser:**
   Navigate to: http://localhost:3000

3. **Run Console Validation:**
   - Press F12 to open DevTools
   - Go to Console tab
   - Type: `validateAlmonaPerformance()`
   - Press Enter

## Expected Validation Results

### ✅ Optimization Checks
- ✅ Critical CSS Inlined
- ✅ Hero Image High Priority
- ✅ Prefetch Links Present
- ✅ Service Worker Registered
- ✅ Font Preloading
- ✅ Hero Image Preloaded

### 📈 Load Time Metrics (Targets)
- **FCP:** < 1400ms ✅
- **LCP:** < 2400ms ✅
- **TBT:** < 400ms ✅
- **CLS:** < 0.1 ✅

### 🌍 Connection Info
- Effective Type: 4g/3g/wifi
- Downlink: Mbps
- RTT: ms

## Visual Dashboard

The Performance Dashboard appears automatically in development mode (bottom-right corner):
- Real-time FCP/LCP/TBT/CLS metrics
- Color-coded status indicators
- Active optimizations list
- Connection type display

## Service Worker Verification

1. **Chrome DevTools → Application → Service Workers**
   - Should see: `service-worker.js` registered
   - Status: Activated and running
   - Scope: `/`

2. **Cache Storage**
   - Should see: `almona-egypt-v1.0.0-egypt`
   - Verify critical assets are cached

## Network Tab Analysis

1. **Open Network Tab**
2. **Disable cache** (checkbox)
3. **Reload page** (Ctrl+R)
4. **Check for:**
   - Hero image: `fetchpriority="high"` in initiator column
   - Prefetch requests: Type = `prefetch`
   - Critical CSS: Loaded inline (no network request)
   - Fonts: Loading with `font-display: swap`

## Offline Mode Test

1. **Network Tab → Check "Offline"**
2. **Reload page** (Ctrl+R)
3. **Verify:**
   - `offline.html` loads
   - Service worker serves cached content
   - Critical Egypt workflow accessible

## Lighthouse Audit

```bash
# Generate HTML report
npx lighthouse http://localhost:3000 \
  --output=html \
  --output-path=./performance-reports/phase1/lighthouse-report.html

# Generate JSON report
npx lighthouse http://localhost:3000 \
  --output=json \
  --output-path=./performance-reports/phase1/lighthouse-report.json
```

## Success Criteria

### Must Achieve:
- ✅ LCP < 2.4s (from 4.0s)
- ✅ FCP < 1.4s (from 2.0s)
- ✅ TBT < 400ms (from 550ms)
- ✅ CLS < 0.1 (maintain 0.024)
- ✅ Service Worker active
- ✅ Offline capability functional
- ✅ Egypt workflow prefetching working

### Nice to Have:
- ⚡ Repeat visits < 1.0s
- 📱 Mobile performance improved
- 🌍 Works on slow Egyptian connections
- 🔄 Background sync working

## Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Verify `service-worker.js` exists in `public/` folder
- Check registration script in `index.html`

### Prefetch Not Working
- Check Network tab for prefetch requests
- Verify routes are in `EGYPT_WORKFLOW_PATTERNS`
- Check console for prefetch logs

### Performance Dashboard Not Showing
- Verify you're in development mode (`npm run dev`)
- Check browser console for errors
- Component should appear bottom-right

### Validation Function Not Found
- Check `src/utils/performanceValidator.ts` exists
- Verify it's imported in `main.tsx`
- Check browser console for import errors

## Next Steps

After validation:
1. ✅ Document results
2. ✅ Run Lighthouse audit
3. ✅ Test Egypt workflow end-to-end
4. ✅ Prepare deployment checklist
5. ✅ Deploy to staging

