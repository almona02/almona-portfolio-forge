#!/bin/bash

# Calibration Safety Net - Rollback Script
# ========================================
# Safely rolls back the calibration safety net deployment.

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Confirmation prompt
confirm_rollback() {
    log_warning "⚠️  WARNING: This will roll back the Calibration Safety Net deployment"
    log_warning "This will:"
    log_warning "  - Drop all calibration functions"
    log_warning "  - Drop all calibration tables"
    log_warning "  - DELETE ALL CALIBRATION DATA"
    echo ""
    read -p "Type 'ROLLBACK' to confirm: " confirmation
    
    if [ "$confirmation" != "ROLLBACK" ]; then
        log_info "Rollback cancelled"
        exit 0
    fi
}

# Rollback migrations
rollback_migrations() {
    log_info "Rolling back migrations..."
    
    # Check database connectivity
    if [ -z "$SUPABASE_DB_URL" ]; then
        log_error "SUPABASE_DB_URL environment variable is not set"
        exit 1
    fi
    
    # Drop functions first (036)
    log_info "Dropping transaction functions..."
    psql "$SUPABASE_DB_URL" <<EOF
-- Drop functions
DROP FUNCTION IF EXISTS get_calibration_baseline(VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS log_calibration_anomaly(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, JSONB, JSONB, INTEGER);
DROP FUNCTION IF EXISTS freeze_calibration(VARCHAR, VARCHAR, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS certify_calibration_baseline(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, DECIMAL, DECIMAL, VARCHAR, INTEGER, VARCHAR, JSONB);
EOF
    log_success "Functions dropped"
    
    # Drop tables (035)
    log_info "Dropping tables..."
    psql "$SUPABASE_DB_URL" <<EOF
-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS public.calibration_status_registry CASCADE;
DROP TABLE IF EXISTS public.calibration_anomalies CASCADE;
DROP TABLE IF EXISTS public.calibration_baselines CASCADE;

-- Drop ENUM type
DROP TYPE IF EXISTS calibration_status CASCADE;
EOF
    log_success "Tables dropped"
    
    log_success "Rollback complete"
}

# Main rollback flow
main() {
    echo ""
    echo "================================================"
    echo "  Calibration Safety Net Rollback"
    echo "================================================"
    echo ""
    
    confirm_rollback
    rollback_migrations
    
    echo ""
    log_success "✅ Rollback Complete!"
    echo "================================================"
    echo ""
}

# Execute main
main

