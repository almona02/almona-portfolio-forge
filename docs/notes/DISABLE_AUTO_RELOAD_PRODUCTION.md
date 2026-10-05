# Disable Automatic Reloading in Production

## Issue
The application was automatically reloading in production when service worker updates were detected, causing disruption to user workflows.

## Root Cause

1. **`registerType: "autoUpdate"`** - Automatically reloads page when new service worker is available
2. **`skipWaiting: true`** - Service worker activates immediately without waiting for user confirmation
3. **`clientsClaim: true`** - Service worker claims all clients immediately, forcing reload

## Fix Applied

### 1. Changed Register Type to "prompt"
**File:** `vite.config.ts` (line 111)

**Before:**
```typescript
registerType: "autoUpdate", // Auto-reloads without user confirmation
```

**After:**
```typescript
registerType: "prompt", // Shows notification, user must confirm before reload
```

### 2. Disabled Immediate Activation
**File:** `vite.config.ts` (lines 128-129)

**Before:**
```typescript
skipWaiting: true,  // Activates immediately
clientsClaim: true, // Claims clients immediately (forces reload)
```

**After:**
```typescript
skipWaiting: false,  // Wait for user confirmation
clientsClaim: false, // Don't claim clients immediately (prevents auto-reload)
```

### 3. Updated Service Worker Registration Handler
**File:** `src/main.tsx` (lines 574-581)

Removed automatic reload confirmation dialog since VitePWA now handles prompting automatically with `registerType: "prompt"`.

## How It Works Now

### Before (Auto-Reload):
1. New service worker detected
2. Service worker activates immediately (`skipWaiting: true`)
3. Page automatically reloads
4. User loses unsaved work ❌

### After (User-Controlled):
1. New service worker detected
2. Service worker waits (`skipWaiting: false`)
3. VitePWA shows notification: "New update available"
4. User clicks "Update" when ready
5. Page reloads only after user confirmation ✅

## Service Worker Update Flow

### Update Detection:
- Service worker checks for updates every hour (from `index.html`)
- When update is found, it's downloaded but NOT activated

### User Notification:
- VitePWA automatically shows a notification (browser notification or in-app)
- User can choose:
  - **Update Now** → Reloads page immediately
  - **Later** → Continues using current version, can update later

### Activation:
- Only happens when user confirms
- No automatic reloads
- User maintains control

## Configuration Options

### Option 1: "prompt" (Current - Recommended)
```typescript
registerType: "prompt"
```
- Shows notification when update is available
- User must confirm before reload
- Best for production (user control)

### Option 2: "manual"
```typescript
registerType: "manual"
```
- No automatic notifications
- User must manually check for updates
- Best for apps where updates are rare

### Option 3: "autoUpdate" (Previous - Not Recommended)
```typescript
registerType: "autoUpdate"
```
- Automatically reloads when update is available
- Can disrupt user workflows
- Only use if automatic updates are critical

## Testing

### Test in Production:
1. Deploy a new version
2. Open the app in production
3. Wait for service worker to detect update (or trigger manually)
4. **Expected:** Notification appears, page does NOT auto-reload
5. Click "Update" in notification
6. **Expected:** Page reloads only after user confirmation

### Verify No Auto-Reload:
1. Open app in production
2. Start a workflow (e.g., measuring a window)
3. Deploy a new version
4. Wait for update detection
5. **Expected:** Workflow continues, no interruption
6. Notification appears but doesn't force reload

## Files Modified

1. **`vite.config.ts`**
   - Line 111: Changed `registerType` from `"autoUpdate"` to `"prompt"`
   - Line 128: Changed `skipWaiting` from `true` to `false`
   - Line 129: Changed `clientsClaim` from `true` to `false`

2. **`src/main.tsx`**
   - Lines 576-580: Updated `onNeedRefresh` handler (removed auto-confirm)

3. **`index.html`**
   - Line 476-482: Updated comment to clarify no auto-reload

## Key Benefits

✅ **No Disruption:** Users can finish their work before updating
✅ **User Control:** Users choose when to update
✅ **Better UX:** No unexpected page reloads
✅ **Production Ready:** Safe for production environments

## Rollback (If Needed)

If you need automatic updates back (not recommended):

```typescript
registerType: "autoUpdate",
skipWaiting: true,
clientsClaim: true,
```

**Warning:** This will cause automatic reloads and may disrupt user workflows.

