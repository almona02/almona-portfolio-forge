"""
Secure API key management for Fabricator Pro integrations
"""

import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from pydantic import BaseModel

class APIKey(BaseModel):
    key_id: str
    key_hash: str
    name: str
    user_id: str
    permissions: List[str]
    created_at: datetime
    expires_at: Optional[datetime] = None
    last_used: Optional[datetime] = None
    is_active: bool = True
    
    @staticmethod
    def generate_key() -> str:
        """Generate a secure API key"""
        return f"alm_{secrets.token_urlsafe(32)}"
    
    @staticmethod
    def hash_key(key: str) -> str:
        """Hash the API key for secure storage"""
        return hashlib.sha256(key.encode()).hexdigest()
    
    def verify_key(self, provided_key: str) -> bool:
        """Verify if provided key matches"""
        return self.key_hash == self.hash_key(provided_key)

