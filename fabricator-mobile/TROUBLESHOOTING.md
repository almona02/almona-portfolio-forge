# Troubleshooting Guide - Fabricator Mobile App

## Common Issues and Solutions

### 1. Missing Package: `expo-asset`

**Error:**
```
Error: The required package `expo-asset` cannot be found
```

**Solution:**
```bash
npm install expo-asset expo-font expo-linking expo-splash-screen
```

These are required Expo packages that should be included in the project.

---

### 2. Supabase Connection Issues

**Symptoms:**
- App shows "placeholder" configuration
- Real-time updates not working
- Database queries failing

**Solution:**
1. Verify `.env` file exists in `fabricator-mobile/` directory
2. Check environment variables:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Restart Expo dev server after changing `.env`
4. Verify Supabase project is active in dashboard

---

### 3. Camera Permission Denied

**iOS:**
- Go to Settings > Privacy > Camera
- Enable camera access for Fabricator Pro

**Android:**
- Go to Settings > Apps > Fabricator Pro > Permissions
- Enable Camera permission

**In Code:**
The app requests permission automatically, but you may need to handle denial gracefully.

---

### 4. Offline Queue Not Syncing

**Symptoms:**
- Operations queued but not syncing when online
- Queue length not decreasing

**Debug Steps:**
1. Check network status indicator in app
2. Verify Supabase connection:
   ```typescript
   // In your code, check:
   const { data, error } = await supabase.from('_health').select('*').limit(1);
   ```
3. Check AsyncStorage:
   ```javascript
   import AsyncStorage from '@react-native-async-storage/async-storage';
   const queue = await AsyncStorage.getItem('@fabricator:sync_queue');
   console.log('Queue:', queue);
   ```
4. Manually trigger sync via sync button in app

---

### 5. TypeScript Errors

**Common Issues:**
- Missing type definitions
- Import path errors

**Solutions:**
1. Run type check:
   ```bash
   npm run type-check
   ```
2. Install missing types:
   ```bash
   npm install --save-dev @types/[package-name]
   ```
3. Check `tsconfig.json` paths configuration

---

### 6. Metro Bundler Errors

**Error:**
```
Unable to resolve module...
```

**Solutions:**
1. Clear Metro cache:
   ```bash
   npm start -- --reset-cache
   ```
2. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules
   npm install
   ```
3. Clear Expo cache:
   ```bash
   expo start -c
   ```

---

### 7. Navigation Errors

**Error:**
```
The action 'NAVIGATE' with payload ... was not handled
```

**Solution:**
- Verify navigation types match in `AppNavigator.tsx`
- Check that all screens are registered in navigator
- Ensure navigation params match type definitions

---

### 8. Real-time Subscriptions Not Working

**Symptoms:**
- No updates when data changes in Supabase
- Subscriptions not connecting

**Debug Steps:**
1. Check Supabase Realtime is enabled:
   - Go to Supabase Dashboard > Database > Replication
   - Ensure tables have replication enabled
2. Verify RLS policies allow reads
3. Check network connection
4. Review subscription code in `useSupabaseSync.ts`

---

### 9. Barcode Scanner Not Working

**Symptoms:**
- Camera opens but doesn't scan
- Permission errors

**Solutions:**
1. Verify camera permissions are granted
2. Check barcode format matches expected format
3. Ensure barcode is in focus and well-lit
4. Try different barcode types (QR, Code128, etc.)

---

### 10. Build Errors

**iOS Build:**
```bash
# Clean build
cd ios
pod deintegrate
pod install
cd ..
expo prebuild --clean
```

**Android Build:**
```bash
# Clean build
cd android
./gradlew clean
cd ..
expo prebuild --clean
```

---

## Debugging Tips

### Enable Debug Logging

Add to `App.tsx`:
```typescript
if (__DEV__) {
  console.log('Debug mode enabled');
}
```

### Check AsyncStorage

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// List all keys
AsyncStorage.getAllKeys().then(keys => console.log('Keys:', keys));

// Get specific item
AsyncStorage.getItem('@fabricator:sync_queue').then(value => 
  console.log('Queue:', value)
);
```

### Monitor Network Status

```typescript
import NetInfo from '@react-native-community/netinfo';

NetInfo.addEventListener(state => {
  console.log('Network state:', state);
});
```

### Supabase Debug Mode

In `supabaseClient.ts`, enable debug:
```typescript
const supabaseOptions = {
  // ... other options
  auth: {
    // ... auth options
    debug: true, // Enable debug logging
  },
};
```

---

## Getting Help

1. Check Expo documentation: https://docs.expo.dev
2. Check React Navigation docs: https://reactnavigation.org
3. Check Supabase docs: https://supabase.com/docs
4. Review error logs in terminal
5. Check Expo DevTools for runtime errors

---

## Known Limitations

See `IMPLEMENTATION_SUMMARY.md` for current limitations:
- Jobs List Screen - Placeholder implementation
- Authentication - Not yet implemented
- Error Recovery - Basic error handling
- Offline Conflict Resolution - Simple last-write-wins

These will be addressed in future updates.

