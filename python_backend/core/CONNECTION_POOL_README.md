# Connection Pooling and Performance Monitoring

This document describes the enhanced connection pooling and performance monitoring system for the Supabase client in the v2 APIs.

## Overview

The connection pooling system provides:
- **Connection Pooling**: Reuses database connections to improve performance
- **Performance Monitoring**: Tracks query performance and connection health
- **Query Timeouts**: Configurable timeouts to prevent hanging queries
- **Health Checks**: Periodic health monitoring of database connections
- **Retry Logic**: Automatic retry with exponential backoff for failed queries
- **Metrics Collection**: Comprehensive performance metrics and statistics

## Architecture

### Core Components

1. **SupabaseConnectionPool**: Main connection pool manager
2. **EnhancedSupabaseClient**: Client wrapper with pooling support
3. **PooledSupabaseClient**: Proxy client for pooled connections
4. **QueryMetrics**: Performance metrics data structure
5. **ConnectionHealth**: Connection health tracking

### Configuration

The system is configured through environment variables:

```bash
# Connection Pool Settings
SUPABASE_MAX_CONNECTIONS=10          # Maximum number of connections
SUPABASE_QUERY_TIMEOUT=30.0          # Query timeout in seconds
SUPABASE_HEALTH_CHECK_INTERVAL=60.0  # Health check interval in seconds
SUPABASE_SLOW_QUERY_THRESHOLD=1000.0 # Slow query threshold in milliseconds
SUPABASE_MAX_RETRIES=3               # Maximum retry attempts
```

## Usage

### Basic Usage

```python
from apis.v2.deps import get_supabase, get_pooled_supabase

# Synchronous client (uses pooling internally)
def my_endpoint(supabase = Depends(get_supabase)):
    result = supabase.table('users').select('*').execute()
    return result

# Async pooled client (explicit pooling)
async def my_async_endpoint(supabase = Depends(get_pooled_supabase)):
    async with supabase as client:
        result = client.table('users').select('*').execute()
        return result
```

### Enhanced Client Usage

```python
from apis.v2.deps import get_enhanced_supabase

def my_endpoint(enhanced_client = Depends(get_enhanced_supabase)):
    # Access pooled client
    client = enhanced_client.client
    
    # Or use async pooled client
    async with enhanced_client.get_pooled_client() as pooled_client:
        result = pooled_client.table('users').select('*').execute()
        return result
```

### Direct Pool Usage

```python
from core.connection_pool import get_connection_pool

async def my_function():
    pool = get_connection_pool()
    
    # Get client from pool
    async with pool.get_client() as client:
        result = client.table('users').select('*').execute()
        return result
    
    # Execute with timeout and retry
    result = await pool.execute_with_timeout(
        lambda: client.table('users').select('*').execute()
    )
    return result
```

## Performance Monitoring

### Metrics Collection

The system automatically collects the following metrics:

- **Query Performance**: Duration, success/failure, retry count
- **Connection Health**: Health status, error count, response time
- **Pool Statistics**: Active/idle connections, success rates
- **Slow Queries**: Queries exceeding the threshold

### Accessing Metrics

```python
from core.connection_pool import get_connection_pool

pool = get_connection_pool()

# Get performance statistics
stats = pool.get_performance_stats()
print(f"Total queries: {stats.total_queries}")
print(f"Success rate: {stats.successful_queries / stats.total_queries}")
print(f"Average response time: {stats.avg_response_time_ms}ms")

# Get detailed metrics
recent_queries = pool.get_detailed_metrics(limit=50)
for query in recent_queries:
    print(f"Query: {query['query_type']}, Duration: {query['duration_ms']}ms")

# Get connection health
health = pool.get_connection_health()
for conn_id, status in health.items():
    print(f"Connection {conn_id}: {'Healthy' if status['is_healthy'] else 'Unhealthy'}")
```

### Monitoring Endpoints

The system provides several monitoring endpoints:

#### `/metrics`
Basic performance metrics:
```json
{
  "database": {
    "connection_pool": {
      "total_connections": 10,
      "active_connections": 3,
      "idle_connections": 7,
      "healthy_connections": 9,
      "unhealthy_connections": 1
    },
    "performance": {
      "total_queries": 1250,
      "successful_queries": 1200,
      "failed_queries": 50,
      "success_rate": 0.96,
      "error_rate": 0.04,
      "avg_response_time_ms": 245.5,
      "slow_queries_count": 12
    },
    "uptime_seconds": 3600
  }
}
```

#### `/metrics/detailed`
Detailed metrics with recent query history:
```json
{
  "summary": {
    "total_connections": 10,
    "active_connections": 3,
    "healthy_connections": 9,
    "total_queries": 1250,
    "success_rate": 0.96,
    "avg_response_time_ms": 245.5,
    "uptime_seconds": 3600
  },
  "recent_queries": [
    {
      "query_type": "select",
      "table_name": "users",
      "duration_ms": 150.5,
      "success": true,
      "timestamp": "2024-01-01T12:00:00Z",
      "retry_count": 0,
      "connection_id": "conn_1"
    }
  ],
  "connection_health": {
    "conn_1": {
      "is_healthy": true,
      "last_check": "2024-01-01T12:00:00Z",
      "response_time_ms": 150.5,
      "error_count": 0,
      "total_queries": 125,
      "last_error": null
    }
  }
}
```

#### `/health/database`
Database health check:
```json
{
  "status": "healthy",
  "details": {
    "healthy_connections": 9,
    "total_connections": 10,
    "error_rate": 0.04,
    "avg_response_time_ms": 245.5,
    "last_check": "2024-01-01T12:00:00Z"
  }
}
```

## Configuration Options

### Connection Pool Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `SUPABASE_MAX_CONNECTIONS` | 10 | Maximum number of connections in the pool |
| `SUPABASE_QUERY_TIMEOUT` | 30.0 | Query timeout in seconds |
| `SUPABASE_HEALTH_CHECK_INTERVAL` | 60.0 | Health check interval in seconds |
| `SUPABASE_SLOW_QUERY_THRESHOLD` | 1000.0 | Slow query threshold in milliseconds |
| `SUPABASE_MAX_RETRIES` | 3 | Maximum retry attempts for failed queries |

### Performance Tuning

#### Connection Pool Size
- **Small applications**: 5-10 connections
- **Medium applications**: 10-20 connections
- **Large applications**: 20-50 connections

#### Query Timeout
- **Fast queries**: 10-30 seconds
- **Complex queries**: 30-60 seconds
- **Analytics queries**: 60-300 seconds

#### Health Check Interval
- **Production**: 60-300 seconds
- **Development**: 30-60 seconds
- **High availability**: 10-30 seconds

## Error Handling

### Automatic Retry Logic

The system includes automatic retry logic with exponential backoff:

```python
# Retry configuration
max_retries = 3
backoff_multiplier = 0.5  # seconds
max_backoff = 5.0  # seconds

# Retry sequence: 0.5s, 1.0s, 2.0s, 4.0s (capped at 5.0s)
```

### Error Types Handled

1. **Timeout Errors**: Queries exceeding the timeout threshold
2. **Connection Errors**: Network or connection issues
3. **Database Errors**: SQL errors, constraint violations
4. **Transient Errors**: Temporary failures that may succeed on retry

### Error Monitoring

```python
# Monitor error rates
stats = pool.get_performance_stats()
if stats.error_rate > 0.1:  # 10% error rate
    logger.warning(f"High error rate detected: {stats.error_rate}")

# Monitor slow queries
if stats.slow_queries_count > 10:
    logger.warning(f"Many slow queries detected: {stats.slow_queries_count}")
```

## Health Checks

### Automatic Health Monitoring

The system performs periodic health checks:

1. **Connection Health**: Tests each connection with a simple query
2. **Response Time**: Measures query response times
3. **Error Rate**: Tracks error rates per connection
4. **Connection Status**: Marks connections as healthy/unhealthy

### Health Check Process

```python
async def _perform_health_checks(self):
    """Perform health checks on all connections."""
    try:
        # Simple health check query
        response = await client.table('profiles').select('id').limit(1).execute()
        
        # Update health status
        for health in self._connection_health.values():
            health.is_healthy = True
            health.last_check = datetime.utcnow()
            health.response_time_ms = response_time
            
    except Exception as e:
        # Mark connections as unhealthy
        for health in self._connection_health.values():
            health.is_healthy = False
            health.last_error = str(e)
```

## Best Practices

### 1. Connection Pool Sizing
- Start with 10 connections and monitor usage
- Adjust based on concurrent request patterns
- Consider database connection limits

### 2. Timeout Configuration
- Set timeouts based on query complexity
- Use shorter timeouts for simple queries
- Allow longer timeouts for complex operations

### 3. Monitoring
- Monitor error rates and response times
- Set up alerts for high error rates
- Track slow query patterns

### 4. Error Handling
- Implement proper error handling in endpoints
- Use retry logic for transient failures
- Log errors with sufficient context

### 5. Health Checks
- Configure appropriate health check intervals
- Monitor health check results
- Implement circuit breakers for unhealthy connections

## Troubleshooting

### Common Issues

#### High Error Rates
```python
# Check error rates
stats = pool.get_performance_stats()
if stats.error_rate > 0.1:
    # Investigate error patterns
    recent_errors = [m for m in pool.get_detailed_metrics(100) if not m['success']]
    for error in recent_errors:
        logger.error(f"Query error: {error['error']}")
```

#### Slow Queries
```python
# Identify slow queries
slow_queries = [m for m in pool.get_detailed_metrics(100) 
                if m['duration_ms'] > pool.slow_query_threshold]
for query in slow_queries:
    logger.warning(f"Slow query: {query['query_type']} on {query['table_name']} "
                   f"took {query['duration_ms']}ms")
```

#### Connection Issues
```python
# Check connection health
health = pool.get_connection_health()
unhealthy_connections = [conn_id for conn_id, status in health.items() 
                        if not status['is_healthy']]
if unhealthy_connections:
    logger.warning(f"Unhealthy connections: {unhealthy_connections}")
```

### Performance Optimization

#### Query Optimization
- Use appropriate indexes
- Optimize query patterns
- Implement query caching where appropriate

#### Connection Optimization
- Monitor connection usage patterns
- Adjust pool size based on load
- Implement connection warming for critical paths

#### Monitoring Optimization
- Set up proper alerting thresholds
- Implement log aggregation
- Use performance profiling tools

## Testing

### Unit Tests
```bash
# Run connection pool tests
pytest python_backend/apis/v2/tests/test_connection_pool.py -v
```

### Integration Tests
```bash
# Run integration tests with real database
pytest python_backend/tests/test_integration.py -v
```

### Load Testing
```bash
# Test connection pool under load
pytest python_backend/tests/test_performance.py -v
```

## Migration Guide

### From Direct Client to Pooled Client

#### Before (Direct Client)
```python
def get_supabase():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

def my_endpoint(supabase = Depends(get_supabase)):
    result = supabase.table('users').select('*').execute()
    return result
```

#### After (Pooled Client)
```python
def get_supabase():
    return get_supabase_client()  # Now uses connection pooling

def my_endpoint(supabase = Depends(get_supabase)):
    result = supabase.table('users').select('*').execute()
    return result  # Same interface, better performance
```

### Configuration Migration

Add these environment variables to your `.env` file:

```bash
# Connection Pool Configuration
SUPABASE_MAX_CONNECTIONS=10
SUPABASE_QUERY_TIMEOUT=30.0
SUPABASE_HEALTH_CHECK_INTERVAL=60.0
SUPABASE_SLOW_QUERY_THRESHOLD=1000.0
SUPABASE_MAX_RETRIES=3
```

## Conclusion

The connection pooling and performance monitoring system provides:

- **Improved Performance**: Connection reuse and optimized query execution
- **Better Reliability**: Automatic retry logic and health monitoring
- **Comprehensive Monitoring**: Detailed metrics and health checks
- **Easy Integration**: Drop-in replacement for existing clients
- **Production Ready**: Robust error handling and monitoring

This system is designed to scale with your application and provide the reliability and performance needed for production environments.
