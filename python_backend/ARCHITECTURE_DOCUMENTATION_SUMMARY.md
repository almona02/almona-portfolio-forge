# Almona Industrial API v2 - Architecture Documentation Summary

## Overview

The Almona Industrial API v2 is a comprehensive, production-ready REST API built with FastAPI, designed to support industrial equipment management, service ticketing, and quote generation. The system provides robust error handling, internationalization support, comprehensive monitoring, and seamless SDK integration.

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Mobile App    │    │   SDK Clients   │
│   (React/Vue)   │    │   (React Native)│    │   (Python/TS)   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │      Load Balancer        │
                    │      (Nginx/HAProxy)      │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │     API Gateway           │
                    │     (FastAPI v2)          │
                    └─────────────┬─────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
┌─────────┴─────────┐    ┌─────────┴─────────┐    ┌─────────┴─────────┐
│   Auth Service    │    │  Business Logic   │    │   Error Handler   │
│   (JWT/OAuth)     │    │   (Services)      │    │   (Middleware)    │
└─────────┬─────────┘    └─────────┬─────────┘    └─────────┬─────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │     Data Layer            │
                    │   (Supabase/PostgreSQL)   │
                    └─────────────┬─────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
┌─────────┴─────────┐    ┌─────────┴─────────┐    ┌─────────┴─────────┐
│   Redis Cache     │    │   Celery Queue    │    │   File Storage    │
│   (Sessions)      │    │   (Background)    │    │   (Supabase)      │
└───────────────────┘    └───────────────────┘    └───────────────────┘
```

## Core Components

### 1. API Gateway Layer
- **FastAPI Application**: Main application server
- **Middleware Stack**: Error handling, rate limiting, CORS, authentication
- **Route Management**: Organized by feature (auth, quotes, tickets, monitoring)
- **Request/Response Processing**: Validation, serialization, error formatting

### 2. Authentication & Authorization
- **JWT Token Management**: Secure token generation and validation
- **Role-Based Access Control**: Customer, technician, admin, sales_rep roles
- **Session Management**: Redis-based session storage
- **OAuth Integration**: Supabase Auth integration

### 3. Business Logic Layer
- **Service Layer**: Business logic abstraction
- **Repository Pattern**: Data access abstraction
- **Domain Models**: Pydantic models for data validation
- **Business Rules**: Quote calculations, ticket workflows, user permissions

### 4. Data Layer
- **Supabase Integration**: PostgreSQL database with real-time capabilities
- **Connection Pooling**: Optimized database connections
- **Row Level Security**: Database-level access control
- **Data Validation**: Pydantic model validation

### 5. Error Handling & Internationalization
- **Custom Error Hierarchy**: Domain-specific error types
- **Global Error Middleware**: Consistent error response formatting
- **Multi-language Support**: Arabic and English error messages
- **Error Context**: Rich error information for debugging

### 6. Monitoring & Observability
- **Health Checks**: System health monitoring endpoints
- **Performance Metrics**: Response times, throughput, error rates
- **Connection Pool Monitoring**: Database connection health
- **Celery Monitoring**: Background task monitoring
- **Structured Logging**: Comprehensive logging with context

### 7. Background Processing
- **Celery Integration**: Asynchronous task processing
- **Redis Broker**: Task queue management
- **Task Monitoring**: Worker status and task tracking
- **Error Handling**: Task failure management

## API Endpoints

### Authentication Endpoints
```
POST /api/v2/auth/token          # User authentication
POST /api/v2/auth/refresh        # Token refresh
GET  /api/v2/auth/users/me       # Current user info
```

### Quote Management
```
GET  /api/v2/quotes/lookup       # Quote search
POST /api/v2/quotes/create       # Quote creation
GET  /api/v2/quotes/{id}         # Quote details
PUT  /api/v2/quotes/{id}         # Quote update
```

### Service Tickets
```
POST /api/v2/tickets/support     # Support ticket creation
POST /api/v2/tickets/preventive  # Preventive maintenance
POST /api/v2/tickets/scheduled   # Scheduled maintenance
POST /api/v2/tickets/emergency   # Emergency service
POST /api/v2/tickets/quote       # Quote request ticket
POST /api/v2/tickets/add-to-quote # Add to quote ticket
GET  /api/v2/tickets/{id}        # Ticket details
POST /api/v2/tickets/{id}/assign # Ticket assignment
```

### Monitoring Endpoints
```
GET  /health                     # System health
GET  /rate-limits               # Rate limiting info
GET  /connection-pool/stats     # Connection pool statistics
GET  /connection-pool/health    # Connection pool health
GET  /connection-pool/metrics   # Query performance metrics
GET  /connection-pool/validate  # Connection validation
GET  /celery/status             # Celery worker status
GET  /celery/tasks              # Task information
GET  /celery/workers            # Worker information
```

## Data Models

### Core Entities

#### User
```python
class User:
    id: UUID
    email: str
    role: UserRole  # customer, technician, admin, sales_rep
    profile: UserProfile
    created_at: datetime
    updated_at: datetime
```

#### Quote
```python
class Quote:
    id: UUID
    quote_number: str
    contact_name: str
    contact_email: str
    contact_phone: Optional[str]
    company: Optional[str]
    project_description: Optional[str]
    urgency: QuoteUrgency
    delivery_location: Optional[str]
    products: List[QuoteItem]
    services: List[QuoteItem]
    special_requirements: Optional[str]
    machine_id: Optional[UUID]
    digital_twin_code: Optional[str]
    portal_reference: Optional[str]
    status: QuoteStatus
    total_amount: Decimal
    related_service_ticket_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime
```

#### Service Ticket
```python
class ServiceTicket:
    id: UUID
    ticket_number: str
    category: TicketCategory
    payload: UnifiedTicketBase
    maintenance_metadata: Optional[MaintenanceMetadata]
    status: TicketStatus
    priority: TicketPriority
    assigned_to: Optional[UUID]
    created_by: UUID
    created_at: datetime
    updated_at: datetime
```

## Error Handling Framework

### Error Hierarchy
```
V2APIError (Base)
├── V2ValidationError
├── V2NotFoundError
├── V2UnauthorizedError
├── V2ForbiddenError
├── QuoteNotFoundError
├── QuoteAlreadyExistsError
├── QuoteValidationError
├── TicketNotFoundError
├── TicketPermissionError
├── TicketValidationError
├── SupabaseError
├── ExternalServiceError
└── RateLimitError
```

### Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly message",
    "timestamp": "2024-01-01T12:00:00Z",
    "path": "/api/v2/quotes/create",
    "method": "POST",
    "request_id": "req_123456",
    "correlation_id": "corr_789012",
    "details": {
      "field": "contact_name",
      "value": ""
    },
    "messages": {
      "en": "English message",
      "ar": "Arabic message"
    },
    "retry_after": 60
  }
}
```

## Security Architecture

### Authentication Flow
1. **User Login**: POST /api/v2/auth/token
2. **Token Validation**: JWT signature verification
3. **Role Extraction**: User role from token claims
4. **Permission Check**: Role-based access control
5. **Session Management**: Redis-based session storage

### Authorization Levels
- **Anonymous**: Rate-limited access to public endpoints
- **Customer**: Access to own tickets and quotes
- **Technician**: Access to assigned tickets
- **Sales Rep**: Access to quotes and customer tickets
- **Admin**: Full system access

### Security Measures
- **Rate Limiting**: Tiered rate limits by user type
- **Input Validation**: Pydantic model validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Output encoding
- **CORS Configuration**: Controlled cross-origin access
- **Security Headers**: HSTS, CSP, X-Frame-Options

## Performance & Scalability

### Connection Pooling
- **Pool Size**: Configurable connection limits
- **Health Monitoring**: Connection health checks
- **Performance Metrics**: Query timing and success rates
- **Auto-scaling**: Dynamic pool size adjustment

### Caching Strategy
- **Redis Cache**: Session and temporary data
- **Query Caching**: Frequently accessed data
- **CDN Integration**: Static asset delivery
- **Cache Invalidation**: Smart cache management

### Rate Limiting
- **Tiered Limits**: Different limits per user type
- **Burst Protection**: Temporary rate limit increases
- **Monitoring**: Rate limit usage tracking
- **Graceful Degradation**: Service protection under load

## Monitoring & Observability

### Health Monitoring
- **System Health**: Overall system status
- **Database Health**: Connection pool status
- **Cache Health**: Redis connectivity
- **Queue Health**: Celery worker status

### Performance Metrics
- **Response Times**: API endpoint performance
- **Throughput**: Requests per second
- **Error Rates**: Success/failure ratios
- **Resource Usage**: CPU, memory, disk usage

### Logging Strategy
- **Structured Logging**: JSON-formatted logs
- **Log Levels**: DEBUG, INFO, WARNING, ERROR
- **Context Information**: Request IDs, user IDs, correlation IDs
- **Log Aggregation**: Centralized log collection

## SDK Integration

### Python SDK
- **Synchronous Client**: Blocking API calls
- **Asynchronous Client**: Non-blocking API calls
- **Pydantic Models**: Type-safe data models
- **Error Handling**: Structured error management
- **Authentication**: Automatic token management

### TypeScript SDK
- **Promise-based**: Modern async/await support
- **Type Safety**: Full TypeScript definitions
- **Error Handling**: Structured error management
- **Authentication**: Automatic token management
- **Browser/Node.js**: Universal compatibility

## Deployment Architecture

### Container Strategy
- **Multi-stage Builds**: Optimized Docker images
- **Security Scanning**: Vulnerability assessment
- **Resource Limits**: CPU and memory constraints
- **Health Checks**: Container health monitoring

### Kubernetes Deployment
- **Deployment Manifests**: Application deployment
- **Service Configuration**: Load balancing
- **Ingress Rules**: External access
- **ConfigMaps/Secrets**: Configuration management
- **HPA**: Horizontal Pod Autoscaling

### CI/CD Pipeline
- **Code Quality**: Linting, testing, security scanning
- **Build Process**: Docker image creation
- **Deployment**: Rolling updates
- **Monitoring**: Post-deployment validation

## Data Flow

### Request Processing Flow
1. **Request Reception**: Load balancer receives request
2. **Authentication**: JWT token validation
3. **Rate Limiting**: Request rate checking
4. **Route Resolution**: Endpoint identification
5. **Input Validation**: Pydantic model validation
6. **Business Logic**: Service layer processing
7. **Data Access**: Repository layer database operations
8. **Response Formatting**: JSON response generation
9. **Error Handling**: Exception processing
10. **Logging**: Request/response logging

### Background Task Flow
1. **Task Creation**: Celery task enqueue
2. **Worker Processing**: Background task execution
3. **Progress Tracking**: Task status monitoring
4. **Error Handling**: Task failure management
5. **Result Storage**: Task result persistence
6. **Notification**: Task completion notification

## Configuration Management

### Environment Variables
```bash
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication
JWT_SECRET_KEY=your-jwt-secret
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# Redis
REDIS_URL=redis://localhost:6379

# Application
ENVIRONMENT=production
DEBUG=False
LOG_LEVEL=INFO

# Rate Limiting
RATE_LIMIT_ANONYMOUS_PER_MINUTE=60
RATE_LIMIT_AUTHENTICATED_PER_MINUTE=300
RATE_LIMIT_PREMIUM_PER_MINUTE=600
RATE_LIMIT_ADMIN_PER_MINUTE=1200
```

### Configuration Classes
- **DatabaseConfig**: Database connection settings
- **AuthConfig**: Authentication configuration
- **RateLimitConfig**: Rate limiting settings
- **MonitoringConfig**: Monitoring and logging settings
- **CacheConfig**: Redis cache configuration

## Testing Strategy

### Test Types
- **Unit Tests**: Individual component testing
- **Integration Tests**: Component interaction testing
- **End-to-End Tests**: Full workflow testing
- **Performance Tests**: Load and stress testing
- **Security Tests**: Vulnerability assessment

### Test Coverage
- **API Endpoints**: All endpoints tested
- **Error Scenarios**: Error handling validation
- **Authentication**: Security testing
- **Data Validation**: Input/output validation
- **SDK Integration**: Client library testing

## Disaster Recovery

### Backup Strategy
- **Database Backups**: Automated daily backups
- **Configuration Backups**: Infrastructure as Code
- **Code Backups**: Version control
- **Documentation Backups**: Knowledge preservation

### Recovery Procedures
- **Point-in-Time Recovery**: Database restoration
- **Service Recovery**: Application restart procedures
- **Data Recovery**: Data corruption recovery
- **Infrastructure Recovery**: Cloud resource restoration

## Future Enhancements

### Planned Features
- **GraphQL API**: Alternative query interface
- **WebSocket Support**: Real-time updates
- **Advanced Analytics**: Business intelligence
- **Machine Learning**: Predictive maintenance
- **Mobile SDK**: Native mobile applications

### Scalability Improvements
- **Microservices**: Service decomposition
- **Event Sourcing**: Event-driven architecture
- **CQRS**: Command Query Responsibility Segregation
- **Service Mesh**: Inter-service communication

## Conclusion

The Almona Industrial API v2 represents a robust, scalable, and maintainable solution for industrial equipment management. With comprehensive error handling, internationalization support, monitoring capabilities, and SDK integration, the system is production-ready and designed for long-term success.

The architecture emphasizes:
- **Reliability**: Comprehensive error handling and monitoring
- **Scalability**: Connection pooling and rate limiting
- **Security**: Multi-layered security approach
- **Maintainability**: Clean architecture and comprehensive testing
- **Usability**: SDK integration and documentation
- **Observability**: Comprehensive monitoring and logging

This foundation provides a solid base for future enhancements and scaling to meet growing business needs.

---

**Document Version**: 1.0  
**Last Updated**: [Date]  
**Next Review**: [Date + 90 days]  
**Maintained By**: Development Team  
**Approved By**: Technical Lead
