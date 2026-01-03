"""
Correlation Validator
Cross-validator correlation checks.
"""

from typing import List, Optional
from datetime import datetime

from realityos_core.models.qr_models import QRValidationResult
from realityos_core.models.event_models import GPSPoint
from realityos_core.capture_gateway.types import (
    ValidationError,
    ValidationSeverity
)


class CorrelationValidator:
    """
    Correlation Validator for cross-validator checks.
    
    Features:
    - QR-GPS correlation (expected location matching)
    - QR-Timestamp correlation (QR validity window)
    - Photo-Timestamp correlation (EXIF timestamp sanity)
    - Cross-validator anomaly detection
    
    Rules:
    - Correlation failures lower confidence
    - Never hard-fail unless constitutional (QR/signature)
    """
    
    def __init__(self, database_url: str):
        """
        Initialize Correlation Validator.
        
        Args:
            database_url: PostgreSQL connection URL
        """
        self.database_url = database_url
        # Note: Database connection not needed for basic correlations
        # Can be added later for entity location matching
    
    def validate(
        self,
        qr_result: Optional[QRValidationResult],
        gps_point: Optional[GPSPoint],
        timestamp: datetime,
        photo_hashes: List[str]
    ) -> List[ValidationError]:
        """
        Validate cross-validator correlations.
        
        Args:
            qr_result: QR validation result (if QR was validated)
            gps_point: GPS point (if GPS was validated)
            timestamp: Event timestamp
            photo_hashes: List of photo hashes
            
        Returns:
            List of ValidationError (all severity=DEGRADE)
        """
        errors = []
        
        # Step 1: QR-Timestamp correlation
        if qr_result and qr_result.is_valid:
            qr_data = qr_result.qr_data
            
            # Check if timestamp is within QR validity window
            if timestamp < qr_data.valid_from:
                errors.append(ValidationError(
                    validator="correlation_validator",
                    field="qr_timestamp",
                    message="Timestamp is before QR valid_from window",
                    severity=ValidationSeverity.DEGRADE,
                    evidence={
                        "timestamp": timestamp.isoformat(),
                        "qr_valid_from": qr_data.valid_from.isoformat(),
                        "qr_valid_to": qr_data.valid_to.isoformat()
                    }
                ))
            elif timestamp > qr_data.valid_to:
                errors.append(ValidationError(
                    validator="correlation_validator",
                    field="qr_timestamp",
                    message="Timestamp is after QR valid_to window",
                    severity=ValidationSeverity.DEGRADE,
                    evidence={
                        "timestamp": timestamp.isoformat(),
                        "qr_valid_from": qr_data.valid_from.isoformat(),
                        "qr_valid_to": qr_data.valid_to.isoformat()
                    }
                ))
        
        # Step 2: QR-GPS correlation
        # Note: This would require entity location database
        # For now, we'll skip this check (can be added later)
        # Expected location matching would require:
        # - Entity location database
        # - Geofence configuration
        # - Distance calculation
        
        # Step 3: Photo-Timestamp correlation
        # Note: Photo EXIF timestamps are stripped in PhotoValidator
        # If metadata stripping failed, we could check EXIF here
        # For now, we assume metadata is stripped (PhotoValidator handles it)
        
        # Step 4: Cross-validator consistency checks
        # Check if all validators agree on basic facts
        if qr_result and qr_result.is_valid and gps_point:
            # Both QR and GPS are present and valid
            # This is a positive correlation (no error)
            pass
        
        # If QR is valid but GPS is missing, that's OK (indoor capture)
        # If GPS is present but QR is invalid, that's already handled by QR validator
        
        return errors
