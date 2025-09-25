# Production Monitoring Guide

This guide covers the comprehensive monitoring, logging, and observability features implemented for the Almona Industrial API.

## Overview

The monitoring system provides:
- **Structured JSON Logging** with OpenTelemetry trace context
- **Prometheus Metrics** for application and business metrics
- **Distributed Tracing** with Jaeger integration
- **Health Checks** for Kubernetes deployment
- **Performance Monitoring** for database and external services

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Prometheus    │    │     Jaeger      │
│                 │    │                 │    │                 │
│ • Structured    │───▶│ • Metrics       │    │ • Traces        │
│   Logging       │    │ • Alerts        │    │ • Request Flow  │
│ • Metrics       │    │ • Dashboards    │    │ • Performance   │
│ • Traces        │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Grafana       │    │   AlertManager  │    │   Log Aggreg.   │
│                 │    │                 │    │                 │
│ • Dashboards    │    │ • Notifications │    │ • Centralized   │
│ • Visualization │    │ • Escalation    │    │   Logging       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Structured Logging

### Features
- **JSON Format**: All logs are structured JSON for easy parsing
- **Trace Context**: Automatic correlation with OpenTelemetry traces
- **Request ID**: Unique identifier for each request
- **Contextual Information**: Rich metadata in every log entry

### Log Format
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "logger": "almona.api.middleware",
  "message": "Request completed",
  "request_id": "req_1705312245123",
  "method": "GET",
  "path": "/api/v1/products",
  "status_code": 200,
  "duration_ms": 45.2,
  "trace_id": "a1b2c3d4e5f6789012345678901234567",
  "span_id": "1234567890abcdef"
}
```

### Usage
```python
from core.monitoring import get_structured_logger

logger = get_structured_logger(__name__)

# Structured logging
logger.info(
    "User action completed",
    user_id="user123",
    action="product_view",
    product_id="prod456",
    duration_ms=120.5
)
```

## Prometheus Metrics

### Application Metrics

#### HTTP Request Metrics
- `http_requests_total`: Total HTTP requests by method, endpoint, status
- `http_request_duration_seconds`: Request duration histogram

#### Database Metrics
- `database_queries_total`: Total database queries by type, table, status
- `database_query_duration_seconds`: Query duration histogram
- `database_active_connections`: Number of active database connections

#### Business Metrics
- `business_operations_total`: Business operation counters
- `application_errors_total`: Application error counters

#### System Metrics
- `system_info`: System information (version, environment)

### Metric Endpoints
- `/metrics`: Prometheus format metrics
- `/metrics/json`: Human-readable JSON metrics

### Example Queries
```promql
# Request rate
rate(http_requests_total[5m])

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{status_code=~"5.."}[5m])

# Database query performance
histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m]))
```

## Distributed Tracing

### Features
- **OpenTelemetry Integration**: Standard tracing implementation
- **Automatic Instrumentation**: FastAPI, requests, database calls
- **Custom Spans**: Business logic tracing
- **Jaeger Export**: Trace visualization and analysis

### Trace Context
Every request automatically includes:
- **Trace ID**: Unique identifier for the entire request flow
- **Span ID**: Unique identifier for individual operations
- **Parent Span**: Relationship between operations

### Usage
```python
from core.monitoring import trace_operation

# Automatic tracing for database operations
async with trace_operation("database_query", table="products") as span:
    result = await client.table('products').select('*').execute()
    span.set_attribute("rows_returned", len(result.data))

# Custom business operation tracing
async with trace_operation("quote_calculation", quote_id="quote123") as span:
    # Business logic here
    span.set_attribute("total_amount", 1500.00)
    span.set_attribute("discount_applied", 0.1)
```

## Health Checks

### Endpoints
- `/health`: Comprehensive health status
- `/health/live`: Liveness probe (critical checks only)
- `/health/ready`: Readiness probe (all checks)

### Health Check Components

#### Database Health
- Connection pool status
- Query performance
- Error rate monitoring

#### External Services
- Supabase connectivity
- SendGrid API status
- Twilio service status

#### System Resources
- Memory usage
- CPU usage
- Disk space

### Health Status Levels
- **Healthy**: All systems operational
- **Degraded**: Non-critical issues detected
- **Unhealthy**: Critical failures

### Example Response
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "uptime_seconds": 86400,
  "total_check_time_ms": 45.2,
  "checks": {
    "database": {
      "status": "healthy",
      "message": "Check passed",
      "details": {
        "healthy_connections": 8,
        "total_connections": 10,
        "error_rate": 0.01,
        "avg_response_time_ms": 25.5
      },
      "response_time_ms": 12.3,
      "critical": true
    }
  },
  "summary": {
    "total_checks": 4,
    "healthy_checks": 4,
    "degraded_checks": 0,
    "unhealthy_checks": 0,
    "critical_failures": 0
  }
}
```

## Alerting Rules

### Critical Alerts
- **High Error Rate**: >10% 5xx errors for 2 minutes
- **Database Connection Issues**: No active connections for 1 minute
- **Pod Crash Looping**: Frequent pod restarts

### Warning Alerts
- **High Response Time**: 95th percentile >2 seconds for 2 minutes
- **High Memory Usage**: >80% memory usage for 5 minutes
- **Slow Database Queries**: 95th percentile >1 second

### Alert Configuration
```yaml
groups:
- name: almona.rules
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }} errors per second"
```

## Grafana Dashboards

### Main Dashboard
- **Request Rate**: Real-time request throughput
- **Response Time**: P50, P95, P99 percentiles
- **Error Rate**: 4xx and 5xx error rates
- **Database Performance**: Connection pool and query metrics
- **Business Operations**: Custom business metrics
- **System Resources**: CPU, memory, disk usage

### Key Panels
1. **API Performance**: Request rate, response time, error rate
2. **Database Health**: Connection pool, query performance
3. **Business Metrics**: Quote requests, ticket creation, user actions
4. **System Resources**: Memory, CPU, disk usage
5. **Error Analysis**: Error types, frequency, trends

## Performance Monitoring

### Database Monitoring
- Connection pool utilization
- Query performance metrics
- Slow query detection
- Error rate tracking

### Application Performance
- Request/response times
- Throughput metrics
- Error rates by endpoint
- Business operation performance

### System Resources
- Memory usage patterns
- CPU utilization
- Disk I/O metrics
- Network performance

## Troubleshooting

### Common Issues

#### High Response Times
1. Check database query performance
2. Analyze slow query logs
3. Review connection pool utilization
4. Check external service latency

#### High Error Rates
1. Review error logs with trace context
2. Check database connectivity
3. Verify external service status
4. Analyze error patterns

#### Memory Issues
1. Monitor memory usage trends
2. Check for memory leaks
3. Review garbage collection metrics
4. Analyze connection pool sizing

### Debugging Commands
```bash
# Check application health
curl http://localhost:8000/health

# View metrics
curl http://localhost:8000/metrics

# Check specific endpoint performance
curl -w "@curl-format.txt" http://localhost:8000/api/v1/products

# View logs with trace context
kubectl logs -f deployment/almona-api | jq '.'
```

## Best Practices

### Logging
1. Use structured logging with consistent fields
2. Include relevant context in log messages
3. Avoid logging sensitive information
4. Use appropriate log levels

### Metrics
1. Use meaningful metric names and labels
2. Avoid high-cardinality labels
3. Set appropriate metric types (counter, histogram, gauge)
4. Document metric meanings and use cases

### Tracing
1. Create spans for significant operations
2. Add relevant attributes to spans
3. Use consistent span naming conventions
4. Avoid over-instrumentation

### Health Checks
1. Make health checks fast and reliable
2. Include all critical dependencies
3. Provide meaningful error messages
4. Use appropriate timeouts

## Configuration

### Environment Variables
```bash
# Monitoring Configuration
ENVIRONMENT=production
LOG_LEVEL=INFO
ENABLE_TRACING=true
ENABLE_METRICS=true
PROMETHEUS_PORT=8001
JAEGER_ENDPOINT=jaeger-collector:14268

# Database Monitoring
SUPABASE_MAX_CONNECTIONS=20
SUPABASE_QUERY_TIMEOUT=30.0
SUPABASE_HEALTH_CHECK_INTERVAL=60.0
SUPABASE_SLOW_QUERY_THRESHOLD=1000.0
```

### Kubernetes Configuration
- Prometheus scraping configuration
- Grafana dashboard import
- Jaeger collector setup
- Alert manager rules

## Monitoring Stack Deployment

### Prerequisites
- Kubernetes cluster
- Prometheus operator (optional)
- Grafana instance
- Jaeger deployment

### Deployment Steps
1. Deploy monitoring infrastructure
2. Configure Prometheus scraping
3. Import Grafana dashboards
4. Set up alerting rules
5. Configure log aggregation

### Monitoring Stack Components
- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Jaeger**: Distributed tracing
- **AlertManager**: Alert routing and notifications
- **ELK Stack**: Centralized logging (optional)

This comprehensive monitoring setup provides full observability into the Almona Industrial API, enabling proactive issue detection, performance optimization, and business insights.
