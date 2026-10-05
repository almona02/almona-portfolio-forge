# 📱 Mobile AR Icons - Quick Guide

## 🎯 Where to See AR Icons on Mobile (Dev)

### **EASIEST: Test Page**
**URL:** `http://localhost:3000/test/swiftxr`

✅ **AR buttons visible immediately**  
✅ **No need to find products**  
✅ **Best for testing**

---

### **PRODUCTS PAGE** (Main Location)

**URL:** `http://localhost:3000/products`

#### Step-by-Step:

1. **Scroll to products** - Look for products with **cyan "3D View" badge** on image
2. **Tap product card** - Overlay appears
3. **Tap "3D" button** - Opens 3D viewer
4. **AR button appears** - Top-left corner (orange gradient button)

#### Products with 3D Models:
- Check products around line 1062, 1098, 1135 in `yilmazMachines.ts`
- These have `modelPath` set
- Will show "3D View" badge

---

### **QUICK VIEW PANEL**

**URL:** `http://localhost:3000/products`

#### Step-by-Step:

1. **Tap "Quick View"** on any product
2. **Panel slides in** from side
3. **Scroll to bottom** - See footer buttons
4. **Tap "3D View"** button (blue outline)
5. **3D dialog opens** - AR button in top-left

---

### **3D GALLERY PAGE**

**URL:** `http://localhost:3000/products/3d-gallery`

#### Step-by-Step:

1. **Browse model gallery**
2. **Tap any model card**
3. **Preview opens** - AR button visible immediately

---

## 📍 AR Button Location

**In 3D Viewer:**
- **Position:** Top-left corner
- **Style:** Orange gradient button
- **Text:** 
  - iOS: "SwiftXR Native" or "SwiftXR Quick Look"
  - Android: "SwiftXR SceneViewer"
  - Desktop: "SwiftXR AR"

---

## 🔍 Visual Guide

### Product Card with 3D:
```
┌─────────────────────┐
│ [3D View Badge]     │ ← Cyan badge (top-left)
│                     │
│   Product Image      │
│                     │
│  [Hover/Tap]        │
│  → "3D" button      │ ← In overlay
└─────────────────────┘
```

### 3D Viewer Dialog:
```
┌─────────────────────┐
│ [SwiftXR AR] ←──────│ ← AR button (top-left)
│                     │
│                     │
│    3D Model         │
│                     │
│                     │
└─────────────────────┘
```

---

## 🚀 Fastest Test (Mobile)

1. **Open:** `http://YOUR_IP:3000/test/swiftxr`
   - Replace YOUR_IP with your computer's IP
   - Or use `localhost:3000` if on same device

2. **Scroll down** to "3D Model Viewer Test"

3. **See AR button** immediately in viewer

---

## 📱 Mobile-Specific URLs

### On Your Phone:
```
http://YOUR_COMPUTER_IP:3000/products
http://YOUR_COMPUTER_IP:3000/test/swiftxr
http://YOUR_COMPUTER_IP:3000/products/3d-gallery
```

### Find Your IP:
- Windows: `ipconfig` → Look for IPv4
- Mac/Linux: `ifconfig` → Look for inet

Example: `http://192.168.1.100:3000/test/swiftxr`

---

## ✅ Quick Checklist

- [ ] Dev server running on port 3000
- [ ] Phone on same network
- [ ] Visit test page: `/test/swiftxr`
- [ ] See AR button in 3D viewer
- [ ] Tap AR button
- [ ] AR launches (or shows message)

---

## 🎨 What AR Button Looks Like

**Appearance:**
- Orange gradient (#FF5F1F to #FF8C42)
- White text
- Rounded corners
- Glow effect
- Top-left position

**Size:** Medium button, easy to tap on mobile

---

**Need Help?** Check `WHERE_TO_FIND_AR_ICONS.md` for detailed guide.

