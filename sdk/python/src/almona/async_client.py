"""
Asynchronous Almona Industrial API client
"""

import asyncio
import json
from typing import Optional, Dict, Any, List, Union
from urllib.parse import urljoin

import aiohttp
from aiohttp import ClientSession, ClientTimeout

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


class AsyncAlmonaAPIClient:
    """
    Asynchronous client for the Almona Industrial API.
    
    This client provides async access to all API endpoints with automatic
    authentication, error handling, and retry logic.
    
    Example:
        >>> async with AsyncAlmonaAPIClient(base_url="https://api.almona.com") as client:
        ...     await client.authenticate("user@example.com", "password")
        ...     ticket = await client.create_support_ticket({
        ...         "category": "support",
        ...         "payload": {
        ...             "title": "Machine Issue",
        ...             "description": "Hydraulic pump failure",
        ...             "priority": "high"
        ...         }
        ...     })
    """
    
    def __init__(self, config: Union[AlmonaAPIConfig, Dict[str, Any], str]):
        """
        Initialize the async API client.
        
        Args:
            config: Configuration object, dictionary, or base URL string
        """
        if isinstance(config, str):
            config = AlmonaAPIConfig(base_url=config)
        elif isinstance(config, dict):
            config = AlmonaAPIConfig(**config)
        
        self.config = config
        self.session: Optional[ClientSession] = None
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self._create_session()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    async def _create_session(self):
        """Create the aiohttp session."""
        timeout = ClientTimeout(total=self.config.timeout)
        connector = aiohttp.TCPConnector(verify_ssl=self.config.verify_ssl)
        
        self.session = ClientSession(
            timeout=timeout,
            connector=connector,
            headers={
                "Content-Type": "application/json",
                "User-Agent": f"AlmonaAPI-AsyncClient-Python/{self.__class__.__module__.split('.')[-1]}"
            }
        )
        
        # Set API key if provided
        if self.config.api_key:
            self.session.headers["X-API-Key"] = self.config.api_key
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        timeout: Optional[int] = None
    ) -> aiohttp.ClientResponse:
        """
        Make an async HTTP request to the API.
        
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
        if not self.session:
            await self._create_session()
        
        url = urljoin(self.config.base_url, endpoint)
        
        # Add authentication header
        headers = {}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        
        try:
            if self.config.debug:
                print(f"[AlmonaAPI] {method.upper()} {url}")
                if data:
                    print(f"[AlmonaAPI] Request data: {json.dumps(data, indent=2)}")
                if params:
                    print(f"[AlmonaAPI] Request params: {params}")
            
            async with self.session.request(
                method=method,
                url=url,
                json=data,
                params=params,
                headers=headers,
                timeout=timeout or self.config.timeout
            ) as response:
                
                if self.config.debug:
                    response_text = await response.text()
                    print(f"[AlmonaAPI] Response {response.status}: {response_text[:500]}...")
                
                # Handle HTTP errors
                if response.status >= 400:
                    await self._handle_error_response(response)
                
                return response
                
        except asyncio.TimeoutError:
            raise TimeoutError("Request timeout")
        except aiohttp.ClientError as e:
            raise NetworkError(f"Network error: {str(e)}")
    
    async def _handle_error_response(self, response: aiohttp.ClientResponse):
        """Handle error responses from the API."""
        try:
            error_data = await response.json()
            if "error" in error_data:
                error = error_data["error"]
                message = error.get("message", "Unknown error")
                code = error.get("code", "UNKNOWN_ERROR")
                details = error.get("details")
                context = error.get("context")
            else:
                message = await response.text() or "Unknown error"
                code = "UNKNOWN_ERROR"
                details = None
                context = None
        except (ValueError, KeyError, aiohttp.ContentTypeError):
            message = await response.text() or "Unknown error"
            code = "UNKNOWN_ERROR"
            details = None
            context = None
        
        # Map HTTP status codes to specific exceptions
        if response.status == 401:
            raise AuthenticationError(message, code=code, details=details, context=context, status_code=response.status)
        elif response.status == 400:
            raise ValidationError(message, code=code, details=details, context=context, status_code=response.status)
        elif response.status == 404:
            raise NotFoundError(message, code=code, details=details, context=context, status_code=response.status)
        elif response.status == 429:
            raise RateLimitError(message, code=code, details=details, context=context, status_code=response.status)
        elif response.status >= 500:
            raise ServerError(message, code=code, details=details, context=context, status_code=response.status)
        else:
            raise AlmonaAPIError(message, code=code, details=details, context=context, status_code=response.status)
    
    async def authenticate(self, email: str, password: str) -> Token:
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
        
        response = await self._make_request("POST", "/api/v2/auth/token", data=data)
        token_data = await response.json()
        
        token = Token(**token_data)
        self.access_token = token.access_token
        self.refresh_token = token.refresh_token
        
        return token
    
    async def refresh_access_token(self) -> Token:
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
        response = await self._make_request("POST", "/api/v2/auth/refresh", data=data)
        token_data = await response.json()
        
        token = Token(**token_data)
        self.access_token = token.access_token
        self.refresh_token = token.refresh_token
        
        return token
    
    async def get_current_user(self) -> Dict[str, Any]:
        """
        Get current user information.
        
        Returns:
            User information dictionary
        """
        response = await self._make_request("GET", "/api/v2/auth/users/me")
        return await response.json()
    
    async def create_support_ticket(self, ticket: Union[UnifiedTicketCreate, Dict[str, Any]]) -> TicketResponse:
        """
        Create a support ticket.
        
        Args:
            ticket: Support ticket data
            
        Returns:
            Created ticket response
        """
        if isinstance(ticket, dict):
            ticket = UnifiedTicketCreate(**ticket)
        
        response = await self._make_request("POST", "/api/v2/tickets/support", data=ticket.dict())
        return TicketResponse(**await response.json())
    
    async def create_preventive_maintenance_ticket(self, ticket: Union[UnifiedTicketCreate, Dict[str, Any]]) -> TicketResponse:
        """
        Create a preventive maintenance ticket.
        
        Args:
            ticket: Preventive maintenance ticket data
            
        Returns:
            Created ticket response
        """
        if isinstance(ticket, dict):
            ticket = UnifiedTicketCreate(**ticket)
        
        response = await self._make_request("POST", "/api/v2/tickets/maintenance/preventive", data=ticket.dict())
        return TicketResponse(**await response.json())
    
    async def create_scheduled_maintenance_ticket(self, ticket: Union[UnifiedTicketCreate, Dict[str, Any]]) -> TicketResponse:
        """
        Create a scheduled maintenance ticket.
        
        Args:
            ticket: Scheduled maintenance ticket data
            
        Returns:
            Created ticket response
        """
        if isinstance(ticket, dict):
            ticket = UnifiedTicketCreate(**ticket)
        
        response = await self._make_request("POST", "/api/v2/tickets/maintenance/scheduled", data=ticket.dict())
        return TicketResponse(**await response.json())
    
    async def create_emergency_ticket(self, ticket: Union[UnifiedTicketCreate, Dict[str, Any]]) -> TicketResponse:
        """
        Create an emergency service ticket.
        
        Args:
            ticket: Emergency ticket data
            
        Returns:
            Created ticket response
        """
        if isinstance(ticket, dict):
            ticket = UnifiedTicketCreate(**ticket)
        
        response = await self._make_request("POST", "/api/v2/tickets/emergency", data=ticket.dict())
        return TicketResponse(**await response.json())
    
    async def create_product_quote_ticket(self, ticket: Union[UnifiedTicketCreate, Dict[str, Any]]) -> TicketResponse:
        """
        Create a product quote ticket.
        
        Args:
            ticket: Product quote ticket data
            
        Returns:
            Created ticket response
        """
        if isinstance(ticket, dict):
            ticket = UnifiedTicketCreate(**ticket)
        
        response = await self._make_request("POST", "/api/v2/tickets/product-quote", data=ticket.dict())
        return TicketResponse(**await response.json())
    
    async def create_add_to_quote_ticket(self, ticket: Union[UnifiedTicketCreate, Dict[str, Any]]) -> TicketResponse:
        """
        Create an add-to-quote ticket.
        
        Args:
            ticket: Add-to-quote ticket data
            
        Returns:
            Created ticket response
        """
        if isinstance(ticket, dict):
            ticket = UnifiedTicketCreate(**ticket)
        
        response = await self._make_request("POST", "/api/v2/tickets/add-to-quote", data=ticket.dict())
        return TicketResponse(**await response.json())
    
    async def get_ticket(self, ticket_id: str) -> TicketResponse:
        """
        Get a ticket by ID.
        
        Args:
            ticket_id: Ticket ID
            
        Returns:
            Ticket response
        """
        response = await self._make_request("GET", f"/api/v2/tickets/{ticket_id}")
        return TicketResponse(**await response.json())
    
    async def list_tickets(
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
        
        response = await self._make_request("GET", "/api/v2/tickets", params=params)
        tickets_data = await response.json()
        return [TicketResponse(**ticket) for ticket in tickets_data]
    
    async def update_ticket_status(
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
        
        response = await self._make_request("POST", f"/api/v2/tickets/{ticket_id}/status", data=data)
        return TicketResponse(**await response.json())
    
    async def assign_ticket(self, ticket_id: str, assignee_id: str) -> TicketResponse:
        """
        Assign ticket to a user.
        
        Args:
            ticket_id: Ticket ID
            assignee_id: Assignee user ID
            
        Returns:
            Updated ticket response
        """
        response = await self._make_request("POST", f"/api/v2/tickets/{ticket_id}/assign/{assignee_id}")
        return TicketResponse(**await response.json())
    
    async def add_ticket_message(
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
        
        response = await self._make_request("POST", f"/api/v2/tickets/{ticket_id}/messages", data=data)
        return await response.json()
    
    async def get_ticket_messages(self, ticket_id: str) -> List[Dict[str, Any]]:
        """
        Get ticket messages.
        
        Args:
            ticket_id: Ticket ID
            
        Returns:
            List of messages
        """
        response = await self._make_request("GET", f"/api/v2/tickets/{ticket_id}/messages")
        return await response.json()
    
    async def create_quote(self, quote: Union[QuoteCreateRequest, Dict[str, Any]]) -> QuoteCreateResponse:
        """
        Create a quote.
        
        Args:
            quote: Quote creation data
            
        Returns:
            Created quote response
        """
        if isinstance(quote, dict):
            quote = QuoteCreateRequest(**quote)
        
        response = await self._make_request("POST", "/api/v2/quotes/create", data=quote.dict())
        return QuoteCreateResponse(**await response.json())
    
    async def lookup_quotes(self, query: str) -> QuoteLookupResponse:
        """
        Lookup quotes by query.
        
        Args:
            query: Search query
            
        Returns:
            Quote lookup response
        """
        params = {"q": query}
        response = await self._make_request("GET", "/api/v2/quotes/lookup", params=params)
        return QuoteLookupResponse(**await response.json())
    
    async def get_health_status(self) -> Dict[str, Any]:
        """
        Get system health status.
        
        Returns:
            Health status information
        """
        response = await self._make_request("GET", "/health")
        return await response.json()
    
    async def get_metrics(self) -> Dict[str, Any]:
        """
        Get system metrics.
        
        Returns:
            System metrics
        """
        response = await self._make_request("GET", "/metrics/json")
        return await response.json()
    
    async def close(self):
        """Close the client session."""
        if self.session:
            await self.session.close()
            self.session = None
