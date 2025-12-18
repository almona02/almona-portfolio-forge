from celery import Celery
import os
import re
from urllib.parse import urlparse, urlunparse
from core.config import settings

def normalize_redis_url(url: str) -> str:
    """Normalize and validate Redis URL format for Celery."""
    if not url:
        return ""
    
    # Remove any whitespace
    url = url.strip()
    
    # Ensure URL starts with redis:// or rediss://
    if not url.startswith(('redis://', 'rediss://')):
        # If it looks like a Railway internal URL, add redis://
        if 'redis.railway.internal' in url or 'railway' in url.lower():
            url = f"redis://{url}"
        elif settings.REDIS_HOST and settings.REDIS_HOST != 'localhost':
            url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}"
        else:
            return ""
    
    # Parse and validate URL
    try:
        parsed = urlparse(url)
        
        # Validate we have a proper URL structure
        if not parsed.scheme or not parsed.netloc:
            raise ValueError(f"Invalid URL structure: {url}")
        
        # Fix malformed port in netloc
        if parsed.netloc:
            netloc_parts = parsed.netloc.split('@')
            if len(netloc_parts) == 2:
                # Has auth: user:pass@host:port
                auth, netloc = netloc_parts
            else:
                auth, netloc = None, netloc_parts[0]
            
            # Fix port in netloc - ensure it's a valid integer
            if ':' in netloc:
                host_parts = netloc.split(':')
                if len(host_parts) == 2:
                    hostname, port_str = host_parts
                    # Extract only numeric port, remove any trailing text
                    port_match = re.search(r'^(\d+)', port_str)
                    if port_match:
                        port = port_match.group(1)
                        # Validate port is a valid integer
                        try:
                            int(port)
                            netloc = f"{hostname}:{port}"
                        except ValueError:
                            # Invalid port, use default 6379
                            netloc = f"{hostname}:6379"
                    else:
                        # No valid port found, use default 6379
                        netloc = f"{hostname}:6379"
                else:
                    # Multiple colons, might be IPv6 or malformed
                    # Try to extract last numeric part as port
                    port_match = re.search(r':(\d+)(?:[^0-9]|$)', netloc)
                    if port_match:
                        port = port_match.group(1)
                        hostname = netloc[:netloc.rindex(':')]
                        netloc = f"{hostname}:{port}"
                    else:
                        # Can't extract port, append default
                        netloc = f"{netloc}:6379"
            else:
                # No port specified, add default
                netloc = f"{netloc}:6379"
            
            # Reconstruct netloc
            if auth:
                parsed = parsed._replace(netloc=f"{auth}@{netloc}")
            else:
                parsed = parsed._replace(netloc=netloc)
        
        # Reconstruct URL
        normalized = urlunparse(parsed)
        
        # Final validation: ensure URL is properly formatted
        if not normalized.startswith(('redis://', 'rediss://')):
            raise ValueError(f"Normalized URL missing protocol: {normalized}")
        
        return normalized
    except Exception as e:
        # If parsing fails, try to construct from components
        import logging
        logging.warning(f"Failed to normalize Redis URL '{url}': {e}")
        if settings.REDIS_HOST and settings.REDIS_HOST != 'localhost':
            return f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}"
        # Return empty string to trigger fallback
        return ""

# Normalize Redis URL before using it
import logging
logger = logging.getLogger(__name__)

# Get raw Redis URL for debugging
raw_redis_url = settings.REDIS_URL or ""
redis_url = normalize_redis_url(raw_redis_url)

# Log the Redis URL (mask password for security)
if redis_url:
    masked_url = re.sub(r':([^:@]+)@', r':****@', redis_url)
    logger.info(f"Celery Redis URL normalized: {masked_url}")
    # Ensure URL starts with redis://
    if not redis_url.startswith(('redis://', 'rediss://')):
        logger.warning(f"Redis URL missing protocol, adding redis://: {redis_url}")
        redis_url = f"redis://{redis_url}"
else:
    fallback_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}"
    logger.warning(f"REDIS_URL not configured, using fallback: {fallback_url}")
    redis_url = fallback_url

# Final validation: ensure URL is properly formatted
if not redis_url.startswith(('redis://', 'rediss://')):
    logger.error(f"Invalid Redis URL format: {redis_url}")
    raise ValueError(f"Redis URL must start with redis:// or rediss://, got: {redis_url}")

logger.info(f"Celery configured with Redis broker/backend: {re.sub(r':([^:@]+)@', r':****@', redis_url)}")

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
