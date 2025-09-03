"""
Pydantic models for email notification requests and responses.
"""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime


class NotificationRequest(BaseModel):
    """Base model for notification requests."""
    ticket_id: str = Field(..., description="UUID of the ticket")
    
    class Config:
        json_schema_extra = {
            "example": {
                "ticket_id": "123e4567-e89b-12d3-a456-426614174000"
            }
        }


class TicketCreatedNotificationRequest(NotificationRequest):
    """Request model for ticket created notifications."""
    admin_emails: Optional[List[EmailStr]] = Field(
        None,
        description="Optional list of admin emails to override defaults"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "ticket_id": "123e4567-e89b-12d3-a456-426614174000",
                "admin_emails": ["admin1@almona.com", "admin2@almona.com"]
            }
        }


class TicketAssignedNotificationRequest(NotificationRequest):
    """Request model for ticket assigned notifications."""
    technician_id: Optional[str] = Field(
        None,
        description="UUID of technician (if not provided, fetched from ticket)"
    )
    technician_email: Optional[EmailStr] = Field(
        None,
        description="Email of technician (if not provided, fetched from DB)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "ticket_id": "123e4567-e89b-12d3-a456-426614174000",
                "technician_id": "456e7890-e89b-12d3-a456-426614174001",
                "technician_email": "technician@almona.com"
            }
        }


class MessageAddedNotificationRequest(NotificationRequest):
    """Request model for message added notifications."""
    message_id: str = Field(..., description="UUID of the message")
    author_id: str = Field(..., description="UUID of message author")
    recipient_email: Optional[EmailStr] = Field(
        None,
        description=(
            "Specific recipient email (if not provided, auto-determined)"
        )
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "ticket_id": "123e4567-e89b-12d3-a456-426614174000",
                "message_id": "789e0123-e89b-12d3-a456-426614174002",
                "author_id": "456e7890-e89b-12d3-a456-426614174001",
                "recipient_email": "customer@example.com"
            }
        }


class TicketResolvedNotificationRequest(NotificationRequest):
    """Request model for ticket resolved notifications."""
    customer_email: Optional[EmailStr] = Field(
        None,
        description="Customer email (if not provided, fetched from ticket)"
    )
    resolution_summary: Optional[str] = Field(
        None,
        description="Summary of the resolution"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "ticket_id": "123e4567-e89b-12d3-a456-426614174000",
                "customer_email": "customer@example.com",
                "resolution_summary": "Issue resolved by replacing faulty part"
            }
        }


class NotificationResponse(BaseModel):
    """Response model for notification requests."""
    success: bool = Field(..., description="Whether the notification was sent")
    message: str = Field(..., description="Response message")
    notification_id: Optional[str] = Field(
        None,
        description="ID of the notification (if applicable)"
    )
    recipients: List[str] = Field(
        default_factory=list,
        description="List of email addresses that received the notification"
    )
    timestamp: datetime = Field(
        default_factory=datetime.now,
        description="Timestamp when notification was processed"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Notification sent successfully",
                "notification_id": "notif_123456789",
                "recipients": ["admin@almona.com", "manager@almona.com"],
                "timestamp": "2024-01-15T10:30:00Z"
            }
        }


class NotificationError(BaseModel):
    """Error response model for notification failures."""
    success: bool = Field(False, description="Always false for errors")
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Detailed error message")
    ticket_id: Optional[str] = Field(
        None,
        description="Ticket ID that caused the error"
    )
    timestamp: datetime = Field(
        default_factory=datetime.now,
        description="Timestamp when error occurred"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error": "TICKET_NOT_FOUND",
                "message": (
                    "Ticket with ID 123e4567-e89b-12d3-a456-426614174000 not found"
                ),
                "ticket_id": "123e4567-e89b-12d3-a456-426614174000",
                "timestamp": "2024-01-15T10:30:00Z"
            }
        }


class BulkNotificationRequest(BaseModel):
    """Request model for sending multiple notifications."""
    notifications: List[Dict[str, Any]] = Field(
        ...,
        description="List of notification requests"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "notifications": [
                    {
                        "type": "ticket_created",
                        "ticket_id": "123e4567-e89b-12d3-a456-426614174000"
                    },
                    {
                        "type": "ticket_assigned",
                        "ticket_id": "456e7890-e89b-12d3-a456-426614174001",
                        "technician_email": "tech@almona.com"
                    }
                ]
            }
        }


class BulkNotificationResponse(BaseModel):
    """Response model for bulk notification requests."""
    total_requested: int = Field(
        ...,
        description="Total number of notifications requested"
    )
    successful: int = Field(
        ...,
        description="Number of notifications sent successfully"
    )
    failed: int = Field(
        ...,
        description="Number of notifications that failed"
    )
    results: List[NotificationResponse] = Field(
        ...,
        description="Individual results for each notification"
    )
    timestamp: datetime = Field(
        default_factory=datetime.now,
        description="Timestamp when bulk operation was processed"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_requested": 2,
                "successful": 1,
                "failed": 1,
                "results": [
                    {
                        "success": True,
                        "message": "Notification sent successfully",
                        "recipients": ["admin@almona.com"]
                    },
                    {
                        "success": False,
                        "message": "Ticket not found"
                    }
                ],
                "timestamp": "2024-01-15T10:30:00Z"
            }
        }


# Email template context models for validation
class TicketContextModel(BaseModel):
    """Model for ticket context in email templates."""
    ticket_number: str
    title: str
    description: Optional[str] = None
    type: str
    priority: str
    status: str
    created_at: str
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    assigned_user_name: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "ticket_number": "TKT-2024-000001",
                "title": "Machine Installation Issue",
                "description": "Need help with installing new equipment",
                "type": "installation",
                "priority": "high",
                "status": "open",
                "created_at": "2024-01-15T10:00:00Z",
                "customer_name": "John Doe",
                "customer_email": "john@example.com",
                "assigned_user_name": "Ahmed Hassan"
            }
        }


class MessageContextModel(BaseModel):
    """Model for message context in email templates."""
    message: str
    author_name: str
    author_role: str
    created_at: str
    is_internal_note: bool = False
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": (
                    "I have reviewed your request and will start working on it."
                ),
                "author_name": "Ahmed Hassan",
                "author_role": "technician",
                "created_at": "2024-01-15T11:00:00Z",
                "is_internal_note": False
            }
        }
