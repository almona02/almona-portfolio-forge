# SwiftXR Browser Testing Guide

## 🧪 Quick Test Access

### Test Page
Visit: **`http://localhost:5173/test/swiftxr`** (or your dev server URL)

### Browser Console Tests
Open browser console and run:
```javascript
// Import test utility (auto-loaded)
testSwiftXR.testAll()

// Or test individually:
testSwiftXR.testDetection()
testSwiftXR.testLaunch('fr222')
testSwiftXR.testFallback('/models/fr222.glb')
testSwiftXR.test3DViewers()
```

---

## ✅ Test Checklist

### 1. Component Loading Tests
- [ ] SwiftXRManager component loads
- [ ] UnifiedARManager component loads
- [ ] EnhancedGLBViewer component loads
- [ ] SwiftXR CSS styles apply correctly

### 2. Detection Tests
- [ ] Platform detection (iOS/Android/Desktop)
- [ ] SwiftXR app detection (iOS only)
- [ ] WebXR support detection
- [ ] AR capability detection

### 3. Launch Tests
- [ ] Native SwiftXR launch (if app installed)
- [ ] Fallback to Quick Look (iOS)
- [ ] Fallback to Scene Viewer (Android)
- [ ] Fallback to WebXR (Desktop)
- [ ] Error handling

### 4. 3D Viewer Tests
- [ ] Model loads correctly
- [ ] AR buttons appear
- [ ] AR buttons have SwiftXR styling
- [ ] Model rotates/interacts correctly
- [ ] No console errors

### 5. Integration Tests
- [ ] Product cards open 3D viewer
- [ ] Quick view opens 3D viewer
- [ ] 3D gallery works
- [ ] All AR buttons functional

---

## 🔍 Manual Testing Steps

### Test 1: SwiftXR Manager
1. Navigate to `/test/swiftxr`
2. Check "SwiftXR Manager" card
3. Verify detection shows correct platform
4. Click "Launch SwiftXR AR" button
5. Verify appropriate AR method launches

### Test 2: 3D Viewer
1. Scroll to "3D Model Viewer Test"
2. Verify model loads
3. Check AR buttons appear (top-left)
4. Click AR button
5. Verify AR launches or shows appropriate message

### Test 3: Product Integration
1. Navigate to `/products`
2. Find product with 3D model
3. Click "3D View" or "Quick View"
4. Verify 3D dialog opens
5. Check AR buttons work

### Test 4: Gallery Integration
1. Navigate to `/products/3d-gallery`
2. Click on a model
3. Verify preview opens
4. Check AR functionality

---

## 🐛 Common Issues & Solutions

### Issue: AR buttons not showing
**Solution:**
- Check browser console for errors
- Verify model path is correct
- Check if AR is supported on device

### Issue: SwiftXR app not launching
**Solution:**
- Verify app is installed (iOS)
- Check deep link format
- Test with `swiftxr://model?name=test` in browser

### Issue: Model not loading
**Solution:**
- Check model path exists
- Verify CORS headers (for remote models)
- Check browser console for errors
- Verify GLB file is valid

### Issue: CSS not applying
**Solution:**
- Check SwiftXR.css is imported
- Verify CSS classes are correct
- Clear browser cache

---

## 📊 Expected Results

### iOS with SwiftXR App
- ✅ Detection: `{ platform: 'ios', isInstalled: true, canLaunch: true }`
- ✅ Button shows: "SwiftXR Native"
- ✅ Badge shows: "Native App"
- ✅ Launch opens native app

### iOS without SwiftXR App
- ✅ Detection: `{ platform: 'ios', isInstalled: false, canLaunch: false }`
- ✅ Button shows: "SwiftXR Quick Look"
- ✅ Launch opens Quick Look

### Android
- ✅ Detection: `{ platform: 'android', isInstalled: false, canLaunch: false }`
- ✅ Button shows: "SwiftXR SceneViewer"
- ✅ Launch opens Scene Viewer

### Desktop
- ✅ Detection: `{ platform: 'desktop', isInstalled: false, canLaunch: false }`
- ✅ Button shows: "SwiftXR AR" (WebXR)
- ✅ Launch opens WebXR (if supported)

---

## 🎯 Test Results Template

```
Platform: [iOS/Android/Desktop]
Browser: [Chrome/Safari/Firefox/Edge]
Version: [version]

✅ Component Loading: [PASS/FAIL]
✅ Detection: [PASS/FAIL]
✅ Launch: [PASS/FAIL]
✅ 3D Viewer: [PASS/FAIL]
✅ Integration: [PASS/FAIL]

Notes:
[Any issues or observations]
```

---

## 🚀 Quick Test Commands

### In Browser Console:
```javascript
// Full test suite
testSwiftXR.testAll()

// Individual tests
testSwiftXR.testDetection()
testSwiftXR.testLaunch('fr222', 'https://yoursite.com/models/fr222.glb')
testSwiftXR.testFallback('/models/fr222.glb')
testSwiftXR.test3DViewers()

// Check integration
import { detectSwiftXR, launchSwiftXR } from '@/utils/swiftXRIntegration'
detectSwiftXR().then(console.log)
```

---

## 📝 Testing Notes

- **Test on real devices** for best results
- **iOS Safari** required for Quick Look
- **Chrome on Android** required for Scene Viewer
- **Chrome/Edge** required for WebXR on desktop
- **Test with and without** SwiftXR app installed

---

**Last Updated:** Today  
**Status:** Ready for Testing

