# Performance & UX Enhancement Testing Guide

## Phase 1: Performance Monitoring Testing

### 1. Test Performance Metrics

```bash
npm run dev
```

1. Navigate to `/fabricator-workflow` in your browser
2. Open browser DevTools Console (F12)
3. Look for performance logs:
   - `[Performance] Fabricator load tracking started`
   - `[Performance] Fabricator load time: XXXms`
   - `[Performance] Bundle loaded: ...`
   - `[Performance] Bundle Summary: ...`

4. Check for performance budget warnings:
   - Should see warnings if load time > 3000ms
   - Should see warnings if bundle size > 200KB

### 2. Test Workspace Operations Tracking

1. In Fabricator workflow, perform these actions:
   - Load inventory (check console for `inventory-load` timing)
   - Generate cutting plan (check console for `optimization` timing)
   - Create a new project (check console for `project-load` timing)

2. Expected console output:
   ```
   [Performance] inventory-load took XXXms
   [Performance] optimization took XXXms
   ```

## Phase 2: Bundle Optimization Testing

### 1. Build and Analyze Bundle

```bash
# Build with analysis
ANALYZE=true npm run build

# Or use the analyze script
npm run analyze
```

### 2. Check Bundle Analysis

1. After build, check `dist/stats.json` for bundle breakdown
2. Verify chunk sizes:
   - `fabricator-core` chunk should be separate
   - `fabricator-algorithms` chunk should be separate
   - Vendor chunks should be properly split

3. Expected results:
   - Initial bundle < 200KB (after optimization)
   - Fabricator chunks loaded on-demand
   - Better caching with separated vendor chunks

### 3. Test Chunk Loading

1. Open browser DevTools → Network tab
2. Navigate to `/fabricator-workflow`
3. Check that:
   - Initial page load doesn't include all Fabricator chunks
   - Chunks load on-demand when tabs are opened
   - Chunk filenames include hashes for cache busting

## Phase 3: Image Optimization Testing

### 1. Test OptimizedImage Component

Components updated to use `OptimizedImage`:
- ✅ `src/shared/ui/ui/ProductCard.tsx` (updated)
- ✅ `src/components/shop/IndustrialProductCard.tsx` (uses EnhancedImage - can be updated)

### 2. Visual Testing

1. Navigate to `/shop` or product pages
2. Open DevTools → Network tab
3. Filter by "Img" or "Image"
4. Check that:
   - Images load with WebP format when supported
   - Responsive srcSet is used
   - Lazy loading works (images load as you scroll)

### 3. Performance Testing

1. Use Lighthouse (Chrome DevTools):
   ```bash
   npm run performance:audit
   ```
   Or manually:
   - Open DevTools → Lighthouse tab
   - Run audit on product pages
   - Check "Image Optimization" recommendations

2. Expected improvements:
   - Better image format scores
   - Reduced image transfer sizes
   - Faster page load times

## Phase 4: Auto-Save Testing

### 1. Test Debounced Auto-Save

1. Navigate to `/fabricator` (FabricatorWorkspaceLayout)
2. Make changes to workspace (e.g., switch tabs, create project, add components)
3. Check console for:
   - No immediate saves (should wait 3 seconds)
   - `[WorkspaceSync]` logs after debounce period

### 2. Test Auto-Save Indicator

1. Navigate to `/fabricator` workspace
2. Look for AutoSaveIndicator in the header (top right area)
3. Test different states:
   - **"Saving..."** - Make a change and wait (should appear during 3-second debounce)
   - **"Saved X ago"** - After save completes (green checkmark)
   - **"Unsaved changes"** - Make a change and check immediately (orange warning)
   - **"Save Now" button** - Click to manually trigger save

### 3. Test Error Recovery

1. Disconnect network (or block Supabase in DevTools)
2. Make workspace changes
3. Check that:
   - Falls back to localStorage
   - Shows appropriate error messages in console
   - Data persists after page reload
   - AutoSaveIndicator shows fallback status

### 4. Test Before-Unload Warning

1. Make changes to workspace (should show "Unsaved changes")
2. Try to navigate away or close tab
3. Browser should show warning: "You have unsaved changes. Are you sure you want to leave?"

## Quick Test Checklist

- [ ] Performance metrics appear in console
- [ ] Bundle chunks are properly split
- [ ] Images use WebP/AVIF when supported
- [ ] Auto-save works with 3-second debounce
- [ ] Error recovery works (localStorage fallback)
- [ ] No console errors
- [ ] Lighthouse scores improved

## Troubleshooting

### Performance metrics not showing?
- Check that `initializePerformanceMonitoring()` is called in `main.tsx`
- Verify `trackFabricatorLoadTime()` is called in FabricatorWorkflow

### Bundle analysis not working?
- Ensure `ANALYZE=true` is set before build
- Check `dist/stats.json` exists after build

### Images not optimizing?
- Verify Supabase Storage URLs are being used
- Check browser supports WebP/AVIF
- Verify `OptimizedImage` component is imported correctly

### Auto-save not working?
- Check console for WorkspaceSyncService errors
- Verify Supabase connection
- Check localStorage is available

