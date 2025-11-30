# Quick Start Guide - Fabricator Mobile App

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
cd fabricator-mobile
npm install
```

### Step 2: Configure Environment
Create `.env` file:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step 3: Start Development Server
```bash
npm start
```

### Step 4: Run on Device/Emulator
- Press `i` for iOS simulator (Mac only)
- Press `a` for Android emulator
- Press `w` for web browser
- Scan QR code with Expo Go app on your phone

## 📱 Key Features to Test

### 1. Barcode Scanning
1. Navigate to "Remnants" tab
2. Tap "Scan" button
3. Point camera at barcode
4. Remnant location updates automatically

### 2. Offline Mode
1. Enable airplane mode
2. Scan a remnant or complete a cut
3. Operation is queued
4. Disable airplane mode
5. Operations sync automatically

### 3. Job Progress
1. Navigate to a job (when implemented)
2. Mark cuts as completed
3. See real-time progress updates
4. Change job status

## 🛠️ Troubleshooting

### "Camera permission denied"
- iOS: Check Settings > Privacy > Camera
- Android: Check app permissions in Settings

### "Supabase connection failed"
- Verify `.env` file has correct credentials
- Check Supabase project is active
- Verify network connection

### "Expo not found"
```bash
npm install -g expo-cli
# or
npx expo start
```

## 📖 Next Steps

- Read `MOBILE_APP_SETUP.md` for detailed setup
- Check `IMPLEMENTATION_SUMMARY.md` for feature overview
- Review code comments for implementation details

