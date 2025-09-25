"""
Synchronous Almona Industrial API client
"""

import time
import json
from typing import Optional, Dict, Any, List, Union
from urllib.parse import urljoin

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .models import (
    AlmonaAPIConfig,
    Token,
    TicketResponse,
    UnifiedTicketCreate,
    TicketFilters,
    PaginationParams,
    QuoteCreateRequest,
    QuoteCreateResponse,
    QuoteLookupResponse,
    APIError,
)
from .exceptions import (
    AlmonaAPIError,
    AuthenticationError,
    ValidationError,
    RateLimitError,
    NotFoundError,
    ServerError,
    NetworkError,
    TimeoutError,
)


class AlmonaAPIClient:
    """
    Synchronous client for the Almona Industrial API.
    
    This client provides easy access to all API endpoints with automatic
    authentication, error handling, and retry logic.
    
    Example:
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
    
    def __init__(self, config: Union[AlmonaAPIConfig, Dict[str, Any], str]):
        """
        Initialize the API client.
        
        Args:
            config: Configuration object, dictionary, or base URL string
        """
        if isinstance(config, str):
            config = AlmonaAPIConfig(base_url=config)
        elif isinstance(config, dict):
            config = AlmonaAPIConfig(**config)
        
        self.config = config
        self.session = requests.Session()
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        
        self._setup_session()
    
    def _setup_session(self):
        """Setup the requests session with retry strategy and headers."""
        # Configure retry strategy
        retry_strategy = Retry(
            total=self.config.retries,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "PUT", "DELETE", "OPTIONS", "TRACE", "POST"]
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Set default headers
        self.session.headers.update({
            "Content-Type": "application/json",
            "User-Agent": f"AlmonaAPI-Client-Python/{self.__class__.__module__.split('.')[-1]}"
        })
        
        # Set API key if provided
        if self.config.api_key:
            self.session.headers["X-API-Key"] = self.config.api_key
        
        # Set SSL verification
        self.session.verify = self.config.verify_ssl
    
    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        timeout: Optional[int] = None
    ) -> requests.Response:
        """
        Make an HTTP request to the API.
        
        Args:
            method: HTTP method
            endpoint: API endpoint
            data: Request body data
            params: Query parameters
            timeout: Request timeout
            
        Returns:
            Response object
            
        Raises:
            AlmonaAPIError: For API errors
            NetworkError: For network errors
            TimeoutError: For timeout errors
        """
        url = urljoin(self.config.base_url, endpoint)
        timeout = timeout or self.config.timeout
        
        # Add authentication header
        if self.access_token:
            self.session.headers["Authorization"] = f"Bearer {self.access_token}"
        
        try:
            if self.config.debug:
                print(f"[AlmonaAPI] {method.upper()} {url}")
                if data:
                    print(f"[AlmonaAPI] Request data: {json.dumps(data, indent=2)}")
                if params:
                    print(f"[AlmonaAPI] Request params: {params}")
            
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                params=params,
                timeout=timeout
            )
            
            if self.config.debug:
                print(f"[AlmonaAPI] Response {response.status_code}: {response.text[:500]}...")
            
            # Handle HTTP errors
            if response.status_code >= 400:
                self._handle_error_response(response)
            
            return response
            
        except requests.exceptions.Timeout:
            raise TimeoutError("Request timeout")
        except requests.exceptions.ConnectionError:
            raise NetworkError("Connection error")
        except requests.exceptions.RequestException as e:
            raise NetworkError(f"Network error: {str(e)}")
    
    def _handle_error_response(self, response: requests.Response):
        """Handle error responses from the API."""
        try:
            error_data = response.json()
            if "error" in error_data:
                error = error_data["error"]
                message = error.get("message", "Unknown error")
                code = error.get("code", "UNKNOWN_ERROR")
                details = error.get("details")
                context = error.get("context")
            else:
                message = response.text or "Unknown error"
                code = "UNKNOWN_ERROR"
                details = None
                context = None
        except (ValueError, KeyError):
            message = response.text or "Unknown error"
            code = "UNKNOWN_ERROR"
            details = None
            context = None
        
        # Map HTTP status codes to specific exceptions
        if response.status_code == 401:
            raise AuthenticationError(message, code=code, details=details, context=context, status_code=response.status_code)
        elif response.status_code == 400:
            raise ValidationError(message, code=code, details=details, context=context, status_code=response.status_code)
        elif response.status_code == 404:
            raise NotFoundError(message, code=code, details=details, context=context, status_code=response.status_code)
        elif response.status_code == 429:
            raise RateLimitError(message, code=code, details=details, context=context, status_code=response.status_code)
        elif response.status_code >= 500:
            raise ServerError(message, code=code, details=details, context=context, status_code=response.status_code)
        else:
            raise AlmonaAPIError(message, code=code, details=details, context=context, status_code=response.status_code)
    
    def authenticate(self, email: str, password: str) -> Token:
        """
        Authenticate with email and password.
        
        Args:
            email: User email address
            password: User password
            
        Returns:
            Token object with access and refresh tokens
            
        Raises:
            AuthenticationError: If authentication fails
        """
        data = {
            "username": email,
            "password": password
        }
        
        response = self._make_request("POST", "/api/v2/auth/token", data=data)
        token_data = response.json()
        
        token = Token(**token_data)
        self.access_token = token.access_token
        self.refresh_token = token.refresh_token
        
        return token
    
    def refresh_access_token(self) -> Token:
        """
        Refresh the access token using the refresh token.
        
        Returns:
            New token object
            
        Raises:
            AuthenticationError: If refresh fails
        """
        if not self.refresh_token:
            raise AuthenticationError("No refresh token available")
        
        data = {"refresh_token": self.refresh_token}
        response = self._make_request("POST", "/api/v2/auth/refresh", data=data)
        token_data = response.json()
        
        token = Token(**token_data)
        self.access_token = token.access_token
        self.refresh_token = token.refresh_token
        
        return token
    
    def get_current_user(self) -> Dict[str, Any]:
        """
        Get current user information.
        
        Returns:
            User information dictionary
        """
        response = self._make_request("GET", "/api/v2/auth/users/me")
        return response.json()
    
    def create_support_ticket(self, ticket: Union[UnifiedTicketCreate, Dict[str, Any]]) -> TicketResponse:
        """
        Create a support ticket.
        
        Args:
            ticket: Support ticket data
            
        Returns:
            Created ticket response
        """
        if isinstance(ticket, dict):
            ticket = UnifiedTicketCreate(**ticket)
        
        response = self._make_request("POST", "/api/v2/tickets/support", data=ticket.dict())
        return TicketResponse(**response.json())
    
    def create_preventive_maintenance_ticket(self, ticket: Union[UnifiedTicketCreate, Dict[str, Any]]) -> TicketResponse:
        """
        Create a preventive maintenance ticket.
        
        Args:
            ticket: Preventive maintenance ticket data
            
        Returns:
            Created ticket response
        """
        if isinstance(ticket, dict):
            ticket = UnifiedTicketCreate(**ticket)
        
        response = self._make_request("POST", "/api/v2/tickets/maintenance/preventive", data=ticket.dict())
        return TicketResponse(**response.json())
    
    def create_scheduled_maintenance_ticket(self, ticket: Union[UnifiedTicketCreate, Dict[str, Any]]) -> TicketResponse:
        """
        Create a scheduled maintenance ticket.
        
        Args:
            ticket: Scheduled maintenance ticket data
            
        Returns:
            Created ticket response
        """
        if isinstance(ticket, dict):
            ticket = UnifiedTicketCreate(**ticket)
        
        response = self._make_request("POST", "/api/v2/tickets/maintenance/scheduled", data=ticket.dict())
        return TicketResponse(**response.json())
    
    def create_emergency_ticket(self, ticket: Union[UnifiedTicketCreate, Dict[str, Any]]) -> TicketResponse:
        """
        Create an emergency service ticket.
        
        Args:
            ticket: Emergency ticket data
            
        Returns:
            Created ticket response
        """
        if isinstance(ticket, dict):
            ticket = UnifiedTicketCreate(**ticket)
        
        response = self._make_request("POST", "/api/v2/tickets/emergency", data=ticket.dict())
        return TicketResponse(**response.json())
    
    def create_product_quote_ticket(self, ticket: Union[UnifiedTicketCreate, Dict[str, Any]]) -> TicketResponse:
        """
        Create a product quote ticket.
        
        Args:
            ticket: Product quote ticket data
            
        Returns:
            Created ticket response
        """
        if isinstance(ticket, dict):
            ticket = UnifiedTicketCreate(**ticket)
        
        response = self._make_request("POST", "/api/v2/tickets/product-quote", data=ticket.dict())
        return TicketResponse(**response.json())
    
    def create_add_to_quote_ticket(self, ticket: Union[UnifiedTicketCreate, Dict[str, Any]]) -> TicketResponse:
        """
        Create an add-to-quote ticket.
        
        Args:
            ticket: Add-to-quote ticket data
            
        Returns:
            Created ticket response
        """
        if isinstance(ticket, dict):
            ticket = UnifiedTicketCreate(**ticket)
        
        response = self._make_request("POST", "/api/v2/tickets/add-to-quote", data=ticket.dict())
        return TicketResponse(**response.json())
    
    def get_ticket(self, ticket_id: str) -> TicketResponse:
        """
        Get a ticket by ID.
        
        Args:
            ticket_id: Ticket ID
            
        Returns:
            Ticket response
        """
        response = self._make_request("GET", f"/api/v2/tickets/{ticket_id}")
        return TicketResponse(**response.json())
    
    def list_tickets(
        self,
        filters: Optional[Union[TicketFilters, Dict[str, Any]]] = None,
        pagination: Optional[Union[PaginationParams, Dict[str, Any]]] = None
    ) -> List[TicketResponse]:
        """
        List tickets with optional filters and pagination.
        
        Args:
            filters: Ticket filters
            pagination: Pagination parameters
            
        Returns:
            List of ticket responses
        """
        params = {}
        
        if filters:
            if isinstance(filters, dict):
                filters = TicketFilters(**filters)
            for key, value in filters.dict(exclude_none=True).items():
                if value is not None:
                    params[key] = value
        
        if pagination:
            if isinstance(pagination, dict):
                pagination = PaginationParams(**pagination)
            for key, value in pagination.dict(exclude_none=True).items():
                if value is not None:
                    params[key] = value
        
        response = self._make_request("GET", "/api/v2/tickets", params=params)
        return [TicketResponse(**ticket) for ticket in response.json()]
    
    def update_ticket_status(
        self,
        ticket_id: str,
        status: str,
        resolution_summary: Optional[str] = None
    ) -> TicketResponse:
        """
        Update ticket status.
        
        Args:
            ticket_id: Ticket ID
            status: New status
            resolution_summary: Optional resolution summary
            
        Returns:
            Updated ticket response
        """
        data = {"status": status}
        if resolution_summary:
            data["resolution_summary"] = resolution_summary
        
        response = self._make_request("POST", f"/api/v2/tickets/{ticket_id}/status", data=data)
        return TicketResponse(**response.json())
    
    def assign_ticket(self, ticket_id: str, assignee_id: str) -> TicketResponse:
        """
        Assign ticket to a user.
        
        Args:
            ticket_id: Ticket ID
            assignee_id: Assignee user ID
            
        Returns:
            Updated ticket response
        """
        response = self._make_request("POST", f"/api/v2/tickets/{ticket_id}/assign/{assignee_id}")
        return TicketResponse(**response.json())
    
    def add_ticket_message(
        self,
        ticket_id: str,
        message: str,
        message_type: str = "message",
        is_internal: bool = False
    ) -> Dict[str, Any]:
        """
        Add message to ticket.
        
        Args:
            ticket_id: Ticket ID
            message: Message content
            message_type: Type of message
            is_internal: Whether message is internal
            
        Returns:
            Message response
        """
        data = {
            "message": message,
            "message_type": message_type,
            "is_internal": is_internal
        }
        
        response = self._make_request("POST", f"/api/v2/tickets/{ticket_id}/messages", data=data)
        return response.json()
    
    def get_ticket_messages(self, ticket_id: str) -> List[Dict[str, Any]]:
        """
        Get ticket messages.
        
        Args:
            ticket_id: Ticket ID
            
        Returns:
            List of messages
        """
        response = self._make_request("GET", f"/api/v2/tickets/{ticket_id}/messages")
        return response.json()
    
    def create_quote(self, quote: Union[QuoteCreateRequest, Dict[str, Any]]) -> QuoteCreateResponse:
        """
        Create a quote.
        
        Args:
            quote: Quote creation data
            
        Returns:
            Created quote response
        """
        if isinstance(quote, dict):
            quote = QuoteCreateRequest(**quote)
        
        response = self._make_request("POST", "/api/v2/quotes/create", data=quote.dict())
        return QuoteCreateResponse(**response.json())
    
    def lookup_quotes(self, query: str) -> QuoteLookupResponse:
        """
        Lookup quotes by query.
        
        Args:
            query: Search query
            
        Returns:
            Quote lookup response
        """
        params = {"q": query}
        response = self._make_request("GET", "/api/v2/quotes/lookup", params=params)
        return QuoteLookupResponse(**response.json())
    
    def get_health_status(self) -> Dict[str, Any]:
        """
        Get system health status.
        
        Returns:
            Health status information
        """
        response = self._make_request("GET", "/health")
        return response.json()
    
    def get_metrics(self) -> Dict[str, Any]:
        """
        Get system metrics.
        
        Returns:
            System metrics
        """
        response = self._make_request("GET", "/metrics/json")
        return response.json()
    
    def close(self):
        """Close the client session."""
        self.session.close()
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()
