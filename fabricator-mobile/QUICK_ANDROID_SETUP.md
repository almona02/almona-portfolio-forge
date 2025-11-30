# Quick Android Setup - Motorola G75

## Option 1: Use Expo Go App (Easiest - No ADB Required) ⭐ RECOMMENDED

This is the fastest way to test your app without setting up Android Studio or ADB.

### Steps:

1. **Install Expo Go on your Motorola G75:**
   - Open Google Play Store
   - Search for "Expo Go"
   - Install the app

2. **Start the development server:**
   ```bash
   cd fabricator-mobile
   npm start
   ```

3. **Connect to the same WiFi network:**
   - Make sure your phone and computer are on the same WiFi network

4. **Scan the QR code:**
   - Open Expo Go app on your phone
   - Tap "Scan QR code"
   - Point camera at the QR code in terminal/browser
   - App will load automatically!

**That's it!** No ADB, no drivers, no complicated setup.

---

## Option 2: Set Up ADB (For Direct USB Connection)

If you want to use USB connection instead:

### Install Android Platform Tools

**Windows:**

1. Download Android Platform Tools:
   - Visit: https://developer.android.com/tools/releases/platform-tools
   - Download for Windows
   - Extract to a folder (e.g., `C:\platform-tools`)

2. Add to PATH:
   - Open System Properties > Environment Variables
   - Edit "Path" variable
   - Add: `C:\platform-tools`
   - Restart terminal

3. Verify installation:
   ```bash
   adb version
   ```

**Or install Android Studio:**
- Download from: https://developer.android.com/studio
- During installation, it will set up ADB automatically
- ADB will be in: `C:\Users\YourName\AppData\Local\Android\Sdk\platform-tools`

### Enable USB Debugging on Motorola G75

1. **Settings > System > Developer Options**
2. Enable these options:
   - ✅ USB Debugging
   - ✅ USB Debugging (Security Settings)
   - ✅ Install via USB
3. Set **USB Configuration** to **File Transfer (MTP)**

### Connect Device

1. Connect phone via USB
2. On phone: Tap "Allow" when prompted for USB debugging
3. Check connection:
   ```bash
   adb devices
   ```
4. Should show: `XXXXXXXX    device`

### Run App

```bash
cd fabricator-mobile
npm start
# Press 'a' for Android
```

---

## Troubleshooting

### Expo Go Not Connecting

1. **Same WiFi network:**
   - Phone and computer must be on same network
   - Try disabling VPN if active

2. **Firewall blocking:**
   - Allow Node.js/Expo through Windows Firewall
   - Port 8081 should be accessible

3. **Try tunnel mode:**
   ```bash
   npm start -- --tunnel
   ```
   This uses Expo's servers (slower but more reliable)

### USB Connection Issues

1. **Install Motorola USB Drivers:**
   - Download from Motorola support site
   - Install and restart computer

2. **Try different USB port:**
   - Use USB 2.0 port if available
   - Avoid USB hubs

3. **Check USB mode:**
   - Pull down notification shade on phone
   - Tap USB notification
   - Select "File Transfer" or "MTP"

---

## Recommended: Use Expo Go

For development, **Expo Go is recommended** because:
- ✅ No setup required
- ✅ Works wirelessly
- ✅ Fast iteration
- ✅ Easy to share with team

You can switch to development build later if you need custom native code.

---

## Next Steps

1. Install Expo Go app
2. Run `npm start`
3. Scan QR code
4. Start developing! 🚀

