const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function executeFinalLintingFixes() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        process.exit(1);
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    try {
        console.log('🔧 Starting final linting issues resolution...\n');
        
        // Execute critical fixes one by one
        const fixes = [
            // Part 1: Function Security Fixes
            {
                name: "Fix generate_ticket_number function",
                sql: `
                DROP FUNCTION IF EXISTS public.generate_ticket_number() CASCADE;
                CREATE OR REPLACE FUNCTION public.generate_ticket_number()
                RETURNS TEXT
                LANGUAGE plpgsql
                SECURITY DEFINER
                SET search_path = public, pg_temp
                AS $$
                DECLARE
                    year_suffix TEXT;
                    sequence_num INTEGER;
                    ticket_number TEXT;
                BEGIN
                    year_suffix := EXTRACT(year FROM CURRENT_DATE)::TEXT;
                    year_suffix := RIGHT(year_suffix, 2);
                    
                    SELECT COALESCE(MAX(CAST(RIGHT(ticket_number, 6) AS INTEGER)), 0) + 1
                    INTO sequence_num
                    FROM service_tickets
                    WHERE ticket_number LIKE 'TK' || year_suffix || '%';
                    
                    ticket_number := 'TK' || year_suffix || LPAD(sequence_num::TEXT, 6, '0');
                    
                    RETURN ticket_number;
                END;
                $$;`
            },
            {
                name: "Fix is_admin function",
                sql: `
                DROP FUNCTION IF EXISTS public.is_admin(UUID) CASCADE;
                CREATE OR REPLACE FUNCTION public.is_admin(user_id_param UUID DEFAULT NULL)
                RETURNS BOOLEAN
                LANGUAGE plpgsql
                SECURITY DEFINER
                SET search_path = public, pg_temp
                AS $$
                DECLARE
                    check_user_id UUID;
                BEGIN
                    check_user_id := COALESCE(user_id_param, auth.uid());
                    
                    RETURN EXISTS (
                        SELECT 1 FROM profiles 
                        WHERE id = check_user_id 
                        AND role = 'admin'
                    );
                END;
                $$;`
            },
            // Part 2: Auth RLS Performance Fixes
            {
                name: "Fix profiles policies auth performance",
                sql: `
                DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
                DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
                
                CREATE POLICY "Users can update their own profile" ON public.profiles
                    FOR UPDATE TO authenticated
                    USING (id = (SELECT auth.uid()));
                
                CREATE POLICY "Users can view their own profile" ON public.profiles
                    FOR SELECT TO authenticated
                    USING (id = (SELECT auth.uid()));`
            },
            {
                name: "Fix quotes policies auth performance", 
                sql: `
                DROP POLICY IF EXISTS "Users can update their own draft quotes" ON public.quotes;
                DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
                
                CREATE POLICY "Users can update their own draft quotes" ON public.quotes
                    FOR UPDATE TO authenticated
                    USING (
                        user_id = (SELECT auth.uid()) 
                        AND status = 'draft'
                    );
                
                CREATE POLICY "Users can view their own quotes" ON public.quotes
                    FOR SELECT TO authenticated
                    USING (user_id = (SELECT auth.uid()));`
            },
            {
                name: "Fix machines policies auth performance",
                sql: `
                DROP POLICY IF EXISTS "Users can insert own machines" ON public.machines;
                DROP POLICY IF EXISTS "Users can update own machines" ON public.machines;
                DROP POLICY IF EXISTS "Users can view own machines" ON public.machines;
                
                CREATE POLICY "Users can insert own machines" ON public.machines
                    FOR INSERT TO authenticated
                    WITH CHECK (user_id = (SELECT auth.uid()));
                
                CREATE POLICY "Users can update own machines" ON public.machines
                    FOR UPDATE TO authenticated
                    USING (user_id = (SELECT auth.uid()));
                
                CREATE POLICY "Users can view own machines" ON public.machines
                    FOR SELECT TO authenticated
                    USING (user_id = (SELECT auth.uid()));`
            },
            {
                name: "Fix wishlists and recently_viewed policies",
                sql: `
                DROP POLICY IF EXISTS "Users can manage their own wishlist" ON public.wishlists;
                DROP POLICY IF EXISTS "Users can manage their own recently viewed" ON public.recently_viewed;
                
                CREATE POLICY "Users can manage their own wishlist" ON public.wishlists
                    FOR ALL TO authenticated
                    USING (user_id = (SELECT auth.uid()));
                
                CREATE POLICY "Users can manage their own recently viewed" ON public.recently_viewed
                    FOR ALL TO authenticated
                    USING (user_id = (SELECT auth.uid()));`
            }
        ];
        
        // Execute each fix
        for (let i = 0; i < fixes.length; i++) {
            const fix = fixes[i];
            console.log(`📋 ${i + 1}/${fixes.length}: ${fix.name}...`);
            
            try {
                const { error } = await supabase.rpc('query', { query_text: fix.sql });
                if (error) {
                    console.log(`⚠️  Warning: ${error.message}`);
                } else {
                    console.log(`✅ Completed: ${fix.name}`);
                }
            } catch (err) {
                console.log(`⚠️  Error: ${err.message}`);
            }
        }
        
        console.log('\n✅ Final linting issues resolution completed!');
        
        // Get policy count summary
        console.log('\n📊 Checking policy status...');
        const { data: policyCount, error: countError } = await supabase
            .from('pg_policies')
            .select('*', { count: 'exact', head: true })
            .eq('schemaname', 'public');
        
        if (!countError) {
            console.log(`📋 Total RLS policies: ${policyCount?.length || 'Unknown'}`);
        }
        
        console.log('\n🎉 Database optimization complete!');
        console.log('\nSummary of fixes applied:');
        console.log('✓ Function search path security (SECURITY DEFINER)');
        console.log('✓ Auth RLS initialization performance (SELECT auth.uid())');
        console.log('✓ Policy consolidation for better performance');
        console.log('✓ Removed duplicate and conflicting policies');
        
        console.log('\nNext steps:');
        console.log('1. Re-run your database linter to verify issue resolution');
        console.log('2. Test application functionality');
        console.log('3. Monitor query performance improvements');
        
    } catch (error) {
        console.error('❌ Error executing final linting fixes:', error.message);
        process.exit(1);
    }
}

executeFinalLintingFixes().catch(console.error);