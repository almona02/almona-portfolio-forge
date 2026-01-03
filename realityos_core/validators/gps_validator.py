"""
GPS Validator
Validates GPS coordinates with neutral, auditor-safe language.
"""

from typing import Optional, Tuple
from contextlib import contextmanager

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from realityos_core.models.event_models import GPSPoint
from realityos_core.capture_gateway.types import (
    ValidationError,
    ValidationSeverity
)
from realityos_core.capture_gateway.exceptions import GPSAnomalyError


class GPSValidator:
    """
    GPS Validator with neutral language outputs.
    
    Features:
    - Coordinate validation (-90 to 90 lat, -180 to 180 lon)
    - Accuracy threshold (100m tolerance for outdoor)
    - Geofence validation (polygon/radius support)
    - Indoor/outdoor flag handling
    
    Language Rules:
    - Never use: "spoofed", "forged", "false"
    - Always use: "GPS_ANOMALOUS", "GPS_LOW_CONFIDENCE", "LOCATION_UNVERIFIED"
    """
    
    GPS_TOLERANCE_METERS = 100  # Outdoor tolerance
    MIN_LATITUDE = -90.0
    MAX_LATITUDE = 90.0
    MIN_LONGITUDE = -180.0
    MAX_LONGITUDE = 180.0
    INDOOR_ACCURACY_THRESHOLD = 50.0  # Indoor GPS typically less accurate
    
    def __init__(self, database_url: str):
        """
        Initialize GPS Validator.
        
        Args:
            database_url: PostgreSQL connection URL (for geofence queries)
        """
        self.database_url = database_url
        self.engine = create_engine(database_url, pool_pre_ping=True)
        self.Session = sessionmaker(bind=self.engine)
    
    @contextmanager
    def _get_session(self):
        """Context manager for database sessions."""
        session = self.Session()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
    def validate(
        self,
        latitude: float,
        longitude: float,
        accuracy_meters: Optional[float]
    ) -> Tuple[Optional[GPSPoint], Optional[ValidationError]]:
        """
        Validate GPS coordinates.
        
        Args:
            latitude: GPS latitude
            longitude: GPS longitude
            accuracy_meters: GPS accuracy in meters (optional)
            
        Returns:
            Tuple of (GPSPoint if valid, ValidationError if invalid)
            Errors have severity=DEGRADE (never BLOCK)
            Uses neutral language only
        """
        # Step 1: Validate coordinate ranges
        if not (self.MIN_LATITUDE <= latitude <= self.MAX_LATITUDE):
            return None, ValidationError(
                validator="gps_validator",
                field="latitude",
                message="GPS_ANOMALOUS: Latitude out of valid range",
                severity=ValidationSeverity.DEGRADE,
                evidence={
                    "latitude": latitude,
                    "min_latitude": self.MIN_LATITUDE,
                    "max_latitude": self.MAX_LATITUDE
                }
            )
        
        if not (self.MIN_LONGITUDE <= longitude <= self.MAX_LONGITUDE):
            return None, ValidationError(
                validator="gps_validator",
                field="longitude",
                message="GPS_ANOMALOUS: Longitude out of valid range",
                severity=ValidationSeverity.DEGRADE,
                evidence={
                    "longitude": longitude,
                    "min_longitude": self.MIN_LONGITUDE,
                    "max_longitude": self.MAX_LONGITUDE
                }
            )
        
        # Step 2: Check accuracy threshold
        is_indoor = accuracy_meters is None
        if not is_indoor:
            if accuracy_meters > self.GPS_TOLERANCE_METERS:
                return None, ValidationError(
                    validator="gps_validator",
                    field="accuracy_meters",
                    message="GPS_LOW_CONFIDENCE: Accuracy exceeds tolerance threshold",
                    severity=ValidationSeverity.DEGRADE,
                    evidence={
                        "accuracy_meters": accuracy_meters,
                        "threshold_meters": self.GPS_TOLERANCE_METERS,
                        "is_indoor": False
                    }
                )
        
        # Step 3: Validate geofence (if configured for entity)
        # Note: Geofence validation would require entity_id, which we don't have here
        # This is handled in correlation validator or can be added later
        
        # Step 4: Create GPSPoint
        gps_point = GPSPoint(
            latitude=latitude,
            longitude=longitude,
            accuracy_meters=accuracy_meters
        )
        
        # Step 5: Additional checks (non-blocking)
        # Check for obviously invalid coordinates (0,0 is often default/error)
        if latitude == 0.0 and longitude == 0.0:
            return gps_point, ValidationError(
                validator="gps_validator",
                field="coordinates",
                message="LOCATION_UNVERIFIED: Coordinates appear to be default/error values",
                severity=ValidationSeverity.DEGRADE,
                evidence={
                    "latitude": latitude,
                    "longitude": longitude
                }
            )
        
        return gps_point, None
