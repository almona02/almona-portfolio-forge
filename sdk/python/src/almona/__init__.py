"""
Almona Industrial API Python SDK

A comprehensive Python client for the Almona Industrial API,
providing easy access to all API endpoints with automatic
authentication, error handling, and retry logic.

Example:
    >>> from almona import AlmonaAPIClient
    >>> client = AlmonaAPIClient(base_url="https://api.almona.com")
    >>> client.authenticate("user@example.com", "password")
    >>> ticket = client.create_support_ticket({
    ...     "category": "support",
    ...     "payload": {
    ...         "title": "Machine Issue",
    ...         "description": "Hydraulic pump failure",
    ...         "priority": "high"
    ...     }
    ... })
"""

from .client import AlmonaAPIClient
from .async_client import AsyncAlmonaAPIClient
from .exceptions import AlmonaAPIError, AuthenticationError, ValidationError
from .models import (
    TicketCategory,
    TicketPriority,
    TicketStatus,
    MaintenanceType,
    UnifiedTicketBase,
    SupportTicketCreate,
    PreventiveMaintenanceTicketCreate,
    ScheduledMaintenanceTicketCreate,
    EmergencyServiceTicketCreate,
    ProductQuoteTicketCreate,
    AddToQuoteTicketCreate,
    TicketResponse,
    QuoteItem,
    QuoteCreateRequest,
    QuoteCreateResponse,
    QuoteSummary,
    QuoteLookupResponse,
    Token,
    AlmonaAPIConfig,
)

__version__ = "2.0.0"
__author__ = "Almona Industrial"
__email__ = "api-support@almona.com"

__all__ = [
    # Client classes
    "AlmonaAPIClient",
    "AsyncAlmonaAPIClient",
    
    # Exception classes
    "AlmonaAPIError",
    "AuthenticationError",
    "ValidationError",
    
    # Enums
    "TicketCategory",
    "TicketPriority",
    "TicketStatus",
    "MaintenanceType",
    
    # Models
    "UnifiedTicketBase",
    "SupportTicketCreate",
    "PreventiveMaintenanceTicketCreate",
    "ScheduledMaintenanceTicketCreate",
    "EmergencyServiceTicketCreate",
    "ProductQuoteTicketCreate",
    "AddToQuoteTicketCreate",
    "TicketResponse",
    "QuoteItem",
    "QuoteCreateRequest",
    "QuoteCreateResponse",
    "QuoteSummary",
    "QuoteLookupResponse",
    "Token",
    "AlmonaAPIConfig",
]
