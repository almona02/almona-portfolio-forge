# 🔧 Fix: Green Card Not Visible in Preview Build (localhost:4173)

## Problem
Green card (DXF Direct Import) is visible on `localhost:3000` (dev) but **NOT on `localhost:4173`** (preview/production build).

## Root Cause
Tailwind CSS was **purging the green classes** in the production build because:
- Classes like `bg-green-900/20`, `border-green-500/50`, `text-green-400` use opacity modifiers
- Tailwind's content scanner might not detect them properly in production builds
- They weren't in the `safelist`, so they got removed during CSS purging

## ✅ Fix Applied

Added green card classes to `tailwind.config.ts` safelist:

```typescript
safelist: [
  // ... existing classes ...
  // Green card classes for DXF Direct Import (prevent purging in production)
  'bg-green-900/20',
  'bg-green-900/30',
  'border-green-500/50',
  'text-green-400',
  'border-green-500/30',
  'from-green-500/10',
  'to-blue-500/10',
],
```

## 🧪 Testing Steps

1. **Rebuild the project:**
   ```bash
   npm run build
   ```

2. **Start preview server:**
   ```bash
   npm run preview
   ```

3. **Open browser:**
   - Go to: `http://localhost:4173`
   - Navigate to: Profile Tuning Studio → SmartScan tab
   - **Green card should now be visible!** 🟢

4. **Verify:**
   - Green card appears at the top of SmartScan tab
   - Green border and styling are visible
   - "Recommended for DXF" badge is visible

## 📝 Files Changed

- ✅ `tailwind.config.ts` - Added green classes to safelist

## ⚠️ Important Notes

- **Don't commit yet** - Wait for user confirmation after testing
- The safelist ensures these classes are **always included** in the build, even if Tailwind's scanner doesn't detect them
- This is a common issue with Tailwind opacity modifiers (`/20`, `/50`, etc.) in production builds

## 🔍 If Still Not Visible

1. **Hard refresh:** `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. **Clear browser cache:** DevTools (F12) → Application → Clear Storage
3. **Check browser console:** Look for CSS loading errors
4. **Verify build:** Check that `dist/assets/index-*.css` contains the green classes

