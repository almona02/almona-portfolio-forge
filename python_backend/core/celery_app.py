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
    
    # Fix common malformed patterns BEFORE parsing
    # More aggressive pattern matching for Railway's malformed URLs
    # Pattern: "6379redis:6379" -> extract just the last port
    url = re.sub(r':(\d+)redis:(\d+)', r':\2', url)  # "6379redis:6379" -> ":6379"
    url = re.sub(r':(\d+)redis:', r':\1', url)  # "6379redis:" -> ":6379"
    url = re.sub(r':(\d+)redis$', r':\1', url)  # "6379redis" at end -> ":6379"
    # Handle patterns like "host:6379redis:6379" -> "host:6379"
    url = re.sub(r'(\d+)redis:(\d+)', r'\2', url)  # Remove "redis:" between numbers
    url = re.sub(r'redis:(\d+)', r'\1', url)  # Remove "redis:" before number
    # Remove duplicate ports (e.g., ":6379:6379" -> ":6379")
    url = re.sub(r':(\d+):\1(?!\d)', r':\1', url)
    # Remove any remaining "redis" text in port section
    url = re.sub(r':(\d*redis\d*)', lambda m: ':' + re.sub(r'[^\d]', '', m.group(1)), url)
    
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
                    # Extract only numeric port, handle patterns like "6379redis:6379" or "6379redis"
                    # First, try to find the last valid port number
                    port_matches = re.findall(r'(\d+)', port_str)
                    if port_matches:
                        # Use the last numeric match (most likely the actual port)
                        port = port_matches[-1]
                        # Validate port is a valid integer and in valid range
                        try:
                            port_int = int(port)
                            if 1 <= port_int <= 65535:
                                netloc = f"{hostname}:{port}"
                            else:
                                # Invalid port range, use default 6379
                                netloc = f"{hostname}:6379"
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
        
        # Reconstruct URL with proper format for Celery
        # Celery expects: redis://[:password@]host[:port][/database]
        normalized = urlunparse(parsed)
        
        # Final validation: ensure URL is properly formatted
        if not normalized.startswith(('redis://', 'rediss://')):
            raise ValueError(f"Normalized URL missing protocol: {normalized}")
        
        # Additional validation: ensure the URL can be parsed by urllib again
        # This catches any remaining malformed parts
        try:
            test_parsed = urlparse(normalized)
            if not test_parsed.netloc or not test_parsed.hostname:
                raise ValueError(f"Invalid URL structure after normalization: {normalized}")
            
            # Ensure port is a valid integer if present
            if test_parsed.port is not None:
                int(test_parsed.port)  # This will raise ValueError if port is not an integer
        except (ValueError, AttributeError) as e:
            logger.warning(f"URL validation failed, reconstructing: {e}")
            # Reconstruct from components
            if parsed.username and parsed.password:
                normalized = f"{parsed.scheme}://{parsed.username}:{parsed.password}@{parsed.hostname}:{parsed.port or 6379}{parsed.path}"
            elif parsed.username:
                normalized = f"{parsed.scheme}://{parsed.username}@{parsed.hostname}:{parsed.port or 6379}{parsed.path}"
            else:
                normalized = f"{parsed.scheme}://{parsed.hostname}:{parsed.port or 6379}{parsed.path}"
        
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
# Log at ERROR level to ensure it shows up in Railway logs
logger.error(f"[DEBUG] Raw REDIS_URL length: {len(raw_redis_url)}")
if raw_redis_url:
    # Mask password but show structure
    masked_raw = re.sub(r':([^:@]+)@', r':****@', raw_redis_url)
    logger.error(f"[DEBUG] Raw REDIS_URL (masked): {masked_raw}")
    logger.error(f"[DEBUG] Raw REDIS_URL starts with redis://: {raw_redis_url.startswith('redis://')}")
else:
    logger.error("[DEBUG] Raw REDIS_URL is empty!")

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

# Final cleanup: ensure URL is in exact format Celery expects
# Celery expects: redis://[:password@]host[:port][/database]
try:
    final_parsed = urlparse(redis_url)
    
    # Validate parsed components
    if not final_parsed.hostname:
        raise ValueError(f"Invalid URL: missing hostname in {redis_url}")
    
    # Extract port - ensure it's a valid integer
    port = final_parsed.port
    if port is None:
        port = 6379  # Default Redis port
    else:
        # Validate port is actually an integer
        try:
            port = int(port)
            if not (1 <= port <= 65535):
                raise ValueError(f"Port {port} out of range")
        except (ValueError, TypeError):
            logger.warning(f"Invalid port '{final_parsed.port}', using default 6379")
            port = 6379
    
    # Reconstruct URL with validated components
    if final_parsed.username and final_parsed.password:
        redis_url = f"{final_parsed.scheme}://{final_parsed.username}:{final_parsed.password}@{final_parsed.hostname}:{port}{final_parsed.path or ''}"
    elif final_parsed.username:
        redis_url = f"{final_parsed.scheme}://{final_parsed.username}@{final_parsed.hostname}:{port}{final_parsed.path or ''}"
    else:
        redis_url = f"{final_parsed.scheme}://{final_parsed.hostname}:{port}{final_parsed.path or ''}"
    
    # Final validation: parse again to ensure it's valid
    test_parse = urlparse(redis_url)
    if not test_parse.hostname or test_parse.port is None:
        raise ValueError(f"Reconstructed URL is invalid: {redis_url}")
        
except Exception as e:
    logger.error(f"Final URL cleanup failed: {e}, original URL: {redis_url[:100]}")
    # Try fallback
    if settings.REDIS_HOST and settings.REDIS_HOST != 'localhost':
        redis_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT or 6379}"
        logger.warning(f"Using fallback Redis URL: redis://{settings.REDIS_HOST}:{settings.REDIS_PORT or 6379}")
    else:
        raise ValueError(f"Cannot construct valid Redis URL: {e}")

logger.info(f"Celery configured with Redis broker/backend: {re.sub(r':([^:@]+)@', r':****@', redis_url)}")

# Validate URL one more time before passing to Celery
try:
    validation_parse = urlparse(redis_url)
    if not validation_parse.scheme or not validation_parse.hostname:
        raise ValueError(f"Invalid Redis URL structure: {redis_url}")
    if validation_parse.port is not None:
        int(validation_parse.port)  # Ensure port is a valid integer
except Exception as e:
    logger.error(f"Redis URL validation failed: {e}")
    # Use fallback
    if settings.REDIS_HOST and settings.REDIS_HOST != 'localhost':
        redis_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT or 6379}"
        logger.warning(f"Using fallback Redis URL: {redis_url}")
    else:
        raise ValueError(f"Cannot use invalid Redis URL: {e}")

# Initialize Celery with error handling
try:
    logger.error(f"[DEBUG] Initializing Celery with Redis URL: {re.sub(r':([^:@]+)@', r':****@', redis_url)}")
    celery_app = Celery(
        "ai_services",
        broker=redis_url,
        backend=redis_url,
        include=["ai_services.part_detection.tasks", "tasks.erp_tasks"]
    )
    logger.error("[DEBUG] Celery app initialized successfully")
except Exception as e:
    logger.error(f"[DEBUG] Celery initialization failed: {type(e).__name__}: {str(e)}")
    logger.error(f"[DEBUG] Redis URL that failed: {re.sub(r':([^:@]+)@', r':****@', redis_url)}")
    # Try with a simple fallback
    if settings.REDIS_HOST and settings.REDIS_HOST != 'localhost':
        fallback_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT or 6379}"
        logger.error(f"[DEBUG] Trying fallback URL: {fallback_url}")
        celery_app = Celery(
            "ai_services",
            broker=fallback_url,
            backend=fallback_url,
            include=["ai_services.part_detection.tasks", "tasks.erp_tasks"]
        )
    else:
        raise

celery_app.conf.update(
    # Explicitly set broker URL to ensure correct format
    broker_url=redis_url,
    result_backend=redis_url,
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
