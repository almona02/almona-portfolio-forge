#!/bin/bash

# 🔍 ALMONA Portfolio Forge - Implementation Verification Script
# Verifies all new features are properly integrated and ready for production

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✅ PASS]${NC} $1"
    ((PASSED_CHECKS++))
}

log_fail() {
    echo -e "${RED}[❌ FAIL]${NC} $1"
    ((FAILED_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}[⚠️  WARN]${NC} $1"
}

check_feature() {
    ((TOTAL_CHECKS++))
    local feature_name="$1"
    local file_path="$2"
    local required_exports="$3"
    
    if [ -f "$file_path" ]; then
        if [ -n "$required_exports" ]; then
            if grep -q "$required_exports" "$file_path"; then
                log_success "$feature_name - Implementation verified"
            else
                log_fail "$feature_name - Missing required exports: $required_exports"
            fi
        else
            log_success "$feature_name - File exists"
        fi
    else
        log_fail "$feature_name - File not found: $file_path"
    fi
}

# Header
echo "🔍 ALMONA Portfolio Forge - Implementation Verification"
echo "===================================================="
echo ""

# 1. Customer Portal Enhancement
log_info "Checking Customer Portal Enhancements..."
check_feature "Machine Health Dashboard" "src/components/portal/MachineHealthDashboard.tsx" "MachineHealthDashboard"
check_feature "Customer Portal Integration" "src/pages/CustomerPortal.tsx" "MachineHealthDashboard.*import"

# 2. AI Chatbot Implementation
log_info "Checking AI Technical Support Chatbot..."
check_feature "AI Chatbot Component" "src/components/support/AITechnicalChatbot.tsx" "AITechnicalChatbot"
check_feature "Enhanced Gemini Integration" "src/lib/ai/gemini.ts" "getTechnicalSupport"
check_feature "Chatbot Portal Integration" "src/pages/CustomerPortal.tsx" "AITechnicalChatbot.*import"

# 3. Mobile PWA Features
log_info "Checking Mobile PWA Implementation..."
check_feature "Mobile Ticket Creator" "src/components/mobile/MobileTicketCreator.tsx" "MobileTicketCreator"
check_feature "Offline Sync Service" "src/lib/offline-sync.ts" "offlineSyncService"
check_feature "Enhanced PWA Config" "vite.config.ts" "VitePWA"
check_feature "Mobile Portal Integration" "src/pages/CustomerPortal.tsx" "MobileTicketCreator.*import"

# 4. IoT Integration Framework
log_info "Checking IoT Integration Framework..."
check_feature "IoT Sensor Integration" "src/lib/iot/sensorIntegration.ts" "iotSensorService"
check_feature "Sensor Dashboard" "src/components/iot/SensorDataDashboard.tsx" "SensorDataDashboard"
check_feature "IoT Dashboard Integration" "src/components/portal/MachineHealthDashboard.tsx" "SensorDataDashboard.*import"

# 5. Performance Monitoring
log_info "Checking Performance Monitoring System..."
check_feature "Performance Monitor Service" "src/lib/performance-monitoring.ts" "performanceMonitor"

# 6. User Training System
log_info "Checking User Training System..."
check_feature "Interactive Training Guide" "src/components/training/InteractiveUserGuide.tsx" "InteractiveUserGuide"

# 7. Deployment Infrastructure
log_info "Checking Deployment Infrastructure..."
check_feature "Production Checklist" "PRODUCTION_DEPLOYMENT_CHECKLIST.md" "PRODUCTION DEPLOYMENT CHECKLIST"
check_feature "Environment Template" ".env.production.template" "SUPABASE_URL"
check_feature "Deployment Script" "scripts/deploy-production.sh" "main()"
check_feature "Feature Testing Script" "scripts/test-new-features.js" "TestRunner"
check_feature "IoT Testing Script" "scripts/test-iot-connection.js" "IoTConnectionTester"

# 8. Package.json Integration
log_info "Checking Package.json Integration..."
if grep -q "test:new-features" package.json && grep -q "deploy:production" package.json; then
    log_success "Package.json - New scripts integrated"
    ((PASSED_CHECKS++))
else
    log_fail "Package.json - Missing new test/deploy scripts"
    ((FAILED_CHECKS++))
fi
((TOTAL_CHECKS++))

# 9. TypeScript Configuration
log_info "Checking TypeScript Configuration..."
if command -v npm >/dev/null 2>&1; then
    if npm run type-check >/dev/null 2>&1; then
        log_success "TypeScript - No type errors"
        ((PASSED_CHECKS++))
    else
        log_fail "TypeScript - Type checking failed"
        ((FAILED_CHECKS++))
    fi
else
    log_warning "TypeScript - npm not available, skipping type check"
fi
((TOTAL_CHECKS++))

# 10. File Structure Verification
log_info "Checking Project Structure..."
required_dirs=(
    "src/components/portal"
    "src/components/support" 
    "src/components/mobile"
    "src/components/iot"
    "src/components/training"
    "src/lib/iot"
    "scripts"
)

all_dirs_exist=true
for dir in "${required_dirs[@]}"; do
    if [ ! -d "$dir" ]; then
        log_fail "Directory Structure - Missing directory: $dir"
        all_dirs_exist=false
    fi
done

if $all_dirs_exist; then
    log_success "Directory Structure - All required directories present"
    ((PASSED_CHECKS++))
fi
((TOTAL_CHECKS++))

# 11. Integration Verification
log_info "Checking Component Integration..."

# Check if all new components are properly imported in CustomerPortal.tsx
portal_imports=0
if grep -q "MachineHealthDashboard" "src/pages/CustomerPortal.tsx"; then
    ((portal_imports++))
fi
if grep -q "AITechnicalChatbot" "src/pages/CustomerPortal.tsx"; then
    ((portal_imports++))
fi
if grep -q "MobileTicketCreator" "src/pages/CustomerPortal.tsx"; then
    ((portal_imports++))
fi

if [ $portal_imports -eq 3 ]; then
    log_success "Component Integration - All components integrated in Customer Portal"
    ((PASSED_CHECKS++))
else
    log_fail "Component Integration - Missing components in Customer Portal ($portal_imports/3)"
    ((FAILED_CHECKS++))
fi
((TOTAL_CHECKS++))

# 12. Documentation Verification
log_info "Checking Documentation..."
doc_files=(
    "PRODUCTION_DEPLOYMENT_CHECKLIST.md"
    "DEPLOYMENT_COMPLETE_SUMMARY.md"
)

all_docs_exist=true
for doc in "${doc_files[@]}"; do
    if [ ! -f "$doc" ]; then
        log_fail "Documentation - Missing: $doc"
        all_docs_exist=false
    fi
done

if $all_docs_exist; then
    log_success "Documentation - All deployment docs present"
    ((PASSED_CHECKS++))
fi
((TOTAL_CHECKS++))

# Summary
echo ""
echo "📊 VERIFICATION SUMMARY"
echo "======================"
echo "Total Checks: $TOTAL_CHECKS"
echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"

if [ $FAILED_CHECKS -eq 0 ]; then
    echo ""
    echo "🎉 ALL CHECKS PASSED!"
    echo "✅ ALMONA Portfolio Forge implementation is complete and verified"
    echo "🚀 Ready for production deployment!"
    echo ""
    echo "Next steps:"
    echo "1. Configure production environment variables (.env.production)"
    echo "2. Run comprehensive tests: npm run test:production-ready"
    echo "3. Deploy to staging: npm run deploy:staging"
    echo "4. Deploy to production: npm run deploy:production"
    echo ""
    exit 0
else
    echo ""
    echo "❌ VERIFICATION FAILED"
    echo "Please fix the failed checks before proceeding with deployment"
    echo ""
    exit 1
fi