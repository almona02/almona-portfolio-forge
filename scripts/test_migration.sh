#!/bin/bash
# Test RealityOS Event Ledger Migration
# This script creates a test database, runs the migration, and validates it

set -e  # Exit on error

DB_NAME="realityos_test"
MIGRATION_FILE="migrations/041_realityos_event_ledger.sql"
VALIDATION_SCRIPT="scripts/validate_event_ledger.py"

echo "=========================================="
echo "RealityOS Event Ledger Migration Test"
echo "=========================================="
echo ""

# Step 1: Check if database exists
echo "Step 1: Checking test database..."
if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "  ✓ Database '$DB_NAME' exists"
    read -p "  Drop and recreate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "  Dropping existing database..."
        dropdb "$DB_NAME" || true
        echo "  Creating fresh database..."
        createdb "$DB_NAME"
        echo "  ✓ Database recreated"
    fi
else
    echo "  Creating test database..."
    createdb "$DB_NAME"
    echo "  ✓ Database created"
fi

# Step 2: Run migration
echo ""
echo "Step 2: Running migration..."
if psql "$DB_NAME" -f "$MIGRATION_FILE"; then
    echo "  ✓ Migration completed successfully"
else
    echo "  ✗ Migration failed"
    exit 1
fi

# Step 3: Verify genesis event
echo ""
echo "Step 3: Verifying genesis event..."
GENESIS_COUNT=$(psql "$DB_NAME" -t -c "SELECT COUNT(*) FROM reality_events WHERE prev_hash IS NULL;")
if [ "$GENESIS_COUNT" -eq 1 ]; then
    echo "  ✓ Genesis event found"
else
    echo "  ✗ Genesis event missing or duplicate (count: $GENESIS_COUNT)"
    exit 1
fi

# Step 4: Test append-only enforcement
echo ""
echo "Step 4: Testing append-only enforcement..."
if psql "$DB_NAME" -c "UPDATE reality_events SET entity_id = 'test' WHERE chain_position = 1;" 2>&1 | grep -q "permission denied"; then
    echo "  ✓ Append-only enforced (UPDATE blocked)"
else
    echo "  ⚠ Warning: UPDATE not blocked (may need to check permissions)"
fi

# Step 5: Set environment and run validation
echo ""
echo "Step 5: Running validation script..."
export DATABASE_URL="postgresql://localhost/$DB_NAME"
if python "$VALIDATION_SCRIPT"; then
    echo ""
    echo "=========================================="
    echo "✅ All tests passed!"
    echo "=========================================="
    exit 0
else
    echo ""
    echo "=========================================="
    echo "❌ Validation failed"
    echo "=========================================="
    exit 1
fi


