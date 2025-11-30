"""
Background Task API Endpoints
Handles long-running operations asynchronously
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any
from core.background_tasks import (
    generate_pdf_report_task,
    parse_invoice_task,
    generate_dxf_export_task,
    get_task_status
)

router = APIRouter(prefix="/tasks", tags=["Background Tasks"])


@router.post("/pdf-report")
async def create_pdf_report(
    report_type: str,
    data: Dict[str, Any],
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """
    Generate PDF report asynchronously.

    Returns 202 Accepted with job ID for polling.
    """
    try:
        task = generate_pdf_report_task.delay(report_type, data)
        return {
            "status": "accepted",
            "job_id": task.id,
            "message": "PDF generation started",
            "status_url": f"/api/v2/tasks/{task.id}/status"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start PDF generation: {str(e)}"
        )


@router.post("/parse-invoice")
async def create_invoice_parse(
    invoice_file_url: str,
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """
    Parse invoice PDF asynchronously.

    Returns 202 Accepted with job ID for polling.
    """
    try:
        task = parse_invoice_task.delay(invoice_file_url)
        return {
            "status": "accepted",
            "job_id": task.id,
            "message": "Invoice parsing started",
            "status_url": f"/api/v2/tasks/{task.id}/status"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start invoice parsing: {str(e)}"
        )


@router.post("/dxf-export")
async def create_dxf_export(
    cutting_plan: Dict[str, Any],
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """
    Generate DXF export asynchronously.

    Returns 202 Accepted with job ID for polling.
    """
    try:
        task = generate_dxf_export_task.delay(cutting_plan)
        return {
            "status": "accepted",
            "job_id": task.id,
            "message": "DXF export started",
            "status_url": f"/api/v2/tasks/{task.id}/status"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start DXF export: {str(e)}"
        )


@router.get("/{task_id}/status")
async def get_task_status_endpoint(task_id: str) -> Dict[str, Any]:
    """
    Get status of a background task.

    Poll this endpoint to check task completion.
    """
    try:
        status = get_task_status(task_id)
        return {
            "status": "success",
            "data": status
        }
    except Exception as e:
        raise HTTPException(
            status_code=404,
            detail=f"Task not found: {str(e)}"
        )
