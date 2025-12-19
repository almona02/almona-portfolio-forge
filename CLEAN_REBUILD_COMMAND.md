# Clean Rebuild Command - Quick Reference

## 🚀 Fix 404 Chunk Errors

When you see 404 errors for chunks (like `index-C1_x3mNP.js`, `utils-vendor-B4OsNqDg.js`), it means the HTML references old chunk names that don't exist.

**Solution: Clean rebuild**

```bash
rm -rf dist node_modules/.vite .vite && npm run build
```

This will:
1. ✅ Remove old build artifacts
2. ✅ Clear Vite cache
3. ✅ Rebuild with current chunk names
4. ✅ Generate fresh HTML with correct chunk references

---

## 📝 When to Use

Use this command when:
- ❌ Seeing 404 errors for chunks
- ❌ Chunk names don't match between HTML and actual files
- ❌ After changing `manualChunks` in `vite.config.ts`
- ❌ After updating chunk splitting strategy
- ❌ Preview shows blank page with console errors

---

## 🔍 Verify It Worked

After rebuilding, check:

```bash
# 1. Check HTML references
grep -o 'src="[^"]*\.js"' dist/index.html | head -5

# 2. Check actual chunks exist
ls dist/assets/index-*.js dist/assets/vendor-*.js | head -10

# 3. The names should match!
```

---

## 🎯 One-Liner (Windows)

```bash
rm -rf dist node_modules/.vite .vite && npm run build && npm run preview
```

---

**That's it! Just run the clean rebuild command whenever chunks don't match.**

