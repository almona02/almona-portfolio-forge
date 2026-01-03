"""
QR Canonical Serialization Format
FROZEN: Never modify field order or separator without constitutional amendment.
"""

from typing import Dict, Any
from datetime import datetime

# FROZEN: Never modify this order
QR_CANONICAL_FIELDS = [
    "v",
    "entity_id",
    "vertical_id",
    "qr_id",
    "created_at",
    "valid_from",
    "valid_to"
]

QR_CANONICAL_SEPARATOR = "|"


class QRCanonicalFormat:
    """
    Canonical serialization for QR signature computation.
    
    Rules:
    - No whitespace
    - No JSON serialization
    - No optional fields
    - UTF-8 only
    - Field separator is literal |
    - Never reuse Python dict ordering
    """
    
    def __init__(self, fields: list[str] = None, separator: str = None):
        """
        Initialize canonical format.
        
        Args:
            fields: Field order (defaults to QR_CANONICAL_FIELDS)
            separator: Field separator (defaults to QR_CANONICAL_SEPARATOR)
        """
        self.fields = fields or QR_CANONICAL_FIELDS
        self.separator = separator or QR_CANONICAL_SEPARATOR
    
    def serialize(self, qr_data: Dict[str, Any]) -> str:
        """
        Serialize QR data to canonical format.
        
        Args:
            qr_data: Dictionary with QR fields
            
        Returns:
            Canonical string: v|entity_id|vertical_id|qr_id|created_at|valid_from|valid_to
            
        Raises:
            ValueError: If required fields are missing
        """
        # Validate all required fields present
        missing_fields = []
        for field in self.fields:
            if field not in qr_data:
                missing_fields.append(field)
        
        if missing_fields:
            raise ValueError(
                f"Missing required fields for canonical serialization: "
                f"{', '.join(missing_fields)}"
            )
        
        # Extract values in exact field order (constitutional requirement)
        values = []
        for field in self.fields:
            value = qr_data[field]
            
            # Convert to string (no whitespace, UTF-8)
            if isinstance(value, datetime):
                # ISO-8601 format, no whitespace
                value_str = value.isoformat().replace(' ', 'T')
            else:
                # Convert to string, strip whitespace
                value_str = str(value).strip()
            
            values.append(value_str)
        
        # Join with separator (constitutional requirement: literal |)
        canonical_string = self.separator.join(values)
        
        # Return UTF-8 encoded string
        return canonical_string.encode('utf-8').decode('utf-8')
    
    def validate_structure(self, qr_data: Dict[str, Any]) -> tuple[bool, str]:
        """
        Validate QR data structure before serialization.
        
        Args:
            qr_data: Dictionary to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check all required fields present
        missing_fields = []
        for field in self.fields:
            if field not in qr_data:
                missing_fields.append(field)
        
        if missing_fields:
            return False, f"Missing required fields: {', '.join(missing_fields)}"
        
        # Check field types (v=int, others can be str or datetime)
        if not isinstance(qr_data.get('v'), int):
            return False, "Field 'v' must be an integer"
        
        # Check no extra fields (strict mode - only allow signature as extra)
        allowed_extra = {'signature'}
        extra_fields = set(qr_data.keys()) - set(self.fields) - allowed_extra
        if extra_fields:
            return False, f"Unexpected fields: {', '.join(extra_fields)}"
        
        return True, ""

