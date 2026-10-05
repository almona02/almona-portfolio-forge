# Restart Dev Server - Animation Fix

## Issue
Console log is empty and animation didn't start. Code changes may not have been picked up.

## Solution: Restart Dev Server

### Step 1: Stop Current Dev Server
1. In your terminal, press `Ctrl+C` to stop the dev server
2. Wait for it to fully stop

### Step 2: Clear Build Cache (Optional but Recommended)
```bash
# Clear Vite cache
rm -rf node_modules/.vite
# Or on Windows:
rmdir /s /q node_modules\.vite
```

### Step 3: Restart Dev Server
```bash
npm run dev
# or
yarn dev
```

### Step 4: Hard Refresh Browser
1. Open browser DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
   - Or press `Ctrl+Shift+R` (Windows/Linux)
   - Or `Cmd+Shift+R` (Mac)

## What to Look For After Restart

### 1. Check Console on Page Load
You should see:
```
[Animation] 🎬 Window3DModel component mounted/updated { ... }
[Animation] 🔧 useFrame hook initialized { ... }
```

### 2. Click Play Button
You should see:
```
[Animation] 🎮 Play button clicked! { currentState: false, willSetTo: true }
[Animation] ▶️ Animation STARTED! { ... }
[Animation] 📊 Progress: 0%
[Animation] 🎯 useFrame is running! { ... }
```

### 3. Watch Progress
You should see progress logs every 10%:
```
[Animation] 📊 Progress: 10%
[Animation] 📊 Progress: 20%
...
[Animation] 📊 Progress: 100%
[Animation] ✅ Animation COMPLETE!
```

## If Still No Logs After Restart

### Check 1: Verify Code Changes
Open `src/components/fabricator/Window3DGenerator.tsx` and check:
- Line ~785: Play button onClick should have console.log
- Line ~1064: Animation useEffect should have console.log
- Line ~236: Window3DModel should have useEffect with console.log

### Check 2: Check for Compilation Errors
Look in terminal for:
- TypeScript errors
- Build errors
- Import errors

### Check 3: Verify Browser Console Filter
In browser DevTools Console:
- Make sure "All levels" is selected (not just Errors)
- Check that console is not filtered
- Try clearing console and refreshing

### Check 4: Check Network Tab
- Verify `Window3DGenerator.tsx` is loading
- Check for 404 errors
- Verify no CORS issues

## Quick Test

After restart, open console and type:
```javascript
// Check if component is loaded
console.log('Test log - if you see this, console is working');
```

If you see the test log but no animation logs, the component might not be rendering or the code changes didn't apply.

## Alternative: Check Source Map

1. Open DevTools → Sources tab
2. Navigate to `src/components/fabricator/Window3DGenerator.tsx`
3. Search for `🎮 Play button clicked`
4. If found, set a breakpoint
5. Click Play button
6. If breakpoint hits, code is loaded correctly

## Next Steps

Once you see the logs:
1. ✅ Verify Play button click is logged
2. ✅ Verify Animation STARTED is logged
3. ✅ Verify useFrame is running
4. ✅ Check if sashes are detected
5. ✅ Verify position/rotation updates

If logs appear but animation still doesn't work, we'll debug the actual animation logic.

