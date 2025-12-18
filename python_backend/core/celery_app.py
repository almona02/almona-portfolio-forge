from celery import Celery
import os
import re
from urllib.parse import urlparse, urlunparse
from core.config import settings

def normalize_redis_url(url: str) -> str:
    """Normalize and validate Redis URL format."""
    if not url:
        return ""
    
    # Remove any whitespace
    url = url.strip()
    
    # Fix common malformed patterns
    # Pattern: "6379redis:" -> extract just the port
    url = re.sub(r':(\d+)redis:', r':\1', url)
    url = re.sub(r':(\d+)redis$', r':\1', url)
    
    # If URL doesn't start with redis://, add it
    if not url.startswith(('redis://', 'rediss://')):
        # Try to construct from host/port if available
        if settings.REDIS_HOST and settings.REDIS_HOST != 'localhost':
            url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}"
        else:
            return ""
    
    # Parse and validate URL
    try:
        parsed = urlparse(url)
        
        # Fix malformed port in netloc (e.g., "host:6379redis:" -> "host:6379")
        if parsed.netloc:
            netloc_parts = parsed.netloc.split('@')
            if len(netloc_parts) == 2:
                # Has auth: user:pass@host:port
                auth, netloc = netloc_parts
            else:
                auth, netloc = None, netloc_parts[0]
            
            # Fix port in netloc
            if ':' in netloc:
                host_parts = netloc.split(':')
                if len(host_parts) == 2:
                    hostname, port_str = host_parts
                    # Extract only numeric port
                    port_match = re.search(r'(\d+)', port_str)
                    if port_match:
                        port = port_match.group(1)
                        netloc = f"{hostname}:{port}"
                    else:
                        # No valid port found, use default
                        netloc = hostname
                else:
                    # Multiple colons, might be IPv6 or malformed
                    # Try to extract last numeric part as port
                    port_match = re.search(r':(\d+)(?:[^0-9]|$)', netloc)
                    if port_match:
                        port = port_match.group(1)
                        hostname = netloc[:netloc.rindex(':')]
                        netloc = f"{hostname}:{port}"
            
            # Reconstruct netloc
            if auth:
                parsed = parsed._replace(netloc=f"{auth}@{netloc}")
            else:
                parsed = parsed._replace(netloc=netloc)
        
        # Reconstruct URL
        normalized = urlunparse(parsed)
        return normalized
    except Exception as e:
        # If parsing fails, try to construct from components
        if settings.REDIS_HOST and settings.REDIS_HOST != 'localhost':
            return f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}"
        # Log the error but return original URL as fallback
        import logging
        logging.warning(f"Failed to normalize Redis URL: {e}, using original: {url}")
        return url

# Normalize Redis URL before using it
import logging
logger = logging.getLogger(__name__)

redis_url = normalize_redis_url(settings.REDIS_URL)

# Log the Redis URL (mask password for security)
if redis_url:
    masked_url = re.sub(r':([^:@]+)@', r':****@', redis_url)
    logger.info(f"Using Redis URL: {masked_url}")
else:
    fallback_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}"
    logger.warning(f"REDIS_URL not configured, using fallback: {fallback_url}")
    redis_url = fallback_url

celery_app = Celery(
    "ai_services",
    broker=redis_url,
    backend=redis_url,
    include=["ai_services.part_detection.tasks", "tasks.erp_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    task_routes={
        "erp.dispatch_invoice": {"queue": "erp"},
    },
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)
