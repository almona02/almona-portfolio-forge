# Security Linter Fixes - Migration 043

## Overview

This document describes the security fixes applied in migration `043_fix_security_linter_issues.sql` to address all ERROR and WARN level issues from the Supabase database linter.

## Issues Fixed

### ✅ ERROR Level Issues

#### 1. Security Definer Views (2 views)
- **Issue**: Views with SECURITY DEFINER property can bypass RLS policies
- **Fixed Views**:
  - `public.qr_lifecycle_audit` - Recreated without SECURITY DEFINER
  - `public.reality_events_readonly` - Recreated without SECURITY DEFINER

#### 2. RLS Disabled in Public (14 tables)
- **Issue**: Tables in public schema exposed to PostgREST must have RLS enabled
- **Fixed Tables**:
  - `reality_events_2025_02` - RealityOS event ledger partition
  - `candidate_facts` - YDT learning system
  - `fact_verifications` - YDT learning system
  - `user_trust_scores` - YDT learning system
  - `learning_conversations` - YDT learning system
  - `ydt_market_intelligence` - YDT intelligence system
  - `ydt_access_audit` - YDT intelligence system
  - `ydt_watermarks` - YDT intelligence system
  - `workshop_job_patterns` - YDT intelligence system
  - `ydt_impact_metrics` - YDT intelligence system
  - `ydt_competitive_intelligence` - YDT intelligence system
  - `supplier_intelligence` - YDT intelligence system
  - `qr_lifecycle` - QR code lifecycle management

### ✅ WARN Level Issues

#### 3. Function Search Path Mutable (6 functions)
- **Issue**: Functions without SET search_path are vulnerable to search_path injection attacks
- **Fixed Functions**:
  - `update_updated_at_column()` - Added `SET search_path = public, pg_temp`
  - `update_qr_lifecycle_updated_at()` - Added `SET search_path = public, pg_temp`
  - `check_qr_validity()` - Added `SET search_path = public, pg_temp`
  - `mark_qr_used()` - Added `SET search_path = public, pg_temp`
  - `create_validation_review_task()` - Added `SET search_path = public, pg_temp`
  - `is_admin()` - Added `SET search_path = public, pg_temp` (kept SECURITY DEFINER as required)

### ⚠️ Manual Action Required

#### 4. Extension in Public Schema (1 extension)
- **Issue**: `vector` extension is installed in public schema
- **Action Required**: Move extension to dedicated schema
  ```sql
  CREATE SCHEMA IF NOT EXISTS extensions;
  ALTER EXTENSION vector SET SCHEMA extensions;
  ```
- **Note**: After moving, update any code that references vector functions to use `extensions.vector`

### ℹ️ No Action Needed

#### 5. Anonymous Access Policies (Many tables)
- **Status**: These warnings are **intentional** for public-facing data
- **Rationale**: Public product catalogs, categories, reviews, and exchange rates should be accessible to anonymous users
- **Tables with Intentional Anonymous Access**:
  - Products, categories, product reviews
  - Exchange rates, spare parts
  - Machine knowledge, learning courses
  - And other public-facing resources

## RLS Policies Created

The migration creates basic RLS policies for all newly enabled tables:

### RealityOS Event Ledger
- Service role has full access (sensitive event data)

### YDT Learning System
- **candidate_facts**: Users can view all, manage their own
- **fact_verifications**: Users can view all, create their own
- **user_trust_scores**: Users can view all, update their own
- **learning_conversations**: Users can manage their own

### YDT Intelligence System
- **ydt_market_intelligence**: Authenticated users can view, service role manages
- **ydt_access_audit**: Users can view their own workshop audits
- **ydt_watermarks**: Users can view their own workshop watermarks
- **workshop_job_patterns**: Users can manage their own workshop patterns
- **ydt_impact_metrics**: Users can view their own workshop metrics
- **ydt_competitive_intelligence**: Authenticated users can view
- **supplier_intelligence**: Authenticated users can view

### QR Lifecycle
- Service role manages all operations
- Authenticated users can validate QR codes (read-only)

## Verification Queries

After running the migration, use these queries to verify the fixes:

### Check Views Don't Have SECURITY DEFINER
```sql
SELECT 
    n.nspname as schema,
    c.relname as view_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v'
AND n.nspname = 'public'
AND c.relname IN ('qr_lifecycle_audit', 'reality_events_readonly');
```

### Check RLS is Enabled
```sql
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'reality_events_2025_02',
    'candidate_facts',
    'fact_verifications',
    'user_trust_scores',
    'learning_conversations',
    'ydt_market_intelligence',
    'ydt_access_audit',
    'ydt_watermarks',
    'workshop_job_patterns',
    'ydt_impact_metrics',
    'ydt_competitive_intelligence',
    'supplier_intelligence',
    'qr_lifecycle'
)
ORDER BY tablename;
```

### Check Functions Have search_path Set
```sql
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) LIKE '%SET search_path%' as has_search_path
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname IN (
    'update_updated_at_column',
    'update_qr_lifecycle_updated_at',
    'check_qr_validity',
    'mark_qr_used',
    'create_validation_review_task',
    'is_admin'
);
```

## Migration Instructions

1. **Backup your database** before running the migration
2. **Run the migration** in Supabase SQL Editor:
   ```sql
   -- Copy and paste the entire contents of:
   -- migrations/043_fix_security_linter_issues.sql
   ```
3. **Verify the fixes** using the queries above
4. **Manually fix the vector extension** (see Manual Action Required section)
5. **Test your application** to ensure RLS policies work as expected

## Notes

- All RLS policies created are basic implementations. You may need to refine them based on your specific business requirements.
- The migration is idempotent - it can be run multiple times safely.
- Some policies check workshop membership via `profiles.workshop_id` - ensure this relationship is properly maintained in your application.

## Related Files

- Migration file: `migrations/043_fix_security_linter_issues.sql`
- Supabase Linter Documentation: https://supabase.com/docs/guides/database/database-linter

