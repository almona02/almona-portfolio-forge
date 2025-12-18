"""
Run the jobs table migration directly on Railway PostgreSQL.
This script connects to Railway PostgreSQL and creates the jobs table.
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from core.config import settings

async def run_migration():
    """Run the jobs table migration."""
    print("=" * 60)
    print("Running Jobs Table Migration")
    print("=" * 60)
    
    # Use Railway PostgreSQL connection string directly
    # You can also set this via environment variable: DATABASE_URL
    railway_db_url = "postgresql://postgres:tzFTgUBFdMOqIJUEnhpzSaoboHPDnvAH@yamabiko.proxy.rlwy.net:19764/railway"
    
    # Get database URL from settings or use Railway URL
    database_url = settings.DATABASE_URL or railway_db_url
    
    # If settings URL is Supabase, use Railway URL instead
    if database_url and 'supabase' in database_url.lower():
        print("[INFO] Detected Supabase URL, using Railway PostgreSQL instead")
        database_url = railway_db_url
    
    if not database_url:
        print("[ERROR] DATABASE_URL not configured")
        sys.exit(1)
    
    # Convert postgresql:// to postgresql+asyncpg://
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    print(f"\n1. Connecting to database...")
    print(f"   Database: {database_url.split('@')[1] if '@' in database_url else 'configured'}")
    
    try:
        # Read the migration SQL file
        migration_file = "migrations/042_create_jobs_table.sql"
        print(f"\n2. Reading migration file: {migration_file}")
        
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        print(f"   [OK] Migration file loaded ({len(migration_sql)} characters)")
        
        # Create engine
        print(f"\n3. Creating database connection...")
        engine = create_async_engine(
            database_url,
            echo=False,
            pool_pre_ping=True,
        )
        
        # Execute migration
        print(f"\n4. Executing migration...")
        async with engine.begin() as conn:
            # Execute the entire SQL file as one statement
            # This handles DO $$ blocks and other multi-line constructs properly
            try:
                await conn.execute(text(migration_sql))
                print(f"   [OK] Migration SQL executed successfully")
            except Exception as e:
                # Some statements might fail if objects don't exist (DROP IF EXISTS)
                error_str = str(e).lower()
                if "does not exist" in error_str or "cannot drop" in error_str:
                    print(f"   [SKIP] Some objects don't exist (expected): {str(e)[:100]}...")
                    # Try to continue - the CREATE statements should still work
                    pass
                else:
                    print(f"   [ERROR] Migration failed: {str(e)}")
                    raise
        
        # Verify the table was created
        print(f"\n5. Verifying migration...")
        async with engine.begin() as conn:
            result = await conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'jobs'
                )
            """))
            table_exists = result.fetchone()[0]
            
            if table_exists:
                # Check columns
                result = await conn.execute(text("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'jobs' 
                    ORDER BY ordinal_position
                """))
                columns = result.fetchall()
                print(f"   [OK] Jobs table exists with {len(columns)} columns")
                print(f"   [OK] Columns: {', '.join([col[0] for col in columns[:5]])}...")
                
                # Check indexes
                result = await conn.execute(text("""
                    SELECT indexname 
                    FROM pg_indexes 
                    WHERE tablename = 'jobs'
                """))
                indexes = [row[0] for row in result.fetchall()]
                print(f"   [OK] Indexes created: {len(indexes)}")
                
                # Check policies
                result = await conn.execute(text("""
                    SELECT policyname 
                    FROM pg_policies 
                    WHERE tablename = 'jobs'
                """))
                policies = [row[0] for row in result.fetchall()]
                print(f"   [OK] RLS policies created: {len(policies)}")
            else:
                print(f"   [ERROR] Jobs table was not created!")
                sys.exit(1)
        
        await engine.dispose()
        
        print(f"\n{'=' * 60}")
        print("[SUCCESS] Migration completed successfully!")
        print("=" * 60)
        print("\nThe jobs table is now ready for async job tracking.")
        print("You can now use the async optimization endpoints.")
        
    except Exception as e:
        print(f"\n{'=' * 60}")
        print(f"[ERROR] Migration failed: {str(e)}")
        print(f"Type: {type(e).__name__}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run_migration())

