-- ============================================================================
-- Security Hardening - Document Permissive RLS Policies
-- ============================================================================
-- This migration documents the 7 tables with permissive RLS policies that
-- use USING (true). These policies are intentional for service/system
-- operations and should remain as-is.
--
-- No changes are made in this migration - this is for documentation only.
-- ============================================================================

-- ============================================================================
-- Permissive RLS Policies (Intentional)
-- ============================================================================

-- 1. email_history
-- Policy: "Service can manage email history"
-- Reason: System email tracking service needs unrestricted access
-- Risk: Low - service role only
-- Status: KEEP AS-IS

-- 2. email_tracking
-- Policy: "Service can insert email tracking"
-- Reason: Email analytics service needs to track all email events
-- Risk: Low - insert only, service role
-- Status: KEEP AS-IS

-- 3. feature_usage_metrics
-- Policy: "System can insert feature usage metrics"
-- Reason: Usage analytics system needs to track all user activity
-- Risk: Low - insert only, system tracking
-- Status: KEEP AS-IS

-- 4. invoice_reminders
-- Policy: "Allow all access to invoice reminders"
-- Reason: Fallback policy - table lacks user_id column for proper RLS
-- Risk: Medium - consider adding user_id column in future
-- Status: KEEP AS-IS (temporary until schema update)

-- 5. jobs
-- Policy: "Workers can update job status"
-- Reason: Background job workers need to update job status regardless of owner
-- Risk: Low - update only, job system requirement
-- Status: KEEP AS-IS

-- 6. optimizer_leads
-- Policy: "Anyone can create optimizer leads"
-- Reason: Public lead capture form - intentionally open for marketing
-- Risk: Low - insert only, public feature
-- Status: KEEP AS-IS

-- 7. profiles
-- Policy: "Service role can insert profiles"
-- Reason: User registration service needs to create profiles during signup
-- Risk: Low - insert only, service role
-- Status: KEEP AS-IS

-- ============================================================================
-- Recommendations for Future Improvements
-- ============================================================================

-- invoice_reminders: Consider adding user_id column to enable proper RLS
-- Example:
-- ALTER TABLE invoice_reminders ADD COLUMN user_id UUID REFERENCES auth.users(id);
-- UPDATE invoice_reminders SET user_id = (
--     SELECT user_id FROM invoices WHERE invoices.id = invoice_reminders.invoice_id
-- );
-- Then replace permissive policy with user-scoped policy.

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to view all permissive RLS policies:
-- 
-- SELECT 
--     schemaname,
--     tablename,
--     policyname,
--     cmd,
--     qual,
--     with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--     AND (qual = 'true' OR with_check = 'true')
-- ORDER BY tablename, policyname;
-- ============================================================================
