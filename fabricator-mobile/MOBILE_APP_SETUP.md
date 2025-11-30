# Fabricator Pro Mobile App - Setup Guide

## Overview

The Fabricator Pro Mobile Companion App enables shop floor operations with:
- 📱 Barcode scanning for remnant tracking
- 📊 Real-time job progress updates
- 🔄 Offline-first data management
- 👥 Real-time collaboration with web app

## Prerequisites

- Node.js 20+ installed
- Expo CLI installed globally: `npm install -g expo-cli`
- Supabase project credentials
- iOS Simulator (for Mac) or Android Emulator

## Installation

1. **Navigate to mobile app directory:**
```bash
cd fabricator-mobile
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Running the App

### Development Mode

```bash
npm start
```

This will:
- Start the Expo development server
- Open Expo DevTools in your browser
- Allow you to run on iOS, Android, or web

### Platform-Specific Commands

```bash
# iOS (requires Mac with Xcode)
npm run ios

# Android (requires Android Studio)
npm run android

# Web browser
npm run web
```

## Project Structure

```
fabricator-mobile/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── BarcodeScanner.tsx
│   │   ├── RemnantCard.tsx
│   │   └── ProgressBar.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useOfflineSync.ts
│   │   └── useSupabaseSync.ts
│   ├── screens/             # Screen components
│   │   ├── HomeScreen.tsx
│   │   ├── RemnantScanner.tsx
│   │   └── JobProgress.tsx
│   ├── services/            # API and business logic
│   │   ├── supabaseClient.ts
│   │   └── OfflineManager.ts
│   ├── types/               # TypeScript types
│   │   └── mobile.ts
│   ├── theme/               # Theme configuration
│   │   └── AppTheme.ts
│   └── navigation/          # Navigation setup
│       └── AppNavigator.tsx
├── shared-types/            # Shared types with web app
│   └── fabricator.ts
├── App.tsx                  # Main app entry point
├── package.json
└── tsconfig.json
```

## Key Features

### 1. Barcode Scanning
- Scan remnants, profiles, and projects
- Automatic location tracking
- Offline queue support

### 2. Offline-First Architecture
- Operations queued when offline
- Automatic sync when connection restored
- Persistent storage with AsyncStorage

### 3. Real-time Sync
- Supabase real-time subscriptions
- Instant updates across devices
- Conflict resolution

### 4. Job Progress Tracking
- Track cutting plan completion
- Real-time progress updates
- Status management (pending, in-progress, completed, paused)

## Database Schema Requirements

The mobile app expects the following Supabase tables:

### `fabricator_remnants`
- `id` (uuid)
- `profile_id` (uuid)
- `profile_name` (text)
- `length` (numeric)
- `location` (text)
- `barcode` (text, nullable)
- `scanned_at` (timestamp, nullable)
- `scanned_by` (text, nullable)
- `is_available` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### `cutting_jobs`
- `id` (uuid)
- `project_name` (text)
- `project_code` (text, nullable)
- `status` (text)
- `completed_cuts` (jsonb, array of cut IDs)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Development Tips

### Testing Offline Mode
1. Enable airplane mode on your device/emulator
2. Perform operations (scan remnants, complete cuts)
3. Operations will be queued
4. Disable airplane mode
5. Operations will sync automatically

### Debugging
- Use Expo DevTools for debugging
- Check AsyncStorage for offline queue: `AsyncStorage.getItem('@fabricator:sync_queue')`
- Monitor Supabase real-time subscriptions in Supabase dashboard

### Type Safety
- Shared types are in `shared-types/fabricator.ts`
- Mobile-specific types in `src/types/mobile.ts`
- Run `npm run type-check` to verify types

## Building for Production

### iOS
```bash
expo build:ios
```

### Android
```bash
expo build:android
```

Or use EAS Build (recommended):
```bash
npm install -g eas-cli
eas build --platform ios
eas build --platform android
```

## Troubleshooting

### Camera Permission Issues
- iOS: Check Info.plist for camera usage description
- Android: Check AndroidManifest.xml for camera permissions

### Supabase Connection Issues
- Verify environment variables are set correctly
- Check Supabase project is active
- Verify network connectivity

### Offline Queue Not Syncing
- Check network status indicator
- Manually trigger sync via sync button
- Check AsyncStorage for queued operations

## Next Steps

1. **Add Authentication**
   - Implement Supabase Auth
   - Add login/signup screens
   - Secure API calls with user tokens

2. **Enhance Job List Screen**
   - Display all active jobs
   - Filter and search functionality
   - Job details view

3. **Add Calibration Features**
   - Quick calibration data entry
   - Profile-specific adjustments
   - Calibration history

4. **Performance Optimization**
   - Image optimization
   - List virtualization
   - Background sync optimization

## Support

For issues or questions:
- Check the main project README
- Review Supabase documentation
- Check Expo documentation for React Native issues

