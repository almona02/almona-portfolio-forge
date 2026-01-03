# Quick Start: Validate Event Ledger
**Time Required:** 10-15 minutes

---

## One-Command Setup (If PostgreSQL is installed)

```bash
# Create database, run migration, and validate (all in one)
createdb realityos_test && \
psql realityos_test -f migrations/041_realityos_event_ledger.sql && \
export DATABASE_URL="postgresql://localhost/realityos_test" && \
python scripts/validate_event_ledger.py
```

---

## Step-by-Step (Recommended for First Time)

### 1. Create Database (30 seconds)
```bash
createdb realityos_test
```

### 2. Run Migration (10 seconds)
```bash
psql realityos_test -f migrations/041_realityos_event_ledger.sql
```

**Verify it worked:**
```bash
psql realityos_test -c "SELECT COUNT(*) FROM reality_events;"
# Should return: 1 (the genesis event)
```

### 3. Set Environment Variable (5 seconds)
```bash
# Linux/Mac
export DATABASE_URL="postgresql://localhost/realityos_test"

# Windows PowerShell
$env:DATABASE_URL="postgresql://localhost/realityos_test"

# Windows CMD
set DATABASE_URL=postgresql://localhost/realityos_test
```

### 4. Run Validation (2 minutes)
```bash
python scripts/validate_event_ledger.py
```

**Expected:** All 5 tests pass ✅

---

## If Validation Fails

### Check Database Connection
```bash
psql realityos_test -c "SELECT 1;"
```

### Check Migration Ran
```bash
psql realityos_test -c "SELECT * FROM reality_events WHERE prev_hash IS NULL;"
# Should show genesis event
```

### Check Environment Variable
```bash
echo $DATABASE_URL  # Linux/Mac
echo %DATABASE_URL%  # Windows
```

---

## Success = Ready for Phase 3

When all tests pass, you're ready to commit and proceed:

```bash
git add .
git commit -m "feat: RealityOS Phase 2 complete - Event Ledger validated"
```

Then proceed to Phase 3: Reality Capture Gateway.


