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
    title: str
    description: Optional[str] = None
    priority: TicketPriority = Field(default=TicketPriority.medium)
    machine_id: Optional[str] = Field(
        default=None, description="UUID of machine if applicable"
    )
    machine_serial_number: Optional[str] = None


class SupportTicketCreate(BaseModel):
    category: Literal[TicketCategory.support] = TicketCategory.support
    payload: UnifiedTicketBase


class PreventiveMaintenanceMetadata(BaseModel):
    checklist_id: Optional[str] = None
    frequency_days: Optional[int] = Field(
        default=None, description="Planned frequency in days"
    )
    plan_id: Optional[str] = None
    maintenance_type: Optional[MaintenanceType] = None


class PreventiveMaintenanceTicketCreate(BaseModel):
    category: Literal[
        TicketCategory.preventive_maintenance
    ] = TicketCategory.preventive_maintenance
    payload: UnifiedTicketBase
    maintenance_metadata: PreventiveMaintenanceMetadata = Field(
        default_factory=PreventiveMaintenanceMetadata
    )


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
    id: str
    ticket_number: str
    category: TicketCategory
    status: TicketStatus
    priority: TicketPriority
    title: str
    description: Optional[str] = None
    digital_twin_code: Optional[str] = None
    scheduled_for: Optional[datetime] = None
    machine_id: Optional[str] = None
    machine_serial_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime


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
