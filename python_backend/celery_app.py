"""
Enhanced Celery configuration for heavy background processing.
"""
import logging
from celery import Celery
from celery.signals import task_prerun, task_postrun, task_failure
from core.config import settings

logger = logging.getLogger(__name__)

# Create Celery instance with enhanced configuration
celery_app = Celery(
    "almona_backend",
    broker=settings.REDIS_URL or "redis://localhost:6379/0",
    backend=settings.REDIS_URL or "redis://localhost:6379/0",
    include=[
        "tasks.quote_tasks",
        "tasks.notification_tasks",
        "tasks.report_tasks",
        "tasks.monitoring_tasks"
    ]
)

# Enhanced Celery configuration for heavy processing
celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Task execution
    task_track_started=True,
    task_always_eager=False,  # Enable background processing
    task_eager_propagates=True,
    
    # Time limits for different task types
    task_time_limit=60 * 60,  # 60 minutes for heavy tasks
    task_soft_time_limit=55 * 60,  # 55 minutes soft limit
    
    # Worker configuration
    worker_prefetch_multiplier=1,  # Process one task at a time for heavy tasks
    worker_max_tasks_per_child=500,  # Restart workers after 500 tasks
    worker_max_memory_per_child=200000,  # 200MB memory limit per worker
    
    # Result backend
    result_expires=24 * 3600,  # 24 hours
    result_persistent=True,
    
    # Queue configuration
    task_default_queue="default",
    task_queues={
        "quotes": {
            "exchange": "quotes",
            "routing_key": "quotes",
        },
        "notifications": {
            "exchange": "notifications", 
            "routing_key": "notifications",
        },
        "reports": {
            "exchange": "reports",
            "routing_key": "reports",
        },
        "heavy_processing": {
            "exchange": "heavy_processing",
            "routing_key": "heavy_processing",
        },
    },
    
    # Retry configuration
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    
    # Monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,
    
    # Redis specific
    broker_connection_retry_on_startup=True,
    broker_connection_retry=True,
    broker_connection_max_retries=10,
)

# Enhanced task routing for heavy processing
celery_app.conf.task_routes = {
    "tasks.quote_tasks.process_quote_calculation": {"queue": "heavy_processing"},
    "tasks.quote_tasks.generate_quote_pdf": {"queue": "quotes"},
    "tasks.quote_tasks.send_quote_notification": {"queue": "notifications"},
    "tasks.notification_tasks.*": {"queue": "notifications"},
    "tasks.report_tasks.*": {"queue": "reports"},
    "tasks.monitoring_tasks.*": {"queue": "default"},
}

# Task-specific configurations
celery_app.conf.task_annotations = {
    "tasks.quote_tasks.process_quote_calculation": {
        "time_limit": 30 * 60,  # 30 minutes
        "soft_time_limit": 25 * 60,  # 25 minutes
        "rate_limit": "10/m",  # 10 per minute
    },
    "tasks.quote_tasks.generate_quote_pdf": {
        "time_limit": 10 * 60,  # 10 minutes
        "soft_time_limit": 8 * 60,  # 8 minutes
        "rate_limit": "20/m",  # 20 per minute
    },
    "tasks.notification_tasks.send_email": {
        "time_limit": 5 * 60,  # 5 minutes
        "soft_time_limit": 4 * 60,  # 4 minutes
        "rate_limit": "100/m",  # 100 per minute
    },
    "tasks.report_tasks.generate_report": {
        "time_limit": 60 * 60,  # 60 minutes
        "soft_time_limit": 55 * 60,  # 55 minutes
        "rate_limit": "5/m",  # 5 per minute
    },
}

# Signal handlers for monitoring
@task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kwds):
    """Log task start."""
    logger.info(f"Task {task.name} started with ID {task_id}")

@task_postrun.connect
def task_postrun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, retval=None, state=None, **kwds):
    """Log task completion."""
    logger.info(f"Task {task.name} completed with ID {task_id}, state: {state}")

@task_failure.connect
def task_failure_handler(sender=None, task_id=None, exception=None, traceback=None, einfo=None, **kwds):
    """Log task failures."""
    logger.error(f"Task {sender.name} failed with ID {task_id}: {exception}")
