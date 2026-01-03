"""
Timestamp Validator
Validates timestamps with human-impossible detection.
"""

from typing import List, Tuple, Optional
from datetime import datetime, timezone, timedelta
from contextlib import contextmanager

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from realityos_core.capture_gateway.types import (
    ValidationError,
    ValidationSeverity
)


class TimestampValidator:
    """
    Timestamp Validator with temporal anomaly detection.
    
    Features:
    - No future dates enforcement
    - Server-time comparison (±15 minutes tolerance)
    - Reasonable interval validation
    - "Too perfect" detection (events exactly on minute boundaries)
    - Human-impossible interval detection (<10 seconds + different entity)
    """
    
    TIME_TOLERANCE_MINUTES = 15  # Clock skew tolerance
    HUMAN_IMPOSSIBLE_INTERVAL_SECONDS = 10  # Script detection threshold
    
    def __init__(self, database_url: str):
        """
        Initialize Timestamp Validator.
        
        Args:
            database_url: PostgreSQL connection URL (for previous timestamp queries)
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
        timestamp: datetime,
        verified_by: str,
        entity_id: str
    ) -> Tuple[Optional[datetime], List[ValidationError]]:
        """
        Validate timestamp.
        
        Args:
            timestamp: Device timestamp
            verified_by: Human identifier
            entity_id: Entity ID
            
        Returns:
            Tuple of (normalized_timestamp, validation_errors)
            Errors have severity=DEGRADE or WARNING (never BLOCK)
        """
        errors = []
        
        # Normalize timestamp to UTC if timezone-naive
        if timestamp.tzinfo is None:
            # Assume UTC if no timezone info
            normalized_timestamp = timestamp.replace(tzinfo=timezone.utc)
        else:
            normalized_timestamp = timestamp.astimezone(timezone.utc)
        
        # Step 1: Check no future dates (constitutional)
        server_time = datetime.now(timezone.utc)
        if normalized_timestamp > server_time:
            errors.append(ValidationError(
                validator="timestamp_validator",
                field="timestamp",
                message="Timestamp is in the future (constitutional violation)",
                severity=ValidationSeverity.DEGRADE,
                evidence={
                    "timestamp": normalized_timestamp.isoformat(),
                    "server_time": server_time.isoformat(),
                    "difference_seconds": (normalized_timestamp - server_time).total_seconds()
                }
            ))
            # Don't return None - continue validation with normalized timestamp
        
        # Step 2: Server-time comparison (±15 minutes tolerance)
        time_diff_seconds = abs(
            (normalized_timestamp - server_time).total_seconds()
        )
        time_diff_minutes = time_diff_seconds / 60
        
        if time_diff_minutes > self.TIME_TOLERANCE_MINUTES:
            errors.append(ValidationError(
                validator="timestamp_validator",
                field="timestamp",
                message=f"Timestamp differs from server time by {time_diff_minutes:.1f} minutes (exceeds {self.TIME_TOLERANCE_MINUTES} minute tolerance)",
                severity=ValidationSeverity.DEGRADE,
                evidence={
                    "timestamp": normalized_timestamp.isoformat(),
                    "server_time": server_time.isoformat(),
                    "difference_minutes": time_diff_minutes,
                    "tolerance_minutes": self.TIME_TOLERANCE_MINUTES
                }
            ))
        
        # Step 3: "Too perfect" detection (events exactly on minute boundaries)
        if normalized_timestamp.second == 0 and normalized_timestamp.microsecond == 0:
            errors.append(ValidationError(
                validator="timestamp_validator",
                field="timestamp",
                message="Timestamp is exactly on minute boundary (suggests automation)",
                severity=ValidationSeverity.WARNING,
                evidence={
                    "timestamp": normalized_timestamp.isoformat(),
                    "pattern": "too_perfect"
                }
            ))
        
        # Step 4: Human-impossible interval detection
        previous_timestamp = self._get_previous_timestamp(verified_by)
        if previous_timestamp:
            interval_seconds = abs(
                (normalized_timestamp - previous_timestamp).total_seconds()
            )
            
            if interval_seconds < self.HUMAN_IMPOSSIBLE_INTERVAL_SECONDS:
                # Check if entity changed
                previous_entity = self._get_previous_entity(verified_by)
                if previous_entity and previous_entity != entity_id:
                    errors.append(ValidationError(
                        validator="timestamp_validator",
                        field="timestamp",
                        message=f"Human-impossible interval detected: {interval_seconds:.1f} seconds between different entities (suggests scripted submission)",
                        severity=ValidationSeverity.DEGRADE,
                        evidence={
                            "interval_seconds": interval_seconds,
                            "previous_entity": previous_entity,
                            "current_entity": entity_id,
                            "verified_by": verified_by,
                            "threshold_seconds": self.HUMAN_IMPOSSIBLE_INTERVAL_SECONDS
                        }
                    ))
        
        # Store timestamp for future interval checks
        self._store_timestamp(verified_by, entity_id, normalized_timestamp)
        
        return normalized_timestamp, errors
    
    def _get_previous_timestamp(
        self, verified_by: str
    ) -> Optional[datetime]:
        """Get previous timestamp for verified_by."""
        try:
            with self._get_session() as session:
                result = session.execute(
                    text("""
                        SELECT timestamp, entity_id
                        FROM timestamp_history
                        WHERE verified_by = :verified_by
                        ORDER BY timestamp DESC
                        LIMIT 1
                    """),
                    {"verified_by": verified_by}
                )
                row = result.fetchone()
                if row:
                    return row[0]
        except Exception:
            # Table might not exist yet - create it
            pass
        return None
    
    def _get_previous_entity(self, verified_by: str) -> Optional[str]:
        """Get previous entity_id for verified_by."""
        try:
            with self._get_session() as session:
                result = session.execute(
                    text("""
                        SELECT entity_id
                        FROM timestamp_history
                        WHERE verified_by = :verified_by
                        ORDER BY timestamp DESC
                        LIMIT 1
                    """),
                    {"verified_by": verified_by}
                )
                row = result.fetchone()
                if row:
                    return row[0]
        except Exception:
            pass
        return None
    
    def _store_timestamp(
        self, verified_by: str, entity_id: str, timestamp: datetime
    ) -> None:
        """Store timestamp for future interval checks."""
        try:
            with self._get_session() as session:
                # Create table if it doesn't exist
                session.execute(text("""
                    CREATE TABLE IF NOT EXISTS timestamp_history (
                        id SERIAL PRIMARY KEY,
                        verified_by VARCHAR(100) NOT NULL,
                        entity_id VARCHAR(255) NOT NULL,
                        timestamp TIMESTAMPTZ NOT NULL,
                        recorded_at TIMESTAMPTZ DEFAULT NOW()
                    )
                """))
                
                # Create index if it doesn't exist
                session.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_verified_by_timestamp 
                    ON timestamp_history(verified_by, timestamp DESC)
                """))
                
                # Insert timestamp
                session.execute(text("""
                    INSERT INTO timestamp_history (verified_by, entity_id, timestamp)
                    VALUES (:verified_by, :entity_id, :timestamp)
                """),
                    {
                        "verified_by": verified_by,
                        "entity_id": entity_id,
                        "timestamp": timestamp
                    }
                )
        except Exception:
            # If storage fails, don't block validation
            pass
