# 🔍 DXF Direct Import Section Not Visible - Fix Guide

## Problem
The "DXF/DWG Direct Import" section (green card) is not visible in the SmartScan tab after deployment.

## Possible Causes

1. **Changes not deployed** - The styling changes haven't been committed/pushed/deployed
2. **Build cache issue** - Vercel is serving a cached version
3. **Component error** - DXFProfileImporter is failing silently
4. **CSS conflict** - Styles are being overridden

## ✅ Solution Steps

### Step 1: Verify Code is Committed

Check if the changes are in your repository:
```bash
git status
git log --oneline -5
```

If changes aren't committed:
```bash
git add src/components/fabricator/ProfileTuningStudio.tsx
git commit -m "Make DXF Direct Import section more prominent"
git push
```

### Step 2: Force Vercel Redeploy

1. **Vercel Dashboard** → Your Project
2. **Deployments** tab
3. Click **⋯** (three dots) on latest deployment
4. Click **Redeploy**
5. **OR** go to **Settings** → **General** → Scroll to bottom → **Clear Build Cache** → Then redeploy

### Step 3: Hard Refresh Browser

After redeploy:
- **Windows/Linux:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`
- **Or:** Open DevTools (F12) → Right-click refresh button → "Empty Cache and Hard Reload"

### Step 4: Check Browser Console

Open DevTools (F12) → Console tab, look for:
- ❌ Errors related to `DXFProfileImporter`
- ❌ `import.meta` errors
- ❌ Module loading errors

### Step 5: Verify Component is Rendering

In DevTools → Elements tab:
1. Search for: `DXF/DWG Direct Import`
2. Check if the element exists in the DOM
3. Check if it has `display: none` or `visibility: hidden` CSS

## 🔧 Manual Check

If the section still doesn't appear, check the Network tab:
1. Open DevTools → Network tab
2. Filter by "JS" or "Chunk"
3. Look for errors loading JavaScript bundles
4. Check if `ProfileTuningStudio` bundle loaded successfully

## 📝 Expected Behavior

After fix, you should see:
1. **Green card** at the top of SmartScan tab
2. Title: "DXF/DWG Direct Import" with green ruler icon
3. Badge: "Recommended for DXF"
4. Description explaining it's for instant parsing
5. File upload area below

## 🚨 If Still Not Visible

1. **Check Vercel Build Logs:**
   - Vercel → Deployments → Latest → Build Logs
   - Look for TypeScript/compilation errors

2. **Check Component Import:**
   - Verify `DXFProfileImporter` is exported correctly
   - Check if there are any circular dependency issues

3. **Temporary Workaround:**
   - Use the SmartScan section for now (it will fail, but you can see the error)
   - Or use System Tuning Studio → Import tab (has DXF import)

## ✅ Quick Test

After redeploy, open browser console and run:
```javascript
// Check if component exists
document.querySelector('[class*="green"]')?.textContent

// Check if DXFProfileImporter is loaded
window.DXFProfileImporter
```

If you see the green card in the DOM but it's not visible, it's a CSS issue. If it's not in the DOM, it's a rendering/component issue.

