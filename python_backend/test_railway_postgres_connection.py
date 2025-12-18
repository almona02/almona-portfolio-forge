"""
Test script to verify Railway PostgreSQL connection and Supabase database connectivity.
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from urllib.parse import urlparse

# Test connection string
TEST_DATABASE_URL = "postgresql://postgres:tzFTgUBFdMOqIJUEnhpzSaoboHPDnvAH@yamabiko.proxy.rlwy.net:19764/railway"

async def test_railway_postgres():
    """Test Railway PostgreSQL connection."""
    print("=" * 60)
    print("Testing Railway PostgreSQL Connection")
    print("=" * 60)
    
    # Convert postgresql:// to postgresql+asyncpg://
    database_url = TEST_DATABASE_URL
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    print(f"\n1. Connection URL (masked):")
    parsed = urlparse(TEST_DATABASE_URL)
    masked_url = f"postgresql://{parsed.username}:****@{parsed.hostname}:{parsed.port}{parsed.path}"
    print(f"   {masked_url}")
    
    print(f"\n2. Connection Details:")
    print(f"   Host: {parsed.hostname}")
    print(f"   Port: {parsed.port}")
    print(f"   Database: {parsed.path.lstrip('/')}")
    print(f"   Username: {parsed.username}")
    
    try:
        print(f"\n3. Creating async engine...")
        engine = create_async_engine(
            database_url,
            echo=False,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
        
        print(f"4. Testing connection...")
        async with engine.begin() as conn:
            # Test basic connection
            result = await conn.execute(text("SELECT 1 as test"))
            row = result.fetchone()
            print(f"   [OK] Basic connection test: {row[0]}")
            
            # Get PostgreSQL version
            result = await conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"   [OK] PostgreSQL version: {version.split(',')[0]}")
            
            # Get current database
            result = await conn.execute(text("SELECT current_database()"))
            db_name = result.fetchone()[0]
            print(f"   [OK] Current database: {db_name}")
            
            # Check if jobs table exists (from our migration)
            result = await conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'jobs'
                )
            """))
            jobs_table_exists = result.fetchone()[0]
            print(f"   [OK] Jobs table exists: {jobs_table_exists}")
            
            # Check connection count
            result = await conn.execute(text("SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()"))
            conn_count = result.fetchone()[0]
            print(f"   [OK] Active connections: {conn_count}")
            
            # List some tables
            result = await conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name 
                LIMIT 10
            """))
            tables = [row[0] for row in result.fetchall()]
            print(f"   [OK] Sample tables ({len(tables)}): {', '.join(tables[:5])}...")
        
        print(f"\n5. Connection pool test...")
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT current_database(), current_user"))
            row = result.fetchone()
            print(f"   [OK] Pool connection works: database={row[0]}, user={row[1]}")
        
        await engine.dispose()
        
        print(f"\n{'=' * 60}")
        print("[SUCCESS] Railway PostgreSQL Connection: SUCCESS")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n{'=' * 60}")
        print(f"[FAILED] Railway PostgreSQL Connection: FAILED")
        print(f"   Error: {str(e)}")
        print(f"   Type: {type(e).__name__}")
        print("=" * 60)
        return False

async def test_supabase_connection():
    """Test Supabase connection (if configured)."""
    print(f"\n{'=' * 60}")
    print("Testing Supabase Connection")
    print("=" * 60)
    
    try:
        from core.supabase_client import get_enhanced_supabase_client
        
        print("\n1. Getting Supabase client...")
        supabase = get_enhanced_supabase_client()
        
        print("2. Testing Supabase connection...")
        # Try a simple query
        response = supabase.client.table("profiles").select("id").limit(1).execute()
        print(f"   [OK] Supabase connection works")
        print(f"   [OK] Can query Supabase tables")
        
        print(f"\n{'=' * 60}")
        print("[SUCCESS] Supabase Connection: SUCCESS")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n{'=' * 60}")
        print(f"[WARNING] Supabase Connection: {type(e).__name__}")
        print(f"   Note: This is OK if Supabase is not configured")
        print(f"   Error: {str(e)}")
        print("=" * 60)
        return False

async def main():
    """Run all connection tests."""
    print("\n" + "=" * 60)
    print("Database Connection Test Suite")
    print("=" * 60)
    
    railway_success = await test_railway_postgres()
    supabase_success = await test_supabase_connection()
    
    print(f"\n{'=' * 60}")
    print("Test Summary")
    print("=" * 60)
    print(f"Railway PostgreSQL: {'[SUCCESS]' if railway_success else '[FAILED]'}")
    print(f"Supabase: {'[SUCCESS]' if supabase_success else '[NOT CONFIGURED]'}")
    print("=" * 60)
    
    if railway_success:
        print("\n[SUCCESS] Your Railway PostgreSQL database is connected and working!")
        print("   The connection string is valid and can be used by your application.")
    else:
        print("\n[FAILED] Railway PostgreSQL connection failed. Check the connection string.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())

