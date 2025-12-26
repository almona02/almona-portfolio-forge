"""
YDT Encryption Service - IP Protection for Market Intelligence

Encrypts sensitive market intelligence, creates watermarks, and detects unauthorized sharing.
"""

import os
import json
import base64
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend

class YDTEncryptionService:
    """Encrypt YDT market intelligence - PROTECT YOUR MOAT"""
    
    def __init__(self):
        # Get encryption key from environment
        self.encryption_key = os.getenv('YDT_ENCRYPTION_KEY')
        self.watermark_key = os.getenv('YDT_WATERMARK_KEY', 'default_watermark_key')
        
        if not self.encryption_key:
            # Generate a key if not set (for development only)
            self.encryption_key = Fernet.generate_key().decode()
            print("WARNING: YDT_ENCRYPTION_KEY not set, using generated key (not secure for production)")
        
        # Initialize cipher
        self.cipher = Fernet(self.encryption_key.encode() if isinstance(self.encryption_key, str) else self.encryption_key)
        
        # Audit database (would be actual database in production)
        self.audit_log: list = []
    
    def encrypt_market_data(
        self, 
        data: Dict[str, Any], 
        workshop_id: str
    ) -> Dict[str, Any]:
        """
        Encrypt market intelligence with workshop-specific key
        
        Args:
            data: Market intelligence data to encrypt
            workshop_id: Workshop ID for access control
            
        Returns:
            Encrypted data with watermark and access key
        """
        # Create workshop-specific encryption key
        workshop_key = self.derive_workshop_key(workshop_id)
        
        # Encrypt the data
        data_json = json.dumps(data)
        encrypted_data = self.cipher.encrypt(data_json.encode())
        
        # Add watermark for IP protection
        watermark = self.create_watermark({
            'workshop_id': workshop_id,
            'timestamp': datetime.utcnow().isoformat(),
            'data_hash': hashlib.sha256(data_json.encode()).hexdigest(),
            'access_key': self.generate_access_key(workshop_id)
        })
        
        # Log encryption
        self.audit_log.append({
            'action': 'encrypt',
            'workshop_id': workshop_id,
            'timestamp': datetime.utcnow().isoformat(),
            'data_hash': hashlib.sha256(data_json.encode()).hexdigest()
        })
        
        return {
            'encrypted_data': encrypted_data.decode(),
            'watermark': watermark,
            'access_key': self.generate_access_key(workshop_id),
            'expires_at': (datetime.utcnow() + timedelta(days=7)).isoformat()  # Weekly refresh
        }
    
    def decrypt_market_data(
        self, 
        encrypted_data: str, 
        workshop_id: str,
        access_key: str
    ) -> Dict[str, Any]:
        """
        Decrypt market intelligence for authorized workshop
        
        Args:
            encrypted_data: Encrypted data string
            workshop_id: Workshop ID requesting decryption
            access_key: Access key for verification
            
        Returns:
            Decrypted market intelligence data
        """
        try:
            # Verify access key
            expected_key = self.generate_access_key(workshop_id)
            if access_key != expected_key:
                raise ValueError("Invalid access key")
            
            # Decrypt
            decrypted_bytes = self.cipher.decrypt(encrypted_data.encode())
            data = json.loads(decrypted_bytes.decode())
            
            # Log decryption
            self.audit_log.append({
                'action': 'decrypt',
                'workshop_id': workshop_id,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            return data
        except Exception as e:
            raise ValueError(f"Decryption failed: {str(e)}")
    
    def create_watermark(self, metadata: Dict[str, Any]) -> str:
        """
        Create invisible watermark for IP protection
        
        Args:
            metadata: Metadata to embed in watermark
            
        Returns:
            Base64-encoded watermark string
        """
        watermark_data = {
            **metadata,
            'signature': self.sign_metadata(metadata),
            'sequence_id': self.generate_sequence_id()
        }
        
        # Convert to steganographic watermark
        watermark_json = json.dumps(watermark_data)
        watermark = base64.b64encode(watermark_json.encode()).decode()
        
        # Add to audit log
        self.audit_log.append({
            'action': 'watermark_created',
            'workshop_id': metadata.get('workshop_id'),
            'timestamp': datetime.utcnow().isoformat(),
            'watermark_hash': hashlib.sha256(watermark.encode()).hexdigest()
        })
        
        return watermark
    
    def detect_unauthorized_sharing(
        self, 
        watermark: str, 
        accessing_workshop: str
    ) -> bool:
        """
        Detect if intelligence is being shared outside authorized workshop
        
        Args:
            watermark: Watermark string to check
            accessing_workshop: Workshop ID accessing the data
            
        Returns:
            True if unauthorized sharing detected
        """
        try:
            watermark_data = json.loads(base64.b64decode(watermark).decode())
            
            # Check if accessing workshop matches original
            original_workshop = watermark_data.get('workshop_id')
            if original_workshop != accessing_workshop:
                self.alert_unauthorized_access(
                    original=original_workshop,
                    accessing=accessing_workshop,
                    watermark=watermark
                )
                return True
            
            # Check signature
            if not self.verify_signature(watermark_data):
                self.alert_tampering(watermark_data)
                return True
            
            return False
            
        except Exception as e:
            self.alert_decryption_error(e, watermark)
            return True
    
    def derive_workshop_key(self, workshop_id: str) -> bytes:
        """Derive workshop-specific encryption key"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'ydt_salt',  # In production, use unique salt per workshop
            iterations=100000,
            backend=default_backend()
        )
        key = base64.urlsafe_b64encode(kdf.derive(workshop_id.encode()))
        return key
    
    def generate_access_key(self, workshop_id: str) -> str:
        """Generate access key for workshop"""
        data = f"{workshop_id}-{self.watermark_key}-{datetime.utcnow().date()}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]
    
    def sign_metadata(self, metadata: Dict[str, Any]) -> str:
        """Sign metadata for tamper detection"""
        metadata_str = json.dumps(metadata, sort_keys=True)
        signature = hashlib.sha256(
            f"{metadata_str}-{self.watermark_key}".encode()
        ).hexdigest()
        return signature
    
    def verify_signature(self, watermark_data: Dict[str, Any]) -> bool:
        """Verify watermark signature"""
        signature = watermark_data.pop('signature', None)
        if not signature:
            return False
        
        expected_signature = self.sign_metadata(watermark_data)
        return signature == expected_signature
    
    def generate_sequence_id(self) -> str:
        """Generate unique sequence ID"""
        return hashlib.sha256(
            f"{datetime.utcnow().isoformat()}-{os.urandom(16).hex()}".encode()
        ).hexdigest()[:16]
    
    def alert_unauthorized_access(
        self, 
        original: str, 
        accessing: str, 
        watermark: str
    ):
        """Alert on unauthorized access"""
        alert = {
            'type': 'unauthorized_access',
            'original_workshop': original,
            'accessing_workshop': accessing,
            'timestamp': datetime.utcnow().isoformat(),
            'watermark': watermark[:50]  # First 50 chars for logging
        }
        self.audit_log.append(alert)
        print(f"SECURITY ALERT: Unauthorized access detected - {alert}")
    
    def alert_tampering(self, watermark_data: Dict[str, Any]):
        """Alert on watermark tampering"""
        alert = {
            'type': 'tampering_detected',
            'timestamp': datetime.utcnow().isoformat(),
            'watermark_data': watermark_data
        }
        self.audit_log.append(alert)
        print(f"SECURITY ALERT: Watermark tampering detected - {alert}")
    
    def alert_decryption_error(self, error: Exception, watermark: str):
        """Alert on decryption error"""
        alert = {
            'type': 'decryption_error',
            'timestamp': datetime.utcnow().isoformat(),
            'error': str(error),
            'watermark': watermark[:50]
        }
        self.audit_log.append(alert)
        print(f"SECURITY ALERT: Decryption error - {alert}")
    
    def get_audit_log(self, workshop_id: Optional[str] = None) -> list:
        """Get audit log (filtered by workshop if provided)"""
        if workshop_id:
            return [log for log in self.audit_log if log.get('workshop_id') == workshop_id]
        return self.audit_log

