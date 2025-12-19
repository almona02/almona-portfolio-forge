# Debug utils-forms Chunk Issue Guide

**Error:** `utils-forms-CS_oc9He.js:1:1644 Uncaught ReferenceError: Cannot access '_' before initialization`

---

## 🔍 Step-by-Step Debugging

### Step 1: Generate Enhanced Bundle Analysis
```bash
npm run build:analyze
```

This will create:
- `dist/bundle-analysis.html` - Interactive visualization with sourcemaps
- `dist/stats.json` - Programmatic analysis data

---

### Step 2: Run Debug Script
```bash
npm run debug:forms
```

This script will:
- ✅ Find the actual utils-forms chunk file
- ✅ Show the content around line 1644
- ✅ List all form library imports in your codebase
- ✅ Check for circular dependencies
- ✅ Show module breakdown from stats.json

---

### Step 3: Open Bundle Analysis HTML

1. **Open in browser:**
   ```bash
   # Windows
   start dist/bundle-analysis.html
   ```

2. **Search for utils-forms:**
   - Use Ctrl+F to search for "utils-forms"
   - Or search for "react-hook-form" or "formik"

3. **Click on the chunk:**
   - Click the utils-forms rectangle in the treemap
   - This will expand to show all modules inside

4. **Analyze modules:**
   - Look for modules with red edges (circular dependencies)
   - Check module sizes
   - Identify which modules are causing issues

---

### Step 4: Trace the Exact Issue

#### Option A: Check the Built Chunk
```bash
# Find the actual chunk file
ls dist/assets/*utils-forms*.js

# View around line 1644
head -n 1650 dist/assets/*utils-forms*.js | tail -n 20
```

#### Option B: Use Browser DevTools
1. Open the app in browser
2. Open DevTools → Sources tab
3. Find `utils-forms-CS_oc9He.js`
4. Go to line 1644
5. See what's causing the initialization error

---

## 🎯 What to Look For

### Common Causes:

1. **Circular Dependency:**
   - File A imports File B
   - File B imports File A
   - Look for red edges in bundle analysis

2. **Variable Name Conflict:**
   - Variable named `_` being used before initialization
   - Check for underscore imports or variables

3. **Import Order Issue:**
   - Imports happening in wrong order
   - Check import statements in form-related files

4. **Both react-hook-form AND formik:**
   - If both are included, they might conflict
   - Consider using only one

---

## 📊 Bundle Analysis Features

The updated visualizer now shows:
- ✅ **Sourcemaps enabled** - See original file locations
- ✅ **JSON output** - Programmatic analysis via stats.json
- ✅ **Module details** - Click chunks to see all modules
- ✅ **Size breakdown** - Gzip and Brotli sizes
- ✅ **Dependency graph** - Visualize relationships

---

## 🔧 Quick Fixes to Try

### Fix 1: Split Form Libraries
If both react-hook-form and formik are in the same chunk, split them:

```typescript
// In vite.config.ts manualChunks
if (id.includes('react-hook-form')) {
  return 'vendor-react-hook-form';
}
if (id.includes('formik')) {
  return 'vendor-formik';
}
```

### Fix 2: Exclude from Preload
Already done - utils-forms is excluded from module preload.

### Fix 3: Check Import Order
Make sure imports are in correct order in form files.

---

## 📝 Files to Check

Based on the debug script output, check these files:
- Files importing `react-hook-form`
- Files importing `formik`
- Files importing `@hookform/resolvers`
- Files with underscore variables

---

## 🎯 Expected Output from Debug Script

```
✅ Found chunk: utils-forms-CS_oc9He.js
   Size: XXX KB
   Total lines: XXXX

📄 Around line 1644:
   1639: ...
   1640: ...
   1641: ...
   1642: ...
   1643: ...
   1644: ... 👈 ERROR HERE
   1645: ...
   ...

📦 Found X references to: react-hook-form
📦 Found X references to: formik
```

---

**Use the bundle analysis HTML and debug script to trace the exact issue!**

