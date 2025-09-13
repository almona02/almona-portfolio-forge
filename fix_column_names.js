import pkg from 'pg';
const { Pool } = pkg;

// Database connection configuration
const connectionString = 'postgresql://postgres.nwkukwdqgjhyezahhkcx:SpeedySea%231@aws-0-us-west-1.pooler.supabase.com:6543/postgres';

async function fixColumnNameIssues() {
    const pool = new Pool({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔗 Connecting to database...');
        
        // First, let's check the actual column names in the machines table
        console.log('📋 Checking machines table schema...');
        const schemaResult = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'machines' AND table_schema = 'public'
            ORDER BY ordinal_position;
        `);
        
        console.log('📊 Machines table columns:');
        console.table(schemaResult.rows);
        
        // Check other key tables for column names
        const tables = ['wishlists', 'recently_viewed', 'quotes', 'service_tickets', 'profiles'];
        
        for (const table of tables) {
            try {
                const result = await pool.query(`
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND table_schema = 'public'
                    AND column_name LIKE '%user%' OR column_name LIKE '%owner%' OR column_name LIKE '%id'
                    ORDER BY ordinal_position;
                `, [table]);
                
                if (result.rows.length > 0) {
                    console.log(`\n📊 ${table} table user/owner columns:`);
                    console.table(result.rows);
                }
            } catch (err) {
                console.log(`⚠️ Could not check ${table}: ${err.message}`);
            }
        }
        
        // Now let's fix the machines policies with the correct column name
        console.log('\n🔧 Fixing machines table policies...');
        
        const machinesFixes = [
            `DROP POLICY IF EXISTS "Users can insert own machines" ON public.machines;`,
            `DROP POLICY IF EXISTS "Users can update own machines" ON public.machines;`,
            `DROP POLICY IF EXISTS "Users can view own machines" ON public.machines;`,
            `CREATE POLICY "Users can insert own machines" ON public.machines
                FOR INSERT TO authenticated
                WITH CHECK (owner_id = (SELECT auth.uid()));`,
            `CREATE POLICY "Users can update own machines" ON public.machines
                FOR UPDATE TO authenticated
                USING (owner_id = (SELECT auth.uid()));`,
            `CREATE POLICY "Users can view own machines" ON public.machines
                FOR SELECT TO authenticated
                USING (owner_id = (SELECT auth.uid()));`
        ];
        
        for (let i = 0; i < machinesFixes.length; i++) {
            try {
                console.log(`📋 Executing machines fix ${i + 1}/${machinesFixes.length}...`);
                await pool.query(machinesFixes[i]);
                console.log('✅ Success');
            } catch (err) {
                console.log(`⚠️ Warning: ${err.message}`);
            }
        }
        
        // Let's also check if there are any function security issues we can fix
        console.log('\n🔧 Checking and fixing function security...');
        
        const functionFixes = [
            `DROP FUNCTION IF EXISTS public.is_admin(UUID) CASCADE;
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
        ];
        
        for (const fix of functionFixes) {
            try {
                console.log('📋 Fixing function security...');
                await pool.query(fix);
                console.log('✅ Function security fixed');
            } catch (err) {
                console.log(`⚠️ Warning: ${err.message}`);
            }
        }
        
        console.log('\n✅ Column name fixes completed!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
        console.log('🔗 Database connection closed.');
    }
}

fixColumnNameIssues().catch(console.error);