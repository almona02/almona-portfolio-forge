"""
Supabase client configuration for the FastAPI backend.
"""
import logging
from typing import Optional

from supabase import create_client, Client
from core.config import settings

logger = logging.getLogger(__name__)


class SupabaseClient:
    """Supabase client wrapper with error handling and logging."""
    
    def __init__(self):
        self._client: Optional[Client] = None
        self._initialize_client()
    
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
        if self._client is None:
            raise RuntimeError("Supabase client not initialized")
        return self._client
    
    async def get_user_profile(self, user_id: str) -> Optional[dict]:
        """Get user profile by ID."""
        try:
            response = self.client.table('profiles').select('*').eq(
                'id', user_id
            ).execute()
            
            if response.data:
                return response.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Error fetching user profile {user_id}: {e}")
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
supabase_client = SupabaseClient()
