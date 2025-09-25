from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal, Union
from enum import Enum
from datetime import datetime

 
class BoundingBox(BaseModel):
    bbox: List[float]
    confidence: float
    class_id: int
    class_name: str
    center: List[float]

 
class ImageInfo(BaseModel):
    width: int
    height: int
    channels: int

 
class ModelInfo(BaseModel):
    framework: str
    confidence_threshold: float
    model_version: str

 
class PartDetectionResponseData(BaseModel):
    detections: List[BoundingBox]
    image_info: ImageInfo
    model_info: ModelInfo

 
class PartDetectionResponse(BaseModel):
    success: bool
    data: PartDetectionResponseData
    timestamp: str
    api_version: str

 
class BatchPartDetectionResponse(BaseModel):
    success: bool
    data: List[PartDetectionResponseData]
    processed_count: int
    timestamp: str
    api_version: str

 
class HealthCheckResponse(BaseModel):
    status: str
    version: str
    timestamp: str

 
class ModelVersionInfo(BaseModel):
    type: str
    framework: str
    input_size: int
    available_versions: Dict[str, str]

 
class GetModelInfoResponse(BaseModel):
    success: bool
    data: Dict[str, Any]


# ---------------- Unified Ticketing Models ----------------

"""Unified Ticketing domain models (enhanced).

New endpoints should prefer the Enum-based models below. Older code paths that
import earlier literal-based variants can be migrated gradually.
"""


class TicketCategory(str, Enum):
    support = "support"
    preventive_maintenance = "preventive_maintenance"
    scheduled_maintenance = "scheduled_maintenance"
    emergency_service = "emergency_service"
    product_quote = "product_quote"
    add_to_quote = "add_to_quote"


class TicketPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"
    critical = "critical"


class TicketStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"
    canceled = "canceled"


class MaintenanceType(str, Enum):
    routine = "routine"
    inspection = "inspection"
    lubrication = "lubrication"
    calibration = "calibration"
    safety_check = "safety_check"


class UnifiedTicketBase(BaseModel):
    title: str = Field(
        ...,
        description="Brief title describing the ticket",
        example="Hydraulic pump failure on CNC machine"
    )
    description: Optional[str] = Field(
        None,
        description="Detailed description of the issue or request",
        example="The hydraulic pump on our CNC machine (Model XYZ-2000) has started making unusual noises and the pressure readings are inconsistent. This is affecting production quality."
    )
    priority: TicketPriority = Field(
        default=TicketPriority.medium,
        description="Priority level of the ticket",
        example=TicketPriority.high
    )
    machine_id: Optional[str] = Field(
        default=None,
        description="UUID of machine if applicable",
        example="550e8400-e29b-41d4-a716-446655440000"
    )
    machine_serial_number: Optional[str] = Field(
        None,
        description="Serial number of the machine",
        example="CNC-2023-001234"
    )


class SupportTicketCreate(BaseModel):
    category: Literal[TicketCategory.support] = TicketCategory.support
    payload: UnifiedTicketBase
    
    class Config:
        schema_extra = {
            "example": {
                "category": "support",
                "payload": {
                    "title": "Hydraulic pump failure on CNC machine",
                    "description": "The hydraulic pump on our CNC machine (Model XYZ-2000) has started making unusual noises and the pressure readings are inconsistent. This is affecting production quality.",
                    "priority": "high",
                    "machine_id": "550e8400-e29b-41d4-a716-446655440000",
                    "machine_serial_number": "CNC-2023-001234"
                }
            }
        }


class PreventiveMaintenanceMetadata(BaseModel):
    checklist_id: Optional[str] = Field(
        None,
        description="ID of the maintenance checklist to follow",
        example="checklist-001"
    )
    frequency_days: Optional[int] = Field(
        default=None,
        description="Planned frequency in days",
        example=30
    )
    plan_id: Optional[str] = Field(
        None,
        description="ID of the maintenance plan",
        example="plan-monthly-001"
    )
    maintenance_type: Optional[MaintenanceType] = Field(
        None,
        description="Type of maintenance to be performed",
        example=MaintenanceType.routine
    )


class PreventiveMaintenanceTicketCreate(BaseModel):
    category: Literal[
        TicketCategory.preventive_maintenance
    ] = TicketCategory.preventive_maintenance
    payload: UnifiedTicketBase
    maintenance_metadata: PreventiveMaintenanceMetadata = Field(
        default_factory=PreventiveMaintenanceMetadata
    )
    
    class Config:
        schema_extra = {
            "example": {
                "category": "preventive_maintenance",
                "payload": {
                    "title": "Monthly maintenance for CNC machine",
                    "description": "Scheduled monthly maintenance including lubrication, calibration, and safety checks",
                    "priority": "medium",
                    "machine_id": "550e8400-e29b-41d4-a716-446655440000",
                    "machine_serial_number": "CNC-2023-001234"
                },
                "maintenance_metadata": {
                    "checklist_id": "checklist-001",
                    "frequency_days": 30,
                    "plan_id": "plan-monthly-001",
                    "maintenance_type": "routine"
                }
            }
        }


class ScheduledMaintenanceTicketCreate(BaseModel):
    category: Literal[
        TicketCategory.scheduled_maintenance
    ] = TicketCategory.scheduled_maintenance
    payload: UnifiedTicketBase
    scheduled_for: datetime
    maintenance_metadata: PreventiveMaintenanceMetadata = Field(
        default_factory=PreventiveMaintenanceMetadata
    )


class EmergencyServiceTicketCreate(BaseModel):
    category: Literal[
        TicketCategory.emergency_service
    ] = TicketCategory.emergency_service
    payload: UnifiedTicketBase
    severity: TicketPriority = Field(
        default=TicketPriority.critical,
        description="Severity aligns with priority scale for emergency triage",
    )


class ProductQuoteTicketCreate(BaseModel):
    category: Literal[TicketCategory.product_quote] = (
        TicketCategory.product_quote
    )
    payload: UnifiedTicketBase
    related_product_id: Optional[str] = None


class AddToQuoteTicketCreate(BaseModel):
    category: Literal[TicketCategory.add_to_quote] = (
        TicketCategory.add_to_quote
    )
    payload: UnifiedTicketBase
    related_quote_id: Optional[str] = None


UnifiedTicketCreate = Union[
    SupportTicketCreate,
    PreventiveMaintenanceTicketCreate,
    ScheduledMaintenanceTicketCreate,
    EmergencyServiceTicketCreate,
    ProductQuoteTicketCreate,
    AddToQuoteTicketCreate,
]


class TicketResponse(BaseModel):
    id: str = Field(..., description="Unique ticket identifier", example="550e8400-e29b-41d4-a716-446655440001")
    ticket_number: str = Field(..., description="Human-readable ticket number", example="TKT-2024-001234")
    category: TicketCategory = Field(..., description="Ticket category", example=TicketCategory.support)
    status: TicketStatus = Field(..., description="Current ticket status", example=TicketStatus.open)
    priority: TicketPriority = Field(..., description="Ticket priority level", example=TicketPriority.high)
    title: str = Field(..., description="Ticket title", example="Hydraulic pump failure on CNC machine")
    description: Optional[str] = Field(None, description="Detailed description", example="The hydraulic pump on our CNC machine has started making unusual noises...")
    digital_twin_code: Optional[str] = Field(None, description="Digital twin reference code", example="DT-2024-001")
    scheduled_for: Optional[datetime] = Field(None, description="Scheduled maintenance date", example="2024-02-15T10:00:00Z")
    machine_id: Optional[str] = Field(None, description="Associated machine ID", example="550e8400-e29b-41d4-a716-446655440000")
    machine_serial_number: Optional[str] = Field(None, description="Machine serial number", example="CNC-2023-001234")
    created_at: datetime = Field(..., description="Creation timestamp", example="2024-01-15T10:30:00Z")
    updated_at: datetime = Field(..., description="Last update timestamp", example="2024-01-15T14:45:00Z")
    
    class Config:
        schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440001",
                "ticket_number": "TKT-2024-001234",
                "category": "support",
                "status": "open",
                "priority": "high",
                "title": "Hydraulic pump failure on CNC machine",
                "description": "The hydraulic pump on our CNC machine (Model XYZ-2000) has started making unusual noises and the pressure readings are inconsistent.",
                "digital_twin_code": "DT-2024-001",
                "scheduled_for": None,
                "machine_id": "550e8400-e29b-41d4-a716-446655440000",
                "machine_serial_number": "CNC-2023-001234",
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T14:45:00Z"
            }
        }


class QuoteLookupRequest(BaseModel):
    query: str = Field(
        description=(
            "Partial quote number, digital twin code, or portal reference"
        )
    )


class QuoteSummary(BaseModel):
    id: str
    quote_number: str
    status: str
    digital_twin_code: Optional[str] = None
    portal_reference: Optional[str] = None
    total_amount: Optional[float] = None
    created_at: datetime


class QuoteLookupResponse(BaseModel):
    results: List[QuoteSummary]
    count: int
