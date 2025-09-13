import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection configuration
const connectionString = 'postgresql://postgres.nwkukwdqgjhyezahhkcx:SpeedySea%231@aws-0-us-west-1.pooler.supabase.com:6543/postgres';

async function executeSqlFile() {
    const pool = new Pool({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔗 Connecting to database...');
        
        // Read the SQL file
        const sqlFilePath = path.join(__dirname, 'fix_remaining_issues_final.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        
        console.log('📄 SQL file loaded, executing...');
        console.log('─'.repeat(60));
        
        // Execute the SQL
        const result = await pool.query(sqlContent);
        
        console.log('✅ SQL script executed successfully!');
        
        // If there are any notices or results, display them
        if (result.rows && result.rows.length > 0) {
            console.log('\n📊 Query Results:');
            console.table(result.rows);
        }
        
    } catch (error) {
        console.error('❌ Error executing SQL script:');
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        if (error.position) {
            console.error('Error position:', error.position);
        }
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        await pool.end();
        console.log('\n🔚 Database connection closed');
    }
}

// Execute the script
executeSqlFile().catch(console.error);