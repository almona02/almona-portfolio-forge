"""
Heavy computation tasks for async processing.
Contains Celery tasks for optimization, scanning, and other
CPU-intensive operations.
"""

import time
from typing import Dict, Any, Optional, List
from datetime import datetime

from core.celery_app import celery_app
from core.monitoring import get_structured_logger

logger = get_structured_logger(__name__)


@celery_app.task(
    bind=True,
    name="heavy_optimization.cutting",
    max_retries=2,
    time_limit=600,
)
def optimize_cutting_task(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Async task for heavy cutting optimization.
    Processes 1D cutting stock optimization in background.
    Updates job status in database for Supabase Realtime.
    """
    import asyncio

    # Run async task
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_run_optimization_task(self, request_data))
    finally:
        loop.close()


async def _run_optimization_task(
    task_instance, request_data: Dict[str, Any]
) -> Dict[str, Any]:
    """Async implementation of the optimization task."""
    from services.job_service import job_service

    try:
        logger.info(
            "Starting heavy cutting optimization task",
            task_id=task_instance.request.id,
        )

        # Update status to processing
        await job_service.update_job_status(task_instance.request.id, "processing")

        # Import here to avoid circular imports
        from apis.v2.heavy_optimization import (
            CuttingOptimizationRequest,
            DefectAwareOptimizer,
            CutDef,
            StockBarDef,
            _map_objective,
        )

        # Parse request data
        req = CuttingOptimizationRequest(**request_data)

        # Validate inputs
        if not req.cuts:
            raise ValueError("At least one cut is required")
        if not req.stock:
            raise ValueError("At least one stock bar is required")

        # Initialize optimizer
        optimizer = DefectAwareOptimizer(
            kerf_width=req.kerf_width_mm,
            min_usable_remnant=req.min_usable_remnant_mm,
            time_limit_seconds=req.time_limit_seconds,
        )

        # Prepare cuts and stock data
        cuts = [
            CutDef(
                id=c.id,
                length=c.length_mm,
                quantity=c.quantity,
                priority=c.priority,
                profile_id=c.profile_id or "",
                allow_defects=c.allow_defects,
            )
            for c in req.cuts
        ]

        stock = [
            StockBarDef(
                id=s.id,
                length=s.length_mm,
                quantity=s.quantity,
                cost_per_unit=s.cost_per_unit,
                is_remnant=s.is_remnant,
                defects=[],
                profile_id=s.profile_id or "",
            )
            for s in req.stock
        ]

        # Run optimization
        solution = optimizer.optimize(
            cuts=cuts,
            stock=stock,
            objective=_map_objective(req.objective),
        )

        payload = solution.to_dict()

        # Prepare result
        result = {
            "assignments": payload["assignments"],
            "waste_percentage": payload["waste_percentage"],
            "total_cost": payload["total_cost"],
            "processing_time_seconds": payload["processing_time_seconds"],
            "egyptian_context": {
                "workshop_id": req.workshop_id,
                "project_ids": req.project_ids or [],
                "optimized_for_egypt": True,
                "notes": (
                    "Tuned for low-RAM workshop PCs; "
                    "heavy LP/CP compute moved to Python backend."
                ),
            },
            "task_id": task_instance.request.id,
            "completed_at": datetime.utcnow().isoformat(),
        }

        # Update job status to completed
        success = await job_service.update_job_status(
            task_instance.request.id,
            "completed",
            result_data=result,
            processing_time_seconds=payload["processing_time_seconds"],
        )

        if success:
            logger.info(
                ("Heavy cutting optimization completed " "and status updated"),
                task_id=task_instance.request.id,
                processing_time=payload["processing_time_seconds"],
            )
        else:
            logger.warning(
                ("Heavy cutting optimization completed " "but status update failed"),
                task_id=task_instance.request.id,
            )

        return result

    except Exception as e:
        error_msg = str(e)
        logger.error(
            "Heavy cutting optimization failed",
            task_id=task_instance.request.id,
            error=error_msg,
        )

        # Update job status to failed
        await job_service.update_job_status(
            task_instance.request.id, "failed", error_message=error_msg
        )

        raise task_instance.retry(countdown=60, exc=e)


@celery_app.task(
    bind=True,
    name="heavy_optimization.mass_production",
    max_retries=2,
    time_limit=900,
)
def optimize_mass_production_task(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Async task for mass production optimization.
    Handles large-scale production planning.
    """
    try:
        logger.info(
            "Starting mass production optimization task",
            task_id=self.request.id,
        )

        # Import here to avoid circular imports
        from apis.v2.heavy_optimization import (
            MassProductionOptimizationRequest,
        )

        # TODO: Implement mass production optimization logic
        # For now, return a placeholder result
        # Parse request (currently unused but validates input)
        _ = MassProductionOptimizationRequest(**request_data)
        result = {
            "status": "completed",
            "message": "Mass production optimization not yet implemented",
            "task_id": self.request.id,
            "completed_at": datetime.utcnow().isoformat(),
        }

        logger.info(
            "Mass production optimization completed",
            task_id=self.request.id,
        )
        return result

    except Exception as e:
        logger.error(
            "Mass production optimization failed",
            task_id=self.request.id,
            error=str(e),
        )
        raise self.retry(countdown=60, exc=e)


@celery_app.task(bind=True, name="smart_scan.single", max_retries=2, time_limit=300)
def smart_scan_single_task(
    self,
    file_content: bytes,
    filename: str,
    known_width_mm: Optional[float] = None,
    auto_detect_scale: bool = True,
) -> Dict[str, Any]:
    """
    Async task for single profile scanning.
    Processes uploaded files and extracts profile information.
    """
    try:
        logger.info(
            (
                f"Starting smart scan single task: "
                f"task_id={self.request.id}, file_name={filename}"
            ),
            task_id=self.request.id,
        )

        # Import here to avoid circular imports
        from apis.v2.smart_scan import (
            FormatConverter,
            ProfileScanner,
            validate_file_size,
        )

        start = time.time()

        # Validate file
        can_convert, error = FormatConverter.can_convert(filename)
        if not can_convert:
            raise ValueError(error)

        if not file_content:
            raise ValueError("Empty file")

        validate_file_size(file_content)

        # Convert to images
        images = FormatConverter.convert_to_images(file_content, filename, max_images=1)
        if not images:
            raise ValueError("No images extracted")

        # Process with scanner
        scanner = ProfileScanner(enable_ocr=auto_detect_scale)
        result = scanner.process_image(images[0], known_width_mm=known_width_mm)

        proc_ms = round((time.time() - start) * 1000, 1)

        result.update(
            {
                "task_id": self.request.id,
                "processing_time_ms": proc_ms,
                "completed_at": datetime.utcnow().isoformat(),
            }
        )

        logger.info(
            "Smart scan single completed",
            task_id=self.request.id,
            processing_time_ms=proc_ms,
        )

        return result

    except Exception as e:
        logger.error(
            (
                f"Smart scan single failed: "
                f"task_id={self.request.id}, file_name={filename}, "
                f"error={str(e)}"
            ),
            task_id=self.request.id,
        )
        raise self.retry(countdown=30, exc=e)


@celery_app.task(bind=True, name="smart_scan.batch", max_retries=2, time_limit=600)
def smart_scan_batch_task(self, files_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Async task for batch profile scanning.
    Processes multiple files in sequence.
    """
    try:
        logger.info(
            "Starting smart scan batch task",
            task_id=self.request.id,
            file_count=len(files_data),
        )

        results = []
        total_start = time.time()

        for file_data in files_data:
            file_start = time.time()

            try:
                # Process each file using the single scan logic
                result = smart_scan_single_task.apply(
                    args=[
                        file_data["content"],
                        file_data["filename"],
                        file_data.get("known_width_mm"),
                        file_data.get("auto_detect_scale", True),
                    ]
                ).get(
                    timeout=250
                )  # 4+ minute timeout per file

                results.append(
                    {
                        "file_index": file_data["index"],
                        "success": True,
                        "result": result,
                        "processing_time_ms": round(
                            (time.time() - file_start) * 1000, 1
                        ),
                    }
                )

            except Exception as e:
                results.append(
                    {
                        "file_index": file_data["index"],
                        "success": False,
                        "error": str(e),
                        "processing_time_ms": round(
                            (time.time() - file_start) * 1000, 1
                        ),
                    }
                )

        total_proc_ms = round((time.time() - total_start) * 1000, 1)

        final_result = {
            "batch_results": results,
            "total_files": len(files_data),
            "successful_scans": sum(1 for r in results if r["success"]),
            "failed_scans": sum(1 for r in results if not r["success"]),
            "total_processing_time_ms": total_proc_ms,
            "task_id": self.request.id,
            "completed_at": datetime.utcnow().isoformat(),
        }

        logger.info(
            "Smart scan batch completed",
            task_id=self.request.id,
            successful_scans=final_result["successful_scans"],
            failed_scans=final_result["failed_scans"],
            total_processing_time_ms=total_proc_ms,
        )

        return final_result

    except Exception as e:
        logger.error(
            "Smart scan batch failed",
            task_id=self.request.id,
            error=str(e),
        )
        raise self.retry(countdown=60, exc=e)
