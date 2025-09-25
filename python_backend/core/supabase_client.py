"""
Enhanced Supabase client configuration with connection pooling and performance monitoring.
"""
import logging
import time
from typing import Optional, Any, Dict
from contextlib import asynccontextmanager

from supabase import create_client, Client
from core.config import settings
from core.connection_pool import get_connection_pool, QueryMetrics

logger = logging.getLogger(__name__)


class PooledSupabaseClient:
    """Proxy client that uses connection pooling and performance monitoring."""
    
    def __init__(self, pool):
        self._pool = pool
        self._current_client = None
    
    def __getattr__(self, name):
        """Delegate all attribute access to the current pooled client."""
        if self._current_client is None:
            # This is a synchronous proxy, so we can't use async context manager
            # Instead, we'll create a direct client for synchronous operations
            self._current_client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_KEY
            )
        return getattr(self._current_client, name)
    
    async def execute_with_monitoring(self, operation, *args, **kwargs):
        """Execute operation with performance monitoring."""
        return await self._pool.execute_with_timeout(operation, *args, **kwargs)


class EnhancedSupabaseClient:
    """Enhanced Supabase client with connection pooling and performance monitoring."""
    
    def __init__(self, use_pool: bool = True):
        self._client: Optional[Client] = None
        self._use_pool = use_pool
        self._pool = get_connection_pool() if use_pool else None
        # defer initialization until first use to avoid import-time failures
    
    def _initialize_client(self) -> None:
        """Initialize the Supabase client with configuration validation."""
        try:
            if not settings.SUPABASE_URL:
                raise ValueError(
                    "SUPABASE_URL environment variable is required"
                )
            
            if not settings.SUPABASE_SERVICE_KEY:
                raise ValueError(
                    "SUPABASE_SERVICE_KEY environment variable is required"
                )
            
            self._client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_KEY
            )
            
            logger.info("Supabase client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise
    
    @property
    def client(self) -> Client:
        """Get the Supabase client instance."""
        if self._use_pool and self._pool:
            # Return a proxy client that uses the connection pool
            return PooledSupabaseClient(self._pool)
        
        # Fallback to direct client
        if self._client is None:
            self._initialize_client()
        if self._client is None:
            raise RuntimeError("Supabase client not initialized")
        return self._client
    
    @asynccontextmanager
    async def get_pooled_client(self):
        """Get a client from the connection pool."""
        if not self._use_pool or not self._pool:
            raise RuntimeError("Connection pool not available")
        
        async with self._pool.get_client() as client:
            yield client
    
    async def get_user_profile(self, user_id: str) -> Optional[dict]:
        """Get user profile by ID with performance monitoring."""
        try:
            if self._use_pool and self._pool:
                async with self.get_pooled_client() as client:
                    start_time = time.time()
                    response = client.table('profiles').select('*').eq(
                        'id', user_id
                    ).execute()
                    duration_ms = (time.time() - start_time) * 1000
                    
                    # Record metrics
                    self._pool.record_query_metrics(QueryMetrics(
                        query_type="get_user_profile",
                        table_name="profiles",
                        duration_ms=duration_ms,
                        success=True,
                        connection_id=getattr(client, '_connection_id', None)
                    ))
                    
                    if response.data:
                        return response.data[0]
                    return None
            else:
                # Fallback to direct client
                response = self.client.table('profiles').select('*').eq(
                    'id', user_id
                ).execute()
                
                if response.data:
                    return response.data[0]
                return None
            
        except Exception as e:
            logger.error(f"Error fetching user profile {user_id}: {e}")
            if self._use_pool and self._pool:
                self._pool.record_query_metrics(QueryMetrics(
                    query_type="get_user_profile",
                    table_name="profiles",
                    duration_ms=0.0,
                    success=False,
                    error=str(e)
                ))
            return None
    
    async def get_ticket_details(self, ticket_id: str) -> Optional[dict]:
        """Get ticket details with related data."""
        try:
            response = self.client.table('service_tickets').select(
                '''
                *,
                profiles!service_tickets_user_id_fkey(
                    id, full_name, email, company_name, phone
                ),
                assigned_user:profiles!service_tickets_assigned_to_fkey(
                    id, full_name, email, role
                ),
                products(id, name_ar, name_en, sku)
                '''
            ).eq('id', ticket_id).execute()
            
            if response.data:
                return response.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Error fetching ticket details {ticket_id}: {e}")
            return None
    
    async def get_admin_users(self) -> list[dict]:
        """Get all admin users for notifications."""
        try:
            response = self.client.table('profiles').select(
                'id, full_name, email'
            ).in_(
                'role', ['admin', 'super_admin', 'manager']
            ).eq('is_active', True).execute()
            
            return response.data or []
            
        except Exception as e:
            logger.error(f"Error fetching admin users: {e}")
            return []
    
    async def get_technician_users(self) -> list[dict]:
        """Get all technician users."""
        try:
            response = self.client.table('profiles').select(
                'id, full_name, email'
            ).eq('role', 'technician').eq('is_active', True).execute()
            
            return response.data or []
            
        except Exception as e:
            logger.error(f"Error fetching technician users: {e}")
            return []


# Global Supabase client instance
supabase_client = EnhancedSupabaseClient(use_pool=True)


def get_supabase_client():
    """FastAPI dependency provider for the supabase client instance."""
    return supabase_client.client


def get_enhanced_supabase_client():
    """Get the enhanced Supabase client with connection pooling."""
    return supabase_client


async def get_pooled_supabase_client():
    """Async dependency provider for pooled Supabase client."""
    async with supabase_client.get_pooled_client() as client:
        yield client
