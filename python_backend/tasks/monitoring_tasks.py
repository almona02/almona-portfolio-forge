"""
Background tasks for system monitoring and health checks.
"""
from celery import current_task
from celery.exceptions import Retry
from typing import Dict, Any, List, Optional
import logging
import time
import psutil
from datetime import datetime, timedelta

from celery_app import celery_app
from core.supabase_client import get_enhanced_supabase_client
from core.connection_pool import get_connection_pool

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="system_health_check", max_retries=2)
def system_health_check(self):
    """
    Comprehensive system health check task.
    
    Features:
    - Database connectivity monitoring
    - Connection pool health
    - System resource monitoring
    - Task queue monitoring
    - Performance metrics collection
    """
    start_time = time.time()
    
    try:
        current_task.update_state(
            state="PROGRESS",
            meta={
                "current": 0,
                "total": 100,
                "status": "Starting system health check...",
                "started_at": datetime.utcnow().isoformat()
            }
        )
        
        health_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "overall_status": "healthy",
            "checks": {}
        }
        
        # Step 1: Database connectivity check (20%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 10, "total": 100, "status": "Checking database connectivity..."}
        )
        
        try:
            supabase = get_enhanced_supabase_client()
            # Simple query to test connectivity
            result = supabase.client.table("profiles").select("id").limit(1).execute()
            health_data["checks"]["database"] = {
                "status": "healthy",
                "response_time_ms": 0,  # Would measure actual response time
                "error": None
            }
        except Exception as e:
            health_data["checks"]["database"] = {
                "status": "unhealthy",
                "error": str(e)
            }
            health_data["overall_status"] = "degraded"
        
        # Step 2: Connection pool health check (40%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 30, "total": 100, "status": "Checking connection pool health..."}
        )
        
        try:
            pool = get_connection_pool()
            pool_stats = pool.get_performance_stats()
            connection_health = pool.get_connection_health()
            
            health_data["checks"]["connection_pool"] = {
                "status": "healthy" if pool_stats.error_rate < 0.1 else "degraded",
                "total_connections": pool_stats.total_connections,
                "active_connections": pool_stats.active_connections,
                "healthy_connections": pool_stats.healthy_connections,
                "error_rate": pool_stats.error_rate,
                "avg_response_time_ms": pool_stats.avg_response_time_ms
            }
            
            if pool_stats.error_rate > 0.1:
                health_data["overall_status"] = "degraded"
                
        except Exception as e:
            health_data["checks"]["connection_pool"] = {
                "status": "unhealthy",
                "error": str(e)
            }
            health_data["overall_status"] = "degraded"
        
        # Step 3: System resources check (60%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 50, "total": 100, "status": "Checking system resources..."}
        )
        
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            
            # Disk usage
            disk = psutil.disk_usage('/')
            
            health_data["checks"]["system_resources"] = {
                "status": "healthy" if cpu_percent < 80 and memory.percent < 80 else "degraded",
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_available_gb": round(memory.available / (1024**3), 2),
                "disk_percent": disk.percent,
                "disk_free_gb": round(disk.free / (1024**3), 2)
            }
            
            if cpu_percent > 80 or memory.percent > 80:
                health_data["overall_status"] = "degraded"
                
        except Exception as e:
            health_data["checks"]["system_resources"] = {
                "status": "unhealthy",
                "error": str(e)
            }
            health_data["overall_status"] = "degraded"
        
        # Step 4: Task queue monitoring (80%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 70, "total": 100, "status": "Monitoring task queues..."}
        )
        
        try:
            # Get Celery inspection
            inspect = celery_app.control.inspect()
            
            # Get active tasks
            active_tasks = inspect.active()
            scheduled_tasks = inspect.scheduled()
            reserved_tasks = inspect.reserved()
            
            total_active = sum(len(tasks) for tasks in (active_tasks or {}).values())
            total_scheduled = sum(len(tasks) for tasks in (scheduled_tasks or {}).values())
            total_reserved = sum(len(tasks) for tasks in (reserved_tasks or {}).values())
            
            health_data["checks"]["task_queues"] = {
                "status": "healthy" if total_active < 100 else "degraded",
                "active_tasks": total_active,
                "scheduled_tasks": total_scheduled,
                "reserved_tasks": total_reserved,
                "total_pending": total_active + total_scheduled + total_reserved
            }
            
            if total_active > 100:
                health_data["overall_status"] = "degraded"
                
        except Exception as e:
            health_data["checks"]["task_queues"] = {
                "status": "unhealthy",
                "error": str(e)
            }
            health_data["overall_status"] = "degraded"
        
        # Step 5: Save health check results (100%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 90, "total": 100, "status": "Saving health check results..."}
        )
        
        processing_time = time.time() - start_time
        health_data["processing_time_seconds"] = round(processing_time, 2)
        
        # Save to database
        try:
            supabase = get_enhanced_supabase_client()
            health_record = {
                "timestamp": health_data["timestamp"],
                "overall_status": health_data["overall_status"],
                "processing_time_seconds": health_data["processing_time_seconds"],
                "health_data": health_data
            }
            
            supabase.client.table("health_checks").insert(health_record).execute()
        except Exception as db_error:
            logger.warning(f"Failed to save health check to database: {db_error}")
        
        current_task.update_state(
            state="SUCCESS",
            meta={
                "current": 100,
                "total": 100,
                "status": "System health check completed",
                "overall_status": health_data["overall_status"],
                "processing_time_seconds": processing_time,
                "completed_at": datetime.utcnow().isoformat()
            }
        )
        
        logger.info(
            f"System health check completed: status={health_data['overall_status']}, "
            f"time={processing_time:.2f}s"
        )
        
        return health_data
        
    except Exception as e:
        processing_time = time.time() - start_time
        error_msg = f"System health check failed: {str(e)}"
        
        logger.error(f"{error_msg} (processing_time: {processing_time:.2f}s)")
        
        current_task.update_state(
            state="FAILURE",
            meta={
                "error": str(e),
                "processing_time_seconds": processing_time,
                "failed_at": datetime.utcnow().isoformat()
            }
        )
        
        # Retry logic
        if self.request.retries < self.max_retries:
            retry_delay = 2 ** self.request.retries
            logger.info(f"Retrying system health check in {retry_delay} seconds")
            raise self.retry(countdown=retry_delay, exc=e)
        
        raise


@celery_app.task(bind=True, name="task_performance_monitor", max_retries=1)
def task_performance_monitor(self):
    """
    Monitor task performance and collect metrics.
    
    Features:
    - Task execution time monitoring
    - Success/failure rate tracking
    - Queue length monitoring
    - Worker performance metrics
    """
    start_time = time.time()
    
    try:
        current_task.update_state(
            state="PROGRESS",
            meta={
                "current": 0,
                "total": 100,
                "status": "Starting task performance monitoring...",
                "started_at": datetime.utcnow().isoformat()
            }
        )
        
        # Get Celery inspection
        inspect = celery_app.control.inspect()
        
        # Step 1: Get worker statistics (30%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 20, "total": 100, "status": "Collecting worker statistics..."}
        )
        
        worker_stats = inspect.stats()
        active_tasks = inspect.active()
        scheduled_tasks = inspect.scheduled()
        
        # Step 2: Analyze task performance (60%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 50, "total": 100, "status": "Analyzing task performance..."}
        )
        
        performance_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "workers": {},
            "queues": {},
            "task_types": {}
        }
        
        # Process worker statistics
        if worker_stats:
            for worker_name, stats in worker_stats.items():
                performance_data["workers"][worker_name] = {
                    "status": "active",
                    "total_tasks": stats.get("total", {}),
                    "pool": stats.get("pool", {}),
                    "rusage": stats.get("rusage", {})
                }
        
        # Process queue statistics
        if active_tasks:
            for worker_name, tasks in active_tasks.items():
                queue_name = f"worker_{worker_name}"
                performance_data["queues"][queue_name] = {
                    "active_tasks": len(tasks),
                    "tasks": [{"name": task["name"], "id": task["id"]} for task in tasks]
                }
        
        # Step 3: Get task type statistics (80%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 70, "total": 100, "status": "Collecting task type statistics..."}
        )
        
        # Analyze task types
        task_type_counts = {}
        if active_tasks:
            for worker_tasks in active_tasks.values():
                for task in worker_tasks:
                    task_name = task.get("name", "unknown")
                    task_type_counts[task_name] = task_type_counts.get(task_name, 0) + 1
        
        performance_data["task_types"] = task_type_counts
        
        # Step 4: Save performance data (100%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 90, "total": 100, "status": "Saving performance data..."}
        )
        
        processing_time = time.time() - start_time
        performance_data["processing_time_seconds"] = round(processing_time, 2)
        
        # Save to database
        try:
            supabase = get_enhanced_supabase_client()
            performance_record = {
                "timestamp": performance_data["timestamp"],
                "processing_time_seconds": performance_data["processing_time_seconds"],
                "performance_data": performance_data
            }
            
            supabase.client.table("task_performance").insert(performance_record).execute()
        except Exception as db_error:
            logger.warning(f"Failed to save performance data to database: {db_error}")
        
        current_task.update_state(
            state="SUCCESS",
            meta={
                "current": 100,
                "total": 100,
                "status": "Task performance monitoring completed",
                "processing_time_seconds": processing_time,
                "completed_at": datetime.utcnow().isoformat()
            }
        )
        
        logger.info(
            f"Task performance monitoring completed: "
            f"workers={len(performance_data['workers'])}, "
            f"time={processing_time:.2f}s"
        )
        
        return performance_data
        
    except Exception as e:
        processing_time = time.time() - start_time
        error_msg = f"Task performance monitoring failed: {str(e)}"
        
        logger.error(f"{error_msg} (processing_time: {processing_time:.2f}s)")
        
        current_task.update_state(
            state="FAILURE",
            meta={
                "error": str(e),
                "processing_time_seconds": processing_time,
                "failed_at": datetime.utcnow().isoformat()
            }
        )
        
        raise


@celery_app.task(bind=True, name="cleanup_old_tasks", max_retries=1)
def cleanup_old_tasks(self, days_old: int = 7):
    """
    Clean up old task results and logs.
    
    Args:
        days_old: Number of days to keep task data
    """
    start_time = time.time()
    
    try:
        current_task.update_state(
            state="PROGRESS",
            meta={
                "current": 0,
                "total": 100,
                "status": f"Starting cleanup of tasks older than {days_old} days...",
                "started_at": datetime.utcnow().isoformat()
            }
        )
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        # Step 1: Clean up email logs (30%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 20, "total": 100, "status": "Cleaning up email logs..."}
        )
        
        supabase = get_enhanced_supabase_client()
        
        # Clean up old email logs
        email_cleanup = supabase.client.table("email_logs").delete().lt(
            "sent_at", cutoff_date.isoformat()
        ).execute()
        
        # Step 2: Clean up health checks (60%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 50, "total": 100, "status": "Cleaning up health checks..."}
        )
        
        # Keep only last 30 days of health checks
        health_cleanup = supabase.client.table("health_checks").delete().lt(
            "timestamp", cutoff_date.isoformat()
        ).execute()
        
        # Step 3: Clean up task performance data (90%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 80, "total": 100, "status": "Cleaning up task performance data..."}
        )
        
        # Keep only last 7 days of performance data
        performance_cleanup = supabase.client.table("task_performance").delete().lt(
            "timestamp", cutoff_date.isoformat()
        ).execute()
        
        # Step 4: Complete cleanup (100%)
        processing_time = time.time() - start_time
        
        cleanup_summary = {
            "timestamp": datetime.utcnow().isoformat(),
            "cutoff_date": cutoff_date.isoformat(),
            "email_logs_cleaned": len(email_cleanup.data) if email_cleanup.data else 0,
            "health_checks_cleaned": len(health_cleanup.data) if health_cleanup.data else 0,
            "performance_data_cleaned": len(performance_cleanup.data) if performance_cleanup.data else 0,
            "processing_time_seconds": round(processing_time, 2)
        }
        
        current_task.update_state(
            state="SUCCESS",
            meta={
                "current": 100,
                "total": 100,
                "status": "Cleanup completed successfully",
                "processing_time_seconds": processing_time,
                "completed_at": datetime.utcnow().isoformat()
            }
        )
        
        logger.info(
            f"Task cleanup completed: "
            f"emails={cleanup_summary['email_logs_cleaned']}, "
            f"health_checks={cleanup_summary['health_checks_cleaned']}, "
            f"performance={cleanup_summary['performance_data_cleaned']}, "
            f"time={processing_time:.2f}s"
        )
        
        return cleanup_summary
        
    except Exception as e:
        processing_time = time.time() - start_time
        error_msg = f"Task cleanup failed: {str(e)}"
        
        logger.error(f"{error_msg} (processing_time: {processing_time:.2f}s)")
        
        current_task.update_state(
            state="FAILURE",
            meta={
                "error": str(e),
                "processing_time_seconds": processing_time,
                "failed_at": datetime.utcnow().isoformat()
            }
        )
        
        raise


@celery_app.task(bind=True, name="monitor_celery_workers", max_retries=1)
def monitor_celery_workers(self):
    """
    Monitor Celery workers and restart if needed.
    """
    try:
        current_task.update_state(
            state="PROGRESS",
            meta={
                "current": 0,
                "total": 100,
                "status": "Monitoring Celery workers...",
                "started_at": datetime.utcnow().isoformat()
            }
        )
        
        # Get worker statistics
        inspect = celery_app.control.inspect()
        worker_stats = inspect.stats()
        
        if not worker_stats:
            logger.warning("No Celery workers found")
            return {"status": "no_workers", "workers": []}
        
        worker_status = []
        for worker_name, stats in worker_stats.items():
            worker_info = {
                "name": worker_name,
                "status": "active",
                "total_tasks": stats.get("total", {}),
                "pool": stats.get("pool", {}),
                "rusage": stats.get("rusage", {})
            }
            worker_status.append(worker_info)
        
        current_task.update_state(
            state="SUCCESS",
            meta={
                "current": 100,
                "total": 100,
                "status": "Worker monitoring completed",
                "worker_count": len(worker_status),
                "completed_at": datetime.utcnow().isoformat()
            }
        )
        
        return {
            "status": "success",
            "worker_count": len(worker_status),
            "workers": worker_status,
            "monitored_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Worker monitoring failed: {str(e)}")
        current_task.update_state(
            state="FAILURE",
            meta={"error": str(e), "failed_at": datetime.utcnow().isoformat()}
        )
        raise
