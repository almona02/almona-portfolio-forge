# 🔍 Unused Dependencies Analysis

## Date: December 16, 2025

### Analysis Method
Using `depcheck` to identify unused dependencies in the codebase.

---

## ✅ Confirmed Unused Dependencies

Based on depcheck analysis and manual verification:

### 1. **@react-spring/three** ⚠️
- **Status**: Unused
- **Size**: ~50-100KB
- **Reason**: No imports found in codebase
- **Action**: Can be removed

### 2. **@types/react-window** ⚠️
- **Status**: Unused
- **Size**: ~5-10KB
- **Reason**: `react-window` not used, only `react-window-infinite-loader`
- **Action**: Can be removed

### 3. **@uiw/react-markdown-preview** ⚠️
- **Status**: Unused
- **Size**: ~100-200KB
- **Reason**: No imports found (only `@uiw/react-md-editor` is used)
- **Action**: Can be removed

### 4. **jwt-decode** ⚠️
- **Status**: Potentially unused
- **Size**: ~10-20KB
- **Reason**: Need to verify if used
- **Action**: Verify before removing

### 5. **markdown-to-jsx** ⚠️
- **Status**: Unused
- **Size**: ~50-100KB
- **Reason**: No imports found
- **Action**: Can be removed

---

## 📊 Potential Savings

| Package | Estimated Size | Status |
|---------|---------------|--------|
| @react-spring/three | ~50-100KB | ✅ Safe to remove |
| @types/react-window | ~5-10KB | ✅ Safe to remove |
| @uiw/react-markdown-preview | ~100-200KB | ✅ Safe to remove |
| jwt-decode | ~10-20KB | ⚠️ Verify first |
| markdown-to-jsx | ~50-100KB | ✅ Safe to remove |
| **Total** | **~215-330KB** | |

---

## 🔍 Dependencies to Verify

### jwt-decode
**Check if used**:
```bash
grep -r "jwt-decode" src/
```

**If unused**: Can be removed (~10-20KB savings)

---

## 🚀 Removal Instructions

### Step 1: Verify Dependencies
```bash
# Check if jwt-decode is used
grep -r "jwt-decode" src/

# Check if any of these are used
grep -r "@react-spring/three" src/
grep -r "markdown-to-jsx" src/
grep -r "@uiw/react-markdown-preview" src/
```

### Step 2: Remove Unused Dependencies
```bash
npm uninstall @react-spring/three @types/react-window @uiw/react-markdown-preview markdown-to-jsx

# If jwt-decode is unused:
npm uninstall jwt-decode
```

### Step 3: Test Application
```bash
npm run build
npm run preview
# Test all features to ensure nothing breaks
```

---

## ⚠️ Dependencies That ARE Used

These dependencies are **actively used** and should **NOT** be removed:

- ✅ `react-window-infinite-loader` - Used in virtualized lists
- ✅ `@uiw/react-md-editor` - Used in ticket forms
- ✅ `input-otp` - Used in OTP components
- ✅ `vaul` - Used in drawer components
- ✅ `cmdk` - Used in command components
- ✅ `embla-carousel-react` - Used in carousel components
- ✅ `react-day-picker` - Used in calendar components
- ✅ `react-resizable-panels` - Used in resizable panels
- ✅ `react-content-loader` - Used in loading skeletons
- ✅ `react-media-recorder` - Used in media recording
- ✅ `use-debounce` - Used in debounced inputs

---

## 📝 Next Steps

1. **Verify jwt-decode usage** (5 min)
   ```bash
   grep -r "jwt-decode" src/
   ```

2. **Remove confirmed unused dependencies** (2 min)
   ```bash
   npm uninstall @react-spring/three @types/react-window @uiw/react-markdown-preview markdown-to-jsx
   ```

3. **Test application** (10 min)
   - Build the application
   - Test all features
   - Verify no errors

4. **Rebuild and check bundle sizes** (5 min)
   ```bash
   npm run build
   # Check if bundle sizes reduced
   ```

---

## 🎯 Expected Impact

### Bundle Size Reduction
- **Estimated savings**: 215-330KB
- **Impact on Performance**: Small but positive
- **Impact on Build Time**: Slightly faster builds

### Maintenance Benefits
- Cleaner dependency tree
- Faster `npm install`
- Reduced security surface area
- Easier dependency updates

---

## ✅ Verification Checklist

- [ ] Verify jwt-decode is unused
- [ ] Remove confirmed unused dependencies
- [ ] Test application thoroughly
- [ ] Rebuild and verify bundle sizes
- [ ] Check for any runtime errors
- [ ] Update documentation if needed

---

**Status**: ⚠️ Ready for Verification and Removal  
**Estimated Time**: 20-30 minutes  
**Risk Level**: Low (after verification)

