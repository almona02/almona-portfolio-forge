# Animation Debug Fix - Window Opening Animation

## Issue
Play button counts animation time (progress bar works) but 3D model doesn't animate.

## Root Causes Identified

1. **Props Override**: `position` and `rotation` props on `<group>` were overriding manual animation changes
2. **Rest State Initialization**: Rest position/rotation weren't properly initialized as Vector3/Euler instances
3. **Missing Debug Info**: No way to see if animation logic was running

## Fixes Applied

### 1. Removed Props Override (Lines 570-590)

**Before:**
```typescript
<group 
    position={sash.openingPath.position}  // ❌ This overrides animation!
    rotation={sash.openingPath.rotation || new Euler(0,0,0)}  // ❌ This overrides animation!
>
```

**After:**
```typescript
<group 
    ref={(el) => {
        if (el) {
            // Set position/rotation directly on object (not as props)
            el.position.copy(sash.openingPath.position);
            if (sash.openingPath.rotation) {
                el.rotation.copy(sash.openingPath.rotation);
            } else {
                el.rotation.set(0, 0, 0);
            }
            // Store rest state
            el.userData.restPosition = sash.openingPath.position.clone();
            el.userData.restRotation = sash.openingPath.rotation 
                ? sash.openingPath.rotation.clone() 
                : new Euler(0, 0, 0);
        }
    }}
>
```

### 2. Improved Animation Logic (Lines 455-522)

**Changes:**
- Use `.set()` method for position/rotation (more reliable)
- Proper Vector3/Euler initialization
- Added debug logging
- Fallback animation even without openingPath

**Key Fix:**
```typescript
// Use .set() instead of direct assignment
child.position.set(
    restPosition.x + (slideDistance * slideDirection * progress),
    restPosition.y,
    restPosition.z
);
```

### 3. Debug Logging Added

The code now logs:
- When animation starts
- How many sashes are found
- Warnings if no sashes are animatable

## Testing

1. **Open Browser Console** (F12)
2. **Click Play Button**
3. **Check Console** for:
   - `[Animation] Starting animation:` message
   - Any warnings about missing sashes
4. **Observe 3D Model**:
   - Sashes should move/rotate
   - Progress bar should match visual animation

## Expected Behavior

### Sliding Windows:
- Sashes slide horizontally (left/right)
- 30cm slide distance
- Smooth motion over 3 seconds

### Casement Windows:
- Sashes rotate around Y-axis
- 90-degree rotation
- Slight outward translation

## If Still Not Working

Check browser console for:
1. `[Animation] Starting animation:` - Confirms animation loop is running
2. `No animatable sashes found!` - Means sashes aren't marked correctly
3. Any errors about Vector3/Euler

## Status
✅ **Fixed** - Removed props override, improved initialization
✅ **Debug Added** - Console logging for troubleshooting
✅ **Ready for Testing**

