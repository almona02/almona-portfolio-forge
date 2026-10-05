# Vercel Deployment Fixes – February 2026

**Status**: ✅ vendor-3d crash fixed | ⚠️ manifest 401 requires Vercel dashboard change

---

## Issue 1: `vendor-3d` ReferenceError (FIXED)

**Error**: `Uncaught ReferenceError: Cannot access 'X3' before initialization`

**Cause**: Splitting Three.js + @react-three/fiber into a separate `vendor-3d` chunk caused a temporal dead zone (TDZ) / circular dependency in production.

**Fix**: Merged 3D libraries into `react-vendor` by removing the `vendor-3d` `manualChunks` rule in `vite.config.ts`. Same pattern as `DEPLOYMENT_FIX_COMPLETE.md` for the ml-vendor fix.

**Result**: Build succeeds. No more `vendor-3d` chunk; Three.js/R3F/drei are in `react-vendor`.

---

## Issue 2: `manifest.webmanifest` 401 (Unauthorized)

**Error**: `GET https://...vercel.app/manifest.webmanifest 401 (Unauthorized)`

**Cause**: Vercel Deployment Protection blocks unauthenticated requests on preview deployments. When enabled, static assets (including `manifest.webmanifest`) return 401 for users who are not logged into Vercel.

**Resolution** (Vercel dashboard):

1. Open your project on [vercel.com](https://vercel.com).
2. Go to **Settings → Deployment Protection**.
3. Either:
   - **Disable protection** for preview deployments so the site is publicly accessible, or
   - **Use your production domain** (e.g. `www.almona02.com`) for public access; production is usually not protected.

**Note**: Deployment Protection Exceptions (e.g. exempting specific paths) are available on Pro/Enterprise plans. On the free tier, disabling protection for previews or using the production domain is the typical approach.

---

## Verification

After deploying:

1. `npm run build` – should complete without errors.
2. Push to GitHub – Vercel should deploy successfully.
3. Open the production URL – app should load without console errors.
4. If using preview URLs, ensure Deployment Protection is off or use the production deployment.
