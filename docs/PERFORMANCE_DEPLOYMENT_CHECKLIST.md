# Performance Optimization Deployment Checklist

## Pre-Deployment (30 Minutes)

### ✅ Phase 1: Core Optimizations
- [x] Vite code splitting configured
- [x] Font async loading implemented
- [x] Image dimensions added (width/height)
- [x] Hero animation deferral (1000ms+)
- [x] All linting errors resolved

### ⚠️ Phase 1.5: WebP Conversion (REQUIRED)
- [ ] Convert critical images to WebP
  - [ ] `egyptian-industrial-hero-bg.png` → `.webp`
  - [ ] `hero01 (1).png` → `.webp`
  - [ ] `hero01 (2).png` → `.webp`
  - [ ] `hero01 (3).png` → `.webp`
  - [ ] `hero01 (4).png` → `.webp`
- [ ] Update image src attributes in components
- [ ] Test WebP images load correctly
- [ ] Verify fallback images work

### ⚠️ LCP Element Verification (REQUIRED)
- [ ] Run Chrome DevTools Lighthouse
- [ ] Verify LCP element is `<h1>` or `<img>` (NOT `<canvas>`)
- [ ] Confirm LCP time is < 2.5s
- [ ] Test on slow 3G network
- [ ] Document LCP element in notes

## Deployment Steps

### 1. Local Testing
```bash
# Build and test locally
npm run build
npm run preview

# Run Lighthouse audit
# Chrome DevTools → Lighthouse → Performance
```

### 2. Pre-Deployment Verification
- [ ] All images have dimensions
- [ ] WebP images load correctly
- [ ] No console errors
- [ ] LCP element is correct
- [ ] Performance metrics improved

### 3. Git Commit
```bash
git add .
git commit -m "perf: Phase 1 + WebP optimization

- Add Vite code splitting for better bundle organization
- Implement async font loading
- Add image dimensions to prevent CLS
- Defer hero canvas animations
- Convert images to WebP format
- Expected RES: 50 → 92-98"
```

### 4. Deploy
```bash
git push origin main
# Wait for Vercel deployment
```

## Post-Deployment (48 Hours)

### Immediate (30 minutes after deploy)
- [ ] Check Vercel Speed Insights
- [ ] Verify RES score improved
- [ ] Check LCP time
- [ ] Monitor for errors

### 24 Hours After
- [ ] Review Speed Insights data
- [ ] Check Core Web Vitals in Search Console
- [ ] Monitor user feedback
- [ ] Check conversion rate changes

### 48 Hours After
- [ ] Full performance analysis
- [ ] Compare before/after metrics
- [ ] Document improvements
- [ ] Plan Phase 2 (if needed)

## Success Criteria

### Minimum Acceptable
- ✅ RES Score: 85+ (from 50)
- ✅ LCP: < 3.0s (from 7.6s)
- ✅ CLS: < 0.1 (from 0.36)

### Target (With WebP)
- ✅ RES Score: 90+ (ideally 92-98)
- ✅ LCP: < 2.5s (ideally < 2.0s)
- ✅ CLS: < 0.1 (ideally < 0.05)

## Rollback Plan

If issues occur:
1. Revert WebP changes (keep original images)
2. Keep Phase 1 optimizations (they're safe)
3. Investigate issue
4. Re-deploy with fixes

## Monitoring

### Key Metrics to Watch
- **RES Score**: Should be 90+
- **LCP**: Should be < 2.5s
- **CLS**: Should be < 0.1
- **Conversion Rate**: Should improve
- **Bounce Rate**: Should decrease

### Tools
- Vercel Speed Insights
- Google Search Console (Core Web Vitals)
- Chrome DevTools Lighthouse
- Real User Monitoring (if available)

## Notes

- All Phase 1 changes are backward compatible
- WebP conversion is additive (fallback to original)
- No breaking changes
- Safe to deploy incrementally

## Expected Timeline

```
Day 0:  RES 50  → Deploy Phase 1
Day 1:  RES 85  → Add WebP (Phase 1.5)
Day 1:  RES 92  → Monitor & Verify
Week 1: RES 95  → Stable & Optimized
```

## Questions?

- WebP conversion: See `docs/WEBP_CONVERSION_GUIDE.md`
- LCP verification: See `docs/LCP_VERIFICATION_GUIDE.md`
- Full details: See `docs/PERFORMANCE_OPTIMIZATION_IMPLEMENTATION.md`

