# Installing WebP Tools on Windows (Without winget)

## Option 1: Manual Download (EASIEST - 2 Minutes)

### Step 1: Download WebP Tools
1. Go to: https://developers.google.com/speed/webp/download
2. Scroll to **"Precompiled Utilities"**
3. Download: **"Windows x64"** (or x32 if 32-bit)
4. Extract the ZIP file

### Step 2: Install
1. Extract to: `C:\Program Files\WebP\`
2. Copy the `bin` folder path: `C:\Program Files\WebP\bin`

### Step 3: Add to PATH
1. Press `Win + R`
2. Type: `sysdm.cpl` → Enter
3. Go to **"Advanced"** tab
4. Click **"Environment Variables"**
5. Under **"System variables"**, find **"Path"**
6. Click **"Edit"** → **"New"**
7. Paste: `C:\Program Files\WebP\bin`
8. Click **"OK"** on all windows

### Step 4: Verify
**Close VS Code terminal, open NEW one**, then:
```powershell
cwebp -version
# Should show: WebP Encoder version 1.3.2
```

---

## Option 2: Chocolatey (If Installed)

```powershell
choco install webp -y
```

**Check if Chocolatey is installed**:
```powershell
choco --version
```

If not installed, see: https://chocolatey.org/install

---

## Option 3: Use Squoosh.app (NO INSTALLATION)

**For immediate use, skip installation entirely**:

1. Go to: https://squoosh.app
2. Convert your 5 images manually
3. Save to `public/images/`
4. Update code (see `QUICK_REFERENCE.md`)

**This is actually faster for a one-time conversion!**

---

## Quick Test After Installation

```powershell
# Close terminal, open NEW one
cwebp -version

# If it works, run:
.\scripts\optimize-images.ps1
```

---

## Troubleshooting

### "cwebp not found" after adding to PATH

**Solution**: 
1. Close ALL VS Code windows
2. Restart VS Code
3. Open NEW terminal
4. Try again

### Still not working?

**Use Squoosh.app** - it's actually faster for this one-time task:
- No installation needed
- Works in browser
- 2 minutes total
- Same result

---

## Recommendation

**For this task**: Use **Squoosh.app** (fastest, no setup)

**For future automation**: Install WebP tools manually (Option 1)

