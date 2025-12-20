# 🔧 Fix: "Deprecated API for given entry type" Warning

## Error Message
```
index-CgZcw69h.js:47 Deprecated API for given entry type.
(anonymous) @ index-CgZcw69h.js:47
```

## Root Cause

This warning is typically caused by using **deprecated Performance API entry types** in the browser. Common causes:

1. **PerformanceObserver with deprecated entry types:**
   - `navigation-timing` (deprecated, use `navigation` instead)
   - `resource-timing` (deprecated, use `resource` instead)
   - `paint-timing` (deprecated, use `paint` instead)
   - `mark` or `measure` (deprecated in some contexts)

2. **Performance.getEntriesByType() with deprecated types:**
   - Using old entry type names that are no longer supported

3. **Third-party libraries:**
   - Analytics libraries (Google Analytics, etc.)
   - Performance monitoring tools
   - Browser extensions

## Investigation Steps

### Step 1: Identify the Source

1. **Open Browser DevTools (F12)**
2. **Go to Console tab**
3. **Enable "Show timestamps"** and **"Preserve log"**
4. **Reload the page**
5. **Click on the warning** to see the stack trace
6. **Look for the file name** in the stack trace (e.g., `index-CgZcw69h.js:47`)

### Step 2: Check Your Code

Search for Performance API usage:

```bash
# Search for PerformanceObserver
grep -r "PerformanceObserver" src/

# Search for getEntriesByType
grep -r "getEntriesByType" src/

# Search for performance.measure or performance.mark
grep -r "performance\.(measure|mark)" src/
```

### Step 3: Check Third-Party Libraries

Common culprits:
- **Google Analytics** (gtag.js, analytics.js)
- **Vercel Analytics** (`@vercel/analytics`)
- **Performance monitoring tools** (Sentry, LogRocket, etc.)
- **Browser extensions** (ad blockers, performance tools)

## Common Fixes

### Fix 1: Update PerformanceObserver Entry Types

**Before (Deprecated):**
```typescript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(entry);
  }
});

observer.observe({ entryTypes: ['navigation-timing', 'resource-timing'] });
```

**After (Correct):**
```typescript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(entry);
  }
});

observer.observe({ entryTypes: ['navigation', 'resource'] });
```

### Fix 2: Update getEntriesByType Calls

**Before (Deprecated):**
```typescript
const entries = performance.getEntriesByType('navigation-timing');
```

**After (Correct):**
```typescript
const entries = performance.getEntriesByType('navigation');
```

### Fix 3: Suppress Warning (If from Third-Party)

If the warning is from a third-party library you can't control:

```typescript
// Suppress specific console warnings
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0]?.includes('Deprecated API for given entry type')) {
    return; // Suppress this specific warning
  }
  originalWarn.apply(console, args);
};
```

**⚠️ Note:** Only suppress if you've confirmed it's from a third-party library and doesn't affect functionality.

## Files to Check

Based on the codebase search, check these files:

1. **`src/lib/performance.ts`** - Performance monitoring code
2. **Analytics integration files** - Google Analytics, Vercel Analytics
3. **Service worker files** - PWA service workers may use Performance API
4. **Third-party library imports** - Check node_modules for deprecated APIs

## Quick Fix Script

Add this to your main entry file (`src/main.tsx` or `src/index.tsx`) to identify the source:

```typescript
// Debug: Log Performance API usage
if (typeof window !== 'undefined' && window.performance) {
  const originalObserve = PerformanceObserver.prototype.observe;
  PerformanceObserver.prototype.observe = function(options) {
    console.log('PerformanceObserver.observe called with:', options);
    return originalObserve.call(this, options);
  };
}
```

This will log all PerformanceObserver calls and help identify which code is using deprecated entry types.

## Expected Behavior After Fix

- ✅ No "Deprecated API" warnings in console
- ✅ Performance monitoring still works correctly
- ✅ No impact on application functionality

## If Warning Persists

1. **Check browser console stack trace** - Identify exact file and line
2. **Check network tab** - See if warning comes from external scripts
3. **Disable browser extensions** - Test in incognito mode
4. **Check Vercel Analytics** - May be using deprecated APIs
5. **Update third-party libraries** - Check for newer versions

## Related Issues

- Performance API deprecation: https://developer.mozilla.org/en-US/docs/Web/API/Performance_API
- PerformanceObserver: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver

