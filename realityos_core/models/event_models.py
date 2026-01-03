"""
RealityOS Event Models (Pydantic)
Type-safe models for event creation and validation.
"""

import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field, validator, constr
from enum import Enum


# ============== ENUMS ==============
class CoreEventType(str, Enum):
    """Core event types that RealityOS understands."""
    ON = "ON"
    OFF = "OFF" 
    FAULT = "FAULT"
    INSPECTION = "INSPECTION"
    VERIFICATION = "VERIFICATION"  # Catch-all for vertical-specific


# ============== PROOF MODELS (Principle 1) ==============
class GPSPoint(BaseModel):
    """GPS coordinates with validation."""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy_meters: Optional[float] = Field(None, gt=0)


class RealityProof(BaseModel):
    """Proof bundle for human verification (Principle 1)."""
    verified_by: constr(min_length=1, max_length=100)  # Who verified
    timestamp: datetime  # When verified (ISO 8601)
    
    # Proof Components (at least one required)
    qr_data: Optional[str] = None  # QR code scanned
    photo_hashes: Optional[List[str]] = Field(None, max_items=2)  # Max 2 photos
    location: Optional[GPSPoint] = None  # GPS coordinates
    
    @validator('photo_hashes')
    def validate_photo_hashes(cls, v):
        """Ensure photo hashes are valid SHA-256 if provided."""
        if v:
            for hash_str in v:
                if not (isinstance(hash_str, str) and len(hash_str) == 64 
                       and all(c in '0123456789abcdef' for c in hash_str.lower())):
                    raise ValueError(f'Invalid SHA-256 hash: {hash_str}')
        return v
    
    @validator('timestamp')
    def validate_timestamp_not_future(cls, v):
        """Prevent future-dated events."""
        # Ensure both are timezone-aware for comparison
        now = datetime.now(timezone.utc)
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        if v > now:
            raise ValueError('Event timestamp cannot be in the future')
        return v


# ============== EVENT MODELS ==============
class BaseEvent(BaseModel):
    """Base event model - what ALL events must have."""
    event_type: CoreEventType
    entity_id: constr(min_length=1, max_length=255)
    vertical_id: constr(min_length=1, max_length=100)
    proof: RealityProof
    payload: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        """Pydantic config."""
        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }
        # Allow extra fields in payload only
        extra = 'allow'


class EventRecord(BaseEvent):
    """Event as stored in the ledger (includes system fields)."""
    event_hash: constr(min_length=64, max_length=64)  # SHA-256 hex
    prev_hash: Optional[constr(min_length=64, max_length=64)]
    chain_position: int = Field(..., gt=0)
    recorded_at: datetime
    created_at: datetime
    
    @validator('event_hash', 'prev_hash')
    def validate_hex_hash(cls, v):
        """Validate SHA-256 hex string."""
        if v is not None:
            if not all(c in '0123456789abcdef' for c in v.lower()):
                raise ValueError('Invalid hex string')
        return v


# ============== HASHING UTILITIES ==============
class EventHasher:
    """Computes event hash following Principle 3."""
    
    @staticmethod
    def compute_event_hash(
        prev_hash: Optional[str],
        event_data: BaseEvent,
        nonce: int = 0
    ) -> str:
        """
        Compute SHA-256 hash for an event.
        
        Formula: SHA-256(prev_hash + event_type + payload_hash + proof_hash + timestamp + nonce)
        
        Args:
            prev_hash: Previous event's hash (None for genesis)
            event_data: Event data
            nonce: Nonce for uniqueness (usually 0, increments on collision)
            
        Returns:
            64-character hex SHA-256 hash
        """
        # Create canonical string representation
        components = []
        
        # 1. Previous hash (or '0'*64 for genesis)
        components.append(prev_hash if prev_hash else '0'*64)
        
        # 2. Event type
        components.append(event_data.event_type.value)
        
        # 3. Entity ID
        components.append(event_data.entity_id)
        
        # 4. Vertical ID
        components.append(event_data.vertical_id)
        
        # 5. Payload hash (SHA-256 of canonical JSON)
        # Sort keys for deterministic hashing
        payload_json = json.dumps(
            event_data.payload, 
            sort_keys=True, 
            separators=(',', ':')
        )
        payload_hash = hashlib.sha256(payload_json.encode()).hexdigest()
        components.append(payload_hash)
        
        # 6. Proof hash (SHA-256 of proof JSON)
        # Convert proof to dict, exclude metadata if any
        proof_dict = event_data.proof.dict()
        proof_json = json.dumps(
            proof_dict,
            sort_keys=True,
            separators=(',', ':')
        )
        proof_hash = hashlib.sha256(proof_json.encode()).hexdigest()
        components.append(proof_hash)
        
        # 7. Timestamp (ISO format)
        components.append(event_data.proof.timestamp.isoformat())
        
        # 8. Nonce (for collision resolution)
        components.append(str(nonce))
        
        # Join with pipe (|) - not found in base64/hex
        content = '|'.join(components)
        
        # Compute final hash
        return hashlib.sha256(content.encode()).hexdigest()


