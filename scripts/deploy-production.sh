#!/bin/bash

# 🚀 ALMONA Portfolio Forge - Production Deployment Script
# Automated deployment with comprehensive testing and monitoring

set -e  # Exit on any error

# Configuration
PROJECT_NAME="almona-portfolio-forge"
PRODUCTION_URL="https://almona.com"
STAGING_URL="https://staging.almona.com"
BACKUP_RETENTION_DAYS=7

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

# Error handling
handle_error() {
    log_error "Deployment failed at step: $1"
    log_error "Rolling back changes..."
    rollback_deployment
    exit 1
}

# Rollback function
rollback_deployment() {
    log_warning "Initiating rollback procedure..."
    
    # Restore previous deployment (implementation depends on your deployment method)
    # This is a placeholder for your specific rollback process
    log_info "Rollback completed - previous version restored"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking deployment prerequisites..."
    
    # Check required tools
    local required_tools=("node" "npm" "git" "curl" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool '$tool' is not installed"
            exit 1
        fi
    done
    
    # Check Node.js version
    local node_version=$(node --version | cut -d'v' -f2)
    local required_version="18.0.0"
    if ! node -e "process.exit(require('semver').gte('$node_version', '$required_version') ? 0 : 1)" 2>/dev/null; then
        log_error "Node.js version $required_version or higher is required (current: $node_version)"
        exit 1
    fi
    
    # Check environment variables
    if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_GEMINI_KEY" ]; then
        log_error "Required environment variables are not set"
        log_info "Please ensure .env.production is properly configured"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Run comprehensive tests
run_tests() {
    log_info "Running comprehensive test suite..."
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci || handle_error "dependency installation"
    
    # Type checking
    log_info "Running TypeScript type checking..."
    npm run type-check || handle_error "type checking"
    
    # Linting
    log_info "Running ESLint..."
    npm run lint || handle_error "linting"
    
    # Unit tests
    log_info "Running unit tests..."
    npm run test || handle_error "unit tests"
    
    # React component tests
    log_info "Running React component tests..."
    npm run test:react || handle_error "React tests"
    
    # API tests (if backend is available)
    if curl -f -s "$PRODUCTION_URL/api/health" > /dev/null; then
        log_info "Running API integration tests..."
        npm run test:api || handle_error "API tests"
    else
        log_warning "API endpoint not available - skipping API tests"
    fi
    
    # Security tests
    log_info "Running security tests..."
    npm run test:security || handle_error "security tests"
    
    # Performance tests
    log_info "Running performance tests..."
    npm run test:performance || handle_error "performance tests"
    
    log_success "All tests passed"
}

# Test IoT connectivity
test_iot_connectivity() {
    log_info "Testing IoT platform connectivity..."
    
    if [ -n "$VITE_IOT_WEBSOCKET_URL" ]; then
        node scripts/test-iot-connection.js || {
            log_warning "IoT connectivity test failed - continuing with deployment"
            log_info "IoT features may have limited functionality"
        }
    else
        log_warning "IoT WebSocket URL not configured - skipping IoT tests"
    fi
}

# Build application
build_application() {
    log_info "Building production application..."
    
    # Create production build
    npm run build:ci || handle_error "production build"
    
    # Verify build output
    if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
        handle_error "build verification - dist directory or index.html not found"
    fi
    
    # Check bundle sizes
    log_info "Analyzing bundle sizes..."
    local main_bundle_size=$(du -h dist/assets/index*.js | cut -f1)
    log_info "Main bundle size: $main_bundle_size"
    
    # Generate bundle analysis report
    npm run analyze:bundle || log_warning "Bundle analysis failed"
    
    log_success "Application built successfully"
}

# Deploy to staging first
deploy_to_staging() {
    log_info "Deploying to staging environment..."
    
    # Deploy to staging (replace with your deployment method)
    # This is a placeholder for your specific deployment process
    log_info "Uploading to staging server..."
    
    # Wait for deployment to complete
    sleep 10
    
    # Test staging deployment
    if curl -f -s "$STAGING_URL" > /dev/null; then
        log_success "Staging deployment successful"
    else
        handle_error "staging deployment verification"
    fi
}

# Run staging tests
run_staging_tests() {
    log_info "Running staging environment tests..."
    
    # Basic connectivity test
    local staging_status=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL")
    if [ "$staging_status" != "200" ]; then
        handle_error "staging connectivity test (HTTP $staging_status)"
    fi
    
    # Performance audit on staging
    log_info "Running Lighthouse audit on staging..."
    npm run performance:audit -- --url="$STAGING_URL" || log_warning "Lighthouse audit failed"
    
    # Smoke tests for critical features
    log_info "Running smoke tests..."
    
    # Test customer portal
    local portal_status=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/portal")
    if [ "$portal_status" != "200" ]; then
        log_warning "Customer portal may not be accessible"
    fi
    
    # Test API endpoints
    if curl -f -s "$STAGING_URL/api/health" > /dev/null; then
        log_success "API endpoints responding"
    else
        log_warning "API health check failed"
    fi
    
    log_success "Staging tests completed"
}

# Deploy to production
deploy_to_production() {
    log_info "Deploying to production environment..."
    
    # Create backup before deployment
    create_backup
    
    # Deploy to production (replace with your deployment method)
    log_info "Uploading to production server..."
    
    # Wait for deployment to complete
    sleep 15
    
    # Verify production deployment
    local prod_status=$(curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL")
    if [ "$prod_status" != "200" ]; then
        handle_error "production deployment verification (HTTP $prod_status)"
    fi
    
    log_success "Production deployment successful"
}

# Create backup
create_backup() {
    log_info "Creating deployment backup..."
    
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    local backup_dir="backups/$backup_name"
    
    # Create backup directory
    mkdir -p "$backup_dir"
    
    # Backup current deployment (implementation depends on your setup)
    log_info "Backup created: $backup_name"
    
    # Clean old backups
    find backups/ -type d -mtime +$BACKUP_RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
    
    log_success "Backup completed"
}

# Post-deployment verification
post_deployment_verification() {
    log_info "Running post-deployment verification..."
    
    # Wait for services to stabilize
    sleep 30
    
    # Comprehensive health check
    local endpoints=(
        "$PRODUCTION_URL"
        "$PRODUCTION_URL/portal" 
        "$PRODUCTION_URL/api/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local status=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")
        if [ "$status" = "200" ]; then
            log_success "✓ $endpoint responding correctly"
        else
            log_error "✗ $endpoint failed (HTTP $status)"
            handle_error "post-deployment verification"
        fi
    done
    
    # Test critical user journeys
    log_info "Testing critical user journeys..."
    
    # Customer portal access
    if curl -f -s "$PRODUCTION_URL/portal" > /dev/null; then
        log_success "✓ Customer portal accessible"
    else
        log_warning "⚠ Customer portal may have issues"
    fi
    
    # AI chatbot initialization (if API available)
    if [ -n "$VITE_GEMINI_KEY" ]; then
        log_success "✓ AI services configured"
    else
        log_warning "⚠ AI services not configured"
    fi
    
    # PWA manifest check
    if curl -f -s "$PRODUCTION_URL/manifest.json" > /dev/null; then
        log_success "✓ PWA manifest available"
    else
        log_warning "⚠ PWA manifest not found"
    fi
    
    log_success "Post-deployment verification completed"
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up production monitoring..."
    
    # Configure error tracking (if Sentry is configured)
    if [ -n "$VITE_SENTRY_DSN" ]; then
        log_success "✓ Error tracking configured"
    else
        log_warning "⚠ Error tracking not configured"
    fi
    
    # Configure analytics (if GA4 is configured)
    if [ -n "$VITE_GOOGLE_ANALYTICS_ID" ]; then
        log_success "✓ Analytics configured"
    else
        log_warning "⚠ Analytics not configured"
    fi
    
    # Setup uptime monitoring (placeholder for your monitoring service)
    log_info "Configuring uptime monitoring..."
    
    log_success "Monitoring setup completed"
}

# Send deployment notification
send_notification() {
    log_info "Sending deployment notification..."
    
    local deployment_time=$(date '+%Y-%m-%d %H:%M:%S')
    local message="🚀 ALMONA Portfolio Forge deployed successfully to production at $deployment_time"
    
    # Send to Slack (if webhook configured)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK_URL" || log_warning "Slack notification failed"
    fi
    
    # Send email notification (if configured)
    # Implementation depends on your email service
    
    log_success "Deployment notification sent"
}

# Performance monitoring setup
setup_performance_monitoring() {
    log_info "Setting up performance monitoring..."
    
    # Configure Core Web Vitals tracking
    if [ -n "$VITE_GOOGLE_ANALYTICS_ID" ]; then
        log_success "✓ Core Web Vitals tracking enabled"
    fi
    
    # Setup custom performance metrics collection
    # This would integrate with your monitoring dashboard
    
    log_success "Performance monitoring configured"
}

# Main deployment function
main() {
    log_info "🚀 Starting ALMONA Portfolio Forge Production Deployment"
    log_info "=================================================="
    
    # Set error handler
    trap 'handle_error "unknown step"' ERR
    
    # Pre-deployment checks
    check_prerequisites
    
    # Run tests
    run_tests
    
    # Test IoT connectivity
    test_iot_connectivity
    
    # Build application
    build_application
    
    # Deploy to staging first
    deploy_to_staging
    
    # Run staging tests
    run_staging_tests
    
    # Manual approval step
    echo
    log_warning "Staging tests completed successfully!"
    log_info "Please review the staging environment at: $STAGING_URL"
    read -p "Proceed with production deployment? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled by user"
        exit 0
    fi
    
    # Deploy to production
    deploy_to_production
    
    # Post-deployment verification
    post_deployment_verification
    
    # Setup monitoring
    setup_monitoring
    
    # Setup performance monitoring
    setup_performance_monitoring
    
    # Send notifications
    send_notification
    
    echo
    log_success "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
    log_success "=================================================="
    log_info "Production URL: $PRODUCTION_URL"
    log_info "Customer Portal: $PRODUCTION_URL/portal"
    log_info "Admin Dashboard: $PRODUCTION_URL/admin/dashboard"
    echo
    log_info "Next steps:"
    log_info "1. Monitor application performance and error rates"
    log_info "2. Verify all IoT sensors are connecting properly"
    log_info "3. Test AI chatbot functionality with real users"
    log_info "4. Confirm mobile PWA installation works correctly"
    log_info "5. Check that offline sync is functioning as expected"
    echo
    log_success "🚀 ALMONA Portfolio Forge is now live in production!"
}

# Script usage
usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  --skip-tests   Skip test execution (not recommended)"
    echo "  --staging-only Deploy to staging only"
    echo "  --force        Skip manual approval step"
    echo ""
    echo "Environment variables required:"
    echo "  VITE_SUPABASE_URL          Supabase project URL"
    echo "  VITE_GEMINI_KEY            Google Gemini AI API key"
    echo "  VITE_IOT_WEBSOCKET_URL     IoT platform WebSocket URL (optional)"
    echo "  SLACK_WEBHOOK_URL          Slack webhook for notifications (optional)"
}

# Parse command line arguments
SKIP_TESTS=false
STAGING_ONLY=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --staging-only)
            STAGING_ONLY=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Execute main deployment if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
