"""
Background Task Management
Handles long-running operations asynchronously using Celery
"""

from celery import Celery
from typing import Any, Dict, Optional
from core.config import settings

# Initialize Celery app
celery_app = Celery(
    'almona_backend',
    broker=getattr(
        settings, 'CELERY_BROKER_URL', 'redis://localhost:6379/1'
    ),
    backend=getattr(
        settings, 'CELERY_RESULT_BACKEND', 'redis://localhost:6379/2'
    ),
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes max
    task_soft_time_limit=25 * 60,  # 25 minutes soft limit
)


@celery_app.task(bind=True, name='tasks.generate_pdf_report')
def generate_pdf_report_task(
    self,
    report_type: str,
    data: Dict[str, Any],
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Background task for generating PDF reports.

    Args:
        report_type: Type of report (cutting_list, accessories, glass)
        data: Report data
        user_id: Optional user ID for tracking

    Returns:
        Dict with job_id, status, and result_url
    """
    try:
        # Update task state
        self.update_state(state='PROCESSING', meta={'progress': 0})

        # Import here to avoid circular dependencies
        # pyright: ignore[reportMissingImports]
        from lib.reports.pdf_generator import (  # type: ignore
            PDFReportGenerator
        )

        generator = PDFReportGenerator()

        # Generate report based on type
        if report_type == 'cutting_list':
            result = generator.generate_cutting_list_pdf(data)
        elif report_type == 'accessories':
            result = generator.generate_accessories_pdf(data)
        elif report_type == 'glass':
            result = generator.generate_glass_pdf(data)
        else:
            raise ValueError(f"Unknown report type: {report_type}")

        self.update_state(
            state='SUCCESS', meta={'progress': 100, 'result': result}
        )
        return {
            'status': 'success',
            'result_url': result,
            'job_id': self.request.id
        }
    except Exception as e:
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise


@celery_app.task(bind=True, name='tasks.parse_invoice')
def parse_invoice_task(
    self,
    invoice_file_url: str,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Background task for parsing invoice PDFs.

    Args:
        invoice_file_url: URL or path to invoice file
        user_id: Optional user ID for tracking

    Returns:
        Dict with parsed invoice data
    """
    try:
        self.update_state(state='PROCESSING', meta={'progress': 0})

        # Import here to avoid circular dependencies
        # pyright: ignore[reportMissingImports]
        from lib.imports.invoice_parser import InvoiceParser  # type: ignore

        parser = InvoiceParser()
        result = parser.parse_invoice(invoice_file_url)

        self.update_state(
            state='SUCCESS', meta={'progress': 100, 'result': result}
        )
        return {
            'status': 'success',
            'data': result,
            'job_id': self.request.id
        }
    except Exception as e:
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise


@celery_app.task(bind=True, name='tasks.generate_dxf_export')
def generate_dxf_export_task(
    self,
    cutting_plan: Dict[str, Any],
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Background task for generating DXF exports.

    Args:
        cutting_plan: Cutting plan data
        user_id: Optional user ID for tracking

    Returns:
        Dict with DXF file URL
    """
    try:
        self.update_state(state='PROCESSING', meta={'progress': 0})

        # Import here to avoid circular dependencies
        # pyright: ignore[reportMissingImports]
        from lib.exports.dxf_exporter import DXFExporter  # type: ignore

        exporter = DXFExporter()
        result = exporter.export_cutting_plan(cutting_plan)

        self.update_state(
            state='SUCCESS', meta={'progress': 100, 'result': result}
        )
        return {
            'status': 'success',
            'dxf_url': result,
            'job_id': self.request.id
        }
    except Exception as e:
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise


def get_task_status(task_id: str) -> Dict[str, Any]:
    """
    Get status of a background task.

    Args:
        task_id: Celery task ID

    Returns:
        Dict with task status and result
    """
    task = celery_app.AsyncResult(task_id)

    if task.state == 'PENDING':
        return {'status': 'pending', 'progress': 0}
    elif task.state == 'PROCESSING':
        return {
            'status': 'processing',
            'progress': task.info.get('progress', 0)
        }
    elif task.state == 'SUCCESS':
        return {'status': 'success', 'result': task.result}
    elif task.state == 'FAILURE':
        return {'status': 'failure', 'error': str(task.info)}
    else:
        return {'status': task.state, 'info': task.info}
