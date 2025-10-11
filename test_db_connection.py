#!/usr/bin/env python3
"""
Test script to verify PostgreSQL connection on Railway
"""
import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def test_database_connection():
    """Test PostgreSQL database connection"""
    
    # Get DATABASE_URL from environment
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("❌ ERROR: DATABASE_URL environment variable not found")
        return False
    
    print(f"🔗 Testing connection to: {database_url[:50]}...")
    
    try:
        # Create async engine
        engine = create_async_engine(database_url, echo=False)
        
        # Test connection
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1 as test, version() as postgres_version"))
            row = result.fetchone()
            
            print("✅ Database connection successful!")
            print(f"📊 Test query result: {row[0]}")
            print(f"🐘 PostgreSQL version: {row[1]}")
            
            # Test database info
            result = await conn.execute(text("SELECT current_database(), current_user, inet_server_addr()"))
            db_info = result.fetchone()
            
            print(f"🗄️  Database: {db_info[0]}")
            print(f"👤 User: {db_info[1]}")
            print(f"🌐 Server: {db_info[2]}")
            
        await engine.dispose()
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

async def main():
    """Main test function"""
    print("🚀 Testing Railway PostgreSQL Connection")
    print("=" * 50)
    
    success = await test_database_connection()
    
    if success:
        print("\n🎉 All tests passed! PostgreSQL is ready for your backend.")
    else:
        print("\n💥 Database connection test failed!")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())

