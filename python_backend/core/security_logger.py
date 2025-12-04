"""
Structured security event logging
"""

import structlog
import json
from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict

class SecurityEventType(Enum):
    AUTH_SUCCESS = "auth_success"
    AUTH_FAILURE = "auth_failure"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    SUSPICIOUS_REQUEST = "suspicious_request"
    FILE_UPLOAD = "file_upload"
    CNC_JOB_SUBMITTED = "cnc_job_submitted"
    PERMISSION_DENIED = "permission_denied"
    DEPENDENCY_VULNERABILITY = "dependency_vulnerability"

@dataclass
class SecurityEvent:
    event_type: SecurityEventType
    timestamp: datetime
    user_id: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    details: Dict[str, Any]
    severity: str  # INFO, WARNING, ERROR, CRITICAL
    
    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["event_type"] = self.event_type.value
        data["timestamp"] = self.timestamp.isoformat()
        return data

class SecurityLogger:
    def __init__(self):
        self.logger = structlog.get_logger("security")
    
    def log_event(self, event: SecurityEvent):
        """Log a security event"""
        self.logger.info(
            "security_event",
            **event.to_dict()
        )
        
        # In a real implementation, this would also write to the database
        # We will implement a database writer helper here
        try:
            self._write_to_db(event)
        except Exception as e:
            self.logger.error("failed_to_write_security_event_to_db", error=str(e))
            
        # Also log to security-specific file
        try:
            with open("logs/security.log", "a") as f:
                f.write(json.dumps(event.to_dict()) + "\n")
        except Exception:
            pass

    def _write_to_db(self, event: SecurityEvent):
        """Write event to database - placeholder for DB integration"""
        # This would use the database_adapter or sqlalchemy session
        # For now, we assume this is handled by the caller or a separate service listener
        # if we wanted to add direct DB support we'd import database dependencies
        pass
    
    def log_auth_attempt(self, user_id: str, success: bool, ip: str, user_agent: str):
        """Log authentication attempt"""
        event = SecurityEvent(
            event_type=SecurityEventType.AUTH_SUCCESS if success else SecurityEventType.AUTH_FAILURE,
            timestamp=datetime.utcnow(),
            user_id=user_id,
            ip_address=ip,
            user_agent=user_agent,
            details={"success": success},
            severity="WARNING" if not success else "INFO"
        )
        self.log_event(event)

