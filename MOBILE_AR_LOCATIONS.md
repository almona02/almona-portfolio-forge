# 📱 Where to See AR Icons on Mobile (Dev)

## 🎯 **EASIEST WAY - Test Page**

**URL:** `http://localhost:3000/test/swiftxr`

✅ **AR buttons visible immediately**  
✅ **No searching needed**  
✅ **Best for quick testing**

**What you'll see:**
- SwiftXR Manager component with "Launch SwiftXR AR" button
- 3D viewer with AR button in top-left corner
- All AR features in one place

---

## 🛍️ **Products Page** (Real Products)

**URL:** `http://localhost:3000/products`

### Products with 3D Models (Have AR):
1. **FR 223** (Portable Template Copy Router)
2. **FR 223 S** (with spray cooling)
3. **FR 222** (Economical Portable)

### How to See AR:

#### Method 1: Product Card
1. Scroll to find **FR 223**, **FR 223 S**, or **FR 222**
2. Look for **cyan "3D View" badge** on product image (top-left)
3. **Tap the product card**
4. Overlay appears → Tap **"3D" button**
5. 3D viewer opens → **AR button in top-left** (orange gradient)

#### Method 2: Quick View
1. Tap **"Quick View"** on any product
2. Side panel opens
3. Scroll to bottom footer
4. Tap **"3D View"** button (blue outline)
5. 3D viewer opens → **AR button appears**

---

## 🖼️ **3D Gallery Page**

**URL:** `http://localhost:3000/products/3d-gallery`

1. Browse model gallery
2. **Tap any model card**
3. Preview opens
4. **AR button visible** in top-left immediately

---

## 📍 **AR Button Location**

**Always in the same place:**
- **Position:** Top-left corner of 3D viewer
- **Style:** Orange gradient button (#FF5F1F)
- **Text:** 
  - iOS: "SwiftXR Native" or "SwiftXR Quick Look"
  - Android: "SwiftXR SceneViewer"
  - Desktop: "SwiftXR AR"

---

## 🚀 **Quick Mobile Test**

### On Your Phone:

1. **Find your computer's IP:**
   ```bash
   # Windows
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.1.100)
   
   # Mac/Linux
   ifconfig
   # Look for inet (e.g., 192.168.1.100)
   ```

2. **Open on phone:**
   ```
   http://YOUR_IP:3000/test/swiftxr
   ```
   Example: `http://192.168.1.100:3000/test/swiftxr`

3. **See AR button** immediately in 3D viewer

---

## 📋 **Visual Guide**

### Product Card (with 3D):
```
┌─────────────────────┐
│ [3D View] ← Badge   │ ← Cyan badge
│                     │
│   Product Image      │
│                     │
│  [Tap Card]         │
│  → "3D" button      │ ← In overlay
└─────────────────────┘
```

### 3D Viewer (AR Button):
```
┌─────────────────────┐
│ [SwiftXR AR] ←──────│ ← AR button here!
│                     │
│                     │
│    3D Model         │
│                     │
│                     │
└─────────────────────┘
```

---

## ✅ **Step-by-Step Test**

1. ✅ Open: `http://localhost:3000/test/swiftxr`
2. ✅ Scroll to "3D Model Viewer Test"
3. ✅ See orange "SwiftXR AR" button (top-left)
4. ✅ Tap button
5. ✅ AR launches (or shows message)

---

## 🎨 **What AR Button Looks Like**

- **Color:** Orange gradient
- **Text:** White, bold
- **Size:** Medium (easy to tap)
- **Position:** Top-left corner
- **Effect:** Glow on hover

---

## 📱 **Mobile URLs Summary**

| Page | URL | AR Button Location |
|------|-----|-------------------|
| **Test Page** | `/test/swiftxr` | ✅ Immediately visible |
| **Products** | `/products` | ✅ After clicking "3D" button |
| **3D Gallery** | `/products/3d-gallery` | ✅ After clicking model |
| **Quick View** | `/products` → Quick View | ✅ After clicking "3D View" |

---

## 🔍 **If You Don't See AR Button**

1. ✅ Make sure 3D viewer is open
2. ✅ Check if product has `modelPath` set
3. ✅ Verify dev server is running
4. ✅ Try test page first: `/test/swiftxr`
5. ✅ Check browser console for errors

---

**Fastest Path:** `/test/swiftxr` → Scroll down → See AR button! 🚀

