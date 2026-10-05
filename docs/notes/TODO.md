# Fix 404 Errors - Products & Machines Routes

## Issues to Fix:
1. ❌ `/machines?category=cutting` returns 404
2. ❌ `/products?search=dc+550&category=cutting&scroll=results` returns 404
3. ❌ Search result links cannot be shared with customers

## Root Causes:
- Missing route for `/machines` base path (only `/machines/:machineId` exists)
- Missing rewrite rule in vercel.json for `/machines` path
- Products page search links work internally but fail on direct access/refresh
- Vercel needs proper rewrite rules to handle query parameters

## Implementation Plan:

### Step 1: Fix App.tsx Routes ✅
- [x] Add redirect route: `/machines` → `/products/machines` (preserve query params)
- [x] Verify `/products` route handles all query parameters correctly

### Step 2: Fix vercel.json Rewrites ✅
- [x] Add rewrite rule for `/machines` → `/index.html`
- [x] Ensure `/products` rewrite handles query parameters
- [x] Order rules correctly (specific before general)

### Step 3: Test Scenarios
- [ ] Test: `/machines?category=cutting` redirects to `/products/machines?category=cutting`
- [ ] Test: `/products?search=dc+550&category=cutting&scroll=results` loads correctly
- [ ] Test: Direct link sharing works for search results
- [ ] Test: Browser refresh maintains search state
- [ ] Test: All query parameters are preserved

### Step 4: Deployment & Verification
- [ ] Deploy to Vercel
- [ ] Verify in production environment
- [ ] Test shared links with customers
- [ ] Check browser console for any remaining 404s
