"""
Data models for Almona Industrial API
"""

from enum import Enum
from typing import Optional, List, Dict, Any, Union, Literal
from datetime import datetime
from pydantic import BaseModel, Field


class TicketCategory(str, Enum):
    """Ticket category enumeration."""
    SUPPORT = "support"
    PREVENTIVE_MAINTENANCE = "preventive_maintenance"
    SCHEDULED_MAINTENANCE = "scheduled_maintenance"
    EMERGENCY_SERVICE = "emergency_service"
    PRODUCT_QUOTE = "product_quote"
    ADD_TO_QUOTE = "add_to_quote"


class TicketPriority(str, Enum):
    """Ticket priority enumeration."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"
    CRITICAL = "critical"


class TicketStatus(str, Enum):
    """Ticket status enumeration."""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"
    CANCELED = "canceled"


class MaintenanceType(str, Enum):
    """Maintenance type enumeration."""
    ROUTINE = "routine"
    INSPECTION = "inspection"
    LUBRICATION = "lubrication"
    CALIBRATION = "calibration"
    SAFETY_CHECK = "safety_check"


class UnifiedTicketBase(BaseModel):
    """Base ticket information."""
    title: str = Field(..., description="Brief title describing the ticket")
    description: Optional[str] = Field(None, description="Detailed description of the issue or request")
    priority: TicketPriority = Field(default=TicketPriority.MEDIUM, description="Priority level of the ticket")
    machine_id: Optional[str] = Field(None, description="UUID of machine if applicable")
    machine_serial_number: Optional[str] = Field(None, description="Serial number of the machine")


class PreventiveMaintenanceMetadata(BaseModel):
    """Preventive maintenance metadata."""
    checklist_id: Optional[str] = Field(None, description="ID of the maintenance checklist to follow")
    frequency_days: Optional[int] = Field(None, description="Planned frequency in days")
    plan_id: Optional[str] = Field(None, description="ID of the maintenance plan")
    maintenance_type: Optional[MaintenanceType] = Field(None, description="Type of maintenance to be performed")


class SupportTicketCreate(BaseModel):
    """Support ticket creation model."""
    category: Literal[TicketCategory.SUPPORT] = TicketCategory.SUPPORT
    payload: UnifiedTicketBase


class PreventiveMaintenanceTicketCreate(BaseModel):
    """Preventive maintenance ticket creation model."""
    category: Literal[TicketCategory.PREVENTIVE_MAINTENANCE] = TicketCategory.PREVENTIVE_MAINTENANCE
    payload: UnifiedTicketBase
    maintenance_metadata: PreventiveMaintenanceMetadata = Field(default_factory=PreventiveMaintenanceMetadata)


class ScheduledMaintenanceTicketCreate(BaseModel):
    """Scheduled maintenance ticket creation model."""
    category: Literal[TicketCategory.SCHEDULED_MAINTENANCE] = TicketCategory.SCHEDULED_MAINTENANCE
    payload: UnifiedTicketBase
    scheduled_for: datetime = Field(..., description="Scheduled maintenance date")
    maintenance_metadata: PreventiveMaintenanceMetadata = Field(default_factory=PreventiveMaintenanceMetadata)


class EmergencyServiceTicketCreate(BaseModel):
    """Emergency service ticket creation model."""
    category: Literal[TicketCategory.EMERGENCY_SERVICE] = TicketCategory.EMERGENCY_SERVICE
    payload: UnifiedTicketBase
    severity: TicketPriority = Field(default=TicketPriority.CRITICAL, description="Severity level for emergency triage")


class ProductQuoteTicketCreate(BaseModel):
    """Product quote ticket creation model."""
    category: Literal[TicketCategory.PRODUCT_QUOTE] = TicketCategory.PRODUCT_QUOTE
    payload: UnifiedTicketBase
    related_product_id: Optional[str] = Field(None, description="ID of the related product")


class AddToQuoteTicketCreate(BaseModel):
    """Add to quote ticket creation model."""
    category: Literal[TicketCategory.ADD_TO_QUOTE] = TicketCategory.ADD_TO_QUOTE
    payload: UnifiedTicketBase
    related_quote_id: Optional[str] = Field(None, description="ID of the related quote")


UnifiedTicketCreate = Union[
    SupportTicketCreate,
    PreventiveMaintenanceTicketCreate,
    ScheduledMaintenanceTicketCreate,
    EmergencyServiceTicketCreate,
    ProductQuoteTicketCreate,
    AddToQuoteTicketCreate,
]


class TicketResponse(BaseModel):
    """Ticket response model."""
    id: str = Field(..., description="Unique ticket identifier")
    ticket_number: str = Field(..., description="Human-readable ticket number")
    category: TicketCategory = Field(..., description="Ticket category")
    status: TicketStatus = Field(..., description="Current ticket status")
    priority: TicketPriority = Field(..., description="Ticket priority level")
    title: str = Field(..., description="Ticket title")
    description: Optional[str] = Field(None, description="Detailed description")
    digital_twin_code: Optional[str] = Field(None, description="Digital twin reference code")
    scheduled_for: Optional[datetime] = Field(None, description="Scheduled maintenance date")
    machine_id: Optional[str] = Field(None, description="Associated machine ID")
    machine_serial_number: Optional[str] = Field(None, description="Machine serial number")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class QuoteItem(BaseModel):
    """Quote item model."""
    product_id: Optional[str] = Field(None, description="ID of the product to quote")
    service_id: Optional[str] = Field(None, description="ID of the service to quote")
    quantity: int = Field(1, description="Quantity of the item", ge=1)
    unit_price: Optional[float] = Field(None, description="Unit price of the item", ge=0)

    @property
    def total(self) -> Optional[float]:
        """Calculate total price for this item."""
        if self.unit_price is None:
            return None
        return self.unit_price * self.quantity


class QuoteCreateRequest(BaseModel):
    """Quote creation request model."""
    products: List[QuoteItem] = Field(default_factory=list, description="List of products to include in the quote")
    services: List[QuoteItem] = Field(default_factory=list, description="List of services to include in the quote")
    contact_name: str = Field(..., description="Name of the contact person")
    contact_email: str = Field(..., description="Email address of the contact person")
    contact_phone: Optional[str] = Field(None, description="Phone number of the contact person")
    company: Optional[str] = Field(None, description="Company name")
    project_description: Optional[str] = Field(None, description="Description of the project or requirements")
    urgency: Optional[str] = Field(default="standard", description="Urgency level of the quote request")
    delivery_location: Optional[str] = Field(None, description="Delivery location address")
    special_requirements: Optional[str] = Field(None, description="Any special requirements or notes")
    related_service_ticket_id: Optional[str] = Field(None, description="Link to an existing service_ticket if any")
    machine_id: Optional[str] = Field(None, description="ID of the machine this quote is related to")


class QuoteCreateResponse(BaseModel):
    """Quote creation response model."""
    id: str = Field(..., description="Unique quote identifier")
    quote_number: str = Field(..., description="Human-readable quote number")
    digital_twin_code: Optional[str] = Field(None, description="Digital twin reference code")
    portal_reference: Optional[str] = Field(None, description="Portal reference code")
    status: str = Field(..., description="Quote status")
    total_amount: Optional[float] = Field(None, description="Total quote amount")
    related_service_ticket_id: Optional[str] = Field(None, description="Related service ticket ID")
    created_at: datetime = Field(..., description="Creation timestamp")


class QuoteSummary(BaseModel):
    """Quote summary model."""
    id: str = Field(..., description="Unique quote identifier")
    quote_number: str = Field(..., description="Human-readable quote number")
    status: str = Field(..., description="Quote status")
    digital_twin_code: Optional[str] = Field(None, description="Digital twin reference code")
    portal_reference: Optional[str] = Field(None, description="Portal reference code")
    total_amount: Optional[float] = Field(None, description="Total quote amount")
    created_at: datetime = Field(..., description="Creation timestamp")


class QuoteLookupResponse(BaseModel):
    """Quote lookup response model."""
    results: List[QuoteSummary] = Field(..., description="List of matching quotes")
    count: int = Field(..., description="Total number of results")


class Token(BaseModel):
    """Authentication token model."""
    access_token: str = Field(..., description="JWT access token for API authentication")
    refresh_token: str = Field(..., description="JWT refresh token for obtaining new access tokens")
    token_type: str = Field(..., description="Token type, always 'bearer'")


class AlmonaAPIConfig(BaseModel):
    """API client configuration model."""
    base_url: str = Field(..., description="Base URL of the API")
    api_key: Optional[str] = Field(None, description="API key for authentication")
    timeout: int = Field(default=30, description="Request timeout in seconds")
    retries: int = Field(default=3, description="Number of retries for failed requests")
    debug: bool = Field(default=False, description="Enable debug logging")
    verify_ssl: bool = Field(default=True, description="Verify SSL certificates")


class APIError(BaseModel):
    """API error response model."""
    error: Dict[str, Any] = Field(..., description="Error details")


class PaginationParams(BaseModel):
    """Pagination parameters model."""
    page: Optional[int] = Field(None, description="Page number", ge=1)
    limit: Optional[int] = Field(None, description="Items per page", ge=1, le=100)
    offset: Optional[int] = Field(None, description="Number of items to skip", ge=0)


class TicketFilters(BaseModel):
    """Ticket filters model."""
    category: Optional[TicketCategory] = Field(None, description="Filter by ticket category")
    status: Optional[TicketStatus] = Field(None, description="Filter by ticket status")
    priority: Optional[TicketPriority] = Field(None, description="Filter by ticket priority")
    machine_id: Optional[str] = Field(None, description="Filter by machine ID")
    created_after: Optional[datetime] = Field(None, description="Filter tickets created after this date")
    created_before: Optional[datetime] = Field(None, description="Filter tickets created before this date")


class QuoteFilters(BaseModel):
    """Quote filters model."""
    status: Optional[str] = Field(None, description="Filter by quote status")
    created_after: Optional[datetime] = Field(None, description="Filter quotes created after this date")
    created_before: Optional[datetime] = Field(None, description="Filter quotes created before this date")
    contact_email: Optional[str] = Field(None, description="Filter by contact email")
