# Drafting Area Size Fix - canvasHeight Issue

**Date:** January 2026  
**Issue:** `canvasHeight={2000}` is incorrect - should be smaller than width

---

## 🔍 Problem Identified

In `DraftingWorkbench.tsx`, the hardcoded canvas dimensions are:
```tsx
canvasWidth={1000}
canvasHeight={2000}  // ❌ INCORRECT - Height is larger than width!
```

**The issue:** Canvas height (2000) is **double** the width (1000), which is incorrect for typical screen layouts.

---

## 📐 Correct Aspect Ratio

For typical desktop/laptop screens:
- **Aspect Ratio**: ~16:9 or ~16:10 (wider than tall)
- **Width should be larger than height**
- Examples:
  - 1920×1080 (Full HD) → Width > Height
  - 1366×768 (Laptop) → Width > Height
  - 3840×2160 (4K) → Width > Height

### Current Values (INCORRECT)
- Width: 1000px
- Height: 2000px
- Ratio: 1:2 (portrait orientation - wrong for drafting)

### Should Be (CORRECT)
- Width: 2000px (or similar)
- Height: 1000px (or similar)
- Ratio: ~2:1 (landscape orientation - correct for drafting)

---

## 🔧 Locations to Fix

### 1. ViewportControls Component (Line 902-903)
```tsx
// ❌ CURRENT (INCORRECT)
<ViewportControls
  canvasWidth={1000}
  canvasHeight={2000}  // Wrong - too large
/>

// ✅ SHOULD BE
<ViewportControls
  canvasWidth={2000}
  canvasHeight={1000}  // Correct - landscape orientation
/>
```

### 2. getViewportPreset Call (Line 912-913)
```tsx
// ❌ CURRENT (INCORRECT)
const newViewport = getViewportPreset(
  preset,
  draftingEngine.getGeometry(),
  1000,  // width
  2000,  // height - WRONG
  viewport
);

// ✅ SHOULD BE
const newViewport = getViewportPreset(
  preset,
  draftingEngine.getGeometry(),
  2000,  // width
  1000,  // height - CORRECT
  viewport
);
```

### 3. zoomToFit Call (Line 1131)
```tsx
// ❌ CURRENT (INCORRECT)
setViewport(_prev => zoomToFit(geometry, 1000, 2000));

// ✅ SHOULD BE
setViewport(_prev => zoomToFit(geometry, 2000, 1000));
```

### 4. zoomToSelection Call (Line 1140)
```tsx
// ❌ CURRENT (INCORRECT)
setViewport(_prev => zoomToSelection(rect, 1000, 2000));

// ✅ SHOULD BE
setViewport(_prev => zoomToSelection(rect, 2000, 1000));
```

---

## 📊 Recommended Values

Based on typical screen sizes and aspect ratios:

### Option 1: Maintain Current Total Pixels (3000 total)
```tsx
canvasWidth={2000}   // 2:1 ratio
canvasHeight={1000}
```

### Option 2: More Realistic for Modern Screens (16:9 ratio)
```tsx
canvasWidth={1920}   // Matches Full HD width
canvasHeight={1080}  // Matches Full HD height
```

### Option 3: Conservative Estimate (accounting for panels)
```tsx
canvasWidth={1400}   // Typical after panels
canvasHeight={900}   // Typical after header/footer
```

**Recommendation**: Use **Option 1** (2000×1000) as it:
- Maintains similar total pixel count
- Provides 2:1 landscape aspect ratio
- Is a reasonable default for viewport calculations

---

## ⚠️ Impact of Current Bug

With `canvasHeight={2000}` (larger than width):
- Viewport calculations assume portrait orientation
- Zoom calculations may be incorrect
- "Zoom to fit" may not work correctly
- Viewport presets may produce unexpected results
- Aspect ratio mismatch with actual screen

---

## ✅ Verification

After fixing, verify:
1. Zoom to fit works correctly
2. Viewport presets align properly
3. Canvas rendering matches screen aspect ratio
4. Coordinate calculations are accurate

---

## 🔄 Related Code

The `DraftingCanvas2D` component correctly uses:
```tsx
const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 1000 });
```

This initial value is square (1:1), which is fine as a default since it gets updated with actual dimensions via `getBoundingClientRect()`.

The issue is **only** in `DraftingWorkbench.tsx` where hardcoded values are used for viewport calculations.

---

## 📝 Summary

**Problem**: `canvasHeight={2000}` is incorrect - height is double the width
**Fix**: Swap values to `canvasWidth={2000}, canvasHeight={1000}` (or similar landscape ratio)
**Locations**: 4 places in `DraftingWorkbench.tsx` (lines 902, 903, 912, 913, 1131, 1140)
**Impact**: Fixes viewport calculations, zoom functions, and aspect ratio handling
