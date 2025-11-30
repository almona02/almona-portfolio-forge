# Fabricator Pro Mobile Companion App

Mobile companion app for Fabricator Pro - enabling shop floor operations with barcode scanning, real-time job tracking, and offline-first data management.

## Features

- 📱 **Barcode Scanning** - Scan remnants, profiles, and projects on the shop floor
- 📊 **Job Progress Tracking** - Real-time updates on cutting plan progress
- 🔄 **Offline-First** - Queue operations when offline, sync when online
- 👥 **Real-time Collaboration** - Sync with web app in real-time
- 🎯 **Simple Calibration** - Quick calibration data entry

## Tech Stack

- React Native + Expo
- TypeScript
- Supabase (real-time sync)
- React Navigation
- React Native Paper (UI)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Add your Supabase credentials
```

3. Start the app:
```bash
npm start
```

## Environment Variables

- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key

## Development

- `npm start` - Start Expo dev server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run in web browser
- `npm run type-check` - Type check without emitting

## Project Structure

```
fabricator-mobile/
├── src/
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── screens/        # Screen components
│   ├── services/       # API and business logic
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   └── theme/          # Theme configuration
└── shared-types/       # Shared types with web app
```

