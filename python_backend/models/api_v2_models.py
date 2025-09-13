from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal
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

class TicketBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = Field(
        default="medium",
        description="low|medium|high|urgent|critical",
    )
    machine_id: Optional[str] = Field(
        default=None,
        description="UUID of machine if applicable",
    )
    machine_serial_number: Optional[str] = None

class SupportTicketCreate(TicketBase):
    category: Literal["support"] = "support"


class PreventiveMaintenanceTicketCreate(TicketBase):
    category: Literal["preventive_maintenance"] = "preventive_maintenance"
    maintenance_metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Checklist, frequency, plan id",
    )


class ScheduledMaintenanceTicketCreate(TicketBase):
    category: Literal["scheduled_maintenance"] = "scheduled_maintenance"
    scheduled_for: datetime
    maintenance_metadata: Dict[str, Any] = Field(default_factory=dict)


class EmergencyServiceTicketCreate(TicketBase):
    category: Literal["emergency_service"] = "emergency_service"
    severity: Optional[str] = Field(default="critical")


class ProductQuoteTicketCreate(TicketBase):
    category: Literal["product_quote"] = "product_quote"
    related_product_id: Optional[str] = None


class AddToQuoteTicketCreate(TicketBase):
    category: Literal["add_to_quote"] = "add_to_quote"
    related_quote_id: Optional[str] = None


UnifiedTicketCreate = (
    SupportTicketCreate
    | PreventiveMaintenanceTicketCreate
    | ScheduledMaintenanceTicketCreate
    | EmergencyServiceTicketCreate
    | ProductQuoteTicketCreate
    | AddToQuoteTicketCreate
)


class UnifiedTicketResponse(BaseModel):
    id: str
    ticket_number: str
    category: str
    type: str
    status: str
    priority: str
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
