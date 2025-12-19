# Bundle Analysis Command - Quick Reference

## 🚀 Generate Bundle Analysis HTML

After removing `dist/bundle-analysis.html`, regenerate it with:

```bash
npm run build:analyze
```

This will:
- ✅ Build the production bundle
- ✅ Generate `dist/bundle-analysis.html` (interactive HTML visualization)
- ✅ Show chunk sizes and dependencies

---

## 📊 Open the Analysis

After building, open the HTML file:

**Windows:**
```bash
start dist/bundle-analysis.html
```

**Mac:**
```bash
open dist/bundle-analysis.html
```

**Linux:**
```bash
xdg-open dist/bundle-analysis.html
```

---

## 🔍 What You'll See

The HTML file contains:
- **Interactive treemap** - Visual representation of bundle sizes
- **Clickable chunks** - Click to see what's inside each chunk
- **Module breakdown** - See all modules and their sizes
- **Dependency graph** - Visual connections between modules

---

## 📝 Quick Commands

### Full workflow:
```bash
# 1. Remove old analysis (optional)
rm dist/bundle-analysis.html

# 2. Generate new analysis
npm run build:analyze

# 3. Open in browser
start dist/bundle-analysis.html
```

### One-liner (Windows):
```bash
npm run build:analyze && start dist/bundle-analysis.html
```

---

## 🎯 Finding Specific Issues

### Search for a module:
1. Open `dist/bundle-analysis.html` in browser
2. Press `Ctrl+F` (or `Cmd+F` on Mac)
3. Search for module name (e.g., "react-hook-form", "utils-forms")
4. Click the result to see the chunk

### Find large chunks:
- Look for large boxes in the treemap
- Click to expand and see what's inside
- Check the size labels

---

## ⚠️ Note

The bundle analysis HTML is **excluded from PWA cache** (it's 5+ MB), so it won't be cached by the service worker.

---

**That's it! Just run `npm run build:analyze` whenever you need to regenerate the analysis.**

