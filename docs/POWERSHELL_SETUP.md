# PowerShell Setup Guide for WebP Conversion

## Quick Setup Options

### Option 1: VS Code PowerShell Extension (RECOMMENDED)

**Best for**: Integrated development experience

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search: **"PowerShell"** by Microsoft
4. Click **Install**
5. Reload VS Code

**Benefits**:
- Syntax highlighting
- IntelliSense
- Integrated terminal
- Debugging support

### Option 2: PowerShell Core (Standalone)

**Best for**: Running scripts from any terminal

**Windows (PowerShell 7+)**:
```powershell
# Check if installed
pwsh --version

# If not installed, download from:
# https://github.com/PowerShell/PowerShell/releases
```

**Install via winget**:
```powershell
winget install --id Microsoft.PowerShell
```

### Option 3: Use Git Bash (Already Available)

**Best for**: Quick execution without setup

Since you have Git installed, you can use Git Bash:

```bash
# Git Bash can run the bash script
./scripts/optimize-images.sh
```

## Recommended: VS Code PowerShell Extension

### Installation Steps

1. **Open VS Code**
2. **Install Extension**:
   - Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac)
   - Search: `PowerShell`
   - Install: **"PowerShell" by Microsoft** (official)

3. **Verify Installation**:
   - Open terminal in VS Code (`Ctrl+``)
   - Type: `pwsh` or `powershell`
   - Should see PowerShell prompt

4. **Run Script**:
   ```powershell
   # In VS Code terminal
   .\scripts\optimize-images.ps1
   ```

### VS Code PowerShell Extension Features

- ✅ Syntax highlighting for `.ps1` files
- ✅ Code completion and IntelliSense
- ✅ Integrated debugging
- ✅ Integrated terminal
- ✅ Script execution support
- ✅ Error highlighting

## Alternative: Use Online Tool (No Installation)

**Easiest Option**: Use Squoosh.app (no PowerShell needed)

1. Go to https://squoosh.app
2. Upload images
3. Convert to WebP
4. Download
5. Done!

**No PowerShell required** - works in any browser.

## Quick Test

After installing PowerShell extension:

```powershell
# Test PowerShell is working
Get-Command cwebp

# If cwebp not found, you'll need WebP tools
# Or just use Squoosh.app instead
```

## Recommended Approach

**For WebP Conversion**: Use **Squoosh.app** (easiest, no setup)

**For Future Scripts**: Install **VS Code PowerShell Extension** (useful for development)

## Troubleshooting

### PowerShell Script Won't Run

**Error**: "Execution policy restricted"

**Fix**:
```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### WebP Tools Not Found

**Solution**: Use Squoosh.app instead (no tools needed)

Or install WebP tools:
- Windows: Download from https://developers.google.com/speed/webp/download
- Or use ImageMagick: `choco install imagemagick`

## Final Recommendation

**For this task (WebP conversion)**: 
- ✅ Use **Squoosh.app** (30 seconds, no installation)
- ✅ Manually update image references

**For future development**:
- ✅ Install **VS Code PowerShell Extension** (useful for other scripts)

