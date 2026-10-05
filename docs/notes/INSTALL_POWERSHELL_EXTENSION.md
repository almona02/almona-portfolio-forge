# Install VS Code PowerShell Extension

## Quick Installation (2 Minutes)

### Step 1: Open VS Code Extensions
- Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac)
- Or click the Extensions icon in the sidebar

### Step 2: Search and Install
1. Search: **`PowerShell`**
2. Find: **"PowerShell" by Microsoft** (official, blue checkmark)
3. Click **Install**

### Step 3: Reload VS Code
- Click **Reload** when prompted
- Or press `Ctrl+Shift+P` → type "Reload Window"

### Step 4: Verify Installation
1. Open terminal in VS Code (`Ctrl+``)
2. Type: `pwsh` or `powershell`
3. Should see PowerShell prompt

## Benefits

✅ Syntax highlighting for `.ps1` files  
✅ IntelliSense and code completion  
✅ Integrated debugging  
✅ Better error messages  
✅ Script execution support  

## Test the Extension

After installation, open `scripts/optimize-images.ps1`:
- Should see syntax highlighting
- Hover over commands for help
- Right-click → "Run PowerShell Script" to execute

## For WebP Conversion

**However**, for this specific task, **Squoosh.app is still easier**:

- ✅ No installation needed
- ✅ Works in any browser
- ✅ Visual quality preview
- ✅ Faster (2 minutes vs 10 minutes)

**Recommendation**:
- **For WebP conversion now**: Use Squoosh.app
- **For future scripts**: PowerShell extension is useful

## Alternative: Use Git Bash

Since you have Git installed, you can also use Git Bash:

```bash
# Git Bash can run bash scripts
./scripts/optimize-images.sh
```

No PowerShell extension needed for this!

---

**Bottom Line**: Install PowerShell extension for future development, but use Squoosh.app for WebP conversion right now. 🚀

