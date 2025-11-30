"""
Sentry Error Tracking Setup for FastAPI
Captures and reports unhandled exceptions
"""

try:
    import sentry_sdk  # type: ignore[reportMissingImports]
    from sentry_sdk.integrations.fastapi import (  # type: ignore
        FastApiIntegration
    )
    from sentry_sdk.integrations.sqlalchemy import (  # type: ignore
        SqlalchemyIntegration
    )
    from sentry_sdk.integrations.celery import (  # type: ignore
        CeleryIntegration
    )
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False

from core.config import settings


def init_sentry():
    """Initialize Sentry error tracking."""
    if not SENTRY_AVAILABLE:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(
            'Sentry SDK not installed. Error tracking disabled.'
        )
        return

    dsn = getattr(settings, 'SENTRY_DSN', None)

    if not dsn:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(
            'Sentry DSN not configured. Error tracking disabled.'
        )
        return

    environment = getattr(settings, 'ENVIRONMENT', 'development')

    def before_send_filter(event, hint):
        """Filter out health check endpoints."""
        request_url = event.get('request', {}).get('url', '')
        if '/health' in request_url:
            return None
        return event

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
            CeleryIntegration(),
        ],
        # Performance Monitoring
        traces_sample_rate=0.1 if environment == 'production' else 1.0,
        # Filter out health check endpoints
        before_send=before_send_filter,
        # Release tracking
        release=getattr(settings, 'APP_VERSION', 'unknown'),
    )
