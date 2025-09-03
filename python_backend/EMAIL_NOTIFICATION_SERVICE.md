# FastAPI Email Notification Service for Ticketing System

This document provides comprehensive information about the FastAPI email notification service implementation for the Almona ticketing system.

## Overview

The email notification service provides automated email notifications for various ticketing system events using FastAPI, Supabase, and SendGrid. It includes four main notification types with professional HTML email templates.

## Architecture

```
python_backend/
├── apis/v2/notifications.py          # FastAPI router with notification endpoints
├── core/
│   ├── config.py                     # Updated with email/database config
│   ├── email_service.py              # SendGrid email service class
│   └── supabase_client.py            # Supabase client wrapper
├── models/notification_models.py     # Pydantic models for requests/responses
├── templates/                        # Jinja2 email templates
│   ├── ticket_created.html
│   ├── ticket_assigned.html
│   ├── message_notification.html
│   └── ticket_resolved.html
└── requirements.txt                  # Updated dependencies
```

## Dependencies Added

```txt
# Database & External Services
supabase==2.8.0
sendgrid==6.11.0

# Template Engine
jinja2==3.1.4
```

## Environment Variables Required

Set these environment variables in your production environment:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Email Configuration (Optional)
ADMIN_EMAIL_LIST=admin1@company.com,admin2@company.com
FROM_EMAIL=noreply@almona.com
FROM_NAME=Almona Support System
BASE_URL=https://your-app-domain.com
```

## API Endpoints

### Base URL: `/api/v2/notifications`

#### 1. Ticket Created Notification
```http
POST /api/v2/notifications/ticket-created
Content-Type: application/json

{
  "ticket_id": "uuid-string",
  "admin_emails": ["admin@company.com"] // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ticket created notification queued successfully",
  "recipients": ["admin@company.com"],
  "notification_id": null
}
```

#### 2. Ticket Assigned Notification
```http
POST /api/v2/notifications/ticket-assigned
Content-Type: application/json

{
  "ticket_id": "uuid-string",
  "technician_id": "uuid-string", // Optional
  "technician_email": "tech@company.com" // Optional
}
```

#### 3. Message Added Notification
```http
POST /api/v2/notifications/message-added
Content-Type: application/json

{
  "ticket_id": "uuid-string",
  "message_id": "uuid-string",
  "author_id": "uuid-string",
  "recipient_email": "recipient@company.com" // Optional
}
```

#### 4. Ticket Resolved Notification
```http
POST /api/v2/notifications/ticket-resolved
Content-Type: application/json

{
  "ticket_id": "uuid-string",
  "customer_email": "customer@company.com", // Optional
  "resolution_summary": "Issue resolved by replacing faulty component" // Optional
}
```

#### 5. Bulk Notifications
```http
POST /api/v2/notifications/bulk
Content-Type: application/json

{
  "notifications": [
    {
      "type": "ticket_created",
      "ticket_id": "uuid-string",
      "admin_emails": ["admin@company.com"]
    },
    {
      "type": "ticket_assigned",
      "ticket_id": "uuid-string",
      "technician_email": "tech@company.com"
    }
  ]
}
```

#### 6. Health Check
```http
GET /api/v2/notifications/health
```

**Response:**
```json
{
  "status": "healthy",
  "message": "Notification service is operational",
  "services": {
    "email": "connected",
    "database": "connected"
  }
}
```

## Email Templates

### Template Features
- **Responsive Design**: Works on desktop and mobile devices
- **Professional Styling**: Clean, modern appearance with Almona branding
- **Dynamic Content**: Jinja2 templating with ticket data
- **Priority Indicators**: Color-coded priority levels
- **Action Buttons**: Direct links to ticket management
- **SLA Information**: Response and resolution time tracking
- **Multi-language Ready**: Template structure supports localization

### Template Variables Available

All templates have access to:
- `ticket`: Complete ticket object with all fields
- `base_url`: Application base URL for links
- Additional context-specific variables

#### Ticket Created Template
- `ticket`: Ticket object
- `admin_emails`: List of admin recipients

#### Ticket Assigned Template
- `ticket`: Ticket object
- `technician_name`: Assigned technician name

#### Message Notification Template
- `ticket`: Ticket object
- `message`: Message object with author details
- `is_customer`: Boolean indicating if recipient is customer
- `recipient_name`: Recipient display name

#### Ticket Resolved Template
- `ticket`: Ticket object with resolution details
- Customer feedback and rating links

## Integration Examples

### 1. Integrate with Supabase Triggers

```sql
-- Example trigger function to call notification API
CREATE OR REPLACE FUNCTION notify_ticket_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Call your notification API endpoint
  PERFORM net.http_post(
    url := 'https://your-api.com/api/v2/notifications/ticket-created',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := json_build_object(
      'ticket_id', NEW.id
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to ticket creation
CREATE TRIGGER ticket_created_notification
  AFTER INSERT ON service_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_created();
```

### 2. Python Client Usage

```python
import httpx
import asyncio

async def send_ticket_notification(ticket_id: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://your-api.com/api/v2/notifications/ticket-created",
            json={"ticket_id": ticket_id}
        )
        return response.json()

# Usage
result = asyncio.run(send_ticket_notification("ticket-uuid"))
print(result)
```

### 3. JavaScript/TypeScript Integration

```typescript
interface NotificationRequest {
  ticket_id: string;
  admin_emails?: string[];
}

async function sendTicketCreatedNotification(data: NotificationRequest) {
  const response = await fetch('/api/v2/notifications/ticket-created', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  return response.json();
}
```

## Error Handling

The service includes comprehensive error handling:

### HTTP Status Codes
- `200`: Success
- `400`: Bad Request (missing required fields)
- `404`: Not Found (ticket/message not found)
- `500`: Internal Server Error
- `503`: Service Unavailable (email/database connection issues)

### Error Response Format
```json
{
  "detail": "Error description",
  "status_code": 400
}
```

## Performance Considerations

### Background Tasks
All email sending is handled asynchronously using FastAPI's `BackgroundTasks` to ensure API responses are fast.

### Rate Limiting
The service inherits rate limiting from the main FastAPI application configuration.

### Caching
- Template compilation is cached by Jinja2
- Supabase client connections are reused
- SendGrid client is initialized once

## Security Features

### Input Validation
- All inputs validated using Pydantic models
- SQL injection prevention through parameterized queries
- Email address validation

### Authentication
- Inherits authentication from main FastAPI application
- API key validation for external integrations

### Data Privacy
- No sensitive data logged
- Email content sanitized
- Secure environment variable handling

## Monitoring and Logging

### Logging
```python
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Logs include:
# - Notification requests and responses
# - Email sending success/failure
# - Database query errors
# - Template rendering issues
```

### Health Monitoring
Use the `/health` endpoint for service monitoring:
- Email service connectivity
- Database connectivity
- Template availability

## Deployment

### 1. Install Dependencies
```bash
cd python_backend
pip install -r requirements.txt
```

### 2. Set Environment Variables
```bash
export SENDGRID_API_KEY="your_key_here"
export SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_KEY="your_service_key"
```

### 3. Run the Service
```bash
uvicorn apis.main:app --host 0.0.0.0 --port 8000
```

### 4. Test the Service
```bash
curl -X GET http://localhost:8000/api/v2/notifications/health
```

## Customization

### Adding New Notification Types

1. **Create Pydantic Model**:
```python
class CustomNotificationRequest(BaseModel):
    ticket_id: str
    custom_field: str
```

2. **Add Endpoint**:
```python
@router.post("/custom-notification")
async def send_custom_notification(
    request: CustomNotificationRequest,
    background_tasks: BackgroundTasks
):
    # Implementation
    pass
```

3. **Create Template**:
Create `templates/custom_notification.html`

4. **Add Email Method**:
```python
async def send_custom_notification(self, ticket_data: dict, recipient: str):
    # Implementation in EmailService class
    pass
```

### Template Customization

Templates use Jinja2 syntax and can be customized:
- Modify HTML structure and styling
- Add new template variables
- Include company branding
- Support multiple languages

### Configuration Options

Extend `core/config.py` for additional settings:
```python
class Settings(BaseSettings):
    # Email settings
    EMAIL_RETRY_ATTEMPTS: int = 3
    EMAIL_TIMEOUT_SECONDS: int = 30
    
    # Template settings
    TEMPLATE_CACHE_SIZE: int = 100
    
    # Notification settings
    NOTIFICATION_BATCH_SIZE: int = 50
```

## Troubleshooting

### Common Issues

1. **SendGrid API Key Issues**
   - Verify API key is valid and has mail send permissions
   - Check SendGrid account status and limits

2. **Supabase Connection Issues**
   - Verify URL and service key are correct
   - Check network connectivity and firewall rules

3. **Template Rendering Issues**
   - Verify template files exist in `templates/` directory
   - Check Jinja2 syntax in templates

4. **Email Delivery Issues**
   - Check SendGrid delivery logs
   - Verify recipient email addresses
   - Check spam folders

### Debug Mode

Enable debug logging:
```python
import logging
logging.getLogger().setLevel(logging.DEBUG)
```

### Testing

Run the test suite:
```bash
pytest python_backend/tests/test_notifications.py -v
```

## Support

For issues and questions:
1. Check the health endpoint: `/api/v2/notifications/health`
2. Review application logs
3. Verify environment variables
4. Test with simple notification first
5. Check SendGrid and Supabase service status

## License

This notification service is part of the Almona ticketing system and follows the same licensing terms.
