"""
QR Data Models
Pydantic models for signed QR code data and validation results.
"""

from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator, constr


class SignedQRData(BaseModel):
    """
    Signed QR code data structure.
    
    Format:
    {
        "v": 1,
        "entity_id": "asset_123",
        "vertical_id": "maintenance_vertical",
        "qr_id": "qr_xyz_unique",
        "created_at": "2025-02-20T10:30:00Z",
        "valid_from": "2025-02-20T10:30:00Z",
        "valid_to": "2025-02-21T10:30:00Z",
        "signature": "hmac_sha256(...)"
    }
    """
    v: int = Field(..., ge=1, description="QR format version")
    entity_id: constr(min_length=1, max_length=255)
    vertical_id: constr(min_length=1, max_length=100)
    qr_id: constr(min_length=1, max_length=255)
    created_at: datetime
    valid_from: datetime
    valid_to: datetime
    signature: constr(min_length=64, max_length=64)  # HMAC-SHA256 hex
    
    @validator('valid_to')
    def validate_validity_window(cls, v, values):
        """Ensure valid_from < valid_to."""
        if 'valid_from' in values and v <= values['valid_from']:
            raise ValueError('valid_to must be after valid_from')
        return v
    
    @validator('valid_to')
    def validate_max_window(cls, v, values):
        """Ensure validity window is reasonable (max 7 days)."""
        if 'valid_from' in values:
            window = (v - values['valid_from']).total_seconds()
            max_window = 7 * 24 * 60 * 60  # 7 days in seconds
            if window > max_window:
                raise ValueError('Validity window cannot exceed 7 days')
        return v


class QRValidationResult(BaseModel):
    """Result of QR validation."""
    is_valid: bool
    qr_data: SignedQRData
    qr_hash: str  # SHA-256 of canonical serialization
    validation_steps: Dict[str, bool]  # Step 0-5 results
    errors: Optional[Dict[str, str]] = None  # Step errors if any

