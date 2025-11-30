# Android Device Setup Guide - Motorola G75

## Step-by-Step Setup for Physical Android Device

### 1. Enable Developer Options (Already Done ✅)
- Settings > About Phone > Tap "Build Number" 7 times
- Developer options should now be enabled

### 2. Enable USB Debugging

On your Motorola G75:

1. Go to **Settings > System > Developer Options**
2. Enable **USB Debugging**
3. Enable **USB Debugging (Security Settings)** if available
4. Enable **Install via USB** (if available)
5. Enable **USB Configuration** and set to **File Transfer (MTP)** or **PTP**

### 3. Connect Device

1. Connect your Motorola G75 to your computer via USB cable
2. On your phone, you should see a prompt: **"Allow USB debugging?"**
3. Check **"Always allow from this computer"**
4. Tap **"Allow"**

### 4. Verify ADB Connection

Run in terminal:
```bash
adb devices
```

You should see:
```
List of devices attached
XXXXXXXX    device
```

If you see `unauthorized`, tap "Allow" on your phone when prompted.

### 5. Install Motorola USB Drivers (Windows)

If device is not detected:

1. Download Motorola USB Drivers:
   - Visit: https://motorola-global-portal.custhelp.com/app/answers/detail/a_id/88481
   - Or search "Motorola USB Driver" on Motorola support site

2. Install the drivers
3. Restart your computer
4. Reconnect device

### 6. Alternative: Use Wireless Debugging (Android 11+)

If USB connection is problematic:

1. On your phone: **Settings > Developer Options > Wireless debugging**
2. Enable **Wireless debugging**
3. Tap **Pair device with pairing code**
4. Note the IP address and port (e.g., 192.168.1.100:12345)
5. Run on computer:
   ```bash
   adb pair <IP>:<PORT>
   ```
   Enter the pairing code when prompted
6. Then connect:
   ```bash
   adb connect <IP>:<PORT>
   ```

### 7. Test with Expo

Once device is detected:

```bash
cd fabricator-mobile
npm start
```

Then press `a` to open on Android, or scan the QR code with Expo Go app.

---

## Troubleshooting

### Device Not Detected

1. **Check USB Cable**
   - Use a data cable (not charging-only)
   - Try a different USB port
   - Try a different cable

2. **Check USB Mode**
   - On phone: Pull down notification shade
   - Tap USB notification
   - Select **File Transfer** or **MTP**

3. **Restart ADB Server**
   ```bash
   adb kill-server
   adb start-server
   adb devices
   ```

4. **Check Device Manager (Windows)**
   - Open Device Manager
   - Look for "Motorola" or "Android" device
   - If it shows with yellow warning, update drivers

### "Unauthorized" Device

1. Revoke USB debugging authorizations:
   - On phone: **Settings > Developer Options > Revoke USB debugging authorizations**
2. Disconnect and reconnect device
3. Tap "Allow" when prompted

### Expo Not Detecting Device

1. Make sure Expo Go app is installed on your phone
2. Ensure device and computer are on same network (for wireless)
3. Try:
   ```bash
   expo start --android
   ```

### Alternative: Use Expo Go App

1. Install **Expo Go** from Google Play Store
2. Start Expo dev server:
   ```bash
   npm start
   ```
3. Scan QR code with Expo Go app
4. App will load on your device

---

## Quick Commands Reference

```bash
# Check connected devices
adb devices

# Restart ADB
adb kill-server && adb start-server

# Install app directly (if using development build)
adb install app.apk

# View device logs
adb logcat

# Forward port for debugging
adb reverse tcp:8081 tcp:8081
```

---

## Motorola-Specific Notes

- Motorola devices sometimes need **Motorola Device Manager** installed
- Some Motorola phones have **Moto Connect** that can interfere - disable it
- Check Motorola support site for latest USB drivers

---

## Next Steps

Once device is connected:
1. Run `npm start` in fabricator-mobile directory
2. Press `a` for Android
3. Or scan QR code with Expo Go app
4. App should load on your Motorola G75!

