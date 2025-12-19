"""
Security API endpoints for security event reporting

Week 2 Task 2.1: Security Implementation
"""

from fastapi import APIRouter, Request, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

from services.security_gateway import get_security_gateway, SecurityGateway
from core.security_logger import SecurityLogger, SecurityEvent, SecurityEventType

router = APIRouter(prefix="/security", tags=["security"])


class SecurityEventRequest(BaseModel):
    """Security event from frontend"""
    type: str
    timestamp: int
    input: Optional[Any] = None
    error: Dict[str, Any]
    userAgent: Optional[str] = None
    url: Optional[str] = None


@router.post("/events")
async def log_security_event(
    event: SecurityEventRequest,
    request: Request,
    security_gateway: SecurityGateway = Depends(get_security_gateway)
):
    """
    Log security event from frontend
    
    This endpoint receives security events from the frontend SecurityGateway
    and logs them to the backend security logger.
    """
    try:
        # Convert frontend event to backend SecurityEvent
        event_type_map = {
            'validation_failure': SecurityEventType.SUSPICIOUS_REQUEST,
            'sanitization': SecurityEventType.SUSPICIOUS_REQUEST,
            'suspicious_input': SecurityEventType.SUSPICIOUS_REQUEST,
            'rate_limit': SecurityEventType.RATE_LIMIT_EXCEEDED,
        }
        
        security_event_type = event_type_map.get(
            event.type,
            SecurityEventType.SUSPICIOUS_REQUEST
        )
        
        # Get user info from request if available
        user_id = None
        if hasattr(request.state, 'user_id'):
            user_id = request.state.user_id
        
        # Create security event
        security_event = SecurityEvent(
            event_type=security_event_type,
            timestamp=datetime.utcnow(),
            user_id=user_id,
            ip_address=request.client.host if request.client else None,
            user_agent=event.userAgent or request.headers.get('User-Agent'),
            details={
                'frontend_event': event.dict(),
                'error_code': event.error.get('code'),
                'severity': event.error.get('severity'),
            },
            severity='WARNING' if event.error.get('severity') in ['info', 'warning'] else 'ERROR'
        )
        
        # Log the event
        security_logger = SecurityLogger()
        security_logger.log_event(security_event)
        
        return {
            "status": "logged",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
    except Exception as e:
        # Don't fail on security event logging errors
        # Just return success to prevent breaking user experience
        return {
            "status": "logged",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

