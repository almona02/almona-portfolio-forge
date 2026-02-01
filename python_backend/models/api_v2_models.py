from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from enum import Enum


class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketCategory(str, Enum):
    SUPPORT = "support"
    PREVENTIVE_MAINTENANCE = "preventive_maintenance"
    SCHEDULED_MAINTENANCE = "scheduled_maintenance"
    EMERGENCY = "emergency"
    PRODUCT_QUOTE = "product_quote"
    ADD_TO_QUOTE = "add_to_quote"


class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"
    CRITICAL = "critical"


class UnifiedTicketBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: TicketPriority
    machine_id: Optional[str] = None
    machine_serial_number: Optional[str] = None

    machine_serial_number: Optional[str] = None


class QuoteSummary(BaseModel):
    id: str
    quote_number: str
    status: Optional[str] = None
    digital_twin_code: Optional[str] = None
    portal_reference: Optional[str] = None
    total_amount: Optional[float] = None
    created_at: Optional[str] = None


class QuoteLookupResponse(BaseModel):
    results: List[QuoteSummary]
    count: int


class BulkJobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELED = "canceled"


class BulkOperationStartRequest(BaseModel):
    itemIds: List[str]
    operation: str


class BulkOperationRetryRequest(BaseModel):
    itemIds: Optional[List[str]] = None


class BulkJobProgress(BaseModel):
    completed: int
    total: int
    percentage: float


class BulkJobError(BaseModel):
    itemId: str
    message: str
    code: Optional[str] = None


class BulkJobResult(BaseModel):
    succeeded: int
    failed: int
    errors: List[BulkJobError]
    downloadUrl: Optional[str] = None
    downloadExpiresAt: Optional[str] = None


class BulkJobResponse(BaseModel):
    id: str
    user_id: str
    status: BulkJobStatus
    operation: Any  # can be dict or specific model, service uses dict structure
    progress: BulkJobProgress
    result: Optional[BulkJobResult] = None
    created_at: str
    updated_at: Optional[str] = (
        None  # converted from utcnow_iso which returns str, but might be None
    )
    completed_at: Optional[str] = None
    started_at: Optional[str] = None
    canceled_at: Optional[str] = None
    originalJobId: Optional[str] = None

    # Note: BulkJobResponse in service has more fields like itemCount, originalJobId etc.
    # Service line 81: BulkJobResponse(..., itemCount=..., originalJobId=...)
    itemCount: int = 0


class BulkJobListResponse(BaseModel):
    jobs: List[BulkJobResponse]
    total: int
    limit: int


class ActivityType(str, Enum):
    FIELD_CHANGE = "field_change"
    STATUS_CHANGE = "status_change"
    COMMENT = "comment"
    FILE_UPLOAD = "file_upload"
    CUSTOM = "custom"


class ActivityCommentResponse(BaseModel):
    id: str
    content: str
    user_id: str
    created_at: str
    updated_at: str


class ActivityCommentCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class ActivityCommentUpdateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class ActivityCreateRequest(BaseModel):
    type: ActivityType
    description: str
    metadata: Dict[str, Any] = {}


class ActivityResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    type: ActivityType
    description: str
    metadata: Dict[str, Any] = {}
    comments: List[ActivityCommentResponse] = []
    created_at: str


class ActivityListResponse(BaseModel):
    activities: List[ActivityResponse]
    total: int
    limit: int
    offset: int


class TicketResponse(BaseModel):
    id: str
    category: TicketCategory
    status: TicketStatus
    user_id: str
    created_at: str
    updated_at: str
    payload: Dict[str, Any] = {}


class BaseTicketCreate(BaseModel):
    category: TicketCategory
    payload: Dict[str, Any]


class SupportTicketCreate(BaseTicketCreate):
    pass


class PreventiveMaintenanceTicketCreate(BaseTicketCreate):
    maintenance_metadata: Optional[Dict[str, Any]] = None


class ScheduledMaintenanceTicketCreate(BaseTicketCreate):
    scheduled_for: Any  # datetime or str
    maintenance_metadata: Optional[Dict[str, Any]] = None


class EmergencyServiceTicketCreate(BaseTicketCreate):
    severity: Any  # Enum or str


class ProductQuoteTicketCreate(BaseTicketCreate):
    related_product_id: Optional[str] = None


class AddToQuoteTicketCreate(BaseTicketCreate):
    related_quote_id: Optional[str] = None


class CustomerTagResponse(BaseModel):
    id: str
    name: str
    color: Optional[str] = None


class CustomerTagAssignmentResponse(BaseModel):
    id: str
    customer_id: str
    tag_id: str
    tag: Optional[CustomerTagResponse] = None
    created_at: str


class CustomerTagAssignmentRequest(BaseModel):
    tag_id: str = Field(..., description="Tag ID to assign to customer")


class SectorType(str, Enum):
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    INDUSTRIAL = "industrial"
    GOVERNMENT = "government"
    OTHER = "other"


class CustomerResponse(BaseModel):
    id: str
    name: str
    sector: Optional[SectorType] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    tags: List[CustomerTagResponse] = []
    created_at: str
    updated_at: str


class CustomerCreateRequest(BaseModel):
    name: str
    sector: Optional[SectorType] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class CustomerUpdateRequest(BaseModel):
    name: Optional[str] = None
    sector: Optional[SectorType] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class CustomerListResponse(BaseModel):
    customers: List[CustomerResponse]
    total: int
    page: int
    page_size: int


class CustomerTagCreateRequest(BaseModel):
    name: str
    color: Optional[str] = None


class CustomerTagUpdateRequest(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class CustomerTagListResponse(BaseModel):
    tags: List[CustomerTagResponse]


class CustomerCommunicationResponse(BaseModel):
    id: str
    customer_id: str
    type: str  # email, phone, meeting, etc.
    content: str
    date: str
    user_id: str
    created_at: str


class CustomerCommunicationCreateRequest(BaseModel):
    type: str
    content: str
    date: Optional[str] = None


class CustomerCommunicationUpdateRequest(BaseModel):
    type: Optional[str] = None
    content: Optional[str] = None
    date: Optional[str] = None


class CustomerCommunicationListResponse(BaseModel):
    communications: List[CustomerCommunicationResponse]
    total: int
    offset: int
    limit: int


class CustomerSegmentResponse(BaseModel):
    id: str
    name: str
    criteria: Dict[str, Any]
    count: int
    created_at: str


class CustomerSegmentCreateRequest(BaseModel):
    name: str
    criteria: Dict[str, Any]


class CustomerSegmentUpdateRequest(BaseModel):
    name: Optional[str] = None
    criteria: Optional[Dict[str, Any]] = None


class CustomerSegmentListResponse(BaseModel):
    segments: List[CustomerSegmentResponse]


class CustomerSegmentCustomersResponse(BaseModel):
    segment_id: str
    customers: List[CustomerResponse]
    count: int


class CustomerReminderResponse(BaseModel):
    id: str
    customer_id: str
    title: str
    due_date: str
    completed: bool
    created_at: str


class CustomerReminderCreateRequest(BaseModel):
    title: str
    due_date: str


class CustomerReminderUpdateRequest(BaseModel):
    title: Optional[str] = None
    due_date: Optional[str] = None
    completed: Optional[bool] = None


class CustomerReminderListResponse(BaseModel):
    reminders: List[CustomerReminderResponse]


class CustomerAnalyticsResponse(BaseModel):
    ltv: float
    total_orders: int
    avg_order_value: float
    last_order_date: Optional[str] = None


class CustomerPurchaseHistoryResponse(BaseModel):
    orders: List[Dict[str, Any]]  # Simplified
    total: int
    limit: int
    offset: int


class CustomerRevenueResponse(BaseModel):
    total_revenue: float
    revenue_by_month: Dict[str, float]


class CustomerAnalyticsSummaryResponse(BaseModel):
    total_customers: int
    active_customers: int
    new_customers_this_month: int
    total_revenue_this_month: float


class TemplateCategory(str, Enum):
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    FACADE = "facade"
    CUSTOM = "custom"


class TemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category: Optional[TemplateCategory] = None
    tags: List[str] = []
    thumbnail: Optional[str] = None
    is_public: bool
    usage_count: int
    user_id: str
    project_data: Optional[Dict[str, Any]] = None  # Full project JSON
    created_at: str
    updated_at: str


class TemplateCreateRequest(BaseModel):
    project_id: str
    name: str
    description: Optional[str] = None
    category: Optional[TemplateCategory] = None
    tags: List[str] = []
    is_public: bool = False
    thumbnail: Optional[str] = None  # Base64


class TemplateUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[TemplateCategory] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None
    thumbnail: Optional[str] = None


class TemplateCloneRequest(BaseModel):
    name: str
    description: Optional[str] = None


class TemplateCloneResponse(BaseModel):
    project_id: str
    name: str


class TemplateListResponse(BaseModel):
    templates: List[TemplateResponse]
    total: int
    limit: int
    offset: int


class FilterDomain(str, Enum):
    PROJECTS = "projects"
    POSITIONS = "positions"
    MATERIALS = "materials"
    OPTIMIZATION = "optimization"


class FilterPresetResponse(BaseModel):
    id: str
    name: str
    domain: FilterDomain
    filters: Dict[str, Any]
    user_id: str
    created_at: str
    updated_at: str


class FilterPresetCreateRequest(BaseModel):
    name: str
    domain: FilterDomain
    filters: Dict[str, Any]


class FilterPresetUpdateRequest(BaseModel):
    name: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None


class FilterPresetListResponse(BaseModel):
    presets: List[FilterPresetResponse]
    total: int
    limit: int


class ReportTemplateCategory(str, Enum):
    FINANCIAL = "financial"
    OPERATIONAL = "operational"
    QUALITY = "quality"
    INVENTORY = "inventory"
    CUSTOM = "custom"


class ReportTemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category: Optional[ReportTemplateCategory] = None
    config: Dict[str, Any]
    user_id: str
    created_at: str
    updated_at: str


class ReportTemplateCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[ReportTemplateCategory] = None
    config: Dict[str, Any]


class ReportTemplateUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[ReportTemplateCategory] = None
    config: Optional[Dict[str, Any]] = None


class ReportTemplateListResponse(BaseModel):
    templates: List[ReportTemplateResponse]
    total: int
    limit: int
    offset: int


class ReportFormat(str, Enum):
    PDF = "pdf"
    CSV = "csv"
    EXCEL = "excel"


class ReportGenerationRequest(BaseModel):
    template_id: str
    parameters: Dict[str, Any] = {}
    format: ReportFormat = ReportFormat.PDF


class ReportJobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ReportJobResponse(BaseModel):
    id: str
    status: ReportJobStatus
    progress: float
    download_url: Optional[str] = None
    error: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None


class NotificationChannel(str, Enum):
    EMAIL = "email"
    IN_APP = "in_app"
    PUSH = "push"
    SMS = "sms"


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str  # info, warning, error, success
    title: str
    message: str
    channel: NotificationChannel
    read: bool
    created_at: str
    read_at: Optional[str] = None
    metadata: Dict[str, Any] = {}


class NotificationCreateRequest(BaseModel):
    type: str
    title: str
    message: str
    channel: NotificationChannel
    metadata: Dict[str, Any] = {}


class NotificationUpdateRequest(BaseModel):
    read: Optional[bool] = None


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    offset: int
    limit: int


class QuoteInvoiceTemplateCategory(str, Enum):
    STANDARD = "standard"
    PROFESSIONAL = "professional"
    CREATIVE = "creative"
    SIMPLE = "simple"
    CUSTOM = "custom"


class InvoiceTemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category: Optional[QuoteInvoiceTemplateCategory] = None
    config: Dict[str, Any]
    user_id: str
    created_at: str
    updated_at: str


class InvoiceTemplateCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[QuoteInvoiceTemplateCategory] = None
    config: Dict[str, Any]


class InvoiceTemplateUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[QuoteInvoiceTemplateCategory] = None
    config: Optional[Dict[str, Any]] = None


class InvoiceTemplateListResponse(BaseModel):
    templates: List[InvoiceTemplateResponse]
    total: int
    limit: int
    offset: int


class MetricPeriod(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class WorkflowCategory(str, Enum):
    LEAD_MANAGEMENT = "lead_management"
    ORDER_PROCESSING = "order_processing"
    PRODUCTION = "production"
    INSTALLATION = "installation"
    CUSTOM = "custom"


class WorkflowResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category: Optional[WorkflowCategory] = None
    steps: List[Dict[str, Any]] = []
    triggers: List[Dict[str, Any]] = []
    is_active: bool
    is_template: bool
    user_id: str
    created_at: str
    updated_at: str


class WorkflowCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[WorkflowCategory] = None
    steps: List[Dict[str, Any]] = []
    triggers: List[Dict[str, Any]] = []
    is_active: bool = True
    is_template: bool = False


class WorkflowUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[WorkflowCategory] = None
    steps: Optional[List[Dict[str, Any]]] = None
    triggers: Optional[List[Dict[str, Any]]] = None
    is_active: Optional[bool] = None
    is_template: Optional[bool] = None


class WorkflowListResponse(BaseModel):
    workflows: List[WorkflowResponse]
    total: int
    limit: int
    offset: int


class WorkflowExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class WorkflowExecutionResponse(BaseModel):
    id: str
    workflow_id: str
    status: WorkflowExecutionStatus
    context: Dict[str, Any] = {}
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    started_at: str
    completed_at: Optional[str] = None
    duration_ms: Optional[float] = None


class WorkflowExecutionCreateRequest(BaseModel):
    context: Dict[str, Any] = {}


class WorkflowExecutionListResponse(BaseModel):
    executions: List[WorkflowExecutionResponse]
    total: int
    limit: int
    offset: int


class WorkflowExecutionLogStatus(str, Enum):
    PENDING = "pending"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"


class WorkflowExecutionLogResponse(BaseModel):
    id: str
    execution_id: str
    node_id: str
    node_type: str
    status: WorkflowExecutionLogStatus
    input_data: Optional[Dict[str, Any]] = None
    output_data: Optional[Dict[str, Any]] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error_message: Optional[str] = None
    created_at: str


class WorkflowExecutionLogsResponse(BaseModel):
    logs: List[WorkflowExecutionLogResponse]
    total: int
    limit: int
    offset: int


class CommunicationType(str, Enum):
    NOTE = "note"
    EMAIL = "email"
    PHONE = "phone"
    MEETING = "meeting"
    OTHER = "other"


class CustomerPurchaseHistoryItem(BaseModel):
    project_id: str
    project_code: Optional[str] = None
    project_name: Optional[str] = None
    order_date: str
    amount: Optional[float] = None
    currency: str
    status: Optional[str] = None


class QuoteTemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category: Optional[QuoteInvoiceTemplateCategory] = None
    config: Dict[str, Any]
    user_id: str
    created_at: str
    updated_at: str


class QuoteTemplateCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[QuoteInvoiceTemplateCategory] = None
    config: Dict[str, Any]


class QuoteTemplateUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[QuoteInvoiceTemplateCategory] = None
    config: Optional[Dict[str, Any]] = None


class QuoteTemplateListResponse(BaseModel):
    templates: List[QuoteTemplateResponse]
    total: int
    limit: int
    offset: int


class AnalyticsMetricsRequest(BaseModel):
    period: MetricPeriod
    start_date: Optional[Any] = None  # datetime
    end_date: Optional[Any] = None  # datetime
    include_cache: bool = True


class AnalyticsMetricsResponse(BaseModel):
    metrics: Dict[str, Any]
    period: MetricPeriod
    start_date: str
    end_date: str
    generated_at: str


class AnalyticsQueryRequest(BaseModel):
    query_type: str  # revenue, etc.
    parameters: Dict[str, Any] = {}
    filters: Dict[str, Any] = {}
    group_by: Optional[List[str]] = None


class AnalyticsQueryResponse(BaseModel):
    query_id: str
    results: List[Dict[str, Any]]
    total: int
    meta: Dict[str, Any] = {}
    execution_time_ms: float


# ... existing code ...
