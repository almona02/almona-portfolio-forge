# Image Optimization Script for WebP Conversion (PowerShell)
# Converts JPG/PNG images to WebP format for better performance
# Usage: .\scripts\optimize-images.ps1

Write-Host "🖼️  Starting image optimization to WebP..." -ForegroundColor Cyan

# Check if ImageMagick or WebP tools are available
$hasImageMagick = Get-Command magick -ErrorAction SilentlyContinue
$hasCwebp = Get-Command cwebp -ErrorAction SilentlyContinue

# Try to find cwebp in common installation paths
if (-not $hasCwebp) {
    $webpPaths = @(
        "$env:ProgramFiles\WebP\bin\cwebp.exe",
        "$env:ProgramFiles(x86)\WebP\bin\cwebp.exe",
        "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Google.WebP*\bin\cwebp.exe"
    )
    
    foreach ($path in $webpPaths) {
        if (Test-Path $path) {
            $env:Path += ";$([System.IO.Path]::GetDirectoryName($path))"
            $hasCwebp = Get-Command cwebp -ErrorAction SilentlyContinue
            if ($hasCwebp) { break }
        }
    }
}

if (-not $hasImageMagick -and -not $hasCwebp) {
    Write-Host "❌ WebP conversion tools not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Installing WebP tools via winget..." -ForegroundColor Yellow
    try {
        winget install Google.WebP --accept-source-agreements --accept-package-agreements --silent
        Start-Sleep -Seconds 3
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        $hasCwebp = Get-Command cwebp -ErrorAction SilentlyContinue
        if (-not $hasCwebp) {
            Write-Host "⚠️  Installation may require restarting terminal. Trying common paths..." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Auto-installation failed. Please install manually:" -ForegroundColor Red
        Write-Host "   winget install Google.WebP" -ForegroundColor Yellow
        Write-Host "   Or download from: https://developers.google.com/speed/webp/download" -ForegroundColor Yellow
        exit 1
    }
}

# Directories to process
$dirs = @(
    "public\images",
    "src\assets\images",
    "srcassetsimages"
)

$converted = 0
$skipped = 0
$errors = 0

# Function to convert image
function Convert-ToWebP {
    param($file)
    
    $base = [System.IO.Path]::GetFileNameWithoutExtension($file)
    $dir = [System.IO.Path]::GetDirectoryName($file)
    $ext = [System.IO.Path]::GetExtension($file).ToLower()
    $webpFile = Join-Path $dir "$base.webp"
    
    # Skip if WebP already exists
    if (Test-Path $webpFile) {
        Write-Host "⏭️  Skipping $file (WebP already exists)" -ForegroundColor Yellow
        $script:skipped++
        return
    }
    
    # Convert using available tool
    if ($hasImageMagick) {
        Write-Host "🔄 Converting $file to WebP..." -ForegroundColor Cyan
        try {
            if ($ext -in @('.jpg', '.jpeg')) {
                magick "$file" -quality 85 -define webp:method=6 "$webpFile"
            } else {
                magick "$file" -quality 85 -define webp:lossless=true "$webpFile"
            }
            Write-Host "✅ Created $webpFile" -ForegroundColor Green
            $script:converted++
        } catch {
            Write-Host "❌ Failed to convert $file" -ForegroundColor Red
            $script:errors++
        }
    } elseif ($hasCwebp) {
        Write-Host "🔄 Converting $file to WebP..." -ForegroundColor Cyan
        try {
            if ($ext -in @('.jpg', '.jpeg')) {
                & cwebp -q 85 -m 6 "$file" -o "$webpFile"
            } else {
                & cwebp -q 85 -m 6 -lossless "$file" -o "$webpFile"
            }
            Write-Host "✅ Created $webpFile" -ForegroundColor Green
            $script:converted++
        } catch {
            Write-Host "❌ Failed to convert $file" -ForegroundColor Red
            $script:errors++
        }
    }
}

# Process each directory
foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        Write-Host ""
        Write-Host "📁 Processing $dir..." -ForegroundColor Cyan
        Get-ChildItem -Path $dir -Include *.jpg,*.jpeg,*.png -Recurse -File | ForEach-Object {
            Convert-ToWebP $_.FullName
        }
    } else {
        Write-Host "⚠️  Directory $dir not found, skipping..." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 Conversion Summary:" -ForegroundColor Cyan
Write-Host "   ✅ Converted: $converted" -ForegroundColor Green
Write-Host "   ⏭️  Skipped: $skipped" -ForegroundColor Yellow
Write-Host "   ❌ Errors: $errors" -ForegroundColor Red
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Green
Write-Host "   1. Review converted WebP files"
Write-Host "   2. Update image src attributes in components"
Write-Host "   3. Test in browser to verify quality"
Write-Host "   4. Deploy and monitor performance improvements"
Write-Host ""

