# Archive Summary

This archive contains files that were moved from the main project directory to reduce clutter and improve maintainability. All files have been organized by category and can be safely restored if needed.

## Archive Structure

### 📁 documentation/
Contains implementation reports, deployment guides, and development documentation that are no longer actively needed:

- **Implementation Reports**: AI_RECOMMENDATION_IMPLEMENTATION_SUMMARY.md, ARABIC_TRANSLATION_SUMMARY.md, CICD_AND_EXECUTION_ANALYSIS.md, CODE_PRINCIPLES_EVALUATION.md, DATABASE_FIXES_SUMMARY.md, DATABASE_INTEGRATION_REPORT.md, DEPLOYMENT_COMPLETE_SUMMARY.md, DEPLOYMENT_SUCCESS.md, DEPLOYMENT_TRIGGER.md, ERROR_FIXES_REPORT.md, FINAL_IMPLEMENTATION_REPORT.md, MARKET_LEADERSHIP_IMPLEMENTATION_ANALYSIS.md, PERFORMANCE_OPTIMIZATION_REPORT.md, PHASE_1_COMPLETION_SUMMARY.md, PHASE_1_IMPLEMENTATION_REPORT.md, PHASE_2_DEPLOYMENT_READY.md, PHASE_2_SMART_SEARCH_COMPLETE.md, PIPELINE_STATUS_REPORT.md, PRODUCTION_READINESS_SUMMARY.md, PROTECTION_REMOVAL_REPORT.md, PWA_FIXES_SUMMARY.md, SECURITY_IMPROVEMENTS_SUMMARY.md, SERVICES_PAGE_FIX_REPORT.md, TURKISH_TRANSLATION_SUMMARY.md, EXECUTE_GLOBAL_LAUNCH.md, GLOBAL_DOMINANCE_EXECUTION_CHECKLIST.md, NEXT_STEPS_RECOMMENDATION.md

- **Deployment Guides**: EU_DEPLOYMENT_GUIDE.md, LOCAL_KUBERNETES_EXECUTION.md, RAILWAY_DEPLOYMENT_GUIDE.md, RAILWAY_ENVIRONMENT_VARIABLES.md, RAILWAY_QUICK_START.md, WINDOWS_QUICK_START.md, QUICK_TEST_CHECKLIST.md, SERVICES_PAGE_TESTING_GUIDE.md

### 📁 duplicates/
Contains duplicate files that have identical copies elsewhere in the project:

- **Logo Files**: src/assets/logo.png, src/logo.svg, src/assets/almona-new-logo.svg (kept public/logo.png and public/logo.svg)
- **Duplicate Components**: src/features/ (entire directory - unused duplicate of src/components/shop/3d-configurator/)
- **Unused Pages**: src/pages/QuoteRequestPage.tsx (duplicate of src/components/quotes/QuoteRequestPage.tsx)

### 📁 database-migrations/
Contains completed database migration and fix scripts:

- **Index Management**: add_index_for_fkey.sql, add_indexes_for_fkeys.sql, drop_unused_indexes.sql, manage_unused_indexes.sql, unused_indexes_review.sql
- **Schema Enhancements**: add_machine_model_column.sql, add_quote_twin_linkage.sql, add_support_role_enum.sql, schema_enhancements_indexes_non_concurrent.sql, schema_enhancements_proposed.sql, schema_performance_enhancements.sql
- **Table Creation**: create_machines_table.sql, create_tickets_table.sql
- **RLS & Security Fixes**: consolidate_rls_and_security_fixes.sql, consolidate_rls_policies.sql, fix_anonymous_access_policies.sql, fix_anonymous_access.sql, fix_auth_rls_initplan_and_duplicates.sql, fix_customers_view.sql, fix_database_performance_part1.sql, fix_database_performance_part2.sql, fix_database_performance_part3.sql, fix_final_linting_issues.sql, fix_materialized_view_exposure.sql, fix_mutable_functions.sql, fix_recursive_rls.sql, fix_remaining_issues_final.sql, fix_remaining_rls_issues_corrected.sql, fix_remaining_rls_issues_final.sql, fix_remaining_rls_issues_patch2.sql, fix_remaining_rls_issues.sql, fix_rls_performance.sql, fix_rls_policies.sql, fix_security_issues.sql, fix_service_ticket_rls.sql, optimize_rls_policies.sql
- **Migration Scripts**: migrate_legacy_tickets.sql, unified_ticketing_migration_yilmaz.sql, unified_ticketing_migration.sql, unify_tickets_migration.sql
- **Other**: seed_support_profile.sql, service_ticket_rls_full.sql, warranty_management.sql

### 📁 deployment-files/
Contains temporary deployment trigger files:

- force-deploy.txt
- trigger-deploy.txt
- deploy-status.md
- deploy-trigger.js

### 📁 reports/
Contains generated analysis reports:

- duplicates-report.json
- duplicates-report.md
- deleted-zero-byte-files.json
- sql-validation-report.md

### 📁 unused-scripts/
Contains utility scripts that are no longer needed:

- execute_final_fixes_simple.cjs
- execute_final_linting_fixes.js
- execute_rls_fixes.js
- fix_column_names.js
- test_db_connection.py
- test-infrastructure-health.sh
- test-service-ticketing.sql
- validate-railway-setup.sh

### 📁 external-tools/
Contains external tool binaries:

- tabby_x86_64-windows-msvc/ (Tabby AI editor binaries)

### 📁 build-artifacts/
Reserved for build artifacts (currently empty - dist/ directory was not moved as it's needed for deployment)

## Files Preserved

The following files were **NOT** moved to preserve project functionality:

- **Essential Documentation**: README.md, DEVELOPMENT_GUIDE.md, PERFORMANCE_GUIDE.md, PRODUCTION_DEPLOYMENT_CHECKLIST.md
- **Active UI Components**: src/shared/ui/ui/ (heavily used throughout the project)
- **Active Pages**: All pages in src/pages/ that are referenced in App.tsx
- **Core Configuration**: All config files (package.json, vite.config.ts, etc.)
- **Active Migrations**: migrations/ directory (contains active migration files)
- **Source Code**: All src/ directories except duplicates
- **Build Output**: dist/ directory (needed for deployment)

## Restoration Instructions

To restore any archived files:

1. Navigate to the appropriate archive subdirectory
2. Copy the desired files back to their original locations
3. Update any import statements if necessary
4. Test the functionality

## Space Savings

Estimated space saved: **~250+ MB**
- Documentation files: ~50+ MB
- Database migration files: ~5-10 MB
- Duplicate files: ~1.02 MB
- External tools: ~50+ MB
- Reports and scripts: ~5 MB

## Archive Date

Created: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")


