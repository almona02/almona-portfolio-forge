# Drafting Area Size Analysis

**Date:** January 2026  
**Component:** `src/components/fabricator/drafting/DraftingWorkbench.tsx`  
**Question:** What is the size of the drafting area?

---

## 📐 Answer Summary

**The drafting area has NO fixed pixel dimensions.** It is **responsive** and dynamically sized based on:
- Browser viewport size
- Left panel width (160px fixed)
- Right panel width (variable, typically ~300-400px)
- Available screen space

**Actual dimensions are calculated at runtime** using `getBoundingClientRect()` on the SVG element.

---

## 🔍 Size Determination

### 1. **Hardcoded Values in Code (For Viewport Calculations Only)**

In `DraftingWorkbench.tsx` (lines 902-903, 912-913, 1131, 1140):

```tsx
canvasWidth={1000}
canvasHeight={2000}
```

**⚠️ Important**: These values are **NOT the actual canvas size**. They are:
- Used for viewport preset calculations (zoom to fit, zoom to selection)
- Legacy/default values for initial viewport calculations
- Not reflective of the actual rendered canvas dimensions

### 2. **Actual Canvas Size (Runtime Calculation)**

In `DraftingCanvas2D.tsx` (lines 256-268):

```tsx
const updateCanvasSize = () => {
  if (svgRef.current) {
    const rect = svgRef.current.getBoundingClientRect();
    setCanvasSize({ width: rect.width, height: rect.height });
    // Updates viewport with actual dimensions
    const newViewport = { ...viewport, width: rect.width, height: rect.height };
    onViewportChange?.(newViewport);
  }
};
```

**The actual canvas size is determined by:**
- DOM element's `getBoundingClientRect()` - returns actual rendered dimensions
- Calculated after component mounts and on window resize
- Stored in component state as `canvasSize`

### 3. **Layout Structure (What Determines Available Space)**

```
Browser Viewport (e.g., 1920x1080)
  └── FabricatorWorkspaceLayout
      ├── Left Panel: 160px (fixed) ← leftPanelWidth={160}
      ├── Main Content (Canvas Area): calc(100% - 160px - rightPanelWidth)
      │   └── Tabs Component
      │       └── TabsContent (2D)
      │           └── div.absolute.inset-0 (fills parent)
      │               └── DraftingCanvas2D (SVG with w-full h-full)
      └── Right Panel: ~300-400px (variable, collapsible)
```

---

## 📊 Typical Dimensions (Estimated)

### Full HD Screen (1920x1080)
- **Total Viewport**: 1920px × 1080px
- **Left Panel**: 160px (fixed)
- **Right Panel**: ~350px (typical)
- **Available Canvas Width**: ~1410px (1920 - 160 - 350)
- **Available Canvas Height**: ~1000px (1080 - header - footer - tabs)

### 4K Screen (3840x2160)
- **Total Viewport**: 3840px × 2160px
- **Available Canvas Width**: ~3330px (3840 - 160 - 350)
- **Available Canvas Height**: ~2000px (2160 - header - footer - tabs)

### Laptop Screen (1366x768)
- **Total Viewport**: 1366px × 768px
- **Available Canvas Width**: ~856px (1366 - 160 - 350)
- **Available Canvas Height**: ~650px (768 - header - footer - tabs)

**Note**: These are estimates. Actual dimensions vary based on:
- Panel collapse state
- Browser UI elements (scrollbars, toolbars)
- Header/footer heights
- Tab bar height

---

## 🔧 How Size is Used

### SVG Rendering

The canvas uses SVG with a **responsive viewBox**:

```tsx
const viewBox = `${bounds.minX} ${bounds.minY} ${bounds.maxX - bounds.minX} ${bounds.maxY - bounds.minY}`;

<svg
  className="w-full h-full"
  viewBox={viewBox}
  preserveAspectRatio="xMidYMid meet"
>
```

**Key Points:**
- SVG has `w-full h-full` classes (fills container)
- `viewBox` defines the coordinate system (not pixel size)
- `preserveAspectRatio="xMidYMid meet"` ensures content scales proportionally
- Actual pixel dimensions come from container size

### Viewport Calculations

The viewport system uses:
1. **Actual canvas size** (from `getBoundingClientRect()`) for:
   - Screen-to-world coordinate conversion
   - Zoom calculations
   - Mouse position calculations

2. **Hardcoded values** (1000×2000) for:
   - Initial viewport presets (if actual size not available)
   - ViewportControls component (display/UI purposes)

---

## ⚠️ Issue: Hardcoded Values vs. Actual Size

### Current Problem

```tsx
// ViewportControls receives hardcoded values
<ViewportControls
  canvasWidth={1000}  // ❌ Not accurate
  canvasHeight={2000} // ❌ Not accurate
/>

// Zoom functions use hardcoded values
zoomToFit(geometry, 1000, 2000);  // ❌ Not accurate
zoomToSelection(rect, 1000, 2000); // ❌ Not accurate
```

### Impact

- Viewport presets may not work correctly
- Zoom calculations may be inaccurate
- Coordinate conversions might be off

### Recommendation

The hardcoded values should be replaced with actual canvas dimensions:

```tsx
// Calculate actual canvas size
const [canvasDimensions, setCanvasDimensions] = useState({ width: 1000, height: 2000 });

// Pass actual dimensions
<ViewportControls
  canvasWidth={canvasDimensions.width}
  canvasHeight={canvasDimensions.height}
/>
```

---

## 📏 CSS Classes Affecting Size

### Canvas Container

```tsx
<div className="absolute inset-0 w-full h-full">
  <DraftingCanvas2D />
</div>
```

- `absolute inset-0`: Fills parent completely (top: 0, right: 0, bottom: 0, left: 0)
- `w-full h-full`: Explicit 100% width/height

### SVG Element

```tsx
<svg className="w-full h-full" viewBox={...}>
```

- `w-full h-full`: Fills parent container (100% width/height)
- No fixed pixel dimensions

---

## 🔄 Responsive Behavior

### Window Resize Handling

The canvas listens for resize events:

```tsx
useEffect(() => {
  const updateCanvasSize = () => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    }
  };

  window.addEventListener('resize', updateCanvasSize);
  updateCanvasSize(); // Initial size
  
  return () => window.removeEventListener('resize', updateCanvasSize);
}, []);
```

**The canvas automatically resizes when:**
- Browser window is resized
- Panels are collapsed/expanded
- Browser zoom level changes
- DevTools are opened/closed

---

## 📝 Summary

| Aspect | Details |
|--------|---------|
| **Fixed Size?** | ❌ No - Fully responsive |
| **How Determined?** | Runtime via `getBoundingClientRect()` |
| **Layout Method** | Flexbox + Absolute positioning |
| **Hardcoded Values** | 1000×2000 (used only for viewport calculations, not actual size) |
| **Responsive?** | ✅ Yes - Resizes with window/panels |
| **Coordinate System** | SVG viewBox (logical coordinates, not pixels) |

---

## 🎯 Key Takeaways

1. **No Fixed Dimensions**: The canvas is responsive and fills available space
2. **Runtime Calculation**: Actual size determined by DOM measurement
3. **Hardcoded Values Issue**: 1000×2000 values should be replaced with actual dimensions
4. **Responsive Design**: Canvas adapts to screen size and panel states
5. **SVG ViewBox**: Uses logical coordinates, not pixel dimensions

---

## 🔧 Recommended Fix

Replace hardcoded canvas dimensions with actual measured dimensions:

```tsx
// In DraftingWorkbench.tsx
const canvasContainerRef = useRef<HTMLDivElement>(null);
const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 2000 });

useEffect(() => {
  const updateSize = () => {
    if (canvasContainerRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    }
  };
  
  window.addEventListener('resize', updateSize);
  updateSize();
  return () => window.removeEventListener('resize', updateSize);
}, []);

// Pass to ViewportControls and zoom functions
<ViewportControls
  canvasWidth={canvasSize.width}
  canvasHeight={canvasSize.height}
/>
```

This would ensure viewport calculations use actual canvas dimensions.
