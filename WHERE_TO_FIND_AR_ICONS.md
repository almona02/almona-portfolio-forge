# Where to Find AR Icons on Mobile (Dev)

## 📱 Quick Access URLs

### 1. **Products Page** (Main Location)
**URL:** `http://localhost:3000/products` or `http://localhost:3000/products/machines`

**How to see AR:**
1. Scroll through product cards
2. Look for products with **"3D View" badge** (cyan/blue badge on product image)
3. **Hover/tap** product card → See **"3D" button** in overlay
4. Click **"3D" button** → Opens 3D viewer dialog
5. **AR buttons appear** in top-left corner of 3D viewer:
   - iOS: "SwiftXR Native" or "SwiftXR Quick Look"
   - Android: "SwiftXR SceneViewer"
   - Desktop: "SwiftXR AR" (WebXR)

---

### 2. **Product Quick View** (Side Panel)
**URL:** `http://localhost:3000/products`

**How to see AR:**
1. Click **"Quick View"** button on any product card
2. Quick view panel opens from side
3. Scroll to bottom → See **"3D View" button** (blue outline)
4. Click **"3D View"** → Opens 3D viewer dialog
5. **AR buttons appear** in 3D viewer

---

### 3. **3D Model Gallery** (Dedicated Gallery)
**URL:** `http://localhost:3000/products/3d-gallery`

**How to see AR:**
1. Browse 3D model gallery
2. Click any model card
3. Model preview opens
4. **AR buttons appear** in top-left of viewer:
   - "SwiftXR AR" button (orange gradient)
   - Shows SwiftXR branding

---

### 4. **Advanced Model Viewer** (Full Featured)
**URL:** `http://localhost:3000/products/advanced-viewer` or check routes

**How to see AR:**
1. Page loads with 3D viewer
2. **AR buttons visible** immediately in viewer
3. Multiple AR options available

---

### 5. **SwiftXR Test Page** (Testing)
**URL:** `http://localhost:3000/test/swiftxr`

**How to see AR:**
1. Page shows SwiftXR Manager component
2. **"Launch SwiftXR AR" button** (large orange button)
3. 3D viewer below with AR buttons
4. Best for testing all AR features

---

## 🎯 Step-by-Step: Finding AR on Products Page

### Method 1: Product Card Overlay
```
1. Go to: http://localhost:3000/products
2. Find product with 3D model (has "3D View" badge)
3. Hover/tap product card
4. See overlay with "3D" button
5. Click "3D" button
6. 3D dialog opens → AR buttons in top-left
```

### Method 2: Quick View Panel
```
1. Go to: http://localhost:3000/products
2. Click "Quick View" on any product
3. Panel opens from side
4. Scroll to bottom footer
5. Click "3D View" button
6. 3D dialog opens → AR buttons appear
```

---

## 📍 AR Button Locations

### In 3D Viewer Dialog
**Location:** Top-left corner of 3D viewer canvas

**Appearance:**
- **iOS:** Orange gradient button "SwiftXR Native" or "SwiftXR Quick Look"
- **Android:** Orange gradient button "SwiftXR SceneViewer"  
- **Desktop:** Orange gradient button "SwiftXR AR"

**Styling:**
- Orange gradient (#FF5F1F to #FF8C42)
- Glow effect
- Professional SwiftXR branding

---

## 🔍 Visual Indicators

### Products with 3D Models Show:
1. **Badge on image:** Cyan/blue "3D View" badge (top-left of product image)
2. **Overlay button:** "3D" button appears on hover/tap
3. **Quick View button:** "3D View" in quick view footer

### In 3D Viewer:
1. **AR buttons:** Top-left corner (orange gradient)
2. **AR Ready badge:** If AR is supported
3. **View mode toggle:** AR mode option in header

---

## 📱 Mobile-Specific Notes

### iOS (iPhone/iPad)
- AR buttons show: **"SwiftXR Native"** (if app installed)
- Or: **"SwiftXR Quick Look"** (fallback)
- Button appears in top-left of 3D viewer

### Android
- AR buttons show: **"SwiftXR SceneViewer"**
- Opens Google Scene Viewer
- Button appears in top-left of 3D viewer

### Desktop
- AR buttons show: **"SwiftXR AR"** (WebXR)
- Only works if WebXR supported
- Button appears in top-left of 3D viewer

---

## 🧪 Quick Test Checklist

- [ ] Visit `/products` page
- [ ] Find product with "3D View" badge
- [ ] Click "3D" button or "Quick View" → "3D View"
- [ ] 3D dialog opens
- [ ] See AR button in top-left (orange gradient)
- [ ] Click AR button
- [ ] AR launches (or shows appropriate message)

---

## 🎨 AR Button Appearance

**When Visible:**
- Orange gradient background
- White text
- Glow effect on hover
- Top-left position in 3D viewer
- SwiftXR branding

**Text Variations:**
- "SwiftXR Native" (iOS with app)
- "SwiftXR Quick Look" (iOS without app)
- "SwiftXR SceneViewer" (Android)
- "SwiftXR AR" (Desktop/WebXR)
- "Exit SwiftXR" (when AR active)

---

## 🚀 Fastest Way to See AR

**Quickest Path:**
1. Open: `http://localhost:3000/test/swiftxr`
2. Scroll to "3D Model Viewer Test"
3. AR button visible immediately in viewer

**Or:**
1. Open: `http://localhost:3000/products/3d-gallery`
2. Click any model
3. AR button appears in preview

---

## 📝 Notes

- AR buttons only appear if:
  - Model has `has3DModel: true` or `modelPath` set
  - 3D viewer is opened
  - Device supports AR (mobile or WebXR desktop)

- If you don't see AR buttons:
  - Check if product has 3D model
  - Verify 3D viewer opened correctly
  - Check browser console for errors
  - Try test page first: `/test/swiftxr`

---

**Last Updated:** Today  
**Status:** Ready for Mobile Testing

