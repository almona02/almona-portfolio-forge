import time
import uuid
from datetime import datetime
from typing import List, Optional, Dict
import logging

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse

from ai_services.vision.profile_scanner import ProfileScanner
from ai_services.vision.format_converter import (
    FormatConverter,
    MAX_FILE_SIZE,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/smart-scan", tags=["SmartScan"])


class ScanSession:
    def __init__(self):
        self.sessions: Dict[str, Dict] = {}

    def create(self, total_files: int = 1) -> str:
        sid = str(uuid.uuid4())
        self.sessions[sid] = {
            "id": sid,
            "created_at": datetime.utcnow().isoformat(),
            "total_files": total_files,
            "processed_files": 0,
            "results": [],
            "status": "processing",
            "errors": [],
        }
        return sid

    def update(self, sid: str, result: Dict, error: Optional[str] = None):
        if sid not in self.sessions:
            return
        if error:
            self.sessions[sid]["errors"].append(error)
        self.sessions[sid]["results"].append(result)
        self.sessions[sid]["processed_files"] += 1
        if self.sessions[sid]["processed_files"] >= self.sessions[sid]["total_files"]:
            self.sessions[sid]["status"] = "completed"
            self.sessions[sid]["completed_at"] = datetime.utcnow().isoformat()

    def get(self, sid: str) -> Optional[Dict]:
        return self.sessions.get(sid)

    def cleanup_old_sessions(self, max_age_hours: int = 24):
        cutoff = datetime.utcnow().timestamp() - max_age_hours * 3600
        to_delete = []
        for sid, sess in self.sessions.items():
            created = datetime.fromisoformat(sess["created_at"]).timestamp()
            if created < cutoff:
                to_delete.append(sid)
        for sid in to_delete:
            del self.sessions[sid]
        if to_delete:
            logger.info("Cleaned %s old sessions", len(to_delete))


session_manager = ScanSession()


def validate_file_size(content: bytes):
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(content)/1024/1024:.1f}MB). Max 50MB.",
        )


@router.get("/supported-formats")
async def get_supported_formats():
    return {
        "supported": FormatConverter.get_supported_extensions(),
        "notes": {
            "images": "JPG, PNG, BMP, TIFF, WEBP",
            "pdf": "Requires poppler-utils",
            "dxf": "Requires ezdxf[drawing] + matplotlib",
            "dwg": "Not supported; convert to DXF or image",
        },
    }


@router.post("/single")
async def scan_single_profile_async(
    file: UploadFile = File(...),
    known_width_mm: Optional[float] = Form(None),
    auto_detect_scale: bool = Form(True),
):
    """
    ENQUEUE single profile scan job for async processing.

    Returns immediately with job_id. Actual scanning happens in background.
    Frontend should poll job status or listen via Supabase Realtime.
    """
    try:
        # Input validation only - no heavy computation
        can_convert, error = FormatConverter.can_convert(file.filename)
        if not can_convert:
            raise HTTPException(status_code=400, detail=error)

        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")
        validate_file_size(content)

        # Import Celery task here to avoid circular imports
        from tasks.heavy_computation_tasks import smart_scan_single_task

        # Enqueue the task - returns immediately
        task = smart_scan_single_task.delay(
            content, file.filename, known_width_mm, auto_detect_scale
        )

        logger.info(
            f"Smart scan single job enqueued: job_id={task.id}, "
            f"file_name={file.filename}, file_size_bytes={len(content)}",
            extra={"job_id": task.id, "file_name": file.filename, "file_size_bytes": len(content)}
        )

        return JSONResponse(
            content={
                "job_id": task.id,
                "status": "enqueued",
                "message": "Profile scan job has been enqueued. Track progress via job_id.",
                "filename": file.filename,
                "estimated_time_seconds": 10,
            },
            status_code=202,  # Accepted - job enqueued
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to enqueue scan job: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to enqueue scan job: {str(exc)}")


@router.get("/job/{job_id}")
async def get_scan_job_status(job_id: str):
    """
    Check the status of a smart scan job.

    Returns:
    - 200: Job completed with results
    - 202: Job still processing
    - 404: Job not found
    """
    try:
        # Import Celery task here to avoid circular imports
        from tasks.heavy_computation_tasks import smart_scan_single_task

        # Check if task exists and get its state
        task = smart_scan_single_task.AsyncResult(job_id)

        if task.state == "PENDING":
            return JSONResponse(
                content={
                    "job_id": job_id,
                    "status": "pending",
                    "message": "Scan job is queued and waiting to be processed",
                    "estimated_time_seconds": 10
                },
                status_code=202
            )
        elif task.state == "PROGRESS":
            return JSONResponse(
                content={
                    "job_id": job_id,
                    "status": "processing",
                    "message": "Profile scan is currently running",
                },
                status_code=202
            )
        elif task.state == "SUCCESS":
            result = task.result
            return JSONResponse(
                content={
                    "job_id": job_id,
                    "status": "completed",
                    "result": result,
                    "completed_at": result.get("completed_at"),
                    "processing_time_ms": result.get("processing_time_ms", 0)
                },
                status_code=200
            )
        elif task.state == "FAILURE":
            return JSONResponse(
                content={
                    "job_id": job_id,
                    "status": "failed",
                    "error": str(task.info) if task.info else "Unknown error",
                    "message": "Profile scan job failed"
                },
                status_code=500
            )
        else:
            return JSONResponse(
                content={
                    "job_id": job_id,
                    "status": "unknown",
                    "state": task.state,
                    "message": f"Job is in unknown state: {task.state}"
                },
                status_code=202
            )

    except Exception as exc:
        logger.error("Error checking scan job status: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error checking job status: {str(exc)}")


@router.post("/batch")
async def scan_batch_profiles(
    files: List[UploadFile] = File(...),
    session_id: Optional[str] = Form(None),
    known_width_mm: Optional[float] = Form(None),
    background_tasks: BackgroundTasks = None,
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    if not session_id:
        session_id = session_manager.create(total_files=len(files))
    else:
        if not session_manager.get(session_id):
            raise HTTPException(status_code=404, detail="Session not found")

    results = []
    for file in files:
        try:
            content = await file.read()
            if not content:
                raise ValueError("Empty file")
            validate_file_size(content)
            images = FormatConverter.convert_to_images(content, file.filename, max_images=1)
            if not images:
                raise ValueError("No images extracted")
            scanner = ProfileScanner(enable_ocr=True)
            res = scanner.process_image(images[0], known_width_mm=known_width_mm)
            file_result = {"filename": file.filename, "success": True, "data": res}
        except Exception as exc:
            file_result = {"filename": file.filename, "success": False, "error": str(exc)}
        results.append(file_result)
        session_manager.update(session_id, file_result, error=file_result.get("error"))

    if background_tasks:
        background_tasks.add_task(session_manager.cleanup_old_sessions)

    return {
        "success": True,
        "session_id": session_id,
        "total_files": len(files),
        "successful": len([r for r in results if r.get("success")]),
        "failed": len([r for r in results if not r.get("success")]),
        "results": results,
    }


@router.get("/session/{session_id}")
async def get_scan_session(session_id: str):
    sess = session_manager.get(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    return sess


@router.delete("/session/{session_id}")
async def delete_scan_session(session_id: str):
    sess = session_manager.get(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True, "message": "Session deleted"}

