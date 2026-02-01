-- ============================================================================
-- RLS Security Fix - Enable RLS on Missing Tables (Schema-Aware Version)
-- ============================================================================
-- This migration enables Row Level Security (RLS) on tables that were
-- flagged by Supabase's database linter as security risks.
--
-- This version dynamically detects column names to handle schema variations.
--
-- Tables Fixed:
-- 1. design_templates
-- 2. recurring_invoice_schedules
-- 3. invoice_reminders
-- 4. feature_usage_metrics
-- 5. user_satisfaction_metrics
-- ============================================================================

-- Enable RLS on design_templates
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_templates') THEN
        ALTER TABLE design_templates ENABLE ROW LEVEL SECURITY;
        
        -- Only create policies if user_id column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'design_templates' AND column_name = 'user_id') THEN
            
            DROP POLICY IF EXISTS "Users can view their own design templates" ON design_templates;
            CREATE POLICY "Users can view their own design templates"
                ON design_templates FOR SELECT
                USING (auth.uid()::text = user_id::text);
            
            DROP POLICY IF EXISTS "Users can insert their own design templates" ON design_templates;
            CREATE POLICY "Users can insert their own design templates"
                ON design_templates FOR INSERT
                WITH CHECK (auth.uid()::text = user_id::text);
            
            DROP POLICY IF EXISTS "Users can update their own design templates" ON design_templates;
            CREATE POLICY "Users can update their own design templates"
                ON design_templates FOR UPDATE
                USING (auth.uid()::text = user_id::text);
            
            DROP POLICY IF EXISTS "Users can delete their own design templates" ON design_templates;
            CREATE POLICY "Users can delete their own design templates"
                ON design_templates FOR DELETE
                USING (auth.uid()::text = user_id::text);
        ELSE
            -- No user_id column, create permissive policy
            DROP POLICY IF EXISTS "Allow all access to design templates" ON design_templates;
            CREATE POLICY "Allow all access to design templates"
                ON design_templates FOR ALL
                USING (true);
        END IF;
    END IF;
END $$;

-- Enable RLS on recurring_invoice_schedules
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recurring_invoice_schedules') THEN
        ALTER TABLE recurring_invoice_schedules ENABLE ROW LEVEL SECURITY;
        
        -- Check for user_id or customer_id column
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recurring_invoice_schedules' AND column_name = 'user_id') THEN
            
            DROP POLICY IF EXISTS "Users can view their own invoice schedules" ON recurring_invoice_schedules;
            CREATE POLICY "Users can view their own invoice schedules"
                ON recurring_invoice_schedules FOR SELECT
                USING (auth.uid()::text = user_id::text);
            
            DROP POLICY IF EXISTS "Users can manage their own invoice schedules" ON recurring_invoice_schedules;
            CREATE POLICY "Users can manage their own invoice schedules"
                ON recurring_invoice_schedules FOR ALL
                USING (auth.uid()::text = user_id::text);
                
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'recurring_invoice_schedules' AND column_name = 'customer_id') THEN
            
            DROP POLICY IF EXISTS "Users can view their own invoice schedules" ON recurring_invoice_schedules;
            CREATE POLICY "Users can view their own invoice schedules"
                ON recurring_invoice_schedules FOR SELECT
                USING (auth.uid()::text = customer_id::text);
            
            DROP POLICY IF EXISTS "Users can manage their own invoice schedules" ON recurring_invoice_schedules;
            CREATE POLICY "Users can manage their own invoice schedules"
                ON recurring_invoice_schedules FOR ALL
                USING (auth.uid()::text = customer_id::text);
        ELSE
            -- No user identification column, create permissive policy
            DROP POLICY IF EXISTS "Allow all access to invoice schedules" ON recurring_invoice_schedules;
            CREATE POLICY "Allow all access to invoice schedules"
                ON recurring_invoice_schedules FOR ALL
                USING (true);
        END IF;
    END IF;
END $$;

-- Enable RLS on invoice_reminders
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_reminders') THEN
        ALTER TABLE invoice_reminders ENABLE ROW LEVEL SECURITY;
        
        -- Check if invoices table exists with user_id
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') AND
           EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invoices' AND column_name = 'user_id') THEN
            
            DROP POLICY IF EXISTS "Users can view their invoice reminders" ON invoice_reminders;
            CREATE POLICY "Users can view their invoice reminders"
                ON invoice_reminders FOR SELECT
                USING (
                    EXISTS (
                        SELECT 1 FROM invoices 
                        WHERE invoices.id = invoice_reminders.invoice_id 
                        AND invoices.user_id::text = auth.uid()::text
                    )
                );
            
            DROP POLICY IF EXISTS "Users can manage their invoice reminders" ON invoice_reminders;
            CREATE POLICY "Users can manage their invoice reminders"
                ON invoice_reminders FOR ALL
                USING (
                    EXISTS (
                        SELECT 1 FROM invoices 
                        WHERE invoices.id = invoice_reminders.invoice_id 
                        AND invoices.user_id::text = auth.uid()::text
                    )
                );
        ELSE
            -- No invoices table or user_id, create permissive policy
            DROP POLICY IF EXISTS "Allow all access to invoice reminders" ON invoice_reminders;
            CREATE POLICY "Allow all access to invoice reminders"
                ON invoice_reminders FOR ALL
                USING (true);
        END IF;
    END IF;
END $$;

-- Enable RLS on feature_usage_metrics
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_usage_metrics') THEN
        ALTER TABLE feature_usage_metrics ENABLE ROW LEVEL SECURITY;
        
        -- Check for user_id column
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'feature_usage_metrics' AND column_name = 'user_id') THEN
            
            DROP POLICY IF EXISTS "Users can view their own feature usage" ON feature_usage_metrics;
            CREATE POLICY "Users can view their own feature usage"
                ON feature_usage_metrics FOR SELECT
                USING (auth.uid()::text = user_id::text);
            
            -- System can insert metrics for any user
            DROP POLICY IF EXISTS "System can insert feature usage metrics" ON feature_usage_metrics;
            CREATE POLICY "System can insert feature usage metrics"
                ON feature_usage_metrics FOR INSERT
                WITH CHECK (true);
        ELSE
            -- No user_id column, create permissive policy
            DROP POLICY IF EXISTS "Allow all access to feature usage metrics" ON feature_usage_metrics;
            CREATE POLICY "Allow all access to feature usage metrics"
                ON feature_usage_metrics FOR ALL
                USING (true);
        END IF;
    END IF;
END $$;

-- Enable RLS on user_satisfaction_metrics
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_satisfaction_metrics') THEN
        ALTER TABLE user_satisfaction_metrics ENABLE ROW LEVEL SECURITY;
        
        -- Check for user_id column
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_satisfaction_metrics' AND column_name = 'user_id') THEN
            
            DROP POLICY IF EXISTS "Users can view their own satisfaction metrics" ON user_satisfaction_metrics;
            CREATE POLICY "Users can view their own satisfaction metrics"
                ON user_satisfaction_metrics FOR SELECT
                USING (auth.uid()::text = user_id::text);
            
            -- Users can submit their own satisfaction metrics
            DROP POLICY IF EXISTS "Users can submit satisfaction metrics" ON user_satisfaction_metrics;
            CREATE POLICY "Users can submit satisfaction metrics"
                ON user_satisfaction_metrics FOR INSERT
                WITH CHECK (auth.uid()::text = user_id::text);
        ELSE
            -- No user_id column, create permissive policy
            DROP POLICY IF EXISTS "Allow all access to satisfaction metrics" ON user_satisfaction_metrics;
            CREATE POLICY "Allow all access to satisfaction metrics"
                ON user_satisfaction_metrics FOR ALL
                USING (true);
        END IF;
    END IF;
END $$;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify RLS is enabled on all tables:
-- 
-- SELECT 
--     schemaname,
--     tablename,
--     rowsecurity as rls_enabled
-- FROM pg_tables
-- WHERE schemaname = 'public'
--     AND tablename IN (
--         'design_templates',
--         'recurring_invoice_schedules',
--         'invoice_reminders',
--         'feature_usage_metrics',
--         'user_satisfaction_metrics'
--     )
-- ORDER BY tablename;
-- ============================================================================
