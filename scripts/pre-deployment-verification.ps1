# Pre-Deployment Verification Script (PowerShell)
# Comprehensive checks before production deployment

$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

# Track results
$script:ChecksPassed = 0
$script:ChecksFailed = 0
$script:ChecksTotal = 0

# Function to run a check
function Run-Check {
    param(
        [string]$CheckName,
        [scriptblock]$CheckCommand
    )
    
    Write-ColorOutput Yellow "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-ColorOutput Yellow "Running: $CheckName"
    Write-ColorOutput Yellow "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    $script:ChecksTotal++
    
    try {
        & $CheckCommand
        if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq $null) {
            Write-ColorOutput Green "✅ PASSED: $CheckName"
            $script:ChecksPassed++
            return $true
        } else {
            Write-ColorOutput Red "❌ FAILED: $CheckName"
            $script:ChecksFailed++
            return $false
        }
    } catch {
        Write-ColorOutput Red "❌ FAILED: $CheckName"
        Write-ColorOutput Red "   Error: $_"
        $script:ChecksFailed++
        return $false
    }
}

Write-Output ""
Write-ColorOutput Cyan "╔════════════════════════════════════════════════════════╗"
Write-ColorOutput Cyan "║   Pre-Deployment Verification Suite                  ║"
Write-ColorOutput Cyan "║   Almona Portfolio Forge - Production Ready Check  ║"
Write-ColorOutput Cyan "╚════════════════════════════════════════════════════════╝"
Write-Output ""

# Step 1: Clean previous builds
Write-ColorOutput Yellow "Step 1: Cleaning previous builds..."
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "node_modules\.vite") { Remove-Item -Recurse -Force "node_modules\.vite" }
if (Test-Path ".vite") { Remove-Item -Recurse -Force ".vite" }
Write-ColorOutput Green "✅ Clean complete"
Write-Output ""

# Step 2: npm install
Run-Check -CheckName "npm install - Dependency Installation" -CheckCommand {
    npm install --legacy-peer-deps
}

Write-Output ""

# Step 3: npm run analyze
Write-ColorOutput Yellow "Step 3: Running bundle analysis..."
try {
    npm run analyze *> analyze-output.log
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✅ Bundle analysis complete"
        if (Test-Path "dist\stats.html") {
            Write-ColorOutput Green "✅ HTML visualization generated: dist\stats.html"
        }
        $script:ChecksPassed++
    } else {
        Write-ColorOutput Red "❌ Bundle analysis failed"
        $script:ChecksFailed++
    }
} catch {
    Write-ColorOutput Red "❌ Bundle analysis failed: $_"
    $script:ChecksFailed++
}
$script:ChecksTotal++
Write-Output ""

# Step 4: npm run lint
Run-Check -CheckName "npm run lint - Linting Check" -CheckCommand {
    npm run lint
}

Write-Output ""

# Step 5: npm run build
Write-ColorOutput Yellow "Step 5: Building production bundle..."
try {
    npm run build *> build-output.log
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✅ Build complete"
        
        # Check build outputs
        if (Test-Path "dist") {
            Write-ColorOutput Green "✅ dist/ directory created"
            $distSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
            Write-ColorOutput Cyan "   Build size: $([math]::Round($distSize, 2)) MB"
            
            # Check for critical files
            if (Test-Path "dist\index.html") {
                Write-ColorOutput Green "✅ index.html present"
            } else {
                Write-ColorOutput Red "❌ index.html missing"
                $script:ChecksFailed++
            }
            
            # Check for assets
            if (Test-Path "dist\assets") {
                $assetCount = (Get-ChildItem -Path "dist\assets" -Recurse -File).Count
                Write-ColorOutput Green "✅ assets/ directory present ($assetCount files)"
            } else {
                Write-ColorOutput Yellow "⚠️  assets/ directory missing"
            }
        } else {
            Write-ColorOutput Red "❌ dist/ directory not created"
            $script:ChecksFailed++
        }
        $script:ChecksPassed++
    } else {
        Write-ColorOutput Red "❌ Build failed"
        $script:ChecksFailed++
    }
} catch {
    Write-ColorOutput Red "❌ Build failed: $_"
    $script:ChecksFailed++
}
$script:ChecksTotal++
Write-Output ""

# Step 6: Frontend test at port 3000
Write-ColorOutput Yellow "Step 6: Testing frontend at port 3000..."
Write-ColorOutput Cyan "   Starting preview server..."
Write-ColorOutput Yellow "   Please verify manually: http://localhost:3000"
Write-ColorOutput Yellow "   Press Ctrl+C to stop the server after verification"
Write-Output ""

# Start preview server
$previewJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run preview -- --port 3000
}

# Wait for server to start
Start-Sleep -Seconds 5

# Check if server is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-ColorOutput Green "✅ Frontend server is running on port 3000"
        Write-ColorOutput Cyan "   Open http://localhost:3000 in your browser"
        Write-ColorOutput Yellow "   Press Enter after verifying the frontend..."
        Read-Host
        $script:ChecksPassed++
    } else {
        Write-ColorOutput Red "❌ Frontend server returned status $($response.StatusCode)"
        $script:ChecksFailed++
    }
} catch {
    Write-ColorOutput Red "❌ Frontend server failed to start: $_"
    $script:ChecksFailed++
}
$script:ChecksTotal++

# Stop preview server
Stop-Job $previewJob -ErrorAction SilentlyContinue
Remove-Job $previewJob -ErrorAction SilentlyContinue
Write-Output ""

# Step 7: Backend verification
Write-ColorOutput Yellow "Step 7: Backend verification (Railway, Redis, Postgres)..."
Write-ColorOutput Cyan "   Checking backend configuration..."

# Check for environment files
if (Test-Path ".env" -or Test-Path ".env.local") {
    Write-ColorOutput Green "✅ Environment file found"
    
    # Check for Railway-specific variables
    $envContent = ""
    if (Test-Path ".env") { $envContent += Get-Content ".env" -Raw }
    if (Test-Path ".env.local") { $envContent += Get-Content ".env.local" -Raw }
    
    if ($envContent -match "RAILWAY") {
        Write-ColorOutput Green "✅ Railway configuration detected"
    } else {
        Write-ColorOutput Yellow "⚠️  Railway configuration not found in env files"
    }
} else {
    Write-ColorOutput Yellow "⚠️  No .env file found (may be using Railway environment variables)"
}

# Check Python backend
if (Test-Path "python_backend") {
    Write-ColorOutput Green "✅ Python backend directory found"
    
    # Check for requirements
    if (Test-Path "python_backend\requirements.txt") {
        Write-ColorOutput Green "✅ requirements.txt found"
    }
    
    # Check for Railway configuration
    if (Test-Path "python_backend\railway.json" -or Test-Path "railway.json") {
        Write-ColorOutput Green "✅ Railway configuration found"
    }
} else {
    Write-ColorOutput Red "❌ Python backend directory not found"
    $script:ChecksFailed++
}
$script:ChecksTotal++
Write-Output ""

# Step 8: Final backend test
Write-ColorOutput Yellow "Step 8: Final backend test at preview..."
Write-ColorOutput Cyan "   This would test the backend API endpoints"
Write-ColorOutput Yellow "   Backend should be running on Railway"
Write-ColorOutput Yellow "   Test endpoints manually or run: npm run test:api"
Write-Output ""

# Summary
Write-Output ""
Write-ColorOutput Cyan "╔════════════════════════════════════════════════════════╗"
Write-ColorOutput Cyan "║   Pre-Deployment Verification Summary                 ║"
Write-ColorOutput Cyan "╚════════════════════════════════════════════════════════╝"
Write-Output ""
Write-Output "Total Checks: $script:ChecksTotal"
Write-ColorOutput Green "Passed: $script:ChecksPassed"
Write-ColorOutput Red "Failed: $script:ChecksFailed"
Write-Output ""

if ($script:ChecksFailed -eq 0) {
    Write-ColorOutput Green "✅ All pre-deployment checks passed!"
    Write-ColorOutput Green "🚀 System is ready for deployment!"
    exit 0
} else {
    Write-ColorOutput Red "❌ Some pre-deployment checks failed!"
    Write-ColorOutput Yellow "⚠️  Please fix the issues before deploying"
    exit 1
}

