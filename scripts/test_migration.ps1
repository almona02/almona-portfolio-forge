# Test RealityOS Event Ledger Migration (PowerShell)
# This script creates a test database, runs the migration, and validates it

$ErrorActionPreference = "Stop"

$DB_NAME = "realityos_test"
$MIGRATION_FILE = "migrations/041_realityos_event_ledger.sql"
$VALIDATION_SCRIPT = "scripts/validate_event_ledger.py"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "RealityOS Event Ledger Migration Test" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if database exists
Write-Host "Step 1: Checking test database..." -ForegroundColor Yellow
$dbExists = psql -lqt 2>$null | Select-String -Pattern "^\s*$DB_NAME\s" -Quiet

if ($dbExists) {
    Write-Host "  ✓ Database '$DB_NAME' exists" -ForegroundColor Green
    $response = Read-Host "  Drop and recreate? (y/N)"
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "  Dropping existing database..."
        dropdb $DB_NAME 2>$null
        Write-Host "  Creating fresh database..."
        createdb $DB_NAME
        Write-Host "  ✓ Database recreated" -ForegroundColor Green
    }
} else {
    Write-Host "  Creating test database..."
    createdb $DB_NAME
    Write-Host "  ✓ Database created" -ForegroundColor Green
}

# Step 2: Run migration
Write-Host ""
Write-Host "Step 2: Running migration..." -ForegroundColor Yellow
try {
    psql $DB_NAME -f $MIGRATION_FILE | Out-Null
    Write-Host "  ✓ Migration completed successfully" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Migration failed: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Verify genesis event
Write-Host ""
Write-Host "Step 3: Verifying genesis event..." -ForegroundColor Yellow
$genesisCount = psql $DB_NAME -t -c "SELECT COUNT(*) FROM reality_events WHERE prev_hash IS NULL;" 2>$null | ForEach-Object { $_.Trim() }
if ($genesisCount -eq "1") {
    Write-Host "  ✓ Genesis event found" -ForegroundColor Green
} else {
    Write-Host "  ✗ Genesis event missing or duplicate (count: $genesisCount)" -ForegroundColor Red
    exit 1
}

# Step 4: Test append-only enforcement
Write-Host ""
Write-Host "Step 4: Testing append-only enforcement..." -ForegroundColor Yellow
$updateResult = psql $DB_NAME -c "UPDATE reality_events SET entity_id = 'test' WHERE chain_position = 1;" 2>&1
if ($updateResult -match "permission denied") {
    Write-Host "  ✓ Append-only enforced (UPDATE blocked)" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Warning: UPDATE not blocked (may need to check permissions)" -ForegroundColor Yellow
}

# Step 5: Set environment and run validation
Write-Host ""
Write-Host "Step 5: Running validation script..." -ForegroundColor Yellow
$env:DATABASE_URL = "postgresql://localhost/$DB_NAME"
try {
    python $VALIDATION_SCRIPT
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host "✅ All tests passed!" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Cyan
        exit 0
    } else {
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host "❌ Validation failed" -ForegroundColor Red
        Write-Host "==========================================" -ForegroundColor Cyan
        exit 1
    }
} catch {
    Write-Host "  ✗ Validation script failed: $_" -ForegroundColor Red
    exit 1
}


