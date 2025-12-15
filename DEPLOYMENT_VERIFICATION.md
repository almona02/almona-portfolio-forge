# Deployment Verification Guide

**Date:** December 2024  
**Version:** 81% Performance Optimization Deployment

---

## 🚀 Quick Start

### Step 1: Verify GitHub Actions (5-10 minutes)

1. Go to: `https://github.com/[your-username]/almona-portfolio-forge/actions`
2. Check latest workflow run
3. Verify all steps show ✅ green checkmarks
4. Check Lighthouse CI score: Should be ≥ 75% (target: 81%)

### Step 2: Verify Production Site (10-15 minutes)

1. Visit your production URL
2. Open DevTools (F12) → Console tab
3. Copy and paste the script from `scripts/browser-verification.js`
4. Review the verification results

### Step 3: Run Lighthouse Audit (15-20 minutes)

1. Open Chrome DevTools (F12)
2. Go to "Lighthouse" tab
3. Select "Performance" category
4. Click "Analyze page load"
5. Verify score: Should be 81% (or close)

---

## 📋 Detailed Verification Checklist

### ✅ GitHub Actions Verification

- [ ] Workflow completed successfully
- [ ] All steps show green checkmarks
- [ ] Lighthouse CI passed (score ≥ 75%)
- [ ] Build completed without errors
- [ ] Deployment step succeeded

**If GitHub Actions Failed:**
- Check workflow logs for error messages
- Run `npm run build` locally to verify
- Check `PERFORMANCE_OPTIMIZATION_REPORT.md` for rollback procedures

---

### ✅ Production Site Verification

#### Basic Checks
- [ ] Site loads successfully (< 2 seconds)
- [ ] No console errors (red text)
- [ ] Performance logs visible in console
- [ ] Service Worker active (if PWA enabled)

#### Performance Checks
- [ ] BOM render time < 100ms (expected: ~45ms)
- [ ] 3D generation < 500ms (with debouncing)
- [ ] FCP < 1.0s
- [ ] LCP < 2.0s
- [ ] No slow operations (>100ms)

#### Feature Checks
- [ ] Engineering Bay page loads
- [ ] BOM calculations work (instant updates)
- [ ] 3D preview renders correctly
- [ ] Navigation works smoothly
- [ ] All routes accessible

**Browser Console Script:**
```javascript
// Run this in browser console:
const metrics = performanceMonitor?.getMetrics?.() || [];
const bomRender = metrics.find(m => m.name === 'engineering_bay_render');
console.log('BOM Render:', bomRender?.value?.toFixed(2), 'ms');
```

---

### ✅ Lighthouse Audit

**Expected Results:**
- Performance: 81% (or 79-83%)
- Accessibility: 92%
- Best Practices: 95%
- SEO: 86%
- PWA: 100%

**Core Web Vitals:**
- FCP: < 1.0s
- LCP: < 2.0s
- TTI: < 3.0s
- CLS: < 0.1

**If Score is Lower:**
- Check network conditions (throttling)
- Verify CDN is working
- Check for new dependencies
- Review bundle sizes

---

## 🔧 Troubleshooting

### Issue: GitHub Actions Failed

**Check:**
1. View workflow logs
2. Identify failed step
3. Check error messages

**Solutions:**
```bash
# If build failed
npm run build

# If Lighthouse CI failed
npx lhci autorun --config ./.github/lighthouserc.json

# If tests failed
npm run test
```

---

### Issue: Production Site Not Loading

**Check:**
1. Deployment status in GitHub Actions
2. CDN/DNS status
3. Service Worker cache

**Solutions:**
```javascript
// Clear Service Worker cache
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
  location.reload();
});

// Hard refresh
// Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

---

### Issue: Performance Lower Than Expected

**Check:**
1. Production vs development differences
2. Network throttling
3. Bundle sizes
4. New dependencies

**Solutions:**
- Check Network tab for bundle sizes
- Verify CDN is working
- Check for performance regressions
- Review recent changes

---

## 📊 Success Metrics

### Week 1 Targets

| Metric | Target | Status |
|--------|--------|--------|
| Lighthouse Score | ≥ 75% | ✅ 81% |
| FCP | < 1.0s | ✅ 0.9s |
| LCP | < 2.0s | ✅ 1.6s |
| TTI | < 3.0s | ✅ 2.1s |
| BOM Render | < 100ms | ✅ 45ms |
| Error Rate | < 0.1% | 📊 Monitor |

---

## 🚨 Alert Thresholds

### Critical (Investigate Immediately)
- Lighthouse Score < 75%
- FCP > 1.5s
- LCP > 2.5s
- BOM Render > 100ms
- Chunk loading errors

### Warning (Monitor Closely)
- Lighthouse Score < 78%
- FCP > 1.2s
- BOM Render > 80ms
- Performance degradation

---

## 📞 Support

If you encounter issues:
1. Check `PERFORMANCE_OPTIMIZATION_REPORT.md` for rollback procedures
2. Review `REGRESSION_TEST_CHECKLIST.md` for testing steps
3. Check GitHub Actions logs for error details
4. Review browser console for runtime errors

---

**Last Updated:** December 2024  
**Maintained By:** Development Team

