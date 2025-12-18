"""
Database adapter for seamless migration from Supabase to Railway PostgreSQL.
This allows gradual migration without breaking existing functionality.
"""

import logging
from typing import Optional, AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
import redis.asyncio as redis

from core.config import settings
from core.supabase_client import get_enhanced_supabase_client

logger = logging.getLogger(__name__)

# Base class for models
Base = declarative_base()


class DatabaseAdapter:
    """
    Database adapter that can work with both Supabase and Railway PostgreSQL.
    Prioritizes Railway when available, falls back to Supabase.
    """

    def __init__(self):
        self.railway_engine = None
        self.railway_session_factory = None
        self.redis_client = None
        self.supabase_client = None
        self.use_railway = False
        self._initialize()

    def _initialize(self):
        """Initialize database connections based on available services."""

        # Check if Railway PostgreSQL is available
        if settings.DATABASE_URL and settings.DATABASE_URL.startswith("postgresql"):
            try:
                self._setup_railway_postgresql()
                self.use_railway = True
                logger.info("✅ Using Railway PostgreSQL as primary database")
            except Exception as e:
                logger.warning(f"⚠️  Railway PostgreSQL setup failed: {e}")
                self.use_railway = False

        # Setup Redis if available
        if settings.REDIS_URL:
            try:
                self._setup_redis()
                logger.info("✅ Redis cache configured")
            except Exception as e:
                logger.warning(f"⚠️  Redis setup failed: {e}")

        # Fallback to Supabase if Railway not available
        if not self.use_railway:
            try:
                self.supabase_client = get_enhanced_supabase_client()
                logger.info("📡 Using Supabase as fallback database")
            except Exception as e:
                logger.error(f"❌ Supabase setup failed: {e}")
                raise RuntimeError("No database connection available!")

    def _setup_railway_postgresql(self):
        """Setup Railway PostgreSQL connection."""
        # Convert postgresql:// URL to use asyncpg driver
        database_url = settings.DATABASE_URL
        if database_url.startswith("postgresql://"):
            # Convert to asyncpg format: postgresql+asyncpg://
            database_url = database_url.replace(
                "postgresql://", "postgresql+asyncpg://", 1
            )

        self.railway_engine = create_async_engine(
            database_url,
            echo=settings.DEBUG,
            pool_size=20,
            max_overflow=30,
            pool_pre_ping=True,
            pool_recycle=3600,
        )

        self.railway_session_factory = async_sessionmaker(
            self.railway_engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

    def _setup_redis(self):
        """Setup Redis connection."""
        if settings.REDIS_URL:
            # Parse Redis URL for connection
            self.redis_client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                retry_on_timeout=True,
                socket_connect_timeout=5,
                socket_timeout=5,
            )
        elif settings.REDIS_HOST and settings.REDIS_PORT:
            # Fallback to host/port configuration
            self.redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                decode_responses=True,
                retry_on_timeout=True,
                socket_connect_timeout=5,
                socket_timeout=5,
            )

    @asynccontextmanager
    async def get_db_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get database session - Railway first, Supabase fallback."""
        if self.use_railway and self.railway_session_factory:
            async with self.railway_session_factory() as session:
                try:
                    yield session
                finally:
                    await session.close()
        else:
            # For Supabase, we'll use the existing client
            # This is a compatibility layer
            raise NotImplementedError(
                "Supabase async session not implemented. "
                "Use Supabase client directly."
            )

    async def get_redis(self) -> Optional[redis.Redis]:
        """Get Redis client."""
        return self.redis_client

    async def check_railway_connection(self) -> bool:
        """Health check for Railway PostgreSQL."""
        if not self.use_railway or not self.railway_engine:
            return False

        try:
            async with self.railway_engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error(f"Railway PostgreSQL health check failed: {e}")
            return False

    async def check_redis_connection(self) -> bool:
        """Health check for Redis."""
        if not self.redis_client:
            return False

        try:
            await self.redis_client.ping()
            return True
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return False

    async def check_supabase_connection(self) -> bool:
        """Health check for Supabase."""
        if not self.supabase_client:
            return False

        try:
            # Simple test query
            _ = (
                self.supabase_client.client.table("profiles")
                .select("count")
                .limit(1)
                .execute()
            )
            return True
        except Exception as e:
            logger.error(f"Supabase health check failed: {e}")
            return False

    async def get_connection_status(self) -> dict:
        """Get status of all database connections."""
        return {
            "railway_postgresql": await self.check_railway_connection(),
            "redis": await self.check_redis_connection(),
            "supabase": await self.check_supabase_connection(),
            "primary_database": "railway" if self.use_railway else "supabase",
            "cache_available": self.redis_client is not None,
        }

    async def close_connections(self):
        """Close all database connections."""
        if self.railway_engine:
            await self.railway_engine.dispose()

        if self.redis_client:
            await self.redis_client.close()


# Global database adapter instance
db_adapter = DatabaseAdapter()


# FastAPI dependencies
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session dependency."""
    async with db_adapter.get_db_session() as session:
        yield session


async def get_redis():
    """Get Redis client dependency."""
    return await db_adapter.get_redis()


def get_supabase_client():
    """Get Supabase client dependency (for backward compatibility)."""
    if db_adapter.supabase_client:
        return db_adapter.supabase_client.client
    return None


async def get_database_status():
    """Get database connection status for health checks."""
    return await db_adapter.get_connection_status()
