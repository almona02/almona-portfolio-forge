"""
Production monitoring configuration for structured logging, metrics, and tracing.
"""
import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, Optional, Union

import structlog

try:
    from opentelemetry import trace
    from opentelemetry.exporter.jaeger.thrift import JaegerExporter
    from opentelemetry.exporter.prometheus import PrometheusMetricReader
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.logging import LoggingInstrumentor
    from opentelemetry.instrumentation.psycopg2 import Psycopg2Instrumentor
    from opentelemetry.instrumentation.requests import RequestsInstrumentor
    from opentelemetry.sdk.metrics import MeterProvider
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    # Prefer new import path introduced around OTEL 1.25/0.45b
    try:
        # Newer packages expose semantic conventions via `opentelemetry.semconv`
        from opentelemetry.semconv.resource import ResourceAttributes  # type: ignore
    except Exception:  # pragma: no cover - fallback for older environments
        from opentelemetry.semantic_conventions.resource import ResourceAttributes  # type: ignore
    OPENTELEMETRY_AVAILABLE = True
except ImportError:
    # Fallback for when OpenTelemetry is not available
    class ResourceAttributes:
        SERVICE_NAME = "service.name"
        SERVICE_VERSION = "service.version"
        DEPLOYMENT_ENVIRONMENT = "deployment.environment"
    OPENTELEMETRY_AVAILABLE = False
from prometheus_client import Counter, Histogram, Gauge, Info, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from core.config import settings


# Prometheus Metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code', 'service']
)

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint', 'service'],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

ACTIVE_CONNECTIONS = Gauge(
    'database_active_connections',
    'Number of active database connections',
    ['service']
)

DATABASE_QUERY_DURATION = Histogram(
    'database_query_duration_seconds',
    'Database query duration in seconds',
    ['query_type', 'table_name', 'service'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

DATABASE_QUERY_COUNT = Counter(
    'database_queries_total',
    'Total database queries',
    ['query_type', 'table_name', 'status', 'service']
)

ERROR_COUNT = Counter(
    'application_errors_total',
    'Total application errors',
    ['error_type', 'service', 'severity']
)

BUSINESS_METRICS = Counter(
    'business_operations_total',
    'Business operation counters',
    ['operation_type', 'status', 'service']
)

SYSTEM_INFO = Info(
    'system_info',
    'System information'
)

# Set system info
SYSTEM_INFO.info({
    'version': '2.0.0',
    'service': 'almona-industrial-api',
    'environment': os.getenv('ENVIRONMENT', 'development')
})


class StructuredLogger:
    """Enhanced structured logger with OpenTelemetry integration."""
    
    def __init__(self):
        self.logger = None
        self._setup_logging()
    
    def _setup_logging(self):
        """Configure structured logging with JSON output."""
        
        # Configure structlog processors
        processors = [
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            self._add_trace_context,
            structlog.processors.JSONRenderer()
        ]
        
        structlog.configure(
            processors=processors,
            wrapper_class=structlog.stdlib.BoundLogger,
            logger_factory=structlog.stdlib.LoggerFactory(),
            cache_logger_on_first_use=True,
        )
        
        # Configure standard library logging
        logging.basicConfig(
            format="%(message)s",
            stream=open('/dev/stdout', 'w') if os.getenv('ENVIRONMENT') == 'production' else None,
            level=logging.INFO,
        )
        
        self.logger = structlog.get_logger()
    
    def _add_trace_context(self, logger, method_name, event_dict):
        """Add OpenTelemetry trace context to log records."""
        if not OPENTELEMETRY_AVAILABLE:
            return event_dict
        span = trace.get_current_span()
        if span and span.is_recording():
            span_context = span.get_span_context()
            event_dict.update({
                'trace_id': f"{span_context.trace_id:032x}",
                'span_id': f"{span_context.span_id:016x}",
                'trace_flags': span_context.trace_flags
            })
        return event_dict
    
    def get_logger(self, name: str = None):
        """Get a structured logger instance."""
        if name:
            return structlog.get_logger(name)
        return self.logger


class TracingMiddleware(BaseHTTPMiddleware):
    """Middleware for request tracing and metrics collection."""
    
    def __init__(self, app):
        super().__init__(app)
        if OPENTELEMETRY_AVAILABLE:
            self.tracer = trace.get_tracer(__name__)
        else:
            self.tracer = None
    
    async def dispatch(self, request: Request, call_next):
        """Process request with tracing and metrics."""
        start_time = time.time()
        request_id = str(uuid.uuid4())
        
        # Add request ID to headers
        request.state.request_id = request_id

        # If OpenTelemetry is not available, gracefully skip span creation but
        # still record basic Prometheus metrics so local/dev environments work
        # without extra dependencies.
        if self.tracer is None:
            try:
                response = await call_next(request)
            except Exception as e:
                ERROR_COUNT.labels(
                    error_type=type(e).__name__,
                    service='almona-api',
                    severity='error'
                ).inc()
                raise
            finally:
                duration = time.time() - start_time
                # Record metrics even on failure (if we have a response)
                status_code = getattr(locals().get("response", None), "status_code", 500)
                REQUEST_COUNT.labels(
                    method=request.method,
                    endpoint=request.url.path,
                    status_code=status_code,
                    service='almona-api'
                ).inc()

                REQUEST_DURATION.labels(
                    method=request.method,
                    endpoint=request.url.path,
                    service='almona-api'
                ).observe(duration)

            # Add request ID header on successful response
            response.headers['X-Request-ID'] = request_id
            return response

        # Create span for the request when tracing is available
        with self.tracer.start_as_current_span(
            f"{request.method} {request.url.path}",
            attributes={
                'http.method': request.method,
                'http.url': str(request.url),
                'http.route': request.url.path,
                'http.user_agent': request.headers.get('user-agent', ''),
                'http.request_id': request_id,
            }
        ) as span:
            try:
                response = await call_next(request)

                # Record metrics
                duration = time.time() - start_time
                REQUEST_COUNT.labels(
                    method=request.method,
                    endpoint=request.url.path,
                    status_code=response.status_code,
                    service='almona-api'
                ).inc()

                REQUEST_DURATION.labels(
                    method=request.method,
                    endpoint=request.url.path,
                    service='almona-api'
                ).observe(duration)

                # Add trace attributes
                span.set_attributes({
                    'http.status_code': response.status_code,
                    'http.response_size': response.headers.get('content-length', 0),
                })

                # Add request ID to response headers
                response.headers['X-Request-ID'] = request_id

                return response

            except Exception as e:
                # Record error metrics
                ERROR_COUNT.labels(
                    error_type=type(e).__name__,
                    service='almona-api',
                    severity='error'
                ).inc()

                span.record_exception(e)
                span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
                raise


class MetricsCollector:
    """Collect and expose application metrics."""
    
    @staticmethod
    def record_database_operation(
        query_type: str,
        table_name: str,
        duration: float,
        success: bool
    ):
        """Record database operation metrics."""
        status = 'success' if success else 'error'
        
        DATABASE_QUERY_COUNT.labels(
            query_type=query_type,
            table_name=table_name,
            status=status,
            service='almona-api'
        ).inc()
        
        DATABASE_QUERY_DURATION.labels(
            query_type=query_type,
            table_name=table_name,
            service='almona-api'
        ).observe(duration)
    
    @staticmethod
    def record_business_operation(
        operation_type: str,
        status: str
    ):
        """Record business operation metrics."""
        BUSINESS_METRICS.labels(
            operation_type=operation_type,
            status=status,
            service='almona-api'
        ).inc()
    
    @staticmethod
    def update_connection_metrics(active_connections: int):
        """Update database connection metrics."""
        ACTIVE_CONNECTIONS.labels(service='almona-api').set(active_connections)
    
    @staticmethod
    def record_error(error_type: str, severity: str = 'error'):
        """Record application error."""
        ERROR_COUNT.labels(
            error_type=error_type,
            service='almona-api',
            severity=severity
        ).inc()


class MonitoringSetup:
    """Setup monitoring infrastructure."""
    
    def __init__(self):
        self.tracer_provider = None
        self.meter_provider = None
        self.logger = StructuredLogger()
    
    def setup_tracing(self):
        """Setup OpenTelemetry tracing."""
        if not OPENTELEMETRY_AVAILABLE:
            print("OpenTelemetry not available, skipping tracing setup")
            return
            
        # Create resource
        resource = Resource.create({
            ResourceAttributes.SERVICE_NAME: "almona-industrial-api",
            ResourceAttributes.SERVICE_VERSION: "2.0.0",
            ResourceAttributes.DEPLOYMENT_ENVIRONMENT: os.getenv('ENVIRONMENT', 'development'),
        })
        
        # Setup tracer provider
        self.tracer_provider = TracerProvider(resource=resource)
        trace.set_tracer_provider(self.tracer_provider)
        
        # Setup Jaeger exporter if configured
        jaeger_endpoint = os.getenv('JAEGER_ENDPOINT')
        if jaeger_endpoint:
            jaeger_exporter = JaegerExporter(
                agent_host_name=jaeger_endpoint.split(':')[0],
                agent_port=int(jaeger_endpoint.split(':')[1]) if ':' in jaeger_endpoint else 14268,
            )
            span_processor = BatchSpanProcessor(jaeger_exporter)
            self.tracer_provider.add_span_processor(span_processor)
        
        # Instrument libraries
        RequestsInstrumentor().instrument()
        Psycopg2Instrumentor().instrument()
        LoggingInstrumentor().instrument(set_logging_format=True)
    
    def setup_metrics(self):
        """Setup Prometheus metrics."""
        if not OPENTELEMETRY_AVAILABLE:
            print("OpenTelemetry not available, skipping metrics setup")
            return
            
        # Create meter provider
        resource = Resource.create({
            ResourceAttributes.SERVICE_NAME: "almona-industrial-api",
            ResourceAttributes.SERVICE_VERSION: "2.0.0",
        })
        
        # Setup Prometheus reader
        reader = PrometheusMetricReader()
        self.meter_provider = MeterProvider(resource=resource, metric_readers=[reader])
    
    def instrument_fastapi(self, app):
        """Instrument FastAPI application."""
        if not OPENTELEMETRY_AVAILABLE:
            print("OpenTelemetry not available, skipping FastAPI instrumentation")
            return
        FastAPIInstrumentor.instrument_app(app, tracer_provider=self.tracer_provider)
    
    def get_metrics_response(self) -> Response:
        """Get Prometheus metrics response."""
        metrics_data = generate_latest()
        return Response(
            content=metrics_data,
            media_type=CONTENT_TYPE_LATEST
        )


# Global monitoring setup
monitoring = MonitoringSetup()


def setup_monitoring(app):
    """Setup complete monitoring infrastructure."""
    # Setup tracing
    monitoring.setup_tracing()
    
    # Setup metrics
    monitoring.setup_metrics()
    
    # Instrument FastAPI
    monitoring.instrument_fastapi(app)
    
    # Add tracing middleware
    app.add_middleware(TracingMiddleware)
    
    return monitoring


@asynccontextmanager
async def trace_operation(operation_name: str, **attributes):
    """Context manager for tracing operations."""
    tracer = trace.get_tracer(__name__)
    with tracer.start_as_current_span(operation_name, attributes=attributes) as span:
        try:
            yield span
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            raise


def get_structured_logger(name: str = None):
    """Get a structured logger instance."""
    return monitoring.logger.get_logger(name)


def record_database_metrics(query_type: str, table_name: str, duration: float, success: bool):
    """Record database operation metrics."""
    MetricsCollector.record_database_operation(query_type, table_name, duration, success)


def record_business_metrics(operation_type: str, status: str):
    """Record business operation metrics."""
    MetricsCollector.record_business_operation(operation_type, status)


def record_error_metrics(error_type: str, severity: str = 'error'):
    """Record error metrics."""
    MetricsCollector.record_error(error_type, severity)
